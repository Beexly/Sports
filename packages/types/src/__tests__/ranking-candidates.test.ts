import { describe, expect, it } from "vitest";
import {
  extractRankingSortKey,
  extractExpectedClv,
  extractTrueProb,
  extractMarketFairProb,
  extractRankingSource,
  extractModelMinusMarket,
  isPricedTierRow,
  orderingCurrent,
  orderingEdgeFirst,
  orderingModelMinusMarket,
  orderingPricedTierFirst,
  getRankingComparator,
  type RankingCandidateRow,
} from "../ranking-candidates.js";
import * as barrel from "../index.js";

describe("ranking-candidates barrel exports", () => {
  it("exports all comparator functions from package index", () => {
    expect(typeof barrel.orderingCurrent).toBe("function");
    expect(typeof barrel.orderingEdgeFirst).toBe("function");
    expect(typeof barrel.orderingModelMinusMarket).toBe("function");
    expect(typeof barrel.orderingPricedTierFirst).toBe("function");
    expect(typeof barrel.getRankingComparator).toBe("function");
  });

  it("exports extractor helpers from package index", () => {
    expect(typeof barrel.extractRankingSortKey).toBe("function");
    expect(typeof barrel.extractExpectedClv).toBe("function");
    expect(typeof barrel.extractTrueProb).toBe("function");
    expect(typeof barrel.extractMarketFairProb).toBe("function");
    expect(typeof barrel.extractRankingSource).toBe("function");
    expect(typeof barrel.extractModelMinusMarket).toBe("function");
    expect(typeof barrel.isPricedTierRow).toBe("function");
  });
});

describe("extractRankingSortKey", () => {
  it("reads direct rankingP when finite", () => {
    expect(extractRankingSortKey({ confidence: 80, rankingP: 0.72 })).toBeCloseTo(0.72);
  });

  it("clamps rankingP to [0, 1]", () => {
    expect(extractRankingSortKey({ confidence: 80, rankingP: 1.25 })).toBe(1);
    expect(extractRankingSortKey({ confidence: 80, rankingP: -0.1 })).toBe(0);
  });

  it("reads nested factorBreakdown.rankingP", () => {
    expect(
      extractRankingSortKey({
        confidence: 80,
        factorBreakdown: { rankingP: 0.65 },
      }),
    ).toBeCloseTo(0.65);
  });

  it("falls back to factorBreakdown.rankingScore / 100", () => {
    expect(
      extractRankingSortKey({
        confidence: 80,
        factorBreakdown: { rankingScore: 68 },
      }),
    ).toBeCloseTo(0.68);
  });

  it("falls back to direct rankingScore / 100", () => {
    expect(
      extractRankingSortKey({
        confidence: 80,
        rankingScore: 75,
      }),
    ).toBeCloseTo(0.75);
  });

  it("falls back to confidence / 100 when no ranking metrics present", () => {
    expect(extractRankingSortKey({ confidence: 85 })).toBeCloseTo(0.85);
  });

  it("handles non-finite confidence gracefully", () => {
    expect(extractRankingSortKey({ confidence: NaN })).toBe(0);
  });
});

describe("field extractors", () => {
  it("extracts expectedClv from direct and nested properties", () => {
    expect(extractExpectedClv({ confidence: 70, expectedClv: 0.05 })).toBe(0.05);
    expect(
      extractExpectedClv({
        confidence: 70,
        factorBreakdown: { expectedClv: 0.04 },
      }),
    ).toBe(0.04);
    expect(
      extractExpectedClv({
        confidence: 70,
        factorBreakdown: { independentEdge: { expectedClv: 0.03 } },
      }),
    ).toBe(0.03);
    expect(extractExpectedClv({ confidence: 70 })).toBeNull();
  });

  it("extracts trueProb from direct and nested properties", () => {
    expect(extractTrueProb({ confidence: 70, trueProb: 0.58 })).toBe(0.58);
    expect(
      extractTrueProb({
        confidence: 70,
        factorBreakdown: { independentEdge: { trueProb: 0.62 } },
      }),
    ).toBe(0.62);
    expect(extractTrueProb({ confidence: 70 })).toBeNull();
  });

  it("extracts marketFairProb from direct and nested properties", () => {
    expect(extractMarketFairProb({ confidence: 70, marketFairProb: 0.51 })).toBe(0.51);
    expect(
      extractMarketFairProb({
        confidence: 70,
        factorBreakdown: { independentEdge: { marketFairProb: 0.52 } },
      }),
    ).toBe(0.52);
    expect(extractMarketFairProb({ confidence: 70 })).toBeNull();
  });

  it("extracts rankingSource correctly", () => {
    expect(extractRankingSource({ confidence: 70, rankingSource: "blend_indep_conf" })).toBe(
      "blend_indep_conf",
    );
    expect(
      extractRankingSource({
        confidence: 70,
        factorBreakdown: { rankingSource: "independent_trueProb" },
      }),
    ).toBe("independent_trueProb");
    expect(extractRankingSource({ confidence: 70 })).toBeNull();
  });

  it("calculates model-minus-market delta when both probabilities exist", () => {
    expect(
      extractModelMinusMarket({
        confidence: 70,
        trueProb: 0.6,
        marketFairProb: 0.52,
      }),
    ).toBeCloseTo(0.08);
    expect(extractModelMinusMarket({ confidence: 70, trueProb: 0.6 })).toBeNull();
  });

  it("identifies priced tier rows accurately", () => {
    expect(isPricedTierRow({ confidence: 70, rankingSource: "independent_trueProb" })).toBe(true);
    expect(isPricedTierRow({ confidence: 70, rankingSource: "blend_indep_conf" })).toBe(true);
    expect(isPricedTierRow({ confidence: 70, rankingSource: "confidence" })).toBe(false);
    expect(isPricedTierRow({ confidence: 70 })).toBe(false);
  });
});

describe("orderingCurrent comparator", () => {
  it("prioritizes isFeatured rows ahead of everything else", () => {
    const a: RankingCandidateRow = { confidence: 60, isFeatured: true };
    const b: RankingCandidateRow = { confidence: 95, isFeatured: false };
    expect(orderingCurrent(a, b)).toBeLessThan(0);
    expect(orderingCurrent(b, a)).toBeGreaterThan(0);
  });

  it("orders by rankingSortKey descending when not featured", () => {
    const a: RankingCandidateRow = { confidence: 70, rankingP: 0.75 };
    const b: RankingCandidateRow = { confidence: 70, rankingP: 0.65 };
    expect(orderingCurrent(a, b)).toBeLessThan(0);
    expect(orderingCurrent(b, a)).toBeGreaterThan(0);
  });

  it("breaks score ties by generatedAt recency", () => {
    const a: RankingCandidateRow = {
      confidence: 80,
      generatedAt: "2026-09-18T12:00:00Z",
    };
    const b: RankingCandidateRow = {
      confidence: 80,
      generatedAt: "2026-09-18T10:00:00Z",
    };
    expect(orderingCurrent(a, b)).toBeLessThan(0);
    expect(orderingCurrent(b, a)).toBeGreaterThan(0);
  });

  it("is antisymmetric and returns 0 for equal rows", () => {
    const a: RankingCandidateRow = {
      confidence: 80,
      generatedAt: "2026-09-18T12:00:00Z",
    };
    const b: RankingCandidateRow = {
      confidence: 80,
      generatedAt: "2026-09-18T12:00:00Z",
    };
    expect(orderingCurrent(a, b)).toBe(0);
  });
});

describe("orderingEdgeFirst comparator", () => {
  it("orders positive expectedClv rows descending", () => {
    const a: RankingCandidateRow = { confidence: 80, expectedClv: 0.12 };
    const b: RankingCandidateRow = { confidence: 90, expectedClv: 0.05 };
    expect(orderingEdgeFirst(a, b)).toBeLessThan(0);
  });

  it("puts positive expectedClv rows ahead of zero or negative rows", () => {
    const a: RankingCandidateRow = { confidence: 60, expectedClv: 0.02 };
    const b: RankingCandidateRow = { confidence: 95, expectedClv: 0 };
    expect(orderingEdgeFirst(a, b)).toBeLessThan(0);
  });

  it("trails rows without positive expectedClv in current order", () => {
    const a: RankingCandidateRow = { confidence: 90, expectedClv: 0 };
    const b: RankingCandidateRow = { confidence: 70, expectedClv: 0 };
    expect(orderingEdgeFirst(a, b)).toBeLessThan(0);
  });

  it("breaks edge ties by model-minus-market delta", () => {
    const a: RankingCandidateRow = {
      confidence: 80,
      expectedClv: 0.05,
      trueProb: 0.6,
      marketFairProb: 0.5,
    };
    const b: RankingCandidateRow = {
      confidence: 80,
      expectedClv: 0.05,
      trueProb: 0.55,
      marketFairProb: 0.5,
    };
    expect(orderingEdgeFirst(a, b)).toBeLessThan(0);
  });
});

describe("orderingModelMinusMarket comparator", () => {
  it("orders positive model-market delta descending", () => {
    const a: RankingCandidateRow = {
      confidence: 70,
      trueProb: 0.65,
      marketFairProb: 0.5,
    };
    const b: RankingCandidateRow = {
      confidence: 80,
      trueProb: 0.55,
      marketFairProb: 0.5,
    };
    expect(orderingModelMinusMarket(a, b)).toBeLessThan(0);
  });

  it("trails non-positive delta rows in current order", () => {
    const a: RankingCandidateRow = { confidence: 85, trueProb: 0.5, marketFairProb: 0.5 };
    const b: RankingCandidateRow = { confidence: 65, trueProb: 0.5, marketFairProb: 0.5 };
    expect(orderingModelMinusMarket(a, b)).toBeLessThan(0);
  });

  it("breaks model-market delta ties by expectedClv", () => {
    const a: RankingCandidateRow = {
      confidence: 80,
      trueProb: 0.6,
      marketFairProb: 0.5,
      expectedClv: 0.08,
    };
    const b: RankingCandidateRow = {
      confidence: 80,
      trueProb: 0.6,
      marketFairProb: 0.5,
      expectedClv: 0.03,
    };
    expect(orderingModelMinusMarket(a, b)).toBeLessThan(0);
  });
});

describe("orderingPricedTierFirst comparator", () => {
  it("places priced Tier 1 rows ahead of unpriced Tier 2 rows", () => {
    const priced: RankingCandidateRow = {
      confidence: 65,
      rankingSource: "independent_trueProb",
      expectedClv: 0.04,
    };
    const unpriced: RankingCandidateRow = {
      confidence: 95,
      rankingSource: "confidence",
    };
    expect(orderingPricedTierFirst(priced, unpriced)).toBeLessThan(0);
    expect(orderingPricedTierFirst(unpriced, priced)).toBeGreaterThan(0);
  });

  it("reproduces live inversion fix: high-confidence unpriced pick does not beat lower-confidence priced pick with real edge", () => {
    const unpricedMonsterLock: RankingCandidateRow = {
      id: "unpriced-monster",
      confidence: 91,
      rankingSource: "confidence",
      expectedClv: 0.0217,
    };
    const pricedSolidEdge: RankingCandidateRow = {
      id: "priced-solid",
      confidence: 85,
      rankingSource: "blend_indep_conf",
      expectedClv: 0.2257,
    };
    const currentOrder = [unpricedMonsterLock, pricedSolidEdge].sort(orderingCurrent);
    expect(currentOrder[0]!.id).toBe("unpriced-monster");

    const pricedTierOrder = [unpricedMonsterLock, pricedSolidEdge].sort(orderingPricedTierFirst);
    expect(pricedTierOrder[0]!.id).toBe("priced-solid");
  });

  it("orders within Tier 1 by expectedClv descending", () => {
    const a: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.15,
    };
    const b: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.05,
    };
    expect(orderingPricedTierFirst(a, b)).toBeLessThan(0);
  });

  it("trails absent expectedClv within Tier 1 behind finite zero/positive edge", () => {
    const finiteEdge: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.0,
    };
    const absentEdge: RankingCandidateRow = {
      confidence: 85,
      rankingSource: "independent_trueProb",
      expectedClv: null,
    };
    expect(orderingPricedTierFirst(finiteEdge, absentEdge)).toBeLessThan(0);
  });

  it("keeps Tier 2 unpriced rows in their relative current order", () => {
    const a: RankingCandidateRow = {
      confidence: 85,
      rankingSource: "confidence",
    };
    const b: RankingCandidateRow = {
      confidence: 65,
      rankingSource: "confidence",
    };
    expect(orderingPricedTierFirst(a, b)).toBeLessThan(0);
  });
  it("is transitive across distinct candidate items", () => {
    const a: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.2,
    };
    const b: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.1,
    };
    const c: RankingCandidateRow = {
      confidence: 70,
      rankingSource: "independent_trueProb",
      expectedClv: 0.05,
    };
    expect(orderingPricedTierFirst(a, b)).toBeLessThan(0);
    expect(orderingPricedTierFirst(b, c)).toBeLessThan(0);
    expect(orderingPricedTierFirst(a, c)).toBeLessThan(0);
  });
});

describe("getRankingComparator selector", () => {
  it("resolves all comparator names correctly", () => {
    expect(getRankingComparator("current")).toBe(orderingCurrent);
    expect(getRankingComparator("edge_first")).toBe(orderingEdgeFirst);
    expect(getRankingComparator("model_minus_market")).toBe(orderingModelMinusMarket);
    expect(getRankingComparator("priced_tier_first")).toBe(orderingPricedTierFirst);
    expect(getRankingComparator("unknown" as any)).toBe(orderingCurrent);
  });
});
