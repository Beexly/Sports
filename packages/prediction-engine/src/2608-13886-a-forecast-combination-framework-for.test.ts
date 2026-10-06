/**
 * Vitest suite for arXiv:2608.13886 (A Forecast Combination Framework for Hierarchical and Grouped Time Series Reconciliation).
 * Gate: ADAPT if the held-out 2026 test shows the shrunk Bates-Granger combination beating both equal weights and the best single source by >=0.002 Brier in at least 2 of 3 markets — then wire it as the engine's final probability layer. Reject if combination <= equal weights (the classic result reasserts itself).
 */
import { describe, it, expect } from "vitest";
import { shrinkCovariance, batesGrangerWeights, reconcileSeasonTotal } from "./2608-13886-a-forecast-combination-framework-for";

describe("2608-13886 Bates-Granger combination", () => {
  it("puts more weight on the lower-variance source", () => {
    const Sigma = [[1, 0.2], [0.2, 4]];
    const w = batesGrangerWeights(Sigma, 0.5, 0.01);
    expect(w[0]).toBeGreaterThan(w[1] ?? 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(() => batesGrangerWeights([], 0.5, 0.1)).toThrow();
  });
  it("shrinkage toward diagonal reduces off-diagonal influence", () => {
    const S = shrinkCovariance([[1, 0.9], [0.9, 1]], 1);
    expect(S[0]?.[1]).toBeCloseTo(0, 12);
    expect(() => shrinkCovariance([[1]], 2)).toThrow();
  });
  it("reconciles game probs to the season total", () => {
    const r = reconcileSeasonTotal([0.6, 0.5, 0.4], 9);
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(9, 10);
    expect(r[0]).toBeGreaterThan(r[2] ?? 0);
    expect(() => reconcileSeasonTotal([0, 0], 9)).toThrow();
  });
});
