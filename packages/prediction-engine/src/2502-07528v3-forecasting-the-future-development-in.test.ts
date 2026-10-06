/**
 * Vitest suite for arXiv:2502.07528v3 (Forecasting the Future Development in Quality and Value of Professional Football Players).
 * Gate: ADOPT the development forecaster + its intervals into GSE's projection pipeline only if: (a) ≥10% RMSE improvement over carry-forward on 2023–2024 test for at least 3 of 4 positions, (b) empirical 80%-interval coverage within 75–85%, and (c) subgroup slices show no catastrophic failure (RMSE on 2nd-year breakouts no worse than 1.3× overall RMSE).
 */
import { describe, it, expect } from "vitest";
import { conformalHalfWidth, predictionBand, metaWeights, empiricalCoverage } from "./2502-07528v3-forecasting-the-future-development-in";

describe("2502-07528v3 conformal seasonal meta-learner", () => {
  it("half-width is the (1-alpha) quantile of |residuals|", () => {
    const hw = conformalHalfWidth([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1);
    expect(hw).toBe(9);
    expect(() => conformalHalfWidth([], 0.1)).toThrow();
    expect(() => conformalHalfWidth([1], 0)).toThrow();
  });
  it("meta-weights favor tighter experts", () => {
    const w = metaWeights([0.5, 1.0, 2.0]);
    expect(w[0]).toBeGreaterThan(w[2] ?? 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(() => metaWeights([])).toThrow();
  });
  it("coverage diagnostic counts in-band holdouts", () => {
    expect(empiricalCoverage([10, 10], [10.5, 12], [1, 1])).toBeCloseTo(0.5, 10);
    expect(() => empiricalCoverage([1], [1, 2], [1])).toThrow();
  });
});
