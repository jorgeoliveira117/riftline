import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFetcher, type FetchLike } from "../src/fetch/fetcher";

let cacheDir: string;
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "riftline-fetch-"));
});
afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
});

function fakeFetch(body: string, status = 200) {
  const calls: string[] = [];
  const impl: FetchLike = async (url) => {
    calls.push(url);
    return { ok: status < 400, status, text: async () => body };
  };
  return { impl, calls };
}

describe("createFetcher", () => {
  const url = "https://example.test/cdn/1.2.3/data/file.json";

  it("fetches once, then serves from the disk cache", async () => {
    const { impl, calls } = fakeFetch('{"a":1}');
    const fetcher = createFetcher({ cacheDir, delayMs: 0, fetchImpl: impl });
    expect(await fetcher.json(url)).toEqual({ a: 1 });
    expect(await fetcher.json(url)).toEqual({ a: 1 });
    expect(calls).toHaveLength(1);
    expect(await readFile(join(cacheDir, "example.test/cdn/1.2.3/data/file.json"), "utf8")).toBe(
      '{"a":1}',
    );
  });

  it("bypasses the cache on refresh", async () => {
    const { impl, calls } = fakeFetch("[1]");
    const fetcher = createFetcher({ cacheDir, delayMs: 0, fetchImpl: impl });
    await fetcher.json(url);
    await fetcher.json(url, { refresh: true });
    expect(calls).toHaveLength(2);
  });

  it("fails on HTTP errors and non-JSON bodies without caching them", async () => {
    const notFound = createFetcher({
      cacheDir,
      delayMs: 0,
      fetchImpl: fakeFetch("nope", 404).impl,
    });
    await expect(notFound.json(url)).rejects.toThrow(/HTTP 404/);
    const html = createFetcher({ cacheDir, delayMs: 0, fetchImpl: fakeFetch("<html>").impl });
    await expect(html.json(url)).rejects.toThrow(/non-JSON/);
    await expect(readFile(notFound.cachePath(url))).rejects.toThrow();
  });

  it("spaces out network requests", async () => {
    const { impl } = fakeFetch("{}");
    const fetcher = createFetcher({ cacheDir, delayMs: 40, fetchImpl: impl });
    const start = Date.now();
    await fetcher.json(`${url}?1`, { refresh: true });
    await fetcher.json(`${url}?2`, { refresh: true });
    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });
});
