// Tests for decision/stake-damping.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  epsilonDampedStake,
  selectDampingEpsilon,
  stopLossScaledStake,
  selectAdaptiveGamma,
  lambdaShrunkStakes,
  normalCdf,
  deltaSigmaStake,
  uncertaintyHaircut,
} from "./stake-damping.js";

describe("epsilonDampedStake (1009.3753)", () => {
  it("interpolates between previous and target stake", () => {
    expect(epsilonDampedStake(0.1, 0.3, 0.5)).toBeCloseTo(0.2, 12);
  });
  it("epsilon = 1 is full rebalancing, 0 freezes", () => {
    expect(epsilonDampedStake(0.1, 0.3, 1)).toBeCloseTo(0.3, 12);
    expect(epsilonDampedStake(0.1, 0.3, 0)).toBeCloseTo(0.1, 12);
  });
  it("clamps epsilon to [0, 1]", () => {
    expect(epsilonDampedStake(0.1, 0.3, 2)).toBeCloseTo(0.3, 12);
    expect(epsilonDampedStake(0.1, 0.3, -1)).toBeCloseTo(0.1, 12);
  });
});

describe("selectDampingEpsilon", () => {
  it("picks the argmax net log growth", () => {
    const e = selectDampingEpsilon([
      { epsilon: 1, netLogGrowth: 0.05 },
      { epsilon: 0.4, netLogGrowth: 0.09 },
      { epsilon: 0.2, netLogGrowth: 0.07 },
    ]);
    expect(e).toBe(0.4);
  });
  it("returns 1 (no damping) for empty input", () => {
    expect(selectDampingEpsilon([])).toBe(1);
  });
});

describe("stopLossScaledStake (1311.2550v2)", () => {
  it("scales linearly with the 1 - z asymptote", () => {
    // stop 70 on bankroll 100 -> z = 0.7 -> u = 0.3
    expect(
      stopLossScaledStake({ bankroll: 100, stopLevel: 70, daysToReset: 10, tau: 5, kellyStake: 2 }),
    ).toBeCloseTo(0.6, 10);
  });
  it("sits out (freezes) below the threshold instead of dripping", () => {
    const s = stopLossScaledStake({
      bankroll: 100, stopLevel: 99, daysToReset: 10, tau: 5,
      kellyStake: 2, sitOutThreshold: 0.05,
    });
    expect(s).toBe(0);
  });
  it("returns full stake far from the stop", () => {
    expect(
      stopLossScaledStake({ bankroll: 100, stopLevel: 0, daysToReset: 10, tau: 5, kellyStake: 2 }),
    ).toBeCloseTo(2, 10);
  });
  it("handles degenerate input", () => {
    expect(
      stopLossScaledStake({ bankroll: 0, stopLevel: 70, daysToReset: 10, tau: 5, kellyStake: 2 }),
    ).toBe(0);
  });
});

describe("selectAdaptiveGamma (2503.17927)", () => {
  it("refits gamma to the trailing Sharpe argmax", () => {
    expect(
      selectAdaptiveGamma([
        { gamma: 0, trailingSharpe: 0.8 },
        { gamma: 1, trailingSharpe: 1.2 },
        { gamma: 2, trailingSharpe: 1.0 },
      ]),
    ).toBe(1);
  });
  it("defaults to 0.5 for empty input", () => {
    expect(selectAdaptiveGamma([])).toBe(0.5);
  });
});

describe("lambdaShrunkStakes (2603.26620)", () => {
  it("shrinks simultaneous singles and drops inactive legs", () => {
    const { stakes, activeLegs } = lambdaShrunkStakes([0.2, -0.1, 0.3], [1, 1, 2]);
    expect(activeLegs).toEqual([true, false, true]);
    expect(stakes[1]).toBe(0);
    expect(stakes[0]).toBeCloseTo(0.2 * (1 - 1 * 0.04), 10);
    expect(stakes[0]).toBeLessThan(0.2);
    expect(stakes[2]).toBeLessThan(0.3);
  });
  it("floors at zero for extreme lambda", () => {
    const { stakes } = lambdaShrunkStakes([0.5], [100]);
    expect(stakes[0]).toBe(0);
  });
});

describe("normalCdf", () => {
  it("matches known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 4);
  });
});

describe("deltaSigmaStake (2312.10331)", () => {
  it("returns 0 when the edge is inside the 1.5-sigma gate", () => {
    expect(deltaSigmaStake(0.2, 0.1, 0.1)).toBe(0); // 0.1 < 0.15
  });
  it("scales by Phi(delta/sigma) outside the gate", () => {
    const s = deltaSigmaStake(0.2, 0.3, 0.1);
    expect(s).toBeCloseTo(0.2 * normalCdf(3), 10);
    expect(s).toBeLessThan(0.2);
  });
  it("handles degenerate input", () => {
    expect(deltaSigmaStake(0.2, 0.3, 0)).toBe(0);
    expect(deltaSigmaStake(0, 0.3, 0.1)).toBe(0);
  });
});

describe("uncertaintyHaircut (2604.25280v1)", () => {
  it("is strictly between 0 and 1 when the interval excludes the market", () => {
    // pHat 0.6, market 0.5, bar 0.02: interval [0.58, 0.62] excludes 0.5
    const h = uncertaintyHaircut(0.6, 0.5, 0.02);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
    expect(h).toBeCloseTo(0.6384, 3);
  });
  it("approaches 1 as the interval moves far from the market", () => {
    expect(uncertaintyHaircut(0.6, 0.5, 0.001)).toBeGreaterThan(0.97);
  });
  it("is 0 when the uncertainty interval contains the market prob", () => {
    // bar reaches the market prob
    expect(uncertaintyHaircut(0.6, 0.5, 0.15)).toBeCloseTo(0, 10);
  });
  it("is 0 with no edge", () => {
    expect(uncertaintyHaircut(0.5, 0.5, 0.01)).toBe(0);
  });
});
