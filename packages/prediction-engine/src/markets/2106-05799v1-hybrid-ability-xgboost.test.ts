import { describe, it, expect } from "vitest";
import {
  solveLinear,
  ridgeFit,
  ridgePredict,
  arxFit,
  adjustedPlusMinus,
  normalCdf,
  normalQuantile,
  gaussCopulaSample,
  gaussCopulaJoint,
  negBinPmf,
  negBinMoments,
  zinbPmf,
  negBinLogLik,
} from "./2106-05799v1-hybrid-ability-xgboost.js";

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

describe("copula", () => {
  it("normalQuantile inverts normalCdf", () => {
    for (const p of [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 4);
    }
  });
  it("gaussian copula samples are uniform with target rank correlation", () => {
    const rand = mulberry32(71);
    const randnFn = (): number => {
      let u = 0;
      while (u === 0) u = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };
    const n = 5000;
    const u1: number[] = [];
    const u2: number[] = [];
    for (let i = 0; i < n; i++) {
      const [a, b] = gaussCopulaSample(rand, 0.6, randnFn);
      u1.push(a); u2.push(b);
    }
    const m1 = u1.reduce((a, b) => a + b, 0) / n;
    expect(Math.abs(m1 - 0.5)).toBeLessThan(0.02);
    // rank correlation via pearson on normal scores
    const z1 = u1.map(normalQuantile);
    const z2 = u2.map(normalQuantile);
    const mz = z1.reduce((a, b) => a + b, 0) / n;
    const cov = z1.reduce((a, b, i) => a + (b - mz) * (z2[i]! - mz), 0) / n;
    expect(Math.abs(cov - 0.6)).toBeLessThan(0.05);
  });
  it("copula joint nests independence at rho=0", () => {
    expect(gaussCopulaJoint(0.5, 0.5, 0)).toBeCloseTo(0.25, 2);
    expect(gaussCopulaJoint(0.5, 0.5, 0.9)).toBeGreaterThan(0.25);
  });
});

describe("negbin", () => {
  it("moments fit recovers overdispersed parameters", () => {
    const rand = mulberry32(41);
    // gamma-Poisson mixture = NB
    const ks = Array.from({ length: 4000 }, () => {
      const lam = -Math.log(1 - rand()) * 2; // exponential mixing
      let k = 0;
      let pp = 1;
      const L = Math.exp(-lam);
      do { k++; pp *= rand(); } while (pp > L);
      return k - 1;
    });
    const { r, p } = negBinMoments(ks);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(8);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
  it("ZINB puts extra mass at zero vs NB", () => {
    expect(zinbPmf(0, 0.3, 5, 0.5)).toBeGreaterThan(negBinPmf(0, 5, 0.5));
    let s = 0;
    for (let k = 0; k <= 60; k++) s += zinbPmf(k, 0.2, 5, 0.5);
    expect(s).toBeCloseTo(1, 4);
  });
});
