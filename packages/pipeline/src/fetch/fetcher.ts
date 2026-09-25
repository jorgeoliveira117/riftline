import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export interface FetcherOptions {
  /** Raw responses are cached here, mirroring host + path. Gitignored (`.cache/`). */
  cacheDir: string;
  /** Minimum gap between network requests — be polite to the CDNs. */
  delayMs?: number;
  fetchImpl?: FetchLike;
  log?: (message: string) => void;
}

export interface GetOptions {
  /** Bypass the cache (for mutable resources such as versions.json). */
  refresh?: boolean;
}

export interface Fetcher {
  json(url: string, options?: GetOptions): Promise<unknown>;
  cachePath(url: string): string;
}

const hasProxyEnv = () =>
  Boolean(process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY);

/** Node's global fetch ignores HTTP(S)_PROXY; honour it when set (e.g. sandboxed CI/dev envs). */
export function defaultFetch(): FetchLike {
  const dispatcher = hasProxyEnv() ? new EnvHttpProxyAgent() : undefined;
  return (url) => undiciFetch(url, dispatcher ? { dispatcher } : {});
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Disk-cached JSON fetcher. Per-version upstream files are immutable, so a cache hit is final;
 * an interrupted run resumes from whatever is already cached (ARCHITECTURE §6).
 */
export function createFetcher({
  cacheDir,
  delayMs = 250,
  fetchImpl = defaultFetch(),
  log = () => {},
}: FetcherOptions): Fetcher {
  let lastRequestAt = 0;

  const cachePath = (url: string) => {
    const { host, pathname } = new URL(url);
    return join(cacheDir, host, ...pathname.split("/").filter(Boolean));
  };

  const json = async (url: string, { refresh = false }: GetOptions = {}) => {
    const path = cachePath(url);
    if (!refresh) {
      const cached = await readFile(path, "utf8").catch(() => undefined);
      if (cached !== undefined) return JSON.parse(cached) as unknown;
    }

    const wait = lastRequestAt + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    log(`GET ${url}`);
    const response = await fetchImpl(url);
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`GET ${url} failed: HTTP ${response.status} — ${body.slice(0, 120)}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error(`GET ${url} returned non-JSON: ${body.slice(0, 120)}`);
    }

    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, body);
    await rename(tmp, path);
    return parsed;
  };

  return { json, cachePath };
}
