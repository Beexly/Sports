import { describe, it, expect } from "vitest";
import {
  stackNNLS,
  logScoreStacking,
  regimeStackWeights,
} from "./2003-06505v1-autogluon-tabular-search.js";

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

describe("stacking", () => {
  it("stackNNLS puts weight on the informative model", () => {
    const rand = mulberry32(191);
    const n = 500;
    const F: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = randn(rand);
      F.push([t + randn(rand) * 0.3, randn(rand) * 2, 0.5 + randn(rand)]);
      y.push(t);
    }
    const w = stackNNLS(F, y, 400, 0.05);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]!).toBeGreaterThan(w[2]!);
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-6);
  });
  it("logScoreStacking beats equal weights on a skilled forecaster", () => {
    const rand = mulberry32(192);
    const P: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 800; i++) {
      const pt = 0.3 + 0.4 * rand();
      const yy = rand() < pt ? 1 : 0;
      y.push(yy);
      P.push([Math.min(0.99, Math.max(0.01, pt + (rand() - 0.5) * 0.05)), 0.5]);
    }
    const w = logScoreStacking(P, y, 150);
    expect(w[0]!).toBeGreaterThan(0.6);
  });
  it("regimeStackWeights is a valid simplex", () => {
    const w = regimeStackWeights([1, -0.5], [[0.1, 0.5, -0.2], [-0.1, -0.3, 0.4]]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w.every((x) => x > 0)).toBe(true);
  });
});
