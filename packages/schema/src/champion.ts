import { z } from "zod";
import { Ability } from "./ability";
import { ChampionTag, FiniteNumber, RiotSubclass, Slug, Trust } from "./common";

/** A stat with Riot's per-level growth (ARCHITECTURE §5 growth curve applies to `perLevel`). */
export const StatGrowth = z.strictObject({
  base: FiniteNumber,
  perLevel: FiniteNumber,
});
export type StatGrowth = z.infer<typeof StatGrowth>;

/** Base stats straight from ddragon `stats` (T1). Field names are normalized; values are not. */
export const BaseStats = z.strictObject({
  health: StatGrowth,
  healthRegen: StatGrowth,
  /** ddragon `mp`; meaning depends on `resource` (mana, energy, none, …). */
  resource: StatGrowth,
  resourceRegen: StatGrowth,
  armor: StatGrowth,
  magicResist: StatGrowth,
  attackDamage: StatGrowth,
  /** `base` is attacks/second; `perLevel` is ddragon's percentage growth. */
  attackSpeed: StatGrowth,
  crit: StatGrowth,
  moveSpeed: FiniteNumber,
  attackRange: FiniteNumber,
});
export type BaseStats = z.infer<typeof BaseStats>;

export const ChampionSnapshot = z.strictObject({
  slug: Slug,
  ddragonId: z.string().min(1),
  key: z.int().positive(),
  name: z.string().min(1),
  title: z.string(),
  tags: z.array(ChampionTag).min(1),
  subclasses: z.array(RiotSubclass).optional(),
  /** ddragon `partype`, e.g. "Mana", "Energy", "None". */
  resourceType: z.string(),
  stats: BaseStats,
  abilities: z.array(Ability).length(5),
  trust: Trust,
});
export type ChampionSnapshot = z.infer<typeof ChampionSnapshot>;
