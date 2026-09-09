/**
 * Per-slice calibration metrics (bySport, byModelVersion) for the metrics
 * artifact. Same functions as the pooled numbers (brierDecomposition,
 * expectedCalibrationError) so a slice can be compared to the pooled row
 * without a basis change. Internal eligibility surface; never a public claim.
 *
 * `smallSample` (ledger C-176/178, 2026-09-09): a slice below the pooled
 * eligibility floor (`DEFAULT_CALIBRATION_FLOORS.n`, currently 100) reads
 * inside or near the pure-noise band for its own sample size (AGENTS.md's
 * own NCAAF n 65/74 and NFL n 28 readings say so explicitly). This module's
 * own header already says the slice surface is "never a public claim"; the
 * flag makes that enforceable by any consumer instead of relying on every
 * caller to remember the rule. It does not change the numbers or hide the
 * slice — only marks whether it clears the floor a benchmark claim needs.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import { DEFAULT_CALIBRATION_FLOORS } from "@/lib/ops/calibration-eligibility";

export type CalibrationSliceMetrics = {
  /** Slice label (sport key or model version); "unknown" when the row had none. */
  readonly key: string;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  /** Murphy reliability term (lower is better; the floor is applied to the pooled value). */
  readonly murphyRel: number;
  readonly hitRate: number;
  readonly meanP: number;
  /** True when n is below the pooled eligibility floor: illustrative only, never a benchmark. */
  readonly smallSample: boolean;
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
  for (const [key, rows] of groups) {
    const d = brierDecomposition(rows);
    const wins = rows.reduce((a, s) => a + s.y, 0);
    const pSum = rows.reduce((a, s) => a + s.p, 0);
    out.push({
      key,
      n: rows.length,
      brier: d.brier,
      ece: expectedCalibrationError(rows),
      murphyRel: d.reliability,
      hitRate: wins / rows.length,
      meanP: pSum / rows.length,
      smallSample: rows.length < DEFAULT_CALIBRATION_FLOORS.n,
    });
  }
  out.sort((a, b) => (b.n - a.n) || a.key.localeCompare(b.key));
  return out;
}
