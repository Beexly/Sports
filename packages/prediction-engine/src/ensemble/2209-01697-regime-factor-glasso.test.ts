import { describe, it, expect } from "vitest";
import {
  stackNNLS,
  logScoreStacking,
  regimeStackWeights,
  softThreshold,
  istaLasso,
  tvDenoise1d,
} from "./2209-01697-regime-factor-glasso.js";

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

describe("sparse", () => {
  it("istaLasso recovers sparse support", () => {
    const rand = mulberry32(431);
    const n = 120;
    const p = 25;
    const bTrue = new Array<number>(p).fill(0);
    bTrue[2] = 3;
    bTrue[7] = -2;
    const X = Array.from({ length: n }, () => Array.from({ length: p }, () => randnSp(rand)));
    const y = X.map((row) => row.reduce((s, x, j) => s + x * bTrue[j]!, 0) + randnSp(rand) * 0.1);
    const b = istaLasso(X, y, 0.15, 400);
    expect(Math.abs(b[2]!)).toBeGreaterThan(1.5);
    expect(Math.abs(b[7]!)).toBeGreaterThan(1);
    const spurious = b.filter((_, j) => j !== 2 && j !== 7).filter((v) => Math.abs(v) > 0.3);
    expect(spurious.length).toBeLessThan(4);
  });
  it("tvDenoise1d smooths while preserving jumps", () => {
    const rand = mulberry32(432);
    const y = Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 5) + randnSp(rand) * 0.5);
    const x = tvDenoise1d(y, 2.0);
    const left = x.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
    const right = x.slice(35).reduce((a, b) => a + b, 0) / 25;
    expect(right - left).toBeGreaterThan(3);
  });
});

function randnSp(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
