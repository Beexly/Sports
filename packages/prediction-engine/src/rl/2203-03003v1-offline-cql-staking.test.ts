import { describe, it, expect } from "vitest";
import {
  cqlPenalty,
  bellmanMse,
  opeSelfNormalized,
  ess,
  doublyRobust,
  lowerBoundDiagnostic,
} from "./2203-03003v1-offline-cql-staking.js";

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

describe("cql", () => {
  it("cqlPenalty is positive when OOD actions look better than data actions", () => {
    expect(cqlPenalty([1, 1, 1], [5, 5, 5], 1)).toBeGreaterThan(0);
    expect(cqlPenalty([5, 5, 5], [1, 1, 1], 1)).toBeLessThan(0);
  });
  it("ess is n for uniform weights, small for degenerate", () => {
    expect(ess([1, 1, 1, 1])).toBeCloseTo(4, 8);
    expect(ess([100, 0.01, 0.01, 0.01])).toBeLessThan(1.5);
  });
  it("self-normalized OPE recovers the target-policy value", () => {
    const rand = mulberry32(221);
    const n = 5000;
    const rewards: number[] = [];
    const weights: number[] = [];
    // behavior: 50/50; target: always action 1 (reward 1 w.p. 0.7)
    for (let i = 0; i < n; i++) {
      const a = rand() < 0.5 ? 1 : 0;
      const r = a === 1 ? (rand() < 0.7 ? 1 : 0) : rand() < 0.4 ? 1 : 0;
      rewards.push(r);
      weights.push(a === 1 ? 2 : 0); // pi_target/pi_behavior
    }
    expect(Math.abs(opeSelfNormalized(rewards, weights) - 0.7)).toBeLessThan(0.05);
  });
  it("doublyRobust matches IS when the model is correct", () => {
    const rewards = [1, 0, 1, 1, 0];
    const weights = [2, 0, 2, 2, 0];
    const qModel = [0.7, 0.7, 0.7, 0.7, 0.7];
    const qBehavior = [0.55, 0.55, 0.55, 0.55, 0.55];
    const dr = doublyRobust(rewards, weights, qModel, qBehavior);
    const is = opeSelfNormalized(rewards, weights);
    expect(Math.abs(dr - is)).toBeLessThan(0.2);
  });
  it("lowerBoundDiagnostic counts conservative weeks", () => {
    expect(lowerBoundDiagnostic([1, 2, 3], [2, 3, 4])).toBe(1);
    expect(lowerBoundDiagnostic([5, 2, 3], [2, 3, 4])).toBeCloseTo(2 / 3, 10);
  });
});
