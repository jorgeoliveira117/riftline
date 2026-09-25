import type { AbilitySlot } from "@riftline/schema";
import {
  AbilityObject,
  CharacterRecord,
  SpellObject,
  type CdragonBin,
  type SpellObject as SpellObjectType,
} from "../raw/cdragon";

export interface BinAbility {
  slot: AbilitySlot;
  /** Path of the slot's root spell object, e.g. Characters/Annie/Spells/AnnieQAbility/AnnieQ. */
  rootPath: string;
  /** Root first, then the ability's child spells that exist in the bin. */
  spells: { path: string; spell: SpellObjectType }[];
  /** Paths referenced by the ability but absent from the bin (often hashed names). */
  missing: string[];
}

export interface BinKit {
  abilities: BinAbility[];
  warnings: string[];
}

const SLOTS = ["Q", "W", "E", "R"] as const;

/**
 * Groups a champion bin's spell objects by slot: CharacterRecord.spells gives Q/W/E/R roots,
 * mCharacterPassiveSpell the passive, and AbilityObjects list each root's child spells.
 */
export function readKit(bin: CdragonBin): BinKit {
  const warnings: string[] = [];
  const recordEntry = Object.values(bin).find((o) => o.__type === "CharacterRecord");
  if (!recordEntry) throw new Error("bin has no CharacterRecord");
  const record = CharacterRecord.parse(recordEntry);

  const childrenByRoot = new Map<string, string[]>();
  for (const obj of Object.values(bin)) {
    if (obj.__type !== "AbilityObject") continue;
    const ability = AbilityObject.parse(obj);
    childrenByRoot.set(ability.mRootSpell, ability.mChildSpells ?? []);
  }

  const roots: [AbilitySlot, string | undefined][] = [
    ["P", record.mCharacterPassiveSpell],
    ...SLOTS.map((slot, i): [AbilitySlot, string | undefined] => [slot, record.spells[i]]),
  ];

  const abilities: BinAbility[] = [];
  for (const [slot, rootPath] of roots) {
    if (!rootPath) {
      warnings.push(`${slot}: CharacterRecord names no spell`);
      continue;
    }
    const paths = [rootPath, ...(childrenByRoot.get(rootPath) ?? [])].filter(
      (p, i, all) => all.indexOf(p) === i,
    );
    const spells: BinAbility["spells"] = [];
    const missing: string[] = [];
    for (const path of paths) {
      const obj = bin[path];
      if (obj?.__type === "SpellObject") spells.push({ path, spell: SpellObject.parse(obj) });
      else missing.push(path);
    }
    if (missing.includes(rootPath)) warnings.push(`${slot}: root spell ${rootPath} not in bin`);
    abilities.push({ slot, rootPath, spells, missing });
  }
  return { abilities, warnings };
}

/** Case-insensitive lookup tables for the names tooltips reference. */
export function namesIn(ability: Pick<BinAbility, "spells">) {
  const calculations = new Map<string, { spellPath: string; name: string }>();
  const dataValues = new Map<string, { spellPath: string; name: string }>();
  for (const { path, spell } of ability.spells) {
    for (const name of Object.keys(spell.mSpell?.mSpellCalculations ?? {})) {
      if (!calculations.has(name.toLowerCase()))
        calculations.set(name.toLowerCase(), { spellPath: path, name });
    }
    for (const { name } of spell.mSpell?.DataValues ?? []) {
      if (!dataValues.has(name.toLowerCase()))
        dataValues.set(name.toLowerCase(), { spellPath: path, name });
    }
  }
  return { calculations, dataValues };
}

/** Finds a spell object anywhere in the bin by script name (tooltips' `spell.<name>:<var>`). */
export function findSpellByScriptName(bin: CdragonBin, scriptName: string) {
  const wanted = scriptName.toLowerCase();
  for (const [path, obj] of Object.entries(bin)) {
    if (obj.__type !== "SpellObject") continue;
    const spell = SpellObject.parse(obj);
    if (spell.mScriptName?.toLowerCase() === wanted) {
      const spells: BinAbility["spells"] = [{ path, spell }];
      return { path, spell, abilitySpells: spells };
    }
  }
  return undefined;
}
