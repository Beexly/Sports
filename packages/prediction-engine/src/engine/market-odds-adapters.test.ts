import { describe, expect, it } from "vitest";
import {
  spreadToWinProbAdapter,
  largeLineMoveAdapter,
  steamExceedanceAdapter,
  overroundForecastAdapter,
  detectSteamAdapter,
  bucketRoiAdapter,
  devigOracleAdapter,
  MARKET_ODDS_ADAPTERS,
} from "./market-odds-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("market & odds adapters", () => {
  it("all 7 adapters registered", () => {
    expect(Object.keys(MARKET_ODDS_ADAPTERS).length).toBe(7);
  });

  it("every adapter returns Observation or fail-closed on null", () => {
    for (const [name, fn] of Object.entries(MARKET_ODDS_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isObservation(r as never) || isFailClosed(r as never), name).toBe(true);
    }
  });

  it("spreadToWinProb computes real win probability from spread", () => {
    const r = spreadToWinProbAdapter(-7, 13.45);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0.5);
      expect(r.value).toBeLessThan(1);
    }
  });

  it("spreadToWinProb for pick-em is near 0.5", () => {
    const r = spreadToWinProbAdapter(0, 13.45);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(0.5, 1);
    }
  });

  it("largeLineMove flags big moves", () => {
    const r = largeLineMoveAdapter(2.5, 1);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe(1);
  });

  it("steamExceedance computes real exceedance rate", () => {
    const r = steamExceedanceAdapter([0.5, 1.2, 0.8, 2.1, 0.3], 1);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBeCloseTo(0.4, 2);
  });

  it("overroundForecast computes real forecast", () => {
    const r = overroundForecastAdapter([0.05, 0.06, 0.04, 0.07]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThan(0.2);
    }
  });

  it("detectSteam detects steam moves", () => {
    const r = detectSteamAdapter(2.5, 1.2, 5);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe(1);
  });

  it("bucketRoi computes real ROI", () => {
    const r = bucketRoiAdapter(3, 1000, 1100);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBeCloseTo(0.1, 2);
  });

  it("devigOracle computes real fair probabilities", () => {
    const r = devigOracleAdapter([-110, -110], "proportional");
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const raw = r.raw as Record<string, number[]>;
      expect(raw.fairProbs[0]).toBeCloseTo(0.5, 2);
    }
  });
});
