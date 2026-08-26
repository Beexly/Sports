/**
 * Feature-exposure tracking via Spearman rank correlation (Numerai-style).
 *
 * EDGE THESIS: Numerai scores each submission by its Spearman rank correlation
 * against every visible feature column ("feature exposure"). High exposure means
 * the model is largely RE-DERIVING that single factor — overfit to the current
 * regime and fragile when the regime shifts. The repo pools many referees
 * (Kalshi/Elo/Poisson/devig market) whose outputs can silently collapse onto one
 * dominant signal (e.g. everything tracks the market line). This module makes
 * that collapse measurable: for each named feature column, report |spearman|
 * between the pooled prediction and the feature, plus the max exposure.
 *
 * This is the pure math layer only — it does NOT decide what to do about high
 * exposure (suppression/neutralization stays with calibration machinery) and
 * does NOT wire into any gate — research/feature use only.
 *
 * Honesty rules: fail closed on empty input or length mismatches; features with
 * too few distinct values to rank meaningfully are reported as null exposure,
 * never imputed as zero. Thresholds are caller-supplied and never inferred here.
 *
 * References:
 * - Numerai docs, "Scoring definitions": feature exposure measured as Spearman
 *   rank correlation coefficient (SRCC) between predictions and each feature;
 *   lower is safer; feature-neutralization subtracts the projected component.
 * - Satopää et al. (2014): information overlap double-counting motivates
 *   measuring how much shared structure a single pool member carries.
 */

import { spearman } from "../../expected-metrics/numeric.js";

export interface FeatureColumn {
  readonly name: string;
  /** Per-event values of this feature, aligned index-for-index with `predictions`. */
  readonly values: readonly number[];
}

export interface FeatureExposure {
  readonly name: string;
  /**
   * |spearman(predictions, values)| in [0,1]; null when the column has fewer
   * than 2 rows, non-finite entries, or fewer than 2 distinct values (no
   * meaningful ranking exists).
   */
  readonly exposure: number | null;
  /** True when exposure !== null && exposure >= threshold. */
  readonly flagged: boolean;
  /** Row count actually evaluated for this column. */
  readonly n: number;
}

export interface FeatureExposureResult {
  /** One entry per requested column, in input order. */
  readonly exposures: readonly FeatureExposure[];
  /** Max |spearman| across evaluable columns; null if none were evaluable. */
  readonly maxExposure: number | null;
  /** Name of the column attaining maxExposure; null if none evaluable. */
  readonly maxExposureFeature: string | null;
  /** Columns reported as null exposure (degenerate inputs), by name. */
  readonly skipped: readonly string[];
}

export interface FeatureExposureOptions {
  /**
   * Flag columns whose |spearman| meets or exceeds this value. Caller-supplied
   * policy knob (Numerai-style monitoring commonly watches ~0.5+); never inferred.
   */
  readonly flagThreshold?: number;
}

function hasFiniteAll(values: readonly number[]): boolean {
  return values.every((v) => Number.isFinite(v));
}

function distinctCount(values: readonly number[]): number {
  return new Set(values).size;
}

/**
 * Measure how strongly a pooled prediction tracks each supplied feature column.
 * Pure; no I/O. Predictions must be finite numbers in [0,1].
 */
export function featureExposure(
  predictions: readonly number[],
  features: readonly FeatureColumn[],
  options: FeatureExposureOptions = {},
): FeatureExposureResult {
  const threshold = options.flagThreshold ?? Number.POSITIVE_INFINITY;

  if (!Number.isFinite(threshold)) {
    // Only reject a non-finite THRESHOLD outright; Infinity default means "flag nothing".
    if (options.flagThreshold !== undefined) {
      throw new Error("flagThreshold must be a finite number");
    }
  }
  if (predictions.length === 0) {
    throw new Error("predictions must contain at least one entry");
  }
  if (!hasFiniteAll(predictions)) {
    throw new Error("predictions must all be finite");
  }
  for (const p of predictions) {
    if (p < 0 || p > 1) throw new Error("predictions must lie in [0,1]");
  }

  const exposures: FeatureExposure[] = [];
  const skipped: string[] = [];

  for (const f of features) {
    const n = Math.min(predictions.length, f.values.length);
    let exposure: number | null = null;

    if (
      f.values.length === predictions.length &&
      n >= 2 &&
      hasFiniteAll(f.values) &&
      distinctCount(f.values.slice(0, n)) >= 2 &&
      distinctCount(predictions.slice(0, n)) >= 2
    ) {
      const rho = spearman(predictions.slice(0, n), f.values.slice(0, n));
      if (Number.isFinite(rho)) {
        exposure = Math.abs(rho);
      }
    }

    if (exposure === null) {
      skipped.push(f.name);
      exposures.push({ name: f.name, exposure: null, flagged: false, n });
      continue;
    }

    exposures.push({
      name: f.name,
      exposure,
      flagged: exposure >= threshold,
      n,
    });
  }

  let maxExposure: number | null = null;
  let maxExposureFeature: string | null = null;
  for (const e of exposures) {
    if (e.exposure !== null && (maxExposure === null || e.exposure > maxExposure)) {
      maxExposure = e.exposure;
      maxExposureFeature = e.name;
    }
  }

  return { exposures, maxExposure, maxExposureFeature, skipped };
}
