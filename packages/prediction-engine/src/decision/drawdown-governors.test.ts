// Tests for decision/drawdown-governors.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  alphaGovernorStake,
  epsilonMixtureStake,
  riskDollarBudget,
  lifetimeDrawdownStake,
  bayesianThrottleTrigger,
  throttledStake,
  xiScaledStake,
  worryDashboard,
  drawdownModulatedStake,
  blockBootstrapMaxDrawdown,
  archetypeReserve,
} from "./drawdown-governors.js";

describe("alphaGovernorStake (1206.2305)", () => {
  it("risks only the cushion: pi = 1 - alpha/d at the peak", () => {
    const { stake, atFloor } = alphaGovernorStake(100, 100, 0.7, 10);
    expect(atFloor).toBe(false);
    expect(stake).toBeCloseTo(10 * 0.3, 10);
  });
  it("goes to zero at the floor", () => {
    const { stake, atFloor } = alphaGovernorStake(70, 100, 0.7, 10);
    expect(stake).toBe(0);
    expect(atFloor).toBe(true);
  });
  it("handles degenerate input", () => {
    expect(alphaGovernorStake(0, 100, 0.7, 10).stake).toBe(0);
  });
});

describe("epsilonMixtureStake (1305.6831)", () => {
  it("splits stake and cash reserve", () => {
    const { stake, cashReservedFraction } = epsilonMixtureStake(10, 0.8);
    expect(stake).toBeCloseTo(8, 10);
    expect(cashReservedFraction).toBeCloseTo(0.2, 10);
  });
  it("clamps epsilon to [0, 1]", () => {
    expect(epsilonMixtureStake(10, 2).stake).toBeCloseTo(10, 10);
  });
});

describe("riskDollarBudget (1506.00166v2)", () => {
  it("auto-derisks to zero at the safe level", () => {
    const res = riskDollarBudget(100, 100, 0.1, 0.02, 1, [{ edge: 0.05, vol: 0.2 }]);
    expect(res.riskDollars).toBe(0);
    expect(res.derisked).toBe(true);
  });
  it("splits the budget proportionally to edge/vol^2", () => {
    // consumptionRate 5: R = 2*(5*120 - 0.02*120)/(0.1 - 0.02) > 0.
    const res = riskDollarBudget(120, 100, 0.1, 0.02, 5, [
      { edge: 0.08, vol: 0.2 },
      { edge: 0.02, vol: 0.2 },
    ]);
    expect(res.perPick[0]!).toBeGreaterThan(res.perPick[1]!);
    const sum = res.perPick.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(res.riskDollars, 8);
  });
});

describe("lifetimeDrawdownStake (1507.08713)", () => {
  it("freezes the max and stakes by distance-to-safety below S", () => {
    const res = lifetimeDrawdownStake(80, 100, 120, 0.05, 10);
    expect(res.maxFrozen).toBe(true);
    expect(res.nextMax).toBe(120);
    expect(res.stake).toBeCloseTo(Math.min((100 - 80) * 0.05, 10), 10);
  });
  it("ratchets normally above the safe level", () => {
    const res = lifetimeDrawdownStake(110, 100, 105, 0.05, 10);
    expect(res.maxFrozen).toBe(false);
    expect(res.nextMax).toBe(110);
  });
});

describe("bayesianThrottleTrigger (1609.00869)", () => {
  it("halves beyond the trigger and stops beyond 2x", () => {
    const depths = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3];
    const rois = [0.05, 0.04, 0.02, -0.02, -0.05, -0.08];
    const trig = bayesianThrottleTrigger(depths, rois, 3);
    expect(throttledStake(10, 0, trig)).toBe(10);
    expect(throttledStake(10, trig.triggerDepth, trig)).toBe(5);
    expect(throttledStake(10, trig.stopDepth, trig)).toBe(0);
    expect(throttledStake(10, trig.stopDepth + 0.01, trig)).toBe(0);
  });
  it("handles empty input", () => {
    const trig = bayesianThrottleTrigger([], [], 5);
    expect(trig.triggerDepth).toBe(0);
  });
});

describe("xiScaledStake (1610.08558)", () => {
  it("is full at the peak and zero at the barrier", () => {
    expect(xiScaledStake(100, 100, 0.8, 1, 10).stake).toBeCloseTo(10, 10);
    expect(xiScaledStake(80, 100, 0.8, 1, 10).stake).toBe(0);
    expect(xiScaledStake(79, 100, 0.8, 1, 10).stake).toBe(0);
  });
  it("steepens with high vol regime", () => {
    const calm = xiScaledStake(90, 100, 0.8, 0.5, 10).stake;
    const hot = xiScaledStake(90, 100, 0.8, 2, 10).stake;
    expect(calm).toBeGreaterThan(hot);
  });
  it("returns xi for logging", () => {
    expect(xiScaledStake(90, 100, 0.8, 1, 10).xi).toBeCloseTo(0.9, 10);
  });
});

describe("worryDashboard (1707.01457)", () => {
  it("is GREEN inside the median", () => {
    // SR = 1, vol = 0.1: depth median = 0.75*0.1 = 0.075 (half the 5%
    // tail 1.50/SR*vol), duration median = 1.07 (half the 5% tail
    // 2.14/SR^2). depth 0.005 < 0.075 and duration 1 < 1.07.
    expect(worryDashboard(0.005, 1, 1.0, 0.1)).toBe("GREEN");
  });
  it("is YELLOW beyond the median but inside the 5% tail", () => {
    // SR = 1, vol = 0.1: depth median 0.075, 5% tail 0.15.
    // depth 0.1 is beyond median and inside tail.
    expect(worryDashboard(0.1, 1, 1.0, 0.1)).toBe("YELLOW");
  });
  it("is RED beyond the 5% tail", () => {
    expect(worryDashboard(0.5, 100, 1.0, 0.1)).toBe("RED");
  });
});

describe("drawdownModulatedStake (1710.01503)", () => {
  it("scales by dmax at zero drawdown: M = (dmax - 0)/(1 - 0)", () => {
    // d = 0, dmax = 0.2 -> M = 0.2, stake = 10 * 0.2 = 2.
    expect(drawdownModulatedStake(100, 100, 0.2, 10)).toBeCloseTo(2, 10);
  });
  it("goes to zero at dmax and stays zero beyond", () => {
    expect(drawdownModulatedStake(80, 100, 0.2, 10)).toBe(0);
    expect(drawdownModulatedStake(70, 100, 0.2, 10)).toBe(0);
  });
  it("partially scales mid-drawdown: M = (dmax - d)/(1 - d)", () => {
    // d = 0.1, dmax = 0.2 -> M = 0.1/0.9
    expect(drawdownModulatedStake(90, 100, 0.2, 10)).toBeCloseTo(10 * (0.1 / 0.9), 10);
  });
});

describe("blockBootstrapMaxDrawdown (2608.00127)", () => {
  it("is 0 for a monotone-increasing P&L series", () => {
    const pnl = new Array(50).fill(1);
    expect(blockBootstrapMaxDrawdown(pnl, 20, 5, 0.9, 7)).toBe(0);
  });
  it("is positive for a volatile series", () => {
    const pnl = [5, -8, 5, -8, 5, -8, 5, -8, 5, -8, 5, -8];
    expect(blockBootstrapMaxDrawdown(pnl, 30, 3, 0.9, 7)).toBeGreaterThan(0);
  });
  it("is deterministic for a fixed seed", () => {
    const pnl = [2, -3, 1, -1, 4, -2];
    const a = blockBootstrapMaxDrawdown(pnl, 25, 4, 0.9, 99);
    const b = blockBootstrapMaxDrawdown(pnl, 25, 4, 0.9, 99);
    expect(a).toBe(b);
  });
  it("handles empty input", () => {
    expect(blockBootstrapMaxDrawdown([], 10, 5)).toBe(0);
  });
});

describe("archetypeReserve", () => {
  it("keys off the worst archetype", () => {
    expect(
      archetypeReserve([
        { archetype: "trend", p90MaxDrawdown: 0.12 },
        { archetype: "short-vol", p90MaxDrawdown: 0.25 },
      ]),
    ).toBe(0.25);
  });
  it("returns 0 for empty input", () => {
    expect(archetypeReserve([])).toBe(0);
  });
});
