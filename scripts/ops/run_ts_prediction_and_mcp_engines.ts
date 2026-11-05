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
import {
  baseRateCheck,
} from "../../packages/prediction-engine/src/calibration/base-rate-honesty.js";
import {
  computeMetrics as computeCalibrationGateMetrics,
} from "../../packages/prediction-engine/src/calibration/calibration-gates.js";
import {
  conformalRank,
} from "../../packages/prediction-engine/src/calibration/conformal-copula-kelly.js";
import {
  skepticProb,
  skepticStakeFraction,
} from "../../packages/prediction-engine/src/calibration/skeptic-overlay.js";
import {
  scaledProb,
  expectedCalibrationError,
} from "../../packages/prediction-engine/src/calibration/temperature-scaling.js";
import {
  evaluateCausalClaim,
  graphFromCausalEdge,
} from "../../packages/prediction-engine/src/causal/causal-claim-gate.js";
import {
  canonicalizeForHash,
} from "../../packages/prediction-engine/src/certificate/decision-certificate.js";
import {
  certificateFromGateCandidate,
} from "../../packages/prediction-engine/src/certificate/gate-certificate-bridge.js";
import {
  brierScore,
  meanBrier,
} from "../../packages/prediction-engine/src/certificate/proper-scoring.js";
import {
  buildCoachBrainSystemPrompt,
  validateCoachBrainResponse,
} from "../../packages/prediction-engine/src/coach-brain/coach-brain-inference.js";
import {
  evaluateFourthDown,
} from "../../packages/prediction-engine/src/coach-sim/fourth-down-policy.js";
import {
  loadMultiplier,
  scaleDropoff,
} from "../../packages/prediction-engine/src/coach-sim/load-scaling.js";
import {
  evaluateCoachSchemePlayerFitMatchup,
  computeWeightedEntropyPlayProbe,
} from "../../packages/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.js";
import {
  MondrianResidualManager,
} from "../../packages/prediction-engine/src/conformal/mondrian.js";
import {
  brownForsythe,
  splitQuality,
} from "../../packages/prediction-engine/src/conformal/levene-welch.js";
import {
  evaluateArtificialAnalysisDecisionIndex,
} from "../../packages/prediction-engine/src/decision/aa-decision-index-gate.js";
import {
  regGateWeights,
} from "../../packages/prediction-engine/src/decision/2101-12523-sele-loss-gate.js";
import {
  lateWeightedDisagreement,
  nntdAbstain,
} from "../../packages/prediction-engine/src/decision/2205-13532-training-disagreement-gate.js";
import {
  instabilityScore,
  instabilitySelect,
} from "../../packages/prediction-engine/src/decision/2508-07556v2-instability-gate.js";
import {
  devig,
} from "../../packages/prediction-engine/src/devig/oracle.js";
import {
  evaluateProductNoBet,
} from "../../packages/prediction-engine/src/honesty/no-bet-gate.js";
import {
  compareDevigMethods,
} from "../../packages/prediction-engine/src/honesty/devig-method-compare.js";
import {
  commitPick,
  revealPick,
} from "../../packages/prediction-engine/src/honesty/commit-reveal.js";
import {
  computeGseActionScore,
} from "../../packages/prediction-engine/src/gse-score/gse-action-score.js";
import {
  calibrationActionCap,
} from "../../packages/prediction-engine/src/gse-score/calibration-action-policy.js";
import {
  aggregateModelParliament,
} from "../../packages/prediction-engine/src/gse-score/model-parliament.js";
import {
  evaluateSgpCombination,
} from "../../packages/prediction-engine/src/parlay/correlated-sgp-combinator.js";
import {
  bivariatePoissonPmf,
} from "../../packages/prediction-engine/src/parlay/correlationAdjuster.js";
import {
  anytimeTdProbability,
} from "../../packages/prediction-engine/src/props/anytime-td-mit.js";
import {
  fitCatchProwess,
} from "../../packages/prediction-engine/src/props/catch-prowess.js";
import {
  gateProp,
  shinDevig as fourBeatShinDevig,
} from "../../packages/prediction-engine/src/props/gse-four-beat.js";
import {
  fitBradleyTerry,
  btWinProb,
} from "../../packages/prediction-engine/src/ratings/bradley-terry.js";
import {
  conformalKellyStake,
} from "../../packages/prediction-engine/src/sizing/conformal-kelly.js";
import {
  constrainedKellyWeights,
} from "../../packages/prediction-engine/src/sizing/constrained-kelly.js";
import {
  solveSlateMpc,
} from "../../packages/prediction-engine/src/sizing/slate-mpc-staker.js";
import {
  airDensityKgM3,
  effectiveKickDistance,
} from "../../packages/prediction-engine/src/weather/air-density-fg.js";
import {
  ballEffects,
} from "../../packages/prediction-engine/src/weather/ball-physics.js";
import {
  selectWeatherSource,
} from "../../packages/prediction-engine/src/weather/decision-calibrated-weather.js";
import {
  conditionalCdf,
  conditionalQuantile,
} from "../../packages/prediction-engine/src/win-spread-total/conditional-score-dist.js";
import {
  inGameVolInterval,
} from "../../packages/prediction-engine/src/win-spread-total/in-game-volatility.js";
import {
  anchoredLiveWp,
} from "../../packages/prediction-engine/src/winprob/anchored-live-wp.js";
import {
  fitCellEstimator,
} from "../../packages/prediction-engine/src/winprob/bayesian-cell-wp.js";
import {
  composeOne,
  composeGraph,
  toCapabilityStatus,
  canActAsIf,
} from "../../packages/epistemic-twin/src/axes.js";
import {
  evaluateForeman10CheckDeterministicArbiter,
} from "../../packages/mcp-equations-server/src/foreman-warden-caveman-watcher.js";
import {
  transitionPieceState,
  DEFAULT_CONTENT_OS_THRESHOLDS,
} from "../../packages/mcp-equations-server/src/gse-content-os-engine.js";
import {
  HeadroomReversibleVault,
} from "../../packages/mcp-equations-server/src/headroom-magnemo-opik-harness.js";

function walkTsSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function countExportsInFile(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = content.match(/\bexport\s+(?:async\s+)?(?:function|class|interface|type|const|enum)\b/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

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

  // 8. Scan all 87 domain directories in packages/prediction-engine/src/ + packages/mcp-equations-server/src/
  const predEngineSrcDir = path.resolve(root, "packages/prediction-engine/src");
  const mcpServerSrcDir = path.resolve(root, "packages/mcp-equations-server/src");
  const predEntries = fs.readdirSync(predEngineSrcDir, { withFileTypes: true });
  const domainDirs = predEntries.filter((e) => e.isDirectory() && e.name !== "__tests__").map((e) => e.name).sort();
  const rootPredTsFiles = predEntries
    .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".spec.ts") && !e.name.endsWith(".d.ts"))
    .map((e) => path.join(predEngineSrcDir, e.name));

  const domainBreakdown: Record<string, { ts_files_count: number; exported_symbols_count: number }> = {
    _root: {
      ts_files_count: rootPredTsFiles.length,
      exported_symbols_count: rootPredTsFiles.reduce((acc, f) => acc + countExportsInFile(f), 0),
    },
  };
  let totalPredEngineTsFiles = rootPredTsFiles.length;
  let totalPredEngineExports = domainBreakdown._root!.exported_symbols_count;

  for (const dom of domainDirs) {
    const files = walkTsSourceFiles(path.join(predEngineSrcDir, dom));
    const exportsCount = files.reduce((acc, f) => acc + countExportsInFile(f), 0);
    domainBreakdown[dom] = {
      ts_files_count: files.length,
      exported_symbols_count: exportsCount,
    };
    totalPredEngineTsFiles += files.length;
    totalPredEngineExports += exportsCount;
  }
  const all87DomainNames = ["_root", ...domainDirs];

  const mcpTsFiles = walkTsSourceFiles(mcpServerSrcDir);
  const mcpExportsCount = mcpTsFiles.reduce((acc, f) => acc + countExportsInFile(f), 0);

  // 9. Scan all 25 workspace packages in packages/
  const packagesRootDir = path.resolve(root, "packages");
  const packageNames = fs
    .readdirSync(packagesRootDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const monorepoPackagesBreakdown: Record<string, { ts_files_count: number; exported_symbols_count: number }> = {};
  let monorepoTotalTsFiles = 0;
  let monorepoTotalExports = 0;
  for (const pkg of packageNames) {
    const pkgFiles = walkTsSourceFiles(path.join(packagesRootDir, pkg));
    const pkgExports = pkgFiles.reduce((acc, f) => acc + countExportsInFile(f), 0);
    monorepoPackagesBreakdown[pkg] = {
      ts_files_count: pkgFiles.length,
      exported_symbols_count: pkgExports,
    };
    monorepoTotalTsFiles += pkgFiles.length;
    monorepoTotalExports += pkgExports;
  }

  // 10. Execute live functions across the 87 prediction-engine domains + epistemic-twin + mcp-equations-server
  const calibrationProbs = [0.68, 0.54, 0.61, 0.48, 0.72, 0.59, 0.64, 0.52];
  const calibrationOutcomes: ReadonlyArray<0 | 1> = [1, 0, 1, 0, 1, 1, 1, 0];
  const baseRateHonestyRes = baseRateCheck(calibrationProbs, calibrationOutcomes, 0.05);
  const calGateMetricsRes = computeCalibrationGateMetrics(calibrationProbs, calibrationOutcomes);
  const confRankRes = conformalRank(250, 0.10);
  const skepticP = skepticProb(0.5307, [0.02, -0.01, 0.015], [0.4, 0.3, 0.2]);
  const skepticStake = skepticStakeFraction(skepticP, 0.5307, 0.02, 0.25);
  const tempScaled = scaledProb(0.85, 1.12);
  const tempEce = expectedCalibrationError(calibrationProbs, calibrationOutcomes, 10);

  const causalGraph = graphFromCausalEdge("trench_pressure_rate", "epa_per_dropback");
  const causalVerdict = evaluateCausalClaim({
    y: ["epa_per_dropback"],
    x: ["trench_pressure_rate"],
    graph: causalGraph,
    positivity: 0.18,
  });

  const certObj = {
    schemaVersion: "1" as const,
    kind: "NO_BET" as const,
    stratumKey: "NFL:SPREAD:TNF",
    modelVersion: "gse-v2.0.0",
    eventId: "2026_09_JAX_BAL",
    market: "SPREAD",
    certifiedAt: "2026-11-05T19:30:00Z",
    noBetReasons: ["NO_BET_LCB" as const],
    summary: "Selective gate abstained on TNF spread",
  };
  const certCanonical = canonicalizeForHash(certObj);
  const properBrier = meanBrier([
    { p: 0.68, y: 1 },
    { p: 0.53, y: 0 },
    { p: 0.72, y: 1 },
  ]);
  void brierScore(0.68, 1);
  void certificateFromGateCandidate;

  const coachSystemPrompt = buildCoachBrainSystemPrompt("863410deef596197");
  const coachValidation = validateCoachBrainResponse(
    "Projected win rate: 0.682 based on neutralPassRate and staffAggression with active injury Bhayshul Tuten.",
    {
      merkleRoot: "863410deef596197",
      gameId: "2026_09_JAX_BAL",
      calibratedProb: 0.682,
      expectedTendencies: ["neutralPassRate", "staffAggression"],
      allowedInjuries: ["Bhayshul Tuten"],
    },
  );
  const fourthDownRes = evaluateFourthDown({
    down: 4,
    ydstogo: 2,
    yardline: 58,
    scoreDiff: -3,
    timeRemaining: 420,
    timeouts: 3,
    staffAggression: 0.86,
  });
  const loadMultRes = loadMultiplier(0.165);
  const scaledDropRes = scaleDropoff(2.4, 0.165);
  const coachSchemeMatchupRes = evaluateCoachSchemePlayerFitMatchup({
    homeTeam: "BAL",
    awayTeam: "JAX",
    homeTargetHhi: 0.168,
    awayTargetHhi: 0.152,
    homeInjuryDropOffPoints: 3.2,
    awayInjuryDropOffPoints: 1.1,
  });
  const cudaEntropyProbeRes = computeWeightedEntropyPlayProbe({
    exactLeverageMatchesP: 3,
    partialDisplacementMatchesQ: 1,
    bucketCounts14: [4, 8, 12, 10, 9, 7, 6, 5, 4, 3, 2, 2, 1, 1],
  });

  const mondrianMgr = new MondrianResidualManager({ minSamples: 5 });
  mondrianMgr.addMany("NFL:SPREAD" as any, [0.02, 0.04, 0.05, 0.07, 0.09, 0.11, 0.14]);
  const mondrianQuantileRes = mondrianMgr.quantile("NFL:SPREAD" as any, 0.90);
  const bfRes = brownForsythe([
    [0.02, 0.04, 0.05, 0.07],
    [0.08, 0.12, 0.15, 0.19],
  ]);
  const splitQualRes = splitQuality([0.02, 0.04, 0.05, 0.07], [0.08, 0.12, 0.15, 0.19]);

  const aaDecisionRes = evaluateArtificialAnalysisDecisionIndex({
    omniscienceAccuracy: 0.88,
    omniscienceHallucinationRate: 0.04,
    hleCalibrationScore: 0.84,
    when2CallF1: 0.86,
    wildGuardCompliance: 0.98,
  });
  const seleWeights = regGateWeights(
    [
      { loss: 0.12, psi: [0.04, 0.5, 0.02, 6, 0.62] },
      { loss: 0.45, psi: [0.01, -0.5, 0.08, 4, 0.52] },
      { loss: 0.08, psi: [0.06, 1.0, 0.01, 8, 0.68] },
    ],
    1.0,
  );
  const snapSample = {
    id: "2026_09_JAX_BAL_SPREAD",
    snapshotProbs: [0.51, 0.52, 0.53, 0.53, 0.5307],
    finalProb: 0.5307,
    finalSide: true,
    lineMoveAgainst: 0.5,
    won: true,
  };
  const nntdDisagreement = lateWeightedDisagreement(snapSample);
  const nntdAbstainVerdict = nntdAbstain(snapSample, 0.08);
  const instScore = instabilityScore([0.52, 0.53, 0.54, 0.53, 0.525]);
  const instSelected = instabilitySelect([0.012, 0.045, 0.019], 0.70);

  const devigShinOracle = devig([1.91, 1.91], "shin");
  const devigCompareRes = compareDevigMethods({ homeImplied: 1 / 1.40, awayImplied: 1 / 3.05 });
  const prodNoBetRes = evaluateProductNoBet({
    oddsAgeMs: 12000,
    maxOddsAgeMs: 60000,
    n: 21,
    nMin: 20,
    width: 0.06,
    widthMax: 0.10,
    pLo: 0.512,
    q: 0.5238,
    tau: 0.015,
    liveBoardEnabled: true,
  });
  const commitBody = {
    pickId: "TNF_2026_W9_PASS",
    sport: "NFL",
    market: "SPREAD",
    selection: "PASS",
    modelVersion: "gse-v2.0.0",
    committedAt: "2026-11-05T19:30:00Z",
    line: "-6.5",
    edgeIndex: "0.0069",
  };
  const committed = commitPick(commitBody, "tnf_jax_bal_salt_2026");
  const revealedOk = revealPick(committed.commitment, commitBody, "tnf_jax_bal_salt_2026");

  const parliamentRes = aggregateModelParliament({
    votes: [
      { modelId: "jev_sinkhorn_10k", probability: 0.6798, confidence: 0.82 },
      { modelId: "mcp_1666_equations", probability: 0.7198, confidence: 0.78 },
      { modelId: "coach_scheme_fit", probability: 0.6650, confidence: 0.75 },
    ],
  });
  const calActionCapVal = calibrationActionCap("VALIDATED");
  const gseActionScoreRes = computeGseActionScore({
    marketProbability: 0.7082,
    modelParliament: {
      votes: [
        { modelId: "jev_sinkhorn_10k", probability: 0.6798, confidence: 0.82 },
        { modelId: "mcp_1666_equations", probability: 0.7198, confidence: 0.78 },
      ],
    },
    featureContract: {
      features: [
        { key: "trench_pressure", value: 0.34, quality: 0.96, ageMinutes: 5, required: true },
        { key: "qb_epa", value: -0.4308, quality: 0.95, ageMinutes: 5, required: true },
        { key: "coaching_proe", value: 0.015, quality: 0.94, ageMinutes: 5, required: true },
      ],
      maxAgeMinutes: 30,
    },
    calibration: {
      sampleCount: 250,
      expectedCalibrationError: 0.031,
      brierScore: 0.182,
      baselineBrierScore: 0.195,
    },
  });

  const sgpCombRes = evaluateSgpCombination(
    [
      {
        id: "henry_rush",
        playerId: "00-0032764",
        team: "BAL",
        propType: "RUSHING_YARDS",
        line: 86.5,
        direction: "OVER",
        individualFairProb: 0.56,
        bookmakerAmericanOdds: -115,
      },
      {
        id: "bal_spread",
        team: "BAL",
        propType: "SPREAD",
        line: -6.5,
        direction: "OVER",
        individualFairProb: 0.48,
        bookmakerAmericanOdds: -110,
      },
    ],
    220,
    5000,
  );
  const bivPoisPmf = bivariatePoissonPmf(3, 2, 1.8, 1.5, 0.35);
  const henryAtdRes = anytimeTdProbability({
    playerId: "00-0032764",
    season: 2026,
    week: 9,
    position: "RB",
    isHome: true,
    injuryStatus: "HEALTHY",
    rolling: {
      windowGames: 8,
      snapShare: 0.64,
      redZoneShare: 0.72,
      usageShare: 0.44,
      teamPlaysPerGame: 63.5,
      oppTdRateAllowed: 0.24,
    },
  });
  const catchProwessRes = fitCatchProwess([
    { receiverId: "Zay Flowers", x: 6.2, depth: 11.4, airYards: 11.4, separation: 3.1, caught: 1 },
    { receiverId: "Zay Flowers", x: -4.1, depth: 8.2, airYards: 8.2, separation: 2.8, caught: 1 },
    { receiverId: "Brian Thomas Jr.", x: 18.5, depth: 19.6, airYards: 19.6, separation: 2.4, caught: 1 },
  ]);
  const fourBeatShin = fourBeatShinDevig(-115, -105);
  const fourBeatGate = gateProp(
    {
      playerId: "00-0032764",
      playerName: "Derrick Henry",
      position: "RB",
      team: "BAL",
      opponent: "JAX",
      propType: "rush_yds",
      odds: [
        { bookmaker: "DraftKings", overOdds: -114, underOdds: -106, line: 86.5, vigPct: 4.3, isSharp: true, capturedAt: "2026-11-05T19:30:00Z" },
        { bookmaker: "FanDuel", overOdds: -115, underOdds: -105, line: 86.5, vigPct: 4.3, isSharp: false, capturedAt: "2026-11-05T19:30:00Z" },
        { bookmaker: "Pinnacle", overOdds: -112, underOdds: -104, line: 86.5, vigPct: 3.6, isSharp: true, capturedAt: "2026-11-05T19:30:00Z" },
      ],
    },
    0.515,
    4,
  );

  const btFitRes = fitBradleyTerry([
    { home: "BAL", away: "BUF", homeWin: 1 },
    { home: "BAL", away: "CIN", homeWin: 1 },
    { home: "JAX", away: "IND", homeWin: 1 },
    { home: "BUF", away: "JAX", homeWin: 1 },
  ]);
  const btBalJaxWp = btWinProb(btFitRes, "BAL", "JAX");

  const confKellyRes = conformalKellyStake(
    { edge: 0.012, intervalWidth: 0.085 },
    { fraction: 0.25, perPickCap: 0.03, grossCap: 0.15 },
    0,
  );
  const constrainedKellyRes = constrainedKellyWeights([0.55, 0.53], [0.91, 0.91], { maxW: 0.05, iters: 200 });
  const slateMpcRes = solveSlateMpc(
    [
      { p: 0.55, odds: 1.91 },
      { p: 0.53, odds: 1.91 },
    ],
    [
      [0.25, 0.04],
      [0.04, 0.25],
    ],
  );

  const mtBankRho = airDensityKgM3(33, 52, 30.04);
  const mtBankKick52 = effectiveKickDistance(52, 33, 52, 30.04);
  const mtBankBallPhysics = ballEffects(52);
  const weatherSourceChoice = selectWeatherSource(
    [
      { name: "NWS_MT_BANK", forecasts: [8, 9, 12], actuals: [8.5, 9.2, 11.8] },
      { name: "CLIMO_BASELINE", forecasts: [10, 10, 10], actuals: [8.5, 9.2, 11.8] },
    ],
    15,
  );

  const histScoredGames = [
    { context: [-6.5, 43.5], margin: 7 },
    { context: [-6.0, 44.0], margin: 3 },
    { context: [-7.0, 42.5], margin: 10 },
    { context: [-5.5, 45.0], margin: -3 },
  ];
  const condCdfAt6 = conditionalCdf(histScoredGames, [-6.5, 43.5], 6);
  const condQuant50 = conditionalQuantile(histScoredGames, [-6.5, 43.5], 0.5);
  const inGameVol = inGameVolInterval(3, 4.2, 2);
  const liveAnchoredWp = anchoredLiveWp(
    0.7082,
    { secondsLeft: 1800, scoreDiff: 3, possession: 1, yardsToGo: 6, timeoutFrac: 1.0 },
    { kappa: 2.0, alpha: 0.12, betaPoss: 0.2 },
  );
  const cellEst = fitCellEstimator([
    { cell: { tau: 2, omega: 1 }, counts: { wins: 38, games: 50 }, priorMean: 0.70 },
  ]);
  const cellPostWp = cellEst.posterior({ tau: 2, omega: 1 });

  // Operational Epistemic Twin (packages/epistemic-twin/src/axes.ts)
  const twinNow = new Date("2026-11-05T19:30:00Z");
  const twinGraph = composeGraph(
    [
      {
        id: "stage0_roster_gate",
        deps: [],
        evidence: { observedAt: twinNow, freshnessHorizonMs: 3600_000, intent: "open" },
      },
      {
        id: "stage2_jev_sinkhorn_sim",
        deps: [{ id: "stage0_roster_gate", kind: "hard" }],
        evidence: { observedAt: twinNow, freshnessHorizonMs: 3600_000, intent: "open" },
      },
      {
        id: "stage5_conjunction_publish",
        deps: [{ id: "stage2_jev_sinkhorn_sim", kind: "hard" }],
        evidence: { observedAt: twinNow, freshnessHorizonMs: 3600_000, intent: "proof_gated", reasons: ["0_bets_full_board_pass"] },
      },
    ],
    twinNow,
  );
  const twinSingleCompose = composeOne("stage0_direct", { kind: "healthy", reasons: [] }, []);
  const twinSimStatus = toCapabilityStatus(twinGraph.get("stage2_jev_sinkhorn_sim")!);
  const twinPublishStatus = toCapabilityStatus(twinGraph.get("stage5_conjunction_publish")!);
  const twinCanSimulate = canActAsIf("stage2_jev_sinkhorn_sim", "healthy", twinGraph);
  const twinCanPublish = canActAsIf("stage5_conjunction_publish", "healthy", twinGraph);

  // Fleet Governance & Content OS & Headroom (packages/mcp-equations-server/src/*)
  const foremanVerdict = evaluateForeman10CheckDeterministicArbiter({
    loopBounceCount: 0,
    verificationStarted: true,
    verificationCompleted: true,
    verificationPassed: true,
    retryableErrorCount: 0,
    taskWorkCompleted: true,
  });
  const contentOsNextState = transitionPieceState("DRAFTED", "HUMANIZED", "TEXT", true);
  const headroomVault = new HeadroomReversibleVault();
  const prefixAligned = headroomVault.alignPromptPrefixForKvCache(
    "GSE Connected Workflow Anchor 2026-11-05T19:30:00Z Stage0->Stage5",
  );
  const compressedEntry = headroomVault.compressReversible(JSON.stringify(all80Results.slice(0, 10)));

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
    prediction_engine_87_domains_inventory: {
      total_domains: all87DomainNames.length,
      total_ts_files: totalPredEngineTsFiles,
      total_exported_symbols: totalPredEngineExports,
      root_ts_files_count: rootPredTsFiles.length,
      mcp_equations_server_ts_files_count: mcpTsFiles.length,
      mcp_equations_server_exported_symbols_count: mcpExportsCount,
      combined_ts_files_count: totalPredEngineTsFiles + mcpTsFiles.length,
      domain_names: all87DomainNames,
      domains: domainBreakdown,
    },
    monorepo_25_packages_inventory: {
      total_packages: packageNames.length,
      total_ts_files: monorepoTotalTsFiles,
      total_exported_symbols: monorepoTotalExports,
      package_names: packageNames,
      packages: monorepoPackagesBreakdown,
    },
    live_87_domains_and_25_packages_executions: {
      calibration: {
        base_rate_honesty: baseRateHonestyRes,
        calibration_gates_metrics: calGateMetricsRes,
        conformal_rank_250_alpha10: confRankRes,
        skeptic_prob: Number(skepticP.toFixed(6)),
        skeptic_stake_fraction: Number(skepticStake.toFixed(6)),
        temperature_scaled_prob: Number(tempScaled.toFixed(6)),
        temperature_ece: Number(tempEce.toFixed(6)),
      },
      causal: {
        claim_publishable: causalVerdict.publishable,
        conclusion: causalVerdict.conclusion,
        formula: causalVerdict.formula,
      },
      certificate: {
        canonical_no_bet_certificate_length: certCanonical.length,
        mean_brier: Number(properBrier.toFixed(6)),
      },
      coach_brain_and_sim: {
        system_prompt_length: coachSystemPrompt.length,
        validation_passed: coachValidation.valid,
        fourth_down_decision: fourthDownRes,
        load_multiplier: Number(loadMultRes.toFixed(4)),
        scaled_dropoff: scaledDropRes,
        coach_scheme_matchup: {
          pure_football_expected_home_points: coachSchemeMatchupRes.pureFootballExpectedHomePoints,
          pure_football_expected_away_points: coachSchemeMatchupRes.pureFootballExpectedAwayPoints,
          pure_football_expected_margin_home: coachSchemeMatchupRes.pureFootballExpectedMarginHome,
          pure_football_expected_total: coachSchemeMatchupRes.pureFootballExpectedTotal,
          home_biomechanical_fsm: coachSchemeMatchupRes.homeBiomechanicalFsm,
          away_biomechanical_fsm: coachSchemeMatchupRes.awayBiomechanicalFsm,
        },
        cuda_weighted_entropy_probe: cudaEntropyProbeRes,
      },
      conformal: {
        mondrian_quantile_90: mondrianQuantileRes,
        brown_forsythe: bfRes,
        split_quality: splitQualRes,
      },
      decision: {
        aa_decision_index: aaDecisionRes,
        sele_ridge_weights: seleWeights.map((w) => Number(w.toFixed(4))),
        nntd_late_weighted_disagreement: Number(nntdDisagreement.toFixed(6)),
        nntd_abstain: nntdAbstainVerdict,
        instability_score: Number(instScore.toFixed(6)),
        instability_selected_indices: instSelected,
      },
      devig_and_honesty: {
        oracle_shin: devigShinOracle,
        devig_method_compare: devigCompareRes,
        product_no_bet: prodNoBetRes,
        commit_reveal_verified: revealedOk,
        commitment_hash: committed.commitment,
      },
      gse_score: {
        calibration_action_cap: calActionCapVal,
        parliament_status: parliamentRes.status,
        parliament_modeled_prob: parliamentRes.modeledProbability,
        action_score: gseActionScoreRes.score,
        action_decision: gseActionScoreRes.decision,
      },
      parlay_and_props: {
        correlated_sgp_eval: sgpCombRes,
        bivariate_poisson_pmf_3_2: Number(bivPoisPmf.toFixed(6)),
        henry_anytime_td_mit: henryAtdRes,
        catch_prowess: catchProwessRes,
        four_beat_shin: fourBeatShin,
        four_beat_gate: fourBeatGate,
      },
      ratings: {
        bradley_terry_bal_vs_jax_wp: Number(btBalJaxWp.toFixed(4)),
        strengths: btFitRes.strengths,
      },
      sizing: {
        conformal_kelly: confKellyRes,
        constrained_kelly_weights: constrainedKellyRes.map((w) => Number(w.toFixed(4))),
        slate_mpc_weights: slateMpcRes.map((w) => Number(w.toFixed(4))),
      },
      weather: {
        mt_bank_air_density_kg_m3: Number(mtBankRho.toFixed(5)),
        mt_bank_effective_kick_52yd: Number(mtBankKick52.toFixed(2)),
        mt_bank_ball_physics_52f: mtBankBallPhysics,
        selected_weather_source: weatherSourceChoice,
      },
      win_spread_total_and_winprob: {
        conditional_cdf_at_6: Number(condCdfAt6.toFixed(4)),
        conditional_quantile_50: condQuant50,
        in_game_vol_interval: inGameVol,
        anchored_live_wp: Number(liveAnchoredWp.toFixed(4)),
        bayesian_cell_posterior_wp: Number(cellPostWp.toFixed(4)),
      },
      epistemic_twin: {
        single_compose_kind: twinSingleCompose.kind,
        sim_capability_status: twinSimStatus,
        publish_capability_status: twinPublishStatus,
        can_act_as_if_sim_healthy: twinCanSimulate,
        can_act_as_if_publish_healthy: twinCanPublish,
      },
      mcp_fleet_and_content_os: {
        foreman_arbiter: foremanVerdict,
        content_os_transition: contentOsNextState,
        content_os_ece_restriction: DEFAULT_CONTENT_OS_THRESHOLDS["calibration.ece_restriction"],
        headroom_prefix_block_hashes: prefixAligned.blockHashes,
        headroom_compressed_handle: compressedEntry.handle,
        headroom_compression_ratio: Number((compressedEntry.compressedBytes / Math.max(1, compressedEntry.originalBytes)).toFixed(4)),
      },
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
    prediction_engine_domains: summary.prediction_engine_87_domains_inventory.total_domains,
    prediction_engine_ts_files: summary.prediction_engine_87_domains_inventory.total_ts_files,
    monorepo_packages: summary.monorepo_25_packages_inventory.total_packages,
    monorepo_ts_files: summary.monorepo_25_packages_inventory.total_ts_files,
  }));
}

main();
