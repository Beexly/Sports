import { describe, it, expect } from "vitest";
import {
  looGains,
  budescuChenWeights,
  assertiveness,
  shrinkTowardBase,
} from "./2008-13005-budescu-chen-aggregation.js";

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

describe("budescu", () => {
  it("budescu-chen weights concentrate on the helpful source", () => {
    const rand = mulberry32(211);
    const n = 600;
    const P: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const pt = 0.2 + 0.6 * rand();
      y.push(rand() < pt ? 1 : 0);
      P.push([
        Math.min(0.99, Math.max(0.01, pt + (rand() - 0.5) * 0.05)),
        0.5,
        rand(),
      ]);
    }
    const w = budescuChenWeights(looGains(P, y));
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]!).toBeGreaterThan(w[2]!);
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-9);
  });
  it("assertiveness is higher for extreme forecasts", () => {
    expect(assertiveness([0.9, 0.1, 0.85])).toBeGreaterThan(assertiveness([0.5, 0.55, 0.45]));
  });
  it("shrinkTowardBase pulls extremes inward", () => {
    const s = shrinkTowardBase([0.9, 0.1], 0.5, 0.5);
    expect(s[0]!).toBeCloseTo(0.7, 10);
    expect(s[1]!).toBeCloseTo(0.3, 10);
  });
});
