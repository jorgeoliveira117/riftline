/**
 * CDragon stores floats as float32, so 0.8 arrives as 0.800000011920929. Returns the shortest
 * decimal that rounds to the same float32 — a lossless, deterministic cleanup. Values that are
 * not float32-representable are returned unchanged.
 */
export function cleanFloat32(x: number): number {
  if (!Number.isFinite(x) || Number.isInteger(x) || Math.fround(x) !== x) return x;
  for (let precision = 1; precision <= 9; precision++) {
    const candidate = Number(x.toPrecision(precision));
    if (Math.fround(candidate) === x) return candidate;
  }
  return x;
}
