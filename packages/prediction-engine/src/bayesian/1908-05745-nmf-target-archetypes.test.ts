import { describe, it, expect } from "vitest";
import {
  nmfFrobenius,
  nmfArchetypeAssign,
  adjustedRandIndex,
} from "./1908-05745-nmf-target-archetypes.js";

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

describe("nmf", () => {
  it("reconstruction error decreases with iterations", () => {
    const rand = mulberry32(341);
    const V = Array.from({ length: 20 }, () => Array.from({ length: 15 }, () => rand() * 5));
    const { err, W, H } = nmfFrobenius(V, 3, 60, rand);
    expect(err[err.length - 1]!).toBeLessThan(err[0]!);
    expect(W.every((row) => row.every((v) => v >= 0))).toBe(true);
    expect(H.every((row) => row.every((v) => v >= 0))).toBe(true);
  });
  it("archetype assignment recovers planted structure", () => {
    const H = [[0.9, 0.8, 0.1, 0.05], [0.1, 0.2, 0.9, 0.95]];
    expect(nmfArchetypeAssign(H)).toEqual([0, 0, 1, 1]);
  });
  it("ARI is 1 for identical clusterings", () => {
    expect(adjustedRandIndex([0, 0, 1, 1], [0, 0, 1, 1])).toBeCloseTo(1, 8);
    expect(adjustedRandIndex([0, 0, 1, 1], [0, 1, 0, 1])).toBeLessThan(0.5);
  });
});
