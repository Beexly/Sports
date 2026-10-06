/**
 * Vitest suite for arXiv:2603.08206v5 (Distributional Regression with Tabular Foundation Models: Evaluating Probabilistic Predictions via Proper Scoring Rules).
 * Gate: ADOPT if the CRPS-trained margin model beats the MSE baseline on held-out 2024 NFL by >=5% relative CRPS improvement AND >=3% IS95 improvement, with at most 2% MAE degradation on the implied point prediction.
 */
import { describe, it, expect } from "vitest";
import { crpsGaussian, intervalScore, betaEnergyScore, meanScore } from "./2603-08206v5-distributional-regression-with-tabular-foundation";

describe("2603-08206v5 CRPS-family losses", () => {
  it("CRPS is minimized at the true parameters", () => {
    const atTruth = crpsGaussian(0.5, 0.5, 1);
    expect(crpsGaussian(0.5, 2.0, 1)).toBeGreaterThan(atTruth);
    expect(crpsGaussian(0.5, 0.5, 3)).toBeGreaterThan(atTruth);
    expect(() => crpsGaussian(0, 0, 0)).toThrow();
  });
  it("interval score penalizes misses harder than width", () => {
    const inside = intervalScore(0, -2, 2, 0.05);
    const outside = intervalScore(5, -2, 2, 0.05);
    expect(outside).toBeGreaterThan(inside);
    expect(inside).toBeCloseTo(4, 10);
    expect(() => intervalScore(0, -1, 1, 0)).toThrow();
  });
  it("beta-energy prefers samples concentrated at y", () => {
    const tight = betaEnergyScore(0, [-0.1, 0, 0.1], 1);
    const wide = betaEnergyScore(0, [-5, 0, 5], 1);
    expect(tight).toBeLessThan(wide);
    expect(meanScore([1, 2, 3])).toBeCloseTo(2, 12);
  });
});
