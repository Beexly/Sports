/**
 * Vitest suite for arXiv:2602.11379 (Regularized Ensemble Forecasting for Learning Weights from Historical and Current Forecasts).
 * Gate: ADOPT if on the 2024 holdout REF improves margin RMSE >=2% and ATS Brier >=1% vs Simple Mean AND the medium-PS balanced-regime weeks drive the gain; REJECT if REF is within 0.5% of Simple Mean or lambda collapses to a degenerate value.
 */
import { describe, it, expect } from "vitest";
import { blendSpecs, logEntropyWeights, posteriorPredictiveInterval } from "./2602-11379-regularized-ensemble-forecasting-for-learning";

describe("2602-11379 regularized ensemble forecasting", () => {
  it("blends specs toward the lower rolling loss", () => {
    const specs = [
      { name: "a", weights: [1, 0] },
      { name: "b", weights: [0, 1] },
    ];
    const w = blendSpecs(specs, [0.1, 0.5], 5);
    expect(w[0]).toBeGreaterThan(w[1] ?? 0);
    expect(w.reduce((a2, b2) => a2 + b2, 0)).toBeCloseTo(1, 10);
    expect(() => blendSpecs(specs, [0.1], 1)).toThrow();
  });
  it("log-entropy weights favor uncertain sources", () => {
    const w = logEntropyWeights([0.5, 0.99, 0.01]);
    expect(w[0]).toBeGreaterThan(w[1] ?? 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("predictive interval widens with variance", () => {
    const [lo, hi] = posteriorPredictiveInterval(0.6, 0.01, 0.01);
    expect(lo).toBeLessThan(0.6);
    expect(hi).toBeGreaterThan(0.6);
    expect(() => posteriorPredictiveInterval(0.5, -1, 0)).toThrow();
  });
});
