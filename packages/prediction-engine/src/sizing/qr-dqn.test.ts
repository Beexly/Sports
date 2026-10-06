import { describe, expect, it } from "vitest";
import {
  cqlPenalty,
  cvarStake,
  greedyStake,
  interQuantileRange,
  qrLoss,
  quantileHuberLoss,
  STAKE_ACTIONS,
} from "./qr-dqn";

describe("qr-dqn", () => {
  it("quantileHuberLoss is 0 at δ=0 and asymmetric in τ", () => {
    expect(quantileHuberLoss(0, 0.5)).toBe(0);
    // ρ_τ(u) = |τ − 1{u<0}|·Huber(u): positive errors cost more at high τ
    expect(quantileHuberLoss(2, 0.9)).toBeGreaterThan(quantileHuberLoss(2, 0.1));
    expect(quantileHuberLoss(-2, 0.1)).toBeGreaterThan(quantileHuberLoss(-2, 0.9));
    expect(() => quantileHuberLoss(1, 0)).toThrow("τ");
  });

  it("qrLoss is minimized when prediction matches target", () => {
    const q = [0.1, 0.2, 0.3, 0.4, 0.5];
    const bad = [1.1, 1.2, 1.3, 1.4, 1.5];
    // cross-quantile pairs carry nonzero TD error even at the fixed point,
    // so the loss is small but not zero; it must beat a misprediction
    expect(qrLoss(q, q, 0, 1)).toBeLessThan(0.05);
    expect(qrLoss(q, q, 0, 1)).toBeLessThan(qrLoss(q, bad, 0, 1));
    expect(() => qrLoss([1], [1, 2], 0, 1)).toThrow("mismatch");
  });

  it("cqlPenalty is ≥ 0 and punishes overestimated untaken actions", () => {
    const means = [0.1, 0.5, 2.0]; // action 2 overestimated, not taken
    const pen = cqlPenalty(means, 0);
    expect(pen).toBeGreaterThan(0);
    expect(cqlPenalty([0.5, 0.5, 0.5], 1)).toBeCloseTo(Math.log(3), 10);
    expect(() => cqlPenalty([1], 5)).toThrow();
  });

  it("greedyStake picks the highest-mean action", () => {
    const per = [
      [0, 0, 0],
      [0.1, 0.1, 0.1],
      [0.5, 0.5, 0.5],
      [-1, -1, -1],
      [0.2, 0.2, 0.2],
    ];
    expect(greedyStake(per)).toBe(STAKE_ACTIONS[2]);
  });

  it("cvarStake is more conservative than greedy under left-tail risk", () => {
    const per = [
      [0, 0, 0, 0],
      [0.3, 0.3, 0.3, 0.3], // safe
      [-2, 1.2, 1.2, 1.2], // higher mean (0.4), fat left tail
    ];
    expect(greedyStake(per)).toBe(STAKE_ACTIONS[2]);
    expect(cvarStake(per, 0.25)).toBe(STAKE_ACTIONS[1]); // CVaR avoids the tail
    expect(() => cvarStake(per, 0)).toThrow();
  });

  it("interQuantileRange measures spread", () => {
    expect(interQuantileRange([1, 2, 3, 4, 5])).toBeGreaterThan(0);
    expect(interQuantileRange([2, 2, 2])).toBe(0);
    expect(interQuantileRange([])).toBe(0);
  });
});
