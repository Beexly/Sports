import { describe, it, expect } from "vitest";
import { evaluatePrimetimeTargetConcentration } from "../signals/situational/primetime-target-concentration";
import { evaluateBackupQbTargetDistribution } from "../signals/efficiency/backup-qb-target-distribution";
import { evaluateRedZoneOpportunityConversion } from "../signals/props/redzone-opportunity-conversion";
import { evaluateTemperaturePrecipitationDecay } from "../signals/environmental/temperature-precipitation-decay";
import { evaluateRookieBreakoutCohort } from "../signals/narrative/rookie-breakout-cohort";

describe("Expanded Elite Research Signals Batch 3", () => {
  describe("Primetime Target Concentration (Factor A18)", () => {
    it("rewards alpha WR1 in primetime and leaves regional Sunday early neutral", () => {
      const sundayEarly = evaluatePrimetimeTargetConcentration({
        broadcastWindow: "REGIONAL_SUNDAY_EARLY",
        playerDepthChartRole: "ALPHA_WR1",
        baselineTargetShare: 0.25,
        baselineRouteParticipationRate: 0.90,
      });
      const snfPrimetime = evaluatePrimetimeTargetConcentration({
        broadcastWindow: "SNF_PRIMETIME",
        playerDepthChartRole: "ALPHA_WR1",
        baselineTargetShare: 0.25,
        baselineRouteParticipationRate: 0.90,
      });

      expect(sundayEarly.isStandalonePrimetime).toBe(false);
      expect(sundayEarly.targetShareMultiplier).toBe(1.0);

      expect(snfPrimetime.isStandalonePrimetime).toBe(true);
      expect(snfPrimetime.targetShareMultiplier).toBe(1.18);
      expect(snfPrimetime.adjustedTargetShare).toBe(0.295);
      expect(snfPrimetime.primetimeFunnelingTier).toBe("HYPER_TARGETED");
    });

    it("squeezes WR3 slot options in primetime", () => {
      const squeezed = evaluatePrimetimeTargetConcentration({
        broadcastWindow: "TNF_PRIMETIME",
        playerDepthChartRole: "SLOT_WR3",
        baselineTargetShare: 0.12,
        baselineRouteParticipationRate: 0.60,
      });
      expect(squeezed.targetShareMultiplier).toBe(0.72);
      expect(squeezed.primetimeFunnelingTier).toBe("SQUEEZED_OUT");
    });
  });

  describe("Backup QB Target Distribution (Factor A20)", () => {
    it("funnels checkdowns to RBs and crushes deep boundary threats", () => {
      const rb = evaluateBackupQbTargetDistribution({
        isBackupStarting: true,
        backupCareerPassAttempts: 50,
        playerRole: "RECEIVING_RUNNING_BACK",
        baselineTargetShare: 0.14,
        baselineAdot: 2.5,
        baselineReceptionsLine: 3.5,
      });
      const deepWr = evaluateBackupQbTargetDistribution({
        isBackupStarting: true,
        backupCareerPassAttempts: 50,
        playerRole: "BOUNDARY_DEEP_THREAT",
        baselineTargetShare: 0.20,
        baselineAdot: 14.5,
        baselineReceptionsLine: 4.5,
      });

      expect(rb.targetFunnelCategory).toBe("HIGH_VOLUME_BENEFICIARY");
      expect(rb.targetShareMultiplier).toBe(1.38);
      expect(rb.adjustedTargetShare).toBeGreaterThan(0.19);

      expect(deepWr.targetFunnelCategory).toBe("SEVERE_DECAY");
      expect(deepWr.targetShareMultiplier).toBe(0.64);
      expect(deepWr.adjustedAdot).toBeLessThan(12.0);
    });
  });

  describe("Red Zone Opportunity Conversion (Factor A22)", () => {
    it("converts goal-line high value touches into Anytime TD probability", () => {
      const eliteTe = evaluateRedZoneOpportunityConversion({
        playerName: "Elite RedZone TE",
        position: "TE",
        redZoneTargetsPerGame: 2.2,
        insideFiveTargetsPerGame: 1.4,
        playerHeightInches: 77, // 6'5"
        playerWeightLbs: 250,
      });

      expect(eliteTe.highValueTouchScore).toBeGreaterThan(50);
      expect(eliteTe.anytimeTdConversionProbability).toBeGreaterThan(0.40);
      expect(eliteTe.goalLineEfficiencyTier).toBe("ELITE_CONVERTER");
      expect(eliteTe.marketImpliedBreakevenOdds).toBeDefined();
    });
  });

  describe("Temperature and Precipitation Weather Friction (Factor A25)", () => {
    it("immunizes domes and heavily penalizes freezing snow storms", () => {
      const dome = evaluateTemperaturePrecipitationDecay({
        temperatureFahrenheit: 10,
        precipitationType: "SNOW",
        isDomeVenue: true,
        baselinePassingYards: 250,
        baselineGameTotal: 45.5,
      });
      const blizzard = evaluateTemperaturePrecipitationDecay({
        temperatureFahrenheit: 18,
        precipitationType: "SNOW",
        isDomeVenue: false,
        baselinePassingYards: 250,
        baselineGameTotal: 45.5,
      });

      expect(dome.weatherRegime).toBe("DOME_CONTROLLED");
      expect(dome.passingYardsAdjustment).toBe(0);
      expect(dome.gameTotalPointsAdjustment).toBe(0);

      expect(blizzard.weatherRegime).toBe("DEEP_FREEZE_PRECIP");
      expect(blizzard.passingYardsAdjustment).toBeLessThan(-35);
      expect(blizzard.gameTotalPointsAdjustment).toBeLessThan(-6);
      expect(blizzard.turnoverVolatilityMultiplier).toBeGreaterThan(1.4);
    });
  });

  describe("Rookie Breakout Cohort Curve (Factor A28)", () => {
    it("triggers breakout acceleration for early round rookie post-bye in week 7", () => {
      const rookie = evaluateRookieBreakoutCohort({
        rookieDraftRound: 1,
        currentWeekOfSeason: 7,
        hasHadByeWeek: true,
        isImmediatelyPostBye: true,
        baselineTargetShare: 0.14,
        baselineRouteParticipation: 0.65,
        depthChartRank: 2,
      });

      expect(rookie.breakoutPhase).toBe("INFLECTION_SURGE");
      expect(rookie.targetShareMultiplier).toBe(1.25);
      expect(rookie.postByeAccelerationBonusPp).toBe(4.8);
      expect(rookie.isPrimeBreakoutCandidate).toBe(true);
      expect(rookie.adjustedTargetShare).toBeGreaterThan(0.20);
    });
  });
});
