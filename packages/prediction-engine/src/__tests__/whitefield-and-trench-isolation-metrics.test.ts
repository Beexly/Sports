import { describe, expect, it } from "vitest";
import { correlation } from "../nfl/osf-math-core.js";
import {
  classifyPassRushCoverageRegime,
  computeGarbageTimeAdjustedQbrProxy,
  computeNonSneakSuccessRateGuard,
  computeQbProgressionAndSuccessSplit,
  computeRbCreationVsLineAndBellcowTrend,
  computeStrictForcedMissedTackleIndex,
  computeTrenchIsolationPbwrRbwr,
  computeTrueRoutesRunAndAssBreakout,
  evaluateBellcowTrajectorySlope,
  evaluateSchemeConceptMatchupMatrix,
  evaluateWhitefieldTrenchIsolationBundle,
  validateCrossChartingConsistency,
} from "../nfl/whitefield-and-trench-isolation-metrics.js";
import {
  computePreProjectionAndSimulationConditionedOverlay,
  PROBABILITY_MOVEMENT_CAP,
  runMasterSituationalReasoningOverlay,
} from "../nfl/master-situational-reasoning-aggregator.js";

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

describe("Whitefield ASS/True-Routes & 2.5s Trench Isolation Metrics (Stream 15M)", () => {
  it("isolates 2.5s OL PBWR failures from >3.0s QB late-hold sacks", () => {
    const eliteOlBadQb = computeTrenchIsolationPbwrRbwr({
      dropbacks: 300,
      olQuickPressuresUnder25Sec: 36,
      qbLateSacksOver30Sec: 21,
      olBlocksHeld25SecPlus: 216,
      rushSnaps: 220,
      rushBlocksWon: 162,
    });
    expect(eliteOlBadQb.pbwr).toBeCloseTo(0.72, 4);
    expect(eliteOlBadQb.olTrueQuickPressureRate).toBeCloseTo(0.12, 4);
    expect(eliteOlBadQb.qbSelfInflictedSackShare).toBeGreaterThan(0.35);
    expect(eliteOlBadQb.trenchIsolationEpaDelta).toBeGreaterThan(0);
  });

  it("decomposes RB YAC/FMT creation from OL YBC and computes multi-read QB sustainability", () => {
    const rb = computeRbCreationVsLineAndBellcowTrend({
      carries: 100,
      yardsBeforeContactTotal: 140,
      yardsAfterContactTotal: 340,
      forcedMissedTackles: 28,
      explosiveRuns10Plus: 15,
      weeklyInvolvementShares: [0.42, 0.56, 0.70],
    });
    expect(rb.ybcPerAtt).toBeCloseTo(1.4, 4);
    expect(rb.yacPerAtt).toBeCloseTo(3.4, 4);
    expect(rb.rbCreationShareRatio).toBeGreaterThan(0.68);
    expect(rb.bellcowTrendSlope).toBeCloseTo(0.14, 4);

    const qbStrong = computeQbProgressionAndSuccessSplit({
      epaPositiveRate: 0.52,
      situationalYardsSuccessRate: 0.50,
      firstReadEpa: 0.22,
      secondaryReadEpa: 0.11,
      scrambleDrillEpa: 0.14,
      checkdownRate: 0.06,
    });
    const qbFragile = computeQbProgressionAndSuccessSplit({
      epaPositiveRate: 0.43,
      situationalYardsSuccessRate: 0.41,
      firstReadEpa: 0.28,
      secondaryReadEpa: -0.22,
      scrambleDrillEpa: -0.15,
      checkdownRate: 0.24,
    });
    expect(qbStrong.sustainabilityIndex).toBeGreaterThan(qbFragile.sustainabilityIndex);
    expect(qbStrong.qbProgressionEpaDelta).toBeGreaterThan(qbFragile.qbProgressionEpaDelta);
  });

  it("OPTIMIZATION 1: TE True Routes Run strips blocking snaps and cuts YPRR MSE by >= 60%", () => {
    const rng = createMulberry32(20261119);
    const nTe = 300;
    let mseNaive = 0;
    let mseTrue = 0;

    for (let i = 0; i < nTe; i += 1) {
      const trueAbilityYprr = 1.6 + 0.45 * sampleNormal(rng);
      const trueRoutes = Math.round(140 + 40 * rng());
      const passBlock = Math.round(25 + 35 * rng());
      const screenBlock = Math.round(10 + 18 * rng());
      const yards = Math.max(0, trueAbilityYprr * trueRoutes + 18 * sampleNormal(rng));
      const res = computeTrueRoutesRunAndAssBreakout({
        totalPassSnaps: trueRoutes + passBlock + screenBlock,
        passBlockSnaps: passBlock,
        screenBlockSnaps: screenBlock,
        targets: Math.round(trueRoutes * 0.22),
        receivingYards: yards,
        firstDowns: Math.round(trueRoutes * 0.09),
        averageSeparationScore: 0.05,
      });
      mseNaive += (res.naiveYprr - trueAbilityYprr) ** 2;
      mseTrue += (res.trueYprr - trueAbilityYprr) ** 2;
    }

    const gain = (mseNaive - mseTrue) / mseNaive;
    expect(gain).toBeGreaterThanOrEqual(0.6);
  });

  it("OPTIMIZATION 2: 2.5s Trench Isolation beats raw sack rate MSE on next-game true pressure by >= 25%", () => {
    const rng = createMulberry32(88421);
    const n = 350;
    let mseRawSackNoise = 0;
    let mseTrenchIso = 0;

    for (let i = 0; i < n; i += 1) {
      const trueOlPressure = Math.max(0.10, Math.min(0.32, 0.21 + 0.035 * sampleNormal(rng)));
      const dropbacks = 280;
      const olQuick = Math.max(0, Math.round(trueOlPressure * dropbacks + 6 * sampleNormal(rng)));
      const qbLate = Math.max(0, Math.round(12 + 9 * rng()));
      // Raw contaminated rate mixes QB late-hold sacks directly onto OL blame
      const rawContaminatedRate = (olQuick + qbLate * 1.4) / dropbacks;
      const res = computeTrenchIsolationPbwrRbwr({
        dropbacks,
        olQuickPressuresUnder25Sec: olQuick,
        qbLateSacksOver30Sec: qbLate,
        olBlocksHeld25SecPlus: dropbacks - olQuick,
        rushSnaps: 210,
        rushBlocksWon: 147,
      });
      mseRawSackNoise += (rawContaminatedRate - trueOlPressure) ** 2;
      mseTrenchIso += (res.projectedTruePressureRate - trueOlPressure) ** 2;
    }

    const gain = (mseRawSackNoise - mseTrenchIso) / mseRawSackNoise;
    expect(gain).toBeGreaterThanOrEqual(0.25);
  });

  it("OPTIMIZATION 3: ASS + 1D/RR leading indicator lowers next-4-week target RMSE vs lagging yards by >= 20%", () => {
    const rng = createMulberry32(55109);
    const n = 300;
    let sqLagging = 0;
    let sqAssModel = 0;
    const futures: number[] = [];
    const laggings: number[] = [];
    const assPreds: number[] = [];

    for (let i = 0; i < n; i += 1) {
      const ass = Math.max(-0.3, Math.min(0.35, 0.08 + 0.14 * sampleNormal(rng)));
      const trueRoutes = 180;
      const fdRate = Math.max(0.03, Math.min(0.18, 0.09 + 0.20 * ass + 0.02 * sampleNormal(rng)));
      const futureShare = Math.max(0.08, Math.min(0.38, 0.20 + 0.28 * ass + 0.25 * (fdRate - 0.09) + 0.015 * sampleNormal(rng)));
      const noisyLaggingShare = futureShare + 0.055 * sampleNormal(rng);

      const res = computeTrueRoutesRunAndAssBreakout({
        totalPassSnaps: 195,
        passBlockSnaps: 10,
        screenBlockSnaps: 5,
        targets: Math.round(trueRoutes * 0.20),
        receivingYards: 295,
        firstDowns: Math.round(trueRoutes * fdRate),
        averageSeparationScore: ass,
      });
      const assPredShare = 0.20 + res.projectedNextTargetShareBoost;
      futures.push(futureShare);
      laggings.push(noisyLaggingShare);
      assPreds.push(assPredShare);
      sqLagging += (noisyLaggingShare - futureShare) ** 2;
      sqAssModel += (assPredShare - futureShare) ** 2;
    }

    const rmseLagging = Math.sqrt(sqLagging / n);
    const rmseAss = Math.sqrt(sqAssModel / n);
    const reduction = (rmseLagging - rmseAss) / rmseLagging;
    expect(reduction).toBeGreaterThanOrEqual(0.2);
    expect(correlation(assPreds, futures)).toBeGreaterThan(correlation(laggings, futures));
  });

  it("wires Stream 15M live into Master Aggregator and enforces PASS discipline", () => {
    const res = computePreProjectionAndSimulationConditionedOverlay({
      awayTeam: "DET",
      homeTeam: "SF",
      week: 11,
      marketAnchorProb: 0.55,
      independentEdgeDecision: "PASS",
      whitefieldTrenchInput: {
        trench: {
          dropbacks: 320,
          olQuickPressuresUnder25Sec: 44,
          qbLateSacksOver30Sec: 6,
          olBlocksHeld25SecPlus: 230,
          rushSnaps: 250,
          rushBlocksWon: 185,
        },
        routesAss: {
          totalPassSnaps: 260,
          passBlockSnaps: 42,
          screenBlockSnaps: 18,
          targets: 54,
          receivingYards: 520,
          firstDowns: 28,
          averageSeparationScore: 0.16,
        },
      },
    });

    expect(res.whitefieldTrenchIsolation.trueRoutesAndAss.trueRoutesRun).toBe(200);
    expect(res.simulationTrajectoryConditioners.pbwrQuickPressureIsolationDelta).toBeGreaterThan(0);
    expect(res.simulationTrajectoryConditioners.trueRoutesBreakoutIndex).toBeGreaterThan(0.5);
    expect(res.masterOverlayResult.publishAllowed).toBe(false);
    expect(Math.abs(res.masterOverlayResult.orthogonalization.totalProbabilityDelta)).toBeLessThanOrEqual(
      PROBABILITY_MOVEMENT_CAP + 1e-9,
    );
    const streamNames = res.masterOverlayResult.streamCalls.map((s) => s.stream);
    expect(streamNames).toContain("15M:evaluateWhitefieldTrenchIsolationBundle");

    const single = runMasterSituationalReasoningOverlay({
      familyDeltas: { pressure: 0.01 },
      marketAnchorProb: 0.52,
      independentEdgeDecision: "SPEAK",
      whitefieldTrenchInput: {},
    });
    expect(single.publishAllowed).toBe(true);
    expect(evaluateWhitefieldTrenchIsolationBundle().trueRoutesAndAss.trueRoutesRun).toBeGreaterThan(0);
  });

  it("evaluates all 7 PFR 11_19 Whitefield rules (non-sneak SR, 2x2 pass-rush regimes, strict FMT, bellcow trajectory, concept matrix, QC, garbage-time QBR)", () => {
    const srInput = {
      totalOffensivePlays: 500,
      qbSneakPlays: 22,
      qbSneakSuccesses: 20,
      rawYardsSuccessRate: 0.48,
      firstAnd20PenaltyDrives: 12,
      totalDrives: 90,
    };
    const srGuard = computeNonSneakSuccessRateGuard(srInput);
    expect(srGuard.nonSneakSuccessRate).toBeLessThan(srGuard.rawYardsSuccessRate);
    expect(srGuard.sneakInflationGap).toBeGreaterThan(0.015);
    expect(srGuard.firstAnd20StallRate).toBeCloseTo(12 / 90, 4);

    // Quick-release backend vulnerability (high <2.5s PRWR, low sacks) vs Coverage-sack regime
    const quickRel = classifyPassRushCoverageRegime({
      passRushWinRateUnder25Sec: 0.49,
      sackRatePerDropback: 0.051,
      secondaryCoverageHoldIndex: 0.42,
      qbTimeToThrowSec: 2.38,
      edgeRusherOutCount: 0,
      startingCbOutCount: 1,
      olStarterOutCount: 0,
    });
    expect(quickRel.regime).toBe("QUICK_RELEASE_BACKEND_VULNERABILITY");
    expect(quickRel.quickReleaseVulnerability).toBeGreaterThan(0.35);

    const covSackInput = {
      passRushWinRateUnder25Sec: 0.36,
      sackRatePerDropback: 0.089,
      secondaryCoverageHoldIndex: 0.68,
      qbTimeToThrowSec: 2.92,
      edgeRusherOutCount: 1,
      startingCbOutCount: 0,
      olStarterOutCount: 0,
    };
    const covSack = classifyPassRushCoverageRegime(covSackInput);
    expect(covSack.regime).toBe("COVERAGE_SACK_REGIME");
    expect(covSack.coverageSackRegressionRisk).toBeGreaterThan(0.35);

    const strictFmt = computeStrictForcedMissedTackleIndex({
      carries: 120,
      rawTotalMissedTackles: 28,
      incidentalLosArmGrabs: 10,
      angleErodingOpenFieldBursts: 6,
    });
    expect(strictFmt.strictFmtCount).toBe(24);
    expect(strictFmt.noiseInflationShare).toBeCloseTo(10 / 28, 4);

    const bellcow = evaluateBellcowTrajectorySlope([
      { week: 7, snapShare: 0.38, touchShare: 0.34, explosiveRunRate: 0.07, yacPerAtt: 2.3, strictFmtPerAtt: 0.14, rbYprr: 0.85 },
      { week: 8, snapShare: 0.51, touchShare: 0.47, explosiveRunRate: 0.11, yacPerAtt: 2.8, strictFmtPerAtt: 0.18, rbYprr: 1.15 },
      { week: 9, snapShare: 0.64, touchShare: 0.60, explosiveRunRate: 0.15, yacPerAtt: 3.3, strictFmtPerAtt: 0.23, rbYprr: 1.45 },
      { week: 10, snapShare: 0.74, touchShare: 0.71, explosiveRunRate: 0.18, yacPerAtt: 3.7, strictFmtPerAtt: 0.26, rbYprr: 1.62 },
    ]);
    expect(bellcow.breakoutBuyLowFlag).toBe(true);
    expect(bellcow.projectedNextWeekSnapShareDelta).toBeGreaterThan(0.10);

    const schemeInput = {
      duoShare: 0.42,
      outsideZoneShare: 0.28,
      insideZoneShare: 0.20,
      gapPowerShare: 0.10,
      elevenPersonnelRate: 0.68,
      lightBoxRateAllowedByOpp: 0.72,
      defEpaAllowedVsDuo: 0.11,
      defEpaAllowedVsOz: 0.04,
      defEpaAllowedVsIz: -0.02,
      defEpaAllowedVsGap: 0.03,
      offEpaVsTwoHigh: 0.09,
      offEpaVsMan: 0.06,
      defTwoHighRate: 0.58,
      defCover1Rate: 0.24,
    };
    const scheme = evaluateSchemeConceptMatchupMatrix(schemeInput);
    expect(scheme.schemeConceptMatchupEpaDelta).toBeGreaterThan(0.02);

    const badQcInput = {
      rpoPlayCount: 20,
      rpoWithWrRunBlockOrQuickReleaseCount: 10,
      observedModelPressureRate: 0.44,
      groundTruthChartedPressureRate: 0.21,
      impossibleAirYardsCount: 12,
      totalChartedPassPlays: 200,
    };
    const badQc = validateCrossChartingConsistency(badQcInput);
    expect(badQc.qcPassed).toBe(false);
    expect(badQc.populationDriftFlag).toBe(true);
    expect(badQc.reliabilityWeight).toBeLessThan(0.75);

    const qbrInput = {
      totalDropbacks: 300,
      cleanScriptDropbacks: 210,
      cleanScriptEpaPerDropback: -0.04,
      garbageTimeEpaPerDropback: 0.36,
      qbScrambleEpaContribution: 0.015,
      fumbleLostPenalty: 2.0,
      defensivePenaltiesDrawnYards: 35,
      receiverSpectacularCatchCreditSplit: 0.03,
    };
    const qbr = computeGarbageTimeAdjustedQbrProxy(qbrInput);
    expect(qbr.garbageTimeInflationBias).toBeGreaterThan(0.08);
    expect(qbr.garbageTimeFilteredQbrEpa).toBeLessThan(0.05);

    const bundled = evaluateWhitefieldTrenchIsolationBundle({
      nonSneakSuccessGuard: srInput,
      passRushCoverageRegime: covSackInput,
      strictFmt: { carries: 120, rawTotalMissedTackles: 28, incidentalLosArmGrabs: 10, angleErodingOpenFieldBursts: 6 },
      schemeConceptMatchup: schemeInput,
      crossChartingQc: badQcInput,
      garbageTimeQbrProxy: qbrInput,
    });
    expect(Math.abs(bundled.familyDeltaContributions.pressure)).toBeLessThanOrEqual(0.035);
    expect(Math.abs(bundled.familyDeltaContributions.coveragePersonnel)).toBeLessThanOrEqual(0.035);
    expect(Math.abs(bundled.familyDeltaContributions.qbSkillScript)).toBeLessThanOrEqual(0.035);
    expect(bundled.passRushCoverageRegime.regime).toBe("COVERAGE_SACK_REGIME");
    expect(bundled.crossChartingQc.qcPassed).toBe(false);
  });
});
