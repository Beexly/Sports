
import { describe, expect, it } from "vitest";
import { brierScore, onlineMetricSuite } from "./online-metric-suite";

describe("online-metric-suite", () => {
  it("perfect predictor scores zero on every metric", () => {
    const probs = [[1, 0, 1], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 0]];
    const outs = [[1, 0, 1], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 0]];
    const m = onlineMetricSuite(probs, outs, probs);
    expect(m.finalBrier).toBe(0);
    expect(m.worstWeekBrier).toBe(0);
    expect(m.anytimeBrier).toBe(0);
    expect(m.forgettingBrier).toBe(0);
  });
  it("anytime Brier exposes a bad month hidden by a good finish", () => {
    // Week 0 is terrible (0.25) but small (2 games); weeks 1-3 are perfect and
    // large (4 games each), so the pooled final dilutes week 0 while the
    // equal-week-weighted anytime average still exposes it.
    const probs = [[0.5, 0.5], [1, 0, 1, 0], [1, 0, 1, 0], [1, 0, 1, 0]];
    const outs = [[1, 1], [1, 0, 1, 0], [1, 0, 1, 0], [1, 0, 1, 0]];
    const m = onlineMetricSuite(probs, outs);
    expect(m.anytimeBrier).toBeGreaterThan(m.finalBrier);
    expect(m.worstWeekBrier).toBeGreaterThanOrEqual(m.finalBrier);
  });
  it("forgetting probe uses the end-of-season model on early weeks", () => {
    const probs = [[0.9, 0.9], [0.9, 0.9], [0.9, 0.9], [0.9, 0.9]];
    const outs = [[1, 1], [1, 1], [1, 1], [1, 1]];
    const endModel = [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]];
    const m = onlineMetricSuite(probs, outs, endModel, 4);
    expect(m.forgettingBrier).toBeGreaterThan(m.finalBrier);
    const m2 = onlineMetricSuite(probs, outs);
    expect(Number.isNaN(m2.forgettingBrier)).toBe(true);
  });
  it("edge cases throw", () => {
    expect(() => brierScore([], [])).toThrow();
    expect(() => brierScore([0.5], [1, 0])).toThrow();
    expect(() => onlineMetricSuite([], [])).toThrow();
  });
});
