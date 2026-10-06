import { describe, it, expect } from "vitest";
import {
  nmse,
  hillClimbRefine,
  stagedRefine,
} from "./2401-00282v1-dgsr-lite-refinement.js";

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

describe("dgsr", () => {
  it("hillClimbRefine recovers quadratic coefficients", () => {
    const rand = mulberry32(361);
    const xs = Array.from({ length: 60 }, (_, i) => -3 + (6 * i) / 59);
    const ys = xs.map((x) => 2 * x * x - x + 1 + randn(rand) * 0.2);
    const loss = (p: number[]): number =>
      nmse(ys, xs.map((x) => p[0]! * x * x + p[1]! * x + p[2]!));
    const { params, loss: l } = hillClimbRefine(loss, [0, 0, 0], rand, 300, 0.3, 4);
    expect(l).toBeLessThan(0.05);
    expect(Math.abs(params[0]! - 2)).toBeLessThan(0.4);
  });
  it("nmse is 0 for perfect predictions", () => {
    expect(nmse([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(nmse([1, 2, 3], [2, 3, 4])).toBeGreaterThan(0);
  });
});
