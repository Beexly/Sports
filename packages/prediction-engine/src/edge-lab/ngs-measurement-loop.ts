/**
 * NGS as MEASUREMENT, not as live p.
 *
 * Reconstruction (SEP) and expected-metrics (CPOE / RYOE / xYAC) already have
 * graduation verdicts. This loop is the missing join: our number vs nflverse
 * NGS truth on gsis id, same grain. It never copies NGS into a served metric
 * and never touches MODEL_VERSION. priced:false.
 *
 * Callers load NGS via ngsReceivingToSeparationTruth / ngsPassingToCpoeTruth
 * (data-ingestion) and pass the already-shaped series. Pure, no I/O.
 */

import {
  buildCalibrationReport,
  graduationVerdict,
  DEFAULT_GRADUATION_THRESHOLDS,
  type CalibrationReport,
  type GraduationResult,
  type GroundTruthPoint,
} from "../expected-metrics/validation.js";
import { mean, pearson, rmse, mae } from "../expected-metrics/numeric.js";
import type { PlayerExpectedMetric } from "../expected-metrics/types.js";

export const NGS_MEASURE_METHOD_TAG = "ngs_measurement_loop_v1" as const;

export type SepPrediction = {
  readonly playerId: string;
  readonly value: number;
};

export type SepTruth = {
  readonly playerId: string;
  readonly actual: number;
};

export type SepMeasurement = {
  readonly ok: true;
  readonly methodTag: typeof NGS_MEASURE_METHOD_TAG;
  readonly n: number;
  readonly pearson: number;
  readonly rmse: number;
  readonly mae: number;
  /** 1 − MSE(pred)/MSE(climatology). ≤0 means reconstruction adds no skill. */
  readonly skillVsClimatology: number | null;
  readonly priced: false;
};

export type MeasureDenied = {
  readonly ok: false;
  readonly methodTag: typeof NGS_MEASURE_METHOD_TAG;
  readonly priced: false;
  readonly refuse: "empty" | "too_small";
  readonly n: number;
};

/**
 * Inner-join reconstructed SEP (or any point estimate) to NGS avg_separation
 * by playerId. Climatology baseline = mean of NGS actuals on the join.
 */
export function measureSeparationAgainstNgs(
  predicted: readonly SepPrediction[],
  truth: readonly SepTruth[],
): SepMeasurement | MeasureDenied {
  const tag = NGS_MEASURE_METHOD_TAG;
  const actualById = new Map<string, number>();
  for (const t of truth) {
    if (t.playerId && Number.isFinite(t.actual) && t.actual >= 0) actualById.set(t.playerId, t.actual);
  }
  const pred: number[] = [];
  const act: number[] = [];
  for (const p of predicted) {
    if (!p.playerId || !Number.isFinite(p.value)) continue;
    const a = actualById.get(p.playerId);
    if (a === undefined) continue;
    pred.push(p.value);
    act.push(a);
  }
  const n = pred.length;
  if (n === 0) return { ok: false, methodTag: tag, priced: false, refuse: "empty", n: 0 };
  if (n < 2) return { ok: false, methodTag: tag, priced: false, refuse: "too_small", n };

  const clim = mean(act);
  let mseM = 0;
  let mseC = 0;
  for (let i = 0; i < n; i++) {
    mseM += (pred[i]! - act[i]!) ** 2;
    mseC += (clim - act[i]!) ** 2;
  }
  const skill = mseC <= 0 ? null : 1 - mseM / mseC;
  return {
    ok: true,
    methodTag: tag,
    n,
    pearson: pearson(pred, act),
    rmse: rmse(pred, act),
    mae: mae(pred, act),
    skillVsClimatology: skill,
    priced: false,
  };
}

export type ExpectedFamily = "cpoe" | "ryoe" | "xyac";

export type ExpectedMeasurement = {
  readonly ok: true;
  readonly methodTag: typeof NGS_MEASURE_METHOD_TAG;
  readonly family: ExpectedFamily;
  readonly report: CalibrationReport;
  readonly graduation: GraduationResult;
  readonly priced: false;
};

/**
 * Our CPOE/RYOE/xYAC vs NGS truth. NGS is the y-axis only.
 * Graduation uses the honest public-PBP bars in DEFAULT_GRADUATION_THRESHOLDS.
 */
export function measureExpectedAgainstNgs(
  family: ExpectedFamily,
  ours: readonly PlayerExpectedMetric[],
  truth: readonly GroundTruthPoint[],
): ExpectedMeasurement | MeasureDenied {
  const tag = NGS_MEASURE_METHOD_TAG;
  if (ours.length === 0 || truth.length === 0) {
    return { ok: false, methodTag: tag, priced: false, refuse: "empty", n: 0 };
  }
  const report = buildCalibrationReport(ours, truth);
  if (report.n < 2) {
    return { ok: false, methodTag: tag, priced: false, refuse: "too_small", n: report.n };
  }
  return {
    ok: true,
    methodTag: tag,
    family,
    report,
    graduation: graduationVerdict(report, DEFAULT_GRADUATION_THRESHOLDS[family]),
    priced: false,
  };
}
