import { z } from "zod";
import { AbilitySlot, DamageType, FiniteNumber, StatKey } from "./common";

export const Scaling = z.strictObject({
  stat: StatKey,
  /** A single coefficient, or one per rank. Ratios are fractions (0.8 = 80%). */
  coeff: z.union([FiniteNumber, z.array(FiniteNumber).min(1)]),
});
export type Scaling = z.infer<typeof Scaling>;

/**
 * Declarative core of ADR-002: `base[rank] + Σ coeff × stat`.
 * Mechanics the core cannot express name a registered `evaluator` instead of contorting the data.
 */
export const AbilityFormula = z
  .strictObject({
    /** e.g. "q.totalDamage". */
    id: z.string().regex(/^[pqwer]\.[A-Za-z0-9]+$/, "expected <slot>.<name>, e.g. q.totalDamage"),
    label: z.string().min(1),
    damageType: DamageType,
    /** Per rank, rank 1 first. */
    base: z.array(FiniteNumber).min(1),
    scalings: z.array(Scaling),
    evaluator: z.string().min(1).optional(),
  })
  .superRefine((f, ctx) => {
    for (const [i, s] of f.scalings.entries()) {
      if (Array.isArray(s.coeff) && s.coeff.length !== f.base.length) {
        ctx.addIssue({
          code: "custom",
          path: ["scalings", i, "coeff"],
          message: `per-rank coeff has ${s.coeff.length} entries but base has ${f.base.length}`,
        });
      }
    }
  });
export type AbilityFormula = z.infer<typeof AbilityFormula>;

export const Ability = z
  .strictObject({
    slot: AbilitySlot,
    /** ddragon spell id, e.g. "AnnieQ"; absent for passives (ddragon ships none). */
    ddragonId: z.string().min(1).optional(),
    name: z.string().min(1),
    /** Sanitized HTML; unresolved variables are rendered as explicit gaps, never numbers. */
    descriptionHtml: z.string(),
    maxRank: z.int().positive().optional(),
    /** Per rank, only where trusted. */
    cooldown: z.array(FiniteNumber).min(1).optional(),
    cost: z.array(FiniteNumber).min(1).optional(),
    /** Curated champions only (T2). */
    formulas: z.array(AbilityFormula).optional(),
  })
  .superRefine((a, ctx) => {
    if (a.maxRank === undefined) return;
    for (const field of ["cooldown", "cost"] as const) {
      const values = a[field];
      if (values && values.length !== a.maxRank) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} has ${values.length} entries but maxRank is ${a.maxRank}`,
        });
      }
    }
    for (const [i, f] of (a.formulas ?? []).entries()) {
      if (f.base.length !== a.maxRank) {
        ctx.addIssue({
          code: "custom",
          path: ["formulas", i, "base"],
          message: `base has ${f.base.length} entries but maxRank is ${a.maxRank}`,
        });
      }
    }
  });
export type Ability = z.infer<typeof Ability>;
