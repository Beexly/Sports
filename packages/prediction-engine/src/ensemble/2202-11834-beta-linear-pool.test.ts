import { describe, it, expect } from "vitest";
import {
  regIncBeta,
  blpApply,
  blpFit,
  pitValues,
} from "./2202-11834-beta-linear-pool.js";

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

describe("blp", () => {
  it("blpApply is the identity at (1,1) and monotone", () => {
    expect(blpApply(0.3, 1, 1)).toBeCloseTo(0.3, 2);
    expect(blpApply(0.7, 1, 1)).toBeCloseTo(0.7, 2);
    expect(blpApply(0.7, 2, 2)).toBeGreaterThan(blpApply(0.3, 2, 2));
  });
  it("blpFit corrects a systematically overconfident forecaster", () => {
    const rand = mulberry32(201);
    const ps: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const pt = 0.2 + 0.6 * rand();
      const p = pt < 0.5 ? pt * 0.7 : 1 - (1 - pt) * 0.7; // overconfident
      ys.push(rand() < pt ? 1 : 0);
      ps.push(p);
    }
    const grid = [0.5, 0.8, 1, 1.5, 2, 3];
    const { alpha, beta, score } = blpFit(ps, ys, grid);
    expect(alpha).toBeLessThan(1);
    expect(beta).toBeLessThan(1); // inverse-S correction pulls extremes back toward 0.5
    const base = ps.reduce((s, p, i) => s + (ys[i] === 1 ? Math.log(p) : Math.log(1 - p)), 0) / ps.length;
    expect(score).toBeGreaterThan(base);
  });
});
