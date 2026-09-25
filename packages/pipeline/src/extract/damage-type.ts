import type { DamageType } from "@riftline/schema";

const TAG_TYPES: Readonly<Record<string, DamageType>> = {
  magicdamage: "magic",
  physicaldamage: "physical",
  truedamage: "true",
  shield: "shield",
  healing: "heal",
};

/**
 * Damage type of a placeholder, read from the ddragon tooltip markup that wraps it
 * (e.g. `<magicDamage>{{ totaldamage }} magic damage</magicDamage>`). Innermost typed tag wins.
 */
export function damageTypeInTooltip(tooltip: string, placeholder: string): DamageType | undefined {
  const target = placeholder.toLowerCase();
  const stack: string[] = [];
  for (const m of tooltip.matchAll(/<(\/?)([A-Za-z]+)[^>]*?(\/?)>|\{\{\s*([^}]+?)\s*\}\}/g)) {
    const [, closing, tag, selfClosing, token] = m;
    if (token !== undefined) {
      if (token.toLowerCase() !== target) continue;
      for (let i = stack.length - 1; i >= 0; i--) {
        const type = TAG_TYPES[stack[i] ?? ""];
        if (type) return type;
      }
      return undefined;
    }
    if (selfClosing || !tag) continue;
    if (closing) {
      const at = stack.lastIndexOf(tag.toLowerCase());
      if (at !== -1) stack.length = at;
    } else stack.push(tag.toLowerCase());
  }
  return undefined;
}
