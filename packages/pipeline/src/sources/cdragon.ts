import type { Fetcher } from "../fetch/fetcher";
import { CdragonBin } from "../raw/cdragon";

export const CDRAGON_BASE = "https://raw.communitydragon.org";

/** CDragon publishes per major.minor ("16.19"), while ddragon versions carry a third part. */
export function cdragonPatch(ddragonVersion: string): string {
  const match = /^(\d+)\.(\d+)/.exec(ddragonVersion);
  if (!match) throw new Error(`not a ddragon version: ${ddragonVersion}`);
  return `${match[1]}.${match[2]}`;
}

export const championBinPath = (slug: string) => `game/data/characters/${slug}/${slug}.bin.json`;

export const cdragonUrl = (ddragonVersion: string, path: string) =>
  `${CDRAGON_BASE}/${cdragonPatch(ddragonVersion)}/${path}`;

export async function getChampionBin(fetcher: Fetcher, slug: string, ddragonVersion: string) {
  const url = cdragonUrl(ddragonVersion, championBinPath(slug));
  return CdragonBin.parse(await fetcher.json(url));
}
