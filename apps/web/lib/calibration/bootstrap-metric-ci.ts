/**
 * Seeded percentile bootstrap for the pooled Brier and ECE.
 *
 * bootstrap-calib-ci.ts bands a fitted calibration MAP over a score grid; it
 * cannot produce an interval for a scalar metric, so this sits next to it and
 * shares its PRNG. Fixed default seed: the artifact is reproducible and the
 * tests are deterministic. Same metric functions as the pooled numbers.
 * Internal eligibility surface only; not a public claim.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import { mulberry32 } from "@/lib/calibration/bootstrap-calib-ci";

export type MetricCi95 = {
  readonly lo: number;
  readonly hi: number;
  readonly resamples: number;
};

export type CalibrationMetricCis = {
  readonly brierCi95: MetricCi95;
  readonly eceCi95: MetricCi95;
  readonly seed: number;
};

export const DEFAULT_METRIC_CI_RESAMPLES = 200;
/** Fixed so two runs on the same sample give the same interval. */
export const DEFAULT_METRIC_CI_SEED = 20260905;

/**
 * Reading caveat carried next to brierCi95 / eceCi95 on every artifact, so a
 * reader never meets an interval that misses its own point estimate without
 * the reason beside it.
 */
export const METRIC_CI_READING_NOTE =
  "brierCi95 / eceCi95 are seeded percentile bootstrap intervals (2.5% to 97.5%, same metric functions as the pooled row), internal only. ECE is bounded at zero, so when the pooled ECE is at or near 0 the interval sits above the point estimate: that is resampling and binning noise, not a containment failure. On an interior ECE the interval covers it; the Brier interval covers its estimate either way.";

function percentile95(values: number[]): { lo: number; hi: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const last = sorted.length - 1;
  const lo = sorted[Math.floor(0.025 * last)] ?? sorted[0] ?? 0;
  const hi = sorted[Math.ceil(0.975 * last)] ?? sorted[last] ?? 0;
  return { lo, hi };
}

/**
 * Percentile bootstrap (2.5% .. 97.5%) of the pooled Brier and ECE.
 * Returns null below two samples; a single row has no resampling variance.
 *
 * Reading note: ECE is bounded at zero and every resample carries binning
 * noise, so when the pooled ECE is at or near 0 (a sample calibrated by
 * construction) the interval sits above the point estimate. That is the
 * percentile method reporting resampling noise, not a containment failure; on
 * a sample whose pooled ECE is an interior value (production reads 0.044) the
 * interval covers it. Brier, a mean with no lower boundary in play, is covered
 * either way.
 */
export function bootstrapCalibrationMetricCis(
  samples: readonly CalibrationSample[],
  options?: { readonly resamples?: number; readonly seed?: number },
): CalibrationMetricCis | null {
  const n = samples.length;
  if (n < 2) return null;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? DEFAULT_METRIC_CI_RESAMPLES));
  const seed = options?.seed ?? DEFAULT_METRIC_CI_SEED;
  const rand = mulberry32(seed);

  const briers: number[] = [];
  const eces: number[] = [];
  const draw: CalibrationSample[] = new Array<CalibrationSample>(n);
  for (let b = 0; b < resamples; b++) {
    for (let i = 0; i < n; i++) {
      draw[i] = samples[Math.floor(rand() * n)]!;
    }
    briers.push(brierDecomposition(draw).brier);
    eces.push(expectedCalibrationError(draw));
  }

  const brier = percentile95(briers);
  const ece = percentile95(eces);
  return {
    brierCi95: { lo: brier.lo, hi: brier.hi, resamples },
    eceCi95: { lo: ece.lo, hi: ece.hi, resamples },
    seed,
  };
}
