/**
 * Vitest suite for arXiv:2608.12998 (WIRED: Weighted Adaptive Prediction with Structured Dependence for Probabilistic Multiseries Forecasting).
 * Gate: ADOPT the CRPS-weighted mixture layer if, over the two-season test window, it beats equal-weight mixture by >=2% mean CRPS AND holds 80% interval coverage within [0.76, 0.84]; REJECT adaptive weighting (keep equal weights + copula) if it fails to beat equal weights or coverage falls below 0.74.
 */
import { describe, it, expect } from "vitest";
import { marginCrps, theilSenWeights, copulaJointProb } from "./2608-12998-wired-weighted-adaptive-prediction-with";

describe("2608-12998 WIRED CRPS-weighted mixture + copula", () => {
  it("CRPS prefers the sharper correct expert", () => {
    const good = marginCrps(3, 3, 5);
    expect(marginCrps(3, 10, 5)).toBeGreaterThan(good);
    expect(marginCrps(3, 3, 20)).toBeGreaterThan(good);
    expect(() => marginCrps(3, 3, 0)).toThrow();
  });
  it("Theil-Sen weights shrink toward uniform", () => {
    const w = theilSenWeights([1, 2, 4], 0.5);
    expect(w[0]).toBeGreaterThan(w[2] ?? 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    const uni = theilSenWeights([1, 2, 4], 0);
    expect(uni[0]).toBeCloseTo(1 / 3, 10);
  });
  it("copula joint prob falls with correlation for tail events", () => {
    const z = [1.5, 1.5];
    const lo = copulaJointProb(z, 0);
    const hi = copulaJointProb(z, 0.8);
    expect(lo).toBeCloseTo(0.0668 ** 2, 2); // independent
    expect(hi).toBeGreaterThan(lo); // correlated tails co-move
    expect(() => copulaJointProb(z, 1)).toThrow();
  });
});
