/**
 * Calibration regression detector — shadow.
 *
 * Compares a CURRENT calibration snapshot against a BASELINE one and flags
 * whether Brier or Murphy resolution moved the wrong way by more than a
 * tolerance. Both snapshots are built from the same decomposition this package
 * already exports (`brierDecomposition`) so this never becomes a second,
 * possibly-inconsistent scorer — see `buildCalibrationSnapshot` below for the
 * pure aggregation step, and `apps/web/lib/ops/calibration-regression-snapshot.ts`
 * for the database-backed wrapper that fetches real settled picks.
 *
 * Deliberately pure and DB-agnostic, like the rest of this package: it takes
 * already-computed snapshots, never queries anything itself.
 */

import { brierDecomposition, type CalibrationSample } from "./probability-calibration";

export interface CalibrationSnapshot {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly baseRate: number;
  readonly sampleSize: number;
  /** Caller-supplied window label (e.g. "2026-07-27..2026-08-10"), for audit trails. */
  readonly windowLabel: string;
}

export interface RegressionCheckOptions {
  /** Brier is WORSE when higher. Flag when current − baseline exceeds this. Default 0.02. */
  readonly brierTolerance?: number;
  /** RES is WORSE when lower. Flag when baseline − current exceeds this. Default 0.01. */
  readonly resolutionTolerance?: number;
  /**
   * Minimum settled sample in BOTH snapshots before a verdict is trusted. Below
   * this, small-sample noise in `brierDecomposition`'s per-bin rates can swing
   * Brier/RES by more than the tolerances above on its own — a "regression" from
   * n=8 is not evidence of anything. Default 20, matching the discrimination-trend
   * gate already used in `apps/web/lib/calibration/compute.ts`.
   */
  readonly minSampleSize?: number;
}

export interface RegressionVerdict {
  readonly regressed: boolean;
  readonly reasons: readonly string[];
  readonly brierDelta: number;
  readonly resolutionDelta: number;
  readonly sufficientSample: boolean;
  readonly current: CalibrationSnapshot;
  readonly baseline: CalibrationSnapshot;
}

const DEFAULT_BRIER_TOLERANCE = 0.02;
const DEFAULT_RESOLUTION_TOLERANCE = 0.01;
const DEFAULT_MIN_SAMPLE_SIZE = 20;

/** Pure aggregation step: turn settled `{p, y}` samples into a labeled snapshot. */
export function buildCalibrationSnapshot(
  samples: readonly CalibrationSample[],
  windowLabel: string,
  bins = 10,
): CalibrationSnapshot {
  const d = brierDecomposition(samples, bins);
  return {
    brier: d.brier,
    reliability: d.reliability,
    resolution: d.resolution,
    uncertainty: d.uncertainty,
    baseRate: d.baseRate,
    sampleSize: d.sampleSize,
    windowLabel,
  };
}

/**
 * Compare `current` against `baseline`. Refuses a verdict (returns
 * `regressed: false` with `sufficientSample: false` and an explanatory reason)
 * below `minSampleSize` in EITHER snapshot, rather than fabricate confidence
 * from a handful of settled picks.
 */
export function checkForRegression(
  current: CalibrationSnapshot,
  baseline: CalibrationSnapshot,
  options: RegressionCheckOptions = {},
): RegressionVerdict {
  const brierTolerance = Number.isFinite(options.brierTolerance)
    ? (options.brierTolerance as number)
    : DEFAULT_BRIER_TOLERANCE;
  const resolutionTolerance = Number.isFinite(options.resolutionTolerance)
    ? (options.resolutionTolerance as number)
    : DEFAULT_RESOLUTION_TOLERANCE;
  const minSampleSize =
    Number.isInteger(options.minSampleSize) && (options.minSampleSize as number) > 0
      ? (options.minSampleSize as number)
      : DEFAULT_MIN_SAMPLE_SIZE;

  const brierDelta = current.brier - baseline.brier;
  const resolutionDelta = current.resolution - baseline.resolution;

  const sufficientSample =
    current.sampleSize >= minSampleSize && baseline.sampleSize >= minSampleSize;

  if (!sufficientSample) {
    return {
      regressed: false,
      reasons: [
        `Insufficient sample: current n=${current.sampleSize}, baseline n=${baseline.sampleSize}, ` +
          `both must be ≥ ${minSampleSize}. No verdict.`,
      ],
      brierDelta,
      resolutionDelta,
      sufficientSample,
      current,
      baseline,
    };
  }

  const reasons: string[] = [];
  if (brierDelta > brierTolerance) {
    reasons.push(
      `Brier worsened by ${brierDelta.toFixed(4)} (current ${current.brier.toFixed(4)} vs baseline ${baseline.brier.toFixed(4)}), exceeding tolerance ${brierTolerance}.`,
    );
  }
  if (-resolutionDelta > resolutionTolerance) {
    reasons.push(
      `Resolution (RES) dropped by ${(-resolutionDelta).toFixed(4)} (current ${current.resolution.toFixed(4)} vs baseline ${baseline.resolution.toFixed(4)}), exceeding tolerance ${resolutionTolerance}.`,
    );
  }

  return {
    regressed: reasons.length > 0,
    reasons,
    brierDelta,
    resolutionDelta,
    sufficientSample,
    current,
    baseline,
  };
}
