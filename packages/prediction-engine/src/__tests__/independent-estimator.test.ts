import { describe, it, expect } from "vitest";
import { estimateIndependentProbability } from "../independent-estimator.js";

/**
 * Independent (non-market) estimator — WIN-03.
 * The defining property is INDEPENDENCE from the price/consensus: the probability
 * comes from fundamentals only, so it can be measured AGAINST the line (CLV)
 * instead of being derived from it.
 */
const base = {
  restAdvantageScore: 0,
  historicalFormScore: 0,
  headToHeadScore: 0,
  venueFormScore: 0,
  scheduleStressScore: 0,
  offeredAmericanPrice: -110,
};

describe("estimateIndependentProbability", () => {
  it("anchors at 0.5 with no fundamental signal", () => {
    expect(estimateIndependentProbability(base).fairProbability).toBe(0.5);
  });

  it("tilts above 0.5 for positive fundamentals and below for negative", () => {
    expect(
      estimateIndependentProbability({
        ...base,
        restAdvantageScore: 8,
        historicalFormScore: 6,
      }).fairProbability
    ).toBeGreaterThan(0.5);
    expect(
      estimateIndependentProbability({ ...base, scheduleStressScore: -10 })
        .fairProbability
    ).toBeLessThan(0.5);
  });

  it("is INDEPENDENT of the offered price — the probability never moves with the price", () => {
    const a = estimateIndependentProbability({
      ...base,
      restAdvantageScore: 8,
      offeredAmericanPrice: -110,
    });
    const b = estimateIndependentProbability({
      ...base,
      restAdvantageScore: 8,
      offeredAmericanPrice: 250,
    });
    expect(b.fairProbability).toBe(a.fairProbability); // price does not move the probability
    expect(b.trueEvScore).not.toBe(a.trueEvScore); // but it does move EV
  });

  it("clamps probability into [0.05, 0.95]", () => {
    expect(
      estimateIndependentProbability({ ...base, restAdvantageScore: 1000 })
        .fairProbability
    ).toBeLessThanOrEqual(0.95);
    expect(
      estimateIndependentProbability({ ...base, restAdvantageScore: -1000 })
        .fairProbability
    ).toBeGreaterThanOrEqual(0.05);
  });

  it("computes negative EV for a coin-flip at -110 (you pay the vig) and positive EV for a real edge at plus money", () => {
    expect(estimateIndependentProbability(base).trueEvScore).toBeLessThan(0);
    const strong = estimateIndependentProbability({
      ...base,
      restAdvantageScore: 40,
      offeredAmericanPrice: 150,
    });
    expect(strong.trueEvScore).toBeGreaterThan(0);
  });
});
