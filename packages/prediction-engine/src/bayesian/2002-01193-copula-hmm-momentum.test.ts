import { describe, it, expect } from "vitest";
import {
  hmmForwardLogLik,
  viterbi,
  hmmStationary,
  hamiltonFilter,
  normalCdf,
  normalQuantile,
  gaussCopulaSample,
  gaussCopulaJoint,
} from "./2002-01193-copula-hmm-momentum.js";

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

describe("hmm", () => {
  const gaussLog = (y: number, mu: number, sig: number): number => {
    const z = (y - mu) / sig;
    return -0.5 * z * z - Math.log(sig * 2.5066282746310002);
  };
  it("viterbi recovers planted regimes", () => {
    const rand = mulberry32(141);
    const T = 300;
    const states: number[] = [];
    let s = 0;
    const ys: number[] = [];
    for (let t = 0; t < T; t++) {
      if (rand() < 0.05) s = 1 - s;
      states.push(s);
      ys.push(s === 0 ? randn(rand) * 0.5 : 3 + randn(rand) * 0.5);
    }
    const logEmit = ys.map((y) => [gaussLog(y, 0, 0.5), gaussLog(y, 3, 0.5)]);
    const path = viterbi([0.5, 0.5], [[0.95, 0.05], [0.05, 0.95]], logEmit);
    const acc = path.filter((p, i) => p === states[i]).length / T;
    expect(acc).toBeGreaterThan(0.9);
  });
  it("forward loglik favors the true transition structure", () => {
    const gaussL = (y: number, mu: number): number => -0.5 * y * y - (y - mu) ** 2 * 0 + (-((y - mu) ** 2) / 2);
    void gaussL;
    const logEmit = [[-0.1, -3], [-0.2, -2.5], [-0.15, -2.8]];
    const ll1 = hmmForwardLogLik([0.9, 0.1], [[0.9, 0.1], [0.1, 0.9]], logEmit);
    const ll2 = hmmForwardLogLik([0.1, 0.9], [[0.9, 0.1], [0.1, 0.9]], logEmit);
    expect(ll1).toBeGreaterThan(ll2);
  });
  it("hamiltonFilter tracks a regime switch", () => {
    const rand = mulberry32(142);
    const ys = [...Array.from({ length: 100 }, () => randn(rand)), ...Array.from({ length: 100 }, () => 3 + randn(rand))];
    const f = hamiltonFilter(ys, [0, 3], [1, 1], 0.97, 0.97);
    const early = f.slice(80, 100).reduce((a, b) => a + b, 0) / 20;
    const late = f.slice(180, 200).reduce((a, b) => a + b, 0) / 20;
    expect(late).toBeGreaterThan(early + 0.5);
  });
  it("stationary distribution sums to 1", () => {
    const v = hmmStationary([[0.9, 0.1], [0.2, 0.8]]);
    expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    expect(v[0]!).toBeGreaterThan(v[1]!);
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
