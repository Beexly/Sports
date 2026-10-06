import { describe, it, expect } from "vitest";
import {
  residualizeOnAncestors,
  corMatrix,
  markBidirected,
  quarantinePairs,
  edgeJaccard,
} from "./2001-04197v4-rcd-quarantine-layer.js";

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

describe("rcd", () => {
  it("markBidirected flags the latently-confounded pair", () => {
    const rand = mulberry32(271);
    const n = 1500;
    const X: number[][] = [];
    for (let i = 0; i < n; i++) {
      const u = randn(rand); // latent confounder
      X.push([u + randn(rand) * 0.3, u + randn(rand) * 0.3, randn(rand)]);
    }
    const resid = residualizeOnAncestors(X, [[], [], []]);
    const C = corMatrix(resid);
    const bi = markBidirected(C, 0.5);
    expect(bi.some(([i, j]) => (i === 0 && j === 1))).toBe(true);
    expect(bi.some(([i, j]) => (i === 0 && j === 2) || (i === 1 && j === 2))).toBe(false);
  });
  it("quarantinePairs applies the frequency threshold", () => {
    const boots: [number, number][][] = [[[0, 1]], [[0, 1], [1, 2]], [[0, 1]], [[1, 2]]];
    const q = quarantinePairs(boots, 0.6);
    expect(q).toEqual([[0, 1]]);
  });
  it("edgeJaccard measures stability", () => {
    expect(edgeJaccard([[0, 1]], [[0, 1]])).toBe(1);
    expect(edgeJaccard([[0, 1]], [[1, 2]])).toBe(0);
    expect(edgeJaccard([[0, 1], [1, 2]], [[0, 1]])).toBeCloseTo(0.5, 10);
  });
});
