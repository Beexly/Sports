import { describe, expect, it } from "vitest";
import {
  bradleyTerryAdapter,
  csfAdapter,
  davidsonProbsAdapter,
  cycleRateAdapter,
  windChillAdapter,
  heatIndexAdapter,
  passWeatherImpactAdapter,
  fgWeatherAdjAdapter,
  RATINGS_WEATHER_ADAPTERS,
} from "./ratings-weather-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("ratings & weather adapters", () => {
  it("all 8 adapters registered", () => {
    expect(Object.keys(RATINGS_WEATHER_ADAPTERS).length).toBe(8);
  });

  it("every adapter returns Observation or fail-closed on null", () => {
    for (const [name, fn] of Object.entries(RATINGS_WEATHER_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isObservation(r as never) || isFailClosed(r as never), name).toBe(true);
    }
  });

  it("bradleyTerry computes real win probability", () => {
    const r = bradleyTerryAdapter(1550, 1500, 1.15);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0.5);
      expect(r.value).toBeLessThan(1);
    }
  });

  it("csf computes real point differential metric", () => {
    const r = csfAdapter(350, 280, 1.5);
    expect(isObservation(r)).toBe(true);
  });

  it("davidsonProbs computes real home/away/tie probabilities", () => {
    const r = davidsonProbsAdapter(1.2, 0.8, 0.3);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const raw = r.raw as Record<string, number>;
      expect(raw.homeProb + raw.awayProb + raw.tieProb).toBeCloseTo(1, 2);
    }
  });

  it("cycleRate computes real cycle rate", () => {
    const r = cycleRateAdapter(32, 5);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("windChill computes real NWS formula", () => {
    const r = windChillAdapter(32, 15);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeLessThan(32); // wind chill < temp
    }
  });

  it("heatIndex computes real heat index", () => {
    const r = heatIndexAdapter(95, 70);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(95);
    }
  });

  it("passWeatherImpact computes real pass impact", () => {
    const r = passWeatherImpactAdapter(20, 40, 50);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeLessThan(0); // weather hurts
    }
  });

  it("fgWeatherAdj computes real FG adjustment", () => {
    const r = fgWeatherAdjAdapter(0.75, 20, 30);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeLessThan(0.75); // wind/temp reduce FG%
    }
  });
});
