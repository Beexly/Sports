/**
 * Vitest suite for arXiv:2508.07136v2 (Ledger 0795 — Bayesian Forecast Combination with Predictive Priors via Particle Filtering (DTVW)).
 * Gate: ADAPT if DTVW implements the self-tuning diversity mechanism with burn-in-tuned initialization and clears a >=2% CRPS gate on the density forecasts; it answers ledger 0790's correlation-robustness problem from the Bayesian side.
 */
import { describe, it, expect } from "vitest";
import { diversityBonus, dtvwUpdate } from "./2508-07136v2-ledger-0795-bayesian-forecast-combination";

describe("2508-07136v2 DTVW diversity-driven weights", () => {
  it("rewards productive disagreement", () => {
    const errors = [
      [0.1, -0.1, 0.1, -0.1],
      [0.1, -0.1, 0.1, -0.1], // clone of source 0
      [-0.1, 0.1, -0.1, 0.1], // negatively correlated
    ];
    expect(diversityBonus(errors, 2)).toBeGreaterThan(diversityBonus(errors, 0));
    expect(diversityBonus(errors, 0)).toBeLessThan(0.6);
  });
  it("upweights low-loss diverse sources", () => {
    const w = dtvwUpdate([0.34, 0.33, 0.33], [0.5, 0.5, 0.1], [0.2, 0.2, 0.9], 2, 1);
    expect(w[2]).toBeGreaterThan(w[0] ?? 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(() => dtvwUpdate([0.5, 0.5], [0.1], [0.1, 0.1], 1, 1)).toThrow();
  });
});
