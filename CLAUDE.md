# CLAUDE.md

Guidance for Claude Code working in this repository. Read this first, then [PLAN.md](./PLAN.md) (find the current phase) and [ARCHITECTURE.md](./ARCHITECTURE.md). ADRs in `docs/adr/` are binding once Accepted.

## Project snapshot

Riftline: a League of Legends balance observatory and build lab. Snapshot pipeline over Riot's public static data (ddragon + CommunityDragon) → Next.js site with champion pages, patch-history charts, and a golden-tested damage playground, built on a small in-repo design system (`packages/ui` + Storybook). Solo-maintained, part-time cadence — phases must end shippable.

## Ground rules (non-negotiable)

1. **Never invent gameplay numbers.** Every stat, ratio, cooldown, or damage value must trace to a file under `data/` (a snapshot, or a curated entry with provenance). If a value is needed and unavailable, add a `TODO(verify)` and call it out in the PR description. Do not fill gaps from training data — League balance changes biweekly; memory is stale by definition.
2. **Golden tests come in two classes (ADR-002).** *Engine goldens* — synthetic formulas with expected outputs — test the math, never rot, and always gate CI; write those freely. *Data pins* assert real champion values and carry `verifiedAtPatch`; you may scaffold them with `verifiedAtPatch: null`, but only the maintainer sets the patch, after checking against the League of Legends Wiki and/or the in-client Practice Tool. Never set or bump `verifiedAtPatch` yourself.
3. **League mechanics questions → the League Wiki, linked in the PR.** Penetration order, lethality conversion, resist formulas, and similar rules change across seasons: implement from the current wiki page and cite the URL in the PR description. The wiki is a *human reference* — never scrape it programmatically or ingest it as a data source.
4. **Never loosen zod schemas to make ingest pass.** Upstream oddities become entries in the quirks registry (`packages/pipeline/src/quirks/`), each with a comment naming the version and field. Validation failing closed is the system working.
5. **Deterministic pipeline.** Same inputs → byte-identical snapshots: stable key ordering, no timestamps inside data files. If a re-run produces a diff with unchanged inputs, that's a bug.
6. **No binaries in git.** Images are hotlinked from the ddragon CDN. `data/` holds JSON only.
7. **PR flow, even solo.** Small PRs, conventional commits, CI green before merge, and descriptions that explain *why* — they double as the project changelog.
8. **This repo is public.** Professional tone in code, comments, and docs; no secrets, keys, or personal data. The Riot disclaimer stays intact in the footer and README.
9. **Reusable UI lives in `packages/ui`, born with a story.** Don't re-implement in `apps/web` what a `ui` component covers; new shared components ship with stories covering their states and passing the a11y addon. `packages/ui` never imports from `apps/*` or the data packages (ADR-004).

## Commands

This list is the spec (implemented across Phases 0–2). Keep it true as things land.

```
pnpm dev            # run apps/web locally
pnpm build          # production build
pnpm typecheck      # tsc --noEmit across the workspace
pnpm lint           # lint + format check
pnpm test           # unit tests (engine, pipeline)
pnpm test:golden    # verified golden fixtures only
pnpm test:e2e       # Playwright (includes axe checks)
pnpm storybook      # component workshop (packages/ui)
pnpm build:storybook # static Storybook for deploy
pnpm test:stories   # interaction tests via Storybook test-runner

pnpm etl versions                    # ddragon versions not yet ingested
pnpm etl ingest --version 16.14.1    # or --latest
pnpm etl derive                      # recompute series + patch diffs
pnpm extract-bins --champion khazix --version 16.14
```

## Repo map

```
apps/web            Next.js app — routes in ARCHITECTURE §7
packages/schema     zod schemas + types; shared contract (also consumed by Riftforge later)
packages/engine     pure damage math; no I/O, no framework imports
packages/pipeline   ETL CLIs + quirks registry
packages/ui         tokens + accessible components; Storybook (ADR-004)
data/               snapshots / curated / series / goldens — see ARCHITECTURE §2
docs/               adr / notes / perf
```

## Working agreement

- Work only within the current phase in PLAN.md. If a task reveals work that belongs to a later phase, add it to that phase's list instead of doing it now.
- Every task meets the Definition of Done (PLAN §9) before the PR is marked ready.
- Any architecture-affecting decision gets an ADR (`docs/adr/`, next number, status **Proposed**) for maintainer review — don't silently diverge from an Accepted ADR.
- The ingest workflow honors `INGEST_MODE` (`review` by default, `maintenance` for hands-off auto-merge — ADR-003). Don't flip it in a PR unless explicitly asked.
- Prefer surfacing uncertainty (PR description, `TODO(verify)`) over guessing. A flagged gap is cheap; a confident wrong number on a public site is not.

## Runbook: add a champion to the curated set

1. `pnpm extract-bins --champion {name} --version {current}`.
2. Review the output → `data/curated/{slug}.json`. Fill anything the extractor couldn't map; if a mechanic doesn't fit the declarative model, register an evaluator override (ADR-002) instead of contorting the data.
3. Record provenance: `cdragonPath`, `sourcePatch`, `extractedAt`.
4. Scaffold data pins in `data/goldens/{slug}.json` — at least 2 scenarios per damage formula (different level/rank/build) — all with `verifiedAtPatch: null`.
5. Maintainer verifies against the League Wiki / Practice Tool and sets `verifiedAtPatch` to the current version.
6. `pnpm test:golden`, add the champion to the playground roster, open the PR.

## Data source quick reference

Full table in ARCHITECTURE §3. The two you'll touch most:

- Versions: `https://ddragon.leagueoflegends.com/api/versions.json`
- All champions (full): `https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/championFull.json`

Remember the upstream reality: ddragon tooltips contain unresolved `{{ placeholders }}` and its spell/item numbers are unreliable — that's exactly why the trust tiers in ADR-001 exist. Render honest gaps, never fake values.
