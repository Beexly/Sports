import { describe, expect, it } from "vitest";
import {
  estimateStudentTEpaAbility,
  evaluateQbGiniVolatilityMultiplier,
  computeDefensiveWr1SplitAdjustment,
  decomposePenaltyEpaShrinkage,
  computeShrunkIndividualHfa,
  computeNeutralPassTendencyOverExpected,
  computeRerunPuntFieldPositionDelta,
  buildReceiverPropQuantileDistribution,
  evaluateRbHighValueTouchTrap,
  applyQuarterbackAndRoomAttritionToReceiver,
  applySingleGameVarianceCompressionToRatingEdge,
} from "./oct24-intel-master-kernels.js";

describe("oct24-intel-master-kernels (OSF + Oct 20-24 X-Research Kernels)", () => {
  it("OSF #4: estimateStudentTEpaAbility downweights extreme single-game EPA outliers", () => {
    // 5 normal games around +0.08 EPA/play and 1 extreme blowout outlier (+0.75)
    const sample = [0.06, 0.09, 0.07, 0.08, 0.10, 0.75];
    const res = estimateStudentTEpaAbility(sample, 5, 0, 1.5);
    expect(res.shrunkEpa).toBeLessThan(res.sampleMean);
    expect(res.shrunkEpa).toBeGreaterThan(0.05);
    expect(res.downweightedOutlierGames).toBeGreaterThanOrEqual(1);
  });

  it("OSF #2: evaluateQbGiniVolatilityMultiplier computes shifted Gini and VOLoe SD multiplier", () => {
    const volatileSample = Array.from({ length: 120 }, (_, i) => (i % 3 === 0 ? -1.4 : i % 3 === 1 ? 2.1 : 0.1));
    const res = evaluateQbGiniVolatilityMultiplier(volatileSample);
    expect(res.gini).toBeGreaterThan(0.2);
    expect(res.gameScriptSdMultiplier).toBeGreaterThanOrEqual(0.88);
    expect(res.gameScriptSdMultiplier).toBeLessThanOrEqual(1.22);
  });

  it("OSF #3: computeDefensiveWr1SplitAdjustment shrinks WR1 suppression and computes funnel boost", () => {
    // Defense locks down WR1 (32 targets in 210 attempts = 15.2%, -0.05 EPA/target)
    const res = computeDefensiveWr1SplitAdjustment(32, 210, -0.05);
    expect(res.wr1TargetShareMultiplier).toBeLessThan(1.0);
    expect(res.wr1EpaDelta).toBeLessThan(0);
    expect(res.secondaryAncillaryFunnelBoost).toBeGreaterThan(1.0);
  });

  it("OSF #10: decomposePenaltyEpaShrinkage shrinks coverage penalties (r=0.08) much harder than procedural (r=0.35)", () => {
    const res = decomposePenaltyEpaShrinkage({
      coveragePenaltyEpaPerSnap: -0.055,
      proceduralPenaltyRate: 0.060,
      coverageSnaps: 220,
      defensiveSnaps: 380,
    });
    expect(res.coverageWeight).toBeCloseTo(0.08, 4);
    expect(res.proceduralWeight).toBeCloseTo(0.35, 4);
    expect(Math.abs(res.shrunkCoverageEpa - -0.018)).toBeLessThan(Math.abs(-0.055 - -0.018) * 0.15);
  });

  it("OSF #11: computeShrunkIndividualHfa returns 0.0 on neutral site (Paris PIT vs NO) and shrinks home HFA", () => {
    const paris = computeShrunkIndividualHfa({
      team: "NO",
      observedHfaPoints: 2.8,
      homeGamesSample: 3,
      isNeutralSite: true,
    });
    expect(paris.effectiveHfaPoints).toBe(0);
    expect(paris.isNeutralSite).toBe(true);

    const minHome = computeShrunkIndividualHfa({
      team: "MIN",
      observedHfaPoints: 4.5,
      homeGamesSample: 3,
      isNeutralSite: false,
    });
    expect(minHome.effectiveHfaPoints).toBeGreaterThan(1.85);
    expect(minHome.effectiveHfaPoints).toBeLessThan(4.5);
  });

  it("OSF #16 & #17: computeNeutralPassTendencyOverExpected and computeRerunPuntFieldPositionDelta", () => {
    const proe = computeNeutralPassTendencyOverExpected(0.62, 1, 10, 65, 0, 1200);
    expect(proe.proe).toBeGreaterThan(0);
    expect(proe.shrunkProe).toBeCloseTo(proe.proe * 0.72, 5);

    const rerun = computeRerunPuntFieldPositionDelta({
      offensePuntNetOverExpectedYards: 2.4,
      defensePuntReturnOverExpectedYards: -1.1,
      expectedPuntsPerTeam: 4.0,
    });
    expect(rerun.netFieldPositionDeltaYards).toBeCloseTo(14.0, 4);
    expect(rerun.expectedPointsDelta).toBeCloseTo(14.0 * 0.042, 4);
  });

  it("OSF #19 & @FantasyProsLabs: buildReceiverPropQuantileDistribution and applyQuarterbackAndRoomAttritionToReceiver", () => {
    // Zay Flowers with Lamar Jackson OUT (Tyler Huntley starting)
    const flowers = applyQuarterbackAndRoomAttritionToReceiver({
      baseTargets: 8.4,
      baseCatchProbability: 0.67,
      baseAdot: 9.8,
      baseExpectedYac: 4.6,
      startingQbOut: true,
      backupQbEpaDelta: -0.18,
      vacatedTeammateTargetShare: 0.0,
      healthyRoomAbsorptionWeight: 0.35,
    });
    expect(flowers.adjustedTargets).toBeLessThan(8.4);
    expect(flowers.adjustedCatchProbability).toBeLessThan(0.67);
    expect(flowers.distribution.p50Yards).toBeLessThan(flowers.distribution.meanYards);

    // Drake London / Cade Otton with massive vacated teammate target share (Evans/Deebo OUT)
    const london = applyQuarterbackAndRoomAttritionToReceiver({
      baseTargets: 8.2,
      baseCatchProbability: 0.65,
      baseAdot: 11.2,
      baseExpectedYac: 3.8,
      startingQbOut: false,
      vacatedTeammateTargetShare: 0.24,
      healthyRoomAbsorptionWeight: 0.42,
      elevatedToPrimaryBracket: true,
    });
    expect(london.adjustedTargets).toBeGreaterThan(8.2);
    expect(london.distribution.p90Yards).toBeGreaterThan(london.distribution.p50Yards);
    expect(london.distribution.probOverLine(64.5)).toBeGreaterThan(0.45);
  });

  it("OSF #25 & @timo_nfl: evaluateRbHighValueTouchTrap and applySingleGameVarianceCompressionToRatingEdge", () => {
    const bijan = evaluateRbHighValueTouchTrap({
      totalCarries: 16,
      insideTenCarries: 3,
      targets: 6,
    });
    expect(bijan.highValueTouches).toBe(9);
    expect(bijan.roleClassification).toBe("high-value-satellite");

    const compressed = applySingleGameVarianceCompressionToRatingEdge({
      staticSeasonSpreadMargin: 5.5, // BAL favored by season-long DVOA
      matchupTrenchAndInjuryMargin: -3.2, // CIN favored with Lamar Jackson OUT
      acuteInjuryShockMagnitudePts: 6.5,
    });
    expect(compressed.staticWeight).toBeLessThan(0.30);
    expect(compressed.blendedSpreadMargin).toBeLessThan(0);
  });
});
