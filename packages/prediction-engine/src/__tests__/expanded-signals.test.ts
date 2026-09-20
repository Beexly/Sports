import { describe, expect, it } from "vitest";
import { evaluateOffensiveLineTrench } from "../signals/trench/offensive-line-continuity.js";
import { evaluateRefereeCrewTendencies } from "../signals/situational/referee-crew-tendencies.js";
import { evaluateCircadianTravelFatigue } from "../signals/situational/circadian-travel-fatigue.js";
import { evaluateContractMilestones } from "../signals/narrative/contract-incentives-milestones.js";
import { evaluateWr1OutRedistribution } from "../signals/efficiency/wr1-out-target-redistribution.js";

describe("Expanded Research Signal Extractors", () => {
  describe("Offensive Line Trench Continuity (Factor A21)", () => {
    it("rewards fully intact 5-man line with optimal continuity and minimal sack delta", () => {
      const res = evaluateOffensiveLineTrench({
        team: "KC",
        startingLinemenCount: 5,
        returningStartersFromPriorWeek: 5,
        backupTacklesStarting: 0,
        backupInteriorStarting: 0,
        teamPbwrPercent: 68,
        opponentPrwrPercent: 42,
      });

      expect(res.continuityScore).toBe(1.0);
      expect(res.expectedSackRateDelta).toBe(0.0);
      expect(res.yardsBeforeContactDelta).toBe(0.0);
      expect(res.trenchNetPressureAdvantagePercent).toBe(26);
      expect(res.leadRusherEfficiencyMultiplier).toBe(1.0);
    });

    it("penalizes backup tackles heavily on sack rates and pressure delta", () => {
      const res = evaluateOffensiveLineTrench({
        team: "NYG",
        startingLinemenCount: 5,
        returningStartersFromPriorWeek: 3,
        backupTacklesStarting: 2, // both OTs injured
        backupInteriorStarting: 0,
        teamPbwrPercent: 48,
        opponentPrwrPercent: 55,
      });

      expect(res.continuityScore).toBeLessThan(0.6);
      expect(res.expectedSackRateDelta).toBeGreaterThan(3.5);
      expect(res.offensiveEpaPerPlayAdjustment).toBeLessThan(-0.06);
    });
  });

  describe("Referee Crew Tendencies (Factors A3 & A27)", () => {
    it("classifies Bill Vinovich style crew as LET_THEM_PLAY with clock-running under lean", () => {
      const res = evaluateRefereeCrewTendencies({
        refereeName: "Bill Vinovich",
        crewFlagsPerGame: 10.2,
        leagueAvgFlagsPerGame: 12.4,
        defensiveHoldingFlagsPerGame: 1.2,
        passInterferenceFlagsPerGame: 0.8,
        homePenaltyRateRatio: 0.46,
      });

      expect(res.penaltyPaceTier).toBe("LET_THEM_PLAY");
      expect(res.flagsAboveLeagueAverage).toBe(-2.2);
      expect(res.driveStallProbabilityMultiplier).toBeLessThan(1.0);
    });

    it("amplifies home penalty advantage in dome environments", () => {
      const outdoorRes = evaluateRefereeCrewTendencies({
        refereeName: "Average Ref",
        crewFlagsPerGame: 12.4,
        leagueAvgFlagsPerGame: 12.4,
        defensiveHoldingFlagsPerGame: 1.9,
        passInterferenceFlagsPerGame: 1.4,
        homePenaltyRateRatio: 0.46,
        isDomeVenue: false,
      });

      const domeRes = evaluateRefereeCrewTendencies({
        refereeName: "Average Ref",
        crewFlagsPerGame: 12.4,
        leagueAvgFlagsPerGame: 12.4,
        defensiveHoldingFlagsPerGame: 1.9,
        passInterferenceFlagsPerGame: 1.4,
        homePenaltyRateRatio: 0.46,
        isDomeVenue: true,
      });

      expect(domeRes.homeFieldPenaltyYardageAdvantage).toBeGreaterThan(outdoorRes.homeFieldPenaltyYardageAdvantage);
    });
  });

  describe("Circadian Travel Fatigue (Factor A4)", () => {
    it("detects West-to-East 1:00 PM kickoff biological deficit", () => {
      const res = evaluateCircadianTravelFatigue({
        team: "SEA",
        isVisitor: true,
        originTimeZoneOffset: -8, // Pacific
        destinationTimeZoneOffset: -5, // Eastern
        localKickoffHour24: 13, // 1:00 PM EST
        daysOfRest: 7,
        opponentDaysOfRest: 7,
      });

      expect(res.timeZoneShiftEastward).toBe(3);
      expect(res.bodyClockKickoffHour).toBe(10); // biological 10:00 AM
      expect(res.circadianDeficitMagnitude).toBeGreaterThanOrEqual(0.85);
      expect(res.expectedFirstHalfMarginAdjustment).toBeLessThan(-1.5);
    });

    it("evaluates short week Thursday night travel with high fatigue risk", () => {
      const res = evaluateCircadianTravelFatigue({
        team: "LAR",
        isVisitor: true,
        originTimeZoneOffset: -8,
        destinationTimeZoneOffset: -5,
        localKickoffHour24: 20.25, // 8:15 PM EST
        daysOfRest: 4, // Thursday game
        opponentDaysOfRest: 4,
      });

      expect(res.fourthQuarterFatigueRisk).toBe("HIGH");
    });
  });

  describe("Contract Milestones & Incentives (Factor A15 & Workstream 5B)", () => {
    it("identifies high proximity late-season milestone targets and boosts touches", () => {
      const res = evaluateContractMilestones({
        playerName: "Veteran WR",
        position: "WR",
        metricType: "RECEPTIONS",
        currentSeasonTotal: 74,
        milestoneTarget: 80, // needs 6 receptions
        bonusValueUsd: 1000000,
        remainingGamesInSeason: 1, // Week 18
        isContractYear: true,
        teamPlayoffStatus: "ELIMINATED",
      });

      expect(res.incentiveAttainability).toBe("HIGH_PROXIMITY");
      expect(res.neededPerGame).toBe(6.0);
      expect(res.touchPriorityBoostMultiplier).toBeGreaterThan(1.15);
      expect(res.projectedTargetShareDelta).toBeGreaterThan(3.0);
      expect(res.financialUrgencyScore).toBeGreaterThan(70);
    });
  });

  describe("WR1-Out Target Redistribution (Factor A19)", () => {
    it("reallocates vacated alpha volume to WR2, TE, and RB with efficiency compression", () => {
      const res = evaluateWr1OutRedistribution({
        team: "MIN",
        wr1Name: "Justin Jefferson",
        wr1BaselineTargetShare: 0.28,
        wr1Status: "OUT",
        wr2Name: "Jordan Addison",
        wr2BaselineTargetShare: 0.17,
        te1BaselineTargetShare: 0.15,
        rb1TargetShare: 0.10,
      });

      expect(res.isAlphaWr1Out).toBe(true);
      expect(res.vacatedTargetSharePool).toBe(0.28);
      expect(res.wr2ProjectedTargetShare).toBeCloseTo(0.271, 2);
      expect(res.te1ProjectedTargetShare).toBeCloseTo(0.228, 2);
      expect(res.rbProjectedTargetShare).toBeCloseTo(0.150, 2);
      expect(res.wr2EfficiencyCompressionMultiplier).toBeLessThan(1.0); // coverage roll penalty
    });
  });
});
