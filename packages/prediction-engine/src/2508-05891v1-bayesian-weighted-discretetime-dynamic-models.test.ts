/**
 * Vitest suite for arXiv:2508.05891v1 (Bayesian weighted discrete-time dynamic models for association football prediction).
 * Gate: Adopt if on the 2025 walk-forward test the weighted-dynamic model's RPS beats both baselines (current + constant-variance RW) by >=0.003 absolute AND mean |edge vs de-vigged close| improves CLV hit-rate by >=1.0pp.
 */
import { describe, it, expect } from "vitest";
import { commensurateWeight, commensurateBlend } from "./2508-05891v1-bayesian-weighted-discretetime-dynamic-models";

describe("2508-05891v1 commensurate-precision time-weighting", () => {
  it("borrows aggressively when history agrees, discounts on conflict", () => {
    expect(commensurateWeight(0.6, 0.62, 0.1, 1)).toBeGreaterThan(0.9);
    expect(commensurateWeight(0.6, 1.6, 0.1, 1)).toBeLessThan(0.1);
    expect(() => commensurateWeight(0.6, 0.6, 0, 1)).toThrow();
  });
  it("blends toward history when commensurate", () => {
    const { blended, weight } = commensurateBlend(0.6, 0.1, 0.65, 0.1, 0.5);
    expect(weight).toBeGreaterThan(0.5);
    expect(blended).toBeGreaterThan(0.6);
    expect(blended).toBeLessThan(0.9);
  });
});
