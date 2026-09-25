import { describe, expect, it } from "vitest";
import { auditSpell, parsePlaceholders } from "../src/analysis/placeholders";
import { readKit } from "../src/bin/kit";
import { CdragonBin } from "../src/raw/cdragon";
import { ddragonSpell, testBin } from "./fixtures";

describe("parsePlaceholders", () => {
  it("parses plain, expression and cross-spell tokens", () => {
    expect(
      parsePlaceholders("a {{ TotalDamage }} b {{ slow*-100 }} c {{ spell.OtherQ:Dmg }}"),
    ).toEqual([
      { raw: "TotalDamage", name: "totaldamage" },
      { raw: "slow*-100", name: "slow", multiplier: -100 },
      { raw: "spell.OtherQ:Dmg", name: "dmg", spell: "otherq" },
    ]);
  });
});

describe("CdragonBin", () => {
  it("splits off __linked and requires every other entry to be an object", () => {
    expect(Object.keys(CdragonBin.parse({ __linked: [], "A/B": { __type: "X" } }))).toEqual([
      "A/B",
    ]);
    expect(CdragonBin.safeParse({ __linked: [], "A/B": [1] }).success).toBe(false);
  });
});

describe("readKit", () => {
  it("groups root and child spells per slot and reports missing children", () => {
    const kit = readKit(testBin());
    expect(kit.abilities.map((a) => a.slot)).toEqual(["P", "Q", "W", "E", "R"]);
    const q = kit.abilities.find((a) => a.slot === "Q");
    expect(q?.spells.map((s) => s.spell.mScriptName)).toEqual(["TestQ", "TestQChild"]);
    expect(q?.missing).toEqual(["{deadbeef}"]);
    expect(kit.warnings).toEqual([]);
  });
});

describe("auditSpell", () => {
  const bin = testBin();
  const ability = readKit(bin).abilities.find((a) => a.slot === "Q");
  const audit = (tooltip: string, overrides = {}) =>
    auditSpell(ddragonSpell({ tooltip, ...overrides }), { bin, ability }).map((p) => p.resolution);

  it("classifies UI hooks and ddragon-resolvable tokens first", () => {
    expect(audit("{{ spellmodifierdescriptionappend }}")).toEqual(["ui-hook"]);
    expect(audit("{{ e1 }}", { effectBurn: [null, "5/6/7/8/9"] })).toEqual(["ddragon-effect"]);
    expect(audit("{{ e1 }}")).toEqual(["unresolved"]); // all-zero effect arrays resolve nothing
  });

  it("resolves bin calculations, data values and effect amounts across the ability's spells", () => {
    expect(
      audit("{{ totaldamage }} {{ apratio*100 }} {{ childduration }} {{ effect1amount }}"),
    ).toEqual([
      "cdragon-calculation",
      "cdragon-datavalue",
      "cdragon-datavalue",
      "cdragon-effectamount",
    ]);
  });

  it("resolves cross-spell references anywhere in the bin, and only there", () => {
    expect(audit("{{ spell.TestOther:elsewhere }} {{ elsewhere }} {{ spell.Nope:x }}")).toEqual([
      "cdragon-datavalue",
      "unresolved",
      "unresolved",
    ]);
  });

  it("marks everything beyond ddragon unresolved without a bin", () => {
    expect(
      auditSpell(ddragonSpell({ tooltip: "{{ totaldamage }}" })).map((p) => p.resolution),
    ).toEqual(["unresolved"]);
  });
});
