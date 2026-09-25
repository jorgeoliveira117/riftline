# ADR-003: Snapshot storage and rendering strategy

- **Status:** Proposed — accept (or amend) at the end of Phase 0
- **Date:** 2026-07-16 · **Amended:** 2026-07-17 (ingest operating modes)
- **Owner:** Jorge Oliveira

## Context

The site is read-heavy static content keyed by `(champion, version)`. Patches ship roughly biweekly; ddragon may publish up to ~2 days after (or before) a patch is live; per-version data changes never after publication (immutable once correct). Options for the data layer: proxy Riot's CDN at runtime, load into a database, or commit normalized JSON to the repository.

## Decision

- **Commit normalized snapshots to git** under `data/snapshots/{version}/` — JSON only, deterministic serialization (stable key order, no embedded timestamps). Git diffs of ingests double as balance changelogs.
- **Ingest via automated PRs, in one of two modes** (repo config, `INGEST_MODE`): a daily cron (`ingest.yml`) detects new versions in `versions.json`, runs the pipeline, engine goldens, and the ADR-002 invariants, and opens a PR whose body summarizes the changes.
  - **`review`** (default while actively maintained): a human merges, using Riot's official patch notes as the answer key — the PR diff and the notes should match one-to-one.
  - **`maintenance`** (hands-off): if extraction is clean and all invariants pass, the PR auto-merges. Any invariant failure holds that champion on last-good data (fail closed per champion) and leaves the PR open with a loud summary.
- **Derive at ingest:** per-champion time series and per-version diffs are precomputed into `data/series/` and served as static JSON; pages never compute history at request time.
- **Rendering:** SSG at build time for latest-patch pages (~170 champions + index); historical `champion × version` pages via ISR on demand, avoiding a combinatorial build; playground is a client island over static data.
- **Images are hotlinked** from the ddragon CDN (official, cache-friendly, provided for this purpose) via `next/image` remote patterns — never stored in the repo.

## Alternatives considered

- **Runtime proxy of ddragon** — rejected: couples uptime and latency to Riot's CDN and its publish lag; loses diffability; re-fetches immutable data, contrary to Riot's own caching guidance.
- **Database (Postgres/SQLite)** — rejected for v1: adds operational surface for data that is immutable per version and fits comfortably in files. Revisit if data volume or query patterns outgrow static JSON.

## Consequences

- Repo grows by a few MB of JSON per ingested version — acceptable for seasons of history. If it becomes unwieldy, split into a data submodule or object storage; the pipeline's emit stage is the only code that would change.
- Zero runtime dependency on Riot for data: the site keeps working through upstream outages and format changes; only images depend on the ddragon CDN.
- Rolling back a bad ingest is a `git revert`.
- New-patch latency is bounded by upstream publication plus one cron cycle (maintenance mode), plus PR review when in review mode — honest and predictable, never a same-day promise.
