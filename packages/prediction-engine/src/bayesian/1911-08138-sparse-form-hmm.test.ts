import { describe, it, expect } from "vitest";
import {
  hmmForwardLogLik,
  viterbi,
  hmmStationary,
  hamiltonFilter,
  softThreshold,
  lassoCoordDescent,
  bicScore,
  lassoBicSelect,
} from "./1911-08138-sparse-form-hmm.js";

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

describe("lasso", () => {
  it("lasso selects the true sparse support", () => {
    const rand = mulberry32(101);
    const n = 400;
    const p = 20;
    const truth = new Array<number>(p).fill(0);
    truth[2] = 3; truth[7] = -2; truth[15] = 1.5;
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const row = Array.from({ length: p }, () => randn(rand));
      X.push(row);
      y.push(row.reduce((s, x, j) => s + x * truth[j]!, 0) + randn(rand) * 0.5);
    }
    // standardize
    for (let j = 0; j < p; j++) {
      const m = X.reduce((a, r) => a + r[j]!, 0) / n;
      for (let i = 0; i < n; i++) X[i]![j]! -= m;
    }
    const my = y.reduce((a, b) => a + b, 0) / n;
    const yc = y.map((v) => v - my);
    const lambdas = Array.from({ length: 30 }, (_, i) => Math.exp(Math.log(200) - (i * (Math.log(200) - Math.log(0.5))) / 29));
    const { beta } = lassoBicSelect(X, yc, lambdas);
    const support = beta.map((b, j) => (Math.abs(b) > 1e-8 ? j : -1)).filter((j) => j >= 0);
    expect(support).toContain(2);
    expect(support).toContain(7);
    expect(support.length).toBeLessThanOrEqual(6);
  });
  it("softThreshold kills small values", () => {
    expect(softThreshold(0.5, 1)).toBe(0);
    expect(softThreshold(2, 1)).toBe(1);
    expect(softThreshold(-2, 1)).toBe(-1);
  });
});
