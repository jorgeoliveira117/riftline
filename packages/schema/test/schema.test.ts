// All numbers in this file are synthetic test values, not gameplay data.
import { describe, expect, it } from "vitest";
import {
  Ability,
  AbilityFormula,
  ChampionSnapshot,
  CuratedChampion,
  PatchId,
  type BaseStats,
} from "../src";

const growth = { base: 1, perLevel: 1 };
const stats: BaseStats = {
  health: growth,
  healthRegen: growth,
  resource: growth,
  resourceRegen: growth,
  armor: growth,
  magicResist: growth,
  attackDamage: growth,
  attackSpeed: growth,
  crit: { base: 0, perLevel: 0 },
  moveSpeed: 1,
  attackRange: 1,
};

const formula = {
  id: "q.totalDamage",
  label: "Damage",
  damageType: "magic",
  base: [10, 20, 30],
  scalings: [{ stat: "abilityPower", coeff: 0.5 }],
} as const;

const ability = (slot: "P" | "Q" | "W" | "E" | "R") => ({
  slot,
  name: `Synthetic ${slot}`,
  descriptionHtml: "",
});

describe("PatchId", () => {
  it("accepts ddragon versions and rejects marketing patch names", () => {
    expect(PatchId.safeParse("16.19.1").success).toBe(true);
    expect(PatchId.safeParse("25.S1.1").success).toBe(false);
    expect(PatchId.safeParse("16.19").success).toBe(false);
  });
});

describe("AbilityFormula", () => {
  it("accepts the declarative core", () => {
    expect(AbilityFormula.parse(formula)).toEqual(formula);
  });

  it("accepts per-rank coefficients of matching length", () => {
    const f = { ...formula, scalings: [{ stat: "abilityPower", coeff: [0.1, 0.2, 0.3] }] };
    expect(AbilityFormula.safeParse(f).success).toBe(true);
  });

  it("rejects per-rank coefficients whose length differs from base", () => {
    const f = { ...formula, scalings: [{ stat: "abilityPower", coeff: [0.1, 0.2] }] };
    expect(AbilityFormula.safeParse(f).success).toBe(false);
  });

  it("rejects unknown scaling stats and unknown keys", () => {
    expect(
      AbilityFormula.safeParse({ ...formula, scalings: [{ stat: "luck", coeff: 1 }] }).success,
    ).toBe(false);
    expect(AbilityFormula.safeParse({ ...formula, extra: true }).success).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    expect(AbilityFormula.safeParse({ ...formula, base: [10, Infinity, 30] }).success).toBe(false);
  });
});

describe("Ability", () => {
  it("requires per-rank arrays to match maxRank", () => {
    const a = { ...ability("Q"), maxRank: 3, cost: [1, 2, 3], formulas: [formula] };
    expect(Ability.safeParse(a).success).toBe(true);
    expect(Ability.safeParse({ ...a, cost: [1, 2] }).success).toBe(false);
    expect(Ability.safeParse({ ...a, maxRank: 5 }).success).toBe(false);
  });
});

describe("ChampionSnapshot", () => {
  const champion = {
    slug: "synthetic",
    ddragonId: "Synthetic",
    key: 1,
    name: "Synthetic",
    title: "the Fixture",
    tags: ["Mage"],
    resourceType: "Mana",
    stats,
    abilities: (["P", "Q", "W", "E", "R"] as const).map(ability),
    trust: "ddragon",
  };

  it("accepts a well-formed snapshot", () => {
    expect(ChampionSnapshot.safeParse(champion).success).toBe(true);
  });

  it("requires exactly five abilities and a lowercase slug", () => {
    expect(
      ChampionSnapshot.safeParse({ ...champion, abilities: champion.abilities.slice(1) }).success,
    ).toBe(false);
    expect(ChampionSnapshot.safeParse({ ...champion, slug: "Synthetic" }).success).toBe(false);
  });
});

describe("CuratedChampion", () => {
  const curated = {
    slug: "synthetic",
    provenance: {
      sourcePatch: "16.19.1",
      cdragonPath: "game/data/characters/synthetic/synthetic.bin.json",
      extractedAt: "2026-01-01",
      verifiedAtPatch: null,
    },
    abilities: [{ slot: "Q", maxRank: 3, formulas: [formula], unmapped: [] }],
  };

  it("accepts unverified provenance", () => {
    expect(CuratedChampion.safeParse(curated).success).toBe(true);
  });

  it("rejects a timestamp in extractedAt (date only, for deterministic output)", () => {
    const withTime = {
      ...curated,
      provenance: { ...curated.provenance, extractedAt: "2026-01-01T10:00:00Z" },
    };
    expect(CuratedChampion.safeParse(withTime).success).toBe(false);
  });
});
