import type { AbilityFormula, AbilitySlot, CuratedAbility, Scaling } from "@riftline/schema";
import { auditSpell } from "../analysis/placeholders";
import { namesIn, readKit, type BinAbility } from "../bin/kit";
import { statKeyFor } from "../quirks/stat-enum";
import type { CdragonBin } from "../raw/cdragon";
import type { DdragonChampion } from "../raw/ddragon";
import { cleanFloat32 } from "../util/numbers";
import { damageTypeInTooltip } from "./damage-type";

type Unmapped = CuratedAbility["unmapped"][number];
type Part = { __type?: unknown; [key: string]: unknown };

const SLOTS = ["Q", "W", "E", "R"] as const;

/** Bin calculation names → formula id segment: "TotalDamage" → "totalDamage", "Tooltip_QQDamage" → "tooltipQQDamage". */
export function formulaIdSegment(calcName: string): string {
  const [first = "", ...rest] = calcName.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return [
    first.charAt(0).toLowerCase() + first.slice(1),
    ...rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1)),
  ].join("");
}

const words = (s: string) =>
  s
    .replace(/_+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

/** DataValues are rank-indexed with an unused rank-0 slot: ranks 1..maxRank are values[1..maxRank]. */
function perRank(values: number[] | undefined, maxRank: number): number[] | undefined {
  if (!values || values.length < maxRank + 1) return undefined;
  return values.slice(1, maxRank + 1).map(cleanFloat32);
}

const collapse = (values: number[]) => (values.every((v) => v === values[0]) ? values[0]! : values);

/**
 * Translates one GameCalculation into the declarative core (ADR-002), or explains why it cannot.
 * Only additive calculations of base values and stat scalings are mapped; anything else needs an
 * evaluator and is reported instead of approximated.
 */
function translate(
  calcName: string,
  calc: Part,
  ability: BinAbility,
  maxRank: number,
): { base: number[]; scalings: Scaling[] } | { reason: string } {
  if (calc.__type !== "GameCalculation")
    return { reason: `calculation type ${String(calc.__type)} needs an evaluator` };
  const parts = Array.isArray(calc.mFormulaParts) ? (calc.mFormulaParts as Part[]) : [];
  if (parts.length === 0) return { reason: "calculation has no formula parts" };

  const dataValue = (name: unknown) => {
    for (const { spell } of ability.spells) {
      const dv = spell.mSpell?.DataValues?.find((d) => d.name === name);
      if (dv) return perRank(dv.values, maxRank);
    }
    return undefined;
  };

  const base = Array.from({ length: maxRank }, () => 0);
  const scalings: Scaling[] = [];
  for (const part of parts) {
    switch (part.__type) {
      case "NamedDataValueCalculationPart": {
        const values = dataValue(part.mDataValue);
        if (!values)
          return {
            reason: `data value ${String(part.mDataValue)} missing or shorter than maxRank`,
          };
        values.forEach((v, i) => (base[i] = cleanFloat32((base[i] ?? 0) + v)));
        break;
      }
      case "NumberCalculationPart": {
        if (typeof part.mNumber !== "number")
          return { reason: "NumberCalculationPart without mNumber" };
        const n = cleanFloat32(part.mNumber);
        base.forEach((v, i) => (base[i] = cleanFloat32(v + n)));
        break;
      }
      case "StatByNamedDataValueCalculationPart":
      case "StatByCoefficientCalculationPart": {
        const stat = statKeyFor(part.mStat, part.mStatFormula);
        if (!stat) {
          return {
            reason: `TODO(verify): unmapped stat enum mStat=${String(part.mStat ?? 0)} mStatFormula=${String(part.mStatFormula ?? 0)}`,
          };
        }
        const coeff =
          part.__type === "StatByCoefficientCalculationPart"
            ? typeof part.mCoefficient === "number"
              ? cleanFloat32(part.mCoefficient)
              : undefined
            : dataValue(part.mDataValue);
        if (coeff === undefined) return { reason: `scaling coefficient missing in ${calcName}` };
        scalings.push({ stat, coeff: Array.isArray(coeff) ? collapse(coeff) : coeff });
        break;
      }
      default:
        return { reason: `part type ${String(part.__type)} needs an evaluator` };
    }
  }
  return { base, scalings };
}

/**
 * Prototype bin extraction: for each Q/W/E/R tooltip placeholder that names a bin calculation,
 * emit a declarative formula; everything else is listed as unmapped for human review.
 */
export function extractFormulas(champion: DdragonChampion, bin: CdragonBin) {
  const kit = readKit(bin);
  const abilities: CuratedAbility[] = [];

  SLOTS.forEach((slot: AbilitySlot, i) => {
    const spell = champion.spells[i];
    const ability = kit.abilities.find((a) => a.slot === slot);
    if (!spell || !ability) throw new Error(`${champion.id}: no ${slot} in ddragon or bin`);
    const maxRank = spell.maxrank;
    const formulas: AbilityFormula[] = [];
    const unmapped: Unmapped[] = [];
    const { calculations } = namesIn(ability);

    const seen = new Set<string>();
    for (const p of auditSpell(spell, { bin, ability })) {
      if (p.resolution === "ui-hook" || seen.has(p.raw)) continue;
      seen.add(p.raw);
      if (p.spell || p.resolution !== "cdragon-calculation") {
        unmapped.push({
          name: p.raw,
          reason: p.spell
            ? "cross-spell reference; not extracted by the prototype"
            : `display value (${p.resolution}), not a formula`,
        });
        continue;
      }
      const ref = calculations.get(p.name)!;
      const owner = ability.spells.find((s) => s.path === ref.spellPath)!;
      const calc = owner.spell.mSpell?.mSpellCalculations?.[ref.name] as Part;
      const damageType = damageTypeInTooltip(spell.tooltip, p.raw);
      if (!damageType) {
        unmapped.push({
          name: p.raw,
          reason: "no damage/heal/shield tag around it in the tooltip",
        });
        continue;
      }
      const result = translate(ref.name, calc, ability, maxRank);
      if ("reason" in result) {
        unmapped.push({ name: p.raw, reason: result.reason });
        continue;
      }
      formulas.push({
        id: `${slot.toLowerCase()}.${formulaIdSegment(ref.name)}`,
        label: words(ref.name),
        damageType,
        base: result.base,
        scalings: result.scalings,
      });
    }
    abilities.push({ slot, maxRank, formulas, unmapped });
  });

  return { abilities, warnings: kit.warnings };
}
