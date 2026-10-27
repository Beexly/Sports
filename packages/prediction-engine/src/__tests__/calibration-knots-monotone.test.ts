import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The GSE calibration table must stay strictly increasing in BOTH coordinates.
 *
 * `public-baseline/calibration-map.ts` calls its table "isotonic knots" and
 * relies on piecewise-linear interpolation being monotone. That claim is only
 * true if every knot rises in x AND in y: one inverted interior knot makes the
 * interpolated curve non-monotone, which inverts a probability ordering and
 * lets a worse pick price above a better one.
 *
 * The existing suite pins two sample points (0.53 -> below 0.5, 0.67 -> 0.618).
 * That catches gross breakage but not a single bad interior knot, because a
 * non-adjacent pair can invert while those two samples still pass. This test
 * checks the table itself, knot by knot, so the monotonicity claim is enforced
 * at the source of truth rather than sampled.
 *
 * Source-level (not import-level) because CALIBRATION_KNOTS is module-private;
 * parsing it here avoids widening the module's public API for a test's sake.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = resolve(HERE, "../public-baseline/calibration-map.ts");

function readKnots(): Array<[number, number]> {
  const src = readFileSync(MODULE, "utf8");
  const block = /CALIBRATION_KNOTS[^=]*=\s*\[([\s\S]*?)\n\]/.exec(src);
  if (!block?.[1]) {
    throw new Error("calibration-map.ts: could not locate CALIBRATION_KNOTS table");
  }
  const knots: Array<[number, number]> = [];
  const pairRe = /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(block[1])) !== null) {
    knots.push([Number(m[1]), Number(m[2])]);
  }
  return knots;
}

describe("GSE calibration knot table is isotonic by construction", () => {
  const knots = readKnots();

  it("has at least two knots to interpolate between", () => {
    expect(knots.length).toBeGreaterThanOrEqual(2);
  });

  it("rises strictly in x at every knot (no reversed score axis)", () => {
    for (let i = 1; i < knots.length; i++) {
      const [xPrev] = knots[i - 1]!;
      const [x] = knots[i]!;
      expect(x, `knot ${i}: x=${x} must exceed previous x=${xPrev}`).toBeGreaterThan(xPrev);
    }
  });

  it("rises strictly in y at every knot (no inverted probability)", () => {
    for (let i = 1; i < knots.length; i++) {
      const [, yPrev] = knots[i - 1]!;
      const [, y] = knots[i]!;
      expect(y, `knot ${i}: y=${y} must exceed previous y=${yPrev}`).toBeGreaterThan(yPrev);
    }
  });

  it("stays inside the unit interval so interpolation cannot escape [0,1]", () => {
    for (const [x, y] of knots) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});
