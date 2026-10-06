/**
 * Per-slice calibration metrics (bySport, byModelVersion) for the metrics
 * artifact. Same functions as the pooled numbers (brierDecomposition,
 * expectedCalibrationError) so a slice can be compared to the pooled row
 * without a basis change. Internal eligibility surface; never a public claim.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";
import { mulberry32 } from "@/lib/calibration/bootstrap-calib-ci";
import { canonicalSampleOrder } from "@/lib/calibration/canonical-sample-order";

export const SLICE_CI_RESAMPLES = 200;
export const SLICE_CI_SEED = 0x5eed_c298;
export const SLICE_CI_MIN_N = 30;

/**
 * C-298: 5th-percentile bootstrap of the per-bin variance-corrected ECE on a
 * slice's own rows. Seeded and deterministic. Uses the analytic correction
 * only (replications 0): the Monte Carlo null is a diagnostic, not part of
 * the corrected estimate, and 200 resamples x 400 draws would be pure cost.
 */
export function bootstrapDebiasedEceLowerBound(
  rows: readonly CalibrationSample[],
  options?: { readonly resamples?: number; readonly seed?: number },
): number | null {
  const n = rows.length;
  if (n < SLICE_CI_MIN_N) return null;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? SLICE_CI_RESAMPLES));
  const rand = mulberry32(options?.seed ?? SLICE_CI_SEED);
  const draws = new Array<number>(resamples);
  const sample = new Array<CalibrationSample>(n);
  for (let r = 0; r < resamples; r += 1) {
    for (let i = 0; i < n; i += 1) sample[i] = rows[Math.floor(rand() * n)]!;
    draws[r] = debiasedExpectedCalibrationError(sample, 10, 0).debiased;
  }
  draws.sort((a, b) => a - b);
  const idx = Math.min(resamples - 1, Math.max(0, Math.floor(0.05 * resamples)));
  return Math.round(draws[idx]! * 1e6) / 1e6;
}

export type CalibrationSliceMetrics = {
  /** Slice label (sport key or model version); "unknown" when the row had none. */
  readonly key: string;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  /**
   * C-292: the same finite-sample correction the pooled floor reads (C-290),
   * computed on the slice's OWN rows. A slice is small by construction, so its
   * raw ECE carries MORE noise bias than the pool's; without these the C-275
   * deployed-version floor would penalise a fresh version for having few rows
   * rather than for being miscalibrated. `eceNoise` is the expected raw ECE of
   * a perfectly calibrated forecaster on this slice (diagnostic); `eceDebiased`
   * is the per-bin variance-corrected value the deployed-version check reads.
   */
  readonly eceNoise: number;
  readonly eceDebiased: number;
  /**
   * C-298: seeded percentile-bootstrap lower bound (5th percentile, 200
   * resamples) of the slice's eceDebiased. A slice is a fraction of the pool,
   * so holding it to the pooled point-estimate floor fails it for sample size,
   * not calibration; the deployed-version floor reads this bound instead and
   * fails a version only when its calibration error is demonstrably above the
   * floor. Null when the slice has fewer than 30 rows (a bound on that little
   * data says nothing).
   */
  readonly eceDebiasedCi90Lo: number | null;
  /** Murphy reliability term (lower is better; the floor is applied to the pooled value). */
  readonly murphyRel: number;
  /**
   * Murphy RESOLUTION term (C-276). HIGHER is better — it is the only term that
   * says whether the slice's forecasts RANK outcomes, rather than merely being
   * calibrated. Distinct from murphyRel above, and pulling the opposite way;
   * confusing the two inverts the reading.
   *
   * Why it is here: every eligibility floor (n, Brier, ECE, murphyRel) measures
   * calibration or volume. A forecaster that ignores its inputs and always
   * predicts the base rate is perfectly calibrated by construction and clears
   * all four, with RES exactly 0. So the floors cannot distinguish a model with
   * skill from one with none.
   *
   * `brierDecomposition` already computed this for every slice and the value was
   * discarded. Recording it does not floor it and changes no gate — but a floor
   * cannot be argued about, let alone set, on a number nobody measures.
   */
  readonly murphyRes: number;
  readonly hitRate: number;
  readonly meanP: number;
};

export const UNKNOWN_SLICE_KEY = "unknown";

/**
 * Group samples by `keyOf` and compute the metrics per group. Slices are
 * sorted by n descending, then key, so the largest slice reads first.
 */
export function sliceCalibrationMetrics<T extends CalibrationSample>(
  samples: readonly T[],
  keyOf: (sample: T) => string | null | undefined,
): CalibrationSliceMetrics[] {
  const groups = new Map<string, T[]>();
  for (const s of samples) {
    const raw = keyOf(s);
    const key = typeof raw === "string" && raw.length > 0 ? raw : UNKNOWN_SLICE_KEY;
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  const out: CalibrationSliceMetrics[] = [];
  for (const [key, bucket] of groups) {
    // Seeded estimators are order-sensitive (see canonical-sample-order.ts): a
    // different permutation of the same rows produced a different 5th-percentile
    // bound and flipped eligibility GREEN → RED on 09-10. Canonicalise first.
    const rows = canonicalSampleOrder(bucket);
    const d = brierDecomposition(rows);
    const corrected = debiasedExpectedCalibrationError(rows);
    const wins = rows.reduce((a, s) => a + s.y, 0);
    const pSum = rows.reduce((a, s) => a + s.p, 0);
    out.push({
      key,
      n: rows.length,
      brier: d.brier,
      ece: expectedCalibrationError(rows),
      eceNoise: corrected.noise,
      eceDebiased: corrected.debiased,
      eceDebiasedCi90Lo: bootstrapDebiasedEceLowerBound(rows),
      murphyRel: d.reliability,
      murphyRes: d.resolution,
      hitRate: wins / rows.length,
      meanP: pSum / rows.length,
    });
  }
  out.sort((a, b) => (b.n - a.n) || a.key.localeCompare(b.key));
  return out;
}
