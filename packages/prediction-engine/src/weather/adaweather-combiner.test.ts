import { describe, expect, it } from "vitest";
import { adaWeatherWeights, crpsEnsemble, exponentialWeights, hybridWeights } from "./adaweather-combiner";

describe("adaweather-combiner", () => {
  it("puts most weight on the lowest-CRPS member", () => {
    const w = exponentialWeights([1.0, 2.0, 3.0], 1);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[1]!).toBeGreaterThan(w[2]!);
  });
  it("is uniform when members tie", () => {
    expect(exponentialWeights([2, 2, 2], 1)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
  it("hybridWeights interpolates between offline and online", () => {
    const off = [0.7, 0.2, 0.1];
    const on = [0.1, 0.2, 0.7];
    const w0 = hybridWeights(off, on, 0);
    const w1 = hybridWeights(off, on, 1);
    for (let k = 0; k < 3; k++) {
      expect(w0[k]).toBeCloseTo(off[k]!, 12);
      expect(w1[k]).toBeCloseTo(on[k]!, 12);
    }
    const mid = hybridWeights(off, on, 0.5);
    expect(mid[0]).toBeCloseTo(0.4, 12);
    expect(mid.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("adaWeatherWeights tracks the recently-hot member", () => {
    const w = adaWeatherWeights([1, 1, 1], [3, 1, 2], { eta: 2, alpha: 0.8 });
    expect(w[1]!).toBeGreaterThan(w[0]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("crpsEnsemble is zero for a perfect deterministic forecast", () => {
    expect(crpsEnsemble([5, 5, 5], 5)).toBeCloseTo(0, 12);
  });
  it("crpsEnsemble penalizes spread and bias", () => {
    const tight = crpsEnsemble([4.9, 5.0, 5.1], 5);
    const wide = crpsEnsemble([3, 5, 7], 5);
    const biased = crpsEnsemble([7, 7, 7], 5);
    expect(wide).toBeGreaterThan(tight);
    expect(biased).toBeGreaterThan(tight);
  });
  it("throws on degenerate inputs", () => {
    expect(() => exponentialWeights([], 1)).toThrow();
    expect(() => exponentialWeights([1], 0)).toThrow();
    expect(() => hybridWeights([0.5], [0.5, 0.5], 0.5)).toThrow();
    expect(() => hybridWeights([0.5], [0.5], 2)).toThrow();
    expect(() => crpsEnsemble([], 1)).toThrow();
  });
});
