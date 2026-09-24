/**
 * Vitest suite for arXiv:2607.18269v2 (Ledger 0797 — Wisdom of LLM Crowds: Aggregation and Contamination in Language Model Ensembles).
 * Gate: Learned linear aggregate must beat the arithmetic mean by >=5% Brier on the held-out season, with the error-decorrelation replication r_s >= 0.3, before production. No nonlinear aggregator needed — LR sufficiency is a paper result.
 */
import { describe, it, expect } from "vitest";
import { disagreementFeatures, fitLrAggregate, lrAggregate, AggRow } from "./2607-18269v2-ledger-0797-wisdom-of-llm";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2607-18269v2 L2 logistic-regression aggregation", () => {
  it("builds disagreement features pairwise", () => {
    const f = disagreementFeatures([0.7, 0.5, 0.5]);
    expect(f).toHaveLength(3);
    expect(f[0]).toBeCloseTo(0.2, 10);
    expect(f[1]).toBeCloseTo(0.2, 10);
    expect(f[2]).toBe(0);
  });
  it("learns positive weight on the informative source", () => {
    const rng = lcg(141);
    const rows: AggRow[] = Array.from({ length: 400 }, () => {
      const truth = rng() < 0.5 ? 0 : 1;
      const good = Math.min(0.95, Math.max(0.05, truth + (rng() - 0.5) * 0.3));
      const noise = rng();
      return { probs: [good, noise], y: truth as 0 | 1 };
    });
    const w = fitLrAggregate(rows, 0.1);
    // w[1] = weight on the informative source's prob
    expect(w[1]).toBeGreaterThan(0.5);
    const p = lrAggregate(w, [0.9, 0.5]);
    expect(p).toBeGreaterThan(0.7);
    expect(() => fitLrAggregate([], 0.1)).toThrow();
    expect(() => lrAggregate([0, 1], [0.5, 0.5])).toThrow();
  });
});
