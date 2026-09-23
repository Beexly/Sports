import { describe, it, expect } from "vitest";
import {
  rbfKernelGp,
  gpPosterior1d,
  rffFeatures,
  krrFit,
  uncertaintyMetaLoss,
  ewaUpdate,
  boaUpdate,
  simplexProject,
  smoothWeights,
} from "./2208-08135v1-uncertainty-weighted-metalearning.js";

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

describe("gp", () => {
  it("gpPosterior1d interpolates training points with small variance", () => {
    const X = [0, 1, 2, 3];
    const y = [0, 1, 0, 1];
    const { mean, variance } = gpPosterior1d(X, y, 1.0, 1.0, 1.0, 0.01);
    expect(Math.abs(mean - 1)).toBeLessThan(0.05);
    expect(variance).toBeLessThan(0.05);
    const far = gpPosterior1d(X, y, 10, 1.0, 1.0, 0.01);
    expect(far.variance).toBeGreaterThan(variance);
  });
  it("rffFeatures + krrFit approximates a nonlinear function", () => {
    const rand = mulberry32(381);
    const X = Array.from({ length: 120 }, () => [rand() * 4 - 2]);
    const y = X.map(([x]) => Math.sin(x!) + randnGp(rand) * 0.1);
    const { Phi } = rffFeatures(X, 200, 0.5, rand);
    const beta = krrFit(Phi, y, 0.1);
    const pred = Phi.map((phi) => phi.reduce((s, v, j) => s + v * beta[j]!, 0));
    const mse = pred.reduce((s, p, i) => s + (p - y[i]!) ** 2, 0) / y.length;
    expect(mse).toBeLessThan(0.15);
  });
  it("uncertaintyMetaLoss downweights high-sigma tasks", () => {
    const l1 = uncertaintyMetaLoss([1, 1], [0.1, 10]);
    const l2 = uncertaintyMetaLoss([1, 1], [0.1, 0.1]);
    expect(l1).toBeLessThan(l2);
  });
});

function randnGp(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("ewa", () => {
  it("ewa concentrates on the best expert", () => {
    const rand = mulberry32(171);
    let w = [0.25, 0.25, 0.25, 0.25];
    const V = [0, 0, 0, 0];
    for (let t = 0; t < 300; t++) {
      const losses = [0.5 + randn(rand) * 0.1, 0.4 + randn(rand) * 0.1, 0.1 + randn(rand) * 0.1, 0.6 + randn(rand) * 0.1];
      w = ewaUpdate(w, losses, 2.0);
    }
    expect(w[2]!).toBeGreaterThan(0.9);
  });
  it("boaUpdate keeps weights on the simplex and tracks", () => {
    let w = [0.5, 0.5];
    let V = [0, 0];
    for (let t = 0; t < 100; t++) {
      const r = boaUpdate(w, [0.2, 0.8], V, 1.0);
      w = r.w; V = r.V;
    }
    expect(w[0]! + w[1]!).toBeCloseTo(1, 8);
    expect(w[0]!).toBeGreaterThan(w[1]!);
  });
  it("simplexProject projects onto the simplex", () => {
    const p = simplexProject([0.5, 0.5, 0.5]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p.every((x) => x >= 0)).toBe(true);
  });
  it("smoothWeights dampens spikes", () => {
    const s = smoothWeights([0.1, 0.9, 0.1, 0.1], 2);
    expect(s[1]!).toBeLessThan(0.9);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });
});
