import { z } from "zod";

// Upstream contracts: validate every field we consume and let unconsumed upstream fields pass
// through (looseObject). Oddities go to the quirks registry, never into looser schemas here.

export const DdragonVersions = z.array(z.string().min(1)).min(1);

const StatBlock = z.record(z.string(), z.number());

export const DdragonSpell = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tooltip: z.string(),
  maxrank: z.int().positive(),
  cooldown: z.array(z.number()),
  cost: z.array(z.number()),
  effect: z.array(z.array(z.number()).nullable()),
  effectBurn: z.array(z.string().nullable()),
  vars: z.array(
    z.looseObject({
      key: z.string(),
      link: z.string(),
      coeff: z.union([z.number(), z.array(z.number())]),
    }),
  ),
  datavalues: z.record(z.string(), z.unknown()),
  costType: z.string(),
  resource: z.string().optional(),
});
export type DdragonSpell = z.infer<typeof DdragonSpell>;

export const DdragonChampion = z.looseObject({
  id: z.string().min(1),
  key: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  title: z.string(),
  tags: z.array(z.string()),
  partype: z.string(),
  stats: StatBlock,
  spells: z.array(DdragonSpell).length(4),
  passive: z.looseObject({ name: z.string(), description: z.string() }),
});
export type DdragonChampion = z.infer<typeof DdragonChampion>;

export const DdragonChampionFull = z.looseObject({
  version: z.string(),
  data: z.record(z.string(), DdragonChampion),
});
export type DdragonChampionFull = z.infer<typeof DdragonChampionFull>;

export const DdragonItem = z.looseObject({
  name: z.string(),
  description: z.string(),
  gold: z.looseObject({
    base: z.number(),
    total: z.number(),
    sell: z.number(),
    purchasable: z.boolean(),
  }),
  tags: z.array(z.string()).optional(),
  from: z.array(z.string()).optional(),
  into: z.array(z.string()).optional(),
  maps: z.record(z.string(), z.boolean()),
  stats: StatBlock,
});

export const DdragonItems = z.looseObject({
  version: z.string(),
  data: z.record(z.string(), DdragonItem),
});
