/**
 * real-signal-adapters.test.ts — proves the adapters call real computations
 * and return real Observation values (not metadata).
 */
import { describe, expect, it } from "vitest";
import {
  turnoverLuckAdapter,
  opponentAdjustedEpaAdapter,
  expectedPointsAdapter,
  winProbabilityAdapter,
  brierScoreAdapter,
  logLossAdapter,
  windElasticityAdapter,
  injuryTrajectoryAdapter,
  redzoneTeLeverageAdapter,
  scheduleDensityAdapter,
  qbReceiverContinuityAdapter,
  coachingTendenciesAdapter,
  refereeCrewTendenciesAdapter,
  parsimoniousSeasonAdapter,
  skellamMarginAdapter,
  conformalIntervalAdapter,
  REAL_ADAPTERS,
} from "./real-signal-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("real signal adapters — actual computations, not metadata", () => {
  it("all 16 adapters are registered and callable", () => {
    expect(Object.keys(REAL_ADAPTERS).length).toBe(16);
    for (const [name, fn] of Object.entries(REAL_ADAPTERS)) {
      expect(typeof fn, `${name} is not callable`).toBe("function");
    }
  });

  it("turnoverLuck computes real adjusted margin", () => {
    const r = turnoverLuckAdapter({ takeaways: 15, giveaways: 8, expectedTakeaways: 12, expectedGiveaways: 10, plays: 600 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(typeof r.value).toBe("number");
      expect(r.family).toBe("CALIBRATION_HISTORY");
    }
  });

  it("turnoverLuck fails closed on missing input", () => {
    expect(isFailClosed(turnoverLuckAdapter(null))).toBe(true);
  });

  it("opponentAdjustedEpa computes real net EPA", () => {
    const r = opponentAdjustedEpaAdapter([
      { team: "CIN", opponent: "BAL", offEpaPerPlay: 0.15, defEpaPerPlay: -0.05, plays: 65 },
    ], "CIN");
    expect(isObservation(r)).toBe(true);
  });

  it("expectedPoints computes real EP", () => {
    const r = expectedPointsAdapter({ down: 1, ydstogo: 10, yardline100: 50, halfSecondsRemaining: 900, scoreDifferential: 0 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(typeof r.value).toBe("number");
    }
  });

  it("winProbability computes real WP in (0,1)", () => {
    const r = winProbabilityAdapter({ scoreDifferential: 7, gameSecondsRemaining: 1800, yardline100: 50, down: 1, ydstogo: 10, homeTimeouts: 3, awayTimeouts: 3, spread: -3 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThan(1);
    }
  });

  it("brierScore computes real Brier", () => {
    const r = brierScoreAdapter([0.7, 0.3, 0.6], [1, 0, 1]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(1);
    }
  });

  it("logLoss computes real log-loss", () => {
    const r = logLossAdapter([0.7, 0.3], [1, 0]);
    expect(isObservation(r)).toBe(true);
  });

  it("windElasticity computes real wind impact", () => {
    const r = windElasticityAdapter(18, true);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeLessThan(0);
    }
  });

  it("injuryTrajectory computes real injury impact", () => {
    const r = injuryTrajectoryAdapter("Out", 2);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeLessThan(0);
    }
  });

  it("redzoneTeLeverage computes real TE share", () => {
    expect(isObservation(redzoneTeLeverageAdapter(5, 20))).toBe(true);
  });

  it("scheduleDensity computes real rest impact", () => {
    expect(isObservation(scheduleDensityAdapter(2, 4))).toBe(true);
  });

  it("qbReceiverContinuity computes real chemistry", () => {
    expect(isObservation(qbReceiverContinuityAdapter(12, 0.25))).toBe(true);
  });

  it("coachingTendencies computes real coaching lean", () => {
    expect(isObservation(coachingTendenciesAdapter(0.6, 0.3, 0.4))).toBe(true);
  });

  it("refereeCrewTendencies computes real foul delta", () => {
    expect(isObservation(refereeCrewTendenciesAdapter(0.15, 0.55))).toBe(true);
  });

  it("parsimoniousSeason computes real projected wins", () => {
    expect(isObservation(parsimoniousSeasonAdapter(0.65, 5.2, 12))).toBe(true);
  });

  it("skellamMargin computes real margin", () => {
    const r = skellamMarginAdapter(24, 17);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBe(7);
  });

  it("conformalInterval computes real width", () => {
    const r = conformalIntervalAdapter(0.55, 0.12);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value).toBeCloseTo(0.24, 4);
  });

  it("all adapters fail closed on null input", () => {
    for (const fn of Object.values(REAL_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isFailClosed(r as never)).toBe(true);
    }
  });

  it("every Observation has source, asOf, provenance, family", () => {
    const samples = [
      turnoverLuckAdapter({ takeaways: 10, giveaways: 5, expectedTakeaways: 8, expectedGiveaways: 7, plays: 500 }),
      expectedPointsAdapter({ down: 1, ydstogo: 10, yardline100: 50, halfSecondsRemaining: 900, scoreDifferential: 0 }),
    ];
    for (const r of samples) {
      expect(isObservation(r)).toBe(true);
      if (isObservation(r)) {
        expect(r.source).toBeTruthy();
        expect(r.asOf).toBeTruthy();
        expect(r.provenance).toBeTruthy();
        expect(r.family).toBeTruthy();
      }
    }
  });
});
