import { describe, it, expect } from "vitest";
import {
  kairosisTimeWeights,
  recentChangeProb,
  inverseCovIntersection,
} from "./2408-00785v4-kairosis-forecast-aggregation.js";

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

describe("kairosis", () => {
  it("time weights grow with history and decay pre-change mass", () => {
    const losses = [[0.2, 0.3, 0.25, 0.8, 0.85], [0.5, 0.5, 0.5, 0.5, 0.5]];
    const W = kairosisTimeWeights(losses, 0.1);
    expect(W[0]![4]!).toBeGreaterThan(W[0]![0]!);
  });
  it("inverse-covariance intersection downweights noisy sources", () => {
    const fused = inverseCovIntersection([0.6, 0.4], [[0.01, 0], [0, 1]]);
    expect(fused).toBeGreaterThan(0.5); // trusts the precise source
    expect(fused).toBeLessThan(0.6);
  });
  it("recentChangeProb detects a late break", () => {
    const stats = [...new Array<number>(50).fill(0.1), ...new Array<number>(10).fill(3)];
    expect(recentChangeProb(stats, 10, 1)).toBeGreaterThan(0.5);
    expect(recentChangeProb(stats, 50, 5)).toBeLessThan(0.5);
  });
});
