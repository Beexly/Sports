import { describe, it, expect } from "vitest";
import {
  trailingCvar,
  edgeVolatility,
  dynamicRiskBudget,
  fractionalKellyStake,
} from "@/lib/calibration/dynamic-risk-budget";

// ============================================================
// arXiv 2406.02141 — dynamic risk budgeting. Additive only.
// ============================================================

const params = {
  baseBudget: 10,
  cvarTarget: 0.5,
  volTarget: 0.2,
};

describe("dynamic risk budget — 2406.02141", () => {
  it("trailingCvar takes the worst quartile", () => {
    expect(trailingCvar([1, 2, 3, 4], 0.25)).toBeCloseTo(1, 10);
    expect(trailingCvar([], 0.25)).toBe(0);
  });

  it("edgeVolatility is the sample stdev", () => {
    expect(edgeVolatility([0.1, 0.3])).toBeCloseTo(Math.sqrt(0.02), 10);
    expect(edgeVolatility([0.2])).toBe(0);
  });

  it("budget expands when CVaR beats target", () => {
    const good = dynamicRiskBudget([2, 2, 2, 2], [0.2, 0.2], params);
    expect(good).toBeGreaterThan(params.baseBudget);
  });

  it("budget contracts when CVaR misses target", () => {
    const bad = dynamicRiskBudget([-2, -2, -2, -2], [0.2, 0.2], params);
    expect(bad).toBeLessThan(params.baseBudget);
  });

  it("budget contracts when edge volatility is high", () => {
    const calm = dynamicRiskBudget([1, 1, 1, 1], [0.2, 0.2], params);
    const wild = dynamicRiskBudget([1, 1, 1, 1], [0.0, 1.0], params);
    expect(wild).toBeLessThan(calm);
  });

  it("budget is clamped to [minBudget, maxBudget]", () => {
    const huge = dynamicRiskBudget([100, 100], [0.2, 0.2], {
      ...params,
      maxBudget: 15,
    });
    expect(huge).toBeLessThanOrEqual(15);
    const tiny = dynamicRiskBudget([-100, -100], [5, 5], {
      ...params,
      minBudget: 3,
    });
    expect(tiny).toBeGreaterThanOrEqual(3);
  });

  it("fractionalKellyStake matches the Kelly formula", () => {
    // p=0.6, decimal 2.0 -> kelly = 0.2; half-Kelly on 1000 = 100.
    expect(fractionalKellyStake(0.6, 2.0, 0.5, 1000)).toBeCloseTo(100, 10);
    expect(fractionalKellyStake(0.4, 2.0, 0.5, 1000)).toBe(0); // negative edge
    expect(fractionalKellyStake(0.6, 1.0, 0.5, 1000)).toBe(0);
  });
});
