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
  graduationVerdict,
  DEFAULT_GRADUATION_THRESHOLDS,
  type GroundTruthPoint,
  type CalibrationReport,
  type GraduationVerdict,
  type GraduationThresholds,
  type GraduationResult,
} from "./validation.js";
