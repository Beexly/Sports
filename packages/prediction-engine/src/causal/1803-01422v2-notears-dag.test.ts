import { describe, it, expect } from "vitest";
import {
  matExp,
  acyclicity,
  thresholdEdges,
  jaccardEdges,
  notearsFit,
} from "./1803-01422v2-notears-dag.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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

/** Chain SEM: X0 -> X1 -> X2. */
function simChain(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x0 = randn(rand);
    const x1 = 0.9 * x0 + randn(rand) * 0.6;
    const x2 = 0.9 * x1 + randn(rand) * 0.6;
    X.push([x0, x1, x2]);
  }
  return X;
}

describe("notears", () => {
  it("matExp matches the scalar exponential on diagonal input", () => {
    const E = matExp([
      [1, 0],
      [0, 2],
    ]);
    expect(E[0]![0]).toBeCloseTo(Math.E, 6);
    expect(E[1]![1]).toBeCloseTo(Math.E * Math.E, 6);
    expect(E[0]![1]).toBeCloseTo(0, 8);
  });
  it("h(W) = 0 for a DAG, > 0 for a cycle", () => {
    const dag = [
      [0, 0.8, 0],
      [0, 0, 0.8],
      [0, 0, 0],
    ];
    const cyc = [
      [0, 0.8, 0],
      [0, 0, 0.8],
      [0.8, 0, 0],
    ];
    expect(acyclicity(dag).h).toBeCloseTo(0, 8);
    expect(acyclicity(cyc).h).toBeGreaterThan(0.1);
  });
  it("learns the chain edges from data", () => {
    const X = simChain(600, 3);
    const W = notearsFit(X, 0.08, 1200, 0.02);
    const { h } = acyclicity(W);
    expect(h).toBeLessThan(0.1);
    const edges = thresholdEdges(W, 0.25);
    const has = (i: number, j: number) => edges.some(([a, b]) => a === i && b === j);
    expect(has(0, 1)).toBe(true);
    expect(has(1, 2)).toBe(true);
    expect(has(1, 0)).toBe(false);
    expect(has(2, 1)).toBe(false);
  });
  it("edge sets are stable across folds (Jaccard >= 0.5)", () => {
    const X = simChain(600, 3);
    const n = X.length;
    const W1 = notearsFit(X.slice(0, n / 2), 0.08, 1200, 0.02);
    const W2 = notearsFit(X.slice(n / 2), 0.08, 1200, 0.02);
    const j = jaccardEdges(thresholdEdges(W1, 0.25), thresholdEdges(W2, 0.25));
    expect(j).toBeGreaterThanOrEqual(0.5);
  });
});
