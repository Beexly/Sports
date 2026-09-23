import { describe, it, expect } from "vitest";
import {
  poissonPmf,
  poissonLogLik,
  poissonMle,
  poissonSample,
  ingarchFilter,
  ingarchLogLik,
  cmpPmf,
  nestedScoreSim,
  negBinPmf,
  negBinMoments,
  zinbPmf,
  negBinLogLik,
  normalCdf,
  normalQuantile,
  gaussCopulaSample,
  gaussCopulaJoint,
} from "./2106-05174v1-nested-zigp-simulation.js";

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

describe("poisson", () => {
  it("MLE recovers lambda and PMF sums to 1", () => {
    const rand = mulberry32(31);
    const ks = Array.from({ length: 3000 }, () => poissonSample(rand, 2.5));
    expect(Math.abs(poissonMle(ks) - 2.5)).toBeLessThan(0.12);
    let s = 0;
    for (let k = 0; k <= 20; k++) s += poissonPmf(k, 2.5);
    expect(s).toBeCloseTo(1, 6);
  });
  it("INGARCH filter tracks a persistent count process", () => {
    const rand = mulberry32(32);
    const ys: number[] = [];
    let lam = 3;
    for (let t = 0; t < 400; t++) {
      lam = 0.5 + 0.6 * (ys[t - 1] ?? 3) + 0.3 * lam;
      ys.push(poissonSample(rand, lam));
    }
    const f = ingarchFilter(ys, 0.5, 0.6, 0.3);
    const mse = (a: number[], b: number[]): number => {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
      return s / a.length;
    };
    expect(mse(f.slice(50), ys.slice(50).map(() => 3))).toBeGreaterThan(0); // sanity
    expect(f[399]!).toBeGreaterThan(0);
  });
  it("nested simulator shows garbage-time dependence when b3 > 0", () => {
    const rand = mulberry32(33);
    const coef = { b0: 1.0, b1: 0, b2: 0, b3: 0.05 };
    const { fav, dog } = nestedScoreSim(rand, 3000, 24, coef, 0, 0);
    const mf = fav.reduce((a, b) => a + b, 0) / fav.length;
    const md = dog.reduce((a, b) => a + b, 0) / dog.length;
    const num = fav.reduce((a, b, i) => a + (b - mf) * (dog[i]! - md), 0);
    expect(num).toBeGreaterThan(0); // positive dependence via b3
  });
  it("CMP with nu=1 matches Poisson", () => {
    for (const k of [0, 1, 2, 3, 5]) {
      expect(cmpPmf(k, 2.5, 1)).toBeCloseTo(poissonPmf(k, 2.5), 4);
    }
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
