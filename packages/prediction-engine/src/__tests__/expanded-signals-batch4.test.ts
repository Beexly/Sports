import { describe, it, expect } from "vitest";
import { evaluateFourthDownCoachingAggressiveness } from "../signals/situational/fourth-down-coaching-aggressiveness";
import { evaluatePenaltyDifferentialMomentum } from "../signals/discipline/penalty-differential-momentum";
import { evaluateByeWeekDefensiveInstallation } from "../signals/schematic/bye-week-defensive-installation";
import { evaluateRedZonePersonnelGrouping } from "../signals/tactical/redzone-personnel-grouping";
import { evaluateTurfSurfaceFatigue } from "../signals/biomechanical/turf-surface-fatigue";

describe("Expanded Elite Research Signals Batch 4", () => {
  describe("Fourth Down Coaching Aggressiveness (Factor A13)", () => {
    it("rewards analytics-aggressive coaches on 4th down and penalizes punt-first coaches", () => {
      const aggressive = evaluateFourthDownCoachingAggressiveness({
        coachName: "Dan Campbell",
        fourthDownGoRateOverExpected: 0.16,
        redZoneFourthDownGoRate: 0.75,
        scoreDifferential: 0,
        quarter: 2,
      });
      const conservative = evaluateFourthDownCoachingAggressiveness({
        coachName: "Conservative Coach",
        fourthDownGoRateOverExpected: -0.12,
        redZoneFourthDownGoRate: 0.25,
        scoreDifferential: 0,
        quarter: 2,
      });

      expect(aggressive.aggressivenessTier).toBe("ANALYTICS_AGGRESSIVE");
      expect(aggressive.expectedGoProbabilityOnFourthAndShort).toBeGreaterThan(0.60);
      expect(aggressive.gameTotalPointsElasticity).toBeGreaterThan(1.0);
      expect(aggressive.winProbabilityOptimizationBonus).toBeGreaterThan(0.015);

      expect(conservative.aggressivenessTier).toBe("CONSERVATIVE_PUNT_FIRST");
      expect(conservative.gameTotalPointsElasticity).toBeLessThan(0);
      expect(conservative.winProbabilityOptimizationBonus).toBeLessThan(0);
    });
  });

  describe("Penalty Differential & Drive Momentum (Factor A14)", () => {
    it("awards spread points to disciplined teams with positive net penalty margins", () => {
      const disciplined = evaluatePenaltyDifferentialMomentum({
        teamName: "Disciplined Team",
        opponentName: "Sloppy Team",
        rollingFiveGameNetPenaltyYards: -28, // team commits 28 fewer yards than opponent
        teamPreSnapFoulsPerGame: 1.2,
        opponentPreSnapFoulsPerGame: 3.4,
        teamDpiBeneficiaryYardsPerGame: 24.5,
        opponentDpiBeneficiaryYardsPerGame: 8.0,
      });

      expect(disciplined.disciplineTier).toBe("ELITE_DISCIPLINE");
      expect(disciplined.netPenaltyYardAdvantage).toBe(28);
      expect(disciplined.expectedSpreadAdjustmentPoints).toBeGreaterThan(1.5);
      expect(disciplined.driveStallRiskScore).toBeLessThan(40);
    });
  });

  describe("Bye-Week Defensive Installation (Factor A16)", () => {
    it("quantifies master defensive coordinator disruption on opponent first half", () => {
      const masterDc = evaluateByeWeekDefensiveInstallation({
        defensiveCoordinatorName: "Steve Spagnuolo",
        coordinatorPedigreeTier: "ELITE_ARCHITECT",
        daysOfPreparation: 14,
        opponentQbExperienceSeasons: 1, // rookie QB
      });

      expect(masterDc.extendedPrepActive).toBe(true);
      expect(masterDc.opponentFirstHalfEpaDelta).toBeLessThan(-0.09);
      expect(masterDc.opponentThirdDownConversionPenaltyPp).toBeLessThan(-10);
      expect(masterDc.firstHalfTotalPointsDelta).toBeLessThan(-3.0);
      expect(masterDc.defensiveConfusionTier).toBe("MAXIMUM_CONFUSION");
    });
  });

  describe("Red Zone Personnel Grouping (Factor A23)", () => {
    it("identifies heavy run leverage and TE target boost in 12 personnel", () => {
      const twelve = evaluateRedZonePersonnelGrouping({
        primaryRedZonePersonnelGrouping: "TWELVE_12",
        offensiveLineRunBlockGrade: 78,
        opponentDefensiveFrontSevenGrade: 65,
        goalLineDistanceYards: 2.5,
      });

      expect(twelve.expectedRunProbability).toBeGreaterThan(0.65);
      expect(twelve.rbTouchdownShareModifier).toBeGreaterThan(1.15);
      expect(twelve.teTargetShareBonus).toBeGreaterThan(0.20);
      expect(twelve.defensivePersonnelMismatchTier).toBe("HEAVY_RUN_LEVERAGE");
    });
  });

  describe("Turf Surface Fatigue & Lower Extremity Decay (Factor A27)", () => {
    it("penalizes heavy veteran running backs on slit-film synthetic turf", () => {
      const slitFilm = evaluateTurfSurfaceFatigue({
        playingSurface: "SLIT_FILM_TURF",
        playerWeightLbs: 228,
        playerAge: 29,
        baselineYardsPerCarry: 4.4,
        expectedTouches: 22,
      });
      const grass = evaluateTurfSurfaceFatigue({
        playingSurface: "NATURAL_BERMUDA_GRASS",
        playerWeightLbs: 228,
        playerAge: 29,
        baselineYardsPerCarry: 4.4,
        expectedTouches: 22,
      });

      expect(slitFilm.surfaceFrictionTier).toBe("HIGH_TRACTION_FATIGUE");
      expect(slitFilm.fourthQuarterYacDelta).toBeLessThan(-0.50);
      expect(slitFilm.lateGameExplosiveRunDecayMultiplier).toBeLessThan(0.80);
      expect(slitFilm.lowerBodySoftTissueFatigueIndex).toBeGreaterThan(90);

      expect(grass.surfaceFrictionTier).toBe("COMPLIANT_NATURAL");
      expect(grass.fourthQuarterYacDelta).toBeGreaterThan(0);
      expect(grass.adjustedYardsPerCarry).toBeGreaterThan(slitFilm.adjustedYardsPerCarry);
    });
  });
});
