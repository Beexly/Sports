import { describe, expect, it } from "vitest";
import {
  flagUndervaluedAdapter,
  teammateDifferentialAdapter,
  paretoFilterAdapter,
  shrinkVarianceAdapter,
  stackBonusAdapter,
  powerLawSharesAdapter,
  DFS_ADAPTERS,
} from "./dfs-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("DFS adapters", () => {
  it("all 6 adapters registered", () => {
    expect(Object.keys(DFS_ADAPTERS).length).toBe(6);
  });

  it("every adapter returns Observation or fail-closed on null", () => {
    for (const [name, fn] of Object.entries(DFS_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isObservation(r as never) || isFailClosed(r as never), name).toBe(true);
    }
  });

  it("flagUndervalued computes real value ratio", () => {
    const r = flagUndervaluedAdapter(22, 5500, 18, 6000);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(1);
    }
  });

  it("teammateDifferential computes real differential", () => {
    const r = teammateDifferentialAdapter(0.25, 0.15);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBeCloseTo(0.1, 2);
  });

  it("paretoFilter counts real Pareto-optimal players", () => {
    const r = paretoFilterAdapter([20, 25, 15], [5000, 6000, 4000]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(1);
    }
  });

  it("shrinkVariance computes real shrunk variance", () => {
    const r = shrinkVarianceAdapter(25, 15, 5, 10);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(15);
      expect(r.value).toBeLessThan(25);
    }
  });

  it("stackBonus computes real stack bonus", () => {
    const r = stackBonusAdapter(3, 0.4);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBeGreaterThan(0);
  });

  it("powerLawShares computes real top share", () => {
    const r = powerLawSharesAdapter(100, 1.5);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThan(1);
    }
  });
});
