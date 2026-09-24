import { describe, it, expect } from "vitest";
import {
  expectileLoss,
  expectileOf,
  distributionalTarget,
  meanConsistencyGap,
  consistencyGate,
  expectileGate,
} from "./1902-08102v2-expectile-critic.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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

describe("expectile critic", () => {
  it("expectile loss is asymmetric in the right direction", () => {
    // tau=0.1: overpredictions (e<0) penalized 9x more than underpredictions
    expect(expectileLoss([-2], 0.1)).toBeCloseTo(0.9 * 4, 10);
    expect(expectileLoss([2], 0.1)).toBeCloseTo(0.1 * 4, 10);
    expect(expectileLoss([-2], 0.1) / expectileLoss([2], 0.1)).toBeCloseTo(9, 8);
  });
  it("tau=0.5 expectile equals the mean", () => {
    const rand = mulberry32(41);
    const vals = Array.from({ length: 500 }, () => randn(rand) * 2 + 3);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(expectileOf(vals, 0.5)).toBeCloseTo(mean, 6);
  });
  it("tail expectiles bracket the mean on skewed data", () => {
    const vals = [1, 1, 1, 1, 1, 1, 1, 1, 1, 50]; // right-skewed
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(expectileOf(vals, 0.9)).toBeGreaterThan(mean);
    expect(expectileOf(vals, 0.1)).toBeLessThan(mean);
  });
  it("distributional target shifts atoms by r + gamma*z", () => {
    expect(distributionalTarget(2, [1, 2, 3], 0.9)).toEqual([2.9, 3.8, 4.7]);
  });
  it("consistency gate flags incoherent statistics", () => {
    expect(meanConsistencyGap(10, 10.2)).toBeCloseTo(0.2, 10);
    expect(consistencyGate(0.2, 0.5)).toBe("PASS");
    expect(consistencyGate(0.8, 0.5)).toBe("FLAG");
  });
  it("gate rejects on consistency failure regardless of ROI", () => {
    expect(expectileGate(0.8, 0.5, 5)).toBe("REJECT");
    expect(expectileGate(0.2, 0.5, 3)).toBe("ADAPT");
    expect(expectileGate(0.2, 0.5, 1)).toBe("REJECT");
  });
});
