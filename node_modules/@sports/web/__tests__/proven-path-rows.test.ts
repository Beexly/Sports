import { describe, expect, it } from "vitest";
import {
  extractProvenPathProbs,
  toProvenPathPickRow,
} from "@/lib/calibration/proven-path-rows";

describe("extractProvenPathProbs — honest independent load", () => {
  it("never treats confidence-sourced rankingP as independent", () => {
    const r = extractProvenPathProbs({
      rankingP: 0.72,
      rankingSource: "confidence",
      independentEdge: null,
    });
    expect(r.pIndependent).toBeNull();
    expect(r.rankingP).toBeCloseTo(0.72, 5);
  });

  it("uses raw trueProb for pIndependent", () => {
    const r = extractProvenPathProbs({
      rankingP: 0.65, // blend already mixed — must NOT become pIndependent
      rankingSource: "blend_indep_conf",
      independentEdge: {
        trueProb: 0.8,
        priced: true,
        marketFairProb: 0.55,
        decision: "SPEAK",
      },
    });
    expect(r.pIndependent).toBeCloseTo(0.8, 5);
    expect(r.marketP).toBeCloseTo(0.55, 5);
  });

  it("does not double-blend blend rankingP as independent", () => {
    const r = extractProvenPathProbs({
      rankingP: 0.66,
      rankingSource: "blend_indep_conf",
      independentEdge: {
        trueProb: 0.8,
        priced: true,
        marketFairProb: 0.5,
      },
    });
    // pIndependent is raw 0.8; bake-off will blend conf + 0.8 once
    expect(r.pIndependent).toBeCloseTo(0.8, 5);
    expect(r.pIndependent).not.toBeCloseTo(0.66, 2);
  });

  it("accepts pure independent rankingP when source is independent_trueProb", () => {
    const r = extractProvenPathProbs({
      rankingP: 0.77,
      rankingSource: "independent_trueProb",
    });
    expect(r.pIndependent).toBeCloseTo(0.77, 5);
  });

  it("loads marketFairProb from factorBreakdown root", () => {
    const r = extractProvenPathProbs({
      marketFairProb: 0.48,
      rankingSource: "confidence",
      rankingP: 0.6,
    });
    expect(r.marketP).toBeCloseTo(0.48, 5);
    expect(r.pIndependent).toBeNull();
  });
});

describe("toProvenPathPickRow", () => {
  it("maps settled pick with trueProb only", () => {
    const row = toProvenPathPickRow({
      confidence: 70,
      result: "WIN",
      pickType: "MONEYLINE",
      factorBreakdown: {
        rankingP: 0.7,
        rankingSource: "confidence",
        independentEdge: { trueProb: 0.62, marketFairProb: 0.51 },
      },
      game: { sport: { key: "americanfootball_nfl" } },
    });
    expect(row).not.toBeNull();
    expect(row!.pConfidence).toBeCloseTo(0.7, 5);
    expect(row!.pIndependent).toBeCloseTo(0.62, 5);
    expect(row!.marketP).toBeCloseTo(0.51, 5);
    expect(row!.pEdge).toBeNull();
    expect(row!.groupKey).toBe("americanfootball_nfl|MONEYLINE");
  });

  it("rejects non WIN/LOSS", () => {
    expect(
      toProvenPathPickRow({
        confidence: 70,
        result: "PUSH",
      }),
    ).toBeNull();
  });
});
