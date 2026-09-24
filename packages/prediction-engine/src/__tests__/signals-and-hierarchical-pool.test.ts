import { describe, it, expect } from "vitest";
import { calculateWindElasticity } from "../signals/environment/wind-elasticity";
import { evaluateCoachingTendencies } from "../signals/situational/coaching-tendencies";
import { analyzeInjuryTrajectory } from "../signals/bio/injury-trajectory";
import { evaluateRedZoneTeLeverage } from "../signals/efficiency/redzone-te-leverage";
import { poolSignalsHierarchically, IndividualSignalInput } from "../hierarchical-pool";

describe("Signals & Hierarchical Pooling Suite", () => {
  describe("calculateWindElasticity", () => {
    it("returns zero impact for indoor dome or closed retractable roof", () => {
      const res = calculateWindElasticity({
        sustainedWindMph: 28,
        gustMph: 40,
        isDomeOrRetractableClosed: true,
      });
      expect(res.effectiveWindMph).toBe(0);
      expect(res.passingYardsMultiplier).toBe(1.0);
      expect(res.passingCompletionDelta).toBe(0.0);
      expect(res.fieldGoalAccuracyDelta).toBe(0.0);
      expect(res.rushingVolumeMultiplier).toBe(1.0);
      expect(res.expectedTotalPointsAdjustment).toBe(0.0);
    });

    it("returns baseline values for calm wind below 7 mph", () => {
      const res = calculateWindElasticity({
        sustainedWindMph: 5,
        gustMph: 6,
      });
      expect(res.effectiveWindMph).toBe(5.5);
      expect(res.passingYardsMultiplier).toBe(1.0);
      expect(res.passingCompletionDelta).toBe(0.0);
    });

    it("applies convex decay and rushing volume shift at severe wind (20+ mph)", () => {
      const res = calculateWindElasticity({
        sustainedWindMph: 22,
        gustMph: 28,
        direction: "CROSSWIND",
        isVisitor: true,
      });
      // Effective wind = 22 + 0.5 * 6 = 25 mph
      expect(res.effectiveWindMph).toBe(25.0);
      expect(res.passingYardsMultiplier).toBeLessThan(0.80);
      expect(res.passingCompletionDelta).toBeLessThan(-4.0);
      expect(res.fieldGoalAccuracyDelta).toBeLessThan(-0.08);
      expect(res.fieldGoalRangeShrinkageYards).toBeGreaterThanOrEqual(7.0);
      expect(res.rushingVolumeMultiplier).toBeGreaterThan(1.10);
      expect(res.expectedTotalPointsAdjustment).toBeLessThan(-4.0);
    });
  });

  describe("evaluateCoachingTendencies", () => {
    it("correctly identifies 2nd-and-10 run-after-pass alternation bias", () => {
      const res = evaluateCoachingTendencies({
        down: 2,
        distance: 10,
        previousPlayType: "PASS",
        previousPlayGain: 0,
      });
      expect(res.baselineRunProbability).toBe(0.32);
      expect(res.runAlternationDelta).toBe(0.19);
      expect(res.expectedRunProbability).toBe(0.51);
    });

    it("evaluates 4th-down conversion EV edge for aggressive coaches", () => {
      const res = evaluateCoachingTendencies({
        down: 4,
        distance: 1,
        coachAggressivenessScore: 0.90, // Dan Campbell tier
      });
      expect(res.fourthDownGoForItEdgeEv).toBeGreaterThan(0.2);
    });

    it("applies late-half scoring suppression on road teams due to depleted timeouts", () => {
      const res = evaluateCoachingTendencies({
        down: 1,
        distance: 10,
        isRoadTeam: true,
        halfSecondsRemaining: 75,
      });
      expect(res.lateHalfScoringAdjustmentRoad).toBe(-1.65);
    });
  });

  describe("analyzeInjuryTrajectory", () => {
    it("marks official OUT with 0% play probability", () => {
      const res = analyzeInjuryTrajectory({
        officialStatus: "OUT",
        positionTier: "QB_STARTER",
      });
      expect(res.estimatedPlayProbability).toBe(0.0);
      expect(res.trajectoryTrend).toBe("STATIC_INJURED");
      expect(res.spreadImpactPointsIfOut).toBe(4.5);
    });

    it("identifies veteran rest (DNP_NIR on Wed, FP on Fri)", () => {
      const res = analyzeInjuryTrajectory({
        wednesday: "DNP_NIR",
        friday: "FP",
        positionTier: "RB_BELLCOW",
      });
      expect(res.estimatedPlayProbability).toBe(0.98);
      expect(res.trajectoryTrend).toBe("VETERAN_REST");
    });

    it("detects early-warning downgrade (FP Wed -> DNP Thu)", () => {
      const res = analyzeInjuryTrajectory({
        wednesday: "FP",
        thursday: "DNP",
        positionTier: "WR1_ELITE",
      });
      expect(res.hasEarlyWarningDowngrade).toBe(true);
      expect(res.trajectoryTrend).toBe("DETERIORATING");
      expect(res.estimatedPlayProbability).toBe(0.18);
    });

    it("identifies retail market fade edge on Questionable tag with Friday FP", () => {
      const res = analyzeInjuryTrajectory({
        wednesday: "LP",
        thursday: "FP",
        friday: "FP",
        officialStatus: "QUESTIONABLE",
        positionTier: "LT_ANCHOR",
      });
      expect(res.estimatedPlayProbability).toBe(0.88);
      expect(res.marketOverreactionFadePoints).toBeGreaterThan(0.5);
    });
  });

  describe("evaluateRedZoneTeLeverage", () => {
    it("identifies ELITE matchup advantage for high RZ target share vs vulnerable defense", () => {
      const res = evaluateRedZoneTeLeverage({
        teamRedZoneDrivesPerGame: 3.8,
        teamRedZoneTdConversionRate: 0.68,
        tightEndRedZoneTargetShare: 0.33,
        opponentAllowedRedZoneTdRate: 0.70,
        opponentTeAllowedDvoaRank: 31,
      });
      expect(res.targetShareLeverageRatio).toBe(2.2);
      expect(res.matchupAdvantageGrade).toBe("ELITE");
      expect(res.tightEndTouchdownProbability).toBeGreaterThan(0.40);
      expect(res.anytimeTdFairValueDecimal).toBeLessThan(2.50);
    });
  });

  describe("poolSignalsHierarchically", () => {
    it("handles 400 null votes cleanly with strict silence and evidence shrinkage", () => {
      const activeSignals: IndividualSignalInput[] = [
        {
          signalId: "wind_pass_decay",
          family: "MICROCLIMATE",
          estimatedEdge: -0.15,
          sampleSize: 200,
          isEligible: true,
        },
        {
          signalId: "coaching_run_spike",
          family: "SITUATIONAL",
          estimatedEdge: -0.12,
          sampleSize: 150,
          isEligible: true,
        },
      ];

      // Simulate 400 abstaining signals
      const nullVotes: (IndividualSignalInput | null)[] = new Array(400).fill(null);
      const allSignals = [...activeSignals, ...nullVotes];

      const pool = poolSignalsHierarchically(allSignals, 0.50);

      expect(pool.totalActiveSignals).toBe(2);
      expect(pool.activeFamilyCount).toBe(2);
      expect(pool.agreementLevel).toBe("CONSENSUS");
      // Evidence shrinkage must shrink the raw ensemble toward market prior
      expect(Math.abs(pool.blendedEdge)).toBeLessThan(Math.abs(pool.rawEnsembleEdge));
      expect(pool.shrinkageFactor).toBeGreaterThan(0.0);
      expect(pool.shrinkageFactor).toBeLessThan(0.20); // Low evidence -> high shrinkage
      expect(pool.calibratedWinProbability).toBeCloseTo(0.49, 1);
    });

    it("identifies STRONG_CONVERGENCE when 4+ families agree", () => {
      const multiFamilySignals: IndividualSignalInput[] = [
        { signalId: "s1", family: "MARKET", estimatedEdge: 0.18, isEligible: true },
        { signalId: "s2", family: "EFFICIENCY", estimatedEdge: 0.22, isEligible: true },
        { signalId: "s3", family: "TRENCHES", estimatedEdge: 0.15, isEligible: true },
        { signalId: "s4", family: "SITUATIONAL", estimatedEdge: 0.12, isEligible: true },
      ];

      const pool = poolSignalsHierarchically(multiFamilySignals, 0.50);

      expect(pool.activeFamilyCount).toBe(4);
      expect(pool.agreementLevel).toBe("STRONG_CONVERGENCE");
      expect(pool.blendedEdge).toBeGreaterThan(0.02);
      expect(pool.calibratedWinProbability).toBeGreaterThan(0.50);
    });
  });
});
