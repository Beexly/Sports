import { describe, it, expect } from "vitest";
import {
  estimatorSigma,
  precisionWeightedEnsemble,
  type MarketEstimate,
} from "../multi-market-ensemble.js";
import { assessEdge } from "../edge-engine.js";

describe("precisionWeightedEnsemble", () => {
  it("returns safe defaults for no valid estimates", () => {
    const r = precisionWeightedEnsemble([]);
    expect(r.fairProb).toBeNull();
    expect(r.independents).toEqual([]);
    expect(r.effectiveSources).toBe(0);
  });

  it("filters out-of-range probabilities", () => {
    const r = precisionWeightedEnsemble([
      { source: "a", prob: 1.4 },
      { source: "b", prob: 0.55 },
    ]);
    expect(r.independents).toHaveLength(1);
    expect(r.fairProb).toBeCloseTo(0.55, 6);
  });

  it("a single estimator passes through with zero divergence", () => {
    const r = precisionWeightedEnsemble([{ source: "kalshi", prob: 0.62 }]);
    expect(r.fairProb).toBeCloseTo(0.62, 6);
    expect(r.crossMarketDivergence).toBe(0);
    expect(r.maxPairwiseDisagreement).toBe(0);
    expect(r.effectiveSources).toBeCloseTo(1, 2);
    expect(r.weights[0]!.weight).toBeCloseTo(1, 6);
  });

  it("two equal-reliability sources blend to the mean with equal weight", () => {
    const r = precisionWeightedEnsemble([
      { source: "a", prob: 0.5 },
      { source: "b", prob: 0.6 },
    ]);
    expect(r.fairProb).toBeCloseTo(0.55, 6);
    expect(r.weights[0]!.weight).toBeCloseTo(0.5, 4);
    expect(r.effectiveSources).toBeCloseTo(2, 2);
  });

  it("precision-weights the lower-vig market more and pulls the blend toward it", () => {
    // Vig-free exchange says 0.60; a 5pt-hold sportsbook says 0.52.
    const r = precisionWeightedEnsemble([
      { source: "exchange", prob: 0.6, reliability: { holdPct: 0 } },
      { source: "book", prob: 0.52, reliability: { holdPct: 5 } },
    ]);
    // The exchange must carry strictly more weight and sort first.
    expect(r.weights[0]!.source).toBe("exchange");
    expect(r.weights[0]!.weight).toBeGreaterThan(r.weights[1]!.weight);
    // The blend is pulled above the naive mean (0.56) toward the exchange.
    expect(r.fairProb!).toBeGreaterThan(0.56);
    expect(r.fairProb!).toBeLessThan(0.6);
  });

  it("respects a direct stdError override (a precise source dominates)", () => {
    const r = precisionWeightedEnsemble([
      { source: "tight", prob: 0.7, reliability: { stdError: 0.01 } },
      { source: "loose", prob: 0.4, reliability: { stdError: 0.2 } },
    ]);
    expect(r.weights[0]!.source).toBe("tight");
    expect(r.weights[0]!.weight).toBeGreaterThan(0.95);
    expect(r.fairProb!).toBeGreaterThan(0.68); // dragged near the tight source
  });

  it("inverse-variance fusion is tighter than any single source", () => {
    const r = precisionWeightedEnsemble([
      { source: "a", prob: 0.55, reliability: { stdError: 0.05 } },
      { source: "b", prob: 0.55, reliability: { stdError: 0.05 } },
    ]);
    expect(r.stdError).toBeLessThan(0.05);
    expect(r.stdError).toBeCloseTo(0.05 / Math.sqrt(2), 4);
  });

  it("cross-market divergence and max pairwise disagreement track disagreement", () => {
    const agree = precisionWeightedEnsemble([
      { source: "a", prob: 0.5 },
      { source: "b", prob: 0.5 },
    ]);
    expect(agree.crossMarketDivergence).toBe(0);

    const split = precisionWeightedEnsemble([
      { source: "a", prob: 0.4 },
      { source: "b", prob: 0.6 },
      { source: "c", prob: 0.55 },
    ]);
    expect(split.crossMarketDivergence).toBeGreaterThan(0);
    expect(split.maxPairwiseDisagreement).toBeCloseTo(0.2, 6);
  });

  it("emits independents that plug straight into edge-engine.assessEdge", () => {
    const ens = precisionWeightedEnsemble([
      { source: "kalshi", prob: 0.6, reliability: { holdPct: 0 } },
      { source: "poisson", prob: 0.58, reliability: { sampleSize: 40 } },
    ]);
    const edge = assessEdge({ marketFairProb: 0.52, independents: ens.independents });
    // assessEdge's weighted blend uses the same normalised weights, so its trueProb
    // equals the ensemble's precision-weighted fairProb.
    expect(edge.trueProb).toBeCloseTo(ens.fairProb!, 4);
    expect(edge.agreement).toBe("CONFIRMS"); // both independents above the market
  });
});

describe("estimatorSigma", () => {
  it("a vig-free, deep, fresh quote sits near the baseline", () => {
    expect(estimatorSigma({ holdPct: 0, liquidity: 1, ageSeconds: 0 })).toBeCloseTo(0.05, 6);
  });

  it("hold and staleness widen σ; liquidity and sample size tighten it", () => {
    const base = estimatorSigma({});
    expect(estimatorSigma({ holdPct: 6 })).toBeGreaterThan(base);
    expect(estimatorSigma({ ageSeconds: 600 })).toBeGreaterThan(base);
    expect(estimatorSigma({ liquidity: 9 })).toBeLessThan(base);
    expect(estimatorSigma({ sampleSize: 80 })).toBeLessThan(base);
  });

  it("clamps σ into a safe range and honours a direct stdError", () => {
    expect(estimatorSigma({ stdError: 0.03 })).toBeCloseTo(0.03, 6);
    expect(estimatorSigma({ holdPct: 1000 })).toBeLessThanOrEqual(0.5);
    expect(estimatorSigma({ liquidity: 1e9 })).toBeGreaterThanOrEqual(0.01);
  });
});
