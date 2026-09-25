import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { placeholderAuditReport } from "../analysis/audit-report";
import { createFetcher } from "../fetch/fetcher";
import { PROBE_CHAMPIONS } from "../probe";
import { getChampionBin } from "../sources/cdragon";
import { getChampionFull, getItems, getVersions, resolveVersion } from "../sources/ddragon";
import { dataDir, upstreamCacheDir } from "../util/paths";

const USAGE = `Usage: pnpm etl <command> [options]

Commands:
  versions                   ddragon versions not yet ingested into data/snapshots
  probe   --version <v>      Phase 0: fetch championFull, item.json and probe-champion bins
  audit   --version <v> [--out <file>]
                             Phase 0: tooltip placeholder audit (markdown)

--version accepts a full ddragon version, a major.minor prefix, or "latest" (default).`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: "string", default: "latest" },
    out: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

const fetcher = createFetcher({
  cacheDir: upstreamCacheDir(),
  log: (m) => console.error(m),
});

async function ingestedVersions(): Promise<Set<string>> {
  const entries = await readdir(join(dataDir(), "snapshots")).catch(() => []);
  return new Set(entries);
}

async function probeBins(version: string) {
  const bins: Record<string, Awaited<ReturnType<typeof getChampionBin>>> = {};
  for (const id of PROBE_CHAMPIONS)
    bins[id] = await getChampionBin(fetcher, id.toLowerCase(), version);
  return bins;
}

async function main() {
  const [command] = positionals;
  if (values.help || !command) {
    console.log(USAGE);
    return;
  }
  const versions = await getVersions(fetcher);
  const version = resolveVersion(versions, values.version);

  switch (command) {
    case "versions": {
      const done = await ingestedVersions();
      const pending = versions.filter((v) => !done.has(v));
      console.log(
        `${pending.length} of ${versions.length} ddragon versions not ingested; newest first:`,
      );
      console.log(pending.slice(0, 20).join("\n") + (pending.length > 20 ? "\n…" : ""));
      return;
    }
    case "probe": {
      const full = await getChampionFull(fetcher, version);
      const items = await getItems(fetcher, version);
      const bins = await probeBins(version);
      console.log(
        `ddragon ${version}: ${Object.keys(full.data).length} champions, ` +
          `${Object.keys(items.data).length} items; bins: ${Object.keys(bins).join(", ")}`,
      );
      console.log(`cached under ${upstreamCacheDir()}`);
      return;
    }
    case "audit": {
      const report = placeholderAuditReport(
        await getChampionFull(fetcher, version),
        await probeBins(version),
      );
      if (values.out) await writeFile(values.out, report);
      else process.stdout.write(report);
      return;
    }
    default:
      console.error(`Unknown command "${command}".\n\n${USAGE}`);
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
