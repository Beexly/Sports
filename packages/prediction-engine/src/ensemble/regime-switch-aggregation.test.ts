/**
 * Aggregation-regime switch — tests (arXiv 2006.12471).
 *
 * ACCEPTANCE GATE: concentrated model beliefs (one confident model) select
 * the concentrated regime with skill-weighted aggregation; diffuse beliefs
 * select the equal-weight mean; R stays in [0, 1]; degenerate input handled.
 */
import { describe, expect, it } from "vitest";
import {
  concentrationR,
  regimeAggregate,
  softmaxWeights,
} from "./regime-switch-aggregation";

describe("concentrationR", () => {
  it("selects the concentrated regime for a one-confident-model pool", () => {
    const r = concentrationR([0.99, 0.5, 0.5, 0.5, 0.5]);
    expect(r).toBeGreaterThanOrEqual(0.5);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("selects the diffuse regime for a spread-out pool", () => {
    const r = concentrationR([0.3, 0.45, 0.55, 0.7]);
    expect(r).toBeLessThan(0.5);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it("is exactly 1 for identical probabilities", () => {
    expect(concentrationR([0.6, 0.6, 0.6])).toBe(1);
  });

  it("throws on degenerate input", () => {
    expect(() => concentrationR([0.5])).toThrow();
    expect(() => concentrationR([0.5, 1.5])).toThrow();
    expect(() => concentrationR([0, 0.5])).toThrow();
  });
});

describe("softmaxWeights", () => {
  it("sums to 1 and favors higher skill", () => {
    const w = softmaxWeights([1, 2, 3]);
    expect(w.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 12);
    expect((w[2] as number)).toBeGreaterThan(w[1] as number);
    expect((w[1] as number)).toBeGreaterThan(w[0] as number);
    expect(() => softmaxWeights([])).toThrow();
  });
});

describe("regimeAggregate", () => {
  it("uses the equal-weight mean in the diffuse regime", () => {
    const probs = [0.3, 0.45, 0.55, 0.7];
    const skill = [1, 2, 3, 4];
    const r = regimeAggregate(probs, skill);
    expect(r.regime).toBe("diffuse");
    expect(r.R).toBeLessThan(0.5);
    expect(r.agg).toBeCloseTo(0.5, 12);
    expect(r.weights.every((w) => Math.abs(w - 0.25) < 1e-12)).toBe(true);
    expect(r.weights.reduce((a, w) => a + w, 0)).toBeCloseTo(1, 12);
  });

  it("concentrates on top-skill models when R >= 0.5", () => {
    const probs = [0.99, 0.5, 0.5, 0.5];
    const skill = [10, 1, 1, 1];
    const r = regimeAggregate(probs, skill, { topK: 2 });
    expect(r.R).toBeGreaterThanOrEqual(0.5);
    expect(r.regime).toBe("concentrated");
    // Only top-2 models get weight; the best model dominates.
    expect(r.weights[0]).toBeGreaterThan(r.weights[1] as number);
    expect((r.weights[2] as number) + (r.weights[3] as number)).toBe(0);
    expect(r.agg).toBeGreaterThan(0.9);
  });

  it("throws on length mismatch", () => {
    expect(() => regimeAggregate([0.5, 0.6], [1])).toThrow();
  });
});
