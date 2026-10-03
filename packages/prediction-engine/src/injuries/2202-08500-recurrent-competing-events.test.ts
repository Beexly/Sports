import { describe, it, expect } from "vitest";
import {
  truncateWeights,
  overlapCheck,
  ipwATE,
  ipwATT,
  smd,
  discreteGFormula,
} from "./2202-08500-recurrent-competing-events.js";

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

describe("ipw", () => {
  it("ipwATE recovers the true effect under ignorability", () => {
    const rand = mulberry32(241);
    const y: number[] = [];
    const t: number[] = [];
    const e: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const x = randn(rand);
      const pi = 1 / (1 + Math.exp(-x)); // propensity depends on x
      const ti = rand() < pi ? 1 : 0;
      y.push(2 * ti + x + randn(rand) * 0.5); // true ATE = 2
      t.push(ti);
      e.push(pi);
    }
    expect(Math.abs(ipwATE(y, t, e) - 2)).toBeLessThan(0.15);
  });
  it("smd is ~0 for balanced covariates, large for imbalanced", () => {
    const rand = mulberry32(242);
    const t = Array.from({ length: 500 }, (_, i) => (i % 2));
    const xBal = Array.from({ length: 500 }, () => randn(rand));
    const xImb = t.map((ti) => randn(rand) + ti * 2);
    expect(Math.abs(smd(xBal, t))).toBeLessThan(0.2);
    expect(Math.abs(smd(xImb, t))).toBeGreaterThan(1.0);
  });
  it("truncateWeights caps extremes", () => {
    expect(truncateWeights([0.01, 5, 100], 0.1, 10)).toEqual([0.1, 5, 10]);
  });
  it("discreteGFormula nests the naive contrast", () => {
    const { always, never } = discreteGFormula(10, 6, 4, 2);
    expect(always).toBe(10);
    expect(never).toBe(2);
    expect(always - never).toBe(8);
  });
});
