import { describe, expect, it } from "vitest";
import { computeConsensus, extractSourceProbs, type SourceProb } from "../consensus.js";
import type { IndependentMarketFairValue } from "@sports/types";

const sp = (source: string, homeProb: number, weight = 1): SourceProb => ({ source, homeProb, weight });

describe("extractSourceProbs", () => {
  it("keeps quoted sources and drops null-quote ones", () => {
    const fvs: IndependentMarketFairValue[] = [
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4 },
      { source: "elo", homeFairProb: 0.55, awayFairProb: 0.45 },
      { source: "thin", homeFairProb: null, awayFairProb: null },
    ];
    expect(extractSourceProbs(fvs).map((s) => s.source)).toEqual(["kalshi", "elo"]);
  });
});

describe("computeConsensus", () => {
  it("reports high agreement and low dispersion when referees concur", () => {
    const res = computeConsensus([sp("a", 0.6), sp("b", 0.61), sp("c", 0.59)]);
    expect(res.consensusHomeProb).toBeCloseTo(0.6, 2);
    expect(res.dispersion).toBeLessThan(0.02);
    expect(res.agreementScore).toBeGreaterThan(0.9);
    expect(res.outliers).toHaveLength(0);
  });

  it("flags an outlier among a tight cluster", () => {
    const probs = [sp("a", 0.5), sp("b", 0.5), sp("c", 0.5), sp("d", 0.5), sp("e", 0.5), sp("x", 0.9)];
    const res = computeConsensus(probs);
    expect(res.outliers.map((o) => o.source)).toContain("x");
  });

  it("computes signed divergence vs the market", () => {
    const res = computeConsensus([sp("a", 0.62), sp("b", 0.64)], 0.55);
    expect(res.marketDivergence).toBeGreaterThan(0); // referees rate home higher than the book
  });

  it("returns nulls for an empty / zero-weight field", () => {
    const res = computeConsensus([sp("a", 0.6, 0)]);
    expect(res.consensusHomeProb).toBeNull();
    expect(res.sources).toBe(0);
  });
});
