import { describe, expect, it } from "vitest";
import {
  clamp,
  clamp01,
  clampScore,
  logit,
  normalizeClamped,
  protectedBasis,
  round,
  sigmoid,
  softplus,
  weightedMean,
  zScore,
} from "../core/math.js";

describe("clamp / clamp01 / clampScore", () => {
  it("clamps to the given bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it("clamp01 bounds to [0,1]", () => {
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });

  it("clampScore bounds to [0,100]", () => {
    expect(clampScore(55)).toBe(55);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });
});

describe("normalizeClamped", () => {
  it("returns 0 when max <= min (degenerate range)", () => {
    expect(normalizeClamped(3, 5, 5)).toBe(0);
    expect(normalizeClamped(3, 6, 5)).toBe(0);
  });

  it("normalizes and clamps into [0,1]", () => {
    expect(normalizeClamped(5, 0, 10)).toBe(0.5);
    expect(normalizeClamped(-5, 0, 10)).toBe(0);
    expect(normalizeClamped(15, 0, 10)).toBe(1);
  });
});

describe("sigmoid / logit", () => {
  it("sigmoid(0) is 0.5", () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  it("logit clamps the probability at the 1e-6 boundaries", () => {
    expect(logit(0)).toBe(Math.log(0.000001 / (1 - 0.000001)));
    expect(logit(1)).toBe(Math.log(0.999999 / (1 - 0.999999)));
  });

  it("logit(0.5) is 0", () => {
    expect(logit(0.5)).toBe(0);
  });
});

describe("softplus", () => {
  it("returns the value directly above 30", () => {
    expect(softplus(40)).toBe(40);
  });

  it("returns exp(value) below -30", () => {
    expect(softplus(-40)).toBe(Math.exp(-40));
  });

  it("uses log1p(exp) inside the stable range", () => {
    expect(softplus(0)).toBe(Math.log1p(1));
  });
});

describe("zScore", () => {
  it("returns 0 for a non-positive standard deviation", () => {
    expect(zScore(1, 0, 0)).toBe(0);
    expect(zScore(1, 0, -2)).toBe(0);
  });

  it("returns 0 for a non-finite standard deviation", () => {
    expect(zScore(1, 0, Number.POSITIVE_INFINITY)).toBe(0);
    expect(zScore(1, 0, Number.NaN)).toBe(0);
  });

  it("computes the standard score for a valid sd", () => {
    expect(zScore(4, 2, 2)).toBe(1);
  });
});

describe("round", () => {
  it("rounds to 4 digits by default", () => {
    expect(round(1.234567)).toBe(1.2346);
  });

  it("respects an explicit digit count", () => {
    expect(round(1.2345, 2)).toBe(1.23);
  });
});

describe("weightedMean", () => {
  it("returns 0 for an empty list", () => {
    expect(weightedMean([])).toBe(0);
  });

  it("returns 0 when all weights are non-positive", () => {
    expect(weightedMean([{ value: 5, weight: 0 }])).toBe(0);
    expect(weightedMean([{ value: 5, weight: -1 }])).toBe(0);
  });

  it("ignores non-finite values", () => {
    expect(weightedMean([{ value: Number.NaN, weight: 1 }, { value: 4, weight: 2 }])).toBe(4);
  });

  it("computes the weighted average of valid entries", () => {
    expect(weightedMean([{ value: 2, weight: 1 }, { value: 4, weight: 3 }])).toBe(3.5);
  });
});

describe("protectedBasis", () => {
  it("clamps the basis input to [-8, 8]", () => {
    const high = protectedBasis(100);
    expect(high[0]).toBe(8);
    const low = protectedBasis(-100);
    expect(low[0]).toBe(-8);
  });

  it("emits the full basis expansion (linear, quad, cubic, knots, log, sigmoid)", () => {
    const basis = protectedBasis(0);
    // 3 polynomial terms + 3 default knots + log1p + sigmoid
    expect(basis.length).toBe(8);
    expect(basis[0]).toBe(0);
    expect(basis[1]).toBe(0);
    expect(basis[2]).toBe(0);
    expect(basis[basis.length - 1]).toBe(sigmoid(0));
  });
});
