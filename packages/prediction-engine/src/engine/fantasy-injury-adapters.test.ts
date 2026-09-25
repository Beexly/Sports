import { describe, expect, it } from "vitest";
import {
  playerMomentsAdapter,
  zValueAdapter,
  gPerDollarAdapter,
  attInjuryEffectAdapter,
  hotHandAdapter,
  FANTASY_INJURY_ADAPTERS,
} from "./fantasy-injury-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("fantasy & injuries adapters", () => {
  it("all 5 adapters registered", () => {
    expect(Object.keys(FANTASY_INJURY_ADAPTERS).length).toBe(5);
  });

  it("every adapter returns Observation or fail-closed on null", () => {
    for (const [name, fn] of Object.entries(FANTASY_INJURY_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isObservation(r as never) || isFailClosed(r as never), name).toBe(true);
    }
  });

  it("playerMoments computes real mean and tau", () => {
    const r = playerMomentsAdapter([15, 22, 18, 25, 12]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(18.4, 1);
    }
  });

  it("zValue computes real z-score", () => {
    const r = zValueAdapter(18, 12, 5);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(1.2, 2);
    }
  });

  it("gPerDollar computes real value", () => {
    const r = gPerDollarAdapter(4.5, 5500);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(0.818, 2);
    }
  });

  it("attInjuryEffect computes real treatment effect", () => {
    const r = attInjuryEffectAdapter([18, 22, 20], [12, 15, 14]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0);
    }
  });

  it("hotHand computes real repeat rate", () => {
    const r = hotHandAdapter([1, 1, 0, 1, 1, 1, 0]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(1);
    }
  });
});
