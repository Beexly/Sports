import { describe, expect, it } from "vitest";
import {
  currentRankingScalar,
  isTotalAndStable,
  orderingCurrent,
  orderingEdgeFirst,
  orderingModelMinusMarket,
  orderingPricedTierFirst,
  RANKING_ORDERING_SWITCH,
  sortByOrdering,
  type RankingCandidateRow,
} from "../ranking-candidates";
import {
  orderingCurrent as barrelCurrent,
  RANKING_ORDERING_SWITCH as barrelSwitch,
} from "../index";

function row(
  partial: Partial<RankingCandidateRow> & Pick<RankingCandidateRow, "id" | "inputIndex">,
): RankingCandidateRow {
  return {
    expectedClv: null,
    trueProb: null,
    marketFairProb: null,
    rankingP: null,
    rankingScore: null,
    confidence: 50,
    generatedAt: "2026-09-18T00:00:00.000Z",
    isFeatured: false,
    rankingSource: null,
    ...partial,
  };
}

describe("ranking-candidates — barrel + switch", () => {
  it("is reachable through the package barrel, not only by direct path", () => {
    expect(barrelCurrent).toBe(orderingCurrent);
    expect(barrelSwitch).toBe("current");
    expect(RANKING_ORDERING_SWITCH).toBe("current");
  });
});

describe("orderingCurrent reproduces sort-key.ts including isFeatured", () => {
  it("pins featured rows first (sort-key.ts:36,42,46)", () => {
    const featured = row({
      id: "f",
      inputIndex: 1,
      isFeatured: true,
      rankingP: 0.1,
      confidence: 10,
    });
    const plain = row({
      id: "p",
      inputIndex: 0,
      isFeatured: false,
      rankingP: 0.99,
      confidence: 99,
    });
    expect(orderingCurrent(featured, plain)).toBeLessThan(0);
    expect(sortByOrdering([plain, featured], "current").map((r) => r.id)).toEqual([
      "f",
      "p",
    ]);
  });

  it("uses rankingP, then rankingScore/100, then confidence/100", () => {
    expect(currentRankingScalar(row({ id: "a", inputIndex: 0, rankingP: 0.62 }))).toBe(0.62);
    expect(
      currentRankingScalar(row({ id: "b", inputIndex: 0, rankingScore: 55, rankingP: null })),
    ).toBe(0.55);
    expect(
      currentRankingScalar(
        row({ id: "c", inputIndex: 0, rankingP: null, rankingScore: null, confidence: 72 }),
      ),
    ).toBeCloseTo(0.72, 10);
  });
});

describe("orderingEdgeFirst trailing rule", () => {
  it("a null expectedClv trails a positive one rather than sorting as zero", () => {
    const pos = row({ id: "pos", inputIndex: 1, expectedClv: 0.02 });
    const missing = row({ id: "miss", inputIndex: 0, expectedClv: null, rankingP: 0.99 });
    const zero = row({ id: "zero", inputIndex: 2, expectedClv: 0 });
    const ordered = sortByOrdering([missing, pos, zero], "edge-first");
    expect(ordered.map((r) => r.id)).toEqual(["pos", "miss", "zero"]);
  });
});

describe("orderingPricedTierFirst never lets unpriced outrank priced", () => {
  it("unpriced confidence-91 trails priced even when the priced row has lower confidence", () => {
    const unpriced = row({
      id: "unpriced-91",
      inputIndex: 0,
      confidence: 91,
      rankingP: 0.91,
      rankingSource: "confidence",
      expectedClv: 0.0217,
    });
    const priced = row({
      id: "priced-85",
      inputIndex: 1,
      confidence: 85,
      rankingP: 0.62,
      rankingSource: "blend_indep_conf",
      expectedClv: 0.2257,
      trueProb: 0.62,
      marketFairProb: 0.4,
    });
    const ordered = sortByOrdering([unpriced, priced], "priced-tier-first");
    expect(ordered[0]!.id).toBe("priced-85");
    expect(ordered[1]!.id).toBe("unpriced-91");
  });
});

describe("comparators are total, stable, antisymmetric", () => {
  const fixture: RankingCandidateRow[] = [
    row({ id: "a", inputIndex: 0, rankingP: 0.5, confidence: 50, isFeatured: true }),
    row({ id: "b", inputIndex: 1, rankingP: 0.5, confidence: 50, expectedClv: 0.1 }),
    row({ id: "c", inputIndex: 2, rankingP: 0.4, rankingSource: "blend_indep_conf", expectedClv: 0.2 }),
    row({ id: "d", inputIndex: 3, trueProb: 0.7, marketFairProb: 0.5, expectedClv: null }),
    row({ id: "e", inputIndex: 4, rankingSource: "confidence", confidence: 91 }),
  ];

  it.each([
    ["current", orderingCurrent],
    ["edge-first", orderingEdgeFirst],
    ["model-minus-market", orderingModelMinusMarket],
    ["priced-tier-first", orderingPricedTierFirst],
  ] as const)("%s", (_name, cmp) => {
    expect(isTotalAndStable(cmp, fixture)).toBe(true);
  });

  it("equal rows keep input order (stable)", () => {
    const twins = [
      row({ id: "t0", inputIndex: 0, rankingP: 0.5 }),
      row({ id: "t1", inputIndex: 1, rankingP: 0.5 }),
    ];
    expect(sortByOrdering(twins, "current").map((r) => r.id)).toEqual(["t0", "t1"]);
  });
});
