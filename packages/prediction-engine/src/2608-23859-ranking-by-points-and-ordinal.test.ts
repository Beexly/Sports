/**
 * Vitest suite for arXiv:2608.23859 (Ranking by points and ordinal models).
 * Gate: ADOPT the AC ordinal head for GSE's spread/total engine if on 2020-2024 NFL seasons the AC model's out-of-sample log loss on (cover/push/no-cover) is <= the best single binary baseline and the fitted slopes are within 2 SE of uniform (then use uniform with zero estimation cost); REJECT if AC underperforms binary logistics by >0.005 nats.
 */
import { describe, it, expect } from "vitest";
import { acProbs, fitAcOrdinal, reorderRate } from "./2608-23859-ranking-by-points-and-ordinal";

describe("2608-23859 AC ordinal rating head", () => {
  it("AC probs are valid", () => {
    const p = acProbs(0, [-0.5, 0.5]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p.every((v) => v >= 0)).toBe(true);
  });
  it("MAP fit recovers the spread slope", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const spread = (i % 21 - 10);
      X.push([spread, 1]); // spread + home boost
      const coverMargin = spread * 0.9 + 3 + ((i * 53) % 13 - 6) * 0.4;
      y.push(coverMargin > 0.5 ? 2 : coverMargin < -0.5 ? 0 : 1);
    }
    const { beta, cuts } = fitAcOrdinal(X, y, 10, 30);
    expect(beta[0]).toBeGreaterThan(0.2);
    expect(cuts[0]).toBeLessThan(cuts[1]);
    expect(() => fitAcOrdinal([], [], 1)).toThrow();
  });
  it("reorder rate is 0 for identical orders", () => {
    expect(reorderRate(["a", "b", "c"], ["a", "b", "c"])).toBe(0);
    expect(reorderRate(["a", "b", "c"], ["c", "b", "a"])).toBe(1);
    expect(() => reorderRate(["a"], ["a", "b"])).toThrow();
  });
});
