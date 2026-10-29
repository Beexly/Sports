import { describe, it, expect } from "vitest";
import {
  computeRushConceptZoneGapMatchup,
  computeWrAlignmentSlotOutsideMatchup,
  evaluateSecondAndOneSneakAndBaseDefenseTrap,
  computeMismatchManifestoCombinedYbcAndExplosive,
  applyAltitudeSplitHalfReliabilityShrinkage,
  evaluateTacklePropAndInHouseRefereeCrewMix,
  computeFirstQuarterScriptStopMath,
} from "../x-consolidated-sweep-signals";

describe("X Consolidated Sweep Signals & High-Leverage Analytics Engine", () => {
  describe("1. @BeatTheRecords Rush Concept Splits (Zone vs Man/Gap)", () => {
    it("identifies ZONE_BLEED defense (e.g. GB allows 5.29 vs Zone #4, 2.57 vs Man/Gap #32)", () => {
      const result = computeRushConceptZoneGapMatchup({
        offZoneSharePct: 65,
        offGapSharePct: 35,
        offZoneYpc: 4.8,
        offGapYpc: 3.9,
        defZoneYpcAllowed: 5.29,
        defGapYpcAllowed: 2.57,
        projectedCarries: 18,
      });

      expect(result.primaryExploitConcept).toBe("ZONE_BLEED");
      expect(result.expectedConceptYpc).toBeGreaterThan(4.3);
      expect(result.conceptYpcDelta).toBeGreaterThan(0);
      expect(result.rushYardsAdjustment).toBeGreaterThan(0);
    });

    it("identifies MAN_GAP_BLEED defense (e.g. CAR allows 5.71 vs Man/Gap #1)", () => {
      const result = computeRushConceptZoneGapMatchup({
        offZoneSharePct: 30,
        offGapSharePct: 70,
        offZoneYpc: 4.1,
        offGapYpc: 4.9,
        defZoneYpcAllowed: 4.2,
        defGapYpcAllowed: 5.71,
        projectedCarries: 22,
      });

      expect(result.primaryExploitConcept).toBe("MAN_GAP_BLEED");
      expect(result.conceptYpcDelta).toBeGreaterThan(0.5);
      expect(result.rushYardsAdjustment).toBeGreaterThan(7.0);
    });

    it("marks BALANCED defense when differential < 0.6", () => {
      const result = computeRushConceptZoneGapMatchup({
        offZoneSharePct: 50,
        offGapSharePct: 50,
        offZoneYpc: 4.3,
        offGapYpc: 4.3,
        defZoneYpcAllowed: 4.4,
        defGapYpcAllowed: 4.2,
        projectedCarries: 15,
      });

      expect(result.primaryExploitConcept).toBe("BALANCED");
      expect(result.expectedConceptYpc).toBeCloseTo(4.3, 2);
    });
  });

  describe("2. @BeatTheRecords WR Alignment Yards Allowed (Outside vs Slot)", () => {
    it("flags SLOT_BLEED for defenses leaking slot yardage (e.g. DAL 84.5 slot YPG #1 vs 84.2 outside #26)", () => {
      const result = computeWrAlignmentSlotOutsideMatchup({
        wrSlotSnapSharePct: 82,
        wrOutsideSnapSharePct: 18,
        defSlotYpgAllowed: 84.5,
        defOutsideYpgAllowed: 84.2,
        baseProjectedRecYards: 65,
      });

      expect(result.alignmentFunnelTag).toBe("SLOT_BLEED");
      expect(result.slotRatio).toBeCloseTo(84.5 / 54.0, 3);
      expect(result.outsideRatio).toBeCloseTo(84.2 / 98.0, 3);
      expect(result.receivingYardsAdjustment).toBeGreaterThan(10);
    });

    it("flags PERIMETER_BLEED for defenses bleeding outside WR yardage (e.g. JAX 156.8 outside YPG)", () => {
      const result = computeWrAlignmentSlotOutsideMatchup({
        wrSlotSnapSharePct: 15,
        wrOutsideSnapSharePct: 85,
        defSlotYpgAllowed: 48.0,
        defOutsideYpgAllowed: 156.8,
        baseProjectedRecYards: 80,
      });

      expect(result.alignmentFunnelTag).toBe("PERIMETER_BLEED");
      expect(result.outsideRatio).toBeCloseTo(156.8 / 98.0, 3);
      expect(result.receivingYardsAdjustment).toBeGreaterThan(20);
    });

    it("evaluates BALANCED when neither funnel exceeds 1.25x league ratio", () => {
      const result = computeWrAlignmentSlotOutsideMatchup({
        wrSlotSnapSharePct: 50,
        wrOutsideSnapSharePct: 50,
        defSlotYpgAllowed: 52.0,
        defOutsideYpgAllowed: 95.0,
        baseProjectedRecYards: 50,
      });

      expect(result.alignmentFunnelTag).toBe("BALANCED");
      expect(result.slotRatio).toBeLessThan(1.25);
      expect(result.outsideRatio).toBeLessThan(1.25);
    });
  });

  describe("3. @RyanPaganetti 2nd-and-1 Sneak Tax & Base Defense Trap", () => {
    it("computes 2nd-and-1 sneak opportunity tax EPA and flags Bears Base defense mismatch", () => {
      const result = evaluateSecondAndOneSneakAndBaseDefenseTrap({
        secondAndOneSneakRatePct: 45,
        offHeavyPersonnelRatePct: 32,
        defBasePersonnelYppAllowed: 7.6,
        defNickelYppAllowed: 5.1,
      });

      expect(result.sneakOpportunityTaxEpa).toBeCloseTo(-0.081, 3);
      expect(result.baseVsNickelYppGap).toBeCloseTo(2.5, 3);
      expect(result.isBaseDefenseTrap).toBe(true);
      expect(result.heavyPersonnelExploitPts).toBeGreaterThan(1.0);
    });

    it("suppresses heavy personnel exploit points when offense runs light or defense Base is stout", () => {
      const result = evaluateSecondAndOneSneakAndBaseDefenseTrap({
        secondAndOneSneakRatePct: 10,
        offHeavyPersonnelRatePct: 15,
        defBasePersonnelYppAllowed: 5.8,
        defNickelYppAllowed: 5.5,
      });

      expect(result.heavyPersonnelExploitPts).toBe(0);
      expect(result.isBaseDefenseTrap).toBe(false);
    });
  });

  describe("4. @ihartitz Mismatch Manifesto Combined YBC & Explosives", () => {
    it("calculates combined RB YBC/carry and explosive play rate adjustments", () => {
      const result = computeMismatchManifestoCombinedYbcAndExplosive({
        offYbcPerCarry: 3.4,
        defYbcAllowedPerCarry: 2.8,
        offExplosivePlayRatePct: 14.2,
        defExplosivePlayRateAllowedPct: 13.6,
      });

      expect(result.combinedYbcPerCarry).toBe(3.1);
      expect(result.combinedYbcEdge).toBe(0.65);
      expect(result.combinedExplosiveRatePct).toBe(13.9);
      expect(result.totalPointsAdjustment).toBeGreaterThan(1.5);
    });

    it("evaluates negative adjustments for trench mismatches favoring defenses", () => {
      const result = computeMismatchManifestoCombinedYbcAndExplosive({
        offYbcPerCarry: 1.8,
        defYbcAllowedPerCarry: 1.9,
        offExplosivePlayRatePct: 8.5,
        defExplosivePlayRateAllowedPct: 9.1,
      });

      expect(result.combinedYbcEdge).toBeLessThan(0);
      expect(result.totalPointsAdjustment).toBeLessThan(0);
    });
  });

  describe("5. @mockingboardapp Altitude Split-Half Reliability & xFP", () => {
    it("applies strict split-half reliability shrinkage by position", () => {
      const qb = applyAltitudeSplitHalfReliabilityShrinkage({
        position: "QB",
        observedSingleGameMetric: 0.35,
        priorBaselineMetric: 0.1,
      });
      expect(qb.reliabilityWeight).toBe(0.147);
      expect(qb.shrunkMetric).toBe(0.1367);

      const te = applyAltitudeSplitHalfReliabilityShrinkage({
        position: "TE",
        observedSingleGameMetric: 0.35,
        priorBaselineMetric: 0.1,
      });
      expect(te.reliabilityWeight).toBe(0.449);

      const wr = applyAltitudeSplitHalfReliabilityShrinkage({
        position: "WR",
        observedSingleGameMetric: 0.35,
        priorBaselineMetric: 0.1,
      });
      expect(wr.reliabilityWeight).toBe(0.356);

      const rb = applyAltitudeSplitHalfReliabilityShrinkage({
        position: "RB",
        observedSingleGameMetric: 0.35,
        priorBaselineMetric: 0.1,
      });
      expect(rb.reliabilityWeight).toBe(0.307);
    });

    it("computes Box Score Scout xFP opportunity baseline", () => {
      const opp = applyAltitudeSplitHalfReliabilityShrinkage({
        position: "WR",
        observedSingleGameMetric: 18.5,
        priorBaselineMetric: 12.0,
        routesRun: 36,
        airYards: 110,
        redZoneTargets: 3,
        insideFiveCarries: 1,
      });

      // routesRun*0.22 (7.92) + airYards*0.065 (7.15) + redZoneTargets*1.85 (5.55) + insideFiveCarries*2.4 (2.4) = 23.02
      expect(opp.xFpOpportunityScore).toBeCloseTo(23.02, 1);
    });
  });

  describe("6. @RyNoonan Tackle Props (>=5% Edge) & C-297 In-House Referee Crew", () => {
    it("triggers PLAY_OVER on >=5% positive edge", () => {
      const result = evaluateTacklePropAndInHouseRefereeCrewMix({
        projectedDefensiveSnaps: 68,
        playerTacklePerSnapRate: 0.14,
        tackleAssistConversionFactor: 0.85,
        marketTackleLine: 6.5,
        crewOffHoldingPerGame: 3.2,
        crewDpiPerGame: 1.8,
        crewHomeFlagDifferential: 1.5,
      });

      // 68 * 0.14 * 0.85 = 8.092 -> 8.09
      // Edge: (8.09 - 6.5)/6.5 = 24.46%
      expect(result.projectedTackles).toBe(8.09);
      expect(result.tackleEdgePct).toBeGreaterThan(5.0);
      expect(result.tacklePropDecision).toBe("PLAY_OVER");
      expect(result.crewSpreadHomeDelta).toBeLessThan(0);
    });

    it("triggers PLAY_UNDER on <=-5% negative edge and PASS inside buffer", () => {
      const underResult = evaluateTacklePropAndInHouseRefereeCrewMix({
        projectedDefensiveSnaps: 50,
        playerTacklePerSnapRate: 0.08,
        tackleAssistConversionFactor: 0.8,
        marketTackleLine: 5.5,
        crewOffHoldingPerGame: 2.6,
        crewDpiPerGame: 1.1,
        crewHomeFlagDifferential: 0,
      });
      // 50 * 0.08 * 0.8 = 3.2
      // Edge: (3.2 - 5.5)/5.5 = -41.82%
      expect(underResult.tacklePropDecision).toBe("PLAY_UNDER");

      const passResult = evaluateTacklePropAndInHouseRefereeCrewMix({
        projectedDefensiveSnaps: 60,
        playerTacklePerSnapRate: 0.1,
        tackleAssistConversionFactor: 1.0,
        marketTackleLine: 6.0,
        crewOffHoldingPerGame: 2.6,
        crewDpiPerGame: 1.1,
        crewHomeFlagDifferential: 0,
      });
      // 6.0 vs 6.0 = 0% edge
      expect(passResult.tacklePropDecision).toBe("PASS");
    });
  });

  describe("7. @thelocktalk 1Q Structures: The Script, The Stop & The 1Q Math", () => {
    it("signals 1Q_HOME_SCRIPT when home scripted drive EPA heavily outclasses opponent", () => {
      const result = computeFirstQuarterScriptStopMath({
        fullGameSpreadHome: -3.5,
        fullGameTotal: 47.5,
        homeOpeningScriptEpaPerPlay: 0.32,
        awayOpeningScriptEpaPerPlay: 0.05,
        homeFirstDriveStopRatePct: 55.0,
        awayFirstDriveStopRatePct: 58.0,
      });

      expect(result.scriptEdgePtsHome).toBeGreaterThanOrEqual(0.45);
      expect(result.scriptStopVerdict).toBe("1Q_HOME_SCRIPT");
      expect(result.fair1QSpreadHome).toBeLessThan(0);
    });

    it("signals 1Q_UNDER_STOP when stout opening drive defenses suppress 1Q scoring", () => {
      const result = computeFirstQuarterScriptStopMath({
        fullGameSpreadHome: 1.5,
        fullGameTotal: 42.0,
        homeOpeningScriptEpaPerPlay: 0.02,
        awayOpeningScriptEpaPerPlay: 0.01,
        homeFirstDriveStopRatePct: 72.0,
        awayFirstDriveStopRatePct: 68.0,
      });

      // (70 - 58) * 0.045 = 12 * 0.045 = 0.54 >= 0.40
      expect(result.stopSuppressionPts).toBeGreaterThanOrEqual(0.4);
      expect(result.scriptStopVerdict).toBe("1Q_UNDER_STOP");
      expect(result.fair1QTotal).toBeLessThan(8.4);
    });

    it("signals PASS when neither script nor stop edges clear thresholds", () => {
      const result = computeFirstQuarterScriptStopMath({
        fullGameSpreadHome: -1.0,
        fullGameTotal: 45.0,
        homeOpeningScriptEpaPerPlay: 0.1,
        awayOpeningScriptEpaPerPlay: 0.08,
        homeFirstDriveStopRatePct: 58.0,
        awayFirstDriveStopRatePct: 58.0,
      });

      expect(result.scriptStopVerdict).toBe("PASS");
    });
  });
});
