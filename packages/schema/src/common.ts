import { z } from "zod";

/** ddragon version string, e.g. "16.19.1" — the only patch identifier we trust (ARCHITECTURE §3). */
export const PatchId = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "expected a ddragon version like 16.19.1");
export type PatchId = z.infer<typeof PatchId>;

/** Lowercased ddragon id, e.g. "jarvaniv". */
export const Slug = z.string().regex(/^[a-z0-9]+$/, "expected a lowercased ddragon id");
export type Slug = z.infer<typeof Slug>;

export const Trust = z.enum(["ddragon", "curated"]);
export type Trust = z.infer<typeof Trust>;

/** ddragon champion tags (Riot's six classes). Subclasses are a curated overlay (PLAN §5). */
export const ChampionTag = z.enum(["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"]);
export type ChampionTag = z.infer<typeof ChampionTag>;

export const RiotSubclass = z.enum([
  "Enchanter",
  "Catcher",
  "Juggernaut",
  "Diver",
  "Burst",
  "Battlemage",
  "Artillery",
  "Marksman",
  "Assassin",
  "Skirmisher",
  "Vanguard",
  "Warden",
  "Specialist",
]);
export type RiotSubclass = z.infer<typeof RiotSubclass>;

export const AbilitySlot = z.enum(["P", "Q", "W", "E", "R"]);
export type AbilitySlot = z.infer<typeof AbilitySlot>;

export const DamageType = z.enum(["physical", "magic", "true", "heal", "shield"]);
export type DamageType = z.infer<typeof DamageType>;

/**
 * Stats an ability formula can scale with. Prefixes: `bonus*` = from items/runes/buffs only,
 * `target*` = the target's stat. Keys are added here deliberately (schema change), never ad hoc.
 */
export const StatKey = z.enum([
  "abilityPower",
  "attackDamage",
  "bonusAttackDamage",
  "maxHealth",
  "bonusHealth",
  "armor",
  "bonusArmor",
  "magicResist",
  "bonusMagicResist",
  "maxMana",
  "bonusMana",
  "level",
  "targetMaxHealth",
  "targetCurrentHealth",
  "targetMissingHealth",
]);
export type StatKey = z.infer<typeof StatKey>;

export const FiniteNumber = z.number();
