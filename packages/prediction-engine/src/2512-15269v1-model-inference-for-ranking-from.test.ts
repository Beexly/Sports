/**
 * Vitest suite for arXiv:2512.15269v1 (Model inference for ranking from pairwise comparisons).
 * Gate: ADAPT iff the learned kernel beats the fixed logistic on GSE's own backtest: log-loss of kernel-learned win probabilities must be lower than logistic-baseline Bradley-Terry on at least two held-out NFL seasons.
 */
import { describe, it, expect } from "vitest";
import { chebyshevBasis, chebWinProb, chebEmStep } from "./2512-15269v1-model-inference-for-ranking-from";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2512-15269v1 Chebyshev-polynomial comparison kernel", () => {
  it("reduces to logistic with c = [0, 1]", () => {
    const k = { coeffs: [0, 1] };
    expect(chebWinProb(k, 2, 4)).toBeCloseTo(1 / (1 + Math.exp(-0.5)), 10);
    expect(chebWinProb(k, 0, 4)).toBeCloseTo(0.5, 10);
    expect(() => chebWinProb(k, 1, 0)).toThrow();
    expect(chebyshevBasis(0.5, 3)).toHaveLength(3);
  });
  it("EM step learns an asymmetric (favorite-longshot) shape", () => {
    const rng = lcg(71);
    const diffs: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let i = 0; i < 600; i++) {
      const d = (rng() - 0.5) * 8;
      // favorite-longshot bias: favorites underperform the logistic
      const p = 1 / (1 + Math.exp(-(0.8 * (d / 4) - 0.15 * Math.sign(d) * (d / 4) ** 2)));
      diffs.push(d);
      outcomes.push(rng() < p ? 1 : 0);
    }
    let k = { coeffs: [0, 1, 0] };
    for (let s = 0; s < 60; s++) k = chebEmStep(k, diffs, outcomes, 4, 0.5, 0.01);
    // quadratic term picked up the asymmetry
    expect(Math.abs(k.coeffs[2] ?? 0)).toBeGreaterThan(0.01);
    const pFav = chebWinProb(k, 4, 4);
    const pDog = chebWinProb(k, -4, 4);
    expect(pFav + pDog).toBeLessThan(1.02); // near-complementary
  });
});
