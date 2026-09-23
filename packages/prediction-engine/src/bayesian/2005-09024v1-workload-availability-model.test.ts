import { describe, it, expect } from "vitest";
import {
  solveLinear,
  ridgeFit,
  ridgePredict,
  arxFit,
  adjustedPlusMinus,
  logistic,
  irlsFit,
  logisticLogLoss,
  stadiumFactorFit,
} from "./2005-09024v1-workload-availability-model.js";

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

describe("ridge", () => {
  it("ridgeFit recovers coefficients and shrinks vs OLS", () => {
    const rand = mulberry32(81);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 300; i++) {
      const x1 = randn(rand);
      const x2 = randn(rand);
      X.push([1, x1, x2]);
      y.push(2 * x1 - x2 + randn(rand) * 0.5);
    }
    const b = ridgeFit(X, y, 1.0);
    expect(Math.abs(b[1]! - 2)).toBeLessThan(0.2);
    expect(Math.abs(b[2]! + 1)).toBeLessThan(0.2);
    const b0 = ridgeFit(X, y, 1e-9);
    const bBig = ridgeFit(X, y, 1e6);
    expect(Math.abs(bBig[1]!)).toBeLessThan(Math.abs(b0[1]!));
  });
  it("arxFit captures AR(1) dynamics", () => {
    const rand = mulberry32(82);
    const Y: number[] = [];
    let v = 0;
    for (let t = 0; t < 500; t++) {
      v = 0.7 * v + randn(rand);
      Y.push(v);
    }
    const b = arxFit(Y, [], 1, 0.1);
    expect(Math.abs(b[1]! - 0.7)).toBeLessThan(0.08);
  });
  it("adjustedPlusMinus ranks the true best player first", () => {
    const rand = mulberry32(83);
    const truth = [3, 1, -1, -2, 0.5];
    const presence: number[][] = [];
    const margin: number[] = [];
    for (let s = 0; s < 800; s++) {
      const row = truth.map(() => (rand() < 0.5 ? 1 : -1));
      const m = row.reduce((a, r, i) => a + r * truth[i]!, 0) + randn(rand);
      presence.push(row);
      margin.push(m);
    }
    const est = adjustedPlusMinus(presence, margin, 5);
    const best = est.indexOf(Math.max(...est));
    expect(best).toBe(0);
  });
});

describe("logistic", () => {
  it("irlsFit recovers the true coefficients", () => {
    const rand = mulberry32(91);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const x1 = randn(rand);
      const x2 = randn(rand);
      const p = logistic(-0.5 + 1.5 * x1 - x2);
      X.push([1, x1, x2]);
      y.push(rand() < p ? 1 : 0);
    }
    const b = irlsFit(X, y, 0.5, 60);
    expect(Math.abs(b[1]! - 1.5)).toBeLessThan(0.25);
    expect(Math.abs(b[2]! + 1)).toBeLessThan(0.25);
  });
  it("stadiumFactorFit recenters to sum zero and finds the altitude effect", () => {
    const rand = mulberry32(92);
    const nStad = 4;
    const off: number[] = [];
    const def: number[] = [];
    const stad: number[] = [];
    const y: number[] = [];
    const trueS = [0.6, -0.2, -0.2, -0.2]; // stadium 0 boosts events
    for (let i = 0; i < 4000; i++) {
      const s = Math.floor(rand() * nStad);
      const z = trueS[s]! + randn(rand) * 0.3;
      stad.push(s); off.push(0); def.push(0);
      y.push(rand() < logistic(z) ? 1 : 0);
    }
    const sHat = stadiumFactorFit(off, def, stad, y, nStad, 2);
    const sum = sHat.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-6);
    expect(sHat[0]!).toBeGreaterThan(sHat[1]!);
  });
});
