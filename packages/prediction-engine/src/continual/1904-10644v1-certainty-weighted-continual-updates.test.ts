import { describe, it, expect } from "vitest";
import {
  naturalGradLogistic,
  logLossLogistic,
  rbfKernel,
  steinCoresetGreedy,
  mmdCoreset,
} from "./1904-10644v1-certainty-weighted-continual-updates.js";

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

describe("natgrad", () => {
  it("natural gradient step reduces log-loss", () => {
    const rand = mulberry32(441);
    const n = 200;
    const X = Array.from({ length: n }, () => [1, randnNat(rand) * 3, randnNat(rand)]);
    const bTrue = [0.5, 1.2, -0.8];
    const y = X.map((row) => {
      const z = row.reduce((s, x, j) => s + x * bTrue[j]!, 0);
      return rand() < 1 / (1 + Math.exp(-z)) ? 1 : 0;
    });
    let theta = [0, 0, 0];
    const l0 = logLossLogistic(X, y, theta);
    const ng = naturalGradLogistic(X, y, theta, 1e-3);
    theta = theta.map((t, j) => t - 0.5 * ng[j]!);
    const l1 = logLossLogistic(X, y, theta);
    expect(l1).toBeLessThan(l0);
  });
});

function randnNat(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("stein", () => {
  it("coreset covers the pool better than random (lower MMD)", () => {
    const rand = mulberry32(281);
    const X = Array.from({ length: 300 }, () => [randn(rand), randn(rand)]);
    const sel = steinCoresetGreedy(X, 20, 1.0);
    expect(sel.length).toBe(20);
    expect(new Set(sel).size).toBe(20);
    const randSel = Array.from({ length: 20 }, () => Math.floor(rand() * 300));
    expect(mmdCoreset(X, sel, 1.0)).toBeLessThan(mmdCoreset(X, randSel, 1.0));
  });
});
