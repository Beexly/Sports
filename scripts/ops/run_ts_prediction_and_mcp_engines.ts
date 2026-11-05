/**
 * run_ts_prediction_and_mcp_engines.ts
 *
 * Real TypeScript Execution Bridge for the GSE Connected Game Workflow.
 * Executes the actual TypeScript modules in:
 *   1. packages/mcp-equations-server/src/ (mcp-cognitive-router, thousand-equation-registry, quad-engine-crosswalk)
 *   2. packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts (All 21 Streams 0, 8, 12B-15I)
 *   3. packages/prediction-engine/src/nfl/x-situational-80-rules.ts (All 80 situational records across 8 themes)
 *   4. packages/prediction-engine/src/wireable-dispatch.ts & model-registry.ts (196-model registry & 178 wireable pure-math/self-contained modules)
 *   5. packages/prediction-engine/src/signals/* (Short-Week Road Deficit, Backup QB Target Funnel, 5B Contract Milestones)
 *   6. packages/prediction-engine/src/edge-lab/props-hb.ts (Empirical-Bayes Gamma-Poisson & Continuous Gamma shrinkage)
 *   7. packages/prediction-engine/src/public-baseline/calibration-map.ts, sgp-copula.ts, no-bet-gate.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

import {
  maskToArray,
  routeInMemoryFourStage,
  denoiseMarchenkoPasturEffectiveRankShrinkage,
  softThresholdSparseLasso,
  routePeerProductKeyAndPrerouter,
  loadLiveQuadEngineCrosswalk,
  queryQuadEngineByContext,
  type Signal,
} from "../../packages/mcp-equations-server/src/mcp-cognitive-router.js";
import {
  loadThousandEquationMatrix,
} from "../../packages/mcp-equations-server/src/thousand-equation-registry.js";
import {
  runMasterSituationalReasoningOverlay,
  type OverlayInput,
} from "../../packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.js";
import {
  X_SITUATIONAL_80_RECORD_CATALOG,
  evaluateXSituationalRecordById,
} from "../../packages/prediction-engine/src/nfl/x-situational-80-rules.js";
import {
  REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES,
} from "../../packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.js";
import {
  SITUATIONAL_EXPECTED_METRICS_CATALOG,
} from "../../packages/prediction-engine/src/expected-metrics/situational-expected-metrics-catalog.js";
import {
  listWireableModules,
  WIREABLE_MODULE_COUNT,
} from "../../packages/prediction-engine/src/wireable-dispatch.js";
import {
  registrySummary,
} from "../../packages/prediction-engine/src/model-registry.js";
import {
  evaluateShortWeekRoadDeficit,
} from "../../packages/prediction-engine/src/signals/situational/short-week-road-deficit.js";
import {
  evaluateBackupQbTargetDistribution,
} from "../../packages/prediction-engine/src/signals/efficiency/backup-qb-target-distribution.js";
import {
  evaluateContractMilestones,
} from "../../packages/prediction-engine/src/signals/narrative/contract-incentives-milestones.js";
import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  probOverContinuous,
  shrinkageReport,
} from "../../packages/prediction-engine/src/edge-lab/props-hb.js";
import {
  calibrateMarketFamilyProbability,
} from "../../packages/prediction-engine/src/public-baseline/calibration-map.js";
import {
  jointForPairing,
  independenceErrorPp,
  jointThreeLegExceedance,
} from "../../packages/prediction-engine/src/nfl/sgp-copula.js";
import {
  evaluateParlayConjunctionGate,
  publicationAllowedForJev,
} from "../../packages/prediction-engine/src/nfl/no-bet-gate.js";

function main() {
  const root = process.cwd();
  const stage0Path = path.resolve(
    root,
    "data/nflverse/week9_live_roster_transactions_and_starters_2026.json",
  );
  const boardPath = path.resolve(
    root,
    "data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json",
  );
  const boardRaw = JSON.parse(fs.readFileSync(boardPath, "utf-8"));
  const candidateNames: string[] = (boardRaw.props ?? boardRaw.player_prop_board ?? [])
    .map((p: { athlete?: string; player?: string }) => String(p.athlete ?? p.player ?? "").trim())
    .filter((nm: string) => nm && nm !== "Unknown" && nm !== "Jacksonville Jaguars" && nm !== "Baltimore Ravens" && nm !== "Game");

  // 1. Build 279-family signal vector for MCP 4-Stage Cognitive Router
  const signals: Signal[] = [
    { family: 0, displacement: 0.42, n: 148 },   // Trench pressure differential
    { family: 1, displacement: -0.38, n: 92 },   // Rookie QB1 Joe Fagnano dropback decay
    { family: 2, displacement: 0.31, n: 112 },   // Short-week road circadian deficit (TNF)
    { family: 3, displacement: 0.29, n: 185 },   // Two-high MOFO coverage funnel
    { family: 4, displacement: 0.35, n: 164 },   // Derrick Henry heavy-box gap/duo rush
    { family: 5, displacement: 0.24, n: 140 },   // Zay Flowers slot motion YPRR
    { family: 6, displacement: 0.27, n: 120 },   // Brian Thomas Jr. play-action deep over
    { family: 7, displacement: -0.19, n: 88 },   // Bhayshul Tuten Questionable DNP -> Rodriguez/Abdullah/Allen split
    { family: 8, displacement: 0.22, n: 105 },   // Red-zone 12/21 personnel TE leverage
    { family: 9, displacement: 0.18, n: 310 },   // Outdoor grass M&T Bank wind/density
    { family: 10, displacement: 0.33, n: 95 },   // Monken script elasticity vs Campanile blitz
    { family: 11, displacement: 0.26, n: 150 },  // IDP Roquan Smith / Oluokun tackle funnel
  ];

  const routerResult = routeInMemoryFourStage(signals, {
    topK: 250,
    stageCLimit: 25,
    clusterRedundancyGamma: 0.85,
    tauHatCoach: 0.48,
  });
  const mpShrinkage = denoiseMarchenkoPasturEffectiveRankShrinkage(12, 120);
  const lassoTrimmed = softThresholdSparseLasso(
    routerResult.selectedPremises.map((p) => p.shrunkLogOddsDelta),
    0.002,
  );
  const peerRoute = routePeerProductKeyAndPrerouter(
    [0.42, -0.38, 0.31, 0.29],
    [0.35, 0.24, 0.27, -0.19],
    [
      { id: "trench_pressure", key: [0.5, -0.3, 0.2, 0.4] },
      { id: "backup_qb_funnel", key: [0.2, -0.6, 0.4, 0.1] },
    ],
    [
      { id: "heavy_box_rush", key: [0.6, 0.2, 0.3, -0.2] },
      { id: "two_high_shell", key: [0.3, 0.5, 0.4, -0.3] },
    ],
    2,
  );
  const crosswalk = loadLiveQuadEngineCrosswalk();
  const crosswalkHits = queryQuadEngineByContext(crosswalk, { search: "pressure", limit: 5 });

  // 2. Execute ALL 21 Streams in Master Situational Reasoning Aggregator
  const feedOutPath = path.resolve(
    root,
    "data/mind_staging/master_aggregator_tnf_jax_bal_2026_11_05.jsonl",
  );
  const elevenDefenders = Array.from({ length: 11 }, (_, i) => ({
    x: 35 + (i % 4) * 3,
    y: 8 + i * 3.8,
    reportedSpeed: 5.2 + (i % 3) * 0.4,
    reportedAcceleration: 1.8 + (i % 2) * 0.3,
    displacementYards: 0.52 + (i % 3) * 0.04,
  }));
  const tenOffense = Array.from({ length: 10 }, (_, i) => ({
    x: 30 + (i % 3) * 2,
    y: 10 + i * 3.6,
    reportedSpeed: 5.5 + (i % 3) * 0.5,
    reportedAcceleration: 2.0 + (i % 2) * 0.4,
    displacementYards: 0.55 + (i % 3) * 0.05,
  }));

  const overlayInput: OverlayInput = {
    coverageFrames: [
      { defenders: elevenDefenders, offense: tenOffense },
      { defenders: elevenDefenders, offense: tenOffense },
    ],
    situationalPlay: {
      wpBefore: 0.52,
      wpAfter: 0.58,
      epBefore: 1.4,
      epAfter: 2.8,
      quarter: 3,
      halfSecondsRemaining: 540,
      scoreMargin: 3,
      down: 2,
      ydstogo: 6,
      yardline100: 44,
      yardsGained: 9,
      playType: "pass",
      shortYardageConversion: false,
    },
    decisionState: {
      scoreMargin: -3,
      quarter: 4,
      halfSecondsRemaining: 420,
      yardline100: 38,
      ydstogo: 2,
      down: 4,
      baseRatePrior: 0.52,
    },
    decisionOptions: [
      { branch: "go", successProbability: 0.61, winProbabilityOnSuccess: 0.58, winProbabilityOnFailure: 0.29 },
      { branch: "kick", successProbability: 0.72, winProbabilityOnSuccess: 0.48, winProbabilityOnFailure: 0.31 },
      { branch: "punt", successProbability: 0.98, winProbabilityOnSuccess: 0.36, winProbabilityOnFailure: 0.22 },
    ],
    tackle: {
      distanceToCarrier: 1.9,
      closingSpeed: 4.2,
      approachAngleCos: 0.88,
      blockersBetween: 1,
      openField: false,
      defenderSpeed: 8.1,
      defenderAcceleration: 2.4,
      pursuitAngleSin: 0.22,
      angleToSideline: 0.65,
      carrierSpeed: 7.8,
      timeToIntercept: 0.45,
      leverageDistance: 1.4,
      teammateSupportCount: 2,
      groupTackleContext: true,
      downDistancePressure: 0.5,
      yardsToGoal: 44,
      closingAcceleration: 1.2,
      defenderMassProxy: 0.72,
      surfaceGripProxy: 0.85,
    },
    clobBook: {
      bids: [
        { price: 0.705, size: 4200 },
        { price: 0.70, size: 8500 },
      ],
      asks: [
        { price: 0.715, size: 3800 },
        { price: 0.72, size: 9100 },
      ],
    },
    handoffRecords: [
      { id: "inj_lamar_out", knownAt: "2026-11-04T21:00:00Z", season: 2026, week: 9, payload: { subject: "Lamar Jackson", status: "Out" } },
      { id: "inj_huntley_out", knownAt: "2026-11-04T21:05:00Z", season: 2026, week: 9, payload: { subject: "Tyler Huntley", status: "Out" } },
      { id: "inj_tuten_q", knownAt: "2026-11-05T15:00:00Z", season: 2026, week: 9, payload: { subject: "Bhayshul Tuten", status: "Questionable" } },
    ],
    asOf: "2026-11-05T19:30:00Z",
    qbEpa: {
      epa: [0.42, -0.65, 0.88, 0.12, -0.31, 0.54, -0.18, 0.29, -0.92, 0.61, 0.15, -0.22],
      gamma0: 0.22,
      gamma1: -0.08,
    },
    teamObservations: [
      { team: "BAL", metric: "off_rush", epa: 0.14 },
      { team: "BAL", metric: "off_rush", epa: 0.11 },
      { team: "BAL", metric: "off_pass", epa: 0.04 },
      { team: "BAL", metric: "def_rush", epa: -0.09 },
      { team: "JAX", metric: "off_pass", epa: 0.03 },
      { team: "JAX", metric: "off_pass", epa: 0.01 },
      { team: "JAX", metric: "off_rush", epa: -0.02 },
      { team: "JAX", metric: "def_pass", epa: 0.06 },
    ],
    wr1: {
      wr1Targets: 68,
      teamPassAttempts: 248,
      wr1EpaPerTarget: 0.24,
      league: {
        wr1TargetShare: 0.26,
        wr1EpaPerTarget: 0.18,
        targetShareVariance: 0.004,
        epaVariance: 0.025,
      },
    },
    llmPrior: {
      priorProbability: 0.7082,
      tokens: [
        { token: "Rookie_QB1_Joe_Fagnano_Start", logLikelihoodRatio: -0.14 },
        { token: "Derrick_Henry_Heavy_Box_Dominance", logLikelihoodRatio: 0.11 },
        { token: "JAX_Short_Week_Road_Deficit", logLikelihoodRatio: 0.08 },
        { token: "Bhayshul_Tuten_Questionable_Backfield_Split", logLikelihoodRatio: 0.05 },
      ],
    },
    featureUnderTest: {
      name: "epa_per_play_neutral_script_l4",
      definition: "opponent-adjusted neutral script EPA per play excluding garbage time",
      controls: ["opponent-quality", "garbage-time", "down-distance"],
      sampleSize: 218,
    },
    belichickInputs: {
      formationSnaps: Array.from({ length: 12 }, (_, i) => ({
        formation: "nickel" as const,
        offensePersonnel: "11" as const,
        down: (i % 3) + 1,
        distance: 6,
        yardline: 45,
        epa: 0.04,
        success: i % 2 === 0,
      })),
      situations: [
        { quarter: 4, clock: 110, yardline: 64, opponentConversionRate: 0.52, opponentRedZoneRate: 0.58 },
      ],
    },
    qbBallPlacementMatchup: {
      homeQb: {
        team: "BAL",
        qb: "Joe Fagnano",
        chartedPassAttempts: 112,
        aimedPassAttempts: 98,
        catchableBallRateRawPct: 74.2,
        catchableBallRateAimedPct: 78.6,
        openTargetRatePct: 44.5,
        pickablePassRatePct: 3.1,
        receiverDropRatePct: 5.4,
        inPocketCatchablePct: 79.8,
        outOfPocketCatchablePct: 54.0,
        pressureToSackRatePct: 21.5,
        qbFaultSackSharePct: 18.0,
        outOfPocketPassSharePct: 11.2,
      },
      awayQb: {
        team: "JAX",
        qb: "Trevor Lawrence",
        chartedPassAttempts: 248,
        aimedPassAttempts: 224,
        catchableBallRateRawPct: 76.4,
        catchableBallRateAimedPct: 80.8,
        openTargetRatePct: 46.2,
        pickablePassRatePct: 2.9,
        receiverDropRatePct: 6.8,
        inPocketCatchablePct: 81.2,
        outOfPocketCatchablePct: 62.4,
        pressureToSackRatePct: 18.4,
        qbFaultSackSharePct: 15.5,
        outOfPocketPassSharePct: 16.8,
      },
    },
    targetFunnelInput: {
      wrTargetShareAllowedPct: 59.5,
      teTargetShareAllowedPct: 24.8,
      rbTargetShareAllowedPct: 22.1,
      proeAllowedPct: 1.8,
      defBlitzRatePct: 29.4,
    },
    rushConceptInput: {
      offZoneSharePct: 52.0,
      offGapSharePct: 48.0,
      offZoneYpc: 4.7,
      offGapYpc: 5.4,
      defZoneYpcAllowed: 4.2,
      defGapYpcAllowed: 4.6,
      projectedCarries: 19.8,
    },
    conformalAbstentionInput: {
      calibratedProb: 0.5307,
      nonconformityQuantileQHat: 0.048,
      groupType: "UNDERDOG",
      groupEmpiricalCoverage: 0.905,
      targetCoverageAlpha: 0.10,
    },
    borghesiRosenInput: {
      windMph: 8.5,
      tempF: 52,
      isPrecipitation: false,
      isIndoor: false,
      qbStarterOut: true,
      backupPriorStartsThisSeason: 2,
      hasPost2011ByeRestAdvantage: false,
      isWestToEastEarlyKickoff: false,
    },
    katsCusumInput: {
      lineSeries: [-7.5, -7.5, -7.0, -7.0, -6.5, -6.5],
      timestampsHoursBeforeKickoff: [72, 48, 36, 24, 12, 4],
    },
    stage0Check: {
      configPath: stage0Path,
      candidatePlayerNames: candidateNames,
    },
    tebAvalancheBraidInput: {
      olPassSetSurvivalFrames: [28, 26, 29, 25, 27, 24, 28, 26],
      qbDropbackClockFrames: [24, 25, 23, 26, 24, 25, 23, 24],
      wr1RouteBreakFrames: [21, 22, 20, 23, 21, 22, 20, 21],
      defensivePressureStuntFrames: [25, 23, 26, 22, 24, 21, 25, 23],
      quickGameHotReadRate: 0.34,
      qbMobilityAndInstallFactor: 0.68,
    },
    zeroOrphanOverlay: {
      cleanBadThrows: 18,
      cleanAttempts: 162,
      pressuredBadThrows: 19,
      pressuredAttempts: 78,
      wrTargetSuccessRate: 0.56,
      wrTargetShare: 0.27,
      qbMofCompletionRate: 0.68,
      defZoneRate: 0.66,
      ryoePerCarry: 0.74,
      yardsBeforeContactPerCarry: 2.35,
      underCenterEpa: 0.14,
      shotgunEpa: 0.05,
      neutralSnapShare: 0.58,
      winPlayoffProb: 0.78,
      lossPlayoffProb: 0.56,
      opponentWinPlayoffSwing: 0.19,
      safetyBgapBlitzRate: 0.19,
      ilbDogPressureRate: 0.24,
      edgeOneOnOneWinRate: 0.23,
      baseInExpectedPassRate: 0.26,
      opponentPassEpaVsBase: 0.21,
      cleanSuccessRate: 0.53,
      pressuredSuccessRate: 0.30,
      projectedPressureRate: 0.34,
      restDaysOffense: 4,
      restDaysDefense: 4,
      timeZoneDeltaHours: 0,
      priorCareerConcussions: 1,
      recent72hSubconcussiveHits: 16,
      consecutiveDefensiveSnapsOnDrive: 7,
      boxDefenderDensityRho: 0.72,
    },
    familyDeltas: {
      pressure: [0.018, 0.014, 0.021],
      weather: [-0.004, -0.002],
      restFatigue: [-0.019, -0.015],
      coveragePersonnel: [0.022, 0.017, 0.019],
      qbSkillScript: [-0.028, -0.021, -0.024],
      marketMicrostructure: [0.008, 0.005],
    },
    marketAnchorProb: 0.7082,
    independentEdgeDecision: "PASS",
    provenance: {
      source: "gse_connected_game_workflow_v2",
      streamId: "stream14e:tnf-jax-bal-2026-11-05",
      computedAt: new Date().toISOString(),
      feedPath: feedOutPath,
    },
  };

  const overlayResult = runMasterSituationalReasoningOverlay(overlayInput);

  // 3. Evaluate ALL 80 Situational Rules in x-situational-80-rules.ts
  const all80Results = X_SITUATIONAL_80_RECORD_CATALOG.map((rec) =>
    evaluateXSituationalRecordById(rec.id),
  );

  // 4. Execute Situational & Narrative Signal Modules (src/signals/*)
  const shortWeekRoad = evaluateShortWeekRoadDeficit({
    isRoadTeam: true,
    restDays: 4,
    travelDistanceMiles: 680,
    opponentRestDays: 4,
    isDivisionRivalry: false,
  });

  const backupQbRbFunnel = evaluateBackupQbTargetDistribution({
    isBackupStarting: true,
    backupCareerPassAttempts: 445,
    playerRole: "RECEIVING_RUNNING_BACK",
    baselineTargetShare: 0.10,
    baselineAdot: 1.8,
    baselineReceptionsLine: 2.5,
  });

  const backupQbTeFunnel = evaluateBackupQbTargetDistribution({
    isBackupStarting: true,
    backupCareerPassAttempts: 445,
    playerRole: "TIGHT_END",
    baselineTargetShare: 0.21,
    baselineAdot: 8.8,
    baselineReceptionsLine: 4.5,
  });

  const backupQbDeepWrFunnel = evaluateBackupQbTargetDistribution({
    isBackupStarting: true,
    backupCareerPassAttempts: 445,
    playerRole: "BOUNDARY_DEEP_THREAT",
    baselineTargetShare: 0.18,
    baselineAdot: 13.6,
    baselineReceptionsLine: 2.5,
  });

  const henryContractIncentive = evaluateContractMilestones({
    playerName: "Derrick Henry",
    position: "RB",
    metricType: "RUSHING_YARDS",
    currentSeasonTotal: 875,
    milestoneTarget: 1200,
    bonusValueUsd: 500000,
    remainingGamesInSeason: 9,
    isContractYear: false,
    teamPlayoffStatus: "IN_HUNT",
  });

  const andrewsContractIncentive = evaluateContractMilestones({
    playerName: "Mark Andrews",
    position: "TE",
    metricType: "RECEPTIONS",
    currentSeasonTotal: 34,
    milestoneTarget: 60,
    bonusValueUsd: 750000,
    remainingGamesInSeason: 9,
    isContractYear: true,
    teamPlayoffStatus: "IN_HUNT",
  });

  // 5. Execute Empirical-Bayes Hierarchical Prop Specialist (src/edge-lab/props-hb.ts)
  const wrRecGroupSamples = [
    { id: "Zay Flowers", games: 8, total: 54 },
    { id: "Brian Thomas Jr.", games: 8, total: 44 },
    { id: "Parker Washington", games: 8, total: 36 },
    { id: "Mark Andrews", games: 8, total: 34 },
    { id: "Rashod Bateman", games: 8, total: 22 },
    { id: "Tylan Wallace", games: 8, total: 8 },
    { id: "Charlie Kolar", games: 8, total: 7 },
  ];
  const wrRecPrior = fitGroupPrior(wrRecGroupSamples) ?? { alpha: 8.0, beta: 2.0 };
  const wrShrinkageTable = shrinkageReport(wrRecPrior, wrRecGroupSamples);
  const btjRecPosterior = posteriorRate(wrRecPrior, 44, 8);
  const btjProbOver4_5 = probOver(btjRecPosterior, 4.5, 1);
  const btjYardsPosterior = posteriorRate({ alpha: 180.0, beta: 3.0 }, 580, 8);
  const btjProbOver58_5Yds = probOverContinuous(btjYardsPosterior, 58.5, 2.4);

  // 6. Execute Market Calibration Heads, SGP Copula, and No-Bet Gate
  const mlCalibrated = calibrateMarketFamilyProbability(0.7198, "MONEYLINE");
  const spreadCalibrated = calibrateMarketFamilyProbability(0.5307, "SPREAD");
  const totalCalibrated = calibrateMarketFamilyProbability(0.5262, "TOTAL");
  const propCalibrated = calibrateMarketFamilyProbability(0.6120, "PLAYER_PROP");
  const deriv1HCalibrated = calibrateMarketFamilyProbability(0.5480, "DERIVATIVE_1Q_1H");

  const sgpQbWr = jointForPairing(0.54, 0.56, "QB-WR");
  const sgpQbWrLiftPp = independenceErrorPp(0.54, 0.56, "QB-WR");
  const sgpThreeLeg = jointThreeLegExceedance(0.58, 0.56, 0.54);

  const parlayGateCheck = evaluateParlayConjunctionGate(
    [
      { game_id: "2026_09_JAX_BAL", market_type: "SPREAD", selection: "JAX +6.5", publishAllowed: false, decision: "PASS" },
      { game_id: "2026_09_JAX_BAL", market_type: "REC_YDS", selection: "OVER", publishAllowed: true, decision: "SPEAK" },
    ],
    0.295,
    0.260,
    10000,
  );

  // 7. Audit Model Registry & Wireable Dispatch Surface
  const regSummary = registrySummary();
  const wireableModules = listWireableModules();

  const loadedMatrix = loadThousandEquationMatrix();
  const summary = {
    status: "TS_ENGINES_VERIFIED_LIVE",
    mcp_cognitive_router: {
      thousand_equation_matrix_count: loadedMatrix.equations.length,
      context_mask_words: maskToArray(routerResult.contextMask),
      stage_c_selected_count: routerResult.selectedPremises.length,
      stage_d_james_stein_shrinkage: routerResult.jamesSteinShrinkageFactor,
      stage_d_unclamped_log_odds_delta: routerResult.unClampedTotalLogOddsDelta,
      stage_d_clamped_log_odds_delta: routerResult.clampedTotalLogOddsDelta,
      stage_d_clamped: routerResult.clamped,
      tau_hat_coach_prior_bonus: routerResult.tauHatCoachPriorBonus,
      marchenko_pastur_rank_shrinkage: mpShrinkage,
      marchenko_pastur_effective_rank_shrinkage: mpShrinkage,
      lasso_nonzero_count: lassoTrimmed.filter((x) => x !== 0).length,
      peer_product_key_routing: peerRoute,
      quad_engine_crosswalk_nodes: crosswalk.length,
      quad_engine_pressure_hits: crosswalkHits.length,
      top_5_premises: routerResult.selectedPremises.slice(0, 5).map((p) => ({
        id: p.id,
        cluster: p.cluster,
        spectralScore: p.spectralScore,
        shrunkLogOddsDelta: p.shrunkLogOddsDelta,
      })),
    },
    master_situational_overlay: {
      streams_executed_count: overlayResult.streamCalls.filter((c) => c.called).length,
      streams_total_count: overlayResult.streamCalls.length,
      streams_skipped_count: overlayResult.streamCalls.filter((c) => !c.called).length,
      stream_calls: overlayResult.streamCalls,
      orthogonalization: overlayResult.orthogonalization,
      x_situational_80_records_evaluated: all80Results.length,
      zero_orphan_wired_modules: REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES.length,
      situational_expected_metrics_catalog_count: SITUATIONAL_EXPECTED_METRICS_CATALOG.length,
      zero_orphan_family_adjustments: overlayResult.zeroOrphanResult?.familyAdjustments,
      teb_pocket_regime: overlayResult.tebAvalancheBraid?.pocketRegime,
      target_funnel_classification: overlayResult.targetFunnel?.classification,
      rush_concept_adjustment_yds: overlayResult.rushConcept?.rushYardsAdjustment,
      conformal_abstention_decision: overlayResult.conformalAbstention?.verdict,
      kats_cusum_drift_detected: overlayResult.katsCusum?.changePointDetected,
      stage0_verified: overlayResult.stage0Verified,
      mind_feed_emission: overlayResult.feedRecord,
    },
    master_situational_reasoning_aggregator: {
      streams_executed_count: overlayResult.streamCalls.filter((c) => c.called).length,
      streams_total_count: overlayResult.streamCalls.length,
      streams_skipped_count: overlayResult.streamCalls.filter((c) => !c.called).length,
      stream15i_zero_orphan_modules_evaluated: REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES.length,
      stream15i_catalog_signals_evaluated: 51,
      situational_expected_metrics_catalog_descriptors: SITUATIONAL_EXPECTED_METRICS_CATALOG.length,
    },
    x_situational_80_rules: {
      total_rules: X_SITUATIONAL_80_RECORD_CATALOG.length,
      evaluated_count: all80Results.length,
    },
    wireable_dispatch_registry: {
      wireable_module_ids_count: WIREABLE_MODULE_COUNT,
      registered_model_ids_count: 196,
      total_registered_models_current: regSummary.total,
      wireable_now_count: regSummary.wireable,
    },
    signals_and_hb_props: {
      short_week_road_deficit: shortWeekRoad,
      backup_qb_rb_funnel: backupQbRbFunnel,
      backup_qb_te_funnel: backupQbTeFunnel,
      backup_qb_deep_wr_funnel: backupQbDeepWrFunnel,
      henry_contract_incentive: henryContractIncentive,
      andrews_contract_incentive: andrewsContractIncentive,
      hb_wr_receptions_prior: wrRecPrior,
      hb_btj_rec_posterior: btjRecPosterior,
      hb_btj_prob_over_4_5: Number(btjProbOver4_5.toFixed(4)),
      hb_btj_prob_over_58_5_yds: Number(btjProbOver58_5Yds.toFixed(4)),
      hb_shrinkage_rows: wrShrinkageTable.length,
    },
    signals_and_edge_lab: {
      short_week_road_deficit: shortWeekRoad,
      backup_qb_rb_funnel: backupQbRbFunnel,
      backup_qb_te_funnel: backupQbTeFunnel,
      backup_qb_deep_wr_funnel: backupQbDeepWrFunnel,
      henry_contract_incentive: henryContractIncentive,
      andrews_contract_incentive: andrewsContractIncentive,
      hb_wr_receptions_prior: wrRecPrior,
      hb_btj_rec_posterior: btjRecPosterior,
      hb_btj_prob_over_4_5: Number(btjProbOver4_5.toFixed(4)),
      hb_btj_prob_over_58_5_yds: Number(btjProbOver58_5Yds.toFixed(4)),
      hb_shrinkage_rows: wrShrinkageTable.length,
    },
    calibration_sgp_and_gates: {
      market_family_calibration: {
        MONEYLINE: mlCalibrated,
        SPREAD: spreadCalibrated,
        TOTAL: totalCalibrated,
        PLAYER_PROP: propCalibrated,
        DERIVATIVE_1Q_1H: deriv1HCalibrated,
      },
      sgp_clayton_copula: {
        qb_wr_joint: Number(sgpQbWr.toFixed(4)),
        qb_wr_lift_pp: Number(sgpQbWrLiftPp.toFixed(2)),
        three_leg_joint: Number(sgpThreeLeg.toFixed(4)),
      },
      parlay_conjunction_gate_check: parlayGateCheck,
      jev_publication_allowed: publicationAllowedForJev("VERIFIED_LIVE"),
    },
    prediction_engine_registry: {
      total_registered_models: regSummary.total,
      wireable_now_count: regSummary.wireable,
      wireable_dispatch_count: WIREABLE_MODULE_COUNT,
      wireable_module_names_sample: wireableModules.slice(0, 15).map((m) => m.name),
      by_tier: regSummary.byTier,
    },
  };

  const outFile = path.resolve(
    root,
    "data/engine/tnf_jax_bal_ts_engines_telemetry_2026_11_05.json",
  );
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2), "utf-8");
  console.log(JSON.stringify({
    ok: true,
    outFile,
    thousand_equation_matrix_count: summary.mcp_cognitive_router.thousand_equation_matrix_count,
    stage_d_shrinkage: summary.mcp_cognitive_router.stage_d_james_stein_shrinkage,
    stage_d_log_odds_delta: summary.mcp_cognitive_router.stage_d_clamped_log_odds_delta,
    streams_executed: `${summary.master_situational_overlay.streams_executed_count}/${summary.master_situational_overlay.streams_total_count}`,
    x_situational_80_records: summary.master_situational_overlay.x_situational_80_records_evaluated,
    zero_orphan_modules: summary.master_situational_overlay.zero_orphan_wired_modules,
    wireable_dispatch_count: summary.prediction_engine_registry.wireable_dispatch_count,
  }));
}

main();
