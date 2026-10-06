
import { describe, expect, it } from "vitest";
import {
  effectiveSampleSize,
  oddsWeights,
  weightedConformalInterval,
  weightedConformalQuantile,
  weightsCollapsed,
} from "./weighted-conformal-shift";

describe("weighted-conformal-shift", () => {
  it("oddsWeights converts discriminator probs to likelihood ratios", () => {
    expect(oddsWeights([0.5])).toEqual([1]);
    expect(oddsWeights([0.75])[0]).toBeCloseTo(3, 10);
  });
  it("ESS is n for uniform weights, 1 for a point mass", () => {
    expect(effectiveSampleSize([1, 1, 1, 1])).toBeCloseTo(4, 10);
    expect(effectiveSampleSize([1, 0, 0, 0])).toBeCloseTo(1, 10);
  });
  it("weightsCollapsed flags collapse below 30%", () => {
    expect(weightsCollapsed([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true);
    expect(weightsCollapsed([1, 1, 1, 1])).toBe(false);
    expect(weightsCollapsed([])).toBe(true);
  });
  it("weighted quantile reduces to the standard quantile under uniform weights", () => {
    const q = weightedConformalQuantile([1, 2, 3, 4], [1, 1, 1, 1], 0.25);
    expect(q).toBe(3);
  });
  it("interval is symmetric around the point forecast", () => {
    const iv = weightedConformalInterval(50, [1, 2, 3, 4], [1, 1, 1, 1], 0.25);
    expect(iv.lower).toBeCloseTo(47, 10);
    expect(iv.upper).toBeCloseTo(53, 10);
  });
  it("edge cases throw", () => {
    expect(() => weightedConformalQuantile([], [], 0.1)).toThrow();
    expect(() => weightedConformalQuantile([1], [1], 1.5)).toThrow();
  });
});
