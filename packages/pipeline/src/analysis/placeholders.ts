import type { BinAbility } from "../bin/kit";
import { findSpellByScriptName, namesIn } from "../bin/kit";
import type { CdragonBin } from "../raw/cdragon";
import type { DdragonSpell } from "../raw/ddragon";

/** UI hooks the client fills in; they carry no gameplay value. */
const UI_HOOKS = new Set(["spellmodifierdescriptionappend", "abilityresourcename"]);

export type Resolution =
  | "ui-hook"
  | "ddragon-effect"
  | "ddragon-vars"
  | "ddragon-datavalues"
  | "cdragon-calculation"
  | "cdragon-datavalue"
  | "cdragon-effectamount"
  | "unresolved";

export interface Placeholder {
  /** Raw token between the braces, e.g. "slowamount*100" or "spell.khazixq:isodamage". */
  raw: string;
  /** Lowercased variable name without spell prefix or multiplier. */
  name: string;
  /** Script name of another spell the token points into (`spell.<script>:<name>`). */
  spell?: string;
  /** Display multiplier from expressions like `name*100`, when present. */
  multiplier?: number;
  resolution: Resolution;
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
const PARTS = /^(?:spell\.([A-Za-z0-9_]+):)?([A-Za-z0-9_.]+)(?:\s*\*\s*(-?[\d.]+))?$/;

export function parsePlaceholders(tooltip: string): Omit<Placeholder, "resolution">[] {
  return [...tooltip.matchAll(TOKEN)].map((m) => {
    const raw = m[1] ?? "";
    const parts = PARTS.exec(raw);
    if (!parts) return { raw, name: raw.toLowerCase() };
    const [, spell, name = raw, multiplier] = parts;
    return {
      raw,
      name: name.toLowerCase(),
      ...(spell ? { spell: spell.toLowerCase() } : {}),
      ...(multiplier ? { multiplier: Number(multiplier) } : {}),
    };
  });
}

const isZeroBurn = (burn: string) => /^0(\/0)*$/.test(burn);

export interface BinContext {
  bin: CdragonBin;
  ability: BinAbility | undefined;
}

function resolveInBin(p: Omit<Placeholder, "resolution">, ctx: BinContext): Resolution {
  const target = p.spell ? findSpellByScriptName(ctx.bin, p.spell) : undefined;
  if (p.spell && !target) return "unresolved";
  const spells = target ? target.abilitySpells : (ctx.ability?.spells ?? []);
  const names = namesIn({ spells });
  if (names.calculations.has(p.name)) return "cdragon-calculation";
  if (names.dataValues.has(p.name)) return "cdragon-datavalue";
  const effect = /^effect(\d+)amount$/.exec(p.name)?.[1];
  if (effect !== undefined) {
    const amounts = spells[0]?.spell.mSpell?.mEffectAmount;
    if (amounts?.[Number(effect) - 1]?.value) return "cdragon-effectamount";
  }
  return "unresolved";
}

/**
 * Classifies each tooltip placeholder by the first source that can supply its value:
 * ddragon's own spell fields first (T1), then the champion's CDragon bin (T2 candidates).
 */
export function auditSpell(spell: DdragonSpell, ctx?: BinContext): Placeholder[] {
  return parsePlaceholders(spell.tooltip).map((p): Placeholder => {
    if (UI_HOOKS.has(p.name)) return { ...p, resolution: "ui-hook" };
    if (!p.spell) {
      const effectIndex = /^e(\d+)$/.exec(p.name)?.[1];
      const burn = effectIndex === undefined ? undefined : spell.effectBurn[Number(effectIndex)];
      if (burn && !isZeroBurn(burn)) return { ...p, resolution: "ddragon-effect" };
      if (spell.vars.some((v) => v.key.toLowerCase() === p.name))
        return { ...p, resolution: "ddragon-vars" };
      if (Object.keys(spell.datavalues).some((k) => k.toLowerCase() === p.name))
        return { ...p, resolution: "ddragon-datavalues" };
    }
    return { ...p, resolution: ctx ? resolveInBin(p, ctx) : "unresolved" };
  });
}
