/**
 * Vitest suite for arXiv:2409.17077v1 (Efficient Feature Interactions with Transformers: Improving User Spending Propensity Predictions in Gaming).
 * Gate: ADAPT in two stages. Stage 1 (features): adopt the t±5 contextual-window features if challenger A beats baseline XGBoost on 2023–2024 test MAE by ≥ 1% with non-overlapping 10-seed intervals. Stage 2 (architecture): adopt the transformer only if challenger B beats *both* baseline and challenger A by ≥ 1% MAE *and* the inference cost passes the ledger's latency check.
 */
import { describe, it, expect } from "vitest";
import { decayWeights, gapFeatures, temperatureScale, pavaIsotonic, ece } from "./2409-17077v1-efficient-feature-interactions-with-transformers";

describe("2409-17077v1 time-decayed contextual features", () => {
  it("decay weights fall with clock distance", () => {
    const w = decayWeights([0, 60, 120], 60);
    expect(w[0]).toBeCloseTo(1, 10);
    expect(w[1]).toBeCloseTo(0.5, 6);
    expect(w[2]).toBeCloseTo(0.25, 6);
    expect(() => decayWeights([1], 0)).toThrow();
  });
  it("gap features flag long gaps", () => {
    const g = gapFeatures([5, 10, 120, 8]);
    expect(g.longGap).toEqual([false, false, true, false]);
    expect(g.z).toHaveLength(4);
    expect(() => gapFeatures([])).toThrow();
  });
  it("temperature scaling and PAVA", () => {
    const p = temperatureScale([2, 1, 0], 1);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    const hot = temperatureScale([2, 1, 0], 100);
    expect(Math.max(...hot) - Math.min(...hot)).toBeLessThan(0.1);
    expect(pavaIsotonic([3, 1, 2])).toEqual([2, 2, 2]);
    expect(pavaIsotonic([1, 2, 3])).toEqual([1, 2, 3]);
    expect(() => temperatureScale([], 1)).toThrow();
  });
  it("ECE is ~0 for perfect probs, >0 for miscalibrated", () => {
    const probs = [0.01, 0.02, 0.98, 0.99];
    const labels: (0 | 1)[] = [0, 0, 1, 1];
    expect(ece(probs, labels, 10)).toBeLessThan(0.05);
    expect(ece([0.9, 0.9, 0.1, 0.1], labels, 2)).toBeGreaterThan(0.3);
    expect(() => ece([0.5], [1, 0])).toThrow();
  });
});
