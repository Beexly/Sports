import { describe, expect, it } from "vitest";

import {
  ENABLED,
  adaptiveAbstentionBudget,
  allocateEvalWeeks,
  evalWeeksSavedFraction,
  inverseGapWeights,
  shouldShipChallenger,
} from "@/lib/calibration/2606-29203-inverse-gap-weighted-allocation";

describe("inverse-gap-weighted allocation (PGWS)", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("weights are proportional to 1/gap^2 and sum to 1", () => {
    const w = inverseGapWeights([0.01, 0.02, 0.04]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    // gap ratio 2 -> weight ratio 4
    expect(w[0] / w[1]).toBeCloseTo(4, 8);
    expect(w[1] / w[2]).toBeCloseTo(4, 8);
  });

  it("allocateEvalWeeks spends the full budget, favoring close contenders", () => {
    const alloc = allocateEvalWeeks([0.01, 0.05, 0.1], 20);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(20);
    expect(alloc[0]).toBeGreaterThan(alloc[2]); // smallest gap gets most weeks
    expect(alloc.every((x) => x >= 0)).toBe(true);
  });

  it("Bayesian abstention keeps the incumbent unless evidence is strong", () => {
    expect(shouldShipChallenger(0.02, 0.05)).toBe(true);
    expect(shouldShipChallenger(0.2, 0.05)).toBe(false);
  });

  it("adaptive budget tightens when a bad ship is costly", () => {
    const cheap = adaptiveAbstentionBudget(100, 10);
    const pricey = adaptiveAbstentionBudget(100000, 10);
    expect(pricey).toBeLessThan(cheap);
    expect(cheap).toBeLessThanOrEqual(0.05);
  });

  it("PGWS saves eval weeks vs equal-split on skewed gaps", () => {
    const saved = evalWeeksSavedFraction([0.005, 0.05, 0.1, 0.2]);
    expect(saved).toBeGreaterThan(0.2); // gate: >= 20% fewer weeks
  });
});
