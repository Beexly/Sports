import { describe, it, expect } from "vitest";
import {
  softThreshold,
  lassoCoordDescent,
  bicScore,
  lassoBicSelect,
} from "./2212-11041v1-future-value-models.js";

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
