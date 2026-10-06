/**
 * Vitest suite for arXiv:2503.07789 (AFBART: Adaptive Functional Bayesian Additive Regression Trees for Shot Intensity Surfaces).
 * Gate: Gate (ADAPT): wins all 6 simulation settings on all 3 metrics (e.g., RMSPE 0.07 vs. 0.68) and wins the real-data 4-fold CV on both RMSPE and MCRPS. Improvement success = RMSPE ≤ 0.30 on Case 3 (vs. paper's 0.34) with no degradation in MIS/MCRPS.
 */
import { describe, it, expect } from "vitest";
import { adaptiveKnots, hatBasis, ridgeBasisFit, rmspe } from "./2503-07789-afbart-adaptive-functional-bayesian-additive";

describe("2503-07789 adaptive-basis functional regression", () => {
  it("places knots where the surface curves", () => {
    const x = [0, 1, 2, 3, 4, 5, 6];
    const y = [0, 0, 0, 10, 0, 0, 0]; // spike at x=3
    const knots = adaptiveKnots(x, y, 4);
    expect(knots).toHaveLength(4);
    expect(knots[0]).toBe(0);
    expect(knots.some((k) => k >= 2 && k <= 4)).toBe(true);
    expect(() => adaptiveKnots(x, y, 1)).toThrow();
  });
  it("hat basis interpolates linearly between knots", () => {
    const B = hatBasis([0.5], [0, 1]);
    expect(B[0]).toEqual([0.5, 0.5]);
  });
  it("ridge fit recovers a smooth surface with low RMSPE", () => {
    const x = Array.from({ length: 21 }, (_, i) => i / 4);
    const y = x.map((xi) => Math.sin(xi));
    const knots = adaptiveKnots(x, y, 8);
    const beta = ridgeBasisFit(hatBasis(x, knots), y, 1e-6);
    const pred = hatBasis(x, knots).map((row) => row.reduce((s, b, j) => s + b * (beta[j] ?? 0), 0));
    expect(rmspe(pred, y)).toBeLessThan(0.05);
    expect(() => ridgeBasisFit([], [1], 0.1)).toThrow();
  });
});
