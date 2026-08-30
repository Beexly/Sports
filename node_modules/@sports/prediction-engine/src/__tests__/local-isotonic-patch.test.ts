import { describe, it, expect } from "vitest";
import {
  fitLocalIsotonicPatch,
  applyLocalIsotonicPatch,
  type LocalPatchPoint,
} from "../calibration/local-isotonic-patch.js";

function points(n: number, biasUp = 0): LocalPatchPoint[] {
  const out: LocalPatchPoint[] = [];
  for (let i = 0; i < n; i++) {
    const score = i / (n - 1);
    const label: 0 | 1 = score + biasUp >= 0.5 ? 1 : 0;
    out.push({ score, label });
  }
  return out;
}

describe("fitLocalIsotonicPatch", () => {
  it("declines to apply below the minSamples threshold", () => {
    const result = fitLocalIsotonicPatch(points(5), { minSamples: 20 });
    expect(result.applied).toBe(false);
    expect(result.sampleSize).toBe(5);
    expect(result.knots).toEqual([]);
    expect(result.reason).toMatch(/insufficient samples/);
  });

  it("applies once minSamples is met", () => {
    const result = fitLocalIsotonicPatch(points(25), { minSamples: 20 });
    expect(result.applied).toBe(true);
    expect(result.knots).toHaveLength(25);
  });

  it("clamps lambda into [0, 1]", () => {
    const overLambda = fitLocalIsotonicPatch(points(25), { lambda: 5 });
    expect(overLambda.lambda).toBe(1);
    const underLambda = fitLocalIsotonicPatch(points(25), { lambda: -5 });
    expect(underLambda.lambda).toBe(0);
  });

  it("knots are non-decreasing in fitted value (isotonic property) when sorted by score", () => {
    const result = fitLocalIsotonicPatch(points(30));
    for (let i = 1; i < result.knots.length; i++) {
      expect(result.knots[i]!.fitted).toBeGreaterThanOrEqual(result.knots[i - 1]!.fitted - 1e-12);
    }
  });

  it("fitted values stay within [0, 1] when clamp is enabled (default)", () => {
    const result = fitLocalIsotonicPatch(points(30));
    for (const k of result.knots) {
      expect(k.fitted).toBeGreaterThanOrEqual(0);
      expect(k.fitted).toBeLessThanOrEqual(1);
    }
  });

  it("honors weighted points", () => {
    const weighted: LocalPatchPoint[] = [
      { score: 0, label: 1, weight: 100 },
      { score: 1, label: 0, weight: 1 },
    ];
    const result = fitLocalIsotonicPatch(weighted, { minSamples: 2 });
    expect(result.applied).toBe(true);
    // Heavy weight on the (0,1) point should pull the pooled violator-merge
    // value close to 1 rather than a plain 0.5 average.
    expect(result.knots[0]!.fitted).toBeGreaterThan(0.9);
  });
});

describe("applyLocalIsotonicPatch", () => {
  it("returns the clamped base probability when the patch was not applied", () => {
    const notApplied = fitLocalIsotonicPatch(points(2), { minSamples: 20 });
    expect(applyLocalIsotonicPatch(0.7, 0.5, notApplied)).toBe(0.7);
  });

  it("returns the clamped base probability when lambda is 0", () => {
    const patch = fitLocalIsotonicPatch(points(30), { lambda: 0 });
    expect(applyLocalIsotonicPatch(0.42, 0.5, patch)).toBeCloseTo(0.42, 10);
  });

  it("fully replaces the base probability at a knot when lambda is 1", () => {
    const patch = fitLocalIsotonicPatch(points(30), { lambda: 1 });
    const knot = patch.knots[10]!;
    const patched = applyLocalIsotonicPatch(0.99, knot.score, patch);
    expect(patched).toBeCloseTo(knot.fitted, 10);
  });

  it("clamps a score below the first knot to the first knot's fitted value", () => {
    const patch = fitLocalIsotonicPatch(points(30), { lambda: 1 });
    const patched = applyLocalIsotonicPatch(0, -5, patch);
    expect(patched).toBeCloseTo(patch.knots[0]!.fitted, 10);
  });

  it("clamps a score above the last knot to the last knot's fitted value", () => {
    const patch = fitLocalIsotonicPatch(points(30), { lambda: 1 });
    const patched = applyLocalIsotonicPatch(0, 100, patch);
    expect(patched).toBeCloseTo(patch.knots[patch.knots.length - 1]!.fitted, 10);
  });

  it("linearly interpolates between neighboring knots", () => {
    const pts: LocalPatchPoint[] = [
      { score: 0, label: 0 },
      { score: 1, label: 1 },
    ];
    const patch = fitLocalIsotonicPatch(pts, { minSamples: 2, lambda: 1 });
    const mid = applyLocalIsotonicPatch(0, 0.5, patch);
    expect(mid).toBeCloseTo(0.5, 6);
  });

  it("blends base and local by lambda", () => {
    const pts: LocalPatchPoint[] = [
      { score: 0, label: 1 },
      { score: 1, label: 1 },
    ];
    const patch = fitLocalIsotonicPatch(pts, { minSamples: 2, lambda: 0.5 });
    // local fitted value here is 1 (both labels are 1)
    const patched = applyLocalIsotonicPatch(0, 0, patch);
    expect(patched).toBeCloseTo(0.5 * 0 + 0.5 * 1, 6);
  });

  it("output always stays within [0, 1]", () => {
    const patch = fitLocalIsotonicPatch(points(30), { lambda: 0.8 });
    for (const s of [-10, 0, 0.3, 0.7, 1, 10]) {
      const out = applyLocalIsotonicPatch(2, s, patch); // out-of-range base on purpose
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(1);
    }
  });
});
