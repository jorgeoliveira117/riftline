import { z } from "zod";
import { AbilityFormula } from "./ability";
import { AbilitySlot, PatchId, Slug } from "./common";

/** Where a curated (T2) value came from — ARCHITECTURE §4, ADR-001. */
export const Provenance = z.strictObject({
  /** ddragon version the extraction ran against. */
  sourcePatch: PatchId,
  /** CDragon bin path, relative to the patch root. */
  cdragonPath: z.string().min(1),
  /** ISO date (no time) — see phase0-findings on determinism. */
  extractedAt: z.iso.date(),
  /** Set by the maintainer only (CLAUDE.md ground rule 2). */
  verifiedAtPatch: PatchId.nullable().optional(),
  wikiRef: z.url().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

export const CuratedAbility = z
  .strictObject({
    slot: AbilitySlot,
    maxRank: z.int().positive(),
    formulas: z.array(AbilityFormula),
    /** Values the extractor could not map; each is a TODO(verify) surfaced in the PR. */
    unmapped: z.array(z.strictObject({ name: z.string(), reason: z.string() })),
  })
  .superRefine((a, ctx) => {
    for (const [i, f] of a.formulas.entries()) {
      if (f.base.length !== a.maxRank) {
        ctx.addIssue({
          code: "custom",
          path: ["formulas", i, "base"],
          message: `base has ${f.base.length} entries but maxRank is ${a.maxRank}`,
        });
      }
    }
  });
export type CuratedAbility = z.infer<typeof CuratedAbility>;

export const CuratedChampion = z.strictObject({
  slug: Slug,
  provenance: Provenance,
  abilities: z.array(CuratedAbility),
});
export type CuratedChampion = z.infer<typeof CuratedChampion>;
