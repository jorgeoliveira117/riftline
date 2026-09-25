# ADR-002: Ability formula representation and verification model

- **Status:** Proposed — accept (or amend) at the end of Phase 0
- **Date:** 2026-07-16 · **Amended:** 2026-07-17 (golden classes, operating modes) · 2026-09-25 (Phase 0 findings; proposed, pending review)
- **Owner:** Jorge Oliveira

## Context

Most League ability values fit a simple shape: `base[rank] + Σ(coefficient × stat)`. A meaningful minority do not: conditional bonuses (Kha'Zix isolation), missing-HP executes (Garen R), distance scaling (Jinx R), multi-cast kits, DoT pools, stacking, and transformation mechanics. A single declarative model that covers everything turns into a bespoke programming language embedded in JSON; hand-coding every ability in TypeScript kills diffability, makes data entry expensive, and defeats extraction.

The maintenance profile matters as much as the representation. Extraction mappings ("this bin field is Q's per-rank damage array") are written **once per champion** and survive ordinary patches — but the *values* behind them are balance data that changes patch to patch. The verification model must therefore support two operating modes: **actively maintained** (a human reviews each ingest) and **hands-off** (the site keeps itself current unattended, failing loudly and locally when something structural breaks, such as a rework).

## Decision

A hybrid, weighted heavily toward data:

1. **Declarative core** (JSON in `data/curated/{slug}.json`): `{ id, label, damageType, base: number[] per rank, scalings: [{ stat, coeff | coeff[] }] }`. Covers the large majority of formulas; reviewable in PR diffs, chartable, and producible by the bin extractor.
2. **Evaluator escape hatch:** a formula may set `evaluator: "<moduleId>"`, resolving to a registered pure function in `packages/engine/src/evaluators/` that receives `(formula, context)` and returns values. Used only where the declarative model genuinely cannot express the mechanic. Evaluators are unit-tested like any engine code.
3. **Two classes of golden tests:**
   - **Engine goldens** — synthetic formulas + fixed builds → expected outputs. They test the *math itself*, are independent of Riot's data, never rot, and always gate CI.
   - **Data pins** — fixtures asserting real champion values, each carrying `verifiedAtPatch`: the ddragon version the value was human-checked against (League of Legends Wiki and/or in-client Practice Tool). Snapshots are immutable per version, so a pin passes forever against its own patch. Tool-scaffolded pins start with `verifiedAtPatch: null` and gate nothing.
4. **Automated invariants for the latest patch:** extractor output for the current version is guarded by cheap structural checks rather than mandatory human eyes: per-rank array lengths match the ability's max rank; damage type and scaling stat unchanged; bases and coefficients within a plausibility band relative to the previous patch (real balance tweaks are usually tens of percent — an order-of-magnitude jump, a sign flip, or a vanished field signals a misparse or a rework). An invariant failure holds **that champion** on its last-good data — fail closed per champion, never per site.
5. **Changepoint verification for history:** ability values are step functions across patches. Multi-version extraction runs automatically; human verification concentrates only on the patches where a value actually changed, keeping curation cost proportional to balance activity rather than to (champions × versions).
6. **Freshness is displayed, never implied:** any value auto-extracted beyond its `verifiedAtPatch` wears an explicit state in the UI (e.g. "auto-extracted since 16.15 · last verified 16.14").

## Alternatives considered

- **Full expression DSL in JSON** — rejected: reinvents a language; hard to review, easy to get subtly wrong.
- **All abilities as TypeScript code** — rejected: no meaningful diffs, no extraction pipeline, high per-champion cost, and formula data couldn't be reused for charts or the successor game project.
- **Values-only goldens with a boolean `verified` flag** (the pre-amendment design) — rejected: conflates testing the math with pinning Riot's data, and forces a human touch on every legitimate balance change — incompatible with the hands-off operating mode.
- **Auto-verifying against Riot's patch notes** — rejected as automation: patch notes are prose web pages, not structured data. They remain the manual answer key during review, not an automated oracle.

## Consequences

- Roughly 90% of kit values are plain data reviewable in PRs; the exotic 10% is code with tests, clearly marked.
- The same schema + engine are consumable by Riftforge (PLAN §7): its behavior archetypes bind to the same formula data, so the launch-13 kits double as the game's ability pool.
- Steady state in maintenance mode: champions untouched by a patch cost nothing; tuned values flow through recipes automatically and wear a freshness badge; reworks and format shifts trip invariants **loudly** and cost minutes to fix — silent rot is designed out.
- Deferred champion archetypes (infinite stackers, transformers, ammo/pet systems, kit-borrowers) are acknowledged schema stressors — revisit after v1.0 rather than pre-designing for them.

## Phase 0 amendments (proposed)

Evidence: [phase0-findings](../notes/phase0-findings.md) §2–3. Prototype: `pnpm extract-bins`.

- **The declarative core holds.** It mapped Annie's full ranked kit (6/6 tagged values) and 11 of Hwei's values. Kha'Zix and Briar are blocked by the known items below, not by the model.
- **Evaluator-bound part types, enumerated:** `ByCharLevelBreakpoints`/`Interpolation`/`Formula` (level curves), `ProductOfSubParts`/`SumOfSubParts` (nesting), `GameCalculationConditional` (e.g. Kha'Zix isolation) and `GameCalculationModified` (multipliers). `EffectValueCalculationPart` should become declarative once the legacy effect index is resolved. Level curves recur often enough (passives, move-speed buffs) that a declarative `byLevel` shape may be worth adding to the core before writing evaluators for them.
- **Extraction follows the game's own structure.** `CharacterRecord.spells` gives the slot roots and `AbilityObject.mChildSpells` the sub-spells; legacy objects with similar names are ignored. Cross-spell references (`spell.<script>:<var>`, 87 site-wide) are part of the model.
- **The stat-enum mapping is curated data with provenance.** Scalings name stats as numeric `mStat`/`mStatFormula` enums. Each mapped pair needs a cited source, just like quirks; unknown pairs stay unmapped and are never guessed.
- **Provenance is deterministic.** `extractedAt` is date-only and is preserved when the extracted values are unchanged, so re-runs stay byte-identical (CLAUDE.md ground rule 5). Tools never write `verifiedAtPatch`.
- **Data-pin format is designed in Phase 4** alongside the engine; Phase 0 did not scaffold pins.

