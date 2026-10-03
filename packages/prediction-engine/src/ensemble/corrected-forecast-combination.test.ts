
import { describe, expect, it } from "vitest";
import { debiasedCombine, debiasedWeightedCombine, estimateBias, inverseMseWeights } from "./corrected-forecast-combination";

describe("corrected-forecast-combination", () => {
  it("estimateBias finds a constant optimistic bias", () => {
    expect(estimateBias([12, 14, 16], [10, 12, 14])).toBeCloseTo(2, 10);
  });
  it("debiasedCombine removes the bias", () => {
    expect(debiasedCombine([12, 14], [2, 2])).toBeCloseTo(11, 10);
  });
  it("inverseMseWeights favor accurate forecasters", () => {
    const w = inverseMseWeights([1, 4]);
    expect(w[0]).toBeCloseTo(0.8, 10);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
  });
  it("weighted debiased combination is a convex combo of debiased inputs", () => {
    const v = debiasedWeightedCombine([12, 14], [2, 2], [1, 4]);
    expect(v).toBeCloseTo(0.8 * 10 + 0.2 * 12, 10);
  });
  it("edge cases throw", () => {
    expect(() => estimateBias([], [])).toThrow();
    expect(() => debiasedCombine([1], [])).toThrow();
    expect(() => inverseMseWeights([])).toThrow();
  });
});
