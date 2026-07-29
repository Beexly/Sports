/**
 * Three proprietary metrics — pure functions over FeatureRecords.
 * Dark until ship criteria on frozen cohort. No fabricated public numbers.
 */

import type { FeatureRecord } from "../types.js";

export interface MetricResult {
  readonly metricId: string;
  readonly value: number | null;
  readonly cohort: string;
  readonly n: number;
  readonly shippable: boolean;
  readonly reason: string;
}

function cohortKey(rows: readonly FeatureRecord[]): string {
  const c = rows.map((r) => r.calibrationCohort).filter(Boolean);
  if (c.length === 0) return "unspecified";
  return [...new Set(c)].sort().join("|");
}

/** Optical Confirmation Score: fraction of events with optical corroboration. */
export function opticalConfirmationScore(
  rows: readonly FeatureRecord[],
): MetricResult {
  const optical = rows.filter((r) => r.sourceRights === "optical_derived");
  const n = rows.length;
  if (n < 30) {
    return {
      metricId: "optical_confirmation_score",
      value: null,
      cohort: cohortKey(rows),
      n,
      shippable: false,
      reason: "sample_floor",
    };
  }
  const value = optical.length / n;
  return {
    metricId: "optical_confirmation_score",
    value,
    cohort: cohortKey(rows),
    n,
    shippable: value >= 0.85 && n >= 100,
    reason: value >= 0.85 && n >= 100 ? "ok" : "below_ship_threshold",
  };
}

/** Decision Latency Edge: mean ms from asOf to modelVersion stamp presence proxy. */
export function decisionLatencyEdge(
  rows: readonly FeatureRecord[],
  decisionMs: readonly number[],
): MetricResult {
  const n = Math.min(rows.length, decisionMs.length);
  if (n < 30) {
    return {
      metricId: "decision_latency_edge",
      value: null,
      cohort: cohortKey(rows),
      n,
      shippable: false,
      reason: "sample_floor",
    };
  }
  const slice = decisionMs.slice(0, n);
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  return {
    metricId: "decision_latency_edge",
    value: mean,
    cohort: cohortKey(rows),
    n,
    shippable: mean <= 2500 && n >= 50,
    reason: mean <= 2500 && n >= 50 ? "ok" : "below_ship_threshold",
  };
}

/** Refusal Calibration Residual: |abstain_rate - target| on selective gate cohort. */
export function refusalCalibrationResidual(
  abstainRate: number,
  targetRate: number,
  n: number,
  cohort: string,
): MetricResult {
  if (!Number.isFinite(abstainRate) || !Number.isFinite(targetRate) || n < 50) {
    return {
      metricId: "refusal_calibration_residual",
      value: null,
      cohort,
      n,
      shippable: false,
      reason: "sample_floor_or_nonfinite",
    };
  }
  const value = Math.abs(abstainRate - targetRate);
  return {
    metricId: "refusal_calibration_residual",
    value,
    cohort,
    n,
    shippable: value <= 0.05 && n >= 100,
    reason: value <= 0.05 && n >= 100 ? "ok" : "below_ship_threshold",
  };
}
