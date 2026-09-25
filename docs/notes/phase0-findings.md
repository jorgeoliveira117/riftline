# Phase 0 findings — de-risking spike

- **Date:** 2026-09-25 · **Data:** ddragon `16.19.1`, CommunityDragon `16.19`
- **Probes:** Annie, Kha'Zix, Briar, plus Hwei as the known worst case (PLAN §4)
- **Reproduce:** `pnpm etl probe`, `pnpm etl audit --out docs/notes/phase0-placeholder-audit.md`, `pnpm extract-bins --champion annie`
- **Status:** input for ADR-001/002 review. Nothing here has been verified against the League Wiki or the Practice Tool; every number quoted below comes straight from the upstream files.

## TL;DR

1. **ddragon alone cannot render ability numbers.** Of 2,672 value-bearing tooltip placeholders across all 173 champions, 33 (1.2%) resolve from ddragon. `vars` and `datavalues` are empty on all 692 spells. This confirms ADR-001's premise.
2. **CDragon bins resolve 100% of placeholders for all four probes by name**, once cross-spell references (`spell.<name>:<var>`) and legacy effect amounts are handled. The name-resolution half of ADR-001's T2 plan works, Hwei included.
3. **The declarative core (ADR-002) maps Annie's whole ranked kit** (6/6 tagged damage, shield and heal values). It maps much less for the others. The blockers fall into a small, enumerable set of calculation-part types plus one unverified stat-enum table, so they are known work, not unknown risk.
4. **T1 base stats are not safe to take on faith.** Since ddragon `16.5.1`, `attackdamageperlevel` is `0` for **every** champion (173/173). The 16.19 game bins still carry non-zero AD growth (Annie 2.65, Kha'Zix 3.1, Briar 2.5, Hwei 3.3). This needs a maintainer decision before Phase 1 ships the level slider.
5. **Chart library:** ECharts is recommended; see [phase0-chart-spike.md](./phase0-chart-spike.md).

**Phase 4 go/no-go:** **go**, conditional on the verification items at the end of this doc. The approach holds. The remaining work is evaluators for five part types, cross-spell resolution in the extractor, and a verified stat-enum table.

## 1. What ddragon resolves

Full table: [phase0-placeholder-audit.md](./phase0-placeholder-audit.md) (generated, deterministic).

| | Count |
|---|---|
| Tooltip placeholders, all champions | 3,364 |
| UI hooks (`spellmodifierdescriptionappend`, `abilityresourcename`) | 692 |
| Value-bearing | 2,672 |
| Resolvable from ddragon `effectBurn` | 33 (1.2%) |
| Resolvable from ddragon `vars` / `datavalues` | 0 / 0 (both empty on all 692 spells) |
| Cross-spell placeholders (`spell.<name>:<var>`) | 87 |
| Expression placeholders (`name*100`, `name*-100`, `name*100.000000`) | 358 |

The probe champions resolve **0** placeholders from ddragon. Annie's Q is typical: `effect` is all zeros, and `{{ totaldamage }}` has no value anywhere in the file.

Other ddragon observations:

- **Some numbers are literal tooltip text, not variables.** For example, Annie R says "275% Attack Speed". 27 of 692 spells contain literal `N%` text outside placeholders. These are T1 "as published" and cannot be substituted or badged per value, which matters for ADR-001's rendering rule.
- **Tags are Riot's six classes, not subclasses.** ddragon ships `Assassin/Fighter/Mage/Marksman/Support/Tank`. Schema v0 has `tags` plus an optional curated `subclasses` overlay, instead of the `classes: RiotSubclass[]` in the ARCHITECTURE §4 sketch.
- **Health regen is per 5 seconds.** ddragon `hpregen` is 5 × the bin's `baseStaticHPRegen`. That's consistent across all four probes, but label the unit in the UI.
- **Leveltips use a `NL` ("next level") suffix** (`{{ basedamage }} -> {{ basedamageNL }}`) and the same expression syntax.

## 2. CommunityDragon bin structure

How a champion bin is shaped, as observed in `game/data/characters/{slug}/{slug}.bin.json`:

- **Top level:** object path → object, plus a reserved `__linked: string[]`. Our first schema run failed closed on it, and it is now split off explicitly.
- **`CharacterRecord`:** `spells[4]` gives the Q/W/E/R root spell paths in slot order. `mCharacterPassiveSpell` gives the passive, and `mAbilities` lists `AbilityObject`s whose `mChildSpells` hold sub-spells (evolved Kha'Zix spells, Hwei's nine sub-spells, and so on).
- **Legacy spell objects coexist with live ones.** Annie's bin has both `Disintegrate` and `AnnieQ`, so the extractor must follow `CharacterRecord`, never match by name.
- **Hashed names:** CDragon hasn't unhashed every path or field. Examples: Briar's passive root is `{cf6ed5a6}`, Kha'Zix Q has calculations `{ba2719ef}` and `{8b6fe763}`, and the bin's magic-resist field did not map by name. Anything hashed is reported, never guessed.
- **Values are float32:** `0.8` arrives as `0.800000011920929`. `cleanFloat32` recovers the shortest decimal that rounds to the same float32, which is lossless and deterministic.
- **Mode overrides:** `DataValuesModeOverride` carries per-mode values: `cherry` (12 spells across the probes), `ARAM` (1) and one hashed mode. The extractor reads only the base `DataValues` (Summoner's Rift); PLAN §6 puts other modes out of scope.

### Index conventions (observed, not documented upstream)

| Field | Indexing | Evidence |
|---|---|---|
| `DataValues[].values`, `mEffectAmount[].value` | **by rank; index 0 unused** | Annie R (max rank 3) is `25/150/275/400/525/…`, and the legacy `InfernalGuardian` object is non-zero only at indices 1–3. Kha'Zix Q `mEffectAmount[0]` is `80,80,105,…` |
| `cooldownTime` | **by rank; index 0 unused** | ddragon `cooldown` equals `cooldownTime[1..maxRank]` on 14/16 probe spells, 9 of which match *only* this alignment. The other two are Annie E (no array on the root spell) and the Hwei E mismatch below |
| `mana` | **0-indexed (index 0 = rank 1)** | ddragon `cost` equals `mana[0..maxRank-1]` on every probe spell that has a mana array |

### How placeholders map

The name inside `{{ }}` matches, case-insensitively, one of these:

1. a `mSpellCalculations` key on the ability's root or child spells (e.g. `TotalDamage`);
2. a `DataValues` name;
3. `effect{N}amount`, which is `mEffectAmount[N-1]`;
4. with a `spell.<script>:` prefix, the same lookups on the spell whose `mScriptName` matches, anywhere in the bin.

This resolves 11/11 (Annie), 11/11 (Kha'Zix), 24/24 (Briar) and 23/23 (Hwei) value-bearing placeholders.

## 3. Extraction prototype (ADR-002 declarative core)

`pnpm extract-bins` maps a tooltip placeholder into `{ base[rank], scalings[] }` when it (a) names a bin calculation, (b) sits inside a typed tooltip tag (`magicDamage`, `physicalDamage`, `trueDamage`, `shield`, `healing`), and (c) is built only from additive parts. Anything else is written to `unmapped` with a reason.

| Probe | Formulas mapped | Unmapped (formula-shaped) | Main blockers |
|---|---|---|---|
| Annie | **6** (Q, W, E shield, E reflect, R burst, R aura) | 1 (E decaying move speed; level-interpolated, untagged) | — |
| Kha'Zix | 1 (W heal) | 6 | cross-spell refs into evolved/isolated variants; `EffectValueCalculationPart` |
| Briar | 1 (R damage) | 9 | **unverified stat enums** on 8 (`mStat=2`, `mStat=12`, `mStatFormula=2`); 1 untagged |
| Hwei | 11 | 2 (+3 cross-spell display values) | `GameCalculationModified`; untagged move speed |

Calculation-part types seen across the probes:

| Part / calculation type | Declarative? |
|---|---|
| `NamedDataValueCalculationPart`, `NumberCalculationPart` | yes (base) |
| `StatByNamedDataValueCalculationPart`, `StatByCoefficientCalculationPart` | yes (scaling), once the stat enum is known |
| `ByCharLevelBreakpointsCalculationPart`, `ByCharLevelInterpolationCalculationPart`, `ByCharLevelFormulaCalculationPart` | no: level-based → evaluator, or a schema extension for level curves |
| `ProductOfSubPartsCalculationPart`, `SumOfSubPartsCalculationPart` | no: nested → evaluator |
| `GameCalculationConditional` (Kha'Zix isolation), `GameCalculationModified` (multiplier) | no → evaluator (matches ADR-002's Kha'Zix example) |
| `EffectValueCalculationPart` (legacy effect table) | likely declarative after resolving the effect index; not done in the prototype |

**Stat enum (TODO(verify)).** Scaling parts name their stat as numeric enums `mStat` / `mStatFormula`, where an absent field means 0. The hextechdocs reference cited in ADR-001 was unreachable from the dev environment. So only the default pair is mapped, as ability power, and that is itself unverified. Every mapped probe formula relies on it, including Briar R. Values seen: `mStat` ∈ {absent, 2, 12}, `mStatFormula` ∈ {absent, 2}.

**Determinism.** Re-running the extractor or the audit with unchanged inputs gives byte-identical files. `provenance.extractedAt` is date-only, and it is kept when the extracted abilities didn't change. The tool never writes `verifiedAtPatch`.

**Not done in Phase 0:** passive extraction (Annie's stun duration is level-breakpoint based) and data-pin scaffolding. The pin format should be designed alongside the engine in Phase 4; the runbook step stays as written.

## 4. Upstream disagreements (need a human)

| # | What | ddragon | Bin (game data) | Notes |
|---|---|---|---|---|
| 1 | `attackdamageperlevel`, all champions | `0` for 173/173 since **16.5.1** (16.4.1 still had e.g. Annie 2.65) | non-zero, e.g. Annie `damagePerLevel` 2.65 | Looks like an upstream regression rather than a game change, but that is not established. Affects the Phase 1 level slider and every stat-at-level number. |
| 2 | Hwei E cooldown | `12/11.5/11/10.5/10` | `cooldownTime[1..5]` = `13/12.5/12/11.5/11` | One source is wrong, or the cooldown is modified elsewhere in the kit. |

The other probe base stats agree across the two sources, allowing for unit and naming differences.

## 5. Other notes

- **ARCHITECTURE §3's UI-strings path has moved.** `game/data/menu/fontconfig_en_us.txt.json` now returns 404 for 16.19. The strings are at `game/en_us/data/menu/en_us/lol.stringtable.json` (31 MB; tooltips use `@CalcName@`). ARCHITECTURE has been updated.
- **CDragon path per patch:** `raw.communitydragon.org/{major.minor}/…` exists for 16.19, and the `latest` alias also works. ddragon versions map to CDragon by their first two parts.
- **Node's global `fetch` ignores `HTTPS_PROXY`.** The pipeline uses undici's `EnvHttpProxyAgent` when a proxy variable is set. This only matters in sandboxed environments.

## 6. Proposed amendments

These are drafted in the ADRs themselves, with status still **Proposed**.

- **ADR-001:** base stats get a bin cross-check at ingest, and disagreements become quirk entries or invariant failures rather than silent T1. Also document the index conventions and the literal-number caveat.
- **ADR-002:** list the evaluator-bound part types above. Extraction follows `CharacterRecord`/`AbilityObject`, and cross-spell references are part of the model. Stat-enum entries need provenance like quirks do. `extractedAt` is date-only and preserved.

## Maintainer verification list

1. **Stat enum:** confirm that `mStat`/`mStatFormula` absent means ability power, and what `mStat` 2 and 12 and `mStatFormula` 2 mean (hextechdocs). This unblocks Briar and validates every mapped formula.
2. **Rank indexing:** confirm the `DataValues`/`cooldownTime` versus `mana` index conventions against the wiki for one spell each.
3. **Annie's extracted values** (`data/curated/annie.json`, sourcePatch 16.19.1): check them against the wiki or the Practice Tool. If they're right, set `verifiedAtPatch`, which only you do.
4. **AD growth:** decide between a quirk entry, taking growth from bins, or waiting for an upstream fix before the Phase 1 level slider.
5. **Hwei E cooldown:** which source is right?
6. **Chart library:** confirm ECharts ([phase0-chart-spike.md](./phase0-chart-spike.md)).
7. **ADR-001/002:** review the amendments and flip them to Accepted.
