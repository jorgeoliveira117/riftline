import type { StatKey } from "@riftline/schema";

/**
 * CDragon encodes a scaling's stat as numeric enums on calculation parts: `mStat` (which stat) and
 * `mStatFormula` (total / base / bonus). Absent fields take the bin default of 0.
 *
 * TODO(verify): confirm every entry against the hextechdocs reference cited in ADR-001 before any
 * extracted formula is displayed. Only the default pair is mapped for the Phase 0 prototype; the
 * probe champions also use mStat=2 and mStat=12 (with mStatFormula=2), which stay unmapped until
 * checked. Unknown pairs are reported as unmapped, never guessed.
 */
export const STAT_ENUM: Readonly<Record<string, StatKey>> = {
  "0:0": "abilityPower",
};

export function statKeyFor(mStat: unknown, mStatFormula: unknown): StatKey | undefined {
  const stat = typeof mStat === "number" ? mStat : 0;
  const formula = typeof mStatFormula === "number" ? mStatFormula : 0;
  return STAT_ENUM[`${stat}:${formula}`];
}
