# ADR-001: Data sourcing and trust tiers

- **Status:** Proposed — accept (or amend) at the end of Phase 0
- **Date:** 2026-07-16 · **Amended:** 2026-07-17 (freshness display, gating aligned with ADR-002)
- **Owner:** Jorge Oliveira

## Context

Riftline needs champion stats, ability values, item data, and imagery, per patch. Riot's Data Dragon (ddragon) is the official static-data CDN, versioned per patch — but its limitations are well documented by the community: ability tooltips contain unresolved placeholders (e.g. `{{ wdamage }}`) with no corresponding values anywhere in the champion file, and community documentation states plainly that ddragon's champion spell data and item stats are inaccurate, with no near-perfect public source in existence. CommunityDragon (CDragon) republishes raw game files, including champion `.bin.json` spell objects that contain the real numbers and scaling math — but in an undocumented, champion-specific format that requires interpretation and per-kit review.

References:

- <https://riot-api-libraries.readthedocs.io/en/latest/ddragon.html> (known inaccuracies; caching guidance)
- <https://hextechdocs.dev/resolving-variables-in-spell-textsa/> (resolving spell variables from CDragon bins)
- <https://www.communitydragon.org/documentation/assets>
- <https://developer.riotgames.com/docs/lol> (official ddragon docs)

## Decision

Three explicit trust tiers, encoded in the schema (`trust` field) and surfaced honestly in the UI:

- **T1 — ddragon, as published:** version list, champion base stats and growth, item `stats`/gold/build paths, all imagery, names and descriptions. Placeholder-aware rendering: unresolved variables display as an explicit "value not in public data" state — never as a fake number.
- **T2 — CDragon-extracted:** ability formulas for the curated champion set, produced by our bin extractor, with provenance recorded per entry (`cdragonPath`, `sourcePatch`, `extractedAt`).
- **T3 — human-verified:** data-pin fixtures checked by the maintainer against the League of Legends Wiki and/or the in-client Practice Tool, each recording the patch it was verified against (`verifiedAtPatch`). Gating and freshness follow ADR-002: engine goldens always gate CI; only T2/T3-backed numbers appear in the playground, and any value auto-extracted beyond its verified patch wears an explicit freshness badge rather than implying verification.

Scope consequences of the tiers: site-wide features (explorer, base-stat history, diffs) use T1 only; ability-value features (playground, ability history) are limited to the curated set. The playground's item pool is a curated subset (~30–50 damage-relevant items) with an overlay for stats absent from ddragon's `stats` block (lethality, % penetration, and similar live only in description text).

## Alternatives considered

- **ddragon only** — rejected: known-inaccurate precisely where the core feature (computed ability damage) needs precision.
- **Scrape the League of Legends Wiki** — rejected as a data source: fragile scraping target, and CC BY-SA licensing brings attribution/share-alike complexity into the data layer. Retained as the *human verification reference*.
- **Third-party aggregate datasets** (community-maintained cleaned champion data) — not adopted as a dependency: maintenance continuity is outside our control; may be consulted manually during verification.

## Consequences

- Coverage grows via a curation ladder (13 → 40 champions) rather than all at once; the UI wears trust badges rather than implying uniform accuracy.
- We own an extractor and a quirks registry — ongoing maintenance, but also the project's core engineering substance.
- The site can never display an authoritative-looking wrong number without either failing a golden or carrying an explicit unverified state.
