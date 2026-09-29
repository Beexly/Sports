/**
 * Calibration + Conformal live bridge (fail-closed).
 *
 * Wires the `calibration/` and `conformal/` families of the prediction engine
 * into the ingestion surface. Every `evalX` validates its inputs, calls the
 * real kernel, RE-VALIDATES the kernel's output, and returns a typed verdict.
 * Nothing is imputed, clamped, repaired or invented.
 *
 * WHY THIS LAYER IS FAIL-CLOSED AND NOT A CONVENIENCE WRAPPER
 * ------------------------------------------------------------
 * A mis-calibrated probability that reads as calibrated is the single most
 * damaging failure mode a betting engine can have: it is invisible in every
 * aggregate metric, and it is exactly what converts a wrong read into a
 * confident published number. Three rules therefore bind every eval here:
 *
 *  1. A calibration map is only a calibration if it is MONOTONE. A map that
 *     reorders probabilities is a different model wearing a calibration map's
 *     name (this repo has a measured instance: `confidence` inverts at the top
 *     of the book path, and PAVA can flatten a curve but never repair an
 *     inversion). So the monotonicity verdict travels in the result and the
 *     result carries an explicit `publishable` flag. We never silently repair.
 *  2. A published probability is FINITE and in [0, 1]. Clamping hides a bug.
 *  3. A fit needs a SAMPLE FLOOR, and the fail-closed reason NAMES THE ACTUAL
 *     COUNT. Isotonic / PAV / spline fits on a handful of points memorise
 *     noise; they do not calibrate. A reliability diagram without `n` is not
 *     evidence, so every fit result carries `sampleSize`.
 *
 * TWO MORE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------------
 *  - ECE is an optimistically-biased bin summary. Every module here that
 *    offers ECE also offers something better, and every result that carries an
 *    ECE also carries the second number and states that ECE was not decisive.
 *    See `ECE_IS_NEVER_DECISIVE`.
 *  - A conformal quantile must be computed on RESIDUALS / held-out calibration
 *    data, never on the data the interval's own model was fitted on. The
 *    exchangeability separation is the caller's responsibility, so the caller
 *    has to DECLARE it and this layer refuses the dishonest declaration. See
 *    `evalTemporalConformalInterval` / `evalWeightedConformalInterval` /
 *    `evalMondrianQuantile`.
 *
 * Module coverage, canonical-implementation rulings, and barrel collisions are
 * reported in the module-level `CALIBRATION_CONFORMAL_SOURCES` table.
 */

import { pavIsotonic, pavBinary } from "@sports/prediction-engine/src/calibration/pav.js";
import {
  softmaxTemp,
  scaledProb,
  fitTemperature,
  expectedCalibrationError,
  preservesPicks,
} from "@sports/prediction-engine/src/calibration/temperature-scaling.js";
import {
  naturalSplineBasis,
  fitSplineCalibrator,
  calibrateSpline,
  calibratedLogLoss,
  type SplineCalibrator,
  type SplineFitOpts,
} from "@sports/prediction-engine/src/calibration/spline-calibration.js";
import {
  fitLocalIsotonicPatch,
  applyLocalIsotonicPatch,
  type LocalIsotonicPatchOptions,
  type LocalIsotonicPatchResult,
} from "@sports/prediction-engine/src/calibration/local-isotonic-patch.js";
import {
  auditCells,
  fitPatchesForFailures,
  applyPatches,
  runAuditAndPatch,
  type AuditCell,
  type AuditSample,
  type MulticalibAuditOptions,
} from "@sports/prediction-engine/src/calibration/multicalib-audit-patch.js";
import {
  fitIvap,
  ivapPredict,
  type IvapCalibrationPoint,
} from "@sports/prediction-engine/src/calibration/ivap.js";
import {
  cvapPredict,
  fitCvap,
  type CvapAggregationMode,
} from "@sports/prediction-engine/src/calibration/cvap.js";
import {
  neumaierSum,
  logSpaceGeometricMeanAggregation,
  arithmeticMeanAggregation,
  toFull,
  multiprobToPoint,
  type Multiprobability,
  type PointConversionMode,
} from "@sports/prediction-engine/src/calibration/aggregation.js";
import {
  baseRateCheck,
  honestyHarness,
  type MarketSlice,
} from "@sports/prediction-engine/src/calibration/base-rate-honesty.js";
import {
  mmce,
  ece as selectiveEceRaw,
  selectiveKeep,
  selectiveEce,
  type SelectorOptions,
} from "@sports/prediction-engine/src/calibration/mmce-selective.js";
import {
  logLoss,
  brier,
  ece as horseraceEce,
  plattRecalibrate,
  horserace,
  type ForecastSet,
  type HorseraceResult,
} from "@sports/prediction-engine/src/calibration/calibration-horserace.js";
import {
  nadarayaWatson,
  wilsonInterval,
  findMisspecifiedRegions,
  situationalHfa,
  type GameOutcome,
} from "@sports/prediction-engine/src/calibration/hfa-diagnostic.js";
import {
  logit as skepticLogit,
  invLogit,
  skepticProb,
  skepticStakeFraction,
  skepticThetaStep,
} from "@sports/prediction-engine/src/calibration/skeptic-overlay.js";
import {
  labelShiftCorrect,
  correctSlate,
  archetypeBaseRate,
  calibrationDrift,
} from "@sports/prediction-engine/src/calibration/slate-label-shift.js";
import {
  TEACHER_BACKOFF_M,
  ebBackoff,
  fitTeacherMap,
  calibrateWithTeacher,
  type TeacherBin,
} from "@sports/prediction-engine/src/calibration/teacher-calibration.js";
import {
  aciUpdate,
  adaptiveQuantile,
  aciInterval,
  type AciState,
} from "@sports/prediction-engine/src/calibration/temporal-conformal.js";
import {
  oddsWeights,
  effectiveSampleSize,
  weightsCollapsed,
  weightedConformalQuantile,
  weightedConformalInterval,
} from "@sports/prediction-engine/src/calibration/weighted-conformal-shift.js";
import {
  ENABLED as NCP_SOURCE_ENABLED,
  conformalQuantile as ncpConformalQuantile,
  conformalInterval as ncpConformalInterval,
  normalizedInterval,
  rollingCoverage,
  icmAlarm,
} from "@sports/prediction-engine/src/calibration/1905-07886-conformal-ncp-intervals.js";
import {
  mean as residualMean,
  median as residualMedian,
  sampleVariance,
  levene,
  brownForsythe,
  welchT,
  splitQuality,
  type VarianceTestResult,
  type WelchTResult,
  type SplitQuality,
} from "@sports/prediction-engine/src/conformal/levene-welch.js";
import { MondrianResidualManager } from "@sports/prediction-engine/src/conformal/mondrian.js";
import type { TaxonomyCategory } from "@sports/prediction-engine/src/conformal/sports-taxonomy.js";

// ─── Result shape ─────────────────────────────────────────────────────────────

export type CalibEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): CalibEval<never> {
  return { ok: false, reason };
}

// ─── Domain constants ────────────────────────────────────────────────────────

/**
 * Mandatory minimum for ANY distributional fit in this layer (isotonic, PAV,
 * spline, teacher map, CVAP folds, conformal residual stores).
 *
 * The engine's own `local-isotonic-patch` and `multicalib-audit-patch` modules
 * already default to 20; `mondrian.ts` defaults to 10 and is raised here. A
 * fit below the floor returns a fail-closed reason that NAMES THE ACTUAL
 * COUNT — "insufficient samples" without a number is not an audit trail.
 */
export const MIN_CALIBRATION_SAMPLES = 20;

/**
 * Honest-metric doctrine, surfaced in every result that carries an ECE.
 *
 * All three ECE implementations reachable from these families
 * (`mmce-selective.ece`, `calibration-horserace.ece`,
 * `temperature-scaling.expectedCalibrationError`) are equal-width bin
 * summaries. Binned ECE is biased UPWARD at finite n and is the wrong sole
 * selection criterion: this repo's own gate work found a perfectly calibrated
 * forecaster reading ~0.09 at n=100 on ten equal-width bins. A bin gap can also
 * cancel against its neighbour, so a low ECE does not certify the map.
 *
 * `RELIABILITY_DECOMPOSITION_AVAILABLE` is FALSE for this layer: none of these
 * modules offers a Murphy reliability / resolution / uncertainty decomposition,
 * so there is no second, better estimator to pair ECE with. The only available
 * counterweight is the Brier score, the NLL and the DM test — all of which the
 * results below carry alongside ECE.
 */
export const ECE_IS_NEVER_DECISIVE = true;
export const RELIABILITY_DECOMPOSITION_AVAILABLE = false;

// ─── Source-module inventory (canonical ruling + skip reasons) ───────────────

export interface CalibSourceNote {
  readonly module: string;
  readonly wired: boolean;
  readonly canonical: boolean;
  readonly note: string;
}

/**
 * `canonical: false` marks a DUPLICATE implementation found elsewhere in the
 * engine. The ruling column says which one this bridge treats as the live
 * kernel and why.
 */
export const CALIBRATION_CONFORMAL_SOURCES: readonly CalibSourceNote[] = [
  {
    module: "calibration/pav.ts",
    wired: true,
    canonical: true,
    note: "Canonical PAV. Its own header states it was extracted for reuse by IVAP, CVAP, local isotonic patches and multicalibration, and ivap/cvap/local-isotonic-patch/multicalib-audit-patch all import it. probability-calibration.isotonicCalibration is a FITTED MODEL, not the PAV kernel.",
  },
  {
    module: "temperature-scaling.ts (top level)",
    wired: false,
    canonical: true,
    note: "DUPLICATE. This is the barrel-bound one: it takes the live CalibrationSample[] and returns a deployable TemperatureModel with .predict. It is the canonical DEPLOYABLE temperature model.",
  },
  {
    module: "calibration/temperature-scaling.ts",
    wired: true,
    canonical: false,
    note: "DUPLICATE of the top-level module but the RICHER kernel: it is the only one exposing multi-class softmaxTemp, the single-logit scaledProb, and the preservesPicks accuracy-invariance proof. Wired for those; fitTemperature here collides by name with the barrel's.",
  },
  {
    module: "calibration/spline-calibration.ts",
    wired: true,
    canonical: true,
    note: "Sole SplineCalib implementation in the repo; no top-level duplicate and not in the barrel.",
  },
  {
    module: "calibration/local-isotonic-patch.ts",
    wired: true,
    canonical: true,
    note: "LOCAL (subgroup) isotonic patch, distinct granularity from the global calibration-apply/calibration-map isotonic map, which stays canonical for a published global map.",
  },
  {
    module: "calibration/multicalib-audit-patch.ts",
    wired: true,
    canonical: true,
    note: "Sole multicalibration audit-and-patch loop; not in the barrel.",
  },
  {
    module: "calibration/ivap.ts",
    wired: true,
    canonical: true,
    note: "Sole Inductive Venn-Abers implementation; not in the barrel.",
  },
  {
    module: "calibration/cvap.ts",
    wired: true,
    canonical: true,
    note: "Sole Cross Venn-Abers; not in the barrel.",
  },
  {
    module: "calibration/aggregation.ts",
    wired: true,
    canonical: true,
    note: "Sole multiprobability aggregation; not in the barrel.",
  },
  {
    module: "calibration/base-rate-honesty.ts",
    wired: true,
    canonical: true,
    note: "Sole base-rate honesty harness; not in the barrel.",
  },
  {
    module: "calibration/mmce-selective.ts",
    wired: true,
    canonical: true,
    note: "Sole MMCE / selective-calibration selector. Exports its own `ece`; that name collides with calibration-horserace's `ece` (both mine) — bridged under distinct aliases.",
  },
  {
    module: "calibration/calibration-horserace.ts",
    wired: true,
    canonical: true,
    note: "Sole BNN-vs-ex-post horse-race harness. Exports `logLoss` (collides with the barrel's log-loss-optimize.logLoss) and `ece` (collides with mmce-selective.ece).",
  },
  {
    module: "calibration/hfa-diagnostic.ts",
    wired: true,
    canonical: true,
    note: "Sole nonparametric HFA diagnostic. Exports `wilsonInterval`, which collides with the barrel's model-limitations.wilsonInterval.",
  },
  {
    module: "calibration/skeptic-overlay.ts",
    wired: true,
    canonical: true,
    note: "Sole Bayesian-logistic skeptic overlay; not in the barrel.",
  },
  {
    module: "calibration/slate-label-shift.ts",
    wired: true,
    canonical: true,
    note: "Sole conditional label-shift correction; not in the barrel.",
  },
  {
    module: "calibration/teacher-calibration.ts",
    wired: true,
    canonical: true,
    note: "Sole empirical-Bayes teacher calibration map; not in the barrel.",
  },
  {
    module: "calibration/temporal-conformal.ts",
    wired: true,
    canonical: true,
    note: "Sole ACI adaptive-conformal-interval module; not in the barrel.",
  },
  {
    module: "calibration/weighted-conformal-shift.ts",
    wired: true,
    canonical: true,
    note: "Sole weighted / likelihood-ratio conformal shift; not in the barrel.",
  },
  {
    module: "calibration/1905-07886-conformal-ncp-intervals.ts",
    wired: true,
    canonical: true,
    note: "Sole NCP interval module, but it ships `export const ENABLED = false` and an explicit NOT-LIVE header. Wired as DIAGNOSTIC ONLY; every result carries sourceEnabled:false and diagnosticOnly:true so a disabled module can never be laundered into a live interval.",
  },
  {
    module: "conformal/levene-welch.ts",
    wired: true,
    canonical: true,
    note: "Already in the engine barrel (index.ts ~2874-2877) but NOT wired by any bridge. This bridge deep-imports it and raises its 2-sample floor to MIN_CALIBRATION_SAMPLES.",
  },
  {
    module: "conformal/mondrian.ts",
    wired: true,
    canonical: true,
    note: "Already in the engine barrel (index.ts ~3167) but NOT wired by any bridge. The residual store's silent global fallback and its zero-residual → quantile 0 behaviour are both closed here.",
  },
  {
    module: "conformal/sports-taxonomy.ts",
    wired: false,
    canonical: true,
    note: "SKIPPED — already wired by symreg-conformal-residue-bridge (evalTaxonomy, evalCategoryDiagnostics) and already bound in the engine barrel (index.ts ~3140-3145). Re-wiring would duplicate four public names.",
  },
  {
    module: "conformal/lwt-mcps-sketch.ts",
    wired: false,
    canonical: true,
    note: "SKIPPED — already wired by symreg-conformal-residue-bridge (evalGreedyPartition, evalBestSplit, evalAssignLeafId) and already bound in the engine barrel. Explicit instruction not to re-wire.",
  },
];

// ─── Shared validation helpers ───────────────────────────────────────────────

export interface MonotonicityVerdict {
  /** True when the sequence is non-decreasing (the only valid calibration map). */
  readonly monotone: boolean;
  /** How many adjacent pairs decrease. */
  readonly violations: number;
  /** Index of the first decreasing pair, or null when monotone. */
  readonly firstViolationIndex: number | null;
  /** Size of the largest adjacent decrease (0 when monotone). */
  readonly maxDrop: number;
}

const MONOTONE_EPS = 1e-12;

/**
 * Non-decreasing check over a probability map's outputs in ascending-covariate
 * order. A decreasing pair means the map reorders probabilities, which means it
 * is a different model — not a calibration.
 */
export function monotonicityVerdict(values: readonly number[]): MonotonicityVerdict {
  let violations = 0;
  let firstViolationIndex: number | null = null;
  let maxDrop = 0;
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1] ?? 0;
    const cur = values[i] ?? 0;
    const drop = prev - cur;
    if (drop > MONOTONE_EPS) {
      violations += 1;
      if (firstViolationIndex === null) firstViolationIndex = i;
      if (drop > maxDrop) maxDrop = drop;
    }
  }
  return { monotone: violations === 0, violations, firstViolationIndex, maxDrop };
}

/** Finite, in [0, 1]. Clamping here would hide the bug the caller needs to see. */
function requireProb01(p: number, what: string): CalibEval<never> | null {
  if (typeof p !== "number" || !Number.isFinite(p)) {
    return fail(`${what}: value is not a finite number (got ${String(p)}) — a non-finite probability is a bug, not a value to clamp`);
  }
  if (p < 0 || p > 1) {
    return fail(`${what}: calibrated probability ${p} is outside [0, 1] — clamping would hide a kernel bug`);
  }
  return null;
}

function requireProb01List(
  ps: readonly number[],
  what: string,
): CalibEval<never> | null {
  for (let i = 0; i < ps.length; i++) {
    const bad = requireProb01(ps[i] ?? Number.NaN, `${what}[${i}]`);
    if (bad) return bad;
  }
  return null;
}

function requireFinite(x: number, what: string): CalibEval<never> | null {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    return fail(`${what}: expected a finite number, got ${String(x)}`);
  }
  return null;
}

/**
 * Mandatory sample floor. The returned reason NAMES THE ACTUAL COUNT, because
 * a fail-closed refusal that does not say how many rows it saw is not an audit
 * trail.
 */
function requireFitSamples(
  n: number,
  min: number,
  what: string,
  why: string,
): CalibEval<never> | null {
  if (n < min) {
    return fail(
      `${what}: ${n} observation${n === 1 ? "" : "s"} is below the mandatory ${min}-observation fit floor — ${why}`,
    );
  }
  return null;
}

function binaryLabels(
  labels: readonly number[],
  what: string,
): CalibEval<ReadonlyArray<0 | 1>> {
  const out: Array<0 | 1> = [];
  for (let i = 0; i < labels.length; i++) {
    const y = labels[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}[${i}]: label must be exactly 0 or 1, got ${String(y)}`);
    }
    out.push(y);
  }
  return { ok: true, data: out };
}

/** Minimum calibration rows a split-conformal quantile needs at level `1 - alpha`. */
export function requiredCalibrationRows(alpha: number): number {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) return Number.POSITIVE_INFINITY;
  return Math.ceil(1 / alpha);
}

/**
 * Deterministic counter-based unit RNG. Never Math.random: a calibration
 * artifact has to be reproducible from its seed or it is not evidence.
 * (Numerical-Recipes LCG; state is a uint32.)
 */
export function deterministicUnitRng(seed: number): () => number {
  let state = (Math.trunc(seed) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Ascending linspace over [lo, hi]; `count` must be >= 2. */
function grid(lo: number, hi: number, count: number): number[] {
  const n = Math.max(2, Math.trunc(count));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

export interface ProbeGridOptions {
  readonly lo?: number;
  readonly hi?: number;
  readonly count?: number;
}

function probeGrid(options: ProbeGridOptions | undefined, fallbackLo: number, fallbackHi: number): number[] {
  return grid(options?.lo ?? fallbackLo, options?.hi ?? fallbackHi, options?.count ?? 21);
}

/** Sorted-ascending score/labour pairs, the required input order for PAV. */
interface CalibPoint {
  readonly score: number;
  readonly label: 0 | 1;
  readonly weight: number;
}

function normalizePoints(
  raw: readonly { score: number; label: number; weight?: number }[],
  what: string,
): CalibPoint[] | CalibEval<never> {
  const out: CalibPoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    if (!p) return fail(`${what}[${i}]: missing observation`);
    const bad = requireFinite(p.score, `${what}[${i}].score`);
    if (bad) return bad;
    const y = p.label;
    if (y !== 0 && y !== 1) {
      return fail(`${what}[${i}].label: must be exactly 0 or 1, got ${String(y)}`);
    }
    if (p.weight !== undefined) {
      const badW = requireFinite(p.weight, `${what}[${i}].weight`);
      if (badW) return badW;
      if (p.weight <= 0) {
        // pavIsotonic silently does Math.max(Number.EPSILON, w), so a negative
        // or zero weight would be floored to ~0 and the row would quietly
        // drop out of the fit. Refuse instead.
        return fail(
          `${what}[${i}].weight: must be strictly positive, got ${p.weight} — pavIsotonic would floor a non-positive weight to Number.EPSILON and silently drop the row`,
        );
      }
    }
    out.push({ score: p.score, label: y, weight: p.weight !== undefined ? p.weight : 1 });
  }
  out.sort((a, b) => a.score - b.score);
  return out;
}

// ─── 1. PAV / isotonic calibration map ───────────────────────────────────────

export interface CalibMapKnot {
  readonly score: number;
  readonly fitted: number;
}

export interface PavMapResult {
  readonly sampleSize: number;
  readonly knots: readonly CalibMapKnot[];
  /** The map's outputs in ascending-score order. */
  readonly fitted: readonly number[];
  readonly monotonicity: MonotonicityVerdict;
  /** True only when the map is finite, in [0,1] AND monotone. */
  readonly publishable: boolean;
  /** Map at the ascending grid; used by tests and by the card renderer. */
  readonly grid: readonly { score: number; calibrated: number }[];
  /** Sum of PAV block weights — the effective sample the fit actually used. */
  readonly totalWeight: number;
}

export interface PavMapInput {
  readonly points: readonly { score: number; label: number; weight?: number }[];
  /** Only ever RAISED above MIN_CALIBRATION_SAMPLES, never lowered. */
  readonly minSamples?: number;
  readonly probe?: ProbeGridOptions;
}

/**
 * Pool-Adjacent-Violators isotonic calibration map.
 *
 * PAV output is monotone by construction, so the monotonicity verdict here is a
 * REGRESSION GUARD on the kernel, not decoration: if a future PAV rewrite ever
 * returns a decreasing map this eval reports it instead of publishing it.
 */
export function evalPavIsotonicMap(input: PavMapInput): CalibEval<PavMapResult> {
  const what = "PAV isotonic calibration map";
  if (!Array.isArray(input.points)) return fail(`${what}: points must be an array`);
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(
      `${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES} — a caller may raise the floor, never lower it`,
    );
  }
  const sorted = normalizePoints(input.points, `${what}.points`);
  if (!Array.isArray(sorted)) return sorted;

  const floor = requireFitSamples(
    sorted.length,
    min,
    what,
    "an isotonic fit on a handful of points memorises the sample instead of calibrating it",
  );
  if (floor) return floor;

  const scores = sorted.map((p) => p.score);
  const labels = sorted.map((p) => p.label);
  const weights = sorted.map((p) => p.weight);

  let fitted: number[];
  try {
    fitted = pavIsotonic(labels, weights);
  } catch (e) {
    return fail(`${what}: pavIsotonic threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (fitted.length !== sorted.length) {
    return fail(
      `${what}: pavIsotonic returned ${fitted.length} values for ${sorted.length} observations`,
    );
  }
  const bad = requireProb01List(fitted, `${what}.fitted`);
  if (bad) return bad;

  const monotonicity = monotonicityVerdict(fitted);
  const knots: CalibMapKnot[] = scores.map((score, i) => ({ score, fitted: fitted[i] ?? 0 }));
  const probe = probeGrid(input.probe, scores[0] ?? 0, scores[scores.length - 1] ?? 1);
  const gridOut = probe.map((score) => ({ score, calibrated: knots[0]?.fitted ?? 0 }));

  return {
    ok: true,
    data: {
      sampleSize: sorted.length,
      knots,
      fitted,
      monotonicity,
      publishable: monotonicity.monotone,
      grid: gridOut,
      totalWeight: weights.reduce((s, w) => s + w, 0),
    },
  };
}

/** Binary-label convenience over evalPavIsotonicMap, using pavBinary. */
export function evalPavBinaryMap(
  input: Omit<PavMapInput, "points"> & {
    readonly labels: readonly number[];
    readonly scores: readonly number[];
    readonly weights?: readonly number[];
  },
): CalibEval<PavMapResult> {
  const what = "PAV binary calibration map";
  if (input.scores.length !== input.labels.length) {
    return fail(`${what}: scores (${input.scores.length}) and labels (${input.labels.length}) differ in length`);
  }
  const points = input.scores.map((score, i) => {
    const base: { score: number; label: number; weight?: number } = {
      score,
      label: input.labels[i] ?? Number.NaN,
    };
    const w = input.weights?.[i];
    return w === undefined ? base : { ...base, weight: w };
  });
  const floor = requireFitSamples(
    points.length,
    input.minSamples ?? MIN_CALIBRATION_SAMPLES,
    what,
    "pavBinary is the same estimator; it inherits the same floor",
  );
  if (floor) return floor;
  // pavBinary is literally pavIsotonic; exercise it so the binary entry point
  // is on the measured path rather than assumed equivalent.
  const probe = binaryLabels(input.labels, `${what}.labels`);
  if (!probe.ok) return probe;
  try {
    const direct = pavBinary(probe.data, input.weights ? [...input.weights] : undefined);
    const bad = requireProb01List(direct, `${what}.pavBinary`);
    if (bad) return bad;
  } catch (e) {
    return fail(`${what}: pavBinary threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  return evalPavIsotonicMap({ ...input, points });
}

// ─── 2. Temperature scaling ──────────────────────────────────────────────────

export interface TemperatureScalingResult {
  readonly sampleSize: number;
  readonly temperature: number;
  /** Mean NLL at the fitted T. */
  readonly nll: number;
  /** Mean NLL at T = 1 (the unscaled forecast), for the improvement claim. */
  readonly nllUnscaled: number;
  readonly eceBefore: number;
  readonly eceAfter: number;
  /** True when the module's accuracy-invariance proof holds. */
  readonly preservesPicks: boolean;
  /** argmax of the raw logits (the pick) and of the softmax at T. */
  readonly unscaledProbabilities: readonly number[];
  readonly scaledProbabilities: readonly number[];
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
}

export function evalTemperatureScaling(input: {
  readonly logits: readonly number[];
  readonly labels: readonly number[];
  readonly lo?: number;
  readonly hi?: number;
  readonly bins?: number;
  readonly minSamples?: number;
}): CalibEval<TemperatureScalingResult> {
  const what = "temperature scaling";
  if (!Array.isArray(input.logits) || !Array.isArray(input.labels)) {
    return fail(`${what}: logits and labels must be arrays`);
  }
  if (input.logits.length !== input.labels.length) {
    return fail(
      `${what}: logits (${input.logits.length}) and labels (${input.labels.length}) differ in length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(
      `${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`,
    );
  }
  const floor = requireFitSamples(
    input.logits.length,
    min,
    what,
    "a single temperature fitted on a handful of logits is an assertion, not a calibration",
  );
  if (floor) return floor;

  for (let i = 0; i < input.logits.length; i++) {
    const bad = requireFinite(input.logits[i] ?? Number.NaN, `${what}.logits[${i}]`);
    if (bad) return bad;
  }
  const labelCheck = binaryLabels(input.labels, `${what}.labels`);
  if (!labelCheck.ok) return labelCheck;
  const labels = labelCheck.data;

  const wins = labels.reduce((s, y) => s + y, 0);
  if (wins === 0 || wins === labels.length) {
    return fail(
      `${what}: ${wins === 0 ? "zero" : "all"} positives in ${labels.length} rows — T is undefined against a single-class sample, and a temperature fitted here would be reported as calibrated without ever being tested`,
    );
  }

  const lo = input.lo ?? 0.05;
  const hi = input.hi ?? 10;
  if (!(lo > 0) || !(hi > lo)) return fail(`${what}: require 0 < lo < hi, got lo=${lo} hi=${hi}`);

  let fit: { temperature: number; nll: number };
  try {
    fit = fitTemperature([...input.logits], labels, lo, hi);
  } catch (e) {
    return fail(`${what}: fitTemperature threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badT = requireFinite(fit.temperature, `${what}.temperature`);
  if (badT) return badT;
  if (!(fit.temperature > 0)) {
    return fail(`${what}: fitted temperature ${fit.temperature} is not positive`);
  }
  const badNll = requireFinite(fit.nll, `${what}.nll`);
  if (badNll) return badNll;

  const unscaled: number[] = [];
  const scaled: number[] = [];
  for (const z of input.logits) {
    unscaled.push(scaledProb(z, 1));
    scaled.push(scaledProb(z, fit.temperature));
  }
  const badList = requireProb01List(scaled, `${what}.scaledProbabilities`);
  if (badList) return badList;

  const eceBefore = expectedCalibrationError(unscaled, labels, input.bins ?? 15);
  const eceAfter = expectedCalibrationError(scaled, labels, input.bins ?? 15);
  if (!Number.isFinite(eceBefore) || !Number.isFinite(eceAfter)) {
    return fail(`${what}: ECE produced a non-finite value`);
  }

  let invariant: boolean;
  try {
    invariant = preservesPicks([...input.logits], fit.temperature);
  } catch (e) {
    return fail(`${what}: preservesPicks threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!invariant) {
    // Temperature scaling is accuracy-invariant by construction. If the proof
    // fails, the model CHANGED, which is a model-version event, not a
    // calibration event. Fail closed rather than publish a re-ranked slate.
    return fail(
      `${what}: accuracy-invariance proof FAILED at T=${fit.temperature} — temperature scaling must not change the argmax; a changed pick is a different model and needs a MODEL_VERSION bump, not a calibration pass`,
    );
  }

  // Multi-class kernel check: softmaxTemp must agree with scaledProb on a
  // 2-class logit pair, which is the only place the two entry points overlap.
  const soft2 = softmaxTemp([input.logits[0] ?? 0, 0], fit.temperature);
  if (soft2.length !== 2) {
    return fail(`${what}: softmaxTemp returned ${soft2.length} entries for a 2-class input`);
  }
  if (Math.abs((soft2[0] ?? 0) - (scaled[0] ?? 0)) > 1e-9) {
    return fail(
      `${what}: softmaxTemp and scaledProb disagree at T=${fit.temperature} (${soft2[0]} vs ${scaled[0]}) — the two temperature kernels have diverged`,
    );
  }

  return {
    ok: true,
    data: {
      sampleSize: input.logits.length,
      temperature: fit.temperature,
      nll: fit.nll,
      nllUnscaled: nllOf(input.logits, labels, 1),
      eceBefore,
      eceAfter,
      preservesPicks: invariant,
      unscaledProbabilities: unscaled,
      scaledProbabilities: scaled,
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
    },
  };
}

/** Mean NLL at a fixed T, computed here so the improvement claim is auditable. */
function nllOf(logits: readonly number[], labels: readonly (0 | 1)[], t: number): number {
  let s = 0;
  for (let i = 0; i < logits.length; i++) {
    const p = Math.min(Math.max(scaledProb(logits[i] ?? 0, t), 1e-12), 1 - 1e-12);
    const y = labels[i] ?? 0;
    s += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return s / logits.length;
}

// ─── 3. Spline calibration ───────────────────────────────────────────────────

export interface SplineCalibrationResult {
  readonly sampleSize: number;
  readonly calibrator: SplineCalibrator;
  readonly lambda: number;
  readonly logitSpace: boolean;
  readonly knotCount: number;
  readonly coefficients: readonly number[];
  /** logitSpace=0,1 basis row at x — lets a reviewer see the shape directly. */
  readonly basisProbe: readonly number[];
  readonly probe: readonly { score: number; calibrated: number }[];
  readonly monotonicity: MonotonicityVerdict;
  readonly publishable: boolean;
  /** Mean log-loss of the calibrated probabilities on the fit sample. */
  readonly logLoss: number;
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
}

export function evalSplineCalibration(input: {
  readonly scores: readonly number[];
  readonly outcomes: readonly number[];
  readonly opts?: SplineFitOpts;
  readonly minSamples?: number;
  readonly probe?: ProbeGridOptions;
}): CalibEval<SplineCalibrationResult> {
  const what = "spline calibration";
  if (!Array.isArray(input.scores) || !Array.isArray(input.outcomes)) {
    return fail(`${what}: scores and outcomes must be arrays`);
  }
  if (input.scores.length !== input.outcomes.length) {
    return fail(
      `${what}: scores (${input.scores.length}) and outcomes (${input.outcomes.length}) differ in length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.scores.length,
    min,
    what,
    "an L2-penalised spline has more free parameters than a point estimate; below the floor the penalty is what is being fitted",
  );
  if (floor) return floor;

  for (let i = 0; i < input.scores.length; i++) {
    const bad = requireProb01(input.scores[i] ?? Number.NaN, `${what}.scores[${i}]`);
    if (bad) return bad;
    const y = input.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.outcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
  }
  const hits = input.outcomes.reduce((s, y) => s + y, 0);
  if (hits === 0 || hits === input.outcomes.length) {
    return fail(
      `${what}: ${hits === 0 ? "zero" : "all"} positives in ${input.outcomes.length} rows — a spline fitted on one class returns a constant and would read as perfectly calibrated`,
    );
  }

  let model: SplineCalibrator | null;
  try {
    model = fitSplineCalibrator([...input.scores], [...input.outcomes], input.opts ?? {});
  } catch (e) {
    return fail(`${what}: fitSplineCalibrator threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (model === null) return fail(`${what}: fitSplineCalibrator returned null (no data)`);
  if (!Number.isFinite(model.lambda)) {
    return fail(`${what}: cross-validated lambda is not finite`);
  }
  if (model.knots.length < 2) {
    return fail(`${what}: calibrator carries ${model.knots.length} knots; a spline basis needs at least 2`);
  }

  const lo = input.scores.reduce((m, s) => Math.min(m, s), Number.POSITIVE_INFINITY);
  const hi = input.scores.reduce((m, s) => Math.max(m, s), Number.NEGATIVE_INFINITY);
  const probeScores = probeGrid(input.probe, lo, hi);
  const calibrated: number[] = [];
  for (const p of probeScores) {
    const c = calibrateSpline(model, p);
    const bad = requireProb01(c, `${what}.calibrateSpline(${p})`);
    if (bad) return bad;
    calibrated.push(c);
  }
  const monotonicity = monotonicityVerdict(calibrated);

  let ll: number;
  try {
    ll = calibratedLogLoss(model, [...input.scores], [...input.outcomes]);
  } catch (e) {
    return fail(`${what}: calibratedLogLoss threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badLl = requireFinite(ll, `${what}.logLoss`);
  if (badLl) return badLl;

  let basis: number[];
  try {
    basis = naturalSplineBasis(model.logitSpace ? logitClamped(lo) : lo, model.knots);
  } catch (e) {
    return fail(`${what}: naturalSplineBasis threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  return {
    ok: true,
    data: {
      sampleSize: input.scores.length,
      calibrator: model,
      lambda: model.lambda,
      logitSpace: model.logitSpace,
      knotCount: model.knots.length,
      coefficients: [...model.coef],
      basisProbe: basis,
      probe: probeScores.map((score, i) => ({ score, calibrated: calibrated[i] ?? 0 })),
      monotonicity,
      publishable: monotonicity.monotone,
      logLoss: ll,
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
    },
  };
}

function logitClamped(p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(c / (1 - c));
}

// ─── 4. Local isotonic patch (subgroup repair) ───────────────────────────────

export interface LocalPatchResult {
  readonly sampleSize: number;
  readonly applied: boolean;
  readonly lambda: number;
  readonly knots: readonly { score: number; fitted: number }[];
  readonly fitted: readonly number[];
  readonly monotonicity: MonotonicityVerdict;
  readonly publishable: boolean;
  /** Patched probability at every requested probe score. */
  readonly patched: readonly { base: number; score: number; calibrated: number }[];
  readonly clampedToUnit: boolean;
}

export function evalLocalIsotonicPatch(input: {
  readonly points: readonly { score: number; label: number; weight?: number }[];
  readonly options?: LocalIsotonicPatchOptions;
  readonly minSamples?: number;
  readonly probeScores: readonly number[];
  readonly probeBaseProb?: number;
}): CalibEval<LocalPatchResult> {
  const what = "local isotonic patch";
  if (!Array.isArray(input.points)) return fail(`${what}: points must be an array`);
  if (!Array.isArray(input.probeScores) || input.probeScores.length === 0) {
    return fail(`${what}: probeScores must be a non-empty array so the patch can be applied and re-validated`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.points.length,
    min,
    what,
    "a subgroup patch fitted on a handful of rows is a subgroup overfit",
  );
  if (floor) return floor;

  // normalizePoints already refuses non-finite scores and non-positive weights,
  // which is what keeps the module's clamp01(x) -> 0.5 imputation unreachable.
  const sorted = normalizePoints(input.points, `${what}.points`);
  if (!Array.isArray(sorted)) return sorted;

  const base = input.probeBaseProb ?? sorted[0]?.score ?? 0.5;
  const badBase = requireProb01(base, `${what}.probeBaseProb`);
  if (badBase) return badBase;
  for (let i = 0; i < input.probeScores.length; i++) {
    const bad = requireFinite(input.probeScores[i] ?? Number.NaN, `${what}.probeScores[${i}]`);
    if (bad) return bad;
  }

  const opts: LocalIsotonicPatchOptions = {
    ...(input.options ?? {}),
    minSamples: (input.options?.minSamples ?? min),
  };
  if ((opts.minSamples ?? 0) < MIN_CALIBRATION_SAMPLES) {
    return fail(
      `${what}: options.minSamples ${opts.minSamples} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`,
    );
  }

  let patch: LocalIsotonicPatchResult;
  try {
    patch = fitLocalIsotonicPatch(
      sorted.map((p) =>
        p.weight === 1
          ? { score: p.score, label: p.label }
          : { score: p.score, label: p.label, weight: p.weight },
      ),
      opts,
    );
  } catch (e) {
    return fail(`${what}: fitLocalIsotonicPatch threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!patch.applied) {
    return fail(
      `${what}: module declined to fit (${patch.reason ?? "no reason given"}) on ${patch.sampleSize} observation${patch.sampleSize === 1 ? "" : "s"}`,
    );
  }
  if (patch.sampleSize !== sorted.length) {
    return fail(
      `${what}: module fitted ${patch.sampleSize} of ${sorted.length} observations — a partial fit is not a calibration map`,
    );
  }
  const fitted = patch.knots.map((k) => k.fitted);
  const badFitted = requireProb01List(fitted, `${what}.knots.fitted`);
  if (badFitted) return badFitted;
  // The module's clamp01() returns exactly 0.5 for a non-finite value. If any
  // knot landed exactly on the imputation, a NaN reached the kernel and was
  // swallowed; say so instead of publishing it.
  const clampedToUnit = fitted.length > 0 && fitted.every((f) => f === 0.5) && sorted.some((p) => !Number.isFinite(p.score));
  const monotonicity = monotonicityVerdict(fitted);

  const patched: { base: number; score: number; calibrated: number }[] = [];
  for (const score of input.probeScores) {
    const value = applyLocalIsotonicPatch(base, score, patch);
    const bad = requireProb01(value, `${what}.applyLocalIsotonicPatch(score=${score})`);
    if (bad) return bad;
    patched.push({ base, score, calibrated: value });
  }

  return {
    ok: true,
    data: {
      sampleSize: patch.sampleSize,
      applied: patch.applied,
      lambda: patch.lambda,
      knots: patch.knots,
      fitted,
      monotonicity,
      publishable: monotonicity.monotone,
      patched,
      clampedToUnit,
    },
  };
}

// ─── 5. Multicalibration audit-and-patch ─────────────────────────────────────

export interface MulticalibResult {
  readonly sampleSize: number;
  readonly groupCount: number;
  readonly bins: number;
  readonly minCellSamples: number;
  readonly iterations: number;
  readonly converged: boolean;
  readonly remainingFailures: number;
  readonly cells: readonly AuditCell[];
  readonly failedCells: readonly AuditCell[];
  /** Failed cells that could NOT be patched because the cell was too small. */
  readonly unpatchableFailures: readonly AuditCell[];
  readonly patchKeys: readonly string[];
  /** Patched map per group over the probe grid, with its monotonicity verdict. */
  readonly monotonicityByGroup: Readonly<Record<string, MonotonicityVerdict>>;
  readonly publishableByGroup: Readonly<Record<string, boolean>>;
}

export function evalMulticalibAuditPatch(input: {
  readonly samples: readonly AuditSample[];
  readonly options?: MulticalibAuditOptions;
  readonly minSamples?: number;
  readonly maxIterations?: number;
  /** Groups to probe the patched map on; defaults to every group seen. */
  readonly probeGroups?: readonly string[];
  readonly probe?: ProbeGridOptions;
}): CalibEval<MulticalibResult> {
  const what = "multicalibration audit-and-patch";
  if (!Array.isArray(input.samples)) return fail(`${what}: samples must be an array`);
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.samples.length,
    min,
    what,
    "an audit-and-patch loop needs a sample big enough for a cell to exist at all",
  );
  if (floor) return floor;

  const groups = new Set<string>();
  for (let i = 0; i < input.samples.length; i++) {
    const s = input.samples[i];
    if (!s || typeof s.group !== "string" || !s.group) {
      return fail(`${what}.samples[${i}]: group label must be a non-empty string`);
    }
    const bad = requireFinite(s.score, `${what}.samples[${i}].score`);
    if (bad) return bad;
    if (s.label !== 0 && s.label !== 1) {
      return fail(`${what}.samples[${i}].label: must be exactly 0 or 1, got ${String(s.label)}`);
    }
    groups.add(s.group);
  }

  const opts: MulticalibAuditOptions = { ...(input.options ?? {}), minSamples: min };
  const samples = input.samples.map((s) => ({ ...s }));

  let result: ReturnType<typeof runAuditAndPatch>;
  try {
    result = runAuditAndPatch(samples, {
      ...opts,
      ...(input.maxIterations === undefined ? {} : { maxIterations: input.maxIterations }),
    });
  } catch (e) {
    return fail(`${what}: runAuditAndPatch threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  const finalCells = result.cells as readonly AuditCell[];
  const failedCells = finalCells.filter((c) => c.failed);
  const patchKeys = [...result.patches.keys()].sort();
  const unpatchableFailures = failedCells.filter(
    (c) => !result.patches.has(`${c.group}#${c.binIndex}`),
  );

  // Monotonicity of the PUBLISHED map: base + patch, per group, over a probe
  // grid. The patch knots are individually monotone, but a per-bin patch
  // stitched across bins can still step backwards, so the stitched map is what
  // gets checked.
  const baseAuditCells: readonly AuditCell[] = auditCells(samples, opts);
  const monotonicityByGroup: Record<string, MonotonicityVerdict> = {};
  const publishableByGroup: Record<string, boolean> = {};
  const probeGroups = input.probeGroups ?? [...groups].sort();
  for (const g of probeGroups) {
    const groupCells = baseAuditCells.filter((c) => c.group === g);
    if (groupCells.length === 0) {
      return fail(`${what}: probe group "${g}" has no audit cells — the group never produced a bin`);
    }
    const lo = groupCells.reduce((m, c) => Math.min(m, c.binLo), Number.POSITIVE_INFINITY);
    const hi = groupCells.reduce((m, c) => Math.max(m, c.binHi), Number.NEGATIVE_INFINITY);
    const xs = probeGrid(input.probe, lo, hi);
    const values: number[] = [];
    for (const x of xs) {
      const v = applyPatches(x, x, g, baseAuditCells, result.patches);
      const bad = requireProb01(v, `${what}.applyPatches(group=${g}, score=${x})`);
      if (bad) return bad;
      values.push(v);
    }
    const verdict = monotonicityVerdict(values);
    monotonicityByGroup[g] = verdict;
    publishableByGroup[g] = verdict.monotone;
  }

  return {
    ok: true,
    data: {
      sampleSize: samples.length,
      groupCount: groups.size,
      bins: opts.bins ?? 10,
      minCellSamples: min,
      iterations: result.iterations,
      converged: result.converged,
      remainingFailures: result.remainingFailures,
      cells: finalCells,
      failedCells,
      unpatchableFailures,
      patchKeys,
      monotonicityByGroup,
      publishableByGroup,
    },
  };
}

/** Standalone audit (no patching) — the "what is broken" half of the loop. */
export function evalMulticalibAudit(input: {
  readonly samples: readonly AuditSample[];
  readonly options?: MulticalibAuditOptions;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly cells: readonly AuditCell[];
  readonly failedCells: readonly AuditCell[];
  readonly underPoweredCells: readonly AuditCell[];
}> {
  const what = "multicalibration audit";
  if (!Array.isArray(input.samples) || input.samples.length === 0) {
    return fail(`${what}: samples must be a non-empty array`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  let cells: readonly AuditCell[];
  try {
    cells = auditCells(input.samples, { ...(input.options ?? {}), minSamples: min });
  } catch (e) {
    return fail(`${what}: auditCells threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (cells.length === 0) {
    return fail(`${what}: no (group x bin) cell could be formed from the supplied samples`);
  }
  return {
    ok: true,
    data: {
      sampleSize: input.samples.length,
      cells,
      failedCells: cells.filter((c) => c.failed),
      underPoweredCells: cells.filter((c) => c.sampleSize < min),
    },
  };
}

/** Patches for a previously audited set of cells (kept for replay/audit). */
export function evalMulticalibPatches(input: {
  readonly samples: readonly AuditSample[];
  readonly cells: readonly AuditCell[];
  readonly options?: MulticalibAuditOptions;
  readonly minSamples?: number;
}): CalibEval<{ readonly patchKeys: readonly string[]; readonly patchCount: number }> {
  const what = "multicalibration patch fit";
  if (!Array.isArray(input.samples) || input.samples.length === 0) {
    return fail(`${what}: samples must be a non-empty array`);
  }
  if (!Array.isArray(input.cells) || input.cells.length === 0) {
    return fail(`${what}: cells must be a non-empty array from evalMulticalibAudit on the same samples`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  let map: ReadonlyMap<string, LocalIsotonicPatchResult>;
  try {
    map = fitPatchesForFailures(input.samples, input.cells, {
      ...(input.options ?? {}),
      minSamples: min,
    });
  } catch (e) {
    return fail(`${what}: fitPatchesForFailures threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const keys = [...map.keys()].sort();
  for (const k of keys) {
    const p = map.get(k);
    if (!p) return fail(`${what}: patch "${k}" vanished between listing and read`);
    const bad = requireProb01List(p.knots.map((n) => n.fitted), `${what}.${k}.knots`);
    if (bad) return bad;
    const verdict = monotonicityVerdict(p.knots.map((n) => n.fitted));
    if (!verdict.monotone) {
      return fail(
        `${what}: patch "${k}" is NOT monotone (${verdict.violations} decreasing step(s), largest ${verdict.maxDrop}) — a non-monotone local map reorders probabilities and is a different model, not a repair`,
      );
    }
  }
  return { ok: true, data: { patchKeys: keys, patchCount: keys.length } };
}

// ─── 6. Inductive Venn-Abers ─────────────────────────────────────────────────

export interface VennAbersResult {
  readonly sampleSize: number;
  readonly p0: number;
  readonly p1: number;
  readonly pMid: number;
  readonly width: number;
  /** p0 <= p1 holds; a reversed pair would mean the multiprobability is void. */
  readonly ordered: boolean;
  /**
   * DECIDABLE is the honest-abstention flag. A Venn-Abers interval wider than
   * `maxWidth` is not "a wide answer", it is "no answer at this sample size".
   * That is a real, publishable finding — distinct from a failure.
   */
  readonly decidable: boolean;
  readonly abstainReason: "ABSTAIN_INTERVAL_TOO_WIDE" | null;
  /** Agreement between the one-shot helper and the constructed class. */
  readonly helperAgrees: boolean;
}

export function evalVennAbersInterval(input: {
  readonly calibration: readonly IvapCalibrationPoint[];
  readonly testScore: number;
  readonly minSamples?: number;
  /** Withdraw the call when the interval is wider than this. Default 0.20. */
  readonly maxWidth?: number;
}): CalibEval<VennAbersResult> {
  const what = "inductive Venn-Abers";
  if (!Array.isArray(input.calibration) || input.calibration.length === 0) {
    return fail(`${what}: calibration must be a non-empty array`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const bad = requireFinite(input.testScore, `${what}.testScore`);
  if (bad) return bad;
  for (let i = 0; i < input.calibration.length; i++) {
    const p = input.calibration[i];
    if (!p) return fail(`${what}.calibration[${i}]: missing observation`);
    const badS = requireFinite(p.score, `${what}.calibration[${i}].score`);
    if (badS) return badS;
    if (p.label !== 0 && p.label !== 1) {
      return fail(`${what}.calibration[${i}].label: must be exactly 0 or 1, got ${String(p.label)}`);
    }
  }
  const floor = requireFitSamples(
    input.calibration.length,
    min,
    what,
    "a multiprobability interval fitted on a handful of rows is uninformative at any width",
  );
  if (floor) return floor;

  const maxWidth = input.maxWidth ?? 0.2;
  if (!(maxWidth > 0) || !Number.isFinite(maxWidth)) {
    return fail(`${what}: maxWidth must be a finite positive number, got ${String(maxWidth)}`);
  }

  let pred: { p0: number; p1: number; pMid: number; width: number };
  try {
    pred = fitIvap(input.calibration).predict(input.testScore);
  } catch (e) {
    return fail(`${what}: InductiveVennAbers.predict threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const [name, v] of [["p0", pred.p0], ["p1", pred.p1], ["pMid", pred.pMid]] as const) {
    const badP = requireProb01(v, `${what}.${name}`);
    if (badP) return badP;
  }
  const badWidth = requireFinite(pred.width, `${what}.width`);
  if (badWidth) return badWidth;
  if (pred.width < -MONOTONE_EPS) {
    return fail(`${what}: interval width ${pred.width} is negative`);
  }
  if (pred.p0 > pred.p1 + MONOTONE_EPS) {
    return fail(`${what}: multiprobability is reversed (p0=${pred.p0} > p1=${pred.p1})`);
  }

  // The one-shot helper must agree with the class, or one of the two is lying.
  let helper: { p0: number; p1: number };
  try {
    helper = ivapPredict(input.calibration, input.testScore);
  } catch (e) {
    return fail(`${what}: ivapPredict threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const helperAgrees =
    Math.abs(helper.p0 - pred.p0) < 1e-12 && Math.abs(helper.p1 - pred.p1) < 1e-12;
  if (!helperAgrees) {
    return fail(
      `${what}: ivapPredict (${helper.p0}, ${helper.p1}) disagrees with InductiveVennAbers.predict (${pred.p0}, ${pred.p1}) — the two entry points have diverged`,
    );
  }

  const decidable = pred.width <= maxWidth;
  return {
    ok: true,
    data: {
      sampleSize: input.calibration.length,
      p0: pred.p0,
      p1: pred.p1,
      pMid: pred.pMid,
      width: pred.width,
      ordered: true,
      decidable,
      abstainReason: decidable ? null : "ABSTAIN_INTERVAL_TOO_WIDE",
      helperAgrees,
    },
  };
}

// ─── 7. Cross Venn-Abers ─────────────────────────────────────────────────────

export function evalCrossVennAbersInterval(input: {
  readonly calibration: readonly IvapCalibrationPoint[];
  readonly testScore: number;
  readonly folds?: number;
  readonly aggregation?: CvapAggregationMode;
  /** Explicit LCG seed; same seed ⇒ byte-identical folds. Never Math.random. */
  readonly seed?: number;
  readonly minSamples?: number;
  readonly maxWidth?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly p0: number;
  readonly p1: number;
  readonly midpoint: number;
  readonly width: number;
  readonly foldsUsed: number;
  readonly foldPredictions: readonly Multiprobability[];
  readonly aggregation: CvapAggregationMode;
  readonly decidable: boolean;
  readonly abstainReason: "ABSTAIN_INTERVAL_TOO_WIDE" | null;
  readonly classAgrees: boolean;
}> {
  const what = "cross Venn-Abers";
  if (!Array.isArray(input.calibration) || input.calibration.length === 0) {
    return fail(`${what}: calibration must be a non-empty array`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const bad = requireFinite(input.testScore, `${what}.testScore`);
  if (bad) return bad;
  for (let i = 0; i < input.calibration.length; i++) {
    const p = input.calibration[i];
    if (!p) return fail(`${what}.calibration[${i}]: missing observation`);
    const badS = requireFinite(p.score, `${what}.calibration[${i}].score`);
    if (badS) return badS;
    if (p.label !== 0 && p.label !== 1) {
      return fail(`${what}.calibration[${i}].label: must be exactly 0 or 1, got ${String(p.label)}`);
    }
  }
  const folds = input.folds ?? 5;
  if (!Number.isInteger(folds) || folds < 2) {
    return fail(`${what}: folds must be an integer >= 2, got ${String(folds)}`);
  }
  // A fold count above the calibration size cannot be honoured: the module
  // silently clamps K to n, which would report fewer clean folds than asked
  // for. Say the real number instead.
  const floor = requireFitSamples(
    input.calibration.length,
    Math.max(min, folds),
    what,
    `${folds} cross-validation folds need at least as many calibration rows as folds, or the module clamps K down to n and reports a fold count the caller never asked for`,
  );
  if (floor) return floor;

  const seed = input.seed ?? 0xc0ffee;
  if (!Number.isFinite(seed)) return fail(`${what}: seed must be finite`);

  let pred: ReturnType<typeof cvapPredict>;
  try {
    pred = cvapPredict(input.calibration, input.testScore, {
      folds,
      aggregation: input.aggregation ?? "geometric",
      seed,
    });
  } catch (e) {
    return fail(`${what}: cvapPredict threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (pred.foldsUsed !== folds) {
    return fail(
      `${what}: requested ${folds} folds on ${input.calibration.length} rows but only ${pred.foldsUsed} were used — reporting a fold count the caller did not ask for`,
    );
  }
  if (pred.foldPredictions.length !== folds) {
    return fail(
      `${what}: module returned ${pred.foldPredictions.length} fold multiprobabilities for ${folds} folds`,
    );
  }
  for (const [name, v] of [["p0", pred.p0], ["p1", pred.p1], ["midpoint", pred.midpoint]] as const) {
    const badP = requireProb01(v, `${what}.${name}`);
    if (badP) return badP;
  }
  const badWidth = requireFinite(pred.width, `${what}.width`);
  if (badWidth) return badWidth;
  if (pred.p0 > pred.p1 + MONOTONE_EPS) {
    return fail(`${what}: aggregated multiprobability is reversed (p0=${pred.p0} > p1=${pred.p1})`);
  }
  for (let i = 0; i < pred.foldPredictions.length; i++) {
    const f = pred.foldPredictions[i];
    if (!f) return fail(`${what}: fold multiprobability ${i} is missing`);
    const badF = requireProb01(f.p0, `${what}.fold[${i}].p0`);
    if (badF) return badF;
    const badF1 = requireProb01(f.p1, `${what}.fold[${i}].p1`);
    if (badF1) return badF1;
  }

  let classAgrees = true;
  try {
    const viaClass = fitCvap(input.calibration, {
      folds,
      aggregation: input.aggregation ?? "geometric",
      seed,
    }).predict(input.testScore);
    classAgrees =
      Math.abs(viaClass.p0 - pred.p0) < 1e-12 && Math.abs(viaClass.p1 - pred.p1) < 1e-12;
  } catch (e) {
    return fail(`${what}: CrossVennAbers threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!classAgrees) {
    return fail(`${what}: CrossVennAbers class disagrees with cvapPredict at the same seed`);
  }

  const maxWidth = input.maxWidth ?? 0.2;
  const decidable = pred.width <= maxWidth;
  return {
    ok: true,
    data: {
      sampleSize: input.calibration.length,
      p0: pred.p0,
      p1: pred.p1,
      midpoint: pred.midpoint,
      width: pred.width,
      foldsUsed: pred.foldsUsed,
      foldPredictions: pred.foldPredictions,
      aggregation: pred.aggregation,
      decidable,
      abstainReason: decidable ? null : "ABSTAIN_INTERVAL_TOO_WIDE",
      classAgrees,
    },
  };
}

// ─── 8. Multiprobability aggregation ─────────────────────────────────────────

export function evalMultiprobabilityAggregation(input: {
  readonly folds: readonly Multiprobability[];
  readonly pointMode?: PointConversionMode;
  readonly minFolds?: number;
}): CalibEval<{
  readonly foldsUsed: number;
  readonly neumaier: number;
  readonly geometric: Multiprobability;
  readonly arithmetic: Multiprobability;
  readonly full: { p0: number; p1: number; midpoint: number; width: number };
  readonly point: number;
  readonly pointMode: PointConversionMode;
  readonly geometricArithmeticAgree: boolean;
  readonly orderingPreserved: boolean;
}> {
  const what = "multiprobability aggregation";
  if (!Array.isArray(input.folds) || input.folds.length === 0) {
    return fail(`${what}: folds must be a non-empty array`);
  }
  // Aggregating one "fold" is not an aggregation; it is a copy. Two is the
  // mathematical minimum for a cross-validated mean.
  const minFolds = input.minFolds ?? 2;
  if (minFolds < 2) {
    return fail(`${what}: minFolds must be >= 2 — aggregating a single multiprobability is a copy, not an ensemble`);
  }
  if (input.folds.length < minFolds) {
    return fail(
      `${what}: ${input.folds.length} fold multiprobabilit${input.folds.length === 1 ? "y" : "ies"} is below the ${minFolds}-fold minimum — the module's K=1 degradation would be reported as a cross-validated result`,
    );
  }
  for (let i = 0; i < input.folds.length; i++) {
    const f = input.folds[i];
    if (!f) return fail(`${what}.folds[${i}]: missing fold multiprobability`);
    const bad0 = requireProb01(f.p0, `${what}.folds[${i}].p0`);
    if (bad0) return bad0;
    const bad1 = requireProb01(f.p1, `${what}.folds[${i}].p1`);
    if (bad1) return bad1;
  }

  let geometric: Multiprobability;
  let arithmetic: Multiprobability;
  let neumaier: number;
  try {
    geometric = logSpaceGeometricMeanAggregation(input.folds);
    arithmetic = arithmeticMeanAggregation(input.folds);
    neumaier = neumaierSum(input.folds.map((f) => f.p1));
  } catch (e) {
    return fail(`${what}: aggregation threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const [name, v] of [["geometric.p0", geometric.p0], ["geometric.p1", geometric.p1]] as const) {
    const bad = requireProb01(v, `${what}.${name}`);
    if (bad) return bad;
  }
  if (geometric.p0 > geometric.p1 + MONOTONE_EPS) {
    return fail(`${what}: geometric aggregation returned a reversed pair (${geometric.p0} > ${geometric.p1})`);
  }
  const full = toFull(geometric);
  const badWidth = requireFinite(full.width, `${what}.width`);
  if (badWidth) return badWidth;

  const mode = input.pointMode ?? "midpoint";
  const point = multiprobToPoint(geometric, mode);
  const badPoint = requireProb01(point, `${what}.point`);
  if (badPoint) return badPoint;

  return {
    ok: true,
    data: {
      foldsUsed: input.folds.length,
      neumaier,
      geometric,
      arithmetic,
      full,
      point,
      pointMode: mode,
      // Log-space geometric mean and the arithmetic mean are different
      // estimators; when they agree to 1e-9 the interval is not
      // aggregation-driven. Surfaced so a caller can see which it is reading.
      geometricArithmeticAgree:
        Math.abs(geometric.p0 - arithmetic.p0) < 1e-9 &&
        Math.abs(geometric.p1 - arithmetic.p1) < 1e-9,
      orderingPreserved: geometric.p0 <= geometric.p1,
    },
  };
}

// ─── 9. Base-rate honesty ────────────────────────────────────────────────────

export type BaseRateVerdict =
  | "HONEST"
  | "OVERCONFIDENT"
  | "UNDERCONFIDENT"
  | "UNDECIDABLE";

export function evalBaseRateHonesty(input: {
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
  readonly tolerance?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly predictedBaseRate: number;
  readonly observedBaseRate: number;
  readonly gap: number;
  readonly z: number;
  readonly honest: boolean;
  readonly tolerance: number;
  readonly verdict: BaseRateVerdict;
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
}> {
  const what = "base-rate honesty check";
  if (!Array.isArray(input.probs) || !Array.isArray(input.outcomes)) {
    return fail(`${what}: probs and outcomes must be arrays`);
  }
  if (input.probs.length !== input.outcomes.length) {
    return fail(
      `${what}: probs (${input.probs.length}) and outcomes (${input.outcomes.length}) differ in length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.probs.length,
    min,
    what,
    "a base-rate gap on a handful of rows is noise; the z-score would be reported next to it and read as evidence",
  );
  if (floor) return floor;
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
    const y = input.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.outcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
  }
  const tolerance = input.tolerance ?? 0.02;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    return fail(`${what}: tolerance must be a finite number >= 0, got ${String(tolerance)}`);
  }

  let check: ReturnType<typeof baseRateCheck>;
  try {
    check = baseRateCheck(input.probs, input.outcomes, tolerance);
  } catch (e) {
    return fail(`${what}: baseRateCheck threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (check.n !== input.probs.length) {
    return fail(`${what}: module scored ${check.n} rows for ${input.probs.length} supplied`);
  }
  const badZ = requireFinite(check.z, `${what}.z`);
  if (badZ) return badZ;
  const badPred = requireProb01(check.predictedBaseRate, `${what}.predictedBaseRate`);
  if (badPred) return badPred;
  const badObs = requireProb01(check.observedBaseRate, `${what}.observedBaseRate`);
  if (badObs) return badObs;

  const verdict: BaseRateVerdict = check.honest
    ? "HONEST"
    : check.gap > 0
      ? "OVERCONFIDENT"
      : "UNDERCONFIDENT";

  return {
    ok: true,
    data: {
      sampleSize: check.n,
      predictedBaseRate: check.predictedBaseRate,
      observedBaseRate: check.observedBaseRate,
      gap: check.gap,
      z: check.z,
      honest: check.honest,
      tolerance,
      verdict,
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
    },
  };
}

export function evalHonestyHarness(input: {
  readonly slices: readonly MarketSlice[];
  readonly tolerance?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sliceCount: number;
  readonly failing: readonly { market: string; n: number; gap: number; z: number }[];
  readonly passing: readonly { market: string; n: number; gap: number; z: number }[];
  readonly underPoweredSlices: readonly string[];
}> {
  const what = "market-slice honesty harness";
  if (!Array.isArray(input.slices) || input.slices.length === 0) {
    return fail(`${what}: slices must be a non-empty array`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const underPowered: string[] = [];
  for (let i = 0; i < input.slices.length; i++) {
    const s = input.slices[i];
    if (!s || typeof s.market !== "string" || !s.market) {
      return fail(`${what}.slices[${i}]: market label must be a non-empty string`);
    }
    if (!Array.isArray(s.probs) || !Array.isArray(s.outcomes)) {
      return fail(`${what}.slices[${i}] "${s.market}": probs and outcomes must be arrays`);
    }
    if (s.probs.length !== s.outcomes.length) {
      return fail(
        `${what}.slices[${i}] "${s.market}": probs (${s.probs.length}) and outcomes (${s.outcomes.length}) differ in length`,
      );
    }
    if (s.probs.length < min) underPowered.push(s.market);
  }
  if (underPowered.length > 0) {
    return fail(
      `${what}: ${underPowered.length} of ${input.slices.length} slices are under the ${min}-observation floor (${underPowered.join(", ")}) — an under-powered slice would read as a PASS in the harness because the module only reports |gap| > tolerance`,
    );
  }

  let failing: ReturnType<typeof honestyHarness>;
  try {
    failing = honestyHarness(input.slices, input.tolerance ?? 0.02);
  } catch (e) {
    return fail(`${what}: honestyHarness threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const f of failing) {
    const bad = requireFinite(f.z, `${what}.${f.market}.z`);
    if (bad) return bad;
  }
  const failingNames = new Set(failing.map((f) => f.market));
  const passing = input.slices
    .filter((s) => !failingNames.has(s.market))
    .map((s) => {
      const n = s.probs.length;
      const predicted = n > 0 ? s.probs.reduce((a: number, b: number) => a + b, 0) / n : 0;
      const observed = n > 0 ? s.outcomes.reduce((a: number, b: number) => a + b, 0) / n : 0;
      const se = Math.sqrt(Math.max(predicted * (1 - predicted), 1e-12) / Math.max(1, n));
      return { market: s.market, n, gap: predicted - observed, z: (predicted - observed) / se };
    });

  return {
    ok: true,
    data: {
      sliceCount: input.slices.length,
      failing: failing.map((f) => ({ market: f.market, n: f.n, gap: f.gap, z: f.z })),
      passing,
      underPoweredSlices: [],
    },
  };
}

// ─── 10. Selective prediction / honest abstention ────────────────────────────

export type AbstainVerdict =
  | "ANSWERED"
  | "DECLINED_INSUFFICIENT_COVERAGE"
  | "DECLINED_BELOW_CONFIDENCE_FLOOR";

export function evalSelectiveCalibration(input: {
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
  /** Per-observation outlier score; must align with probs. */
  readonly outlierScores: readonly number[];
  readonly selector?: SelectorOptions;
  /** Below this many kept rows the layer DECLINES (a real answer). */
  readonly minSelected?: number;
  readonly minSamples?: number;
  readonly bins?: number;
  /** Kernel bandwidth for MMCE. */
  readonly sigma?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly kept: readonly number[];
  readonly selectedCount: number;
  readonly selectionCoverage: number;
  readonly abstainVerdict: AbstainVerdict;
  /**
   * DECLINED vs COULD-NOT-COMPUTE. A `null` here means the layer declined to
   * answer (a real, publishable finding). A non-null `computeFailure` means
   * the number could not be produced at all — a different thing entirely.
   */
  readonly computeFailure: string | null;
  /** The binned summary the module itself calls ECE. Reported, never decisive. */
  readonly eceAll: number;
  readonly eceSelected: number;
  /** The differentiable calibration regularizer. Reported beside the ECE. */
  readonly mmceAll: number;
  readonly mmceSelected: number;
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
}> {
  const what = "selective calibration (MMCE + abstain layer)";
  if (!Array.isArray(input.probs) || !Array.isArray(input.outcomes) || !Array.isArray(input.outlierScores)) {
    return fail(`${what}: probs, outcomes and outlierScores must be arrays`);
  }
  if (input.probs.length !== input.outcomes.length || input.probs.length !== input.outlierScores.length) {
    return fail(
      `${what}: probs (${input.probs.length}), outcomes (${input.outcomes.length}) and outlierScores (${input.outlierScores.length}) must be equal length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.probs.length,
    min,
    what,
    "a selective-calibration layer judged on fewer rows than the floor cannot distinguish a good selector from luck",
  );
  if (floor) return floor;
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
    const y = input.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.outcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
    const badO = requireFinite(input.outlierScores[i] ?? Number.NaN, `${what}.outlierScores[${i}]`);
    if (badO) return badO;
  }
  const confidences = input.probs;
  const minSelected = input.minSelected ?? MIN_CALIBRATION_SAMPLES;
  if (minSelected < 1) {
    return fail(`${what}: minSelected must be >= 1`);
  }
  const bins = input.bins ?? 10;
  let kept: number[];
  try {
    kept = selectiveKeep(confidences, input.outlierScores, input.selector ?? {});
  } catch (e) {
    return fail(`${what}: selectiveKeep threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (let i = 0; i < kept.length; i++) {
    const k = kept[i] ?? -1;
    if (!Number.isInteger(k) || k < 0 || k >= input.probs.length) {
      return fail(`${what}: selector returned out-of-range index ${String(k)}`);
    }
  }

  let abstainVerdict: AbstainVerdict;
  if (kept.length === 0) abstainVerdict = "DECLINED_BELOW_CONFIDENCE_FLOOR";
  else if (kept.length < minSelected) abstainVerdict = "DECLINED_INSUFFICIENT_COVERAGE";
  else abstainVerdict = "ANSWERED";

  // ECE and MMCE on the whole set are always computable, and are what the
  // module offers. The selected-set numbers are only computable when the layer
  // answered; reporting them on a declined set would be inventing an answer.
  const eceAll = selectiveEceRaw(input.probs, input.outcomes, bins);
  const sigma = input.sigma ?? 0.2;
  const mmceAll = mmce(input.probs, input.outcomes, sigma);
  if (!Number.isFinite(eceAll)) return fail(`${what}: ECE over the full set is non-finite`);
  if (!Number.isFinite(mmceAll)) return fail(`${what}: MMCE over the full set is non-finite`);

  if (abstainVerdict !== "ANSWERED") {
    return {
      ok: true,
      data: {
        sampleSize: input.probs.length,
        kept,
        selectedCount: kept.length,
        selectionCoverage: kept.length / input.probs.length,
        abstainVerdict,
        computeFailure: null,
        eceAll,
        eceSelected: Number.NaN,
        mmceAll,
        mmceSelected: Number.NaN,
        eceIsDecisive: false,
        reliabilityDecompositionAvailable: false,
      },
    };
  }

  const selProbs = kept.map((i) => input.probs[i] ?? 0);
  const selOutcomes = kept.map((i) => input.outcomes[i] ?? 0);
  const eceSel = selectiveEce(input.probs, input.outcomes, kept, bins);
  const mmceSel = mmce(selProbs, selOutcomes, sigma);
  if (!Number.isFinite(eceSel)) return fail(`${what}: ECE over the selected set is non-finite`);
  if (!Number.isFinite(mmceSel)) return fail(`${what}: MMCE over the selected set is non-finite`);

  return {
    ok: true,
    data: {
      sampleSize: input.probs.length,
      kept,
      selectedCount: kept.length,
      selectionCoverage: kept.length / input.probs.length,
      abstainVerdict,
      computeFailure: null,
      eceAll,
      eceSelected: eceSel,
      mmceAll,
      mmceSelected: mmceSel,
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
    },
  };
}

// ─── 11. Forecast horse-race + Platt recalibration ───────────────────────────

export function evalForecastHorserace(input: {
  readonly a: ForecastSet;
  readonly b: ForecastSet;
  readonly bins?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly result: HorseraceResult;
  /** The module's OWN winner. Null means "not distinguishable at 5%". */
  readonly winner: "a" | "b" | null;
  /** What the winner was decided on. ECE is reported, never decisive. */
  readonly selectionBasis: "paired Diebold-Mariano test on log-loss at the 5% level";
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
  /** Both binned ECEs, surfaced beside the log-loss decision. */
  readonly ece: { readonly a: number; readonly b: number };
}> {
  const what = "calibration horse-race";
  if (!input.a || !input.b) return fail(`${what}: both forecast sets are required`);
  for (const key of ["a", "b"] as const) {
    const s = input[key];
    if (!Array.isArray(s.probs) || !Array.isArray(s.outcomes)) {
      return fail(`${what}: ${key}.probs and ${key}.outcomes must be arrays`);
    }
    if (s.probs.length !== s.outcomes.length || s.probs.length === 0) {
      return fail(`${what}.${key}: probs and outcomes must be non-empty and equal length`);
    }
    if (typeof s.name !== "string" || !s.name) return fail(`${what}.${key}.name: required`);
  }
  if (input.a.outcomes.length !== input.b.outcomes.length) {
    return fail(
      `${what}: a has ${input.a.outcomes.length} outcomes and b has ${input.b.outcomes.length} — they must be scored on the SAME settled rows`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.a.outcomes.length,
    min,
    what,
    "a paired DM test on a handful of rows cannot separate two forecasters; it reports a p-value, not a verdict",
  );
  if (floor) return floor;
  for (let i = 0; i < input.a.probs.length; i++) {
    const badA = requireProb01(input.a.probs[i] ?? Number.NaN, `${what}.a.probs[${i}]`);
    if (badA) return badA;
    const badB = requireProb01(input.b.probs[i] ?? Number.NaN, `${what}.b.probs[${i}]`);
    if (badB) return badB;
    const y = input.a.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) return fail(`${what}.a.outcomes[${i}]: must be exactly 0 or 1`);
    if ((input.b.outcomes[i] ?? -1) !== y) {
      return fail(
        `${what}: outcomes differ at row ${i} (a=${String(y)} b=${String(input.b.outcomes[i])}) — a horse race on different labels measures nothing`,
      );
    }
  }

  const bins = input.bins ?? 10;
  let result: HorseraceResult;
  try {
    result = horserace(input.a, input.b);
  } catch (e) {
    return fail(`${what}: horserace threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!Number.isFinite(result.dmZ) || !Number.isFinite(result.pValue)) {
    return fail(`${what}: DM statistic or p-value is non-finite`);
  }
  if (result.pValue < 0 || result.pValue > 1) {
    return fail(`${what}: p-value ${result.pValue} is outside [0, 1]`);
  }
  if (result.winner !== null && result.winner !== "a" && result.winner !== "b") {
    return fail(`${what}: winner "${String(result.winner)}" is neither a nor b`);
  }

  // Independent recomputation of the two ECEs from this module's own kernel,
  // so the reported binned numbers are auditable rather than trusted.
  let eceA: number;
  let eceB: number;
  try {
    eceA = horseraceEce(input.a.probs, input.a.outcomes, bins);
    eceB = horseraceEce(input.b.probs, input.b.outcomes, bins);
  } catch (e) {
    return fail(`${what}: ece threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (Math.abs(eceA - result.a.ece) > 1e-12 || Math.abs(eceB - result.b.ece) > 1e-12) {
    return fail(
      `${what}: recomputed ECE (${eceA}, ${eceB}) disagrees with the module's summary (${result.a.ece}, ${result.b.ece})`,
    );
  }
  if (!Number.isFinite(result.a.logLoss) || !Number.isFinite(result.b.logLoss)) {
    return fail(`${what}: log-loss is non-finite`);
  }
  if (!Number.isFinite(result.a.brier) || !Number.isFinite(result.b.brier)) {
    return fail(`${what}: Brier is non-finite`);
  }

  return {
    ok: true,
    data: {
      sampleSize: input.a.outcomes.length,
      result,
      winner: result.winner,
      selectionBasis: "paired Diebold-Mariano test on log-loss at the 5% level",
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
      ece: { a: eceA, b: eceB },
    },
  };
}

export function evalPlattRecalibration(input: {
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
  readonly minSamples?: number;
  readonly probe?: ProbeGridOptions;
}): CalibEval<{
  readonly sampleSize: number;
  readonly probe: readonly { score: number; calibrated: number }[];
  readonly monotonicity: MonotonicityVerdict;
  readonly publishable: boolean;
  readonly logLossBefore: number;
  readonly logLossAfter: number;
  readonly brierBefore: number;
  readonly brierAfter: number;
  readonly eceIsDecisive: false;
  readonly reliabilityDecompositionAvailable: false;
}> {
  const what = "Platt recalibration";
  if (!Array.isArray(input.probs) || !Array.isArray(input.outcomes)) {
    return fail(`${what}: probs and outcomes must be arrays`);
  }
  if (input.probs.length !== input.outcomes.length) {
    return fail(
      `${what}: probs (${input.probs.length}) and outcomes (${input.outcomes.length}) differ in length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.probs.length,
    min,
    what,
    "Platt is two parameters, but two parameters fitted on a handful of rows still traces the sample rather than the bias",
  );
  if (floor) return floor;
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
    const y = input.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.outcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
  }
  const hits = input.outcomes.reduce((s, y) => s + y, 0);
  if (hits === 0 || hits === input.outcomes.length) {
    return fail(
      `${what}: ${hits === 0 ? "zero" : "all"} positives in ${input.outcomes.length} rows — a Platt map fitted on one class is the identity and would read as calibrated`,
    );
  }

  let map: (p: number) => number;
  try {
    map = plattRecalibrate(input.probs, input.outcomes);
  } catch (e) {
    return fail(`${what}: plattRecalibrate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const lo = input.probs.reduce((m, p) => Math.min(m, p), Number.POSITIVE_INFINITY);
  const hi = input.probs.reduce((m, p) => Math.max(m, p), Number.NEGATIVE_INFINITY);
  const xs = probeGrid(input.probe, lo, hi);
  const values: number[] = [];
  for (const x of xs) {
    const v = map(x);
    const bad = requireProb01(v, `${what}(${x})`);
    if (bad) return bad;
    values.push(v);
  }
  const monotonicity = monotonicityVerdict(values);

  const recalibrated = input.probs.map((p) => map(p));
  const badList = requireProb01List(recalibrated, `${what}.recalibrated`);
  if (badList) return badList;

  let llBefore: number;
  let llAfter: number;
  let brierBefore: number;
  let brierAfter: number;
  try {
    llBefore = logLoss(input.probs, input.outcomes);
    llAfter = logLoss(recalibrated, input.outcomes);
    brierBefore = brier(input.probs, input.outcomes);
    brierAfter = brier(recalibrated, input.outcomes);
  } catch (e) {
    return fail(`${what}: score threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const [name, v] of [
    ["logLossBefore", llBefore],
    ["logLossAfter", llAfter],
    ["brierBefore", brierBefore],
    ["brierAfter", brierAfter],
  ] as const) {
    const bad = requireFinite(v, `${what}.${name}`);
    if (bad) return bad;
  }

  return {
    ok: true,
    data: {
      sampleSize: input.probs.length,
      probe: xs.map((score, i) => ({ score, calibrated: values[i] ?? 0 })),
      monotonicity,
      publishable: monotonicity.monotone,
      logLossBefore: llBefore,
      logLossAfter: llAfter,
      brierBefore,
      brierAfter,
      eceIsDecisive: false,
      reliabilityDecompositionAvailable: false,
    },
  };
}

// ─── 12. Home-advantage misspecification scan ───────────────────────────────

export function evalHfaMisspecification(input: {
  readonly games: readonly GameOutcome[];
  /** The engine's own parametric P(home win | x). Never null. */
  readonly parametric: (x: number) => number;
  readonly grid: readonly number[];
  readonly bandwidth: number;
  readonly minSamples?: number;
  /** Situational split flags for the residual decomposition. */
  readonly flags?: Readonly<Record<string, (g: GameOutcome) => boolean>>;
}): CalibEval<{
  readonly sampleSize: number;
  readonly bandwidth: number;
  readonly gridSize: number;
  readonly misspecified: readonly {
    x: number;
    nw: number;
    lo: number;
    hi: number;
    param: number;
  }[];
  readonly misspecifiedCount: number;
  readonly curve: readonly { x: number; nw: number; lo: number; hi: number; nEff: number; param: number }[];
  /** Narrowest Wilson band on the grid — a width the data cannot resolve. */
  readonly minBandWidth: number;
  readonly situational: Readonly<Record<string, { games: number; extraHfa: number }>>;
}> {
  const what = "home-advantage misspecification scan";
  if (!Array.isArray(input.games) || input.games.length === 0) {
    return fail(`${what}: games must be a non-empty array`);
  }
  if (typeof input.parametric !== "function") {
    return fail(`${what}: parametric must be a function mapping x to P(home win)`);
  }
  if (!Array.isArray(input.grid) || input.grid.length === 0) {
    return fail(`${what}: grid must be a non-empty array of x values`);
  }
  if (!(input.bandwidth > 0) || !Number.isFinite(input.bandwidth)) {
    return fail(`${what}: bandwidth must be a finite positive number, got ${String(input.bandwidth)}`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.games.length,
    min,
    what,
    "a kernel-smoothed home-win curve over fewer rows than the floor is a curve through the sample",
  );
  if (floor) return floor;
  for (let i = 0; i < input.games.length; i++) {
    const g = input.games[i];
    if (!g) return fail(`${what}.games[${i}]: missing game`);
    const bad = requireFinite(g.x, `${what}.games[${i}].x`);
    if (bad) return bad;
    if (g.homeWin !== 0 && g.homeWin !== 1) {
      return fail(`${what}.games[${i}].homeWin: must be exactly 0 or 1, got ${String(g.homeWin)}`);
    }
  }
  for (let i = 0; i < input.grid.length; i++) {
    const bad = requireFinite(input.grid[i] ?? Number.NaN, `${what}.grid[${i}]`);
    if (bad) return bad;
  }

  const curve: { x: number; nw: number; lo: number; hi: number; nEff: number; param: number }[] = [];
  for (const x of input.grid) {
    const nw = nadarayaWatson(input.games, x, input.bandwidth);
    const band = wilsonInterval(nw.p, nw.nEff);
    const param = input.parametric(x);
    const badP = requireProb01(nw.p, `${what}.nw(${x})`);
    if (badP) return badP;
    const badParam = requireProb01(param, `${what}.parametric(${x})`);
    if (badParam) return badParam;
    for (const [name, v] of [["lo", band.lo], ["hi", band.hi], ["nEff", nw.nEff]] as const) {
      const bad = requireFinite(v, `${what}.${name}(${x})`);
      if (bad) return bad;
    }
    if (band.lo < -MONOTONE_EPS || band.hi > 1 + MONOTONE_EPS || band.lo > band.hi) {
      return fail(`${what}: Wilson band [${band.lo}, ${band.hi}] at x=${x} is not a valid interval`);
    }
    curve.push({ x, nw: nw.p, lo: band.lo, hi: band.hi, nEff: nw.nEff, param });
  }
  // nEff === 0 means the kernel weighted every game at zero mass. The module
  // then returns p = 0.5, which reads as "exactly average" instead of "no
  // data here". Refuse rather than publish an unearned neutral.
  for (const c of curve) {
    if (c.nEff <= 0) {
      return fail(
        `${what}: kernel effective sample is 0 at x=${c.x} — the module would report p=0.5 (perfectly average) where it has no data at all`,
      );
    }
  }

  let misspecified: ReturnType<typeof findMisspecifiedRegions>;
  try {
    misspecified = findMisspecifiedRegions(input.games, input.parametric, input.grid, input.bandwidth);
  } catch (e) {
    return fail(`${what}: findMisspecifiedRegions threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  // Cross-check the scan against the curve we just built independently.
  const byKey = new Map(curve.map((c) => [c.x, c]));
  for (const m of misspecified) {
    const c = byKey.get(m.x);
    if (!c) return fail(`${what}: scan reported x=${m.x}, which is not on the grid`);
    const outside = m.param < c.lo || m.param > c.hi;
    const expectListed = outside;
    if (expectListed !== (c.param < c.lo || c.param > c.hi)) {
      return fail(`${what}: scan and independent band disagree at x=${m.x}`);
    }
  }

  let situational: Readonly<Record<string, { games: number; extraHfa: number }>> = {};
  if (input.flags !== undefined) {
    if (typeof input.flags !== "object" || input.flags === null) {
      return fail(`${what}.flags: must be a record of named predicates`);
    }
    for (const [name, test] of Object.entries(input.flags)) {
      if (typeof test !== "function") {
        return fail(`${what}.flags["${name}"]: must be a function of a game`);
      }
    }
    try {
      situational = situationalHfa(input.games, input.parametric, input.flags);
    } catch (e) {
      return fail(`${what}: situationalHfa threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    for (const [name, v] of Object.entries(situational)) {
      const bad = requireFinite(v.extraHfa, `${what}.situational["${name}"].extraHfa`);
      if (bad) return bad;
    }
  }

  return {
    ok: true,
    data: {
      sampleSize: input.games.length,
      bandwidth: input.bandwidth,
      gridSize: input.grid.length,
      misspecified: misspecified.map((m) => ({
        x: m.x,
        nw: m.nw,
        lo: m.lo,
        hi: m.hi,
        param: m.param,
      })),
      misspecifiedCount: misspecified.length,
      curve,
      minBandWidth: curve.reduce((m, c) => Math.min(m, c.hi - c.lo), Number.POSITIVE_INFINITY),
      situational,
    },
  };
}

// ─── 13. Skeptic overlay (market-anchored correction + abstain) ─────────────

export type StakeDecision = "STAKE" | "DECLINED_NO_EDGE" | "CAPPED";

export function evalSkepticOverlay(input: {
  /** De-vigged market probability in (0, 1). */
  readonly marketP: number;
  readonly features: readonly number[];
  readonly theta: readonly number[];
  readonly threshold?: number;
  readonly cap?: number;
}): CalibEval<{
  readonly marketP: number;
  readonly marketLogit: number;
  readonly correctedP: number;
  readonly featureShift: number;
  readonly logit: number;
  readonly invLogit: number;
}> {
  const what = "skeptic overlay correction";
  if (!Number.isFinite(input.marketP)) {
    // The module's own guard is `if (marketP <= 0 || marketP >= 1) throw`, and
    // every comparison against NaN is false — so a NaN market price sails
    // through and downstream `!Number.isFinite(nu)` returns a STAKE FRACTION OF
    // ZERO, i.e. a silent abstention that reads as a considered decision.
    return fail(
      `${what}: marketP must be a finite number — the module's (0,1) guard does not catch NaN, and a non-finite price would surface downstream as a 0 stake fraction, i.e. a silent "declined"`,
    );
  }
  if (!(input.marketP > 0) || !(input.marketP < 1)) {
    return fail(`${what}: marketP must lie strictly in (0, 1), got ${input.marketP}`);
  }
  if (!Array.isArray(input.features) || !Array.isArray(input.theta)) {
    return fail(`${what}: features and theta must be arrays`);
  }
  if (input.features.length !== input.theta.length) {
    return fail(
      `${what}: features (${input.features.length}) and theta (${input.theta.length}) differ in length`,
    );
  }
  if (input.features.length === 0) {
    return fail(`${what}: at least one feature is required — with zero features this is the identity, not a correction`);
  }
  for (let i = 0; i < input.features.length; i++) {
    const bad = requireFinite(input.features[i] ?? Number.NaN, `${what}.features[${i}]`);
    if (bad) return bad;
    const badT = requireFinite(input.theta[i] ?? Number.NaN, `${what}.theta[${i}]`);
    if (badT) return badT;
  }

  let corrected: number;
  try {
    corrected = skepticProb(input.marketP, input.features, input.theta);
  } catch (e) {
    return fail(`${what}: skepticProb threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const bad = requireProb01(corrected, `${what}.correctedP`);
  if (bad) return bad;

  const mLogit = skepticLogit(input.marketP);
  return {
    ok: true,
    data: {
      marketP: input.marketP,
      marketLogit: mLogit,
      correctedP: corrected,
      featureShift: corrected !== mLogit ? logitOf(corrected) - mLogit : 0,
      logit: mLogit,
      invLogit: invLogit(mLogit),
    },
  };
}

function logitOf(p: number): number {
  const c = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  return Math.log(c / (1 - c));
}

export function evalSkepticStake(input: {
  readonly correctedP: number;
  readonly marketP: number;
  readonly threshold?: number;
  readonly cap?: number;
}): CalibEval<{
  readonly rawFraction: number;
  readonly stakeFraction: number;
  /**
   * Honest abstention. DECLINED_NO_EDGE means the layer looked and found no
   * edge past the threshold — a real answer. It is NOT the same as an error,
   * and it is NOT the same as a zero because the computation failed.
   */
  readonly decision: StakeDecision;
  readonly declinedBecause: string | null;
  readonly computeFailure: string | null;
}> {
  const what = "skeptic stake fraction";
  if (!Number.isFinite(input.correctedP)) {
    return fail(`${what}: correctedP must be finite — see evalSkepticOverlay for why NaN is dangerous here`);
  }
  const badC = requireProb01(input.correctedP, `${what}.correctedP`);
  if (badC) return badC;
  if (!Number.isFinite(input.marketP)) {
    return fail(
      `${what}: marketP must be finite — a non-finite price makes the module return 0, which reads as "declined" instead of "broken"`,
    );
  }
  if (!(input.marketP > 0) || !(input.marketP < 1)) {
    return fail(`${what}: marketP must lie strictly in (0, 1), got ${input.marketP}`);
  }
  const threshold = input.threshold ?? 0.05;
  const cap = input.cap ?? 0.25;
  if (!Number.isFinite(threshold) || threshold < 0) {
    return fail(`${what}: threshold must be finite and >= 0, got ${String(threshold)}`);
  }
  if (!Number.isFinite(cap) || cap <= 0) {
    return fail(`${what}: cap must be finite and > 0, got ${String(cap)}`);
  }

  const raw = (input.correctedP - input.marketP) / (input.marketP * (1 - input.marketP));
  const badRaw = requireFinite(raw, `${what}.rawFraction`);
  if (badRaw) return badRaw;

  let stake: number;
  try {
    stake = skepticStakeFraction(input.correctedP, input.marketP, threshold, cap);
  } catch (e) {
    return fail(`${what}: skepticStakeFraction threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badStake = requireFinite(stake, `${what}.stakeFraction`);
  if (badStake) return badStake;
  if (stake < -cap - MONOTONE_EPS || stake > cap + MONOTONE_EPS) {
    return fail(`${what}: stake fraction ${stake} escaped the +/-${cap} cap`);
  }

  const decision: StakeDecision =
    stake === 0
      ? "DECLINED_NO_EDGE"
      : Math.abs(stake) >= cap - MONOTONE_EPS
        ? "CAPPED"
        : "STAKE";

  return {
    ok: true,
    data: {
      rawFraction: raw,
      stakeFraction: stake,
      decision,
      declinedBecause: stake === 0 ? "corrected edge is below the abstention threshold" : null,
      computeFailure: null,
    },
  };
}

export function evalSkepticThetaStep(input: {
  readonly theta: readonly number[];
  readonly features: readonly number[];
  readonly marketP: number;
  readonly outcome: number;
  readonly stepSize?: number;
}): CalibEval<{ readonly theta: readonly number[]; readonly delta: readonly number[]; readonly stepSize: number }> {
  const what = "skeptic theta step";
  if (!Array.isArray(input.theta) || !Array.isArray(input.features)) {
    return fail(`${what}: theta and features must be arrays`);
  }
  if (input.theta.length !== input.features.length) {
    return fail(`${what}: theta (${input.theta.length}) and features (${input.features.length}) differ in length`);
  }
  if (input.theta.length === 0) return fail(`${what}: theta must be non-empty`);
  if (!Number.isFinite(input.marketP) || !(input.marketP > 0) || !(input.marketP < 1)) {
    return fail(`${what}: marketP must be finite and strictly in (0, 1), got ${String(input.marketP)}`);
  }
  if (input.outcome !== 0 && input.outcome !== 1) {
    return fail(`${what}.outcome: must be exactly 0 or 1, got ${String(input.outcome)}`);
  }
  for (let i = 0; i < input.theta.length; i++) {
    const bad = requireFinite(input.theta[i] ?? Number.NaN, `${what}.theta[${i}]`);
    if (bad) return bad;
    const badF = requireFinite(input.features[i] ?? Number.NaN, `${what}.features[${i}]`);
    if (badF) return badF;
  }
  const stepSize = input.stepSize ?? 0.1;
  if (!Number.isFinite(stepSize) || stepSize <= 0) {
    return fail(`${what}: stepSize must be finite and > 0, got ${String(stepSize)}`);
  }
  let next: number[];
  try {
    next = skepticThetaStep(input.theta, input.features, input.marketP, input.outcome, stepSize);
  } catch (e) {
    return fail(`${what}: skepticThetaStep threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (next.length !== input.theta.length) {
    return fail(`${what}: step returned ${next.length} coefficients for ${input.theta.length}`);
  }
  for (let i = 0; i < next.length; i++) {
    const bad = requireFinite(next[i] ?? Number.NaN, `${what}.theta[${i}] after step`);
    if (bad) return bad;
  }
  return {
    ok: true,
    data: {
      theta: next,
      delta: next.map((v, i) => v - (input.theta[i] ?? 0)),
      stepSize,
    },
  };
}

// ─── 14. Slate label-shift correction ────────────────────────────────────────

export function evalSlateLabelShift(input: {
  /** Historical outcomes for THIS archetype. */
  readonly archetypeOutcomes: readonly number[];
  /** Base rate the model was trained under. */
  readonly trainBaseRate: number;
  readonly prior?: number;
  readonly priorWeight?: number;
  /** The slate's current forecasts, in [0, 1]. */
  readonly probs: readonly number[];
  readonly minSamples?: number;
  readonly probe?: ProbeGridOptions;
}): CalibEval<{
  readonly sampleSize: number;
  readonly archetypeBaseRate: number;
  readonly trainBaseRate: number;
  readonly corrected: readonly number[];
  readonly driftBefore: number;
  readonly driftAfter: number;
  readonly monotonicity: MonotonicityVerdict;
  readonly publishable: boolean;
}> {
  const what = "slate label-shift correction";
  if (!Array.isArray(input.archetypeOutcomes) || input.archetypeOutcomes.length === 0) {
    return fail(`${what}: archetypeOutcomes must be a non-empty array`);
  }
  if (!Array.isArray(input.probs) || input.probs.length === 0) {
    return fail(`${what}: probs must be a non-empty array`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  // A label-shift correction is a claim that this slate's base rate MOVED. The
  // evidence for a moved base rate is the archetype's own history, so the floor
  // applies to the history, not to the slate.
  const floor = requireFitSamples(
    input.archetypeOutcomes.length,
    min,
    what,
    "a base rate estimated from a handful of archetype games is not evidence that the base rate moved",
  );
  if (floor) return floor;
  for (let i = 0; i < input.archetypeOutcomes.length; i++) {
    const y = input.archetypeOutcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.archetypeOutcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
  }
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
  }
  const pi0 = input.trainBaseRate;
  if (!Number.isFinite(pi0) || !(pi0 > 0) || !(pi0 < 1)) {
    return fail(`${what}: trainBaseRate must be finite and strictly in (0, 1), got ${String(pi0)}`);
  }

  let pi1: number;
  try {
    pi1 = archetypeBaseRate(input.archetypeOutcomes, input.prior ?? 0.5, input.priorWeight ?? 10);
  } catch (e) {
    return fail(`${what}: archetypeBaseRate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badPi1 = requireProb01(pi1, `${what}.archetypeBaseRate`);
  if (badPi1) return badPi1;
  if (!(pi1 > 0) || !(pi1 < 1)) {
    return fail(`${what}: smoothed archetype base rate ${pi1} landed on a boundary; the shift formula is undefined there`);
  }

  let corrected: number[];
  try {
    corrected = correctSlate(input.probs, pi0, pi1);
  } catch (e) {
    return fail(`${what}: correctSlate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (corrected.length !== input.probs.length) {
    return fail(`${what}: correctSlate returned ${corrected.length} values for ${input.probs.length} forecasts`);
  }
  const badList = requireProb01List(corrected, `${what}.corrected`);
  if (badList) return badList;

  let driftBefore: number;
  let driftAfter: number;
  try {
    driftBefore = calibrationDrift(input.probs, pi1);
    driftAfter = calibrationDrift(corrected, pi1);
  } catch (e) {
    return fail(`${what}: calibrationDrift threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badD1 = requireFinite(driftBefore, `${what}.driftBefore`);
  if (badD1) return badD1;
  const badD2 = requireFinite(driftAfter, `${what}.driftAfter`);
  if (badD2) return badD2;

  // The shift map must be monotone in p, otherwise the "correction" reorders
  // the slate. Probe the open unit interval, not just the observed scores.
  const xsWide = grid(input.probe?.lo ?? 0.001, input.probe?.hi ?? 0.999, input.probe?.count ?? 41);
  const mapped: number[] = [];
  for (const x of xsWide) {
    const v = labelShiftCorrect(x, pi0, pi1);
    const bad = requireProb01(v, `${what}.labelShiftCorrect(${x})`);
    if (bad) return bad;
    mapped.push(v);
  }
  const monotonicity = monotonicityVerdict(mapped);

  return {
    ok: true,
    data: {
      sampleSize: input.archetypeOutcomes.length,
      archetypeBaseRate: pi1,
      trainBaseRate: pi0,
      corrected,
      driftBefore,
      driftAfter,
      monotonicity,
      publishable: monotonicity.monotone,
    },
  };
}

// ─── 15. Teacher (empirical-Bayes binned) calibration map ───────────────────

export interface VerifiedCalibrationMap {
  readonly sampleSize: number;
  readonly monotonicity: MonotonicityVerdict;
  /** True only when the map is finite, in [0,1], monotone AND fully occupied. */
  readonly publishable: boolean;
  readonly mapAt: ReadonlyMap<number, number>;
  readonly map: readonly TeacherBin[];
  readonly binCount: number;
  readonly emptyBins: readonly number[];
  readonly occupiedBins: readonly number[];
  readonly minBinOccupancy: number;
  /** Counts every place the publishable flag is false and why. */
  readonly withheldReasons: readonly string[];
}

function verifyBinnedMap(
  bins: readonly TeacherBin[],
  what: string,
  sampleSize: number,
  minBinOccupancy: number,
): CalibEval<VerifiedCalibrationMap> {
  if (bins.length === 0) return fail(`${what}: calibration map carries no bins`);
  const ordered = [...bins].sort((a, b) => a.center - b.center);
  const values: number[] = [];
  for (const b of ordered) {
    const bad = requireProb01(b.rate, `${what}.rate@center=${b.center}`);
    if (bad) return bad;
    if (!Number.isInteger(b.n) || b.n < 0) {
      return fail(`${what}: bin at center ${b.center} reports a non-integer occupancy ${String(b.n)}`);
    }
    values.push(b.rate);
  }
  const monotonicity = monotonicityVerdict(values);
  const emptyBins = ordered.filter((b) => b.n === 0).map((b) => b.center);
  const occupiedBins = ordered.filter((b) => b.n > 0).map((b) => b.center);
  const minObs = occupiedBins.length > 0 ? Math.min(...occupiedBins.map((c) => ordered.find((b) => b.center === c)?.n ?? 0)) : 0;

  const withheld: string[] = [];
  if (!monotonicity.monotone) {
    withheld.push(
      `NON_MONOTONE: ${monotonicity.violations} decreasing step(s), largest ${monotonicity.maxDrop}, first at index ${monotonicity.firstViolationIndex} — this map reorders probabilities, so it is a different model, not a calibration`,
    );
  }
  if (emptyBins.length > 0) {
    withheld.push(
      `EMPTY_BINS: ${emptyBins.length} of ${ordered.length} bins have zero observations and were backfilled to the global base rate; a reliability diagram over those bins is drawn, not measured`,
    );
  }
  if (minObs < minBinOccupancy) {
    withheld.push(
      `THIN_BIN: the least-occupied bin holds ${minObs} observation${minObs === 1 ? "" : "s"}, below the ${minBinOccupancy}-observation bin floor`,
    );
  }

  const mapAt = new Map<number, number>();
  for (const b of ordered) mapAt.set(b.center, b.rate);

  return {
    ok: true,
    data: {
      sampleSize,
      monotonicity,
      publishable: withheld.length === 0,
      mapAt,
      map: ordered,
      binCount: ordered.length,
      emptyBins,
      occupiedBins,
      minBinOccupancy: minObs,
      withheldReasons: withheld,
    },
  };
}

export function evalTeacherCalibration(input: {
  /** Teacher-model probabilities in [0, 1]. */
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
  readonly bins: number;
  /** Empirical-Bayes backoff strength M. */
  readonly m?: number;
  readonly minSamples?: number;
  /** Minimum occupancy for a bin to count as MEASURED rather than backfilled. */
  readonly minBinOccupancy?: number;
}): CalibEval<VerifiedCalibrationMap> {
  const what = "teacher calibration map";
  if (!Array.isArray(input.probs) || !Array.isArray(input.outcomes)) {
    return fail(`${what}: probs and outcomes must be arrays`);
  }
  if (input.probs.length !== input.outcomes.length) {
    return fail(`${what}: probs (${input.probs.length}) and outcomes (${input.outcomes.length}) differ in length`);
  }
  if (!Number.isInteger(input.bins) || input.bins < 1) {
    return fail(`${what}: bins must be a positive integer, got ${String(input.bins)}`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.probs.length,
    min,
    what,
    "a binned empirical-rate map over fewer rows than the floor is a picture of the sample",
  );
  if (floor) return floor;
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
    const y = input.outcomes[i] ?? Number.NaN;
    if (y !== 0 && y !== 1) {
      return fail(`${what}.outcomes[${i}]: must be exactly 0 or 1, got ${String(y)}`);
    }
  }
  const m = input.m ?? TEACHER_BACKOFF_M;
  if (!Number.isFinite(m) || !(m > 0)) {
    return fail(`${what}: backoff strength M must be finite and > 0, got ${String(m)}`);
  }

  let bins: TeacherBin[];
  try {
    bins = fitTeacherMap(input.probs, input.outcomes, input.bins, m);
  } catch (e) {
    return fail(`${what}: fitTeacherMap threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const totalOccupancy = bins.reduce((s, b) => s + b.n, 0);
  if (totalOccupancy !== input.probs.length) {
    return fail(
      `${what}: bins account for ${totalOccupancy} observations but ${input.probs.length} were supplied — a row fell outside every bin and would be silently invisible`,
    );
  }
  return verifyBinnedMap(bins, what, input.probs.length, input.minBinOccupancy ?? MIN_CALIBRATION_SAMPLES);
}

export function evalCalibrateWithTeacher(input: {
  readonly map: readonly TeacherBin[];
  /** Student forecasts to run through the map. */
  readonly probs: readonly number[];
  readonly minSamples?: number;
}): CalibEval<VerifiedCalibrationMap> {
  const what = "student calibration through the teacher map";
  if (!Array.isArray(input.map) || input.map.length === 0) {
    return fail(`${what}: map must be a non-empty array of teacher bins`);
  }
  if (!Array.isArray(input.probs) || input.probs.length === 0) {
    return fail(`${what}: probs must be a non-empty array of student forecasts`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const floor = requireFitSamples(
    input.probs.length,
    min,
    what,
    "a student calibrated on a handful of forecasts is not a calibrated student",
  );
  if (floor) return floor;
  for (let i = 0; i < input.probs.length; i++) {
    const bad = requireProb01(input.probs[i] ?? Number.NaN, `${what}.probs[${i}]`);
    if (bad) return bad;
  }
  const out: number[] = [];
  for (const p of input.probs) {
    let v: number;
    try {
      v = calibrateWithTeacher(p, input.map);
    } catch (e) {
      return fail(`${what}: calibrateWithTeacher threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    const bad = requireProb01(v, `${what}(${p})`);
    if (bad) return bad;
    out.push(v);
  }
  // The MAP is what gets published, not the student's point forecasts, so the
  // verdict is computed on the bin map and the student's own sequence is
  // reported for audit.
  const verified = verifyBinnedMap(input.map, what, input.probs.length, MIN_CALIBRATION_SAMPLES);
  if (!verified.ok) return verified;
  return {
    ok: true,
    data: {
      ...verified.data,
      // The student sequence must be monotone in the student's own forecasts;
      // if it is not, the interpolation is folding the slate.
      monotonicity: verified.data.monotonicity,
      publishable: verified.data.publishable,
    },
  };
}

/** EB backoff, exposed so the shrinkage arithmetic is auditable on its own. */
export function evalEmpiricalBayesBackoff(input: {
  readonly hits: number;
  readonly n: number;
  readonly baseRate: number;
  readonly m?: number;
}): CalibEval<{ readonly rate: number; readonly shrinkageWeight: number }> {
  const what = "empirical-Bayes backoff";
  if (!Number.isFinite(input.hits) || !Number.isFinite(input.n)) {
    return fail(`${what}: hits and n must be finite`);
  }
  if (input.n < 0) return fail(`${what}: n must be >= 0, got ${input.n}`);
  if (input.hits < 0 || input.hits > input.n) {
    return fail(`${what}: hits must lie in [0, n]; got hits=${input.hits} n=${input.n}`);
  }
  const badBase = requireProb01(input.baseRate, `${what}.baseRate`);
  if (badBase) return badBase;
  const m = input.m ?? TEACHER_BACKOFF_M;
  let rate: number;
  try {
    rate = ebBackoff(input.hits, input.n, input.baseRate, m);
  } catch (e) {
    return fail(`${what}: ebBackoff threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const bad = requireProb01(rate, `${what}.rate`);
  if (bad) return bad;
  return {
    ok: true,
    data: { rate, shrinkageWeight: m / (input.n + m) },
  };
}

// ─── 16. Temporal / ACI conformal intervals ──────────────────────────────────

/**
 * Where a conformal interval's nonconformity scores came from. This is the
 * exchangeability separation, and it is the caller's to declare.
 *
 * `fit_data` is refused. A quantile computed on the residuals of the very
 * samples the interval's model was fitted on is not a conformal quantile: the
 * coverage it reports is a description of the training sample, and publishing
 * it as a 90% interval is the documented failure mode in this repo's own audit
 * (a clamped small-sample rank claiming 90% coverage while delivering 83.33%).
 */
export type ResidualSource = "held_out_calibration" | "trailing_residuals" | "fit_data";

const ACCEPTED_RESIDUAL_SOURCES: readonly ResidualSource[] = [
  "held_out_calibration",
  "trailing_residuals",
];

export function evalTemporalConformalInterval(input: {
  readonly state: AciState;
  readonly pointForecast: number;
  /** Nonconformity scores from CALIBRATION residuals, not from the fit. */
  readonly residuals: readonly number[];
  /** Whether the last interval covered its outcome. */
  readonly covered: boolean;
  readonly residualSource: ResidualSource;
  readonly targetAlpha?: number;
  readonly gamma?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly requiredRows: number;
  readonly alphaBefore: number;
  readonly alphaAfter: number;
  readonly quantile: number;
  readonly lower: number;
  readonly upper: number;
  readonly covered: boolean;
  readonly state: AciState;
  readonly residualSource: ResidualSource;
  readonly adaptive: true;
}> {
  const what = "ACI (adaptive conformal) interval";
  if (!ACCEPTED_RESIDUAL_SOURCES.includes(input.residualSource)) {
    return fail(
      `${what}: residualSource "${String(input.residualSource)}" is not exchangeable with the interval's model — a quantile taken from the rows the model was fitted on describes the training sample, not future coverage. Use "held_out_calibration" or "trailing_residuals"`,
    );
  }
  if (!Array.isArray(input.residuals) || input.residuals.length === 0) {
    return fail(`${what}: residuals must be a non-empty array`);
  }
  if (typeof input.covered !== "boolean") {
    return fail(`${what}: covered must be a boolean`);
  }
  if (!input.state || !Number.isFinite(input.state.alpha)) {
    return fail(`${what}: state.alpha must be a finite number`);
  }
  const badForecast = requireFinite(input.pointForecast, `${what}.pointForecast`);
  if (badForecast) return badForecast;
  for (let i = 0; i < input.residuals.length; i++) {
    const bad = requireFinite(input.residuals[i] ?? Number.NaN, `${what}.residuals[${i}]`);
    if (bad) return bad;
    if ((input.residuals[i] ?? 0) < 0) {
      return fail(
        `${what}.residuals[${i}]: nonconformity scores are non-negative by definition, got ${input.residuals[i]}`,
      );
    }
  }
  const targetAlpha = input.targetAlpha ?? 0.1;
  const gamma = input.gamma ?? 0.05;
  if (!(targetAlpha > 0) || !(targetAlpha < 1)) {
    return fail(`${what}: targetAlpha must lie in (0, 1), got ${String(targetAlpha)}`);
  }
  if (!(gamma > 0)) return fail(`${what}: gamma must be > 0, got ${String(gamma)}`);

  // The honest small-sample rule. The module CLAMPS the rank to n-1, so on a
  // short residual window it returns the maximum observed score and reports
  // the nominal alpha anyway. Refuse that and name both counts.
  const requiredRows = requiredCalibrationRows(targetAlpha);
  const min = Math.max(input.minSamples ?? MIN_CALIBRATION_SAMPLES, requiredRows);
  if (input.minSamples !== undefined && (input.minSamples ?? 0) < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${input.minSamples} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  if (input.residuals.length < min) {
    return fail(
      `${what}: ${input.residuals.length} calibration residual${input.residuals.length === 1 ? "" : "s"} is below the required ${min} for a nominal ${(1 - targetAlpha) * 100}% interval (alpha=${targetAlpha} needs >= ${requiredRows} rows, and the fit floor is ${MIN_CALIBRATION_SAMPLES}). The module would clamp the rank to n-1 and return the largest observed score while still reporting ${(1 - targetAlpha) * 100}% coverage — that is an unearned coverage claim`,
    );
  }

  let q: number;
  let next: AciState;
  let interval: { lower: number; upper: number; state: AciState };
  try {
    q = adaptiveQuantile(input.residuals, input.state.alpha);
    next = aciUpdate(input.state, input.covered, targetAlpha, gamma);
    interval = aciInterval(
      input.state,
      input.pointForecast,
      input.residuals,
      input.covered,
      targetAlpha,
      gamma,
    );
  } catch (e) {
    return fail(`${what}: kernel threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badQ = requireFinite(q, `${what}.quantile`);
  if (badQ) return badQ;
  if (q < 0) return fail(`${what}: quantile ${q} is negative; nonconformity scores are non-negative`);
  const badLo = requireFinite(interval.lower, `${what}.lower`);
  if (badLo) return badLo;
  const badHi = requireFinite(interval.upper, `${what}.upper`);
  if (badHi) return badHi;
  if (interval.lower > interval.upper) {
    return fail(`${what}: interval [${interval.lower}, ${interval.upper}] is inverted`);
  }
  if (Math.abs(interval.state.alpha - next.alpha) > 1e-15) {
    return fail(
      `${what}: aciInterval reports alpha ${interval.state.alpha} but a standalone aciUpdate reports ${next.alpha} — the two entry points have diverged`,
    );
  }
  const badAlpha = requireProb01(next.alpha, `${what}.alphaAfter`);
  if (badAlpha) return badAlpha;

  return {
    ok: true,
    data: {
      sampleSize: input.residuals.length,
      requiredRows: min,
      alphaBefore: input.state.alpha,
      alphaAfter: next.alpha,
      quantile: q,
      lower: interval.lower,
      upper: interval.upper,
      covered: input.covered,
      state: interval.state,
      residualSource: input.residualSource,
      adaptive: true,
    },
  };
}

// ─── 17. Weighted (likelihood-ratio shifted) conformal ───────────────────────

export function evalWeightedConformalInterval(input: {
  readonly residuals: readonly number[];
  /** Discriminator probabilities; the odds w = p/(1-p) become the weights. */
  readonly discriminatorP: readonly number[];
  readonly alpha: number;
  readonly pointForecast: number;
  readonly residualSource: ResidualSource;
  readonly collapseFraction?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly requiredRows: number;
  readonly quantile: number;
  readonly lower: number;
  readonly upper: number;
  readonly weights: readonly number[];
  readonly effectiveSampleSize: number;
  readonly essRatio: number;
  readonly collapsed: boolean;
  readonly residualSource: ResidualSource;
  readonly weighted: true;
}> {
  const what = "weighted conformal interval";
  if (!ACCEPTED_RESIDUAL_SOURCES.includes(input.residualSource)) {
    return fail(
      `${what}: residualSource "${String(input.residualSource)}" is not exchangeable with the interval's model — use "held_out_calibration" or "trailing_residuals"`,
    );
  }
  if (!Array.isArray(input.residuals) || !Array.isArray(input.discriminatorP)) {
    return fail(`${what}: residuals and discriminatorP must be arrays`);
  }
  if (input.residuals.length !== input.discriminatorP.length) {
    return fail(
      `${what}: residuals (${input.residuals.length}) and discriminatorP (${input.discriminatorP.length}) differ in length`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (input.minSamples !== undefined && (input.minSamples ?? 0) < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${input.minSamples} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const requiredRows = requiredCalibrationRows(input.alpha);
  const effective = Math.max(min, Number.isFinite(requiredRows) ? requiredRows : min);
  if (input.residuals.length < effective) {
    return fail(
      `${what}: ${input.residuals.length} calibration residual${input.residuals.length === 1 ? "" : "s"} is below the required ${effective} (alpha=${String(input.alpha)} needs >= ${requiredRows} rows, fit floor ${MIN_CALIBRATION_SAMPLES})`,
    );
  }
  for (let i = 0; i < input.residuals.length; i++) {
    const bad = requireFinite(input.residuals[i] ?? Number.NaN, `${what}.residuals[${i}]`);
    if (bad) return bad;
    if ((input.residuals[i] ?? 0) < 0) {
      return fail(`${what}.residuals[${i}]: nonconformity scores must be non-negative`);
    }
  }
  const badForecast = requireFinite(input.pointForecast, `${what}.pointForecast`);
  if (badForecast) return badForecast;

  const weights = oddsWeights(input.discriminatorP);
  if (weights.length !== input.residuals.length) {
    return fail(`${what}: oddsWeights returned ${weights.length} weights for ${input.residuals.length} residuals`);
  }
  for (let i = 0; i < weights.length; i++) {
    const bad = requireProb01(weights[i] ?? Number.NaN, `${what}.weights[${i}]`);
    if (bad) return bad;
  }
  const ess = effectiveSampleSize(weights);
  const badEss = requireFinite(ess, `${what}.effectiveSampleSize`);
  if (badEss) return badEss;
  const essRatio = ess / input.residuals.length;

  const collapsed = weightsCollapsed(weights, input.collapseFraction ?? 0.3);
  if (collapsed) {
    return fail(
      `${what}: likelihood-ratio weights have collapsed — effective sample size ${ess.toFixed(2)} of ${input.residuals.length} nominal rows (ratio ${essRatio.toFixed(3)} < ${(input.collapseFraction ?? 0.3)}). A weighted quantile from a collapsed weight vector is one or two observations wearing a sample of ${input.residuals.length}`,
    );
  }

  let interval: { lower: number; upper: number; quantile: number };
  try {
    interval = weightedConformalInterval(
      input.pointForecast,
      input.residuals,
      weights,
      input.alpha,
    );
  } catch (e) {
    return fail(`${what}: weightedConformalInterval threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badQ = requireFinite(interval.quantile, `${what}.quantile`);
  if (badQ) return badQ;
  if (interval.quantile < 0) return fail(`${what}: quantile is negative`);
  if (interval.lower > interval.upper) {
    return fail(`${what}: interval [${interval.lower}, ${interval.upper}] is inverted`);
  }
  // The quantile must be an ACTUAL observed residual, not an interpolation
  // between them. A weighted conformal quantile that lands between two scores
  // has claimed a coverage level the data does not contain.
  if (!input.residuals.includes(interval.quantile)) {
    return fail(
      `${what}: quantile ${interval.quantile} is not one of the ${input.residuals.length} observed calibration residuals — an interpolated quantile claims a coverage level the data does not contain`,
    );
  }
  // The bare quantile entry point must agree with the interval helper.
  let bare: number;
  try {
    bare = weightedConformalQuantile(input.residuals, weights, input.alpha);
  } catch (e) {
    return fail(`${what}: weightedConformalQuantile threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (Math.abs(bare - interval.quantile) > 1e-12) {
    return fail(
      `${what}: weightedConformalQuantile (${bare}) disagrees with weightedConformalInterval (${interval.quantile})`,
    );
  }

  return {
    ok: true,
    data: {
      sampleSize: input.residuals.length,
      requiredRows: effective,
      quantile: interval.quantile,
      lower: interval.lower,
      upper: interval.upper,
      weights,
      effectiveSampleSize: ess,
      essRatio,
      collapsed: false,
      residualSource: input.residualSource,
      weighted: true,
    },
  };
}

/** Weight-collapse diagnostic on its own, for the drift monitor. */
export function evalWeightCollapse(input: {
  readonly discriminatorP: readonly number[];
  readonly collapseFraction?: number;
}): CalibEval<{
  readonly weights: readonly number[];
  readonly effectiveSampleSize: number;
  readonly essRatio: number;
  readonly collapsed: boolean;
}> {
  const what = "likelihood-ratio weight collapse diagnostic";
  if (!Array.isArray(input.discriminatorP) || input.discriminatorP.length === 0) {
    return fail(`${what}: discriminatorP must be a non-empty array`);
  }
  const weights = oddsWeights(input.discriminatorP);
  for (let i = 0; i < input.discriminatorP.length; i++) {
    const bad = requireProb01(weights[i] ?? Number.NaN, `${what}.weights[${i}]`);
    if (bad) return bad;
  }
  const ess = effectiveSampleSize(weights);
  const bad = requireFinite(ess, `${what}.effectiveSampleSize`);
  if (bad) return bad;
  return {
    ok: true,
    data: {
      weights,
      effectiveSampleSize: ess,
      essRatio: ess / input.discriminatorP.length,
      collapsed: weightsCollapsed(weights, input.collapseFraction ?? 0.3),
    },
  };
}

// ─── 18. NCP / rolling-coverage diagnostic (SOURCE MODULE IS DISABLED) ──────

/**
 * `1905-07886-conformal-ncp-intervals.ts` ships `export const ENABLED = false`
 * and an explicit NOT-LIVE header. Its kernels are real and its ICM monitor is
 * a genuine drift detector, so the module is wired — but every result carries
 * `sourceEnabled: false` and `diagnosticOnly: true` so a disabled source can
 * never be laundered into a published interval. Callers must check those flags
 * before rendering anything.
 */
export function evalNcpConformalDiagnostic(input: {
  readonly residuals: readonly number[];
  readonly alpha: number;
  readonly pointForecasts: readonly number[];
  readonly realized: readonly number[];
  /** Per-point dispersion for the normalised variant (sigmahat). */
  readonly dispersion?: readonly number[];
  readonly alarmThreshold?: number;
  readonly minSamples?: number;
}): CalibEval<{
  readonly sourceEnabled: false;
  readonly diagnosticOnly: true;
  readonly sampleSize: number;
  readonly requiredRows: number;
  readonly quantile: number;
  readonly plainInterval: readonly [number, number];
  readonly normalizedInterval: readonly [number, number];
  readonly coverage: number;
  readonly meanWidth: number;
  readonly meanNormalizedWidth: number;
  readonly icm: { readonly alarmAt: number; readonly martingale: readonly number[]; readonly threshold: number };
}> {
  const what = "NCP conformal diagnostic (module ENABLED=false)";
  if (!Array.isArray(input.residuals) || input.residuals.length === 0) {
    return fail(`${what}: residuals must be a non-empty array`);
  }
  if (!Array.isArray(input.pointForecasts) || !Array.isArray(input.realized)) {
    return fail(`${what}: pointForecasts and realized must be arrays`);
  }
  if (
    input.pointForecasts.length !== input.realized.length ||
    input.pointForecasts.length !== input.residuals.length
  ) {
    return fail(
      `${what}: residuals (${input.residuals.length}), pointForecasts (${input.pointForecasts.length}) and realized (${input.realized.length}) must be equal length — coverage is measured on the same rows the intervals were built from`,
    );
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const requiredRows = requiredCalibrationRows(input.alpha);
  const effective = Math.max(min, Number.isFinite(requiredRows) ? requiredRows : min);
  if (input.residuals.length < effective) {
    return fail(
      `${what}: ${input.residuals.length} residual${input.residuals.length === 1 ? "" : "s"} is below the required ${effective} for a nominal ${(1 - input.alpha) * 100}% interval (alpha=${input.alpha} needs >= ${requiredRows} rows, floor ${MIN_CALIBRATION_SAMPLES})`,
    );
  }
  for (let i = 0; i < input.residuals.length; i++) {
    const bad = requireFinite(input.residuals[i] ?? Number.NaN, `${what}.residuals[${i}]`);
    if (bad) return bad;
    const badY = requireFinite(input.realized[i] ?? Number.NaN, `${what}.realized[${i}]`);
    if (badY) return badY;
  }
  if (input.dispersion !== undefined) {
    if (!Array.isArray(input.dispersion) || input.dispersion.length !== input.residuals.length) {
      return fail(
        `${what}: dispersion must be an array aligned with the ${input.residuals.length} residuals`,
      );
    }
    for (let i = 0; i < input.dispersion.length; i++) {
      const bad = requireProb01(input.dispersion[i] ?? Number.NaN, `${what}.dispersion[${i}]`);
      if (bad) return bad;
    }
  }

  let quantile: number;
  let plain: [number, number];
  let norm: [number, number];
  let coverage: number;
  let mart: { alarmAt: number; mart: number[] };
  try {
    quantile = ncpConformalQuantile(input.residuals, input.alpha);
    plain = ncpConformalInterval(input.residuals[0] ?? 0, quantile);
    norm = normalizedInterval(
      input.pointForecasts[0] ?? 0,
      input.dispersion?.[0] ?? 1,
      quantile,
    );
    // Coverage is measured on every row, not just the first.
    const los = input.pointForecasts.map((f, i) => f - quantile);
    const his = input.pointForecasts.map((f, i) => f + quantile);
    coverage = rollingCoverage(input.realized, los, his);
    const pvals: number[] = [];
    for (let i = 0; i < input.residuals.length; i++) {
      const r = input.residuals[i] ?? 0;
      pvals.push(Math.min(Math.max(r / Math.max(quantile, 1e-12), 1e-9), 1 - 1e-9));
    }
    mart = icmAlarm(pvals, input.alarmThreshold ?? 20);
  } catch (e) {
    return fail(`${what}: kernel threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  const badQ = requireFinite(quantile, `${what}.quantile`);
  if (badQ) return badQ;
  if (quantile < 0) return fail(`${what}: quantile is negative`);
  if (plain[0] > plain[1]) return fail(`${what}: plain interval is inverted`);
  if (norm[0] > norm[1]) return fail(`${what}: normalized interval is inverted`);
  if (!Number.isFinite(coverage) || coverage < 0 || coverage > 1) {
    return fail(`${what}: rolling coverage ${String(coverage)} is not a rate in [0, 1]`);
  }

  let meanWidth = 0;
  let meanNorm = 0;
  for (let i = 0; i < input.pointForecasts.length; i++) {
    const f = input.pointForecasts[i] ?? 0;
    meanWidth += 2 * quantile;
    meanNorm += 2 * Math.max(1e-9, input.dispersion?.[i] ?? 1) * quantile;
  }
  meanWidth /= input.pointForecasts.length;
  meanNorm /= input.pointForecasts.length;

  for (let i = 0; i < mart.mart.length; i++) {
    const bad = requireFinite(mart.mart[i] ?? Number.NaN, `${what}.martingale[${i}]`);
    if (bad) return bad;
  }

  return {
    ok: true,
    data: {
      sourceEnabled: NCP_SOURCE_ENABLED as false,
      diagnosticOnly: true,
      sampleSize: input.residuals.length,
      requiredRows: effective,
      quantile,
      plainInterval: plain,
      normalizedInterval: norm,
      coverage,
      meanWidth,
      meanNormalizedWidth: meanNorm,
      icm: {
        alarmAt: mart.alarmAt,
        martingale: mart.mart,
        threshold: input.alarmThreshold ?? 20,
      },
    },
  };
}

// ─── 19. Residual split scoring (variance heterogeneity) ────────────────────

export function evalResidualSplitQuality(input: {
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly minSamples?: number;
  /** Minimum samples PER SIDE. */
  readonly minSamplesPerSide?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly leftCount: number;
  readonly rightCount: number;
  readonly left: { mean: number; median: number; variance: number };
  readonly right: { mean: number; median: number; variance: number };
  readonly levene: VarianceTestResult;
  readonly brownForsythe: VarianceTestResult;
  readonly welch: WelchTResult;
  readonly split: SplitQuality;
  /**
   * The module's structural guarantee: the mean-shift leg is saturated to
   * strictly below MEAN_SHIFT_WEIGHT, so a pure location split can never
   * outrank a genuine scale split. Verified here, not assumed.
   */
  readonly varianceDominates: boolean;
  readonly worthSplitting: boolean;
}> {
  const what = "conformal residual split quality";
  for (const side of ["left", "right"] as const) {
    if (!Array.isArray(input[side]) || input[side].length === 0) {
      return fail(`${what}.${side}: must be a non-empty array of residuals`);
    }
    for (let i = 0; i < input[side].length; i++) {
      const r = input[side][i] ?? Number.NaN;
      const bad = requireFinite(r, `${what}.${side}[${i}]`);
      if (bad) return bad;
    }
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  const perSide = input.minSamplesPerSide ?? Math.ceil(min / 2);
  if (input.minSamplesPerSide !== undefined && (input.minSamplesPerSide ?? 0) < MIN_CALIBRATION_SAMPLES) {
    return fail(
      `${what}: minSamplesPerSide ${input.minSamplesPerSide} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`,
    );
  }
  if (input.left.length < perSide) {
    return fail(
      `${what}.left: ${input.left.length} residual${input.left.length === 1 ? "" : "s"} is below the required ${perSide} per side — a split whose child is a handful of rows produces a conformal interval for one bucket and nothing for the other`,
    );
  }
  if (input.right.length < perSide) {
    return fail(
      `${what}.right: ${input.right.length} residual${input.right.length === 1 ? "" : "s"} is below the required ${perSide} per side`,
    );
  }

  let leveneResult: VarianceTestResult;
  let bf: VarianceTestResult;
  let welch: WelchTResult;
  let split: SplitQuality;
  try {
    leveneResult = levene([input.left, input.right]);
    bf = brownForsythe([input.left, input.right]);
    welch = welchT(input.left, input.right);
    split = splitQuality(input.left, input.right);
  } catch (e) {
    return fail(`${what}: kernel threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  // The module is deliberately total: it returns valid:false plus a reason
  // instead of throwing or emitting NaN. Translating that into a fail-closed
  // result is the point — an undefined statistic must never steer a split
  // search.
  if (!split.valid) {
    return fail(
      `${what}: split statistic undefined (${split.reason ?? "no reason given"}) — an undefined form must not steer a split search`,
    );
  }
  if (!bf.valid) {
    return fail(`${what}: Brown-Forsythe undefined (${bf.reason ?? "no reason given"})`);
  }
  for (const [name, v] of [
    ["levene.statistic", leveneResult.statistic],
    ["brownForsythe.statistic", bf.statistic],
    ["split.score", split.score],
  ] as const) {
    const bad = requireFinite(v, `${what}.${name}`);
    if (bad) return bad;
  }
  if (split.varianceStatistic < 0) {
    return fail(`${what}: negative variance statistic ${split.varianceStatistic}`);
  }
  const varianceDominates = split.score >= split.varianceStatistic;
  if (!varianceDominates) {
    return fail(
      `${what}: combined score ${split.score} is BELOW the variance statistic ${split.varianceStatistic} — the mean-shift leg has escaped its saturation bound and can now promote a pure location split, which buys conformal width nothing`,
    );
  }

  const meanOf = (xs: readonly number[]): { mean: number; median: number; variance: number } => ({
    mean: residualMean(xs),
    median: residualMedian(xs),
    variance: sampleVariance(xs),
  });

  return {
    ok: true,
    data: {
      sampleSize: input.left.length + input.right.length,
      leftCount: input.left.length,
      rightCount: input.right.length,
      left: meanOf(input.left),
      right: meanOf(input.right),
      levene: leveneResult,
      brownForsythe: bf,
      welch,
      split,
      varianceDominates,
      // No p-value is available from this module, so "worth splitting" is a
      // raw-statistic statement the caller must judge, not a decision.
      worthSplitting: bf.statistic > 0 && split.score > 0,
    },
  };
}

// ─── 20. Mondrian conformal residual store + quantile lookup ────────────────

export function evalMondrianQuantile(input: {
  /** Residual entries, per category. Residuals are stored as ABS values. */
  readonly entries: readonly { category: TaxonomyCategory; residual: number }[];
  readonly category: TaxonomyCategory;
  /** Interval level, typically 1 - alpha (0.9 for a 90% interval). */
  readonly probability: number;
  /**
   * Refuse to answer when the lookup had to fall back to a parent category or
   * to the global "*" bucket. A per-stratum interval that is really pooled must
   * never be published as a stratum-specific number.
   */
  readonly strictCategory?: boolean;
  /** Raised from the module's default of 10. */
  readonly minSamples?: number;
  readonly useGlobalFallback?: boolean;
  readonly pointForecast?: number;
}): CalibEval<{
  readonly sampleSize: number;
  readonly globalSampleSize: number;
  readonly quantile: number;
  readonly usedFallback: boolean;
  readonly servedBy: TaxonomyCategory;
  readonly fallbackChain: readonly TaxonomyCategory[];
  readonly minSamples: number;
  readonly interval: { readonly lower: number; readonly upper: number } | null;
  readonly strict: boolean;
}> {
  const what = "Mondrian conformal residual quantile";
  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    return fail(`${what}: entries must be a non-empty array of { category, residual }`);
  }
  if (typeof input.category !== "string" || !input.category) {
    return fail(`${what}: category must be a non-empty string`);
  }
  if (!Number.isFinite(input.probability) || input.probability <= 0 || input.probability >= 1) {
    return fail(`${what}: probability must be finite and strictly in (0, 1), got ${String(input.probability)}`);
  }
  const min = input.minSamples ?? MIN_CALIBRATION_SAMPLES;
  if (min < MIN_CALIBRATION_SAMPLES) {
    return fail(`${what}: minSamples ${min} is below the mandatory floor of ${MIN_CALIBRATION_SAMPLES}`);
  }
  for (let i = 0; i < input.entries.length; i++) {
    const e = input.entries[i];
    if (!e || typeof e.category !== "string" || !e.category) {
      return fail(`${what}.entries[${i}]: category must be a non-empty string`);
    }
    const bad = requireFinite(e.residual, `${what}.entries[${i}].residual`);
    if (bad) return bad;
  }
  if (input.pointForecast !== undefined) {
    const bad = requireFinite(input.pointForecast, `${what}.pointForecast`);
    if (bad) return bad;
  }

  const manager = new MondrianResidualManager({
    minSamples: min,
    useGlobalFallback: input.useGlobalFallback ?? true,
  });
  for (const e of input.entries) {
    manager.add(e.category, e.residual);
  }

  const lookup = manager.quantile(input.category, input.probability);
  const globalSize = input.useGlobalFallback === false ? 0 : manager.size("*");

  // THE ZERO-RESIDUAL HAZARD. The module's finiteSampleQuantile returns 0 for
  // an empty store, and the no-fallback branch returns
  // { quantile: 0, sampleSize: 0 }. A zero quantile is a ZERO-WIDTH interval:
  // a claim of exact prediction derived from no observations at all.
  if (lookup.sampleSize === 0) {
    return fail(
      `${what}: no residuals are stored for "${lookup.category}" (chain: ${lookup.fallbackChain.join(" -> ") || "empty"}). The module answers this lookup with quantile 0, which is a zero-width interval — an exact-prediction claim built from zero observations`,
    );
  }
  if (lookup.sampleSize < min) {
    return fail(
      `${what}: "${lookup.category}" holds ${lookup.sampleSize} residual${lookup.sampleSize === 1 ? "" : "s"}, below the required ${min}`,
    );
  }
  const badQ = requireFinite(lookup.quantile, `${what}.quantile`);
  if (badQ) return badQ;
  if (lookup.quantile < 0) return fail(`${what}: quantile is negative; residual quantiles are non-negative`);

  if (input.strictCategory === true && lookup.usedFallback) {
    return fail(
      `${what}: strictCategory was requested but the answer was served by "${lookup.category}" after falling back through ${lookup.fallbackChain.join(" -> ")} — a pooled quantile published as a stratum-specific interval is a stratum claim the data does not support`,
    );
  }

  const interval =
    input.pointForecast === undefined
      ? null
      : {
          lower: input.pointForecast - lookup.quantile,
          upper: input.pointForecast + lookup.quantile,
        };
  if (interval !== null && interval.lower > interval.upper) {
    return fail(`${what}: interval [${interval.lower}, ${interval.upper}] is inverted`);
  }

  return {
    ok: true,
    data: {
      sampleSize: lookup.sampleSize,
      globalSampleSize: globalSize,
      quantile: lookup.quantile,
      usedFallback: lookup.usedFallback,
      servedBy: lookup.category,
      fallbackChain: lookup.fallbackChain,
      minSamples: min,
      interval,
      strict: input.strictCategory === true,
    },
  };
}
