// Synthetic upstream-shaped fixtures. Every number here is made up for tests.
import type { CdragonBin } from "../src/raw/cdragon";
import type { DdragonSpell } from "../src/raw/ddragon";

export function ddragonSpell(overrides: Partial<DdragonSpell> = {}): DdragonSpell {
  return {
    id: "TestQ",
    name: "Test Spell",
    description: "",
    tooltip: "",
    maxrank: 5,
    cooldown: [1, 1, 1, 1, 1],
    cost: [1, 2, 3, 4, 5],
    effect: [null, [0, 0, 0, 0, 0]],
    effectBurn: [null, "0"],
    vars: [],
    datavalues: {},
    costType: "",
    ...overrides,
  };
}

const spell = (script: string, mSpell: Record<string, unknown>) => ({
  __type: "SpellObject",
  mScriptName: script,
  mSpell,
});

/** A minimal bin in CDragon's shape: rank-indexed DataValues with an unused rank-0 slot. */
export function testBin(): CdragonBin {
  const root = "Characters/Test/Spells";
  return {
    "Characters/Test/CharacterRecords/Root": {
      __type: "CharacterRecord",
      spells: [`${root}/TestQAbility/TestQ`, `${root}/TestW`, `${root}/TestE`, `${root}/TestR`],
      mCharacterPassiveSpell: `${root}/TestPassive`,
    },
    [`${root}/TestQAbility`]: {
      __type: "AbilityObject",
      mRootSpell: `${root}/TestQAbility/TestQ`,
      mChildSpells: [`${root}/TestQAbility/TestQ`, `${root}/TestQAbility/TestQChild`, "{deadbeef}"],
    },
    [`${root}/TestQAbility/TestQ`]: spell("TestQ", {
      DataValues: [
        { name: "BaseDamage", values: [0, 10, 20, 30, 40, 50, 60] },
        { name: "APRatio", values: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
      ],
      mSpellCalculations: {
        TotalDamage: {
          __type: "GameCalculation",
          mFormulaParts: [
            { __type: "NamedDataValueCalculationPart", mDataValue: "BaseDamage" },
            { __type: "StatByNamedDataValueCalculationPart", mDataValue: "APRatio" },
          ],
        },
      },
      mana: [1, 2, 3, 4, 5, 6],
      mEffectAmount: [{ value: [0, 1, 2, 3, 4, 5, 6] }],
    }),
    [`${root}/TestQAbility/TestQChild`]: spell("TestQChild", {
      DataValues: [{ name: "ChildDuration", values: [1, 1, 1, 1, 1, 1, 1] }],
    }),
    [`${root}/TestW`]: spell("TestW", {}),
    [`${root}/TestE`]: spell("TestE", {}),
    [`${root}/TestR`]: spell("TestR", {}),
    [`${root}/TestPassive`]: spell("TestPassive", {}),
    [`${root}/Other`]: spell("TestOther", { DataValues: [{ name: "Elsewhere", values: [1] }] }),
  };
}
