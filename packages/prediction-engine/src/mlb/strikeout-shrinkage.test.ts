import { describe, expect, it } from "vitest";
import { betaBinomialPosteriorMean, marcelWeightedRate } from "./strikeout-shrinkage.js";

describe("strikeout shrinkage", () => {
  it("shrinks a short sample toward the beta prior and weights Marcel seasons", () => {
    expect(betaBinomialPosteriorMean(2, 10, 8, 32)).toBeCloseTo(10 / 50);
    const weighted = marcelWeightedRate([
      { strikeouts: 10, battersFaced: 40, seasonsAgo: 0 },
      { strikeouts: 10, battersFaced: 40, seasonsAgo: 2 },
    ]);
    expect(weighted.strikeouts).toBeCloseTo(10 + 6);
    expect(weighted.battersFaced).toBeCloseTo(40 + 24);
    expect(weighted.rate).toBeCloseTo(0.25);
  });
});
