// Tests for decision/1801-06737-bet-cadence-policy.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  sufficientAttractiveness,
  netGrowthAtCadence,
  chooseCadence,
  cadenceGatePasses,
} from "./1801-06737-bet-cadence-policy.js";

describe("sufficientAttractiveness (1801.06737)", () => {
  it("holds for a clearly attractive edge distribution", () => {
    // Strong positive edge, low variance -> E[1/(1+X)] < 1.
    expect(sufficientAttractiveness(0.08, 0.01)).toBe(true);
  });
  it("fails for a marginal/noisy edge distribution", () => {
    // Zero-mean high-variance -> E[1/(1+X)] > 1 by Jensen.
    expect(sufficientAttractiveness(0.0, 0.5)).toBe(false);
  });
  it("is monotone: more edge helps, more variance hurts", () => {
    // More edge helps: (0.02, 0.2) fails but (0.30, 0.2) passes.
    expect(sufficientAttractiveness(0.02, 0.2)).toBe(false);
    expect(sufficientAttractiveness(0.30, 0.2)).toBe(true);
    // Variance hurts, deterministically: same edge, low variance passes,
    // high variance fails.
    expect(sufficientAttractiveness(0.08, 0.05)).toBe(true);
    expect(sufficientAttractiveness(0.08, 0.5)).toBe(false);
    // Monotone non-increasing in variance: no false->true flip on the way up.
    let prev = sufficientAttractiveness(0.08, 0.01);
    for (let v = 0.02; v <= 2.0; v += 0.02) {
      const cur = sufficientAttractiveness(0.08, v);
      expect(cur && !prev).toBe(false);
      prev = cur;
    }
  });
});

describe("chooseCadence", () => {
  it("picks an interior cadence trading growth against costs", () => {
    // perBetGrowth = 0.08 - 0.05 = 0.03 > 0; argmax of
    // 0.03*(1-exp(-n/4)) - 0.002*n lands at n=5 (interior of 12).
    const inputs = { edgeMean: 0.08, edgeVar: 0.1, costPerRestake: 0.002, maxCadence: 12 };
    const d = chooseCadence(inputs);
    expect(d.state).toBe("BET");
    if (d.state === "BET") {
      expect(d.cadence).toBeGreaterThan(0);
      expect(d.cadence).toBeLessThanOrEqual(12);
      // It is the argmax: neighbors are no better.
      const g = (n: number) => netGrowthAtCadence(inputs, n);
      if (d.cadence > 1) expect(d.netGrowth).toBeGreaterThanOrEqual(g(d.cadence - 1));
      if (d.cadence < 12) expect(d.netGrowth).toBeGreaterThanOrEqual(g(d.cadence + 1));
    }
  });
  it("surfaces NOT_WORTH_BETTING when costs dominate at every cadence", () => {
    const d = chooseCadence({ edgeMean: 0.001, edgeVar: 0.5, costPerRestake: 0.05, maxCadence: 10 });
    expect(d.state).toBe("NOT_WORTH_BETTING");
    expect(d.cadence).toBe(0);
  });
  it("bets at cadence 1 when re-staking costs are prohibitive but edge is real", () => {
    // perBetGrowth = 0.06 - 0.025 = 0.035; cost 0.007 sits between the
    // marginal benefit of the 1st restake (0.035*0.2212 = 0.00774) and the
    // 2nd (0.035*0.1723 = 0.00603): cadence 1 is the unique optimum.
    const d = chooseCadence({ edgeMean: 0.06, edgeVar: 0.05, costPerRestake: 0.007, maxCadence: 8 });
    expect(d.state).toBe("BET");
    if (d.state === "BET") expect(d.cadence).toBe(1);
  });
});

describe("cadenceGatePasses", () => {
  it("encodes the >=3% growth / no-worse-drawdown gate", () => {
    expect(cadenceGatePasses(1.031, 1.0, 0.2, 0.2)).toBe(true);
    expect(cadenceGatePasses(1.029, 1.0, 0.2, 0.2)).toBe(false);
    expect(cadenceGatePasses(1.05, 1.0, 0.21, 0.2)).toBe(false);
  });
});
