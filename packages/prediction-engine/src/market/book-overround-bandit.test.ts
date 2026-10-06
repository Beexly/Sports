import { describe, expect, it } from "vitest";
import {
  exp3Update,
  forecastOverround,
  naiveOverroundForecast,
  waitReward,
} from "./book-overround-bandit";

describe("book-overround-bandit", () => {
  it("upweights the arm with the highest gain", () => {
    const w = exp3Update([1 / 3, 1 / 3, 1 / 3], [0.9, 0.1, 0.1], 0.5);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]! + w[1]! + w[2]!).toBeCloseTo(1, 12);
  });

  it("returns [] for empty arms and validates inputs", () => {
    expect(exp3Update([], [], 0.5)).toEqual([]);
    expect(() => exp3Update([0.5], [0.5, 0.5], 0.5)).toThrow("mismatch");
    expect(() => exp3Update([0.5], [0.5], 0)).toThrow("positive");
  });

  it("forecasts the weight-weighted mean of histories", () => {
    const f = forecastOverround(
      [
        [0.05, 0.05],
        [0.08, 0.08],
      ],
      [0.75, 0.25],
    );
    expect(f).toBeCloseTo(0.0575, 12);
  });

  it("wait reward favors tightening margins", () => {
    expect(waitReward(0.04, 0.06)).toBeGreaterThan(0.5); // tightened
    expect(waitReward(0.06, 0.04)).toBeLessThan(0.5); // widened
    const r = waitReward(0.05, 0.05);
    expect(r).toBeCloseTo(0.5, 12);
  });

  it("naive forecast is the plain mean; rejects empty history", () => {
    expect(naiveOverroundForecast([0.04, 0.06])).toBeCloseTo(0.05, 12);
    expect(() => naiveOverroundForecast([])).toThrow("empty");
  });
});
