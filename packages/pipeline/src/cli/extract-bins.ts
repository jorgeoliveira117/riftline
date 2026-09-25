import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { CuratedChampion } from "@riftline/schema";
import { extractFormulas } from "../extract/formulas";
import { createFetcher } from "../fetch/fetcher";
import { championBinPath, getChampionBin } from "../sources/cdragon";
import { getChampionFull, getVersions, resolveVersion } from "../sources/ddragon";
import { stableStringify } from "../util/stable-json";
import { dataDir, upstreamCacheDir } from "../util/paths";

const USAGE = `Usage: pnpm extract-bins --champion <slug> [--version <v>]

Extracts ability formulas from the CommunityDragon bin into data/curated/<slug>.json.
--version accepts a full ddragon version, a major.minor prefix, or "latest" (default).`;

const { values } = parseArgs({
  options: {
    champion: { type: "string" },
    version: { type: "string", default: "latest" },
    help: { type: "boolean", short: "h" },
  },
});

async function main() {
  const slug = values.champion?.toLowerCase();
  if (values.help || !slug) {
    console.log(USAGE);
    return;
  }
  const fetcher = createFetcher({ cacheDir: upstreamCacheDir(), log: (m) => console.error(m) });
  const version = resolveVersion(await getVersions(fetcher), values.version);
  const full = await getChampionFull(fetcher, version);
  const champion = Object.values(full.data).find((c) => c.id.toLowerCase() === slug);
  if (!champion) throw new Error(`no champion "${slug}" in ddragon ${version}`);

  const bin = await getChampionBin(fetcher, slug, version);
  const { abilities, warnings } = extractFormulas(champion, bin);

  const outPath = join(dataDir(), "curated", `${slug}.json`);
  const existing = await readFile(outPath, "utf8")
    .then((text) => CuratedChampion.parse(JSON.parse(text)))
    .catch(() => undefined);

  // Keep the file byte-identical when nothing changed, and never touch verifiedAtPatch: only the
  // maintainer sets it (CLAUDE.md ground rule 2).
  const unchanged =
    existing?.provenance.sourcePatch === version &&
    isDeepStrictEqual(existing.abilities, abilities);
  const curated = CuratedChampion.parse({
    slug,
    provenance: {
      sourcePatch: version,
      cdragonPath: championBinPath(slug),
      extractedAt: unchanged
        ? existing.provenance.extractedAt
        : new Date().toISOString().slice(0, 10),
      verifiedAtPatch: existing?.provenance.verifiedAtPatch ?? null,
    },
    abilities,
  });

  await mkdir(join(dataDir(), "curated"), { recursive: true });
  await writeFile(outPath, stableStringify(curated));

  const mapped = abilities.reduce((n, a) => n + a.formulas.length, 0);
  const gaps = abilities.flatMap((a) =>
    a.unmapped.map((u) => `  ${a.slot} ${u.name}: ${u.reason}`),
  );
  console.log(`${champion.name} @ ${version}: ${mapped} formulas → ${outPath}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (gaps.length) console.log(`Unmapped (${gaps.length}):\n${gaps.join("\n")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
