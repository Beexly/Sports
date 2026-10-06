import { describe, it, expect } from "vitest";
import {
  temperatureSoftmax,
  softCrossEntropy,
  distillLoss,
  regimeOODScore,
} from "./2006-04551v4-mimic-model-tree.js";

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

describe("distill", () => {
  it("soft targets carry dark knowledge: student matches teacher ranking", () => {
    const teacher = [0.7, 0.2, 0.1];
    const student = temperatureSoftmax([2.0, 0.5, -0.5], 2.0);
    const ce = softCrossEntropy(student, teacher);
    const uniform = softCrossEntropy([1 / 3, 1 / 3, 1 / 3], teacher);
    expect(ce).toBeLessThan(uniform);
  });
  it("distillLoss blends soft and hard terms", () => {
    const l = distillLoss([2, 0.5, -0.5], [0.7, 0.2, 0.1], 0, 2.0, 0.5);
    expect(l).toBeGreaterThan(0);
    expect(Number.isFinite(l)).toBe(true);
  });
  it("regimeOODScore is ~0 in-distribution, high out-of-distribution", () => {
    const rand = mulberry32(291);
    const pool = Array.from({ length: 200 }, () => [randn(rand), randn(rand)]);
    const inD = regimeOODScore([0.1, -0.1], pool, 1.0);
    const ood = regimeOODScore([10, 10], pool, 1.0);
    expect(ood).toBeGreaterThan(inD + 0.3);
  });
});
