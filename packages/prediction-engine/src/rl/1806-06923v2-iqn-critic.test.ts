import { describe, it, expect } from "vitest";
import {
  cosineTauEmbedding,
  quantileHuberLoss,
  iqnCvar,
  cvarGreedy,
  quantileECE,
  iqnGate,
} from "./1806-06923v2-iqn-critic.js";

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

describe("iqn critic", () => {
  it("cosine embedding has the right shape and unit-scale entries", () => {
    const E = cosineTauEmbedding([0.1, 0.5, 0.9], 8);
    expect(E.length).toBe(3);
    expect(E[0]!.length).toBe(8);
    for (const row of E) for (const v of row) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    // tau=0.5 -> cos(pi*j*0.5) alternates 0, -1, 0, 1, ...
    expect(E[1]![0]).toBeCloseTo(0, 10);
    expect(E[1]![1]).toBeCloseTo(-1, 10);
  });
  it("quantile Huber loss matches hand computation", () => {
    // e=1, tau=0.5, kappa=1: |0.5-0| * 0.5 / 1 = 0.25 ; e=-1: |0.5-1| * 0.5 = 0.25
    expect(quantileHuberLoss([1, -1], [0.5, 0.5], 1)).toBeCloseTo(0.25, 10);
  });
  it("quantile loss is asymmetric in tau", () => {
    const over = quantileHuberLoss([-2], [0.1], 1); // overprediction
    const under = quantileHuberLoss([2], [0.1], 1); // underprediction
    expect(over / under).toBeCloseTo(9, 8);
  });
  it("CVaR is below the mean and cvarGreedy is risk-averse", () => {
    const taus = [0.1, 0.3, 0.5, 0.7, 0.9];
    const safe = { taus, values: [9, 10, 10, 10, 11] };
    const risky = { taus, values: [0, 5, 10, 15, 20] };
    expect(iqnCvar(taus, safe.values, 0.3)).toBeLessThan(10);
    // same mean (10), CVaR prefers the safe action at alpha=0.3
    expect(cvarGreedy([safe, risky], 0.3)).toBe(0);
    // at alpha=1 CVaR = mean -> tie broken to first
    expect(iqnCvar(taus, risky.values, 1)).toBeCloseTo(10, 10);
  });
  it("ECE is ~0 for perfectly calibrated quantiles", () => {
    const rand = mulberry32(4);
    const taus = [0.1, 0.25, 0.5, 0.75, 0.9];
    const outcomes: number[] = [];
    const pred: number[][] = [];
    for (let i = 0; i < 2000; i++) {
      const u = rand();
      outcomes.push(u);
      pred.push(taus.map((t) => t)); // true quantiles of Uniform(0,1)
    }
    expect(quantileECE(taus, pred, outcomes)).toBeLessThan(0.02);
  });
  it("gate rejects miscalibrated tails regardless of ROI", () => {
    expect(iqnGate(5, 0.06)).toBe("REJECT");
    expect(iqnGate(3, 0.02)).toBe("ADAPT");
    expect(iqnGate(1, 0.02)).toBe("REJECT");
  });
});
