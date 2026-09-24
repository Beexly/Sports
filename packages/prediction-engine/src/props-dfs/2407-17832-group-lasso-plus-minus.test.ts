import { describe, it, expect } from "vitest";
import {
  groupSoftThreshold,
  groupLassoFit,
} from "./2407-17832-group-lasso-plus-minus.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("grouplasso", () => {
  it("group lasso zeroes out irrelevant groups together", () => {
    const rand = mulberry32(111);
    const n = 300;
    const groups = [0, 0, 1, 1, 2, 2];
    const p = groups.length;
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const row = Array.from({ length: p }, () => randn(rand));
      X.push(row);
      y.push(2 * row[0]! - row[1]! + randn(rand) * 0.5); // only group 0 matters
    }
    const beta = groupLassoFit(X, y, groups, 8, 100);
    const g1 = Math.hypot(beta[2]!, beta[3]!);
    const g2 = Math.hypot(beta[4]!, beta[5]!);
    const g0 = Math.hypot(beta[0]!, beta[1]!);
    expect(g1).toBeLessThan(0.3);
    expect(g2).toBeLessThan(0.3);
    expect(g0).toBeGreaterThan(1.0);
  });
  it("groupSoftThreshold zeroes small-norm groups", () => {
    expect(groupSoftThreshold([0.1, 0.1], 1)).toEqual([0, 0]);
    const out = groupSoftThreshold([3, 4], 2.5);
    expect(Math.hypot(out[0]!, out[1]!)).toBeCloseTo(2.5, 8);
  });
});
