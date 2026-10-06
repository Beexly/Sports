import { describe, it, expect } from "vitest";
import {
  stratifiedATT,
  permutationP,
  rosenbaumGammaBound,
  maxAbsSmd,
} from "./2009-06750-icing-causal-dag.js";

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

describe("matching", () => {
  it("stratifiedATT recovers the effect with exact matching", () => {
    const rand = mulberry32(251);
    const y: number[] = [];
    const t: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const stratum = Math.floor(rand() * 5);
      const ti = rand() < 0.5 ? 1 : 0;
      y.push(stratum * 2 + 1.5 * ti + randn(rand));
      t.push(ti);
      s.push(stratum);
    }
    expect(Math.abs(stratifiedATT(y, t, s) - 1.5)).toBeLessThan(0.15);
  });
  it("permutationP is small under a real effect", () => {
    const rand = mulberry32(252);
    const y: number[] = [];
    const t: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < 400; i++) {
      const ti = i % 2;
      y.push(ti * 2 + randn(rand));
      t.push(ti);
      s.push(0);
    }
    expect(permutationP(y, t, s, rand, 200)).toBeLessThan(0.05);
  });
  it("rosenbaum bound grows with Gamma", () => {
    const diffs = [1, 2, 1.5, 0.5, 2.5, 1.2, 0.8, 1.1];
    expect(rosenbaumGammaBound(diffs, 2)).toBeGreaterThan(rosenbaumGammaBound(diffs, 1));
  });
});
