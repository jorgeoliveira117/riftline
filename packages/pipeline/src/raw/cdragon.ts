import { z } from "zod";

// CommunityDragon bin JSON is undocumented and champion-specific. These schemas validate only the
// structure the extractor reads; unknown fields pass through. Hashed names ("{cf6ed5a6}") appear
// wherever CDragon has not unhashed a path or field.

const BinObjects = z.record(z.string(), z.looseObject({ __type: z.string().optional() }));

/**
 * A bin file: object path → object, plus a reserved `__linked` array naming other bin files this
 * one links to. `__linked` is split off so every remaining entry must be an object.
 */
export const CdragonBin = z
  .looseObject({ __linked: z.array(z.string()) })
  .transform(({ __linked: _linked, ...objects }) => objects)
  .pipe(BinObjects);
export type CdragonBin = z.infer<typeof CdragonBin>;

export const SpellDataValue = z.looseObject({
  name: z.string(),
  /** Rank-indexed: index 0 is rank 0 (unused by ranked spells) — see phase0-findings. */
  values: z.array(z.number()).optional(),
});

export const SpellObject = z.looseObject({
  __type: z.literal("SpellObject"),
  mScriptName: z.string().optional(),
  mSpell: z
    .looseObject({
      DataValues: z.array(SpellDataValue).optional(),
      mSpellCalculations: z.record(z.string(), z.looseObject({ __type: z.string() })).optional(),
      /** 0-indexed by rank (index 0 = rank 1), unlike DataValues. */
      mana: z.array(z.number()).optional(),
      cooldownTime: z.array(z.number()).optional(),
      /** Legacy effect table referenced by tooltips as `effect{N}amount`; rank-indexed like DataValues. */
      mEffectAmount: z.array(z.looseObject({ value: z.array(z.number()).optional() })).optional(),
    })
    .optional(),
});
export type SpellObject = z.infer<typeof SpellObject>;

export const AbilityObject = z.looseObject({
  __type: z.literal("AbilityObject"),
  mRootSpell: z.string(),
  mChildSpells: z.array(z.string()).optional(),
});
export type AbilityObject = z.infer<typeof AbilityObject>;

export const CharacterRecord = z.looseObject({
  __type: z.literal("CharacterRecord"),
  /** Q, W, E, R spell object paths, in slot order. */
  spells: z.array(z.string()).length(4),
  mCharacterPassiveSpell: z.string().optional(),
  mAbilities: z.array(z.string()).optional(),
});
export type CharacterRecord = z.infer<typeof CharacterRecord>;
