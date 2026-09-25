import { z } from "zod";
import { FiniteNumber } from "./common";

/**
 * ddragon item, T1. `stats` keeps ddragon's stat-block keys verbatim (e.g. FlatPhysicalDamageMod);
 * stats ddragon omits (lethality, % pen, …) come from the curated overlay in Phase 4.
 */
export const Item = z.strictObject({
  id: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  descriptionHtml: z.string(),
  gold: z.strictObject({
    base: z.int().nonnegative(),
    total: z.int().nonnegative(),
    sell: z.int().nonnegative(),
    purchasable: z.boolean(),
  }),
  tags: z.array(z.string()),
  from: z.array(z.string()),
  into: z.array(z.string()),
  /** Map ids where the item is available, e.g. "11" = Summoner's Rift. */
  maps: z.array(z.string()),
  stats: z.record(z.string(), FiniteNumber),
});
export type Item = z.infer<typeof Item>;
