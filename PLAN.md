# Riftline — Delivery Plan

> Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [ADRs](./docs/adr) · [CLAUDE.md](./CLAUDE.md)
>
> **Status:** Phase 0 · **Last updated:** 2026-09-25 · **Phases:** 0–6

## 1. What we're building

Riftline is a League of Legends balance observatory and build lab, built on Riot's public static data (Data Dragon, augmented by CommunityDragon):

1. **Champion explorer** — every champion's base stats and abilities, per patch.
2. **Balance history** — how stats and ability values evolve across patches, charted with patch-date markers.
3. **Build playground** — pick a champion, items, level and skill ranks; see computed damage; share the build by URL; project the build's output across patch history.

Non-commercial fan project under Riot Games' "Legal Jibber Jabber" policy.

## 2. Operating rules

This is a part-time project (~15–20 h/week) built alongside other commitments. The plan optimizes for **pausability** — two rules outrank any feature:

1. **The URL never goes dark.** The site deploys at the end of Phase 1 and stays live and green from then on.
2. **Every phase ends shippable.** Work pauses cleanly at phase boundaries; nothing is left half-merged. If the project sits idle for two weeks, it is still a coherent, working product.

Supporting rules:

3. PR-based flow even solo; CI must pass; `main` is always deployable.
4. **Zero fabricated gameplay data.** Every number on the site traces to a snapshot file or a verified curated entry (see [ADR-001](./docs/adr/ADR-001-data-sourcing-and-trust-tiers.md) and [ADR-002](./docs/adr/ADR-002-ability-formula-model.md)).

## 3. Timeline at a glance

Dates are targets, not commitments — the phase-gate rules above are the real contract.

| Phase | Target window | Outcome | ~Hours |
|---|---|---|---|
| 0 — De-risking spike | Jul 20 – Jul 26 | ADR-001/002 accepted, schema v0, findings doc | 15 |
| 1 — Core wiki (latest patch) | Jul 27 – Aug 15 | **Live URL**: all champions browsable; CI + budgets enforced | 65 |
| 2 — Patch versioning | Aug 16 – Aug 31 | Any champion at any patch ≥ 15.1; per-patch diff pages | 35 |
| 3 — Balance history | Sep 1 – Sep 18 | Time-series charts with patch markers | 40 |
| 4 — Build playground | Sep 19 – Oct 9 | 13 curated champions, golden-tested engine, shareable builds | 60 |
| 5 — Design system (Storybook) | Oct 10 – Oct 16 | Published Storybook: tokens + ~15 documented components; visual regression gating PRs | 20 |
| 6 — Polish & evidence | Oct 17 – Oct 30 | a11y audit, documented perf pass, public `/stats` telemetry, **v1.0** | 30 |

**Post-v1, ongoing:** grow the curated set 13 → 40 (~3 champions/week, runbook in CLAUDE.md); review the automated ingest PR each patch (minutes, biweekly) — or flip `INGEST_MODE=maintenance` to go fully hands-off (ADR-002/003); then kick off Riftforge (§7).

## 4. Phases

### Phase 0 — De-risking spike (timeboxed)

Goal: answer the questions everything downstream depends on, before committing to them.

- [x] Scaffold the monorepo (layout in ARCHITECTURE §2), CI skeleton, commit this docs set.
- [x] Fetch scripts: pull ddragon `championFull.json` + `item.json` (latest) and CDragon bins for the probe trio — **Annie** (oldest/simplest), **Kha'Zix** (launch set, conditional mechanic), **Briar** (modern-era data shape). Optionally peek at Hwei as the known worst case.
- [x] For each probe: record which display values ddragon actually resolves vs. leaves as placeholders → `docs/notes/phase0-findings.md`.
- [x] Schema v0 in `packages/schema` (Champion, Ability, AbilityFormula, Item).
- [x] Prototype bin extraction for one full kit end-to-end.
- [x] Timeboxed 2h chart spike: ECharts (default) vs `@elastic/charts` → record outcome in ARCHITECTURE §13. *(ECharts recommended; maintainer to confirm.)*
- [ ] Review ADR-001 and ADR-002 against findings; amend and flip to Accepted. *(Amendments drafted from [phase0-findings](./docs/notes/phase0-findings.md); acceptance is the maintainer's call.)*

**Exit criteria:** ADRs accepted · schema v0 merged · findings doc written · chart library chosen · confident go/no-go on the Phase 4 approach.

### Phase 1 — Core wiki, latest patch only

- [ ] Pipeline v1: fetch → normalize → validate → emit `data/snapshots/{version}/` for all champions + items (latest version only).
- [ ] Champion index: search + class filter (client-side; ~170 entries).
- [ ] Champion page: splash header, base-stats table **with a level slider** (first real use of `statAtLevel` from the engine), abilities with icons and sanitized descriptions — best-effort variable substitution, and an explicit "value not in public data" state where ddragon leaves placeholders. Never a fake number.
- [ ] Seed `packages/ui`: design tokens (CSS custom properties) + the first primitives the wiki needs (roughly six — layout shell, StatTable, badge, tooltip, search input, champion card), each with a basic story; Storybook running locally with the a11y addon. **Keep this thin** — hardening is Phase 5 (ADR-004).
- [ ] Resolve ddragon `attackdamageperlevel = 0` (all champions since 16.5.1; bins disagree) before the level slider ships: quirk entry, bin-sourced growth, or a visible gap (phase0-findings §4).
- [ ] Ingest invariant: cross-check ddragon base stats against the bin `CharacterRecord` (ADR-001 amendment).
- [ ] Footer with the Riot disclaimer; basic SEO/meta.
- [ ] Deploy to Vercel; Sentry wired.
- [ ] Full CI: typecheck, lint, unit, e2e smoke, Lighthouse budgets, bundle-size limit (targets in ARCHITECTURE §9).
- [ ] Tag `v0.1`; link the URL from the GitHub profile.

**Exit criteria:** live URL · every champion browsable on the latest patch · budgets enforced in CI · a full ingest is one command.

### Phase 2 — Patch versioning

- [ ] Multi-version ingest back to **15.1** (`championFull.json` keeps this to roughly one request per version per file; polite delays; resumable).
- [ ] Per-version quirks registry for schema drift (see CLAUDE.md ground rule 4).
- [ ] Patch release dates from CommunityDragon's patch metadata (ddragon doesn't ship dates).
- [ ] Version switcher on champion pages; historical pages rendered via ISR.
- [ ] `/patches/{version}` diff pages — per-champion deltas computed at ingest between adjacent snapshots.
- [ ] `ingest.yml` daily cron: new ddragon version → run pipeline + goldens → open a PR with a human-readable diff summary. Ships in **review mode** (human merges, patch notes as the answer key); the `INGEST_MODE=maintenance` switch lands in Phase 4 once invariants exist (ADR-002/003).

**Exit criteria:** any champion viewable at any version ≥ 15.1 · diff pages live · cron PRs arriving on their own.

### Phase 3 — Balance history

- [ ] Series precompute at ingest → `data/series/{slug}.json` (small, static, per champion).
- [ ] `/champions/{slug}/history`: base-stat trends for **all** champions (trusted tier) + ability-value series for **curated** champions only (multi-version bin extraction; verification concentrated on changepoints — values are step functions across patches, so verify only where they change).
- [ ] Patch-date x-axis with markers; hover shows the patch and the delta.
- [ ] Chart accessibility: data-table fallback + text summary (ARCHITECTURE §10).
- [ ] Charts are lazy-loaded islands; non-chart routes stay under the JS budget.

**Exit criteria:** history pages live · trust tiers visibly honest in the UI (badges, not fine print).

### Phase 4 — Build playground

- [ ] Engine complete: item aggregation, level/skill ranks, target resistances, mitigation and penetration order — **formulas verified against the League of Legends Wiki at implementation time, encoded as goldens** (see CLAUDE.md ground rule 3).
- [ ] Curated item pool (~30–50 damage-relevant items) with an overlay for stats absent from ddragon's stats block (lethality, % pen, etc. live only in description text).
- [ ] Bin-extractor hardened on the launch set; curated data + provenance for all 13 champions.
- [ ] Extractor gaps from Phase 0: verified stat-enum table (`mStat`/`mStatFormula`), cross-spell references, `EffectValueCalculationPart`, level-curve parts, and evaluators for conditional/modified/nested calculations (ADR-002 amendment).
- [ ] Golden suite in two classes (ADR-002): **engine goldens** (synthetic; always gate CI) + **data pins** per champion (≥2 scenarios per damage formula), maintainer-verified via `verifiedAtPatch`.
- [ ] Ingest invariants + `INGEST_MODE` switch: structural checks and plausibility bands, per-champion fail-closed to last-good data, freshness badges in the playground UI.
- [ ] Playground UI: keyboard-first controls (Slider, Stepper, Combobox — built in `packages/ui` on React Aria hooks, each with stories); champion/level/ranks/items/target panels; per-ability and combo totals.
- [ ] Shareable builds: versioned payload serialized into the URL, zod-validated on decode.
- [ ] **Signature feature:** apply the configured build across historical curated data → "this build's combo damage, per patch."

**Exit criteria:** playground live for all 13 · golden suite green in CI · share links stable.

### Phase 5 — Design system (Storybook)

- [ ] Component inventory capped at ~15 for v1; extract any strays that grew inside `apps/web` into `packages/ui`.
- [ ] Tokens documented as Storybook docs pages: color/space/type scales plus the domain palettes (damage types, trust/freshness states).
- [ ] Full stories per component: all meaningful states (default/hover/focus/disabled, loading/empty/error where applicable), controls, autodocs.
- [ ] Interaction tests via the Storybook test-runner for stateful components; a11y-addon violations fail CI.
- [ ] Visual regression wired and gating PRs (default Chromatic free tier; self-hosted Playwright screenshots as the no-third-party alternative — decide, ARCHITECTURE §13).
- [ ] Storybook published as its own static deploy; linked from the README and the site footer.

**Exit criteria:** published Storybook URL · every `packages/ui` component documented with passing interaction + a11y checks · visual regression gating PRs.

### Phase 6 — Polish & evidence

- [ ] Accessibility: axe checks enforced in CI + a manual keyboard/screen-reader pass; fixes.
- [ ] Performance pass with a documented before/after → `docs/perf/2026-10-report.md`.
- [ ] `/stats`: the site's **own** real-user Core Web Vitals, public (web-vitals → `/api/vitals` → store → charts).
- [ ] Nice-to-have: dynamic OG images per champion page.
- [ ] README upgraded from pitch to case study.
- [ ] Tag **v1.0**.

## 5. Champion coverage ladder

**Launch 13** — one per Riot subclass, chosen so each one stress-tests a different engine mechanic:

| Champion | Subclass | Engine mechanic it stress-tests |
|---|---|---|
| Annie | Burst | Baseline flat AP ratios — the control case |
| Xerath | Artillery | Multi-hit poke, mana costs |
| Ryze | Battlemage | Dual scaling (AP **and** bonus mana) |
| Malphite | Vanguard | Abilities scaling off his own armor |
| Shen | Warden | % max-HP magic damage |
| Garen | Juggernaut | Missing-HP execute (R) |
| Jarvan IV | Diver | Hybrid physical combo; two-part flag-and-drag |
| Kha'Zix | Assassin | Conditional bonus (isolation) — clean boolean evaluator |
| Riven | Skirmisher | Multi-cast total-AD kit |
| Jinx | Marksman | Ult scaling with distance **and** missing HP; stance-swap Q |
| Morgana | Catcher | DoT pool (W) + shield (E) |
| Nami | Enchanter | Heal/shield + on-hit ally buff (E) |
| Teemo | Specialist | On-hit poison DoT stacking |

**Growth:** +~3/week toward 40, using the runbook in CLAUDE.md. Verification cost stays low because it concentrates on changepoints.

**Deferred beyond the 40** (known schema stressors; revisit post-v1): infinite stackers (Nasus, Veigar, Smolder) · transformers (Nidalee, Jayce, Elise) · ammo/pet systems (Aphelios, Heimerdinger, Yorick, Azir) · kit-borrowers (Sylas, Viego).

## 6. Out of scope for v1

Runes and summoner spells in the calculator · non-Summoner's-Rift modes · accounts/saved builds (URLs are the share mechanism) · localization (ddragon ships locales; revisit post-v1) · the full item shop (curated pool only) · ability-value history for non-curated champions.

## 7. Project 2 — Riftforge (successor project, separate repo)

A small browser arena game (Three.js) where players assemble a champion from a pool of abilities and fight. It consumes `packages/schema` and `packages/engine` from this repo — the launch-13 kits double as its ability pool.

**Gate:** kicks off after Riftline v1.0 is tagged. Hard floor: never before Phase 3 is live.

Milestones, each independently demoable:

- **M1** — movement/camera + one ability vs. a training dummy. Pure client, statically deployed.
- **M2** — ability system as 4–5 behavior archetypes (projectile, dash, zone, buff/shield, DoT) driven by formula data; the champion-mixing UI over the launch-13 pool.
- **M3** — bots, so the arena always has opponents and every visitor gets a match.
- **M4 (optional)** — authoritative multiplayer: small Node/Colyseus server, one room, 4–6 players.

Rules: original low-poly assets; mechanics *inspired by* League — no extracted Riot models or audio; same disclaimer. Riftforge gets its own PLAN/ARCHITECTURE at kickoff.

## 8. Risks

| Risk | Mitigation |
|---|---|
| ddragon spell data known-inaccurate | Trust tiers; curated formulas from CDragon bins; golden gate (ADR-001/002) |
| ddragon publishes up to ~2 days after a patch | Daily cron is lag-tolerant; realms endpoint for region status; no same-day promise in the UI |
| Schema drift across versions | Normalize layer + quirks registry; zod as tripwire — quirk entries, never schema loosening |
| Curation cost balloons | Launch at 13; changepoint-only verification; runbook + extractor automation |
| Hands-off operation rots data silently | Invariant-guarded auto-merge; per-champion fail-closed to last-good; freshness badges; reworks fail loudly (ADR-002) |
| Chart library mismatch | Timeboxed Phase 0 spike before commitment |
| Design-system ceremony eats schedule | Thin Phase 1 seed; capped inventory (~15); timeboxed Phase 5; the site is the demo, Storybook is the workshop |
| Solo continuity | Phase-gated shippable states; docs kept current; runbooks |
| Policy compliance | Disclaimer, non-commercial, no extracted A/V assets in Riftforge |

## 9. Definition of done (any task)

- Typecheck, lint, and tests green locally and in CI.
- No unverified gameplay numbers introduced (or explicitly marked and excluded from display/CI).
- Docs touched if behavior or architecture changed.
- Deployed preview inspected before merge.
