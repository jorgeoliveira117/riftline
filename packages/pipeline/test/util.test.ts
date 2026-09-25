import { describe, expect, it } from "vitest";
import { cdragonPatch } from "../src/sources/cdragon";
import { resolveVersion } from "../src/sources/ddragon";
import { cleanFloat32 } from "../src/util/numbers";
import { stableStringify } from "../src/util/stable-json";

describe("cleanFloat32", () => {
  it("recovers the shortest decimal for float32-noisy values", () => {
    expect(cleanFloat32(Math.fround(0.8))).toBe(0.8);
    expect(cleanFloat32(Math.fround(0.15))).toBe(0.15);
    expect(cleanFloat32(Math.fround(1.6))).toBe(1.6);
  });

  it("leaves integers and non-float32 values untouched", () => {
    expect(cleanFloat32(625)).toBe(625);
    expect(cleanFloat32(0.1)).toBe(0.1);
    expect(cleanFloat32(-0.25)).toBe(-0.25);
  });

  it("is lossless at float32 precision", () => {
    for (const x of [0.123456789, 3.14159, 0.3333333, 1e-7]) {
      const f = Math.fround(x);
      expect(Math.fround(cleanFloat32(f))).toBe(f);
    }
  });
});

describe("stableStringify", () => {
  it("sorts keys recursively and keeps array order", () => {
    expect(stableStringify({ b: 1, a: { d: [3, 1], c: null } })).toBe(
      '{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      1\n    ]\n  },\n  "b": 1\n}\n',
    );
  });

  it("is independent of insertion order", () => {
    expect(stableStringify({ x: 1, y: 2 })).toBe(stableStringify({ y: 2, x: 1 }));
  });
});

describe("versions", () => {
  const versions = ["16.19.1", "16.18.1", "16.2.1", "lolpatch_7.20"];

  it("resolves latest, exact versions, and major.minor prefixes", () => {
    expect(resolveVersion(versions, "latest")).toBe("16.19.1");
    expect(resolveVersion(versions, "16.18.1")).toBe("16.18.1");
    expect(resolveVersion(versions, "16.2")).toBe("16.2.1");
    expect(() => resolveVersion(versions, "16.20")).toThrow();
  });

  it("maps ddragon versions to CDragon major.minor", () => {
    expect(cdragonPatch("16.19.1")).toBe("16.19");
    expect(() => cdragonPatch("lolpatch_7.20")).toThrow();
  });
});
