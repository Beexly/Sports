import { describe, expect, it } from "vitest";
import { comparePicksByRanking, rankingSortKey } from "@/lib/ranking/sort-key";

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
