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
    const r = devigOracleAdapter([-110, -110], "multiplicative");
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      const raw = r.raw as Record<string, number[]>;
      expect(raw.fairProbs[0]).toBeCloseTo(0.5, 2);
    }
  });

  // Two defects are pinned below, both invisible on a symmetric
  // [-110, -110] book with an unrecognised method string:
  //   1. the adapter normalised by sum for EVERY method while reporting the
  //      caller's string in `raw.method`, so "additive" silently returned
  //      multiplicative numbers labelled additive;
  //   2. `raw.method` echoed whatever string it was handed, including
  //      "proportional", which is not one of the seven DevigMethod values.
  // Asymmetric books separate the methods, so a genuine per-method
  // computation and a fake one cannot return the same vector.
  describe("devigOracleAdapter: method selection on asymmetric books", () => {
    it("returns additive, not multiplicative, when asked for additive", () => {
      const r = devigOracleAdapter([-110, 150], "additive");
      expect(isObservation(r)).toBe(true);
      if (!isObservation(r)) return;
      const raw = r.raw as { fairProbs: number[]; method: string };
      expect(raw.method).toBe("additive");
      expect(raw.fairProbs).toEqual([0.5619, 0.4381]);
      // The multiplicative answer for this book, which is what the old
      // body returned under every method name.
      expect(raw.fairProbs).not.toEqual([0.567, 0.433]);
      expect(r.value).toBeCloseTo(0.5619, 4);
    });

    it("honours shin on a three-way book where it visibly differs", () => {
      const r = devigOracleAdapter([-110, -110, 200], "shin");
      expect(isObservation(r)).toBe(true);
      if (!isObservation(r)) return;
      const raw = r.raw as { fairProbs: number[]; method: string; overround: number };
      expect(raw.method).toBe("shin");
      expect(raw.fairProbs).toEqual([0.3909, 0.3909, 0.2182]);
      expect(raw.fairProbs).not.toEqual([0.3793, 0.3793, 0.2414]);
      expect(raw.overround).toBeCloseTo(0.381, 4);
    });

    it("sums to one for every method on an asymmetric three-way book", () => {
      for (const m of ["multiplicative", "additive", "power", "shin", "odds_ratio", "logarithmic"] as const) {
        const r = devigOracleAdapter([-110, -110, 200], m);
        expect(isObservation(r), m).toBe(true);
        if (!isObservation(r)) continue;
        const raw = r.raw as { fairProbs: number[]; method: string };
        expect(raw.method, m).toBe(m);
        const total = raw.fairProbs.reduce((a, b) => a + b, 0);
        expect(total, m).toBeCloseTo(1, 3);
        for (const p of raw.fairProbs) {
          expect(p, m).toBeGreaterThan(0);
          expect(p, m).toBeLessThan(1);
        }
      }
    });

    it("falls back to multiplicative for a method it does not have", () => {
      // "proportional" is not a DevigMethod. The old adapter reported it
      // verbatim; the honest answer is the method actually computed.
      for (const m of ["proportional", "bogus-method", null, undefined]) {
        const r = devigOracleAdapter([-110, 150], m as string | null | undefined);
        expect(isObservation(r), String(m)).toBe(true);
        if (!isObservation(r)) continue;
        const raw = r.raw as { fairProbs: number[]; method: string };
        expect(raw.method, String(m)).toBe("multiplicative");
        expect(raw.fairProbs, String(m)).toEqual([0.567, 0.433]);
      }
    });

    it("agrees with the multiplicative de-vig on an asymmetric book", () => {
      const r = devigOracleAdapter([-110, -125], "multiplicative");
      expect(isObservation(r)).toBe(true);
      if (!isObservation(r)) return;
      const raw = r.raw as { fairProbs: number[]; overround: number };
      expect(raw.fairProbs).toEqual([0.4853, 0.5147]);
      expect(raw.overround).toBeCloseTo(0.0794, 4);
    });

    it("fails closed on a zero American price", () => {
      const r = devigOracleAdapter([-110, 0], "multiplicative");
      expect(isFailClosed(r)).toBe(true);
      if (isFailClosed(r)) {
        expect(r.reason).toContain("American");
      }
    });
  });
});
