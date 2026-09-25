// Synthetic inputs only — see fixtures.ts.
import { CuratedChampion } from "@riftline/schema";
import { describe, expect, it } from "vitest";
import { damageTypeInTooltip } from "../src/extract/damage-type";
import { extractFormulas, formulaIdSegment } from "../src/extract/formulas";
import type { DdragonChampion } from "../src/raw/ddragon";
import { ddragonSpell, testBin } from "./fixtures";

function champion(qTooltip: string): DdragonChampion {
  return {
    id: "Test",
    key: "1",
    name: "Test",
    title: "",
    tags: ["Mage"],
    partype: "Mana",
    stats: {},
    passive: { name: "P", description: "" },
    spells: [
      ddragonSpell({ id: "TestQ", tooltip: qTooltip }),
      ddragonSpell({ id: "TestW" }),
      ddragonSpell({ id: "TestE" }),
      ddragonSpell({ id: "TestR", maxrank: 3 }),
    ],
  };
}

describe("damageTypeInTooltip", () => {
  it("reads the innermost typed tag around the placeholder", () => {
    const tip =
      "<magicDamage>{{ a }}</magicDamage> <shield>{{ b }} <br /> x</shield> <speed>{{ c }}</speed> " +
      "<physicalDamage><status>{{ d }}</status></physicalDamage>";
    expect(damageTypeInTooltip(tip, "a")).toBe("magic");
    expect(damageTypeInTooltip(tip, "b")).toBe("shield");
    expect(damageTypeInTooltip(tip, "c")).toBeUndefined();
    expect(damageTypeInTooltip(tip, "d")).toBe("physical");
  });
});

describe("formulaIdSegment", () => {
  it("camel-cases bin calculation names into schema-safe ids", () => {
    expect(formulaIdSegment("TotalDamage")).toBe("totalDamage");
    expect(formulaIdSegment("Tooltip_QQDamage")).toBe("tooltipQQDamage");
  });
});

describe("extractFormulas", () => {
  it("maps rank-indexed data values (skipping rank 0) and default-stat scalings", () => {
    const { abilities } = extractFormulas(
      champion("<magicDamage>{{ totaldamage }}</magicDamage> for {{ childduration }}s"),
      testBin(),
    );
    const q = abilities.find((a) => a.slot === "Q");
    expect(q?.formulas).toEqual([
      {
        id: "q.totalDamage",
        label: "Total Damage",
        damageType: "magic",
        base: [10, 20, 30, 40, 50],
        scalings: [{ stat: "abilityPower", coeff: 0.5 }],
      },
    ]);
    expect(q?.unmapped).toEqual([
      { name: "childduration", reason: "display value (cdragon-datavalue), not a formula" },
    ]);
  });

  it("reports untagged calculations and unknown stat enums instead of guessing", () => {
    const bin = testBin();
    const q = bin["Characters/Test/Spells/TestQAbility/TestQ"] as {
      mSpell: { mSpellCalculations: { TotalDamage: { mFormulaParts: Record<string, unknown>[] } } };
    };
    const parts = q.mSpell.mSpellCalculations.TotalDamage.mFormulaParts;
    parts[1] = { ...parts[1], mStat: 99 };

    const untagged = extractFormulas(champion("{{ totaldamage }}"), testBin()).abilities[0];
    expect(untagged?.unmapped[0]?.reason).toMatch(/no damage\/heal\/shield tag/);

    const unknownStat = extractFormulas(
      champion("<magicDamage>{{ totaldamage }}</magicDamage>"),
      bin,
    ).abilities[0];
    expect(unknownStat?.formulas).toEqual([]);
    expect(unknownStat?.unmapped[0]?.reason).toMatch(/TODO\(verify\): unmapped stat enum mStat=99/);
  });

  it("produces output that validates against schema v0", () => {
    const { abilities } = extractFormulas(
      champion("<magicDamage>{{ totaldamage }}</magicDamage>"),
      testBin(),
    );
    const curated = {
      slug: "test",
      provenance: {
        sourcePatch: "1.2.3",
        cdragonPath: "game/data/characters/test/test.bin.json",
        extractedAt: "2026-01-01",
        verifiedAtPatch: null,
      },
      abilities,
    };
    expect(CuratedChampion.safeParse(curated).success).toBe(true);
  });
});
