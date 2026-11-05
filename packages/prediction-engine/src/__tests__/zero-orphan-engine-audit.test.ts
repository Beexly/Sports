import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeCleanVsPressuredBadThrowSplit,
  computeWrTargetSuccessAlphaInteraction,
  computeRyoeIndependentVsLineSplit,
  evaluateBlitzBehindCoverageCounterFit,
  computeQbWrMofZoneOverlap,
  computeInteriorLinebackerDogAndSafetyBgapPressure,
  computePowerKickoutSpillDefenseFit,
  computeNeutralScriptEarlyDownUnderCenterEpa,
  computePlayoffLeverageMotivationDelta,
  computeWrAlignmentSideAdotTilt,
  computeDefensivePersonnelMatchingInExpectedPass,
  computeCleanPocketPassingSuccessSplit,
} from "../expected-metrics/situational-expected-metrics-catalog.js";
import {
  REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES,
  evaluateZeroOrphanExpectedMetricsOverlay,
} from "../nfl/zero-orphan-expected-metrics-bridge.js";
import { runMasterSituationalReasoningOverlay } from "../nfl/master-situational-reasoning-aggregator.js";
import { validateFeatureAgainstMisleadingStats } from "../nfl/x-situational-80-rules.js";
import {
  computeShortWeekCircadianPenalty,
  computeNeuroBiomechanicalCollisionLoad,
  computeDefensiveDriveFatigueDecay,
  computeCarterMacholBrillFourthDownEp,
  computeOsborneLevineShrinkageFieldGoalAndOvertime,
  computeTweedieEmpiricalBayesPropShrinkage,
  computeThorpBakerMcHalePortfolioKelly,
  computeSecondSpectrumUnravelSpatialControl,
  computeHydrodynamicTrenchShockwaveAndPercolation,
  computeHeuerAchDiagnosticityScore,
  predictNextSnapPrerouterActivation,
  computeDimitriadisCorpIsotonicCalibration,
  computeRushIndependentCoverageExecutionIndex,
  computeTnfShellAndPressureRaceMismatch,
  computeFp32RouterZLossStabilizedSoftmax,
} from "../expected-metrics/batch3-sports-physics-bridge.js";

describe("Zero-Orphan GSE Engine Audit & W1-W14 / F2-F3 Dossier Calculators", () => {
  it("verifies zero orphaned non-test modules across src/expected-metrics and src/nfl", () => {
    const expectedMetricsDir = resolve(__dirname, "../expected-metrics");
    const nflDir = resolve(__dirname, "../nfl");

    const emFiles = readdirSync(expectedMetricsDir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
    );
    const nflFiles = readdirSync(nflDir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
    );

    for (const file of emFiles) {
      expect(REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES).toContain(`expected-metrics/${file}`);
    }
    for (const file of nflFiles) {
      expect(REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES).toContain(`nfl/${file}`);
    }
  });

  it("computes W1-W14 and F2-F3 dossier calculators deterministically", () => {
    const w1 = computeCleanVsPressuredBadThrowSplit(18, 180, 14, 50);
    expect(w1.cleanBadThrowRate).toBeCloseTo(0.1, 4);
    expect(w1.pressuredBadThrowRate).toBeCloseTo(0.28, 4);
    expect(w1.stickyAccuracyDelta).toBeGreaterThan(0);

    const w2 = computeWrTargetSuccessAlphaInteraction(0.58, 0.30);
    expect(w2).toBeGreaterThan(0.18);

    const w3 = computeRyoeIndependentVsLineSplit(0.85, 1.45);
    expect(w3.independentCreationShare).toBeGreaterThan(0.3);

    const w6 = evaluateBlitzBehindCoverageCounterFit(0.45, 0.87, 0.38, 0.32, 0.28, 0.25);
    expect(w6).toBeGreaterThan(0);

    const w8 = computeQbWrMofZoneOverlap(0.768, 0.348, 0.72);
    expect(w8).toBeGreaterThan(0.15);

    const w9w10 = computeInteriorLinebackerDogAndSafetyBgapPressure(0.22, 0.26, 0.24);
    expect(w9w10).toBeGreaterThan(0.05);

    const w11 = computePowerKickoutSpillDefenseFit(0.35, 0.68, 0.82);
    expect(w11).toBeGreaterThan(0.1);

    const w12 = computeNeutralScriptEarlyDownUnderCenterEpa(0.14, -0.02, 0.62);
    expect(w12).toBeGreaterThan(0.05);

    const w13 = computePlayoffLeverageMotivationDelta(0.68, 0.34, 0.12);
    expect(w13).toBeCloseTo(0.22, 4);

    const w14 = computeWrAlignmentSideAdotTilt(13.8, 8.4, 10.2, "LEFT");
    expect(w14).toBeGreaterThan(0);

    const f2 = computeDefensivePersonnelMatchingInExpectedPass(0.32, 0.24);
    expect(f2).toBeGreaterThan(0.05);

    const f3 = computeCleanPocketPassingSuccessSplit(0.54, 0.31, 0.34);
    expect(f3).toBeCloseTo(0.54 * 0.66 + 0.31 * 0.34, 3);
  });

  it("wires evaluateZeroOrphanExpectedMetricsOverlay into runMasterSituationalReasoningOverlay", () => {
    const overlay = evaluateZeroOrphanExpectedMetricsOverlay({
      cleanBadThrows: 14,
      cleanAttempts: 160,
      pressuredBadThrows: 12,
      pressuredAttempts: 45,
      wrTargetSuccessRate: 0.61,
      wrTargetShare: 0.348,
      qbMofCompletionRate: 0.768,
      defZoneRate: 0.71,
      ryoePerCarry: 0.72,
      yardsBeforeContactPerCarry: 1.5,
      underCenterEpa: 0.11,
      shotgunEpa: 0.01,
      neutralSnapShare: 0.58,
      winPlayoffProb: 0.64,
      lossPlayoffProb: 0.38,
      opponentWinPlayoffSwing: 0.14,
    });
    expect(overlay.wiredModuleCount).toBeGreaterThanOrEqual(45);

    const agg = runMasterSituationalReasoningOverlay({
      familyDeltas: {
        pressure: 0.01,
        weather: 0.0,
        restFatigue: 0.005,
        coveragePersonnel: 0.015,
        qbSkillScript: 0.02,
        marketMicrostructure: 0.005,
      },
      marketAnchorProb: 0.52,
      independentEdgeDecision: "SPEAK",
      zeroOrphanOverlay: {
        cleanBadThrows: 14,
        cleanAttempts: 160,
        pressuredBadThrows: 12,
        pressuredAttempts: 45,
        wrTargetSuccessRate: 0.61,
        wrTargetShare: 0.348,
        qbMofCompletionRate: 0.768,
        defZoneRate: 0.71,
        ryoePerCarry: 0.72,
        yardsBeforeContactPerCarry: 1.5,
        underCenterEpa: 0.11,
        shotgunEpa: 0.01,
        neutralSnapShare: 0.58,
        winPlayoffProb: 0.64,
        lossPlayoffProb: 0.38,
        opponentWinPlayoffSwing: 0.14,
      },
    });
    expect(agg.zeroOrphanResult).toBeDefined();
    expect(agg.zeroOrphanResult?.wiredModuleCount).toBeGreaterThanOrEqual(77);
    expect(agg.zeroOrphanResult?.batch3CircadianPenalty).toBeDefined();
    expect(agg.zeroOrphanResult?.batch4NeuroCollisionLoad).toBeDefined();
    expect(agg.zeroOrphanResult?.gapHuntHeuerAchDiagnosticity).toBeDefined();
  });

  it("evaluates all 12 Batch 3 / Batch 4 / Gap-Hunt / Repo-Catalog / AM Sweep mathematical operators", () => {
    const circadian = computeShortWeekCircadianPenalty({
      restDaysOffense: 4,
      restDaysDefense: 7,
      timeZoneDeltaHours: 2,
      kickoffLocalHour24: 20.25,
      isAwayTeam: true,
    });
    expect(circadian.circadianPhasePenaltyEpa).toBeLessThan(0);
    expect(circadian.neuromuscularFatigueMultiplier).toBeLessThan(1.0);

    const neuro = computeNeuroBiomechanicalCollisionLoad({
      priorCareerConcussions: 3,
      recent72hSubconcussiveHits: 18,
      peakRotationalAccelerationRadPerSec2: 4600,
      hoursSinceLastHighGImpact: 36,
      hypoxicAltitudeMeters: 1600,
    });
    expect(neuro.guskiewiczRecurrentHazardRatio).toBeGreaterThanOrEqual(3.4);
    expect(neuro.sweeneyZlokovicBbbPermeabilityIndex).toBeGreaterThan(0.4);
    expect(neuro.processingSpeedLogitPenalty).toBeLessThan(0);

    const fatigue = computeDefensiveDriveFatigueDecay({
      consecutiveDefensiveSnapsOnDrive: 11,
      cumulativeDefensiveSnapsGame: 64,
      secondsBetweenPlays: 21,
      defensiveLineRotationDepth: 0.85,
    });
    expect(fatigue.fatigueSuccessRateAllowanceDelta).toBeGreaterThan(0.03);
    expect(fatigue.explosivePlayHazardMultiplier).toBeGreaterThan(1.08);

    const fourth = computeCarterMacholBrillFourthDownEp({
      yardline100: 38,
      yardsToGo: 2,
      goForItConversionProb: 0.62,
      fieldGoalMakeProb: 0.64,
      netPuntYards: 32,
      bootstrapSampleSizeN: 180,
      offensiveQualityZ: 0.5,
    });
    expect(fourth.epGoForIt).toBeGreaterThan(fourth.epPunt);
    expect(fourth.dalyGrafsteinSelectionCorrectedConvProb).toBeGreaterThan(0.5);

    const fgOt = computeOsborneLevineShrinkageFieldGoalAndOvertime({
      kickerMadeInBin: 7,
      kickerAttemptsInBin: 10,
      leagueBinMeanProb: 0.76,
      priorStrengthM: 16,
      kickDistanceYards: 52,
      windSpeedMph: 14,
      otReceivingTeamTdProb: 0.24,
      otReceivingTeamFgProb: 0.34,
      otKickingTeamReplyTdProb: 0.22,
      otKickingTeamReplyFgProb: 0.32,
    });
    expect(fgOt.osborneLevineShrunkFgProb).toBeGreaterThan(0.65);
    expect(fgOt.martinMarkovOtReceivingWinProb).toBeGreaterThan(0.45);

    const tweedie = computeTweedieEmpiricalBayesPropShrinkage({
      playerObservedStatZ: 98,
      observationVarianceSigma2: 64,
      empiricalPopulationSample: [52, 58, 63, 67, 71, 75, 82],
      hierarchicalSnapShareWeight: 0.82,
      positionalPriorMean: 66,
    });
    expect(tweedie.hierarchicallyBlendedProjection).toBeLessThan(98);
    expect(tweedie.shrinkageMagnitude).toBeGreaterThan(5);

    const kelly = computeThorpBakerMcHalePortfolioKelly(
      [
        { id: "leg1", trueProb: 0.58, decimalOdds: 1.91, edgeEstimationStdErr: 0.03 },
        { id: "leg2", trueProb: 0.56, decimalOdds: 1.95, edgeEstimationStdErr: 0.04 },
      ],
      0.2,
      0.04,
      5000,
      1.0,
    );
    expect(kelly.totalBankrollCommittedFraction).toBeLessThanOrEqual(0.04);
    expect(kelly.kalshiEventHedgeContractsRatio).toBe(5000);

    const spatial = computeSecondSpectrumUnravelSpatialControl({
      offenseX: new Float64Array([25, 28, 30]),
      offenseY: new Float64Array([20, 26, 32]),
      offenseVx: new Float64Array([6.5, 7.2, 5.1]),
      offenseVy: new Float64Array([0.5, 0.0, -0.5]),
      defenseX: new Float64Array([31, 33, 35]),
      defenseY: new Float64Array([21, 26, 31]),
      defenseVx: new Float64Array([-4.0, -4.5, -3.5]),
      defenseVy: new Float64Array([0.0, 0.2, -0.2]),
      targetX: 30,
      targetY: 26,
    });
    expect(spatial.secondSpectrumPitchControlOffense).toBeGreaterThan(0.3);
    expect(spatial.unravelPressingIntensityMax).toBeGreaterThan(0.1);

    const hydro = computeHydrodynamicTrenchShockwaveAndPercolation({
      gapClearanceAspectRatio: 1.3,
      boxDefenderDensityRho: 0.48,
      pocketCollapseVelocityYdsPerSec: 1.2,
      initialPocketRadiusYards: 4.6,
      leadBlockerMomentumRatio: 1.25,
    });
    expect(hydro.anisotropicPercolationOpenProb).toBeGreaterThan(0.5);
    expect(hydro.asepGapCurrentJ).toBeGreaterThan(0.15);

    const ach = computeHeuerAchDiagnosticityScore([
      { evidenceId: "e1", likelihoodGivenPrimaryH1: 0.78, likelihoodGivenNullH0: 0.35 },
      { evidenceId: "e2_noise", likelihoodGivenPrimaryH1: 0.51, likelihoodGivenNullH0: 0.5 },
      { evidenceId: "e3_disconfirm", likelihoodGivenPrimaryH1: 0.3, likelihoodGivenNullH0: 0.6 },
    ]);
    expect(ach.nonDiagnosticEvidenceDropped).toBe(1);
    expect(ach.disconfirmingEvidenceCount).toBe(1);

    const prerouter = predictNextSnapPrerouterActivation([
      {
        expertClusterId: "c1",
        currentLayerAffinity: 0.85,
        historicalVisitsN: 20,
        totalParentSimulationsT: 100,
        meanDeterminizedReward: 0.72,
      },
      {
        expertClusterId: "c2",
        currentLayerAffinity: 0.45,
        historicalVisitsN: 30,
        totalParentSimulationsT: 100,
        meanDeterminizedReward: 0.41,
      },
    ], 1);
    expect(prerouter.prefetchedClusters).toEqual(["c1"]);

    const corp = computeDimitriadisCorpIsotonicCalibration([
      { forecastProb: 0.05, outcome: 0 },
      { forecastProb: 0.1, outcome: 0 },
      { forecastProb: 0.9, outcome: 1 },
      { forecastProb: 0.95, outcome: 1 },
    ]);
    expect(corp.recalibratedProbs[0]!).toBeLessThanOrEqual(corp.recalibratedProbs[3]!);
    expect(corp.walshJoshiCalibrationClean).toBe(true);

    const cei = computeRushIndependentCoverageExecutionIndex({
      yacPerCompletionAllowed: 3.74,
      deep20PlusCompletionRateAllowed: 0.28,
      contestedCatchWinRateDef: 0.58,
      wideOpenTargetRateAllowed: 0.054,
      turnoverWorthyThrowRateForced: 0.042,
    });
    expect(cei.ceiStandardizedPct).toBeGreaterThan(15);

    const tnfMismatch = computeTnfShellAndPressureRaceMismatch({
      offenseEpaPerPlay: 0.04,
      defenseAllowedEpaPerPlay: -0.06,
      defenseTwoHighRate: 0.597,
      defenseDimeRate: 0.283,
      defenseLightBoxRate: 0.532,
      qbEpaDeltaVsTwoHigh: -0.17,
      fastestRusherTimeToPressureSec: 2.13,
      qbMedianTimeToThrowSec: 2.68,
    });
    expect(tnfMismatch.shellAdjustedPassingEpaDelta).toBeLessThan(-0.05);
    expect(tnfMismatch.pressureWinsClockRace).toBe(true);

    const zLoss = computeFp32RouterZLossStabilizedSoftmax([12.4, 11.8, 10.2]);
    expect(zLoss.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 4);
    expect(zLoss.routerZLoss).toBeGreaterThan(0);

    const bsGate = validateFeatureAgainstMisleadingStats({
      name: "career longevity",
      definition: "right_censored survivorship_cohort average",
    });
    expect(bsGate.accepted).toBe(false);
    expect(bsGate.record).toBe("8.15");
  });
});
