import { describe, it, expect } from "vitest";
import {
  pointBiserial,
  correlationToMultiplier,
  tuneSignalWeights,
  MIN_SAMPLES,
} from "../tune-signal-weights.js";

describe("pointBiserial", () => {
  it("returns 0 on degenerate input rather than NaN", () => {
    expect(pointBiserial([0.5, 0.5, 0.5], [0, 1, 0])).toBe(0);
    expect(pointBiserial([], [])).toBe(0);
    expect(pointBiserial([1, 2], [1])).toBe(0); // length mismatch
  });

  it("is +1 when a higher reading always means a win", () => {
    const r = pointBiserial([0.1, 0.5, 0.9, 0.95], [0, 0, 1, 1]);
    expect(r).toBeGreaterThan(0.9);
  });

  it("is negative when the reading ANTI-predicts", () => {
    const r = pointBiserial([0.1, 0.2, 0.8, 0.9], [1, 1, 0, 0]);
    expect(r).toBeLessThan(-0.9);
  });
});

describe("correlationToMultiplier", () => {
  it("withholds all weight below the sample floor", () => {
    expect(correlationToMultiplier(0.99, MIN_SAMPLES - 1)).toBe(0);
  });

  it("needs real sample before approaching full strength", () => {
    const small = correlationToMultiplier(0.5, MIN_SAMPLES);
    const large = correlationToMultiplier(0.5, MIN_SAMPLES * 4);
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThanOrEqual(1);
  });

  it("preserves sign so an inverted key earns negative weight", () => {
    expect(correlationToMultiplier(-0.5, MIN_SAMPLES * 4)).toBeLessThan(0);
  });
});

describe("tuneSignalWeights", () => {
  it("reports insufficient-sample and earns nothing", () => {
    const out = tuneSignalWeights([{ key: "a", value: 0.9, outcome: 1 }]);
    expect(out[0].verdict).toBe("insufficient-sample");
    expect(out[0].multiplier).toBe(0);
  });

  it("marks an anti-predictive key as such rather than dropping it", () => {
    const sample = Array.from({ length: MIN_SAMPLES * 2 }, (_, i) => ({
      key: "inverted",
      value: i % 2 === 0 ? 0.95 : 0.05,
      outcome: (i % 2 === 0 ? 0 : 1) as 0 | 1,
    }));
    const [t] = tuneSignalWeights(sample);
    expect(t.verdict).toBe("anti-predictive");
    expect(t.multiplier).toBeLessThan(0);
  });

  it("orders strongest evidence first", () => {
    const good = Array.from({ length: MIN_SAMPLES * 2 }, (_, i) => ({
      key: "good",
      value: (i % 10) / 10,
      outcome: (i % 10 >= 5 ? 1 : 0) as 0 | 1,
    }));
    const weak = Array.from({ length: 3 }, () => ({
      key: "weak",
      value: 0.5,
      outcome: 1 as const,
    }));
    const out = tuneSignalWeights([...good, ...weak]);
    expect(out[0].key).toBe("good");
  });
});
