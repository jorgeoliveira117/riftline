import type { Fetcher } from "../fetch/fetcher";
import { DdragonChampionFull, DdragonItems, DdragonVersions } from "../raw/ddragon";

export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

export const ddragonUrls = {
  versions: () => `${DDRAGON_BASE}/api/versions.json`,
  championFull: (version: string) => `${DDRAGON_BASE}/cdn/${version}/data/en_US/championFull.json`,
  items: (version: string) => `${DDRAGON_BASE}/cdn/${version}/data/en_US/item.json`,
};

/** Newest first, as ddragon publishes it. Always refreshed — the list grows every patch. */
export async function getVersions(fetcher: Fetcher): Promise<string[]> {
  return DdragonVersions.parse(await fetcher.json(ddragonUrls.versions(), { refresh: true }));
}

/** Resolves "latest", a full version, or a major.minor prefix to a published ddragon version. */
export function resolveVersion(versions: string[], wanted: string): string {
  if (wanted === "latest") {
    const latest = versions[0];
    if (!latest) throw new Error("versions.json is empty");
    return latest;
  }
  if (versions.includes(wanted)) return wanted;
  const byPrefix = versions.find((v) => v.startsWith(`${wanted}.`));
  if (byPrefix) return byPrefix;
  throw new Error(`ddragon has no version matching "${wanted}"`);
}

export async function getChampionFull(fetcher: Fetcher, version: string) {
  return DdragonChampionFull.parse(await fetcher.json(ddragonUrls.championFull(version)));
}

export async function getItems(fetcher: Fetcher, version: string) {
  return DdragonItems.parse(await fetcher.json(ddragonUrls.items(version)));
}
