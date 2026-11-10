/**
 * Expected-metrics engine — our OWN expected-value metrics computed from public
 * play-by-play, plus the ground-truth validation that proves them against Next
 * Gen Stats. Pure, deterministic, zero-dependency; fit-on-load by design.
 *
 * The pipeline a caller runs:
 *   1. Map nflverse play-by-play rows → DropbackPlay / RushPlay / CatchPlay.
 *   2. fit*Model(plays) — fit our model on the real season (null if under-sampled).
 *   3. compute*(plays, model) — per-player over-expected rollups (our metric).
 *   4. buildCalibrationReport(ours, ngsGroundTruth) + graduationVerdict(...) —
 *      prove the metric reproduces NGS at matched grain.
 *
 * NGS numbers enter ONLY as the y-axis of the validation correlation; they are
 * never copied into a served metric. What we serve is always our own computation.
 */

// Numeric + regression primitives (reusable).
export {
  mean,
  variance,
  stddev,
  fitScaler,
  applyScaler,
  solveLinearSystem,
  sigmoid,
  pearson,
  spearman,
  rankAverage,
  rmse,
  mae,
  round as roundMetric,
  type FeatureScaler,
} from "./numeric.js";
export { fitRidge, predictRidge, type LinearModel } from "./linear.js";
export { fitLogistic, predictLogistic, type LogisticModel, type LogisticFitOptions } from "./logistic.js";

// Shared contracts.
export {
  computeFeatureSchemaHash as computeExpectedMetricSchemaHash,
  type ExpectedMetricProvenance,
  type PlayerExpectedMetric,
} from "./types.js";
export { rollupByPlayer, type PlayerPlayOutcome, type RollupOptions } from "./rollup.js";

// Expected completion → GSE-CPOE.
export {
  fitExpectedCompletionModel,
  predictCompletionProbability,
  computeCpoe,
  EXPECTED_COMPLETION_FEATURE_KEYS,
  EXPECTED_COMPLETION_MODEL_VERSION,
  MIN_DROPBACKS_TO_FIT,
  DEFAULT_MIN_PASSER_ATTEMPTS,
  type DropbackPlay,
  type ExpectedCompletionModel,
} from "./expected-completion.js";

// Expected rush yards → GSE-RYOE.
export {
  fitExpectedRushModel,
  predictExpectedRushYards,
  computeRyoe,
  EXPECTED_RUSH_FEATURE_KEYS,
  EXPECTED_RUSH_MODEL_VERSION,
  MIN_RUSHES_TO_FIT,
  DEFAULT_MIN_RUSHER_ATTEMPTS,
  type RushPlay,
  type ExpectedRushModel,
} from "./expected-rush-yards.js";

// Expected YAC → GSE-xYAC.
export {
  fitExpectedYacModel,
  predictExpectedYac,
  computeYacOverExpected,
  EXPECTED_YAC_FEATURE_KEYS,
  EXPECTED_YAC_MODEL_VERSION,
  MIN_CATCHES_TO_FIT,
  DEFAULT_MIN_RECEIVER_CATCHES,
  type CatchPlay,
  type ExpectedYacModel,
} from "./expected-yac.js";

// Ground-truth validation (prove it).
export {
  buildCalibrationReport,
  buildEpCalibration,
  buildWpCalibration,
  graduationVerdict,
  DEFAULT_GRADUATION_THRESHOLDS,
  type GroundTruthPoint,
  type CalibrationReport,
  type GraduationVerdict,
  type GraduationThresholds,
  type GraduationResult,
} from "./validation.js";

// Expected points → GSE-EPA (glass-box, enters dark).
export {
  fitExpectedPointsModel,
  predictScoreDistribution,
  predictExpectedPoints,
  expectedPointsAdded,
  deriveNextScore,
  EXPECTED_POINTS_FEATURE_KEYS,
  EXPECTED_POINTS_MODEL_VERSION,
  EP_OUTCOMES,
  EP_OUTCOME_VALUES,
  EP_REQUIRED_OUTCOMES,
  MIN_EP_PLAYS_TO_FIT,
  EP_DEFAULT_HALF_SECONDS,
  type EpPlay,
  type NextScoreOutcome,
  type ExpectedPointsModel,
  type RawScoringContext,
} from "./expected-points.js";

// Win probability → GSE-WPA (glass-box, enters dark).
export {
  fitWinProbabilityModel,
  predictWinProbability,
  winProbabilityAdded,
  WIN_PROBABILITY_FEATURE_KEYS,
  WIN_PROBABILITY_MODEL_VERSION,
  MIN_WP_PLAYS_TO_FIT,
  type WpPlay,
  type WinProbabilityModel,
} from "./win-probability.js";

// Success rate (deterministic; glass-box, enters dark).
export {
  isSuccessfulPlay,
  successRateByTeam,
  successRateByPlayer,
  successRateByDown,
  successRateBySituation,
  SUCCESS_RATE_MODEL_VERSION,
  SUCCESS_YARDAGE_FRACTION,
  type SuccessPlay,
  type SuccessRateSplit,
} from "./success-rate.js";

// Drive aggregation (deterministic; glass-box, enters dark).
export {
  buildDrives,
  DRIVES_MODEL_VERSION,
  type DrivePlay,
  type Drive,
  type DriveResult,
} from "./drives.js";

// nflverse pbp → EP/WP/Success/Drives mapper (pure; referee columns carried
// ONLY as calibration y-axis, never emitted as a metric).
export {
  mapNflversePbpToExpectedMetrics,
  attachOwnEpa,
  NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS,
  type PbpRow,
  type TransitionPair,
  type MappedExpectedMetricsPlays,
} from "./nflverse-pbp-mapper.js";

// Situational Expected-Metrics Catalog (Q1–Q51 bits 220..278).
export {
  SITUATIONAL_EXPECTED_METRICS_CATALOG,
  computeManageableThirdDownRate,
  computeToxicDifferential,
  computeTargetShareGini,
  type ExpectedMetricDescriptor,
} from "./situational-expected-metrics-catalog.js";

// Batch 3 + Batch 4 + Gap-Hunt + Repo-Catalog + AM Sweep Operators.
export {
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
  type ShortWeekCircadianInput,
  type ShortWeekCircadianResult,
  type NeuroBiomechanicalCollisionInput,
  type NeuroBiomechanicalCollisionResult,
  type DefensiveDriveFatigueInput,
  type DefensiveDriveFatigueResult,
  type FourthDownEpInput,
  type FourthDownEpResult,
  type KickerShrinkageAndOvertimeInput,
  type KickerShrinkageAndOvertimeResult,
  type TweediePropShrinkageInput,
  type TweediePropShrinkageResult,
  type PortfolioKellyLeg,
  type PortfolioKellyResult,
  type SpatialTrackingFrameSoA,
  type SpatialControlResult,
  type HydrodynamicTrenchInput,
  type HydrodynamicTrenchResult,
  type AchEvidenceRow,
  type HeuerAchDiagnosticityResult,
  type PrerouterExpertCandidate,
  type PrerouterPredictionResult,
  type CorpCalibrationPair,
  type CorpIsotonicCalibrationResult,
} from "./batch3-sports-physics-bridge.js";

// Q52 — Defensive Field-Zone Split: Red-Zone vs Open-Field Efficiency Allowed (SHADOW).
export {
  computeDefensiveFieldZoneSplit,
  DEFENSIVE_FIELD_ZONE_SPLIT_VERSION,
  DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS,
  RED_ZONE_MAX_YARDLINE_100,
  MIN_RED_ZONE_PLAYS_FLOOR,
  MIN_OPEN_FIELD_PLAYS_FLOOR,
  MIN_RED_ZONE_EPA_PLAYS_FLOOR,
  type FieldZoneWindowType,
  type DefensiveFieldZonePlay,
  type DefensiveFieldZoneMetrics,
  type DefensiveRedZoneMetrics,
  type DefenseFieldZoneSplitRow,
  type FieldZoneLeagueContext,
  type BelowFloorDefenseDiagnostic,
  type DefensiveFieldZoneDiagnostics,
  type DefensiveFieldZoneWindowResult,
  type DefensiveFieldZoneSplitOutput,
  type ComputeDefensiveFieldZoneOptions,
} from "./defensive-field-zone-split.js";

// Q53 — QB Efficiency Split by Opponent Defensive Tier: Matchup Sensitivity (SHADOW).
export {
  computeQbOpponentTierEfficiencySplit,
  QB_OPPONENT_TIER_EFFICIENCY_SPLIT_VERSION,
  QB_OPPONENT_TIER_FEATURE_KEYS,
  MIN_PRIOR_DEFENSE_RATABLE_DROPBACKS_FOR_RANK,
  TOP_DEFENSE_TIER_MAX_RANK,
  MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR,
  QB_OPPONENT_TIER_SHRINKAGE_K,
  type QbOpponentTier,
  type QbOpponentTierWindowType,
  type QbOpponentTierDropbackPlay,
  type DefensePointInTimeRankEntry,
  type QbOpponentTierArm,
  type QbOpponentTierWindowRow,
  type QbOpponentTierWindowDiagnostics,
  type QbOpponentTierWindowResult,
  type QbOpponentTierEfficiencySplitOutput,
  type ComputeQbOpponentTierOptions,
} from "./qb-opponent-tier-efficiency-split.js";

// Q54 — QB Efficiency Split Before vs After First Interception: In-Game Tilt Response (SHADOW).
export {
  computeQbPostFirstIntEfficiencySplit,
  QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION,
  QB_POST_FIRST_INT_FEATURE_KEYS,
  MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR,
  QB_POST_FIRST_INT_SHRINKAGE_K,
  type QbPostFirstIntArmName,
  type QbPostFirstIntWindowType,
  type QbPostFirstIntDropbackPlay,
  type QbPostFirstIntArm,
  type QbPostFirstIntWindowRow,
  type QbPostFirstIntWindowDiagnostics,
  type QbPostFirstIntWindowResult,
  type QbPostFirstIntEfficiencySplitOutput,
  type ComputeQbPostFirstIntOptions,
} from "./qb-post-first-int-efficiency-split.js";
