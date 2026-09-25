import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walks up from this package to the workspace root (the directory holding pnpm-workspace.yaml). */
export function repoRoot(from = import.meta.dirname): string {
  let dir = from;
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("pnpm-workspace.yaml not found above " + from);
    dir = parent;
  }
  return dir;
}

export const upstreamCacheDir = () => join(repoRoot(), ".cache", "upstream");
export const dataDir = () => join(repoRoot(), "data");
