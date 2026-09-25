# data/

JSON only — no binaries (images are hotlinked from the ddragon CDN). Layout per [ARCHITECTURE §2](../ARCHITECTURE.md#2-repository-layout-pnpm-workspaces):

| Path | Contents | Trust tier |
|---|---|---|
| `snapshots/{version}/` | Normalized `champions.json`, `items.json`, `meta.json` per ddragon version | T1 |
| `curated/{slug}.json` | Ability formulas + provenance for the curated set | T2 |
| `series/{slug}.json` | Precomputed per-champion time series | derived |
| `goldens/{slug}.json` | Data pins; `verifiedAtPatch` is set by the maintainer only | T3 |

Files are written by `packages/pipeline` with deterministic serialization (stable key order, no timestamps). Never hand-edit a snapshot; curated entries are reviewed in PRs.
