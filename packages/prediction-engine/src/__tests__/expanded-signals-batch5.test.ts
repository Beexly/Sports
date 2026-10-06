import { describe, it, expect } from "vitest";
import { evaluateShortWeekRoadDeficit } from "../signals/situational/short-week-road-deficit";
import { evaluateHighAltitudeFatigueDecay } from "../signals/environmental/high-altitude-fatigue-decay";
import { evaluateQbTwpRegression } from "../signals/efficiency/qb-turnover-worthy-play-regression";
import { evaluateEarlyDownProeMomentum } from "../signals/tactical/early-down-pass-rate-momentum";
import { evaluateTwoMinuteHurryUpEfficiency } from "../signals/tactical/two-minute-hurry-up-efficiency";

describe("Batch 5 Expanded Situational & Contextual Signals", () => {
  describe("Factor A5: Short-Week Road Deficit", () => {
    it("penalizes visiting road team playing on 4 days rest with long cross-country travel", () => {
      const res = evaluateShortWeekRoadDeficit({
        isRoadTeam: true,
        restDays: 4,
        travelDistanceMiles: 2100,
        opponentRestDays: 7,
        isDivisionRivalry: false,
      });

      expect(res.acuteTravelDeficit).toBe(true);
      expect(res.spreadPointAdjustment).toBeLessThan(-2.0);
      expect(res.fourthQuarterFatigueFactor).toBeGreaterThan(1.2);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("evaluates neutral when both teams are on standard rest", () => {
      const res = evaluateShortWeekRoadDeficit({
        isRoadTeam: true,
        restDays: 7,
        travelDistanceMiles: 400,
        opponentRestDays: 7,
        isDivisionRivalry: true,
      });

      expect(res.acuteTravelDeficit).toBe(false);
      expect(res.spreadPointAdjustment).toBe(0.0);
      expect(res.fourthQuarterFatigueFactor).toBe(1.0);
    });
  });

  describe("Factor A6: High-Altitude Fatigue Decay", () => {
    it("identifies high-altitude venue in Denver and penalizes unacclimated visiting team", () => {
      const res = evaluateHighAltitudeFatigueDecay({
        venueAltitudeFeet: 5280,
        isVisitingTeam: true,
        visitingTeamArrivalDaysPrior: 1,
        defensiveSnapCountPaceProjection: 74,
      });

      expect(res.isHighAltitudeVenue).toBe(true);
      expect(res.fieldGoalRangeExtensionYards).toBeGreaterThanOrEqual(3.5);
      expect(res.touchbackProbabilityBoost).toBeGreaterThan(0.20);
      expect(res.secondHalfFatigueMultiplier).toBeGreaterThan(1.15);
      expect(res.visitingDefensiveEpaDecay).toBeGreaterThan(0.05);
      expect(res.spreadPointAdjustment).toBeLessThan(-1.0);
    });

    it("returns zero decay for sea-level venues", () => {
      const res = evaluateHighAltitudeFatigueDecay({
        venueAltitudeFeet: 20,
        isVisitingTeam: true,
        visitingTeamArrivalDaysPrior: 1,
        defensiveSnapCountPaceProjection: 65,
      });

      expect(res.isHighAltitudeVenue).toBe(false);
      expect(res.fieldGoalRangeExtensionYards).toBe(0.0);
      expect(res.spreadPointAdjustment).toBe(0.0);
    });
  });

  describe("Factor A7: QB Turnover-Worthy Play Regression", () => {
    it("flags negative turnover regression for a lucky QB with few INTs but high TWPs", () => {
      const res = evaluateQbTwpRegression({
        passAttempts: 250,
        actualInterceptions: 3,
        turnoverWorthyPlays: 14,
        opponentDefensiveInterceptionRate: 0.024,
      });

      expect(res.turnoverLuckDifferential).toBeGreaterThan(3.0);
      expect(res.expectedFutureIntRate).toBeGreaterThan(res.actualIntRate);
      expect(res.offensiveEpaAdjustment).toBeLessThan(0);
      expect(res.turnoverRiskMultiplier).toBeGreaterThan(1.2);
    });

    it("fails closed on thin sample under 40 attempts", () => {
      const res = evaluateQbTwpRegression({
        passAttempts: 25,
        actualInterceptions: 0,
        turnoverWorthyPlays: 1,
        opponentDefensiveInterceptionRate: 0.022,
      });

      expect(res.confidence).toBeLessThan(0.40);
      expect(res.offensiveEpaAdjustment).toBe(0.0);
    });
  });

  describe("Factor A8: Early Down PROE Momentum", () => {
    it("rewards hyper-pass-heavy offenses facing porous pass defenses", () => {
      const res = evaluateEarlyDownProeMomentum({
        earlyDownPassRate: 0.62,
        expectedPassRate: 0.50,
        opponentPassDefenseEpaRank: 28,
        offensivePaceSecondsPerPlay: 23.5,
        playCountSample: 220,
      });

      expect(res.playCallingAggressivenessTier).toBe("HYPER_PASS_HEAVY");
      expect(res.proeDifferential).toBeCloseTo(0.12, 2);
      expect(res.driveEfficiencyMultiplier).toBeGreaterThan(1.05);
      expect(res.gameTotalPointsImpact).toBeGreaterThan(2.0);
    });
  });

  describe("Factor A9: Two-Minute Hurry-Up Efficiency", () => {
    it("quantifies high two-minute conversion with middle-eight kickoff reception", () => {
      const res = evaluateTwoMinuteHurryUpEfficiency({
        twoMinuteDrillDrives: 14,
        twoMinuteScoringDrives: 8,
        twoMinutePointsPerMinute: 2.8,
        qbPasserRatingInTwoMinute: 104.5,
        opponentDefensiveTwoMinuteEpaAllowed: 0.12,
        receivesSecondHalfKickoff: true,
      });

      expect(res.scoringDriveConversionRate).toBeGreaterThan(0.50);
      expect(res.middleEightLeverageScore).toBeGreaterThan(0.70);
      expect(res.expectedPointsAddedPerTwoMinuteOpportunity).toBeGreaterThan(1.0);
      expect(res.spreadPointAdjustment).toBeGreaterThan(0.50);
      expect(res.confidence).toBeGreaterThan(0.70);
    });
  });
});
