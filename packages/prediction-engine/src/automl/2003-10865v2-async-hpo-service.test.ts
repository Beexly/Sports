import { describe, it, expect } from "vitest";
import {
  successiveHalving,
  bracketSampleProb,
  fantasizePending,
  asyncSpeedup,
  rbfKernelGp,
  gpPosterior1d,
  rffFeatures,
  krrFit,
  uncertaintyMetaLoss,
} from "./2003-10865v2-async-hpo-service.js";

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

describe("hpo", () => {
  it("successiveHalving keeps the best configs", () => {
    const losses = [
      [0.5, 0.3, 0.8, 0.2, 0.9, 0.4, 0.7, 0.1, 0.6],
      [0.45, 0.28, 0.75, 0.18, 0.85, 0.38],
    ];
    const alive = successiveHalving(losses, 3);
    expect(alive).toContain(7); // best config index 7 (loss 0.1)
    expect(alive.length).toBeLessThanOrEqual(3);
  });
  it("bracketSampleProb is a valid distribution favoring high fidelity", () => {
    let s = 0;
    for (let i = 0; i <= 4; i++) s += bracketSampleProb(i, 4);
    expect(s).toBeCloseTo(1, 10);
    expect(bracketSampleProb(4, 4)).toBeGreaterThan(bracketSampleProb(0, 4));
  });
  it("fantasizePending imputes surrogate means", () => {
    const out = fantasizePending([{ config: 0, loss: 0.5 }], [1, 2], (c) => c * 0.1);
    expect(out.length).toBe(3);
    expect(out[2]!.loss).toBeCloseTo(0.2, 10);
  });
});

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
