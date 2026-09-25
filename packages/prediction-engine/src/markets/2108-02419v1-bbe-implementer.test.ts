/**
 * Unit tests for the 2108.02419v1 BBE implementer scaffold.
 * Additive primitives only — ENABLED stays false.
 */
import { describe, it, expect } from "vitest";
import {
  ENABLED,
  RELATIVE_LOG_LOSS_TOLERANCE,
  CLOSING_LINE_MOVE_MAD_TOLERANCE,
  expectedPointsStub,
  winProbStub,
  advanceDrive,
  bettorFairEstimate,
  bettorStake,
  generateSyntheticTape,
  closingLineMoveMad,
  meanLogLoss,
  relativeLogLoss,
  acceptanceGatePasses,
  type DriveState,
  type BettorArchetype,
  type OddsTick,
} from "./2108-02419v1-bbe-implementer.js";

describe("2108.02419v1 BBE implementer scaffold", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("pins acceptance tolerances", () => {
    expect(RELATIVE_LOG_LOSS_TOLERANCE).toBe(0.1);
    expect(CLOSING_LINE_MOVE_MAD_TOLERANCE).toBe(0.5);
  });

  describe("expectedPointsStub", () => {
    it("scales with field position", () => {
      expect(expectedPointsStub(80)).toBeCloseTo(1, 5);
      expect(expectedPointsStub(20)).toBeCloseTo(4, 5);
    });

    it("clamps non-finite and out-of-range yardlines", () => {
      expect(expectedPointsStub(Number.NaN)).toBe(0);
      expect(expectedPointsStub(0)).toBeCloseTo((100 - 1) / 20, 5);
      expect(expectedPointsStub(100)).toBeCloseTo((100 - 99) / 20, 5);
    });
  });

  describe("winProbStub", () => {
    it("returns 0.5 for a tied game with no clock progress", () => {
      expect(winProbStub(0, 0)).toBeCloseTo(0.5, 5);
    });

    it("favors the leading team late", () => {
      // secondsRemaining: low = late game, high = early game (0–3600).
      const lateLead = winProbStub(14, 60);
      const earlyLead = winProbStub(14, 3300);
      expect(lateLead).toBeGreaterThan(earlyLead);
      expect(lateLead).toBeGreaterThan(0.5);
    });

    it("returns 0.5 for non-finite inputs", () => {
      expect(winProbStub(Number.NaN, 0.5)).toBe(0.5);
      expect(winProbStub(7, Number.POSITIVE_INFINITY)).toBe(0.5);
    });
  });

  describe("advanceDrive", () => {
  const base: DriveState = {
    yardline: 50,
    down: 1,
    distance: 10,
    scoreDiff: 0,
    secondsRemaining: 1800,
  };

    it("resets to first down on a successful gain", () => {
      const next = advanceDrive(base, 12);
      expect(next.down).toBe(1);
      expect(next.distance).toBe(10);
      expect(next.yardline).toBe(38);
    });

    it("increments down on an incomplete gain", () => {
      const next = advanceDrive(base, 3);
      expect(next.down).toBe(2);
      expect(next.distance).toBe(7);
      expect(next.yardline).toBe(47);
    });

    it("flips possession on turnover-on-downs", () => {
      const fourth: DriveState = { ...base, down: 4, distance: 8 };
      const next = advanceDrive(fourth, 2);
      expect(next.down).toBe(1);
      expect(next.distance).toBe(10);
      expect(next.yardline).toBe(100 - 48);
      // Possession flip negates scoreDiff; JS Object.is(-0, +0) is false, but === treats them equal.
      expect(next.scoreDiff === 0).toBe(true);
    });
  });

  describe("bettorFairEstimate / bettorStake", () => {
  const archetype: BettorArchetype = {
    id: "noise",
    errorScale: 0.05,
    stakeFraction: 0.1,
  };

    it("perturbs fair probability by noise and clamps", () => {
      const estimate = bettorFairEstimate(0.55, archetype, 2);
      expect(estimate).toBeGreaterThanOrEqual(0);
      expect(estimate).toBeLessThanOrEqual(1);
      // noise=2 clamps to 1, so estimate = 0.55 + 1 * 0.05
      expect(estimate).toBeCloseTo(0.55 + 1 * 0.05, 5);
    });

    it("stakes only on positive edge", () => {
      // signature: bettorStake(bankroll, fairProb, estimate, archetype)
      expect(bettorStake(1000, 0.55, 0.65, archetype)).toBeCloseTo(10, 5);
      expect(bettorStake(1000, 0.55, 0.5, archetype)).toBe(0);
    });
  });

  describe("generateSyntheticTape", () => {
    it("produces n ticks from the open", () => {
      const open: OddsTick = {
        t: 0,
        spread: -3.5,
        total: 47.5,
        homeMl: -150,
        awayMl: 130,
      };
      // signature: generateSyntheticTape(open, n, homeWpSeries, volatility)
      const tape = generateSyntheticTape(
        open,
        5,
        [0.5, 0.52, 0.55, 0.58, 0.6],
        0.05,
      );
      expect(tape).toHaveLength(5);
      expect(tape[0]?.t).toBe(0);
      expect(tape[4]?.t).toBe(4);
    });
  });

  describe("closingLineMoveMad", () => {
    it("returns mean absolute deviation over the shared length", () => {
      const synth = [-3, -3.5, -4];
      const real = [-3, -4, -3.5];
      expect(closingLineMoveMad(synth, real)).toBeCloseTo((0 + 0.5 + 0.5) / 3, 5);
    });

    it("returns 0 for empty inputs", () => {
      expect(closingLineMoveMad([], [])).toBe(0);
    });
  });

  describe("meanLogLoss / relativeLogLoss", () => {
    it("computes finite mean log-loss on valid forecasts", () => {
      const forecasts = [0.6, 0.7, 0.4];
      const outcomes = [1, 1, 0];
      const loss = meanLogLoss(forecasts, outcomes);
      expect(Number.isFinite(loss)).toBe(true);
      expect(loss).toBeGreaterThan(0);
    });

    it("returns 0 when both sides match at zero real loss", () => {
      expect(relativeLogLoss(0, 0)).toBe(0);
    });

    it("returns Infinity when real is 0 and synth is positive", () => {
      expect(relativeLogLoss(0.1, 0)).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns relative gap when real is positive", () => {
      expect(relativeLogLoss(0.22, 0.2)).toBeCloseTo(0.1, 5);
    });
  });

  describe("acceptanceGatePasses", () => {
    it("passes at or under both tolerances", () => {
      expect(acceptanceGatePasses(0.1, 0.5)).toBe(true);
      expect(acceptanceGatePasses(0.05, 0.25)).toBe(true);
    });

    it("fails when either tolerance is exceeded", () => {
      expect(acceptanceGatePasses(0.1001, 0.5)).toBe(false);
      expect(acceptanceGatePasses(0.1, 0.5001)).toBe(false);
      expect(acceptanceGatePasses(0.2, 1.0)).toBe(false);
    });
  });
});
