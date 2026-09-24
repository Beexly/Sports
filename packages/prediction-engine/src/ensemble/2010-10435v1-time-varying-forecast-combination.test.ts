import { describe, it, expect } from "vitest";
import {
  ewaUpdate,
  boaUpdate,
  simplexProject,
  smoothWeights,
  scadPenalty,
  scadThreshold,
  scadFit,
} from "./2010-10435v1-time-varying-forecast-combination.js";

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

describe("scad", () => {
  it("scad is unbiased for large coefficients, sparse for small", () => {
    expect(scadThreshold(10, 1)).toBeCloseTo(10, 10); // no shrinkage past a*lambda
    expect(scadThreshold(0.5, 1)).toBe(0);
    expect(scadPenalty(0.5, 1)).toBeCloseTo(0.5, 10);
  });
  it("scadFit recovers sparse signals without lasso bias on large coefs", () => {
    const rand = mulberry32(121);
    const n = 400;
    const p = 15;
    const truth = new Array<number>(p).fill(0);
    truth[1] = 4; truth[9] = -3;
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const row = Array.from({ length: p }, () => randn(rand));
      X.push(row);
      y.push(row.reduce((s, x, j) => s + x * truth[j]!, 0) + randn(rand) * 0.5);
    }
    for (let j = 0; j < p; j++) {
      const m = X.reduce((a, r) => a + r[j]!, 0) / n;
      for (let i = 0; i < n; i++) X[i]![j]! -= m;
    }
    const my = y.reduce((a, b) => a + b, 0) / n;
    const yc = y.map((v) => v - my);
    const beta = scadFit(X, yc, 1.5, 3.7, 120);
    expect(Math.abs(beta[1]! - 4)).toBeLessThan(0.5);
    expect(Math.abs(beta[9]! + 3)).toBeLessThan(0.5);
    const noiseMax = Math.max(...beta.map((b, j) => (j === 1 || j === 9 ? 0 : Math.abs(b))));
    expect(noiseMax).toBeLessThan(0.6);
  });
});
