/**
 * Vitest suite for arXiv:2507.12657v1 (Distributional Reinforcement Learning on Path-dependent Options).
 * Gate: ADOPT iff on 2023-2024 the RBF-quantile model's season-profit quantile ECE <=0.05 AND it beats the Monte Carlo baseline on CVaR_0.1 absolute error by >=10% relative.
 */
import { describe, it, expect } from "vitest";
import { rbfFeatures, predictQuantiles, probNegativeProfit, cvar } from "./2507-12657v1-distributional-reinforcement-learning-on-pathdependent";

describe("2507-12657v1 RBF-quantile season risk", () => {
  const m = {
    centers: [[100, 5, 10], [80, -10, 4]],
    bandwidth: 10,
    taus: [0.05, 0.25, 0.5, 0.75, 0.95],
    weights: [
      [-30, -45], [-15, -25], [0, -10], [15, 5], [30, 25],
    ],
  };
  it("reports P(profit<0) between 0 and 1, higher when behind", () => {
    const ahead = probNegativeProfit(m, [100, 5, 10]);
    const behind = probNegativeProfit(m, [80, -10, 4]);
    expect(ahead).toBeGreaterThanOrEqual(0);
    expect(ahead).toBeLessThanOrEqual(1);
    expect(behind).toBeGreaterThan(ahead);
  });
  it("CVaR is the tail mean and <= the median", () => {
    const q = predictQuantiles(m, [90, 0, 7]);
    expect(cvar(m, [90, 0, 7], 0.3)).toBeLessThanOrEqual(q[2] ?? 0);
    expect(() => cvar(m, [90, 0, 7], 0)).toThrow();
  });
  it("RBF features peak at their own center", () => {
    const f = rbfFeatures(m, [100, 5, 10]);
    expect(f[0]).toBeGreaterThan(f[1] ?? 0);
  });
});
