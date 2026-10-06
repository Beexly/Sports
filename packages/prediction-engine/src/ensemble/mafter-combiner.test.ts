import { describe, expect, it } from "vitest";
import {
  afterWeights,
  level1MetaForecasts,
  logLoss,
  mAfterCombine,
} from "./mafter-combiner";

describe("mafter-combiner", () => {
  it("AFTER weights concentrate on the low-loss source", () => {
    const w = afterWeights([0.1, 1.0, 2.0]);
    expect(w[0]).toBeGreaterThan(w[1]!);
    expect(w[1]).toBeGreaterThan(w[2]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(afterWeights([])).toEqual([]);
  });

  it("level-1 produces three meta-forecasts inside the panel range", () => {
    const m = level1MetaForecasts([0.4, 0.6, 0.5], [0.2, 0.1, 0.3], [1, 1, 1]);
    expect(m.simpleAverage).toBeCloseTo(0.5, 12);
    expect(m.after).toBeGreaterThanOrEqual(0.4);
    expect(m.after).toBeLessThanOrEqual(0.6);
    expect(m.regression).toBeCloseTo(0.5, 12);
    expect(() => level1MetaForecasts([], [], [])).toThrow("empty");
  });

  it("level-2 blends the meta-forecasts with the market", () => {
    const m = { simpleAverage: 0.6, after: 0.65, regression: 0.62 };
    const out = mAfterCombine(m, 0.55, [0.5, 0.4, 0.45, 0.35]);
    expect(out).toBeGreaterThanOrEqual(0.55);
    expect(out).toBeLessThanOrEqual(0.65);
    expect(() => mAfterCombine(m, 1.5, [0.5, 0.4, 0.45, 0.35])).toThrow("out of range");
  });

  it("logLoss penalizes confident wrongness", () => {
    expect(logLoss(0.9, 1)).toBeLessThan(logLoss(0.6, 1));
    expect(logLoss(0.9, 0)).toBeGreaterThan(logLoss(0.6, 0));
  });
});
