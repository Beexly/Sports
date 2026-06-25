import { describe, it, expect } from "vitest";
import {
  recencyWeightedMean,
  recentMinusBaseline,
  shrinkageWeight,
  shrunkUsageShare,
  shrunkOpponentFpoe,
} from "../projection-features.js";

describe("recencyWeightedMean", () => {
  it("returns 0 for an empty series", () => {
    expect(recencyWeightedMean([])).toBe(0);
  });

  it("returns the single value for a one-element series", () => {
    expect(recencyWeightedMean([7])).toBeCloseTo(7, 12);
  });

  it("weights recent observations more than the flat mean", () => {
    // [0,0,0,10] flat mean = 2.5; recency-weighted (halfLife 1) ≈ 5.33
    const r = recencyWeightedMean([0, 0, 0, 10], 1);
    expect(r).toBeGreaterThan(2.5);
    expect(r).toBeCloseTo(10 / 1.875, 6);
  });

  it("approaches the flat mean as the half-life grows large", () => {
    const r = recencyWeightedMean([0, 0, 0, 10], 1000);
    expect(r).toBeCloseTo(2.5, 2);
  });

  it("rejects a non-positive half-life", () => {
    expect(() => recencyWeightedMean([1, 2], 0)).toThrow(RangeError);
  });
});

describe("recentMinusBaseline", () => {
  it("is positive when recent form exceeds the season baseline (ascending role)", () => {
    expect(recentMinusBaseline([1, 1, 1, 10], 1)).toBeCloseTo(10 - 3.25, 12);
  });

  it("is negative when recent form trails the baseline (fading role)", () => {
    expect(recentMinusBaseline([10, 1, 1, 1], 1)).toBeCloseTo(1 - 3.25, 12);
  });

  it("is 0 for a flat series", () => {
    expect(recentMinusBaseline([5, 5, 5], 1)).toBe(0);
  });

  it("returns 0 when there is not yet a full recent window", () => {
    expect(recentMinusBaseline([5], 3)).toBe(0);
  });

  it("rejects a non-positive-integer window", () => {
    expect(() => recentMinusBaseline([1, 2, 3], 0)).toThrow(RangeError);
  });
});

describe("shrinkageWeight", () => {
  it("is 0 at n=0, 0.5 at n=k, and approaches 1 for large n", () => {
    expect(shrinkageWeight(0, 4)).toBe(0);
    expect(shrinkageWeight(4, 4)).toBeCloseTo(0.5, 12);
    expect(shrinkageWeight(96, 4)).toBeCloseTo(0.96, 12);
  });

  it("rejects invalid arguments", () => {
    expect(() => shrinkageWeight(-1, 4)).toThrow(RangeError);
    expect(() => shrinkageWeight(4, 0)).toThrow(RangeError);
  });
});

describe("shrunkUsageShare", () => {
  it("falls back to the prior when the team had no opportunity", () => {
    expect(shrunkUsageShare(0, 0, 0.15, 10)).toBeCloseTo(0.15, 12);
  });

  it("sits between the prior and the observed share, closer to observed at high n", () => {
    // observed = 20/100 = 0.2, prior = 0.15, games=10, k=4 → w=10/14
    const r = shrunkUsageShare(20, 100, 0.15, 10, 4);
    expect(r).toBeGreaterThan(0.15);
    expect(r).toBeLessThan(0.2);
    expect(r).toBeCloseTo((10 / 14) * 0.2 + (4 / 14) * 0.15, 12);
  });

  it("hugs the prior when the sample is thin", () => {
    const r = shrunkUsageShare(20, 100, 0.15, 1, 4); // w = 1/5
    expect(r).toBeCloseTo(0.2 * 0.2 + 0.8 * 0.15, 12); // 0.16
  });
});

describe("shrunkOpponentFpoe", () => {
  it("trusts a well-sampled matchup signal", () => {
    expect(shrunkOpponentFpoe(4, 20, 5)).toBeCloseTo((20 / 25) * 4, 12); // 3.2
  });

  it("collapses a thin sample toward 0 (league mean), not noise", () => {
    expect(shrunkOpponentFpoe(4, 1, 5)).toBeCloseTo((1 / 6) * 4, 12); // ≈0.667
    expect(shrunkOpponentFpoe(4, 0, 5)).toBe(0);
  });

  it("treats a non-finite raw signal as no signal", () => {
    expect(shrunkOpponentFpoe(Number.NaN, 20)).toBe(0);
  });
});
