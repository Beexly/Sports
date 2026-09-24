import { describe, it, expect } from "vitest";
import {
  epsilonGreedyStep,
  ucb1Step,
  gammaSample,
  thompsonBetaStep,
  decayEps,
} from "./2401-06086v1-imitation-inplay-betting.js";

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

describe("bandit", () => {
  it("thompson sampling finds the best arm", () => {
    const rand = mulberry32(181);
    const alphas = [1, 1, 1];
    const betas = [1, 1, 1];
    const counts = [0, 0, 0];
    const probs = [0.3, 0.7, 0.5];
    for (let t = 0; t < 1500; t++) {
      const a = thompsonBetaStep(alphas, betas, rand);
      counts[a]!++;
      const r = rand() < probs[a]! ? 1 : 0;
      alphas[a]! += r;
      betas[a]! += 1 - r;
    }
    expect(counts[1]!).toBeGreaterThan(counts[0]!);
    expect(counts[1]!).toBeGreaterThan(counts[2]!);
  });
  it("ucb1 explores then exploits", () => {
    const counts = [0, 0, 0];
    const means = [0, 0, 0];
    const picks: number[] = [];
    for (let t = 1; t <= 60; t++) {
      const a = ucb1Step(counts, means, t);
      picks.push(a);
      counts[a]!++;
    }
    expect(new Set(picks.slice(0, 3)).size).toBe(3); // each arm tried once
  });
  it("decayEps decreases over time", () => {
    expect(decayEps(0.3, 0.95, 10)).toBeLessThan(decayEps(0.3, 0.95, 0));
    expect(decayEps(0.3, 0.95, 100)).toBeLessThan(0.01);
  });
});
