import { describe, it, expect } from "vitest";
import {
  TreeStump,
  bartStumpGibbs,
  gaussBart,
  coClusterMatrix,
  intervalCoverage,
} from "./2211-04459v3-flexbart-tabular-learner.js";

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

describe("bart", () => {
  it("bartStumpGibbs recovers a step function", () => {
    const rand = mulberry32(471);
    const X = Array.from({ length: 200 }, () => [rand() * 10]);
    const y = X.map(([x]) => (x! < 5 ? 0 : 10) + gaussBart(rand) * 0.5);
    const { postMean } = bartStumpGibbs(X, y, 60, rand, 0.5, 5);
    const left = postMean.filter((_, i) => X[i]![0]! < 4);
    const right = postMean.filter((_, i) => X[i]![0]! > 6);
    const ml = (a: number[]): number => a.reduce((x, yy) => x + yy, 0) / a.length;
    expect(ml(right) - ml(left)).toBeGreaterThan(5);
  });
  it("coClusterMatrix groups similar levels", () => {
    const rand = mulberry32(472);
    const stumps: TreeStump[] = Array.from({ length: 50 }, () => ({
      splitVar: 0,
      splitVal: 2.5 + (rand() - 0.5),
      leftMean: 0,
      rightMean: 1,
    }));
    const C = coClusterMatrix(stumps, [1, 2, 3, 4, 5, 1, 2], 0);
    expect(C[0]![1]!).toBeGreaterThan(C[0]![4]!); // levels 1,2 co-cluster; 1,5 do not
  });
  it("intervalCoverage is sane on well-fit data", () => {
    const cov = intervalCoverage([1, 2, 3], [0.5, 0.5, 0.5], [1.1, 2.2, 2.9]);
    expect(cov).toBe(1);
  });
});
