/**
 * Vitest suite for arXiv:2608.23776v1 (Disentangled Skill Representations for Predictive Human Modeling).
 * Gate: ADOPT the SAIL-NFL architecture for prop-model conditioning if on the 2023-2024 WR test: test-retest >= 0.90, in-context RMSE beats the AE baseline by >=15% relative, and AR >= 2.0; REJECT if embeddings are no more stable than per-game AE embeddings (test-retest gap < 0.05) or AR < 1.2.
 */
import { describe, it, expect } from "vitest";
import { fitAvailability, availabilityProb, plattCalibrate, plattApply } from "./2608-23776v1-disentangled-skill-representations-for-predictive";

describe("2608-23776v1 player availability regression", () => {
  it("health coefficient is positive; load negative", () => {
    const feats: { health: number; load: number; performance: number; context: number }[] = [];
    const played: (0 | 1)[] = [];
    for (let i = 0; i < 100; i++) {
      const health = (i % 10) / 9;
      const load = ((i * 7) % 10) / 9;
      feats.push({ health, load, performance: 0, context: 0 });
      played.push(health - 0.6 * load > 0.35 ? 1 : 0);
    }
    const beta = fitAvailability(feats, played);
    expect(beta[1]).toBeGreaterThan(0); // health
    expect(beta[2]).toBeLessThan(0); // load
    const p = availabilityProb(beta, { health: 1, load: 0, performance: 0, context: 0 });
    expect(p).toBeGreaterThan(0.5);
    expect(() => fitAvailability([], [])).toThrow();
    expect(() => availabilityProb([1, 2], feats[0]!)).toThrow();
  });
  it("Platt calibration maps extremes inward", () => {
    // Overconfident forecaster: says 0.9/0.1 but hits at 50% -> Platt shrinks extremes
    const preds = [0.9, 0.9, 0.1, 0.1, 0.8, 0.2, 0.85, 0.15];
    const actual: (0 | 1)[] = [1, 0, 0, 1, 1, 0, 1, 0];
    const cal = plattCalibrate(preds, actual);
    expect(Number.isFinite(cal.a) && Number.isFinite(cal.b)).toBe(true);
    expect(plattApply(cal, 0.99)).toBeLessThan(0.99);
    expect(plattApply(cal, 0.99)).toBeGreaterThan(0.5);
    expect(() => plattCalibrate([0.5], [1])).toThrow();
  });
});
