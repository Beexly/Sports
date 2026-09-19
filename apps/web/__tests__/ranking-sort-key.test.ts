import { describe, expect, it } from "vitest";
import {
  comparePicksByRanking,
  rankingBasisCensus,
  rankingSortKey,
  readRankingKey,
} from "@/lib/ranking/sort-key";

/**
 * Cases covering every branch and every rejection reason. Reused by the
 * no-drift pin below so the table cannot describe one function and test
 * another.
 */
const CASES: {
  readonly name: string;
  readonly pick: { readonly confidence: number; readonly factorBreakdown?: unknown };
  readonly basis: "rankingP" | "rankingScore" | "confidence";
  readonly key: number;
}[] = [
  { name: "finite rankingP wins", pick: { confidence: 90, factorBreakdown: { rankingP: 0.41 } }, basis: "rankingP", key: 0.41 },
  { name: "rankingP clamps high", pick: { confidence: 10, factorBreakdown: { rankingP: 1.4 } }, basis: "rankingP", key: 1 },
  { name: "rankingP clamps low", pick: { confidence: 10, factorBreakdown: { rankingP: -0.2 } }, basis: "rankingP", key: 0 },
  { name: "rankingP zero is a real value, not absence", pick: { confidence: 95, factorBreakdown: { rankingP: 0 } }, basis: "rankingP", key: 0 },
  { name: "NaN rankingP falls through", pick: { confidence: 80, factorBreakdown: { rankingP: Number.NaN, rankingScore: 55 } }, basis: "rankingScore", key: 0.55 },
  { name: "Infinity rankingP falls through", pick: { confidence: 80, factorBreakdown: { rankingP: Number.POSITIVE_INFINITY } }, basis: "confidence", key: 0.8 },
  { name: "string rankingP falls through", pick: { confidence: 80, factorBreakdown: { rankingP: "0.9" } }, basis: "confidence", key: 0.8 },
  { name: "null rankingP falls through", pick: { confidence: 80, factorBreakdown: { rankingP: null } }, basis: "confidence", key: 0.8 },
  { name: "rankingScore second", pick: { confidence: 80, factorBreakdown: { rankingScore: 55 } }, basis: "rankingScore", key: 0.55 },
  { name: "rankingScore clamps", pick: { confidence: 80, factorBreakdown: { rankingScore: 140 } }, basis: "rankingScore", key: 1 },
  { name: "absent breakdown", pick: { confidence: 72 }, basis: "confidence", key: 0.72 },
  { name: "null breakdown", pick: { confidence: 72, factorBreakdown: null }, basis: "confidence", key: 0.72 },
  { name: "non-object breakdown", pick: { confidence: 72, factorBreakdown: "{}" }, basis: "confidence", key: 0.72 },
  { name: "breakdown without ranking fields", pick: { confidence: 60, factorBreakdown: { edgeScore: 40, rankingSource: "confidence" } }, basis: "confidence", key: 0.6 },
  { name: "non-finite confidence reads 0", pick: { confidence: Number.NaN }, basis: "confidence", key: 0 },
];

describe("rankingSortKey", () => {
  it("prefers finite rankingP over confidence", () => {
    expect(
      rankingSortKey({
        confidence: 90,
        factorBreakdown: { rankingP: 0.41 },
      }),
    ).toBeCloseTo(0.41, 5);
  });

  it("falls back to rankingScore/100", () => {
    expect(
      rankingSortKey({
        confidence: 80,
        factorBreakdown: { rankingScore: 55 },
      }),
    ).toBeCloseTo(0.55, 5);
  });

  it("falls back to confidence when FB absent", () => {
    expect(rankingSortKey({ confidence: 72 })).toBeCloseTo(0.72, 5);
  });

  it("never invents ranking from edge", () => {
    expect(
      rankingSortKey({
        confidence: 60,
        factorBreakdown: { edgeScore: 40, rankingSource: "confidence" },
      }),
    ).toBeCloseTo(0.6, 5);
  });
});

describe("comparePicksByRanking", () => {
  it("pins featured first, then rankingP, then recency", () => {
    const picks = [
      { confidence: 99, factorBreakdown: { rankingP: 0.9 }, isFeatured: false, generatedAt: new Date("2026-08-01") },
      { confidence: 50, factorBreakdown: { rankingP: 0.4 }, isFeatured: true, generatedAt: new Date("2026-08-02") },
      { confidence: 70, factorBreakdown: { rankingP: 0.8 }, isFeatured: false, generatedAt: new Date("2026-08-03") },
      { confidence: 70, factorBreakdown: { rankingP: 0.8 }, isFeatured: false, generatedAt: new Date("2026-08-04") },
    ];
    const sorted = [...picks].sort(comparePicksByRanking);
    expect(sorted[0]?.isFeatured).toBe(true);
    expect(sorted[1]?.factorBreakdown).toEqual({ rankingP: 0.9 });
    expect(sorted[2]?.generatedAt).toEqual(new Date("2026-08-04"));
    expect(sorted[3]?.generatedAt).toEqual(new Date("2026-08-03"));
  });

  it("demotes high-confidence market-echo when rankingP is lower", () => {
    const a = { confidence: 92, factorBreakdown: { rankingP: 0.48 } };
    const b = { confidence: 61, factorBreakdown: { rankingP: 0.67 } };
    expect(comparePicksByRanking(a, b)).toBeGreaterThan(0); // b first
  });
});

describe("readRankingKey — basis reporting", () => {
  /**
   * THE NO-DRIFT PIN. rankingSortKey orders EIGHT surfaces (picks API, board
   * state, cockpit, cockpit brief, dashboard, admin dashboard, preview, and
   * the v1 probabilities route). Reporting the basis had to not move a single
   * one of those numbers, so this asserts the wrapper returns exactly what the
   * branch decision returns, on every case including the rejection reasons.
   */
  it("key is identical to rankingSortKey on every case", () => {
    for (const c of CASES) {
      expect(readRankingKey(c.pick).key, c.name).toBe(rankingSortKey(c.pick));
    }
  });

  it("reports the branch that actually produced the key", () => {
    for (const c of CASES) {
      const read = readRankingKey(c.pick);
      expect(read.basis, c.name).toBe(c.basis);
      expect(read.key, c.name).toBeCloseTo(c.key, 10);
    }
  });

  it("treats rankingP 0 as a value, never as absence", () => {
    // A row the independent model priced at zero is PRICED. If this ever fell
    // through to confidence, the rows the model rated worst would be ordered
    // by the one score measured to be anti-predictive at the top.
    const read = readRankingKey({ confidence: 95, factorBreakdown: { rankingP: 0 } });
    expect(read.basis).toBe("rankingP");
    expect(read.key).toBe(0);
  });
});

describe("rankingBasisCensus", () => {
  it("counts each branch and reports the confidence share", () => {
    const census = rankingBasisCensus([
      { confidence: 90, factorBreakdown: { rankingP: 0.41 } },
      { confidence: 80, factorBreakdown: { rankingP: 0.6 } },
      { confidence: 80, factorBreakdown: { rankingScore: 55 } },
      { confidence: 72 },
    ]);
    expect(census.rankingP).toBe(2);
    expect(census.rankingScore).toBe(1);
    expect(census.confidence).toBe(1);
    expect(census.total).toBe(4);
    expect(census.confidenceShare).toBeCloseTo(0.25, 10);
  });

  it("an empty board is a real answer, not an error", () => {
    // Absence is silence: a quiet slate must read as zeros rather than throw
    // or divide by zero, or the measurement cannot be run on a dark day.
    const census = rankingBasisCensus([]);
    expect(census.total).toBe(0);
    expect(census.confidence).toBe(0);
    expect(census.confidenceShare).toBe(0);
  });

  it("every row lands in exactly one branch", () => {
    const census = rankingBasisCensus(CASES.map((c) => c.pick));
    expect(census.rankingP + census.rankingScore + census.confidence).toBe(
      census.total,
    );
    expect(census.total).toBe(CASES.length);
  });
});
