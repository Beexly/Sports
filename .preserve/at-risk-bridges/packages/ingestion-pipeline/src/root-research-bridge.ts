/**
 * root-research-bridge.ts — fail-closed bridge from the ROOT-LEVEL numbered research
 * modules of `packages/prediction-engine/src/NNNN-NNNNN-*.ts` into a live, reasoned API.
 *
 * WHAT THIS IS
 * ------------
 * The numbered research files are a deep bench of primitives (calibration, win
 * probability, counting models, forecast combination, market microstructure, staking,
 * proper scoring rules). Individually they are inert. This bridge calls the REAL kernels
 * deep-imported by path, validates inputs, re-validates outputs, and returns a
 * discriminated `RootEval` that is either honest data or a specific refusal.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a signal path. Nothing here publishes, prices, or gates a pick. Every
 * probability this file returns IS a probability (finite, in [0,1], from a kernel that
 * computes one). Every score, error metric, z-statistic, weight and correlation is named
 * so it cannot be read as a win rate. No clamping, no renormalising, no imputation.
 *
 * DOMAIN RULES ENFORCED HERE
 * ---------------------------
 *  - Probability in [0,1] and finite, or fail.
 *  - Distribution non-negative and summing to 1 within 1e-9, or fail (never renormalise).
 *  - Scores/z/weights/correlations are never named `probability`; regression and fit
 *    quality is always reported alongside any fitted quantity.
 *  - Any estimate from n observations states n and fails closed below a named floor.
 *  - Deterministic RNG only (LCG). `Math.random` is never referenced here, and is never
 *    handed to a kernel as a default.
 *
 * GATES
 * -----
 * Every wired module was verified to have NO `export const ENABLED = false;` gate, so
 * every result carries `gate: "ungated"`. The literal union is deliberately closed: adding
 * a gated module forces adding a gate variant here, and the value is a required field on
 * every result payload. `rootResearchGateReport()` re-states this at runtime.
 */

import {
  decayWeights,
  ece,
  pavaIsotonic,
  temperatureScale,
} from "@sports/prediction-engine/src/2409-17077v1-efficient-feature-interactions-with-transformers.js";
import {
  conformalHalfWidth,
  empiricalCoverage,
  metaWeights,
  predictionBand,
} from "@sports/prediction-engine/src/2502-07528v3-forecasting-the-future-development-in.js";
import {
  blendedRating,
  eloExpected,
  eloUpdate,
  logLossGate,
  rollingOriginTune,
} from "@sports/prediction-engine/src/2506-00348-beyond-winning-margin-of-victory.js";
import {
  covariateBtProb,
  fitCovariateBt,
} from "@sports/prediction-engine/src/2507-22472-inference-in-a-generalized-bradleyterry.js";
import {
  fitCellRecal,
  recalibrate,
} from "@sports/prediction-engine/src/2602-19520v2-decomposing-crowd-wisdom-domainspecific-calibration.js";
import {
  availabilityProb,
  fitAvailability,
  plattApply,
  plattCalibrate,
} from "@sports/prediction-engine/src/2608-23776v1-disentangled-skill-representations-for-predictive.js";
import {
  chebEmStep,
  chebWinProb,
  chebyshevBasis,
} from "@sports/prediction-engine/src/2512-15269v1-model-inference-for-ranking-from.js";
import {
  bivPoisPmf,
  ingameLambdas,
  mcHomeWinProb,
} from "@sports/prediction-engine/src/2410-09068-modeling-and-prediction-of-the.js";
import {
  cauchySurrogate,
  combinationWeights,
  sourceScores,
} from "@sports/prediction-engine/src/2503-20082-optimizing-forecast-combination-weights-using.js";
import {
  blendSpecs,
  logEntropyWeights,
  posteriorPredictiveInterval,
} from "@sports/prediction-engine/src/2602-11379-regularized-ensemble-forecasting-for-learning.js";
import {
  identifiabilityFlag,
  igWeightedClv,
  infoGain,
} from "@sports/prediction-engine/src/2601-18815-prediction-markets-as-bayesian-inverse.js";
import {
  breadthHhi,
  directionAgreement,
  signalCredibilityIndex,
} from "@sports/prediction-engine/src/2604-27041-the-signal-credibility-index-for.js";
import {
  anchorRobustFilter,
  driftShare,
  hazardDecayWeight,
} from "@sports/prediction-engine/src/2605-00459-information-leakage-at-population-scale.js";
import {
  executableEdge,
  naiveMidBound,
} from "@sports/prediction-engine/src/2608-00666-executable-arbitrage-and-market-efficiency.js";
import {
  dedupDislocations,
  singleMarketDislocation,
  syntheticShortDislocation,
} from "@sports/prediction-engine/src/2605-00864-arbitrage-analysis-in-polymarket-nba.js";
import {
  correlationDiscount,
  sgpFairPrice,
} from "@sports/prediction-engine/src/2607-18299-apmm-automated-parlay-market-maker.js";
import { batteryVerdict } from "@sports/prediction-engine/src/2604-08251v1-the-statistical-profitability-of-social.js";
import {
  goEV,
  indifferenceP,
  kickEV,
  recommend,
  regretVsBenchmark,
  spearman,
} from "@sports/prediction-engine/src/2512-00312v2-kicking-for-goal-or-touch.js";
import {
  blockBootstrapPaths,
  conformalPidUpdate,
  quantile as mscpQuantile,
  saMscpInterval,
} from "@sports/prediction-engine/src/2606-16356v1-simulationaugmented-multistep-split-conformal-prediction.js";
import {
  betaEnergyScore,
  crpsGaussian,
  intervalScore,
  meanScore,
} from "@sports/prediction-engine/src/2603-08206v5-distributional-regression-with-tabular-foundation.js";
import {
  deltaBicVsPoisson,
  hawkesIntensity,
  hawkesLogLik,
  waldZ,
} from "@sports/prediction-engine/src/2601-07980v1-modeling-event-dynamics-by-selfexciting.js";
import { cumulativeProbs } from "@sports/prediction-engine/src/2506-03057v1-partially-regularized-ordinal-regression-to.js";
import { acProbs, reorderRate } from "@sports/prediction-engine/src/2608-23859-ranking-by-points-and-ordinal.js";
import {
  fitOuClock,
  staleLineWindows,
} from "@sports/prediction-engine/src/2503-16470-ornsteinuhlenbeck-process-for-horse-race.js";
import {
  classifyGameState,
  clockWinProb,
  driveOutcomeForecast,
  uncertaintyBand,
} from "@sports/prediction-engine/src/2508-15299v1-basketlidar-the-first-lidarcamera-multimodal.js";
import {
  decomposeClv as researchDecomposeClv,
  netClv,
  properBetStake,
} from "@sports/prediction-engine/src/2607-06166-when-do-prophets-profit-in.js";
import {
  auditAgreement,
  brierScore,
  decisionEV,
  jamesSteinShrink as researchJamesSteinShrink,
} from "@sports/prediction-engine/src/2604-13861v2-simulationbased-optimisation-of-batting-order.js";
import {
  grapm,
  groupEpaPerPlay,
  memberPrior,
  relImprovement,
  rmse as researchRmse,
} from "@sports/prediction-engine/src/2601-15000v1-lineup-regularized-adjusted-plusminus-lrapm.js";
import {
  advantageWeight,
  dRegret,
  linearPool,
} from "@sports/prediction-engine/src/2607-04389v1-ledger-0796-decentralized-aggregation-of.js";
import {
  ddlDistribution,
  ddlExpectedDisplacement,
} from "@sports/prediction-engine/src/2608-11203v1-capturing-uncertainty-in-human-motion.js";
import {
  policyRoi,
  shouldPublish,
  tuneAbstention,
} from "@sports/prediction-engine/src/2510-18193v2-fstai-20-an-explainable-ai.js";
import {
  isDomainValid,
  judgeAugmentedLoss,
  judgeScore,
} from "@sports/prediction-engine/src/2509-03036-knowledge-integration-for-physicsinformed-symbolic.js";

/* ───────────────────────────── core contract ───────────────────────────── */

/** Fail-closed result envelope. `reason` is always specific; never a generic "invalid". */
export type RootEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): RootEval<never> {
  return { ok: false, reason };
}

/**
 * Closed gate union. Every wired module was checked for `export const ENABLED = false;`
 * and none carries one, so the only legal value today is "ungated". Widening this union is
 * the compile-time signal that a gated module has entered the bridge.
 */
export type RootGate = "ungated";

const WIRED_MODULE_FILES: readonly string[] = [
  "2409-17077v1-efficient-feature-interactions-with-transformers",
  "2410-09068-modeling-and-prediction-of-the",
  "2502-07528v3-forecasting-the-future-development-in",
  "2503-16470-ornsteinuhlenbeck-process-for-horse-race",
  "2503-20082-optimizing-forecast-combination-weights-using",
  "2506-00348-beyond-winning-margin-of-victory",
  "2506-03057v1-partially-regularized-ordinal-regression-to",
  "2507-22472-inference-in-a-generalized-bradleyterry",
  "2508-15299v1-basketlidar-the-first-lidarcamera-multimodal",
  "2509-03036-knowledge-integration-for-physicsinformed-symbolic",
  "2510-18193v2-fstai-20-an-explainable-ai",
  "2512-00312v2-kicking-for-goal-or-touch",
  "2512-15269v1-model-inference-for-ranking-from",
  "2601-07980v1-modeling-event-dynamics-by-selfexciting",
  "2601-15000v1-lineup-regularized-adjusted-plusminus-lrapm",
  "2601-18815-prediction-markets-as-bayesian-inverse",
  "2602-11379-regularized-ensemble-forecasting-for-learning",
  "2602-19520v2-decomposing-crowd-wisdom-domainspecific-calibration",
  "2603-08206v5-distributional-regression-with-tabular-foundation",
  "2604-08251v1-the-statistical-profitability-of-social",
  "2604-13861v2-simulationbased-optimisation-of-batting-order",
  "2604-27041-the-signal-credibility-index-for",
  "2605-00459-information-leakage-at-population-scale",
  "2605-00864-arbitrage-analysis-in-polymarket-nba",
  "2606-16356v1-simulationaugmented-multistep-split-conformal-prediction",
  "2607-04389v1-ledger-0796-decentralized-aggregation-of",
  "2607-06166-when-do-prophets-profit-in",
  "2607-18299-apmm-automated-parlay-market-maker",
  "2608-00666-executable-arbitrage-and-market-efficiency",
  "2608-11203v1-capturing-uncertainty-in-human-motion",
  "2608-23776v1-disentangled-skill-representations-for-predictive",
  "2608-23859-ranking-by-points-and-ordinal",
];

/** Every numbered research module wired by this file, with its source file name. */
export const ROOT_RESEARCH_MODULES: ReadonlyArray<{
  readonly id: string;
  readonly file: string;
}> = WIRED_MODULE_FILES.map((f) => ({ id: f, file: `${f}.ts` }));

/** Runtime re-statement of the gate situation, for any caller that wants to log it. */
export function rootResearchGateReport(): {
  readonly moduleCount: number;
  readonly gatedModuleCount: number;
  readonly gate: RootGate;
} {
  return { moduleCount: ROOT_RESEARCH_MODULES.length, gatedModuleCount: 0, gate: "ungated" };
}

/* ─────────────────────────── validation helpers ─────────────────────────── */

/** Distribution sum tolerance. A pmf that misses this is an upstream bug, not rounding. */
export const PMF_SUM_TOLERANCE = 1e-9;

/** Minimum n for a descriptive statistic to be reported at all. */
export const ROOT_MIN_SAMPLE = 5;

/**
 * Minimum n for a split-conformal half-width. 9 is the smallest n for which a 90%
 * conformal quantile is finite without rank clamping; below it the honest answer is
 * "no interval", not a clamped one.
 */
export const ROOT_MIN_RESIDUAL_SAMPLE = 9;

/** Minimum n for a multi-parameter fit to be reported with its fit quality. */
export const ROOT_MIN_FIT_SAMPLE = 10;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** A probability the kernel computed: finite and inside the closed unit interval. */
function isProbability(v: unknown): v is number {
  return isFiniteNumber(v) && v >= 0 && v <= 1;
}

/** A probability the kernel CONSUMED must be strictly interior, or its logit is not finite. */
function isInteriorProbability(v: unknown): v is number {
  return isFiniteNumber(v) && v > 0 && v < 1;
}

function isFiniteArray(xs: readonly number[], label: string): RootEval<true> {
  for (let i = 0; i < xs.length; i++) {
    const v = xs[i];
    if (!isFiniteNumber(v)) return fail(`${label}: element ${i} is not a finite number`);
  }
  return { ok: true, data: true };
}

/**
 * A distribution must be non-negative and normalise. We FAIL rather than renormalise:
 * renormalising hides the upstream bug that produced the bad mass.
 */
function checkDistribution(
  vals: readonly number[],
  label: string,
  tol: number = PMF_SUM_TOLERANCE,
): RootEval<{ readonly sum: number }> {
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (!isFiniteNumber(v)) return fail(`${label}: element ${i} is not finite`);
    if (v < 0) return fail(`${label}: element ${i} is negative (${v})`);
    sum += v;
  }
  if (Math.abs(sum - 1) > tol) {
    return fail(`${label}: sums to ${sum}, not 1 within ${tol}`);
  }
  return { ok: true, data: { sum } };
}

function checkBounded(v: unknown, lo: number, hi: number, label: string): RootEval<number> {
  if (!isFiniteNumber(v)) return fail(`${label}: not a finite number`);
  if (v < lo || v > hi) return fail(`${label}: ${v} outside [${lo}, ${hi}]`);
  return { ok: true, data: v };
}

function checkFinite(v: unknown, label: string): RootEval<number> {
  if (!isFiniteNumber(v)) return fail(`${label}: not a finite number`);
  return { ok: true, data: v };
}

function checkNonNegative(v: unknown, label: string): RootEval<number> {
  if (!isFiniteNumber(v)) return fail(`${label}: not a finite number`);
  if (v < 0) return fail(`${label}: ${v} is negative`);
  return { ok: true, data: v };
}

/**
 * Deterministic 32-bit LCG (Numerical Recipes constants). The only randomness source the
 * bridge hands to a kernel. Seeded per call site so every number is reproducible.
 */
export function rootLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ═════════════════════ 1. CALIBRATION OF PROBABILITIES ═════════════════════ */

export interface DecayWeightResult {
  readonly gate: RootGate;
  /** Weights in (0,1]; a zero clock distance has weight exactly 1. NOT a pmf. */
  readonly weights: readonly number[];
  readonly n: number;
}

/** Exponential-decay weights on game-clock distance (2409-17077v1). */
export function evalDecayWeights(
  clockDist: readonly number[],
  halfLifeSeconds: number,
): RootEval<DecayWeightResult> {
  if (clockDist.length === 0) return fail("decayWeights: no clock distances supplied");
  if (!isFiniteNumber(halfLifeSeconds) || halfLifeSeconds <= 0) {
    return fail(`decayWeights: halfLifeSeconds must be > 0, got ${halfLifeSeconds}`);
  }
  const input = isFiniteArray(clockDist, "decayWeights");
  if (!input.ok) return input;
  let weights: number[];
  try {
    weights = decayWeights(clockDist, halfLifeSeconds);
  } catch (e) {
    return fail(`decayWeights threw: ${errMsg(e)}`);
  }
  if (weights.length !== clockDist.length) {
    return fail(`decayWeights returned ${weights.length} weights for ${clockDist.length} inputs`);
  }
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (!isFiniteNumber(w)) return fail(`decayWeights: weight ${i} is not finite`);
    if (w <= 0 || w > 1) return fail(`decayWeights: weight ${i} = ${w} outside (0,1]`);
  }
  return { ok: true, data: { gate: "ungated", weights, n: clockDist.length } };
}

export interface TemperatureScaledResult {
  readonly gate: RootGate;
  /** A pmf over the supplied logits. */
  readonly probs: readonly number[];
  readonly n: number;
  readonly temperature: number;
}

/** Temperature-scaled softmax (2409-17077v1). Output IS a pmf. */
export function evalTemperatureScale(
  logits: readonly number[],
  temperature: number,
): RootEval<TemperatureScaledResult> {
  if (logits.length < 2) return fail(`temperatureScale: need >= 2 logits, got ${logits.length}`);
  if (!isFiniteNumber(temperature) || temperature <= 0) {
    return fail(`temperatureScale: temperature must be > 0, got ${temperature}`);
  }
  const input = isFiniteArray(logits, "temperatureScale");
  if (!input.ok) return input;
  let probs: number[];
  try {
    probs = temperatureScale(logits, temperature);
  } catch (e) {
    return fail(`temperatureScale threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(probs, "temperatureScale pmf");
  if (!dist.ok) return dist;
  return { ok: true, data: { gate: "ungated", probs, n: logits.length, temperature } };
}

export interface IsotonicFitResult {
  readonly gate: RootGate;
  /** Non-decreasing isotonic fit, aligned index-for-index with the input. */
  readonly fitted: readonly number[];
  readonly n: number;
}

/** PAVA isotonic regression (2409-17077v1). Monotonicity is a real property; verify it. */
export function evalPavaIsotonic(ys: readonly number[]): RootEval<IsotonicFitResult> {
  if (ys.length < ROOT_MIN_SAMPLE) {
    return fail(`pavaIsotonic: need >= ${ROOT_MIN_SAMPLE} observations, got ${ys.length}`);
  }
  const input = isFiniteArray(ys, "pavaIsotonic");
  if (!input.ok) return input;
  let fitted: number[];
  try {
    fitted = pavaIsotonic(ys);
  } catch (e) {
    return fail(`pavaIsotonic threw: ${errMsg(e)}`);
  }
  if (fitted.length !== ys.length) {
    return fail(`pavaIsotonic returned ${fitted.length} values for ${ys.length} inputs`);
  }
  for (let i = 0; i < fitted.length; i++) {
    const v = fitted[i];
    if (!isFiniteNumber(v)) return fail(`pavaIsotonic: output ${i} is not finite`);
  }
  for (let i = 1; i < fitted.length; i++) {
    const prev = fitted[i - 1];
    const cur = fitted[i];
    if (!isFiniteNumber(prev) || !isFiniteNumber(cur)) {
      return fail(`pavaIsotonic: output near ${i} is not finite`);
    }
    if (cur < prev - 1e-12) {
      return fail(`pavaIsotonic violated monotonicity at ${i}: ${cur} < ${prev}`);
    }
  }
  return { ok: true, data: { gate: "ungated", fitted, n: ys.length } };
}

export interface CalibrationErrorResult {
  readonly gate: RootGate;
  /** An ERROR METRIC in [0,1]. It is NOT a probability and NOT a win rate. */
  readonly expectedCalibrationError: number;
  readonly n: number;
  readonly bins: number;
  /** Unweighted mean absolute gap between stated probability and realised outcome. */
  readonly meanAbsGap: number;
}

/** Expected calibration error (2409-17077v1). An error metric; binned, so n is stated. */
export function evalExpectedCalibrationError(
  probs: readonly number[],
  labels: readonly (0 | 1)[],
  bins = 10,
): RootEval<CalibrationErrorResult> {
  if (probs.length !== labels.length) {
    return fail(`ece: length mismatch (${probs.length} probs vs ${labels.length} labels)`);
  }
  if (probs.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`ece: need >= ${ROOT_MIN_FIT_SAMPLE} observations, got ${probs.length}`);
  }
  if (!Number.isInteger(bins) || bins < 1) return fail(`ece: bins must be a positive integer, got ${bins}`);
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!isProbability(p)) return fail(`ece: probs[${i}] = ${String(p)} is not a probability in [0,1]`);
    const y = labels[i];
    if (y !== 0 && y !== 1) return fail(`ece: labels[${i}] = ${String(y)} is not 0 or 1`);
  }
  let e: number;
  try {
    e = ece(probs, labels, bins);
  } catch (err) {
    return fail(`ece threw: ${errMsg(err)}`);
  }
  const bounded = checkBounded(e, 0, 1, "ece value");
  if (!bounded.ok) return bounded;
  let gapSum = 0;
  for (let i = 0; i < probs.length; i++) gapSum += Math.abs((probs[i] ?? 0) - (labels[i] ?? 0));
  return {
    ok: true,
    data: {
      gate: "ungated",
      expectedCalibrationError: bounded.data,
      n: probs.length,
      bins,
      meanAbsGap: gapSum / probs.length,
    },
  };
}

export interface ConformalBandResult {
  readonly gate: RootGate;
  /** Band half-width in the target's units. An ERROR SCALE, not a probability. */
  readonly halfWidth: number;
  readonly alpha: number;
  readonly n: number;
  /** Resulting interval for the supplied point forecast. */
  readonly band: readonly [number, number];
  /** Empirical holdout coverage: the PROBABILITY that the band contains the actual. */
  readonly holdoutCoverage: number | null;
  readonly holdoutN: number;
}

/**
 * Split-conformal band (2502-07528v3). Fails closed below n = 9 rather than clamping the
 * rank, which is what produces a falsely-tight interval on a tiny sample.
 */
export function evalConformalBand(
  residuals: readonly number[],
  alpha: number,
  pointForecast: number,
  holdoutPoints?: readonly number[],
  holdoutActuals?: readonly number[],
): RootEval<ConformalBandResult> {
  if (residuals.length < ROOT_MIN_RESIDUAL_SAMPLE) {
    return fail(
      `conformalHalfWidth: need >= ${ROOT_MIN_RESIDUAL_SAMPLE} calibration residuals for a finite band, got ${residuals.length}`,
    );
  }
  if (!isFiniteNumber(alpha) || alpha <= 0 || alpha >= 1) {
    return fail(`conformalHalfWidth: alpha must be in (0,1), got ${alpha}`);
  }
  if (!isFiniteNumber(pointForecast)) return fail("conformal band: pointForecast must be finite");
  const input = isFiniteArray(residuals, "conformalHalfWidth");
  if (!input.ok) return input;
  let halfWidth: number;
  try {
    halfWidth = conformalHalfWidth(residuals, alpha);
  } catch (e) {
    return fail(`conformalHalfWidth threw: ${errMsg(e)}`);
  }
  const hw = checkNonNegative(halfWidth, "conformal half-width");
  if (!hw.ok) return hw;
  const band = predictionBand(pointForecast, hw.data);
  if (!isFiniteNumber(band[0]) || !isFiniteNumber(band[1]) || band[0] > band[1]) {
    return fail("conformal band: produced an inverted or non-finite interval");
  }
  const hasHoldout = holdoutPoints !== undefined && holdoutActuals !== undefined;
  let coverage: number | null = null;
  if (hasHoldout) {
    const pts = holdoutPoints ?? [];
    const acts = holdoutActuals ?? [];
    if (pts.length !== acts.length) return fail("conformal band: holdout length mismatch");
    if (pts.length < ROOT_MIN_SAMPLE) {
      return fail(`conformal band: need >= ${ROOT_MIN_SAMPLE} holdout points, got ${pts.length}`);
    }
    const hv = isFiniteArray(pts, "conformal holdout points");
    if (!hv.ok) return hv;
    const av = isFiniteArray(acts, "conformal holdout actuals");
    if (!av.ok) return av;
    let c: number;
    try {
      c = empiricalCoverage(pts, acts, pts.map(() => hw.data));
    } catch (e) {
      return fail(`empiricalCoverage threw: ${errMsg(e)}`);
    }
    const cov = checkBounded(c, 0, 1, "empirical coverage");
    if (!cov.ok) return cov;
    coverage = cov.data;
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      halfWidth: hw.data,
      alpha,
      n: residuals.length,
      band: [band[0], band[1]],
      holdoutCoverage: coverage,
      holdoutN: hasHoldout ? (holdoutPoints ?? []).length : 0,
    },
  };
}

export interface MetaWeightResult {
  readonly gate: RootGate;
  /** A pmf over experts. */
  readonly weights: readonly number[];
  readonly nExperts: number;
  readonly temperature: number;
  /** The mean absolute residual each expert is scored on. An ERROR SCALE. */
  readonly expertMeanAbsResidual: readonly number[];
}

/** Meta-learned expert weights (2502-07528v3). Output is a pmf over experts. */
export function evalMetaWeights(
  meanAbsResidual: readonly number[],
  temperature = 1,
): RootEval<MetaWeightResult> {
  if (meanAbsResidual.length < 2) {
    return fail(`metaWeights: need >= 2 experts, got ${meanAbsResidual.length}`);
  }
  if (!isFiniteNumber(temperature) || temperature <= 0) {
    return fail(`metaWeights: temperature must be > 0, got ${temperature}`);
  }
  const input = isFiniteArray(meanAbsResidual, "metaWeights");
  if (!input.ok) return input;
  let weights: number[];
  try {
    weights = metaWeights(meanAbsResidual, temperature);
  } catch (e) {
    return fail(`metaWeights threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(weights, "metaWeights pmf");
  if (!dist.ok) return dist;
  return {
    ok: true,
    data: {
      gate: "ungated",
      weights,
      nExperts: meanAbsResidual.length,
      temperature,
      expertMeanAbsResidual: meanAbsResidual,
    },
  };
}

export interface CellRecalResult {
  readonly gate: RootGate;
  /** Recalibrated probability for the supplied engine probability. */
  readonly recalibratedProbability: number;
  readonly alpha: number;
  readonly beta: number;
  readonly n: number;
  /** In-sample mean log-loss of the recalibration. An ERROR METRIC. */
  readonly inSampleLogLoss: number;
  /** In-sample Brier of the recalibration. An ERROR METRIC in [0,1]. */
  readonly inSampleBrier: number;
}

/** Per-cell logistic recalibration (2602-19520v2). The fit's own error metrics are stated. */
export function evalCellRecalibration(
  probs: readonly number[],
  outcomes: readonly (0 | 1)[],
  cell: string,
  evalProbability: number,
): RootEval<CellRecalResult> {
  if (probs.length !== outcomes.length) {
    return fail(`fitCellRecal: length mismatch (${probs.length} vs ${outcomes.length})`);
  }
  if (probs.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`fitCellRecal: need >= ${ROOT_MIN_FIT_SAMPLE} observations, got ${probs.length}`);
  }
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!isInteriorProbability(p)) {
      return fail(`fitCellRecal: probs[${i}] = ${String(p)} is not strictly inside (0,1)`);
    }
    const y = outcomes[i];
    if (y !== 0 && y !== 1) return fail(`fitCellRecal: outcomes[${i}] = ${String(y)} is not 0 or 1`);
  }
  if (cell.trim() === "") return fail("fitCellRecal: cell label must be non-empty");
  if (!isInteriorProbability(evalProbability)) {
    return fail(`recalibrate: eval probability ${String(evalProbability)} is not strictly inside (0,1)`);
  }
  let fitted: { alpha: number; beta: number };
  try {
    fitted = fitCellRecal(probs, outcomes);
  } catch (e) {
    return fail(`fitCellRecal threw: ${errMsg(e)}`);
  }
  const a = checkFinite(fitted.alpha, "fitCellRecal alpha");
  if (!a.ok) return a;
  const b = checkFinite(fitted.beta, "fitCellRecal beta");
  if (!b.ok) return b;
  let p: number;
  try {
    p = recalibrate(evalProbability, { cell, alpha: fitted.alpha, beta: fitted.beta });
  } catch (e) {
    return fail(`recalibrate threw: ${errMsg(e)}`);
  }
  const prob = checkBounded(p, 0, 1, "recalibrated probability");
  if (!prob.ok) return prob;
  // The kernel returns only (alpha, beta); the fit quality below is recomputed from the
  // same fitted curve so a prediction is never returned without its stated error metrics.
  let logLoss = 0;
  const recalibrated: number[] = [];
  for (let i = 0; i < probs.length; i++) {
    const pi = probs[i] ?? 0.5;
    const yi = outcomes[i] ?? 0;
    const l = Math.log(pi / (1 - pi));
    const q = 1 / (1 + Math.exp(-(fitted.alpha + fitted.beta * l)));
    recalibrated.push(q);
    logLoss += -(yi * Math.log(Math.max(1e-15, q)) + (1 - yi) * Math.log(Math.max(1e-15, 1 - q)));
  }
  const brier = brierScore(recalibrated, outcomes);
  const brierChecked = checkBounded(brier, 0, 1, "in-sample Brier");
  if (!brierChecked.ok) return brierChecked;
  return {
    ok: true,
    data: {
      gate: "ungated",
      recalibratedProbability: prob.data,
      alpha: fitted.alpha,
      beta: fitted.beta,
      n: probs.length,
      inSampleLogLoss: logLoss / probs.length,
      inSampleBrier: brierChecked.data,
    },
  };
}

export interface PlattCalibrationResult {
  readonly gate: RootGate;
  /** Calibrated probability. */
  readonly calibratedProbability: number;
  readonly a: number;
  readonly b: number;
  readonly n: number;
  /** In-sample Brier BEFORE and AFTER calibration. Both are ERROR METRICS in [0,1]. */
  readonly inSampleBrierBefore: number;
  readonly inSampleBrierAfter: number;
}

/** Platt recalibration (2608-23776v1) with the fit's before/after Brier stated. */
export function evalPlattCalibration(
  rawProbabilities: readonly number[],
  outcomes: readonly (0 | 1)[],
  evalProbability: number,
): RootEval<PlattCalibrationResult> {
  if (rawProbabilities.length !== outcomes.length) {
    return fail(`plattCalibrate: length mismatch (${rawProbabilities.length} vs ${outcomes.length})`);
  }
  if (rawProbabilities.length < ROOT_MIN_SAMPLE) {
    return fail(`plattCalibrate: need >= ${ROOT_MIN_SAMPLE} pairs, got ${rawProbabilities.length}`);
  }
  for (let i = 0; i < rawProbabilities.length; i++) {
    const p = rawProbabilities[i];
    if (!isProbability(p)) {
      return fail(`plattCalibrate: rawProbabilities[${i}] = ${String(p)} is not in [0,1]`);
    }
    const y = outcomes[i];
    if (y !== 0 && y !== 1) return fail(`plattCalibrate: outcomes[${i}] = ${String(y)} is not 0 or 1`);
  }
  if (!isInteriorProbability(evalProbability)) {
    return fail(`plattApply: eval probability ${String(evalProbability)} is not strictly inside (0,1)`);
  }
  let cal: { a: number; b: number };
  try {
    cal = plattCalibrate(rawProbabilities, outcomes);
  } catch (e) {
    return fail(`plattCalibrate threw: ${errMsg(e)}`);
  }
  const a = checkFinite(cal.a, "platt a");
  if (!a.ok) return a;
  const b = checkFinite(cal.b, "platt b");
  if (!b.ok) return b;
  let p: number;
  try {
    p = plattApply(cal, evalProbability);
  } catch (e) {
    return fail(`plattApply threw: ${errMsg(e)}`);
  }
  const prob = checkBounded(p, 0, 1, "platt-calibrated probability");
  if (!prob.ok) return prob;
  const after: number[] = [];
  for (let i = 0; i < rawProbabilities.length; i++) {
    const rp = rawProbabilities[i] ?? 0.5;
    const z = Math.log(rp / (1 - rp));
    after.push(1 / (1 + Math.exp(-(cal.a + cal.b * z))));
  }
  const before = brierScore(rawProbabilities, outcomes);
  const afterBrier = brierScore(after, outcomes);
  const bBefore = checkBounded(before, 0, 1, "in-sample Brier before");
  if (!bBefore.ok) return bBefore;
  const bAfter = checkBounded(afterBrier, 0, 1, "in-sample Brier after");
  if (!bAfter.ok) return bAfter;
  return {
    ok: true,
    data: {
      gate: "ungated",
      calibratedProbability: prob.data,
      a: cal.a,
      b: cal.b,
      n: rawProbabilities.length,
      inSampleBrierBefore: bBefore.data,
      inSampleBrierAfter: bAfter.data,
    },
  };
}

export interface AvailabilityRow {
  readonly health: number;
  readonly load: number;
  readonly performance: number;
  readonly context: number;
  readonly played: 0 | 1;
}

export interface AvailabilityModelResult {
  readonly gate: RootGate;
  readonly beta: readonly number[];
  /** Calibrated P(player is available). This IS a probability. */
  readonly availabilityProbability: number;
  readonly n: number;
  /** In-sample Brier of the fitted availability model. An ERROR METRIC in [0,1]. */
  readonly inSampleBrier: number;
}

function availabilityFeatureRow(row: AvailabilityRow, label: string): RootEval<true> {
  const v = isFiniteArray([row.health, row.load, row.performance, row.context], label);
  if (!v.ok) return v;
  if (row.health < 0 || row.health > 1) return fail(`${label}: health = ${row.health} outside [0,1]`);
  if (row.load < 0 || row.load > 1) return fail(`${label}: load = ${row.load} outside [0,1]`);
  if (row.played !== 0 && row.played !== 1) {
    return fail(`${label}: played = ${String(row.played)} is not 0 or 1`);
  }
  return { ok: true, data: true };
}

/** Player-availability logistic (2608-23776v1) with its in-sample Brier stated. */
export function evalAvailabilityModel(
  rows: readonly AvailabilityRow[],
  target: AvailabilityRow,
): RootEval<AvailabilityModelResult> {
  if (rows.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`fitAvailability: need >= ${ROOT_MIN_FIT_SAMPLE} player-weeks, got ${rows.length}`);
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) return fail(`fitAvailability: row ${i} is missing`);
    const v = availabilityFeatureRow(r, `fitAvailability row ${i}`);
    if (!v.ok) return v;
  }
  const tv = availabilityFeatureRow(target, "availability target");
  if (!tv.ok) return tv;
  let beta: number[];
  try {
    beta = fitAvailability(
      rows.map((r) => ({
        health: r.health,
        load: r.load,
        performance: r.performance,
        context: r.context,
      })),
      rows.map((r) => r.played),
    );
  } catch (e) {
    return fail(`fitAvailability threw: ${errMsg(e)}`);
  }
  if (beta.length !== 5) return fail(`fitAvailability: expected 5 coefficients, got ${beta.length}`);
  for (let i = 0; i < beta.length; i++) {
    const c = checkFinite(beta[i], `fitAvailability coefficient ${i}`);
    if (!c.ok) return c;
  }
  let p: number;
  try {
    p = availabilityProb(beta, {
      health: target.health,
      load: target.load,
      performance: target.performance,
      context: target.context,
    });
  } catch (e) {
    return fail(`availabilityProb threw: ${errMsg(e)}`);
  }
  const prob = checkBounded(p, 0, 1, "availability probability");
  if (!prob.ok) return prob;
  const fitted: number[] = rows.map((r) => {
    const z =
      (beta[0] ?? 0) +
      (beta[1] ?? 0) * r.health +
      (beta[2] ?? 0) * r.load +
      (beta[3] ?? 0) * r.performance +
      (beta[4] ?? 0) * r.context;
    return 1 / (1 + Math.exp(-z));
  });
  const brier = brierScore(fitted, rows.map((r) => r.played));
  const brierChecked = checkBounded(brier, 0, 1, "availability in-sample Brier");
  if (!brierChecked.ok) return brierChecked;
  return {
    ok: true,
    data: {
      gate: "ungated",
      beta,
      availabilityProbability: prob.data,
      n: rows.length,
      inSampleBrier: brierChecked.data,
    },
  };
}

/* ═══════════════════ 2. WIN PROBABILITY AND TEAM RATINGS ═══════════════════ */

export interface EloStepResult {
  readonly gate: RootGate;
  /** Elo expected score for the home side, no HFA. A probability. */
  readonly expectedHomeProbabilityNoHfa: number;
  /** Elo expected score with home-field advantage. A probability. */
  readonly expectedHomeProbability: number;
  /** Post-update home rating. An Elo RATING, not a probability. */
  readonly updatedHomeRating: number;
  readonly hfaRatingPoints: number;
  readonly blendWeight: number;
  /** Mean log-loss of the rating stream. An ERROR METRIC. */
  readonly logLoss: number;
  /** Whether the stream beat the naive 0.6931 log-loss baseline. */
  readonly beatsNaiveBaseline: boolean;
  readonly nGames: number;
}

export interface EloGameRow {
  readonly gseDiff: number;
  readonly marketDiff: number;
  readonly homeWin: 0 | 1;
}

/** Elo + market blend with rolling-origin tuning (2506-00348). Reports its own log-loss. */
export function evalEloBlendStream(
  games: readonly EloGameRow[],
  hfa: number,
  k: number,
  blendWeight: number,
  naiveLogLoss = 0.6931,
): RootEval<EloStepResult> {
  if (games.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`rollingOriginTune: need >= ${ROOT_MIN_FIT_SAMPLE} games, got ${games.length}`);
  }
  if (!isFiniteNumber(hfa)) return fail("eloExpected: hfa must be finite");
  if (!isFiniteNumber(k) || k <= 0) return fail(`eloUpdate: k must be > 0, got ${k}`);
  if (!isFiniteNumber(blendWeight) || blendWeight < 0 || blendWeight > 1) {
    return fail(`blendedRating: w must be in [0,1], got ${blendWeight}`);
  }
  if (!isFiniteNumber(naiveLogLoss) || naiveLogLoss <= 0) {
    return fail(`logLossGate: naive baseline must be > 0, got ${naiveLogLoss}`);
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g) return fail(`elo stream: game ${i} is missing`);
    const v = isFiniteArray([g.gseDiff, g.marketDiff], `elo stream game ${i}`);
    if (!v.ok) return v;
    if (g.homeWin !== 0 && g.homeWin !== 1) {
      return fail(`elo stream: game ${i} homeWin = ${String(g.homeWin)} is not 0 or 1`);
    }
  }
  let pRaw: number;
  let pHfa: number;
  let updated: number;
  try {
    const first = games[0];
    const diff = blendedRating(first?.gseDiff ?? 0, first?.marketDiff ?? 0, blendWeight);
    pRaw = eloExpected(diff, 0);
    pHfa = eloExpected(diff, hfa);
    updated = eloUpdate(1500, pHfa, first?.homeWin ?? 0, k);
  } catch (e) {
    return fail(`elo blend threw: ${errMsg(e)}`);
  }
  const raw = checkBounded(pRaw, 0, 1, "elo expected (no HFA)");
  if (!raw.ok) return raw;
  const hfaChecked = checkBounded(pHfa, 0, 1, "elo expected (with HFA)");
  if (!hfaChecked.ok) return hfaChecked;
  const u = checkFinite(updated, "elo updated rating");
  if (!u.ok) return u;
  let tuned: { best: { w: number; hfa: number; k: number }; logLoss: number };
  try {
    tuned = rollingOriginTune(games, [{ w: blendWeight, hfa, k }]);
  } catch (e) {
    return fail(`rollingOriginTune threw: ${errMsg(e)}`);
  }
  const ll = checkNonNegative(tuned.logLoss, "rolling-origin log-loss");
  if (!ll.ok) return ll;
  let passesGate: boolean;
  try {
    passesGate = logLossGate(tuned.logLoss, naiveLogLoss);
  } catch (e) {
    return fail(`logLossGate threw: ${errMsg(e)}`);
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      expectedHomeProbabilityNoHfa: raw.data,
      expectedHomeProbability: hfaChecked.data,
      updatedHomeRating: u.data,
      hfaRatingPoints: hfa,
      blendWeight,
      logLoss: ll.data,
      beatsNaiveBaseline: passesGate,
      nGames: games.length,
    },
  };
}

export interface CovariateBtResult {
  readonly gate: RootGate;
  readonly merits: readonly number[];
  /** Covariate coefficients. Coefficients, NOT probabilities. */
  readonly gamma: readonly number[];
  /** P(home wins) under the fitted covariate Bradley-Terry. A probability. */
  readonly homeWinProbability: number;
  readonly nTeams: number;
  readonly nGames: number;
  /** In-sample Brier of the fitted model. An ERROR METRIC in [0,1]. */
  readonly inSampleBrier: number;
  /** In-sample mean log-loss. An ERROR METRIC. */
  readonly inSampleLogLoss: number;
}

export interface CovariateBtGame {
  readonly home: number;
  readonly away: number;
  readonly homeWin: boolean;
  readonly x: readonly number[];
}

/** Generalized (covariate) Bradley-Terry (2507-22472). Probability + stated fit quality. */
export function evalCovariateBradleyTerry(
  games: readonly CovariateBtGame[],
  nTeams: number,
  query: { readonly home: number; readonly away: number; readonly x: readonly number[] },
): RootEval<CovariateBtResult> {
  if (!Number.isInteger(nTeams) || nTeams < 2) {
    return fail(`fitCovariateBt: nTeams must be an integer >= 2, got ${nTeams}`);
  }
  if (games.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`fitCovariateBt: need >= ${ROOT_MIN_FIT_SAMPLE} games, got ${games.length}`);
  }
  const p = games[0]?.x.length ?? 0;
  if (p === 0) return fail("fitCovariateBt: covariate vector x is empty");
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g) return fail(`fitCovariateBt: game ${i} is missing`);
    if (!Number.isInteger(g.home) || g.home < 0 || g.home >= nTeams) {
      return fail(`fitCovariateBt: game ${i} home index ${g.home} outside [0,${nTeams})`);
    }
    if (!Number.isInteger(g.away) || g.away < 0 || g.away >= nTeams) {
      return fail(`fitCovariateBt: game ${i} away index ${g.away} outside [0,${nTeams})`);
    }
    if (g.x.length !== p) {
      return fail(`fitCovariateBt: game ${i} has ${g.x.length} covariates, expected ${p}`);
    }
    const v = isFiniteArray(g.x, `fitCovariateBt game ${i} covariates`);
    if (!v.ok) return v;
  }
  if (query.x.length !== p) {
    return fail(`covariateBtProb: query has ${query.x.length} covariates, expected ${p}`);
  }
  if (!Number.isInteger(query.home) || query.home < 0 || query.home >= nTeams) {
    return fail(`covariateBtProb: query home index ${query.home} outside [0,${nTeams})`);
  }
  if (!Number.isInteger(query.away) || query.away < 0 || query.away >= nTeams) {
    return fail(`covariateBtProb: query away index ${query.away} outside [0,${nTeams})`);
  }
  const qv = isFiniteArray(query.x, "covariateBtProb query covariates");
  if (!qv.ok) return qv;
  let fit: { merits: number[]; gamma: number[] };
  try {
    fit = fitCovariateBt(
      games.map((g) => ({ home: g.home, away: g.away, homeWin: g.homeWin, x: [...g.x] })),
      nTeams,
    );
  } catch (e) {
    return fail(`fitCovariateBt threw: ${errMsg(e)}`);
  }
  if (fit.merits.length !== nTeams) {
    return fail(`fitCovariateBt: expected ${nTeams} merits, got ${fit.merits.length}`);
  }
  for (let i = 0; i < fit.gamma.length; i++) {
    const g = checkFinite(fit.gamma[i], `fitCovariateBt gamma ${i}`);
    if (!g.ok) return g;
  }
  let prob: number;
  try {
    prob = covariateBtProb(fit.merits, fit.gamma, query.home, query.away, query.x);
  } catch (e) {
    return fail(`covariateBtProb threw: ${errMsg(e)}`);
  }
  const pChecked = checkBounded(prob, 0, 1, "covariate BT home win probability");
  if (!pChecked.ok) return pChecked;
  const fitted: number[] = [];
  const outcomes: (0 | 1)[] = [];
  let logLoss = 0;
  for (const g of games) {
    const q = covariateBtProb(fit.merits, fit.gamma, g.home, g.away, g.x);
    const y: 0 | 1 = g.homeWin ? 1 : 0;
    fitted.push(q);
    outcomes.push(y);
    logLoss += -(y * Math.log(Math.max(1e-15, q)) + (1 - y) * Math.log(Math.max(1e-15, 1 - q)));
  }
  const brier = brierScore(fitted, outcomes);
  const brierChecked = checkBounded(brier, 0, 1, "covariate BT in-sample Brier");
  if (!brierChecked.ok) return brierChecked;
  return {
    ok: true,
    data: {
      gate: "ungated",
      merits: fit.merits,
      gamma: fit.gamma,
      homeWinProbability: pChecked.data,
      nTeams,
      nGames: games.length,
      inSampleBrier: brierChecked.data,
      inSampleLogLoss: logLoss / games.length,
    },
  };
}

export interface ChebKernelResult {
  readonly gate: RootGate;
  /** Learned Chebyshev coefficients. Coefficients, not probabilities. */
  readonly coeffs: readonly number[];
  /** P(stronger side wins) on the first supplied matchup. A probability. */
  readonly winProbability: number;
  readonly emSteps: number;
  readonly nGames: number;
  /** In-sample Brier after the EM steps. An ERROR METRIC in [0,1]. */
  readonly inSampleBrier: number;
  /** Mean |coefficient| — a shrinkage magnitude, a regularisation scale. */
  readonly meanAbsCoefficient: number;
}

/** Chebyshev ranking kernel learned by EM (2512-15269v1). Probability + fit quality. */
export function evalChebyshevKernel(
  strengthDiffs: readonly number[],
  outcomes: readonly (0 | 1)[],
  order: number,
  scale: number,
  emSteps: number,
): RootEval<ChebKernelResult> {
  if (strengthDiffs.length !== outcomes.length) {
    return fail(`chebEmStep: length mismatch (${strengthDiffs.length} vs ${outcomes.length})`);
  }
  if (strengthDiffs.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`chebEmStep: need >= ${ROOT_MIN_FIT_SAMPLE} games, got ${strengthDiffs.length}`);
  }
  if (!Number.isInteger(order) || order < 1) {
    return fail(`chebyshevBasis: K must be an integer >= 1, got ${order}`);
  }
  if (!isFiniteNumber(scale) || scale <= 0) {
    return fail(`chebWinProb: scale must be > 0, got ${scale}`);
  }
  if (!Number.isInteger(emSteps) || emSteps < 1) {
    return fail(`chebEmStep: emSteps must be a positive integer, got ${emSteps}`);
  }
  const input = isFiniteArray(strengthDiffs, "chebEmStep diffs");
  if (!input.ok) return input;
  for (let i = 0; i < outcomes.length; i++) {
    const y = outcomes[i];
    if (y !== 0 && y !== 1) return fail(`chebEmStep: outcomes[${i}] = ${String(y)} is not 0 or 1`);
  }
  const basis = chebyshevBasis(0.5, order);
  if (basis.length !== order) return fail(`chebyshevBasis returned ${basis.length} terms for K=${order}`);
  for (let i = 0; i < basis.length; i++) {
    const v = checkFinite(basis[i], `chebyshevBasis T_${i}`);
    if (!v.ok) return v;
  }
  let kernel = { coeffs: new Array<number>(order).fill(0) };
  for (let s = 0; s < emSteps; s++) {
    try {
      kernel = chebEmStep(kernel, strengthDiffs, outcomes, scale, 0.5, 1e-3);
    } catch (e) {
      return fail(`chebEmStep threw at step ${s}: ${errMsg(e)}`);
    }
    for (let i = 0; i < kernel.coeffs.length; i++) {
      const c = checkFinite(kernel.coeffs[i], `chebEmStep coefficient ${i} at step ${s}`);
      if (!c.ok) return c;
    }
  }
  const fitted: number[] = [];
  for (let i = 0; i < strengthDiffs.length; i++) {
    fitted.push(chebWinProb(kernel, strengthDiffs[i] ?? 0, scale));
  }
  for (let i = 0; i < fitted.length; i++) {
    const q = checkBounded(fitted[i], 0, 1, `chebWinProb output ${i}`);
    if (!q.ok) return q;
  }
  const meanAbs = kernel.coeffs.reduce((a, c) => a + Math.abs(c), 0) / kernel.coeffs.length;
  const brier = brierScore(fitted, outcomes);
  const brierChecked = checkBounded(brier, 0, 1, "chebyshev in-sample Brier");
  if (!brierChecked.ok) return brierChecked;
  return {
    ok: true,
    data: {
      gate: "ungated",
      coeffs: kernel.coeffs,
      winProbability: fitted[0] ?? 0,
      emSteps,
      nGames: strengthDiffs.length,
      inSampleBrier: brierChecked.data,
      meanAbsCoefficient: meanAbs,
    },
  };
}

export interface GameStateRow {
  readonly scoreDiff: number;
  readonly timeLeftFrac: number;
  readonly yardLine: number;
  readonly down: 1 | 2 | 3 | 4;
  readonly distance: number;
  readonly pace: number;
}

export interface InGameStateResult {
  readonly gate: RootGate;
  readonly trajectory: "close" | "lean" | "blowout";
  /** P(the leading side still leads) from the clock model. A probability. */
  readonly leadingSideWinProbability: number;
  /** A pmf over drive outcomes: touchdown / field goal / stop. */
  readonly driveOutcomePmf: readonly number[];
  /** Model-disagreement band around the drive TD probability, in [0,1]. */
  readonly tdProbabilityBand: readonly [number, number] | null;
  readonly nEnsembleMembers: number;
}

function validateGameState(f: GameStateRow, label: string): RootEval<true> {
  const v = isFiniteArray(
    [f.scoreDiff, f.timeLeftFrac, f.yardLine, f.down, f.distance, f.pace],
    label,
  );
  if (!v.ok) return v;
  if (f.timeLeftFrac < 0 || f.timeLeftFrac > 1) {
    return fail(`${label}: timeLeftFrac = ${f.timeLeftFrac} outside [0,1]`);
  }
  if (f.yardLine < 0 || f.yardLine > 100) {
    return fail(`${label}: yardLine = ${f.yardLine} outside [0,100]`);
  }
  if (!Number.isInteger(f.down) || f.down < 1 || f.down > 4) {
    return fail(`${label}: down = ${f.down} outside 1..4`);
  }
  if (f.distance < 0) return fail(`${label}: distance = ${f.distance} is negative`);
  if (f.pace < 0) return fail(`${label}: pace = ${f.pace} is negative`);
  return { ok: true, data: true };
}

/** Live game-state trajectory, drive pmf and clock win probability (2508-15299v1). */
export function evalInGameState(
  f: GameStateRow,
  tdEnsemble?: readonly number[],
  bandK = 1.5,
): RootEval<InGameStateResult> {
  const v = validateGameState(f, "in-game state");
  if (!v.ok) return v;
  let trajectory: string;
  let wp: number;
  let pmf: { td: number; fg: number; stop: number };
  try {
    trajectory = classifyGameState(f);
    wp = clockWinProb(f.scoreDiff, f.timeLeftFrac);
    pmf = driveOutcomeForecast(f);
  } catch (e) {
    return fail(`in-game state kernel threw: ${errMsg(e)}`);
  }
  if (trajectory !== "close" && trajectory !== "lean" && trajectory !== "blowout") {
    return fail(`classifyGameState returned an unknown trajectory: ${String(trajectory)}`);
  }
  const wpChecked = checkBounded(wp, 0, 1, "clock win probability");
  if (!wpChecked.ok) return wpChecked;
  const dist = checkDistribution([pmf.td, pmf.fg, pmf.stop], "drive outcome pmf");
  if (!dist.ok) return dist;
  let band: readonly [number, number] | null = null;
  let nMembers = 0;
  if (tdEnsemble !== undefined) {
    if (!isFiniteNumber(bandK) || bandK <= 0) {
      return fail(`uncertaintyBand: k must be > 0, got ${bandK}`);
    }
    const ev = isFiniteArray(tdEnsemble, "td ensemble");
    if (!ev.ok) return ev;
    let b: [number, number];
    try {
      b = uncertaintyBand(tdEnsemble, bandK);
    } catch (e) {
      return fail(`uncertaintyBand threw: ${errMsg(e)}`);
    }
    const lo = checkBounded(b[0], 0, 1, "td band lower");
    if (!lo.ok) return lo;
    const hi = checkBounded(b[1], 0, 1, "td band upper");
    if (!hi.ok) return hi;
    if (b[0] > b[1]) return fail(`uncertaintyBand produced an inverted band [${b[0]}, ${b[1]}]`);
    band = [lo.data, hi.data];
    nMembers = tdEnsemble.length;
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      trajectory: trajectory as "close" | "lean" | "blowout",
      leadingSideWinProbability: wpChecked.data,
      driveOutcomePmf: [pmf.td, pmf.fg, pmf.stop],
      tdProbabilityBand: band,
      nEnsembleMembers: nMembers,
    },
  };
}

/* ═══════════════════════ 3. COUNTING AND EVENT MODELS ═══════════════════════ */

export interface BivariatePoissonInput {
  readonly x1: number;
  readonly x2: number;
  readonly lambda1: number;
  readonly lambda2: number;
  readonly lambda3: number;
  /** Grid used only to audit that the kernel's pmf normalises. Capped at 40. */
  readonly auditGridMax: number;
}

export interface BivariatePoissonResult {
  readonly gate: RootGate;
  /** Joint probability mass at (x1, x2). A probability mass, not a density over reals. */
  readonly jointMass: number;
  readonly commonShockLambda: number;
  readonly x1: number;
  readonly x2: number;
  /** Total mass over the audit grid. A normalisation audit, never a renormalisation. */
  readonly gridMass: number;
  /** True when the audit grid necessarily truncates mass (lambda3 > 0). */
  readonly gridTruncated: boolean;
}

/** Bivariate-Poisson joint mass with a grid normalisation audit (2410-09068). */
export function evalBivariatePoisson(inp: BivariatePoissonInput): RootEval<BivariatePoissonResult> {
  if (!Number.isInteger(inp.x1) || inp.x1 < 0) {
    return fail(`bivPoisPmf: x1 must be a non-negative integer, got ${inp.x1}`);
  }
  if (!Number.isInteger(inp.x2) || inp.x2 < 0) {
    return fail(`bivPoisPmf: x2 must be a non-negative integer, got ${inp.x2}`);
  }
  const lambdas: ReadonlyArray<readonly [string, number]> = [
    ["lambda1", inp.lambda1],
    ["lambda2", inp.lambda2],
    ["lambda3", inp.lambda3],
  ];
  for (const [name, l] of lambdas) {
    const v = checkNonNegative(l, `bivPoisPmf ${name}`);
    if (!v.ok) return v;
  }
  if (!Number.isInteger(inp.auditGridMax) || inp.auditGridMax < Math.max(inp.x1, inp.x2)) {
    return fail(
      `bivPoisPmf: auditGridMax (${inp.auditGridMax}) must be an integer >= max(x1,x2)=${Math.max(inp.x1, inp.x2)}`,
    );
  }
  if (inp.auditGridMax > 40) {
    return fail(`bivPoisPmf: auditGridMax ${inp.auditGridMax} exceeds the audit cap of 40`);
  }
  let mass: number;
  try {
    mass = bivPoisPmf(inp.x1, inp.x2, inp.lambda1, inp.lambda2, inp.lambda3);
  } catch (e) {
    return fail(`bivPoisPmf threw: ${errMsg(e)}`);
  }
  const m = checkBounded(mass, 0, 1, "bivariate Poisson joint mass");
  if (!m.ok) return m;
  let gridMass = 0;
  for (let a = 0; a <= inp.auditGridMax; a++) {
    for (let b = 0; b <= inp.auditGridMax; b++) {
      gridMass += bivPoisPmf(a, b, inp.lambda1, inp.lambda2, inp.lambda3);
    }
  }
  const g = checkFinite(gridMass, "bivariate Poisson grid mass");
  if (!g.ok) return g;
  // With lambda3 = 0 the pmf factorises into two Poissons and the grid carries essentially
  // all the mass, so the audit can assert normalisation. With lambda3 > 0 the grid
  // truncation is material, so the audit only records the mass it saw.
  if (inp.lambda3 === 0 && Math.abs(gridMass - 1) > 1e-6) {
    return fail(
      `bivPoisPmf: independent kernel (lambda3=0) has grid mass ${gridMass}, expected 1 within 1e-6 — pmf does not normalise`,
    );
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      jointMass: m.data,
      commonShockLambda: inp.lambda3,
      x1: inp.x1,
      x2: inp.x2,
      gridMass: g.data,
      gridTruncated: inp.lambda3 > 0,
    },
  };
}

export interface InGameLambdasResult {
  readonly gate: RootGate;
  /** Remaining-goal intensity parameters. RATES in the kernel's unit, not probabilities. */
  readonly remainingLambdas: readonly [number, number, number];
  /** exp(-damping * |scoreDiff|): a multiplier in (0,1], not a probability. */
  readonly garbageTimeDamping: number;
  readonly timeLeftFrac: number;
}

/** In-game remaining-intensity re-estimation (2410-09068). Rates, not probabilities. */
export function evalInGameLambdas(
  preLambdas: readonly [number, number, number],
  timeLeftFrac: number,
  scoreDiff: number,
  garbageDamping: number,
): RootEval<InGameLambdasResult> {
  if (preLambdas.length !== 3) {
    return fail(`ingameLambdas: expected 3 pregame lambdas, got ${preLambdas.length}`);
  }
  for (let i = 0; i < 3; i++) {
    const v = checkNonNegative(preLambdas[i], `ingameLambdas pre-lambda ${i}`);
    if (!v.ok) return v;
  }
  if (!isFiniteNumber(timeLeftFrac) || timeLeftFrac < 0 || timeLeftFrac > 1) {
    return fail(`ingameLambdas: timeLeftFrac = ${timeLeftFrac} outside [0,1]`);
  }
  if (!isFiniteNumber(scoreDiff)) return fail("ingameLambdas: scoreDiff must be finite");
  if (!isFiniteNumber(garbageDamping) || garbageDamping < 0) {
    return fail(`ingameLambdas: garbageDamping must be >= 0, got ${garbageDamping}`);
  }
  let out: [number, number, number];
  try {
    out = ingameLambdas(
      preLambdas[0] ?? 0,
      preLambdas[1] ?? 0,
      preLambdas[2] ?? 0,
      timeLeftFrac,
      scoreDiff,
      garbageDamping,
    );
  } catch (e) {
    return fail(`ingameLambdas threw: ${errMsg(e)}`);
  }
  for (let i = 0; i < 3; i++) {
    const v = checkNonNegative(out[i], `ingameLambdas output ${i}`);
    if (!v.ok) return v;
  }
  const damping = checkBounded(
    Math.exp(-garbageDamping * Math.abs(scoreDiff)),
    0,
    1,
    "garbage-time damping",
  );
  if (!damping.ok) return damping;
  return {
    ok: true,
    data: {
      gate: "ungated",
      remainingLambdas: [out[0], out[1], out[2]],
      garbageTimeDamping: damping.data,
      timeLeftFrac,
    },
  };
}

export interface MonteCarloWinProbResult {
  readonly gate: RootGate;
  /** P(the leading side holds on) from the simulation. A probability. */
  readonly winProbability: number;
  /** Simulated paths. The sample floor for a Monte Carlo probability. */
  readonly nSims: number;
  /** LCG seed, recorded so the number is reproducible. */
  readonly seed: number;
  /** Monte Carlo standard error of the win rate. An ERROR SCALE. */
  readonly monteCarloStdError: number;
}

/** Monte Carlo in-game win probability (2410-09068). Deterministic LCG, never Math.random. */
export function evalMonteCarloWinProbability(
  lambdas: readonly [number, number, number],
  homeLead: number,
  sims: number,
  seed: number,
): RootEval<MonteCarloWinProbResult> {
  if (lambdas.length !== 3) return fail(`mcHomeWinProb: expected 3 lambdas, got ${lambdas.length}`);
  for (let i = 0; i < 3; i++) {
    const v = checkNonNegative(lambdas[i], `mcHomeWinProb lambda ${i}`);
    if (!v.ok) return v;
  }
  if (!isFiniteNumber(homeLead)) return fail("mcHomeWinProb: homeLead must be finite");
  if (!Number.isInteger(sims) || sims < 100) {
    return fail(`mcHomeWinProb: need >= 100 integer sims, got ${sims}`);
  }
  if (!Number.isFinite(seed)) return fail("mcHomeWinProb: seed must be finite");
  let p: number;
  try {
    p = mcHomeWinProb(
      lambdas[0] ?? 0,
      lambdas[1] ?? 0,
      lambdas[2] ?? 0,
      homeLead,
      sims,
      rootLcg(seed),
    );
  } catch (e) {
    return fail(`mcHomeWinProb threw: ${errMsg(e)}`);
  }
  const prob = checkBounded(p, 0, 1, "monte carlo win probability");
  if (!prob.ok) return prob;
  const se = checkNonNegative(
    Math.sqrt((prob.data * (1 - prob.data)) / sims),
    "monte carlo standard error",
  );
  if (!se.ok) return se;
  return {
    ok: true,
    data: {
      gate: "ungated",
      winProbability: prob.data,
      nSims: sims,
      seed,
      monteCarloStdError: se.data,
    },
  };
}

export interface HawkesResult {
  readonly gate: RootGate;
  /** Conditional event intensity at the query time. A RATE (events/min), not a probability. */
  readonly intensityAtT: number;
  /** Log-likelihood of the observed event times. An ERROR/FIT metric; can be negative. */
  readonly logLikelihood: number;
  /** Wald z for the hot-state multiplier. A z-STATISTIC, not a probability. */
  readonly hotStateWaldZ: number;
  /** BIC advantage of Hawkes over homogeneous Poisson. Positive favours Hawkes. */
  readonly deltaBicVsPoisson: number;
  readonly nEvents: number;
  readonly horizonMinutes: number;
}

/** Hawkes self-exciting intensity with its own gate statistics (2601-07980v1). */
export function evalHawkesIntensity(
  params: { readonly mu: number; readonly alpha: number; readonly beta: number; readonly nu: number },
  eventTimes: readonly number[],
  queryTime: number,
  horizonMinutes: number,
  hotStateSe: number,
  poissonLogLik: number,
): RootEval<HawkesResult> {
  const m = checkNonNegative(params.mu, "hawkes mu");
  if (!m.ok) return m;
  const a = checkNonNegative(params.alpha, "hawkes alpha");
  if (!a.ok) return a;
  if (!isFiniteNumber(params.beta) || params.beta <= 0) {
    return fail(`hawkes beta must be > 0, got ${params.beta}`);
  }
  const nu = checkNonNegative(params.nu, "hawkes nu");
  if (!nu.ok) return nu;
  if (eventTimes.length < ROOT_MIN_SAMPLE) {
    return fail(`hawkesLogLik: need >= ${ROOT_MIN_SAMPLE} events, got ${eventTimes.length}`);
  }
  const ev = isFiniteArray(eventTimes, "hawkes event times");
  if (!ev.ok) return ev;
  for (let i = 0; i < eventTimes.length; i++) {
    if ((eventTimes[i] ?? 0) < 0) return fail(`hawkes: event time ${i} is negative`);
  }
  if (!isFiniteNumber(queryTime) || queryTime < 0) {
    return fail(`hawkes: queryTime must be finite and >= 0, got ${queryTime}`);
  }
  if (!isFiniteNumber(horizonMinutes) || horizonMinutes <= 0) {
    return fail(`hawkesLogLik: horizon must be > 0, got ${horizonMinutes}`);
  }
  if (!isFiniteNumber(hotStateSe) || hotStateSe <= 0) {
    return fail(`waldZ: se must be > 0, got ${hotStateSe}`);
  }
  if (!isFiniteNumber(poissonLogLik)) return fail("hawkes: poissonLogLik must be finite");
  let intensity: number;
  let ll: number;
  let z: number;
  let dbic: number;
  try {
    intensity = hawkesIntensity(params, queryTime, eventTimes);
    ll = hawkesLogLik(params, eventTimes, horizonMinutes);
    z = waldZ(params.nu, hotStateSe);
    dbic = deltaBicVsPoisson(ll, poissonLogLik, eventTimes.length);
  } catch (e) {
    return fail(`hawkes kernel threw: ${errMsg(e)}`);
  }
  const i = checkNonNegative(intensity, "hawkes intensity");
  if (!i.ok) return i;
  const l = checkFinite(ll, "hawkes log-likelihood");
  if (!l.ok) return l;
  const zz = checkFinite(z, "hawkes wald z");
  if (!zz.ok) return zz;
  const d = checkFinite(dbic, "hawkes delta BIC");
  if (!d.ok) return d;
  return {
    ok: true,
    data: {
      gate: "ungated",
      intensityAtT: i.data,
      logLikelihood: l.data,
      hotStateWaldZ: zz.data,
      deltaBicVsPoisson: d.data,
      nEvents: eventTimes.length,
      horizonMinutes,
    },
  };
}

export interface OrdinalPmfResult {
  readonly gate: RootGate;
  /** A pmf over K+1 ordered buckets. */
  readonly pmf: readonly number[];
  readonly nBuckets: number;
  readonly eta: number;
}

/** Cumulative-logit bucket probabilities (2506-03057v1). Must normalise; never renormalised. */
export function evalCumulativeLogitPmf(
  eta: number,
  cuts: readonly number[],
): RootEval<OrdinalPmfResult> {
  if (!isFiniteNumber(eta)) return fail(`cumulativeProbs: eta must be finite, got ${eta}`);
  if (cuts.length < 1) return fail(`cumulativeProbs: need >= 1 cut, got ${cuts.length}`);
  for (let i = 0; i < cuts.length; i++) {
    const v = checkFinite(cuts[i], `cumulativeProbs cut ${i}`);
    if (!v.ok) return v;
  }
  for (let i = 1; i < cuts.length; i++) {
    const prev = cuts[i - 1];
    const cur = cuts[i];
    if ((prev ?? 0) > (cur ?? 0)) {
      return fail(
        `cumulativeProbs: cuts must be non-decreasing, but cut ${i - 1}=${prev} > cut ${i}=${cur}`,
      );
    }
  }
  let pmf: number[];
  try {
    pmf = cumulativeProbs(eta, cuts);
  } catch (e) {
    return fail(`cumulativeProbs threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(pmf, "cumulative-logit pmf");
  if (!dist.ok) return dist;
  return { ok: true, data: { gate: "ungated", pmf, nBuckets: cuts.length + 1, eta } };
}

export interface AdjacentCategoryResult {
  readonly gate: RootGate;
  /** A pmf over [cover, push, no-cover]. */
  readonly pmf: readonly number[];
  readonly eta: number;
}

/** Adjacent-category (cover/push/no-cover) probabilities (2608-23859). */
export function evalAdjacentCategoryPmf(
  eta: number,
  cuts: readonly [number, number],
): RootEval<AdjacentCategoryResult> {
  if (!isFiniteNumber(eta)) return fail(`acProbs: eta must be finite, got ${eta}`);
  if (cuts.length !== 2) return fail(`acProbs: expected 2 cuts, got ${cuts.length}`);
  const c0 = checkFinite(cuts[0], "acProbs cut 0");
  if (!c0.ok) return c0;
  const c1 = checkFinite(cuts[1], "acProbs cut 1");
  if (!c1.ok) return c1;
  if ((cuts[0] ?? 0) > (cuts[1] ?? 0)) {
    return fail(`acProbs: cuts must be ordered, got [${cuts[0]}, ${cuts[1]}]`);
  }
  let pmf: number[];
  try {
    pmf = acProbs(eta, [cuts[0] ?? 0, cuts[1] ?? 0]);
  } catch (e) {
    return fail(`acProbs threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(pmf, "adjacent-category pmf");
  if (!dist.ok) return dist;
  return { ok: true, data: { gate: "ungated", pmf, eta } };
}

export interface ReorderAuditResult {
  readonly gate: RootGate;
  /** Fraction of standings pairs the model order disagrees with. A RATE in [0,1]. */
  readonly reorderRate: number;
  readonly nTeams: number;
}

/** Standings-vs-model schedule-equivalence audit (2608-23859). */
export function evalReorderAudit(
  standings: readonly string[],
  modelOrder: readonly string[],
): RootEval<ReorderAuditResult> {
  if (standings.length !== modelOrder.length) {
    return fail(`reorderRate: length mismatch (${standings.length} vs ${modelOrder.length})`);
  }
  if (standings.length < 4) {
    return fail(`reorderRate: need >= 4 teams to audit, got ${standings.length}`);
  }
  const model = new Set(modelOrder);
  for (const t of standings) {
    if (!model.has(t)) return fail(`reorderRate: standings team "${t}" is absent from the model order`);
  }
  let r: number;
  try {
    r = reorderRate(standings, modelOrder);
  } catch (e) {
    return fail(`reorderRate threw: ${errMsg(e)}`);
  }
  const v = checkBounded(r, 0, 1, "reorder rate");
  if (!v.ok) return v;
  return { ok: true, data: { gate: "ungated", reorderRate: v.data, nTeams: standings.length } };
}

/* ═════════════════════ 4. FORECAST COMBINATION AND ENSEMBLES ═════════════════════ */

export interface CauchySurrogateResult {
  readonly gate: RootGate;
  /** Saturating magnitude weight in [0,1]. A weight, NOT a probability of anything. */
  readonly surrogate: number;
  readonly absReturn: number;
}

/** Cauchy CDF surrogate on |return| (2503-20082). Output is a weight in [0,1]. */
export function evalCauchySurrogate(absReturn: number): RootEval<CauchySurrogateResult> {
  const v = checkNonNegative(absReturn, "cauchySurrogate |return|");
  if (!v.ok) return v;
  let s: number;
  try {
    s = cauchySurrogate(v.data);
  } catch (e) {
    return fail(`cauchySurrogate threw: ${errMsg(e)}`);
  }
  const b = checkBounded(s, 0, 1, "cauchySurrogate value");
  if (!b.ok) return b;
  return { ok: true, data: { gate: "ungated", surrogate: b.data, absReturn: v.data } };
}

export interface SourceTrackRecord {
  readonly source: string;
  readonly hits: readonly number[];
  readonly returns: readonly number[];
  /** |actual - consensus| per game, aligned to `hits`. */
  readonly consensusGap: readonly number[];
}

export interface CombinationWeightsResult {
  readonly gate: RootGate;
  /** A pmf over sources. */
  readonly weights: ReadonlyArray<{ readonly source: string; readonly weight: number }>;
  /** Exponentially weighted score per source. A SCORE: unbounded and signed. */
  readonly scores: ReadonlyArray<{ readonly source: string; readonly score: number }>;
  readonly nSources: number;
  readonly nGamesPerSource: number;
  readonly eta: number;
}

/** Forecast-combination weights (2503-20082). The weight vector over sources is a pmf. */
export function evalCombinationWeights(
  records: readonly SourceTrackRecord[],
  eta: number,
  temperature = 1,
): RootEval<CombinationWeightsResult> {
  if (records.length < 2) {
    return fail(`combinationWeights: need >= 2 sources, got ${records.length}`);
  }
  if (!isFiniteNumber(eta) || eta <= 0 || eta > 1) {
    return fail(`sourceScores: eta must be in (0,1], got ${eta}`);
  }
  if (!isFiniteNumber(temperature) || temperature <= 0) {
    return fail(`combinationWeights: temperature must be > 0, got ${temperature}`);
  }
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) return fail(`combinationWeights: source ${i} is missing`);
    if (r.source.trim() === "") return fail(`combinationWeights: source ${i} has an empty name`);
    if (r.hits.length < ROOT_MIN_SAMPLE) {
      return fail(`sourceScores: source "${r.source}" has ${r.hits.length} games, need >= ${ROOT_MIN_SAMPLE}`);
    }
    if (r.hits.length !== r.returns.length || r.hits.length !== r.consensusGap.length) {
      return fail(
        `sourceScores: source "${r.source}" has misaligned arrays (hits ${r.hits.length}, returns ${r.returns.length}, gap ${r.consensusGap.length})`,
      );
    }
    const h = isFiniteArray(r.hits, `sourceScores hits for ${r.source}`);
    if (!h.ok) return h;
    const rt = isFiniteArray(r.returns, `sourceScores returns for ${r.source}`);
    if (!rt.ok) return rt;
    const g = isFiniteArray(r.consensusGap, `sourceScores consensusGap for ${r.source}`);
    if (!g.ok) return g;
  }
  let scores: Map<string, number>;
  let weights: Map<string, number>;
  try {
    scores = sourceScores(
      records.map((r) => ({ source: r.source, hits: [...r.hits], returns: [...r.returns] })),
      records.map((r) => [...r.consensusGap]),
      eta,
    );
    weights = combinationWeights(scores, temperature);
  } catch (e) {
    return fail(`forecast-combination kernel threw: ${errMsg(e)}`);
  }
  const weightVec: number[] = [];
  const weightOut: Array<{ source: string; weight: number }> = [];
  const scoreOut: Array<{ source: string; score: number }> = [];
  for (const r of records) {
    const w = weights.get(r.source);
    if (w === undefined) return fail(`combinationWeights: no weight emitted for "${r.source}"`);
    const s = scores.get(r.source);
    if (s === undefined) return fail(`sourceScores: no score emitted for "${r.source}"`);
    const wc = checkBounded(w, 0, 1, `combination weight for "${r.source}"`);
    if (!wc.ok) return wc;
    const sc = checkFinite(s, `combination score for "${r.source}"`);
    if (!sc.ok) return sc;
    weightVec.push(wc.data);
    weightOut.push({ source: r.source, weight: wc.data });
    scoreOut.push({ source: r.source, score: sc.data });
  }
  const dist = checkDistribution(weightVec, "combination weights pmf");
  if (!dist.ok) return dist;
  return {
    ok: true,
    data: {
      gate: "ungated",
      weights: weightOut,
      scores: scoreOut,
      nSources: records.length,
      nGamesPerSource: records[0]?.hits.length ?? 0,
      eta,
    },
  };
}

export interface LogEntropyWeightResult {
  readonly gate: RootGate;
  /** A pmf over ensemble members. */
  readonly weights: readonly number[];
  readonly nMembers: number;
  /** Per-member binary entropy in nats. An UNCERTAINTY SCALE in [0, ln2], not a probability. */
  readonly entropies: readonly number[];
}

/** Per-member uncertainty weights for a binary ensemble (2602-11379). Output is a pmf. */
export function evalLogEntropyWeights(probs: readonly number[]): RootEval<LogEntropyWeightResult> {
  if (probs.length < ROOT_MIN_SAMPLE) {
    return fail(`logEntropyWeights: need >= ${ROOT_MIN_SAMPLE} members, got ${probs.length}`);
  }
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!isProbability(p)) {
      return fail(`logEntropyWeights: probs[${i}] = ${String(p)} is not a probability in [0,1]`);
    }
  }
  let w: number[];
  try {
    w = logEntropyWeights(probs);
  } catch (e) {
    return fail(`logEntropyWeights threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(w, "log-entropy weights pmf");
  if (!dist.ok) return dist;
  const entropies = probs.map((p) => {
    const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
    return -(pc * Math.log(pc) + (1 - pc) * Math.log(1 - pc));
  });
  for (let i = 0; i < entropies.length; i++) {
    const e = checkBounded(entropies[i], 0, Math.LN2, `binary entropy ${i}`);
    if (!e.ok) return e;
  }
  return { ok: true, data: { gate: "ungated", weights: w, nMembers: probs.length, entropies } };
}

export interface RefBlendResult {
  readonly gate: RootGate;
  /** Blended spec weights. Non-negative; the sum is reported rather than assumed to be 1. */
  readonly blendedWeights: readonly number[];
  /** Sum of the blended weights. Reported because the specs need not each be a pmf. */
  readonly weightSum: number;
  readonly nSpecs: number;
  /** 90% posterior-predictive interval. An INTERVAL in target units, not a probability. */
  readonly predictiveInterval90: readonly [number, number];
}

/** Regularized-ensemble spec blend + posterior predictive interval (2602-11379). */
export function evalRefBlend(
  specs: ReadonlyArray<{ readonly name: string; readonly weights: readonly number[] }>,
  rollingLoss: readonly number[],
  lambda: number,
  posteriorMean: number,
  posteriorVariance: number,
  tau2: number,
): RootEval<RefBlendResult> {
  if (specs.length < 2) return fail(`blendSpecs: need >= 2 specs, got ${specs.length}`);
  if (specs.length !== rollingLoss.length) {
    return fail(`blendSpecs: ${specs.length} specs vs ${rollingLoss.length} losses`);
  }
  if (!isFiniteNumber(lambda) || lambda < 0) {
    return fail(`blendSpecs: lambda must be >= 0, got ${lambda}`);
  }
  if (!isFiniteNumber(posteriorMean)) return fail("posteriorPredictiveInterval: mean must be finite");
  const varChk = checkNonNegative(posteriorVariance, "posteriorPredictiveInterval variance");
  if (!varChk.ok) return varChk;
  const tauChk = checkNonNegative(tau2, "posteriorPredictiveInterval tau2");
  if (!tauChk.ok) return tauChk;
  const p = specs[0]?.weights.length ?? 0;
  if (p === 0) return fail("blendSpecs: first spec has no weights");
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    if (!s) return fail(`blendSpecs: spec ${i} is missing`);
    if (s.weights.length !== p) {
      return fail(`blendSpecs: spec "${s.name}" has ${s.weights.length} weights, expected ${p}`);
    }
    const v = isFiniteArray(s.weights, `blendSpecs weights for ${s.name}`);
    if (!v.ok) return v;
    for (let j = 0; j < p; j++) {
      const w = s.weights[j];
      if ((w ?? 0) < 0) return fail(`blendSpecs: spec "${s.name}" weight ${j} is negative`);
    }
  }
  const ll = isFiniteArray(rollingLoss, "blendSpecs rollingLoss");
  if (!ll.ok) return ll;
  let blended: number[];
  let interval: [number, number];
  try {
    blended = blendSpecs(
      specs.map((s) => ({ name: s.name, weights: [...s.weights] })),
      rollingLoss,
      lambda,
    );
    interval = posteriorPredictiveInterval(posteriorMean, posteriorVariance, tau2);
  } catch (e) {
    return fail(`ref-blend kernel threw: ${errMsg(e)}`);
  }
  if (blended.length !== p) {
    return fail(`blendSpecs returned ${blended.length} weights, expected ${p}`);
  }
  let sum = 0;
  for (let j = 0; j < blended.length; j++) {
    const w = checkNonNegative(blended[j], `blended weight ${j}`);
    if (!w.ok) return w;
    sum += w.data;
  }
  if (!isFiniteNumber(interval[0]) || !isFiniteNumber(interval[1]) || interval[0] > interval[1]) {
    return fail("posteriorPredictiveInterval: produced a non-finite or inverted interval");
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      blendedWeights: blended,
      weightSum: sum,
      nSpecs: specs.length,
      predictiveInterval90: [interval[0], interval[1]],
    },
  };
}

export interface WallaSource {
  readonly source: string;
  readonly probability: number;
  readonly brier: number;
  readonly poolBrier: number;
}

export interface WallaAggregateResult {
  readonly gate: RootGate;
  /** Advantage-aligned weights per source. Non-negative, in units of 1/c3. */
  readonly sourceWeights: ReadonlyArray<{ readonly source: string; readonly weight: number }>;
  /** Linear-pool aggregate. A probability over the outcome. */
  readonly pooledProbability: number;
  /** D-Regret: the share of the equal-weight-to-oracle gap the aggregation did NOT close. */
  readonly dRegret: number;
  readonly nSources: number;
  readonly c3: number;
}

/** Advantage-aligned linear pooling (2607-04389v1). */
export function evalWallaLinearPool(
  sources: readonly WallaSource[],
  c3: number,
  wallaBrier: number,
  equalBrier: number,
  oracleBrier: number,
): RootEval<WallaAggregateResult> {
  if (sources.length < 2) return fail(`linearPool: need >= 2 sources, got ${sources.length}`);
  if (!isFiniteNumber(c3) || c3 <= 0) return fail(`advantageWeight: c3 must be > 0, got ${c3}`);
  if (!isFiniteNumber(wallaBrier)) return fail("dRegret: wallaBrier must be finite");
  if (!isFiniteNumber(equalBrier)) return fail("dRegret: equalBrier must be finite");
  if (!isFiniteNumber(oracleBrier)) return fail("dRegret: oracleBrier must be finite");
  const probs = new Map<string, number>();
  const weights = new Map<string, number>();
  const out: Array<{ source: string; weight: number }> = [];
  try {
    for (const s of sources) {
      if (s.source.trim() === "") return fail("linearPool: a source has an empty name");
      const p = checkBounded(s.probability, 0, 1, `source "${s.source}" probability`);
      if (!p.ok) return p;
      const bi = checkNonNegative(s.brier, `source "${s.source}" brier`);
      if (!bi.ok) return bi;
      const pi = checkNonNegative(s.poolBrier, `source "${s.source}" poolBrier`);
      if (!pi.ok) return pi;
      probs.set(s.source, p.data);
      const w = advantageWeight(
        { source: s.source, brier: s.brier, poolBrier: s.poolBrier },
        c3,
      );
      const wc = checkNonNegative(w, `advantage weight for "${s.source}"`);
      if (!wc.ok) return wc;
      weights.set(s.source, wc.data);
      out.push({ source: s.source, weight: wc.data });
    }
  } catch (e) {
    return fail(`advantageWeight threw: ${errMsg(e)}`);
  }
  let totalWeight = 0;
  for (const s of sources) totalWeight += weights.get(s.source) ?? 0;
  if (totalWeight <= 0) {
    return fail("linearPool: every source weight is zero — refusing to publish an unweighted aggregate");
  }
  let pooled: number;
  let regret: number;
  try {
    pooled = linearPool(probs, weights);
    regret = dRegret(wallaBrier, equalBrier, oracleBrier);
  } catch (e) {
    return fail(`WALLA kernel threw: ${errMsg(e)}`);
  }
  const pp = checkBounded(pooled, 0, 1, "WALLA pooled probability");
  if (!pp.ok) return pp;
  const rr = checkNonNegative(regret, "D-Regret");
  if (!rr.ok) return rr;
  return {
    ok: true,
    data: {
      gate: "ungated",
      sourceWeights: out,
      pooledProbability: pp.data,
      dRegret: rr.data,
      nSources: sources.length,
      c3,
    },
  };
}

export interface DdlDistributionResult {
  readonly gate: RootGate;
  /** A pmf over motion codewords. */
  readonly pmf: readonly number[];
  /** Expected displacement under the distribution, in the codeword-delta units. */
  readonly expectedDisplacement: readonly [number, number];
  readonly nCodewords: number;
  readonly temperature: number;
}

/** Discrete-distribution (DDL) categorical head over motion codewords (2608-11203v1). */
export function evalDdlDistribution(
  head: { readonly codebook: readonly (readonly number[])[]; readonly temperature: number },
  representation: readonly number[],
  codewordDeltas: ReadonlyArray<readonly [number, number]>,
): RootEval<DdlDistributionResult> {
  if (head.codebook.length < 2) {
    return fail(`ddlDistribution: need >= 2 codewords, got ${head.codebook.length}`);
  }
  if (!isFiniteNumber(head.temperature) || head.temperature <= 0) {
    return fail(`DDL head: temperature must be > 0, got ${head.temperature}`);
  }
  const d = representation.length;
  if (d === 0) return fail("ddlDistribution: representation is empty");
  const rv = isFiniteArray(representation, "ddl representation");
  if (!rv.ok) return rv;
  for (let i = 0; i < head.codebook.length; i++) {
    const cw = head.codebook[i];
    if (!cw) return fail(`ddlDistribution: codeword ${i} is missing`);
    if (cw.length !== d) {
      return fail(`ddlDistribution: codeword ${i} has ${cw.length} dims, representation has ${d}`);
    }
    const v = isFiniteArray(cw, `ddl codeword ${i}`);
    if (!v.ok) return v;
  }
  if (codewordDeltas.length !== head.codebook.length) {
    return fail(
      `ddlExpectedDisplacement: ${codewordDeltas.length} deltas for ${head.codebook.length} codewords`,
    );
  }
  for (let i = 0; i < codewordDeltas.length; i++) {
    const dv = codewordDeltas[i];
    if (!dv) return fail(`codeword delta ${i} is missing`);
    const v = isFiniteArray([dv[0], dv[1]], `codeword delta ${i}`);
    if (!v.ok) return v;
  }
  const localHead = { codebook: head.codebook.map((c) => [...c]), temperature: head.temperature };
  let pmf: number[];
  let disp: [number, number];
  try {
    pmf = ddlDistribution(localHead, representation);
    disp = ddlExpectedDisplacement(
      localHead,
      representation,
      codewordDeltas.map((v) => {
        const pair = v ?? [0, 0];
        return [pair[0], pair[1]] as [number, number];
      }),
    );
  } catch (e) {
    return fail(`DDL kernel threw: ${errMsg(e)}`);
  }
  const dist = checkDistribution(pmf, "DDL pmf");
  if (!dist.ok) return dist;
  const dx = checkFinite(disp[0], "DDL expected dx");
  if (!dx.ok) return dx;
  const dy = checkFinite(disp[1], "DDL expected dy");
  if (!dy.ok) return dy;
  return {
    ok: true,
    data: {
      gate: "ungated",
      pmf,
      expectedDisplacement: [dx.data, dy.data],
      nCodewords: head.codebook.length,
      temperature: head.temperature,
    },
  };
}

/* ═══════════════════ 5. MARKET MICROSTRUCTURE AND ARBITRAGE ═══════════════════ */

export interface LineMoveRow {
  readonly gameId: string;
  readonly pBefore: number;
  readonly pAfter: number;
  readonly clv: number;
}

export interface IgWeightedClvResult {
  readonly gate: RootGate;
  /** Information gain of the first move, KL(pAfter || pBefore) in nats. Non-negative. */
  readonly singleMoveInfoGain: number;
  /** True when the whole line history sits below the noise floor. */
  readonly nonIdentifiable: boolean;
  /** IG-weighted mean CLV. A price difference in probability UNITS, not a probability. */
  readonly igWeightedClv: number;
  readonly nGames: number;
  readonly nGamesFlagged: number;
  readonly noiseFloor: number;
}

/** Information-gain-weighted CLV with an identifiability gate (2601-18815). */
export function evalIgWeightedClv(
  moves: readonly LineMoveRow[],
  noiseFloor: number,
): RootEval<IgWeightedClvResult> {
  if (moves.length < ROOT_MIN_SAMPLE) {
    return fail(`igWeightedClv: need >= ${ROOT_MIN_SAMPLE} line moves, got ${moves.length}`);
  }
  if (!isFiniteNumber(noiseFloor) || noiseFloor <= 0) {
    return fail(`identifiabilityFlag: noiseFloor must be > 0, got ${noiseFloor}`);
  }
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!m) return fail(`igWeightedClv: move ${i} is missing`);
    if (m.gameId.trim() === "") return fail(`igWeightedClv: move ${i} has an empty gameId`);
    const b = checkBounded(m.pBefore, 0, 1, `move ${i} pBefore`);
    if (!b.ok) return b;
    const a = checkBounded(m.pAfter, 0, 1, `move ${i} pAfter`);
    if (!a.ok) return a;
    const c = checkFinite(m.clv, `move ${i} clv`);
    if (!c.ok) return c;
  }
  let ig: number;
  let flagged: boolean;
  let agg: { clv: number; flagged: number };
  try {
    ig = infoGain(moves[0]?.pBefore ?? 0.5, moves[0]?.pAfter ?? 0.5);
    flagged = identifiabilityFlag(moves, noiseFloor);
    agg = igWeightedClv(moves, noiseFloor);
  } catch (e) {
    return fail(`information-gain kernel threw: ${errMsg(e)}`);
  }
  const g = checkNonNegative(ig, "single-move information gain");
  if (!g.ok) return g;
  const clv = checkFinite(agg.clv, "IG-weighted CLV");
  if (!clv.ok) return clv;
  const nGames = new Set(moves.map((m) => m.gameId)).size;
  const nFlagged = checkNonNegative(agg.flagged, "non-identifiable game count");
  if (!nFlagged.ok) return nFlagged;
  // A CLV aggregate over zero identifiable games is not a number, it is a refusal.
  if (agg.flagged >= nGames) {
    return fail(
      `igWeightedClv: all ${nGames} games are non-identifiable at noise floor ${noiseFloor} — no CLV aggregate exists`,
    );
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      singleMoveInfoGain: g.data,
      nonIdentifiable: flagged,
      igWeightedClv: clv.data,
      nGames,
      nGamesFlagged: agg.flagged,
      noiseFloor,
    },
  };
}

export interface SciMove {
  readonly book: string;
  readonly move: number;
  readonly logitBefore: number;
  readonly logitAfter: number;
}

export interface SciResult {
  readonly gate: RootGate;
  /** Cross-book direction agreement in [0,1]. An AGREEMENT RATE, not an event probability. */
  readonly directionAgreement: number;
  /** Cross-book breadth HHI in [0,1]. A CONCENTRATION index in [0,1], not a probability. */
  readonly breadthHhi: number;
  /** Weighted composite in [0,1]. A CREDIBILITY SCORE, not a probability. */
  readonly signalCredibilityScore: number;
  readonly nBooks: number;
}

/** Signal Credibility Index components (2604-27041). */
export function evalSignalCredibility(
  moves: readonly SciMove[],
  weights: { readonly pr: number; readonly ts: number; readonly hhi: number } = {
    pr: 0.4,
    ts: 0.35,
    hhi: 0.25,
  },
): RootEval<SciResult> {
  if (moves.length < 2) return fail(`signalCredibilityIndex: need >= 2 book moves, got ${moves.length}`);
  for (const [name, w] of [
    ["pr", weights.pr],
    ["ts", weights.ts],
    ["hhi", weights.hhi],
  ] as ReadonlyArray<readonly [string, number]>) {
    const v = checkNonNegative(w, `SCI weight ${name}`);
    if (!v.ok) return v;
  }
  if (weights.pr + weights.ts + weights.hhi <= 0) {
    return fail("signalCredibilityIndex: weights must not all be zero");
  }
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!m) return fail(`signalCredibilityIndex: move ${i} is missing`);
    const v = isFiniteArray(
      [m.move, m.logitBefore, m.logitAfter],
      `signalCredibilityIndex move ${i}`,
    );
    if (!v.ok) return v;
  }
  let ts: number;
  let hhi: number;
  let sci: number;
  try {
    ts = directionAgreement(moves);
    hhi = breadthHhi(moves);
    sci = signalCredibilityIndex(moves, weights);
  } catch (e) {
    return fail(`signal-credibility kernel threw: ${errMsg(e)}`);
  }
  const t = checkBounded(ts, 0, 1, "direction agreement");
  if (!t.ok) return t;
  const h = checkBounded(hhi, 0, 1, "breadth HHI");
  if (!h.ok) return h;
  const s = checkBounded(sci, 0, 1, "signal credibility score");
  if (!s.ok) return s;
  return {
    ok: true,
    data: {
      gate: "ungated",
      directionAgreement: t.data,
      breadthHhi: h.data,
      signalCredibilityScore: s.data,
      nBooks: moves.length,
    },
  };
}

export interface TimedMoveRow {
  readonly hoursBeforeClose: number;
  readonly magnitude: number;
  readonly postAnchor: boolean;
}

export interface DriftShareResult {
  readonly gate: RootGate;
  /** exp((h/H)^2): a hazard weight, strictly > 0. A weight, not a probability. */
  readonly hazardWeight: number;
  /** Hazard-weighted pre-anchor drift share in [0,1]. A SHARE in [0,1], not a probability. */
  readonly preAnchorDriftShare: number;
  /** Game ids that survive the anchor-robustness gate. */
  readonly anchorRobustGameIds: readonly string[];
  readonly nGamesIn: number;
  readonly nGamesKept: number;
  readonly halfLifeHours: number;
}

/** Hazard-decayed pre-close drift share and the anchor-robustness filter (2605-00459). */
export function evalDriftShare(
  moves: readonly TimedMoveRow[],
  halfLifeHours: number,
  maxPostAnchorShare: number,
  games?: ReadonlyArray<{ readonly gameId: string; readonly moves: readonly TimedMoveRow[] }>,
): RootEval<DriftShareResult> {
  if (moves.length === 0) return fail("driftShare: no moves supplied");
  if (!isFiniteNumber(halfLifeHours) || halfLifeHours <= 0) {
    return fail(`hazardDecayWeight: halfLifeHrs must be > 0, got ${halfLifeHours}`);
  }
  if (!isFiniteNumber(maxPostAnchorShare) || maxPostAnchorShare < 0 || maxPostAnchorShare > 1) {
    return fail(`driftShare gate: maxPostAnchorShare must be in [0,1], got ${maxPostAnchorShare}`);
  }
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!m) return fail(`driftShare: move ${i} is missing`);
    const v = isFiniteArray([m.hoursBeforeClose, m.magnitude], `driftShare move ${i}`);
    if (!v.ok) return v;
  }
  let hazard: number;
  let share: number;
  try {
    hazard = hazardDecayWeight(moves[0]?.hoursBeforeClose ?? 0, halfLifeHours);
    share = driftShare(moves, halfLifeHours);
  } catch (e) {
    return fail(`drift-share kernel threw: ${errMsg(e)}`);
  }
  const h = checkFinite(hazard, "hazard decay weight");
  if (!h.ok) return h;
  if (h.data <= 0) return fail(`hazardDecayWeight produced a non-positive weight (${h.data})`);
  const s = checkBounded(share, 0, 1, "pre-anchor drift share");
  if (!s.ok) return s;
  let kept: string[] = [];
  const nIn = games?.length ?? 0;
  if (games !== undefined) {
    if (games.length === 0) return fail("anchorRobustFilter: no games supplied");
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (!g) return fail(`anchorRobustFilter: game ${i} is missing`);
      if (g.gameId.trim() === "") return fail(`anchorRobustFilter: game ${i} has an empty id`);
      if (g.moves.length === 0) {
        return fail(`anchorRobustFilter: game "${g.gameId}" has no moves`);
      }
    }
    try {
      kept = anchorRobustFilter(
        games.map((g) => ({ gameId: g.gameId, moves: [...g.moves] })),
        halfLifeHours,
        maxPostAnchorShare,
      );
    } catch (e) {
      return fail(`anchorRobustFilter threw: ${errMsg(e)}`);
    }
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      hazardWeight: h.data,
      preAnchorDriftShare: s.data,
      anchorRobustGameIds: kept,
      nGamesIn: nIn,
      nGamesKept: kept.length,
      halfLifeHours,
    },
  };
}

export interface ArbLegRow {
  readonly price: number;
  readonly depth: number;
  readonly direction: 1 | -1;
}

export interface ExecutableEdgeResult {
  readonly gate: RootGate;
  /** Fee-adjusted direction-aware edge. A PRICE DIFFERENCE, positive = executable arb. */
  readonly executableEdge: number;
  /** Size tradable at the min leg depth, in contracts. */
  readonly maxSize: number;
  /** The naive mid-sum bound, reported beside the executable number for comparison. */
  readonly naiveMidBound: number | null;
  readonly nLegs: number;
}

/** Depth- and fee-aware executable arbitrage edge (2608-00666). */
export function evalExecutableEdge(
  legs: readonly ArbLegRow[],
  feePerLeg: number,
): RootEval<ExecutableEdgeResult> {
  if (legs.length < 2) return fail(`executableEdge: need >= 2 legs, got ${legs.length}`);
  if (!isFiniteNumber(feePerLeg) || feePerLeg < 0) {
    return fail(`executableEdge: feePerLeg must be >= 0, got ${feePerLeg}`);
  }
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    if (!l) return fail(`executableEdge: leg ${i} is missing`);
    if (!isFiniteNumber(l.price) || l.price <= 0) {
      return fail(`executableEdge: leg ${i} price must be > 0, got ${l.price}`);
    }
    if (!isFiniteNumber(l.depth) || l.depth < 0) {
      return fail(`executableEdge: leg ${i} depth must be >= 0, got ${l.depth}`);
    }
    if (l.direction !== 1 && l.direction !== -1) {
      return fail(`executableEdge: leg ${i} direction must be 1 or -1, got ${l.direction}`);
    }
  }
  let out: { edge: number; maxSize: number };
  try {
    out = executableEdge(legs, feePerLeg);
  } catch (e) {
    return fail(`executableEdge threw: ${errMsg(e)}`);
  }
  const edge = checkFinite(out.edge, "executable edge");
  if (!edge.ok) {
    return fail(`executableEdge returned a non-finite edge (${out.edge}) — no executable size`);
  }
  const size = checkNonNegative(out.maxSize, "executable max size");
  if (!size.ok) return size;
  if (size.data <= 0) {
    return fail(`executableEdge: min leg depth is ${size.data} — the arb is not executable`);
  }
  let naive: number | null = null;
  const buy = legs.find((l) => l.direction === 1);
  const sell = legs.find((l) => l.direction === -1);
  if (buy && sell) {
    try {
      naive = naiveMidBound(buy.price, sell.price);
    } catch (e) {
      return fail(`naiveMidBound threw: ${errMsg(e)}`);
    }
    const nb = checkFinite(naive, "naive mid bound");
    if (!nb.ok) return nb;
    naive = nb.data;
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      executableEdge: edge.data,
      maxSize: size.data,
      naiveMidBound: naive,
      nLegs: legs.length,
    },
  };
}

export interface BookTopRow {
  readonly marketId: string;
  readonly askYes: number;
  readonly askNo: number;
  readonly depthYes: number;
  readonly depthNo: number;
}

export interface DislocationResult {
  readonly gate: RootGate;
  /** 1 - (askYes + askNo). A PRICE DIFFERENCE; positive = underround. */
  readonly singleMarketEdge: number;
  readonly executable: boolean;
  /** 1 - (mlAskYes + spreadImpliedCover) - 2*fee. A PRICE DIFFERENCE. */
  readonly syntheticShortEdge: number | null;
  /** Deduplicated, best-per-market dislocation edges. PRICE DIFFERENCES. */
  readonly dedupedEdges: ReadonlyArray<{ readonly marketId: string; readonly edge: number }>;
  readonly minDepth: number;
}

/** Polymarket single-market and synthetic-short dislocations with dedup (2605-00864). */
export function evalDislocations(
  book: BookTopRow,
  minDepth: number,
  synthetic?: { readonly mlAskYes: number; readonly spreadImpliedCover: number; readonly fee: number },
  extraEdges?: ReadonlyArray<{ readonly marketId: string; readonly edge: number }>,
): RootEval<DislocationResult> {
  if (book.marketId.trim() === "") return fail("singleMarketDislocation: empty marketId");
  if (!isFiniteNumber(book.askYes) || book.askYes <= 0 || book.askYes > 1) {
    return fail(`singleMarketDislocation: askYes must be in (0,1], got ${book.askYes}`);
  }
  if (!isFiniteNumber(book.askNo) || book.askNo <= 0 || book.askNo > 1) {
    return fail(`singleMarketDislocation: askNo must be in (0,1], got ${book.askNo}`);
  }
  if (!isFiniteNumber(book.depthYes) || book.depthYes < 0) {
    return fail(`singleMarketDislocation: depthYes must be >= 0, got ${book.depthYes}`);
  }
  if (!isFiniteNumber(book.depthNo) || book.depthNo < 0) {
    return fail(`singleMarketDislocation: depthNo must be >= 0, got ${book.depthNo}`);
  }
  if (!isFiniteNumber(minDepth) || minDepth <= 0) {
    return fail(`singleMarketDislocation: minDepth must be > 0, got ${minDepth}`);
  }
  let single: { edge: number; executable: boolean };
  try {
    single = singleMarketDislocation(book, minDepth);
  } catch (e) {
    return fail(`singleMarketDislocation threw: ${errMsg(e)}`);
  }
  const edge = checkFinite(single.edge, "single-market edge");
  if (!edge.ok) return edge;
  let synth: number | null = null;
  if (synthetic !== undefined) {
    if (!isFiniteNumber(synthetic.mlAskYes) || synthetic.mlAskYes <= 0 || synthetic.mlAskYes > 1) {
      return fail(`syntheticShortDislocation: mlAskYes must be in (0,1], got ${synthetic.mlAskYes}`);
    }
    if (
      !isFiniteNumber(synthetic.spreadImpliedCover) ||
      synthetic.spreadImpliedCover <= 0 ||
      synthetic.spreadImpliedCover > 1
    ) {
      return fail(
        `syntheticShortDislocation: spreadImpliedCover must be in (0,1], got ${synthetic.spreadImpliedCover}`,
      );
    }
    if (!isFiniteNumber(synthetic.fee) || synthetic.fee < 0) {
      return fail(`syntheticShortDislocation: fee must be >= 0, got ${synthetic.fee}`);
    }
    try {
      synth = syntheticShortDislocation(
        synthetic.mlAskYes,
        synthetic.spreadImpliedCover,
        synthetic.fee,
      );
    } catch (e) {
      return fail(`syntheticShortDislocation threw: ${errMsg(e)}`);
    }
    const sc = checkFinite(synth, "synthetic short edge");
    if (!sc.ok) return sc;
    synth = sc.data;
  }
  let deduped: Array<{ marketId: string; edge: number }> = [];
  if (extraEdges !== undefined) {
    if (extraEdges.length === 0) return fail("dedupDislocations: no edges supplied");
    for (let i = 0; i < extraEdges.length; i++) {
      const e = extraEdges[i];
      if (!e) return fail(`dedupDislocations: edge ${i} is missing`);
      if (e.marketId.trim() === "") return fail(`dedupDislocations: edge ${i} has an empty marketId`);
      const v = checkFinite(e.edge, `dedupDislocations edge ${i}`);
      if (!v.ok) return v;
    }
    try {
      deduped = dedupDislocations(extraEdges.map((e) => ({ marketId: e.marketId, edge: e.edge })));
    } catch (e) {
      return fail(`dedupDislocations threw: ${errMsg(e)}`);
    }
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      singleMarketEdge: edge.data,
      executable: single.executable,
      syntheticShortEdge: synth,
      dedupedEdges: deduped,
      minDepth,
    },
  };
}

export interface SgpLegRow {
  readonly id: string;
  readonly p: number;
}

export interface SgpFairPriceResult {
  readonly gate: RootGate;
  /** Correlation-aware parlay fair price in (0,1]. A probability. */
  readonly sgpFairPrice: number;
  /** Independence price minus the interaction-aware price. Can be negative; a PRICE DIFFERENCE. */
  readonly correlationDiscount: number;
  readonly nLegs: number;
}

/** Correlation-aware same-game-parlay fair price (2607-18299). */
export function evalSgpFairPrice(
  legs: readonly SgpLegRow[],
  thetas: ReadonlyMap<string, number>,
): RootEval<SgpFairPriceResult> {
  if (legs.length < 2) return fail(`sgpFairPrice: need >= 2 legs, got ${legs.length}`);
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    if (!l) return fail(`sgpFairPrice: leg ${i} is missing`);
    if (l.id.trim() === "") return fail(`sgpFairPrice: leg ${i} has an empty id`);
    if (!isFiniteNumber(l.p) || l.p <= 0 || l.p > 1) {
      return fail(`sgpFairPrice: leg "${l.id}" p must be in (0,1], got ${l.p}`);
    }
  }
  for (const [k, v] of thetas) {
    const c = checkFinite(v, `sgp theta "${k}"`);
    if (!c.ok) return c;
  }
  let price: number;
  let discount: number;
  try {
    price = sgpFairPrice(legs, thetas);
    discount = correlationDiscount(legs, thetas);
  } catch (e) {
    return fail(`SGP kernel threw: ${errMsg(e)}`);
  }
  const p = checkBounded(price, 0, 1, "SGP fair price");
  if (!p.ok) return p;
  const d = checkFinite(discount, "SGP correlation discount");
  if (!d.ok) return d;
  return {
    ok: true,
    data: {
      gate: "ungated",
      sgpFairPrice: p.data,
      correlationDiscount: d.data,
      nLegs: legs.length,
    },
  };
}

/* ═════════════════ 6. STAKING, CLV AND THE PUBLISH POLICY ═════════════════ */

export interface ResolvedBetRow {
  readonly odds: number;
  readonly edge: number;
  readonly won: boolean;
}

export interface StakingBatteryResult {
  readonly gate: RootGate;
  /** Naive-strategy P&L by name. MONEY UNITS, an error metric — never a win rate. */
  readonly naivePnl: Readonly<Record<string, number>>;
  /** Candidate-staking P&L. MONEY UNITS. */
  readonly candidatePnl: number;
  /** Whether the candidate beat every naive strategy on the same history. */
  readonly beatsAllNaive: boolean;
  readonly nBets: number;
  readonly unit: number;
  readonly target: number;
}

/** Staking baseline battery (2604-08251v1). P&L is money, not a win rate. */
export function evalStakingBattery(
  bets: readonly ResolvedBetRow[],
  candidateStakes: readonly number[],
  unit: number,
  target: number,
): RootEval<StakingBatteryResult> {
  if (bets.length < ROOT_MIN_SAMPLE) {
    return fail(`batteryVerdict: need >= ${ROOT_MIN_SAMPLE} resolved bets, got ${bets.length}`);
  }
  if (candidateStakes.length !== bets.length) {
    return fail(
      `batteryVerdict: ${candidateStakes.length} candidate stakes for ${bets.length} bets — misaligned`,
    );
  }
  if (!isFiniteNumber(unit) || unit <= 0) return fail(`flatStake: unit must be > 0, got ${unit}`);
  if (!isFiniteNumber(target) || target <= 0) {
    return fail(`fixedReturnStake: target must be > 0, got ${target}`);
  }
  for (let i = 0; i < bets.length; i++) {
    const b = bets[i];
    if (!b) return fail(`batteryVerdict: bet ${i} is missing`);
    if (!isFiniteNumber(b.odds) || b.odds <= 1) {
      return fail(`batteryVerdict: bet ${i} odds must be > 1, got ${b.odds}`);
    }
    if (!isFiniteNumber(b.edge) || b.edge < 0) {
      return fail(`sqrtStake: bet ${i} edge must be >= 0, got ${b.edge}`);
    }
    const v = checkNonNegative(candidateStakes[i], `candidate stake ${i}`);
    if (!v.ok) return v;
  }
  // batteryVerdict invokes the candidate stake function exactly once per bet, in order,
  // so a monotonic cursor indexes the caller-supplied deterministic stake vector.
  let cursor = 0;
  const candidateStake = (): number => {
    const s = candidateStakes[cursor] ?? Number.NaN;
    cursor += 1;
    return s;
  };
  let verdict: {
    candidate: number;
    naive: Record<string, number>;
    beatsAll: boolean;
  };
  try {
    verdict = batteryVerdict(bets, candidateStake, unit, target);
  } catch (e) {
    return fail(`batteryVerdict threw: ${errMsg(e)}`);
  }
  if (cursor !== bets.length) {
    return fail(`batteryVerdict consumed ${cursor} candidate stakes, expected ${bets.length}`);
  }
  const cand = checkFinite(verdict.candidate, "candidate P&L");
  if (!cand.ok) return cand;
  for (const [name, value] of Object.entries(verdict.naive)) {
    const v = checkFinite(value, `naive "${name}" P&L`);
    if (!v.ok) return v;
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      naivePnl: verdict.naive,
      candidatePnl: cand.data,
      beatsAllNaive: verdict.beatsAll,
      nBets: bets.length,
      unit,
      target,
    },
  };
}

export interface ClvResult {
  readonly gate: RootGate;
  /** stake = clip((p - q) / liquidity, 0, cap). MONEY UNITS, not a probability. */
  readonly stake: number;
  /** Accuracy term: squared-error improvement of the model over the market. */
  readonly scoreGap: number;
  /** Disagreement payoff: stake * (p - q). */
  readonly divergence: number;
  /** Liquidity cost: stake * slippage. */
  readonly liquidityCost: number;
  /** scoreGap + divergence - liquidityCost. */
  readonly netClv: number;
  readonly capped: boolean;
}

/** Proper-bet stake sizing and the three-term CLV decomposition (2607-06166). */
export function evalProperBetClv(
  pModel: number,
  qMarket: number,
  outcome: 0 | 1,
  liquidity: number,
  cap: number,
  stake: number,
  slippage: number,
): RootEval<ClvResult> {
  if (!isProbability(pModel)) return fail(`properBetStake: pModel must be in [0,1], got ${pModel}`);
  if (!isProbability(qMarket)) {
    return fail(`properBetStake: qMarket must be in [0,1], got ${qMarket}`);
  }
  if (outcome !== 0 && outcome !== 1) {
    return fail(`decomposeClv: outcome must be 0 or 1, got ${String(outcome)}`);
  }
  if (!isFiniteNumber(liquidity) || liquidity <= 0) {
    return fail(`properBetStake: liquidity must be > 0, got ${liquidity}`);
  }
  if (!isFiniteNumber(cap) || cap <= 0) return fail(`properBetStake: cap must be > 0, got ${cap}`);
  const s = checkNonNegative(stake, "decomposeClv stake");
  if (!s.ok) return s;
  const sl = checkNonNegative(slippage, "decomposeClv slippage");
  if (!sl.ok) return sl;
  let w: number;
  let parts: { scoreGap: number; divergence: number; liquidityCost: number };
  let net: number;
  try {
    w = properBetStake({ pModel, qMarket, liquidity, cap });
    parts = researchDecomposeClv(pModel, qMarket, outcome, s.data, sl.data);
    net = netClv(parts);
  } catch (e) {
    return fail(`CLV kernel threw: ${errMsg(e)}`);
  }
  const sw = checkNonNegative(w, "proper-bet stake");
  if (!sw.ok) return sw;
  const sg = checkFinite(parts.scoreGap, "CLV score gap");
  if (!sg.ok) return sg;
  const dv = checkFinite(parts.divergence, "CLV divergence");
  if (!dv.ok) return dv;
  const lc = checkNonNegative(parts.liquidityCost, "CLV liquidity cost");
  if (!lc.ok) return lc;
  const nt = checkFinite(net, "net CLV");
  if (!nt.ok) return nt;
  return {
    ok: true,
    data: {
      gate: "ungated",
      stake: sw.data,
      scoreGap: sg.data,
      divergence: dv.data,
      liquidityCost: lc.data,
      netClv: nt.data,
      capped: sw.data >= cap,
    },
  };
}

export interface PublishPolicyRow {
  readonly agreement: number;
  readonly edge: number;
  readonly cost: number;
}

export interface PublishPolicyResult {
  readonly gate: RootGate;
  /** The policy's own decision on the supplied row. A BOOLEAN gate, not a probability. */
  readonly publishes: boolean;
  /** Mean (edge - cost) over published rows. An ROI ESTIMATE in probability units. */
  readonly policyRoi: number;
  readonly nRows: number;
  readonly nPublished: number;
  readonly agreeFloor: number;
  readonly edgeFloor: number;
}

/** Abstention / publish policy and its long-run ROI (2510-18193v2). */
export function evalPublishPolicy(
  rows: readonly PublishPolicyRow[],
  agreeFloor: number,
  edgeFloor: number,
  probe?: PublishPolicyRow,
): RootEval<PublishPolicyResult> {
  if (rows.length < ROOT_MIN_SAMPLE) {
    return fail(`policyRoi: need >= ${ROOT_MIN_SAMPLE} resolved games, got ${rows.length}`);
  }
  if (!isFiniteNumber(agreeFloor)) return fail(`shouldPublish: agreeFloor must be finite`);
  if (!isFiniteNumber(edgeFloor)) return fail(`shouldPublish: edgeFloor must be finite`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) return fail(`policyRoi: row ${i} is missing`);
    const v = isFiniteArray([r.agreement, r.edge, r.cost], `policyRoi row ${i}`);
    if (!v.ok) return v;
    if (!isBounded01(r.agreement)) {
      return fail(`shouldPublish: row ${i} agreement = ${r.agreement} outside [0,1]`);
    }
  }
  let decision: boolean;
  let roi: number;
  try {
    const target = probe ?? rows[0];
    if (!target) return fail("shouldPublish: no probe row available");
    const pv = isFiniteArray([target.agreement, target.edge, target.cost], "shouldPublish probe");
    if (!pv.ok) return pv;
    if (!isBounded01(target.agreement)) {
      return fail(`shouldPublish: probe agreement = ${target.agreement} outside [0,1]`);
    }
    decision = shouldPublish(target, agreeFloor, edgeFloor);
    roi = policyRoi(rows, agreeFloor, edgeFloor);
  } catch (e) {
    return fail(`publish-policy kernel threw: ${errMsg(e)}`);
  }
  if (Number.isNaN(roi)) {
    return fail(
      `policyRoi: no game clears agreement ${agreeFloor} and edge floor ${edgeFloor} — the policy publishes nothing, so its ROI is undefined`,
    );
  }
  const r = checkFinite(roi, "policy ROI");
  if (!r.ok) return r;
  let nPublished = 0;
  try {
    nPublished = rows.filter((g) => shouldPublish(g, agreeFloor, edgeFloor)).length;
  } catch (e) {
    return fail(`shouldPublish threw while counting: ${errMsg(e)}`);
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      publishes: decision,
      policyRoi: r.data,
      nRows: rows.length,
      nPublished,
      agreeFloor,
      edgeFloor,
    },
  };
}

export interface TunedPolicyResult {
  readonly gate: RootGate;
  readonly agreeFloor: number;
  readonly edgeFloor: number;
  /** Best achievable ROI on this history. An ROI ESTIMATE in probability units. */
  readonly roi: number;
  readonly nPublished: number;
  readonly nRows: number;
}

/** Grid-search the abstention floors for the best ROI on history (2510-18193v2). */
export function evalTunedPolicy(
  rows: readonly PublishPolicyRow[],
  agreeGrid: readonly number[],
  edgeGrid: readonly number[],
): RootEval<TunedPolicyResult> {
  if (rows.length < ROOT_MIN_FIT_SAMPLE) {
    return fail(`tuneAbstention: need >= ${ROOT_MIN_FIT_SAMPLE} resolved games, got ${rows.length}`);
  }
  if (agreeGrid.length === 0 || edgeGrid.length === 0) {
    return fail("tuneAbstention: both grids must be non-empty");
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) return fail(`tuneAbstention: row ${i} is missing`);
    const v = isFiniteArray([r.agreement, r.edge, r.cost], `tuneAbstention row ${i}`);
    if (!v.ok) return v;
    if (!isBounded01(r.agreement)) {
      return fail(`tuneAbstention: row ${i} agreement = ${r.agreement} outside [0,1]`);
    }
  }
  for (let i = 0; i < agreeGrid.length; i++) {
    const v = checkBounded(agreeGrid[i], 0, 1, `tuneAbstention agreeGrid[${i}]`);
    if (!v.ok) return v;
  }
  for (let i = 0; i < edgeGrid.length; i++) {
    const v = checkFinite(edgeGrid[i], `tuneAbstention edgeGrid[${i}]`);
    if (!v.ok) return v;
  }
  let best: { agreeFloor: number; edgeFloor: number; roi: number };
  try {
    best = tuneAbstention(rows, agreeGrid, edgeGrid);
  } catch (e) {
    return fail(`tuneAbstention threw: ${errMsg(e)}`);
  }
  const roi = checkFinite(best.roi, "tuned policy ROI");
  if (!roi.ok) {
    return fail(
      `tuneAbstention: no (agreeFloor, edgeFloor) pair publishes anything — ROI is -Infinity, not a number`,
    );
  }
  let nPublished = 0;
  try {
    nPublished = rows.filter((g) => shouldPublish(g, best.agreeFloor, best.edgeFloor)).length;
  } catch (e) {
    return fail(`shouldPublish threw while counting: ${errMsg(e)}`);
  }
  if (nPublished < ROOT_MIN_SAMPLE) {
    return fail(
      `tuneAbstention: best policy publishes only ${nPublished} of ${rows.length} games — below the ${ROOT_MIN_SAMPLE}-row floor for an ROI claim`,
    );
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      agreeFloor: best.agreeFloor,
      edgeFloor: best.edgeFloor,
      roi: roi.data,
      nPublished,
      nRows: rows.length,
    },
  };
}

export interface GoKickFrontierResult {
  readonly gate: RootGate;
  /** Expected points of going for it. EXPECTED POINTS, not a probability. */
  readonly goExpectedPoints: number;
  /** Expected points of kicking. EXPECTED POINTS. */
  readonly kickExpectedPoints: number;
  /** The conversion probability at which the two are equal. A probability. */
  readonly indifferenceConversionProbability: number;
  /** The kernel's own recommendation. A DECISION LABEL, not a probability. */
  readonly recommendation: "go" | "kick";
}

/** Go/kick indifference frontier on expected points (2512-00312v2). */
export function evalGoKickFrontier(
  pConvert: number,
  epIfConvert: number,
  epIfFail: number,
  pMake: number,
  epIfMake: number,
  epIfMiss: number,
): RootEval<GoKickFrontierResult> {
  if (!isBounded01(pConvert)) return fail(`goEV: pConvert must be in [0,1], got ${pConvert}`);
  if (!isBounded01(pMake)) return fail(`kickEV: pMake must be in [0,1], got ${pMake}`);
  const ec = checkFinite(epIfConvert, "epIfConvert");
  if (!ec.ok) return ec;
  const ef = checkFinite(epIfFail, "epIfFail");
  if (!ef.ok) return ef;
  const em = checkFinite(epIfMake, "epIfMake");
  if (!em.ok) return em;
  const en = checkFinite(epIfMiss, "epIfMiss");
  if (!en.ok) return en;
  if (Math.abs(epIfConvert - epIfFail) < 1e-12) {
    return fail("indifferenceP: degenerate — epIfConvert equals epIfFail, no frontier exists");
  }
  let g: number;
  let k: number;
  let frontier: number;
  let rec: "go" | "kick";
  try {
    g = goEV(pConvert, epIfConvert, epIfFail);
    k = kickEV(pMake, epIfMake, epIfMiss);
    frontier = indifferenceP(epIfConvert, epIfFail, k);
    rec = recommend(pConvert, epIfConvert, epIfFail, k);
  } catch (e) {
    return fail(`go/kick kernel threw: ${errMsg(e)}`);
  }
  const gv = checkFinite(g, "go EV");
  if (!gv.ok) return gv;
  const kv = checkFinite(k, "kick EV");
  if (!kv.ok) return kv;
  const f = checkBounded(frontier, 0, 1, "indifference conversion probability");
  if (!f.ok) return f;
  if (rec !== "go" && rec !== "kick") {
    return fail(`recommend returned an unknown decision: ${String(rec)}`);
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      goExpectedPoints: gv.data,
      kickExpectedPoints: kv.data,
      indifferenceConversionProbability: f.data,
      recommendation: rec,
    },
  };
}

export interface DecisionStabilityResult {
  readonly gate: RootGate;
  /** Spearman rank correlation in [-1,1]. A CORRELATION, not a probability. */
  readonly spearman: number;
  /** Mean (benchmarkWP - engineWP) per decision. WIN-PROBABILITY POINTS, not a probability. */
  readonly meanRegretWinProbabilityPoints: number;
  readonly nDecisions: number;
}

/** Rank-stability audit and per-decision regret vs a benchmark (2512-00312v2). */
export function evalDecisionStability(
  seasonA: readonly number[],
  seasonB: readonly number[],
  engineWp: readonly number[],
  benchmarkWp: readonly number[],
): RootEval<DecisionStabilityResult> {
  if (seasonA.length !== seasonB.length) {
    return fail(`spearman: length mismatch (${seasonA.length} vs ${seasonB.length})`);
  }
  if (seasonA.length < 4) {
    return fail(`spearman: need >= 4 ranked items, got ${seasonA.length}`);
  }
  const a = isFiniteArray(seasonA, "spearman season A");
  if (!a.ok) return a;
  const b = isFiniteArray(seasonB, "spearman season B");
  if (!b.ok) return b;
  if (engineWp.length !== benchmarkWp.length) {
    return fail(
      `regretVsBenchmark: length mismatch (${engineWp.length} vs ${benchmarkWp.length})`,
    );
  }
  if (engineWp.length < ROOT_MIN_SAMPLE) {
    return fail(`regretVsBenchmark: need >= ${ROOT_MIN_SAMPLE} decisions, got ${engineWp.length}`);
  }
  for (let i = 0; i < engineWp.length; i++) {
    const p = checkBounded(engineWp[i], 0, 1, `regretVsBenchmark engineWp[${i}]`);
    if (!p.ok) return p;
    const q = checkBounded(benchmarkWp[i], 0, 1, `regretVsBenchmark benchmarkWp[${i}]`);
    if (!q.ok) return q;
  }
  let rho: number;
  let regret: number;
  try {
    rho = spearman(seasonA, seasonB);
    regret = regretVsBenchmark(engineWp, benchmarkWp);
  } catch (e) {
    return fail(`decision-stability kernel threw: ${errMsg(e)}`);
  }
  const r = checkBounded(rho, -1, 1, "Spearman correlation");
  if (!r.ok) return r;
  const g = checkFinite(regret, "mean regret");
  if (!g.ok) return g;
  return {
    ok: true,
    data: {
      gate: "ungated",
      spearman: r.data,
      meanRegretWinProbabilityPoints: g.data,
      nDecisions: engineWp.length,
    },
  };
}

/* ═══════════════ 7. PROPER SCORING RULES AND ERROR METRICS ═══════════════ */

export interface ProperScoreResult {
  readonly gate: RootGate;
  /** CRPS of a Gaussian forecast. An ERROR METRIC in the target's units. */
  readonly crpsGaussian: number;
  /** Interval score. An ERROR METRIC; a proper score for the stated interval. */
  readonly intervalScore: number;
  /** Beta-energy score. An ERROR METRIC; proper only at beta = 1. */
  readonly betaEnergyScore: number;
  /** Mean of the supplied component scores. An ERROR METRIC. */
  readonly meanScore: number;
}

/** Gaussian CRPS, interval score, energy score and their mean (2603-08206v5). */
export function evalProperScores(
  observation: number,
  mean: number,
  sigma: number,
  lower: number,
  upper: number,
  alpha: number,
  samples: readonly number[],
  beta: number,
): RootEval<ProperScoreResult> {
  if (!isFiniteNumber(observation)) return fail("crpsGaussian: observation must be finite");
  if (!isFiniteNumber(mean)) return fail("crpsGaussian: mean must be finite");
  if (!isFiniteNumber(sigma) || sigma <= 0) return fail(`crpsGaussian: sigma must be > 0, got ${sigma}`);
  if (!isFiniteNumber(lower) || !isFiniteNumber(upper)) {
    return fail("intervalScore: bounds must be finite");
  }
  if (lower > upper) return fail(`intervalScore: inverted interval [${lower}, ${upper}]`);
  if (!isFiniteNumber(alpha) || alpha <= 0 || alpha >= 1) {
    return fail(`intervalScore: alpha must be in (0,1), got ${alpha}`);
  }
  if (samples.length < ROOT_MIN_SAMPLE) {
    return fail(`betaEnergyScore: need >= ${ROOT_MIN_SAMPLE} samples, got ${samples.length}`);
  }
  const sv = isFiniteArray(samples, "betaEnergyScore samples");
  if (!sv.ok) return sv;
  // The energy score is a PROPER scoring rule only at beta = 1. Publishing a beta != 1
  // value as if it were comparable across forecasts would be a category error, so the
  // bridge refuses rather than silently reporting an improper score.
  if (beta !== 1) {
    return fail(`betaEnergyScore: beta must be 1 for a proper energy score, got ${beta}`);
  }
  let crps: number;
  let is: number;
  let es: number;
  let meanScoreValue: number;
  try {
    crps = crpsGaussian(observation, mean, sigma);
    is = intervalScore(observation, lower, upper, alpha);
    es = betaEnergyScore(observation, samples, beta);
    meanScoreValue = meanScore([crps, is, es]);
  } catch (e) {
    return fail(`proper-score kernel threw: ${errMsg(e)}`);
  }
  const c = checkNonNegative(crps, "Gaussian CRPS");
  if (!c.ok) return c;
  const i = checkNonNegative(is, "interval score");
  if (!i.ok) return i;
  const e = checkNonNegative(es, "beta energy score");
  if (!e.ok) return e;
  const m = checkNonNegative(meanScoreValue, "mean score");
  if (!m.ok) return m;
  return {
    ok: true,
    data: {
      gate: "ungated",
      crpsGaussian: c.data,
      intervalScore: i.data,
      betaEnergyScore: e.data,
      meanScore: m.data,
    },
  };
}

export interface SeasonIntervalResult {
  readonly gate: RootGate;
  /** 0.5 quantile of the simulated season-total distribution. A QUANTILE, not a probability. */
  readonly medianSimulatedTotal: number;
  /** The lower interval endpoint. An interval bound, not a probability. */
  readonly lower: number;
  /** The upper interval endpoint. An interval bound, not a probability. */
  readonly upper: number;
  readonly level: number;
  readonly nPaths: number;
  readonly gamesLeft: number;
  readonly seed: number;
  /** The adapted nominal level after one PID update, in [0.5, 0.99]. A COVERAGE LEVEL. */
  readonly adaptedLevel: number;
}

/** Simulation-augmented conformal season-total interval + PID level adaptation (2606-16356v1). */
export function evalSeasonTotalInterval(
  residuals: readonly number[],
  pointForecast: number,
  blockSize: number,
  nPaths: number,
  gamesLeft: number,
  level: number,
  lastIntervalMissed: boolean,
  seed: number,
): RootEval<SeasonIntervalResult> {
  if (residuals.length < ROOT_MIN_RESIDUAL_SAMPLE) {
    return fail(
      `blockBootstrapPaths: need >= ${ROOT_MIN_RESIDUAL_SAMPLE} residuals, got ${residuals.length}`,
    );
  }
  if (!Number.isInteger(blockSize) || blockSize < 1) {
    return fail(`blockBootstrapPaths: blockSize must be a positive integer, got ${blockSize}`);
  }
  if (residuals.length < blockSize) {
    return fail(
      `blockBootstrapPaths: residuals (${residuals.length}) shorter than block size (${blockSize})`,
    );
  }
  if (!Number.isInteger(nPaths) || nPaths < 10) {
    return fail(`blockBootstrapPaths: need >= 10 paths, got ${nPaths}`);
  }
  if (!Number.isInteger(gamesLeft) || gamesLeft < 1) {
    return fail(`blockBootstrapPaths: gamesLeft must be a positive integer, got ${gamesLeft}`);
  }
  if (!isFiniteNumber(pointForecast)) return fail("saMscpInterval: pointForecast must be finite");
  if (!isFiniteNumber(level) || level <= 0 || level >= 1) {
    return fail(`saMscpInterval: level must be in (0,1), got ${level}`);
  }
  if (!isFiniteNumber(seed)) return fail("saMscpInterval: seed must be finite");
  const rv = isFiniteArray(residuals, "blockBootstrapPaths residuals");
  if (!rv.ok) return rv;
  let paths: number[][];
  let interval: { lower: number; upper: number };
  let med: number;
  let adapted: number;
  try {
    paths = blockBootstrapPaths(residuals, blockSize, nPaths, gamesLeft, rootLcg(seed));
    interval = saMscpInterval(pointForecast, paths, level);
    med = mscpQuantile(
      paths.map((p) => pointForecast + p.reduce((a, b) => a + b, 0)),
      0.5,
    );
    adapted = conformalPidUpdate(level, lastIntervalMissed);
  } catch (e) {
    return fail(`SA-MSCP kernel threw: ${errMsg(e)}`);
  }
  if (paths.length !== nPaths) {
    return fail(`blockBootstrapPaths returned ${paths.length} paths, expected ${nPaths}`);
  }
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!p) return fail(`blockBootstrapPaths path ${i} is missing`);
    if (p.length !== gamesLeft) {
      return fail(`blockBootstrapPaths path ${i} has ${p.length} steps, expected ${gamesLeft}`);
    }
    const v = isFiniteArray(p, `blockBootstrapPaths path ${i}`);
    if (!v.ok) return v;
  }
  const lo = checkFinite(interval.lower, "SA-MSCP lower bound");
  if (!lo.ok) return lo;
  const hi = checkFinite(interval.upper, "SA-MSCP upper bound");
  if (!hi.ok) return hi;
  if (lo.data > hi.data) {
    return fail(`saMscpInterval produced an inverted interval [${lo.data}, ${hi.data}]`);
  }
  const m = checkFinite(med, "median simulated total");
  if (!m.ok) return m;
  const a = checkBounded(adapted, 0.5, 0.99, "conformal PID level");
  if (!a.ok) return a;
  return {
    ok: true,
    data: {
      gate: "ungated",
      medianSimulatedTotal: m.data,
      lower: lo.data,
      upper: hi.data,
      level,
      nPaths,
      gamesLeft,
      seed,
      adaptedLevel: a.data,
    },
  };
}

export interface GrapmResult {
  readonly gate: RootGate;
  /** Shrunk group rating in EPA per play. A RATE, not a probability. */
  readonly ratingEpaPerPlay: number;
  /** Raw (unshrunk) group mean EPA per play. A RATE. */
  readonly rawEpaPerPlay: number;
  /** Member-rating prior the raw mean is shrunk toward. A RATE. */
  readonly priorEpaPerPlay: number;
  /** Weight placed on the raw estimate, n / (n + k). A SHRINKAGE weight in [0,1]. */
  readonly rawWeight: number;
  readonly nPlays: number;
  readonly priorStrengthPlays: number;
  /** Out-of-sample RMSE of the shrunk rating. An ERROR METRIC in EPA units. */
  readonly holdoutRmse: number;
  readonly nHoldout: number;
}

/** Empirical-Bayes group EPA rating with its held-out error metric (2601-15000v1). */
export function evalGrapmRating(
  groupEpa: readonly number[],
  memberRatings: readonly number[],
  priorStrength: number,
  holdoutActual: readonly number[],
  baselinePredictions?: readonly number[],
): RootEval<GrapmResult> {
  if (groupEpa.length < ROOT_MIN_SAMPLE) {
    return fail(`grapm: need >= ${ROOT_MIN_SAMPLE} plays in the group, got ${groupEpa.length}`);
  }
  if (memberRatings.length === 0) return fail("memberPrior: no member ratings supplied");
  if (!isFiniteNumber(priorStrength) || priorStrength < 0) {
    return fail(`shrinkEstimate: priorStrength must be >= 0, got ${priorStrength}`);
  }
  if (holdoutActual.length < ROOT_MIN_SAMPLE) {
    return fail(
      `grapm: need >= ${ROOT_MIN_SAMPLE} holdout observations to state a fit quality, got ${holdoutActual.length}`,
    );
  }
  if (groupEpa.length + priorStrength <= 0) {
    return fail("shrinkEstimate: n + k must be > 0");
  }
  const g = isFiniteArray(groupEpa, "grapm group epa");
  if (!g.ok) return g;
  const m = isFiniteArray(memberRatings, "grapm member ratings");
  if (!m.ok) return m;
  const h = isFiniteArray(holdoutActual, "grapm holdout actuals");
  if (!h.ok) return h;
  let rating: number;
  let raw: number;
  let prior: number;
  try {
    rating = grapm([...groupEpa], [...memberRatings], priorStrength);
    raw = groupEpaPerPlay([...groupEpa]);
    prior = memberPrior([...memberRatings]);
  } catch (e) {
    return fail(`G-RAPM kernel threw: ${errMsg(e)}`);
  }
  const r = checkFinite(rating, "G-RAPM rating");
  if (!r.ok) return r;
  const rr = checkFinite(raw, "raw group EPA per play");
  if (!rr.ok) return rr;
  const pr = checkFinite(prior, "member prior");
  if (!pr.ok) return pr;
  const w = checkBounded(groupEpa.length / (groupEpa.length + priorStrength), 0, 1, "raw weight");
  if (!w.ok) return w;
  let holdoutRmse: number;
  try {
    holdoutRmse = researchRmse(holdoutActual.map(() => rating), holdoutActual);
  } catch (e) {
    return fail(`rmse threw: ${errMsg(e)}`);
  }
  const hr = checkNonNegative(holdoutRmse, "holdout RMSE");
  if (!hr.ok) return hr;
  let relImprove: number | null = null;
  if (baselinePredictions !== undefined) {
    if (baselinePredictions.length !== holdoutActual.length) {
      return fail(
        `rmse: baseline predictions (${baselinePredictions.length}) misaligned with holdout (${holdoutActual.length})`,
      );
    }
    const b = isFiniteArray(baselinePredictions, "G-RAPM baseline predictions");
    if (!b.ok) return b;
    let baseRmse: number;
    let candRmse: number;
    try {
      baseRmse = researchRmse(baselinePredictions, holdoutActual);
      candRmse = researchRmse(holdoutActual.map(() => rating), holdoutActual);
    } catch (e) {
      return fail(`rmse threw on the baseline: ${errMsg(e)}`);
    }
    if (baseRmse <= 0) {
      return fail(`relImprovement: baseline RMSE must be > 0, got ${baseRmse}`);
    }
    const imp = checkFinite(
      relImprovement(baseRmse, candRmse),
      "relative RMSE improvement",
    );
    if (!imp.ok) return imp;
    relImprove = imp.data;
  }
  void relImprove;
  return {
    ok: true,
    data: {
      gate: "ungated",
      ratingEpaPerPlay: r.data,
      rawEpaPerPlay: rr.data,
      priorEpaPerPlay: pr.data,
      rawWeight: w.data,
      nPlays: groupEpa.length,
      priorStrengthPlays: priorStrength,
      holdoutRmse: hr.data,
      nHoldout: holdoutActual.length,
    },
  };
}

export interface SituationProfileResult {
  readonly gate: RootGate;
  /** James-Stein-shrunk situation means. MEANS of an outcome, not probabilities. */
  readonly shrunkMeans: readonly number[];
  /** In-sample Brier of a binary forecast scored on these means. An ERROR METRIC in [0,1]. */
  readonly brier: number;
  /** Brier of the unshrunk MLE means, for the comparison the paper's gate asks for. */
  readonly rawMleBrier: number;
  /** True when the shrinkage beat the raw MLE on this sample. A BOOLEAN, not a probability. */
  readonly shrinkageBeatsRaw: boolean;
  /** Chosen action under the shrunk profile. A DECISION LABEL. */
  readonly chosenAction: string;
  readonly chosenActionEv: number;
  readonly nSituations: number;
  readonly nGames: number;
}

/** James-Stein-shrunk situation profiles with a stated Brier comparison (2604-13861v2). */
export function evalSituationProfile(
  situationMeans: readonly number[],
  situationSes: readonly number[],
  situationOutcomes: readonly (0 | 1)[],
  actionEvs: ReadonlyMap<string, number>,
): RootEval<SituationProfileResult> {
  if (situationMeans.length !== situationSes.length) {
    return fail(
      `jamesSteinShrink: ${situationMeans.length} means vs ${situationSes.length} standard errors`,
    );
  }
  if (situationMeans.length < 3) {
    return fail(`jamesSteinShrink: need >= 3 situations, got ${situationMeans.length}`);
  }
  if (situationMeans.length !== situationOutcomes.length) {
    return fail(
      `brierScore: ${situationMeans.length} means vs ${situationOutcomes.length} outcomes`,
    );
  }
  if (situationOutcomes.length < ROOT_MIN_SAMPLE) {
    return fail(`brierScore: need >= ${ROOT_MIN_SAMPLE} games, got ${situationOutcomes.length}`);
  }
  const mv = isFiniteArray(situationMeans, "jamesSteinShrink means");
  if (!mv.ok) return mv;
  const sv = isFiniteArray(situationSes, "jamesSteinShrink standard errors");
  if (!sv.ok) return sv;
  for (let i = 0; i < situationSes.length; i++) {
    const s = checkNonNegative(situationSes[i], `standard error ${i}`);
    if (!s.ok) return s;
  }
  for (let i = 0; i < situationOutcomes.length; i++) {
    const y = situationOutcomes[i];
    if (y !== 0 && y !== 1) return fail(`brierScore: outcome ${i} = ${String(y)} is not 0 or 1`);
  }
  if (actionEvs.size === 0) return fail("decisionEV: no actions supplied");
  for (const [name, v] of actionEvs) {
    const c = checkFinite(v, `decisionEV value for "${name}"`);
    if (!c.ok) return c;
  }
  let shrunk: number[];
  let choice: { action: string; ev: number };
  try {
    shrunk = researchJamesSteinShrink([...situationMeans], [...situationSes]);
    choice = decisionEV(actionEvs);
  } catch (e) {
    return fail(`situation-profile kernel threw: ${errMsg(e)}`);
  }
  if (shrunk.length !== situationMeans.length) {
    return fail(`jamesSteinShrink returned ${shrunk.length} values for ${situationMeans.length} inputs`);
  }
  for (let i = 0; i < shrunk.length; i++) {
    const s = checkFinite(shrunk[i], `jamesSteinShrink output ${i}`);
    if (!s.ok) return s;
  }
  const shrunkBrier = brierScore(shrunk, situationOutcomes);
  const rawBrier = brierScore(situationMeans, situationOutcomes);
  const sb = checkBounded(shrunkBrier, 0, 1, "shrunk in-sample Brier");
  if (!sb.ok) return sb;
  const rb = checkBounded(rawBrier, 0, 1, "raw MLE in-sample Brier");
  if (!rb.ok) return rb;
  const ev = checkFinite(choice.ev, "chosen action EV");
  if (!ev.ok) return ev;
  if (choice.action === "") return fail("decisionEV: returned an empty action label");
  return {
    ok: true,
    data: {
      gate: "ungated",
      shrunkMeans: shrunk,
      brier: sb.data,
      rawMleBrier: rb.data,
      shrinkageBeatsRaw: sb.data < rb.data,
      chosenAction: choice.action,
      chosenActionEv: ev.data,
      nSituations: situationMeans.length,
      nGames: situationOutcomes.length,
    },
  };
}

export interface AuditAgreementResult {
  readonly gate: RootGate;
  /** Fraction of decisions where engine and benchmark agree. An AGREEMENT RATE in [0,1]. */
  readonly agreement: number;
  readonly nDecisions: number;
}

/** Engine-vs-benchmark decision agreement audit (2604-13861v2). */
export function evalAuditAgreement(
  engine: readonly string[],
  benchmark: readonly string[],
): RootEval<AuditAgreementResult> {
  if (engine.length !== benchmark.length) {
    return fail(`auditAgreement: length mismatch (${engine.length} vs ${benchmark.length})`);
  }
  if (engine.length < ROOT_MIN_SAMPLE) {
    return fail(`auditAgreement: need >= ${ROOT_MIN_SAMPLE} decisions, got ${engine.length}`);
  }
  for (let i = 0; i < engine.length; i++) {
    if ((engine[i] ?? "").trim() === "") return fail(`auditAgreement: empty engine label at ${i}`);
    if ((benchmark[i] ?? "").trim() === "") {
      return fail(`auditAgreement: empty benchmark label at ${i}`);
    }
  }
  let a: number;
  try {
    a = auditAgreement(engine, benchmark);
  } catch (e) {
    return fail(`auditAgreement threw: ${errMsg(e)}`);
  }
  const v = checkBounded(a, 0, 1, "audit agreement");
  if (!v.ok) return v;
  return { ok: true, data: { gate: "ungated", agreement: v.data, nDecisions: engine.length } };
}

/* ═══════════ 8. LINE DYNAMICS AND SYMBOLIC-REGRESSION JUDGING ═══════════ */

export interface LineDynamicsResult {
  readonly gate: RootGate;
  /** OU mean-reversion rate per unit time. A RATE, >= 0; not a probability. */
  readonly meanReversionRate: number;
  /** R^2 of the AR(1) discretisation. A FIT-QUALITY METRIC in [0,1]; not a probability. */
  readonly rSquared: number;
  /** Indices where |line_t - line_{t-lag}| clears the stale threshold. */
  readonly staleWindowIndices: readonly number[];
  readonly nPathPoints: number;
  readonly lag: number;
  readonly staleThreshold: number;
  readonly nStaleWindows: number;
}

/** OU efficiency clock plus the stale-line window detector (2503-16470). */
export function evalLineDynamics(
  path: readonly number[],
  lag: number,
  staleThreshold: number,
  dt = 1,
): RootEval<LineDynamicsResult> {
  if (path.length < ROOT_MIN_SAMPLE) {
    return fail(`fitOuClock: need >= ${ROOT_MIN_SAMPLE} path points (>= 3 required), got ${path.length}`);
  }
  if (!Number.isInteger(lag) || lag < 1) {
    return fail(`staleLineWindows: lag must be an integer >= 1, got ${lag}`);
  }
  if (lag >= path.length) {
    return fail(`staleLineWindows: lag ${lag} is not shorter than the path (${path.length})`);
  }
  if (!isFiniteNumber(staleThreshold) || staleThreshold <= 0) {
    return fail(`staleLineWindows: threshold must be > 0, got ${staleThreshold}`);
  }
  if (!isFiniteNumber(dt) || dt <= 0) return fail(`fitOuClock: dt must be > 0, got ${dt}`);
  const pv = isFiniteArray(path, "fitOuClock path");
  if (!pv.ok) return pv;
  let fit: { rInf: number; rSquared: number };
  let windows: number[];
  try {
    fit = fitOuClock([...path], dt);
    windows = staleLineWindows([...path], lag, staleThreshold);
  } catch (e) {
    return fail(`line-dynamics kernel threw: ${errMsg(e)}`);
  }
  const r = checkNonNegative(fit.rInf, "OU mean reversion rate");
  if (!r.ok) return r;
  const r2 = checkBounded(fit.rSquared, 0, 1, "OU fit R^2");
  if (!r2.ok) return r2;
  for (let i = 0; i < windows.length; i++) {
    const idx = windows[i];
    if (!Number.isInteger(idx) || idx < lag || idx >= path.length) {
      return fail(`staleLineWindows returned an out-of-range index ${String(idx)}`);
    }
  }
  return {
    ok: true,
    data: {
      gate: "ungated",
      meanReversionRate: r.data,
      rSquared: r2.data,
      staleWindowIndices: windows,
      nPathPoints: path.length,
      lag,
      staleThreshold,
      nStaleWindows: windows.length,
    },
  };
}

export interface JudgeScoresRow {
  readonly boundConsistency: number;
  readonly footballRealism: number;
  readonly simplicity: number;
}

export interface SrJudgeResult {
  readonly gate: RootGate;
  /** Weighted judge score in [0,1]. A QUALITY SCORE, not a probability. */
  readonly judgeScore: number;
  /** fitLoss - lambda * judgeScore. A LOSS, an error metric that can be negative. */
  readonly judgeAugmentedLoss: number;
  /** Whether the equation clears the module's 0.8 domain-validity bar. A BOOLEAN. */
  readonly domainValid: boolean;
  readonly fitLoss: number;
  readonly lambda: number;
}

/** LLM-judge term for symbolic-regression equations (2509-03036). */
export function evalSymbolicJudge(
  scores: JudgeScoresRow,
  fitLoss: number,
  lambda: number,
): RootEval<SrJudgeResult> {
  const s = checkBounded(scores.boundConsistency, 0, 1, "boundConsistency");
  if (!s.ok) return s;
  const f = checkBounded(scores.footballRealism, 0, 1, "footballRealism");
  if (!f.ok) return f;
  const p = checkBounded(scores.simplicity, 0, 1, "simplicity");
  if (!p.ok) return p;
  if (!isFiniteNumber(fitLoss)) return fail("judgeAugmentedLoss: fitLoss must be finite");
  if (!isFiniteNumber(lambda) || lambda < 0) {
    return fail(`judgeAugmentedLoss: lambda must be >= 0, got ${lambda}`);
  }
  let js: number;
  let loss: number;
  let valid: boolean;
  try {
    js = judgeScore({
      boundConsistency: s.data,
      footballRealism: f.data,
      simplicity: p.data,
    });
    loss = judgeAugmentedLoss(fitLoss, {
      boundConsistency: s.data,
      footballRealism: f.data,
      simplicity: p.data,
    }, lambda);
    valid = isDomainValid({
      boundConsistency: s.data,
      footballRealism: f.data,
      simplicity: p.data,
    });
  } catch (e) {
    return fail(`symbolic-judge kernel threw: ${errMsg(e)}`);
  }
  const j = checkBounded(js, 0, 1, "judge score");
  if (!j.ok) return j;
  const l = checkFinite(loss, "judge-augmented loss");
  if (!l.ok) return l;
  return {
    ok: true,
    data: {
      gate: "ungated",
      judgeScore: j.data,
      judgeAugmentedLoss: l.data,
      domainValid: valid,
      fitLoss,
      lambda,
    },
  };
}
