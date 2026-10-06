/**
 * Vitest suite for arXiv:2507.09098 (Linear Acceleration Is a Primary Risk Factor for Concussion).
 * Gate: ADAPT the risk-function methodology if the replication confirms linear acceleration in the top-2 predictors by AUPRC with a 50% threshold of 60-140 g; REJECT the helmet-tech claim entirely (conflicted source, not prediction).
 */
import { describe, it, expect } from "vitest";
import { secondOrderKnockoffs, knockoffPlusThreshold, knockoffSelect } from "./2507-09098-linear-acceleration-is-a-primary";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2507-09098 copula knockoff feature selection", () => {
  it("knockoffs preserve column means", () => {
    const rng = lcg(5);
    const X = Array.from({ length: 50 }, (_, i) => [i, i * 2, 50 - i]);
    const Xk = secondOrderKnockoffs(X, rng);
    expect(Xk).toHaveLength(50);
    for (let j = 0; j < 3; j++) {
      const m = X.reduce((s, r) => s + (r[j] ?? 0), 0) / 50;
      const mk = Xk.reduce((s, r) => s + (r[j] ?? 0), 0) / 50;
      expect(mk).toBeCloseTo(m, 8);
    }
    expect(() => secondOrderKnockoffs([], rng)).toThrow();
  });
  it("knockoff+ selects strong contrasts at FDR q", () => {
    const W = [3.0, 2.9, 0.2, 2.8, 2.7, 2.6, -0.1, -0.15, -0.2];
    const sel = knockoffSelect(W, 0.2);
    expect(sel).toContain(0);
    expect(sel).not.toContain(2);
    expect(() => knockoffPlusThreshold(W, 0)).toThrow();
  });
});
