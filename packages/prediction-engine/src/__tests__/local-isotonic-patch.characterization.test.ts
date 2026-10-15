import { describe, it, expect } from "vitest";
import {
  fitLocalIsotonicPatch,
  applyLocalIsotonicPatch,
  type LocalPatchPoint,
} from "../calibration/local-isotonic-patch.js";

/**
 * CHARACTERIZATION (freeze) tests for calibration/local-isotonic-patch.ts —
 * added 2026-10-15. Pins behavior the main suite does not: the DEFAULT
 * minSamples boundary, exact reason strings, duplicate-score knots
 * (observation O1), the clamp option's no-op nature on binary labels, the
 * EPSILON weight floor at fit level, NaN base handling, and input
 * immutability.
 */
function mk(n: number): LocalPatchPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    score: i / (n - 1),
    label: (i >= n / 2 ? 1 : 0) as 0 | 1,
  }));
}

describe("fitLocalIsotonicPatch — characterization", () => {
  it("default minSamples is 20: 19 points are declined with the exact reason string", () => {
    const r = fitLocalIsotonicPatch(mk(19));
    expect(r.applied).toBe(false);
    expect(r.sampleSize).toBe(19);
    expect(r.reason).toBe("insufficient samples (19 < 20)");
  });

  it("default minSamples is 20: 20 points apply, with default lambda 0.5", () => {
    const r = fitLocalIsotonicPatch(mk(20));
    expect(r.applied).toBe(true);
    expect(r.knots).toHaveLength(20);
    expect(r.lambda).toBe(0.5);
  });

  it("golden: the decline reason interpolates the actual counts", () => {
    expect(fitLocalIsotonicPatch(mk(5), { minSamples: 20 }).reason).toBe(
      "insufficient samples (5 < 20)",
    );
  });

  it("clamp:false yields knots identical to clamp:true on binary labels (the option is a no-op for 0/1 data)", () => {
    const off = fitLocalIsotonicPatch(mk(30), { clamp: false });
    const on = fitLocalIsotonicPatch(mk(30), { clamp: true });
    expect(off.knots).toEqual(on.knots);
  });

  it("golden: a zero-weight point is floored to EPSILON, so the pooled fit is ~0, not 0.5", () => {
    const pts: LocalPatchPoint[] = [
      { score: 0, label: 1, weight: 0 },
      { score: 1, label: 0, weight: 1 },
    ];
    const r = fitLocalIsotonicPatch(pts, { minSamples: 2 });
    expect(r.applied).toBe(true);
    expect(r.knots[0]!.fitted).toBeCloseTo(0, 12);
    expect(r.knots[1]!.fitted).toBeCloseTo(0, 12);
  });

  it("does not mutate or reorder the caller's points array", () => {
    const pts: LocalPatchPoint[] = [
      { score: 0.9, label: 1 },
      { score: 0.1, label: 0 },
      { score: 0.5, label: 1 },
    ];
    const before = JSON.stringify(pts);
    fitLocalIsotonicPatch(pts, { minSamples: 3 });
    expect(JSON.stringify(pts)).toBe(before);
  });
});

describe("duplicate-score knots (observation O1)", () => {
  // The interface comment promises "unique knot points", but the fit emits
  // one knot PER POINT, so duplicate scores carry different fitted values.
  // Lookup resolves a duplicated score to the LAST duplicate's block value
  // (the interpolation anchor is the rightmost knot <= score, with t=0).
  const dup: LocalPatchPoint[] = [
    { score: 0.25, label: 0 },
    { score: 0.5, label: 0 },
    { score: 0.5, label: 1 },
    { score: 0.5, label: 1 },
    { score: 0.75, label: 1 },
  ];

  it("golden: knots are per-point, including three knots at score 0.5 with fitted [0, 1, 1]", () => {
    const patch = fitLocalIsotonicPatch(dup, { minSamples: 5, lambda: 1 });
    expect(patch.knots).toEqual([
      { score: 0.25, fitted: 0 },
      { score: 0.5, fitted: 0 },
      { score: 0.5, fitted: 1 },
      { score: 0.5, fitted: 1 },
      { score: 0.75, fitted: 1 },
    ]);
  });

  it("apply at a duplicated score resolves to the last duplicate's fitted value", () => {
    const patch = fitLocalIsotonicPatch(dup, { minSamples: 5, lambda: 1 });
    expect(applyLocalIsotonicPatch(0.9, 0.5, patch)).toBe(1);
  });
});

describe("applyLocalIsotonicPatch — characterization", () => {
  it("a NaN base probability with an applied patch returns 0.5 (clamp01 maps the NaN blend)", () => {
    const patch = fitLocalIsotonicPatch(mk(30), { lambda: 0.5 });
    expect(applyLocalIsotonicPatch(NaN, 0.5, patch)).toBe(0.5);
  });

  it("at exactly the first knot's score with lambda 1, returns that knot's fitted value", () => {
    const patch = fitLocalIsotonicPatch(mk(30), { lambda: 1 });
    const first = patch.knots[0]!;
    expect(applyLocalIsotonicPatch(0.99, first.score, patch)).toBeCloseTo(first.fitted, 12);
  });

  it("at exactly the last knot's score with lambda 1, returns that knot's fitted value", () => {
    const patch = fitLocalIsotonicPatch(mk(30), { lambda: 1 });
    const last = patch.knots[patch.knots.length - 1]!;
    expect(applyLocalIsotonicPatch(0.01, last.score, patch)).toBeCloseTo(last.fitted, 12);
  });
});
