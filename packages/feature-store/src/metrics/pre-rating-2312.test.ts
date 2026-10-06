import { describe, expect, it } from "vitest";
import { binomialExactScore, preRating, uniformWindowTheorem, GSE_PRE_RATING_ENABLED } from "./pre-rating-2312.js";

describe("PRe rating module", () => {
  it("binomial-exact score matches the closed form", () => {
    // n=2, pbar=0.5, P(X=1) = 0.5
    expect(binomialExactScore([0.5, 0.5], 1)).toBeCloseTo(0.5, 10);
    expect(binomialExactScore([0.6, 0.6], 2)).toBeCloseTo(0.36, 10);
  });
  it("PRe on an overperforming window exceeds the window average", () => {
    const { pRe } = preRating([0.4, 0.4, 0.4, 0.4], 4);
    expect(pRe).toBeGreaterThan(0.4);
  });
  it("PRe on an underperforming window is below the window average", () => {
    const { pRe } = preRating([0.6, 0.6, 0.6, 0.6], 0);
    expect(pRe).toBeLessThan(0.6);
  });
  it("uniform-window theorem: PRe == mean(w) when wins/n matches the window mean", () => {
    // observed win rate 2/4 = 0.5 = window mean -> constrained max at d = 0
    expect(uniformWindowTheorem([0.5, 0.5, 0.5, 0.5], 2)).toBe(true);
  });
  it("PRe tracks the observed win rate on uniform windows (score maximizer)", () => {
    // binomPmf(n, wins, p) is maximized at p = wins/n
    const { pRe } = preRating([0.55, 0.55, 0.55], 2);
    expect(pRe).toBeCloseTo(2 / 3, 6);
  });
  it("handles empty windows", () => {
    expect(binomialExactScore([], 0)).toBe(0);
    expect(preRating([], 0).pRe).toBe(0.5);
  });
  it("stays off until the theorem-replication gate clears", () => {
    expect(GSE_PRE_RATING_ENABLED).toBe(false);
  });
});

