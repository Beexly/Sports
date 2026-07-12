/**
 * Ground-truth validation — the "prove it" half of the IP play.
 *
 * Owning a metric means nothing unless we can show it reproduces reality. Next
 * Gen Stats is the ground truth: its tracking-based CPOE / RYOE / YAC-over-
 * expected are the closest public referee for the same quantities we compute from
 * play-by-play. This module joins OUR per-player over-expected values to NGS's on
 * the shared gsis id and reports how well they agree — Pearson and Spearman
 * correlation, RMSE, MAE, and bias.
 *
 * GRAIN DISCIPLINE (do not skip): the two series MUST be at the same aggregation
 * grain, or the correlation is a fiction. That means: same season, same season
 * type (REG), the SAME per-player qualifier (min attempts/targets), and the same
 * player-id key. The join here is per playerId only — it is the CALLER's job to
 * have produced both sides at the identical grain. Correlating a per-play series
 * against a per-season series, or a min-100-attempt pool against a min-1 pool,
 * inflates or destroys the number. The loader that feeds this enforces the grain;
 * this module documents and assumes it.
 *
 * Pure and deterministic — no fetching, no NGS numbers copied into our outputs.
 * NGS values enter ONLY as the y-axis of a correlation, never as a served metric.
 */

import { mae, mean, pearson, rmse, round, spearman } from "./numeric.js";
import type { PlayerExpectedMetric } from "./types.js";

/** One ground-truth observation keyed by the shared gsis player id. */
export interface GroundTruthPoint {
  readonly playerId: string;
  /** The NGS value for this player at the matched grain (e.g. NGS CPOE). */
  readonly value: number;
}

/** Agreement statistics between our metric and the ground-truth series. */
export interface CalibrationReport {
  /** Number of players present in BOTH series (the inner join size). */
  readonly n: number;
  /** Pearson correlation of (ours, truth) over the joined players. */
  readonly pearson: number;
  /** Spearman rank correlation — robust to monotone nonlinearity/outliers. */
  readonly spearman: number;
  /** RMSE of ours vs truth (same units; only meaningful when units align). */
  readonly rmse: number;
  /** MAE of ours vs truth. */
  readonly mae: number;
  /** Mean(ours − truth): systematic offset between our metric and NGS. */
  readonly bias: number;
  /** Mean of our values over the joined players. */
  readonly ourMean: number;
  /** Mean of the ground-truth values over the joined players. */
  readonly truthMean: number;
}

/**
 * Join our per-player metric to a ground-truth series by playerId and compute
 * the agreement report. `select` picks which field of our metric to correlate
 * (default: `overExpected`). Players missing from either side are dropped (inner
 * join). A join of fewer than 2 players yields an all-zero report (no correlation
 * is estimable) rather than NaN.
 */
export function buildCalibrationReport(
  ours: readonly PlayerExpectedMetric[],
  truth: readonly GroundTruthPoint[],
  select: (metric: PlayerExpectedMetric) => number = (m) => m.overExpected,
): CalibrationReport {
  const truthById = new Map<string, number>();
  for (const t of truth) {
    if (t.playerId && Number.isFinite(t.value)) truthById.set(t.playerId, t.value);
  }
  const ourVals: number[] = [];
  const truthVals: number[] = [];
  for (const metric of ours) {
    const tv = truthById.get(metric.playerId);
    if (tv === undefined) continue;
    const ov = select(metric);
    if (!Number.isFinite(ov)) continue;
    ourVals.push(ov);
    truthVals.push(tv);
  }

  const n = ourVals.length;
  if (n < 2) {
    return { n, pearson: 0, spearman: 0, rmse: 0, mae: 0, bias: 0, ourMean: 0, truthMean: 0 };
  }
  const ourMean = mean(ourVals);
  const truthMean = mean(truthVals);
  return {
    n,
    pearson: round(pearson(ourVals, truthVals), 4),
    spearman: round(spearman(ourVals, truthVals), 4),
    rmse: round(rmse(ourVals, truthVals), 4),
    mae: round(mae(ourVals, truthVals), 4),
    bias: round(ourMean - truthMean, 4),
    ourMean: round(ourMean, 4),
    truthMean: round(truthMean, 4),
  };
}

/**
 * Play-grain agreement report between OUR per-play series and a referee per-play
 * series (nflverse `ep`/`epa` or `wp`), reusing the same numeric.ts primitives as
 * the player-keyed report — no second statistics kernel. `n` counts paired plays
 * (both finite); fewer than 2 paired plays yields an all-zero report, never NaN.
 *
 * GRAIN DISCIPLINE: the two arrays MUST be index-aligned at the identical play
 * grain — same season, same season type (REG), joined on `game_id`+`play_id`, with
 * EPA validation restricted to non-terminal plays on BOTH sides. The caller (the
 * loader) enforces the join; this helper documents and assumes it.
 */
function buildPlayGrainCalibration(
  ours: readonly number[],
  truth: readonly number[],
): CalibrationReport {
  const ourVals: number[] = [];
  const truthVals: number[] = [];
  const len = Math.min(ours.length, truth.length);
  for (let i = 0; i < len; i++) {
    const ov = ours[i] ?? Number.NaN;
    const tv = truth[i] ?? Number.NaN;
    if (!Number.isFinite(ov) || !Number.isFinite(tv)) continue;
    ourVals.push(ov);
    truthVals.push(tv);
  }

  const n = ourVals.length;
  if (n < 2) {
    return { n, pearson: 0, spearman: 0, rmse: 0, mae: 0, bias: 0, ourMean: 0, truthMean: 0 };
  }
  const ourMean = mean(ourVals);
  const truthMean = mean(truthVals);
  return {
    n,
    pearson: round(pearson(ourVals, truthVals), 4),
    spearman: round(spearman(ourVals, truthVals), 4),
    rmse: round(rmse(ourVals, truthVals), 4),
    mae: round(mae(ourVals, truthVals), 4),
    bias: round(ourMean - truthMean, 4),
    ourMean: round(ourMean, 4),
    truthMean: round(truthMean, 4),
  };
}

/**
 * Prove our per-play EP against nflverse `ep` (or our EPA against `epa`) as REFEREE
 * only. `ourEp` and `truthEp` are index-aligned per-play series at the same grain.
 */
export function buildEpCalibration(
  ourEp: readonly number[],
  truthEp: readonly number[],
): CalibrationReport {
  return buildPlayGrainCalibration(ourEp, truthEp);
}

/**
 * Prove our per-play WP against nflverse `wp` as REFEREE only. `ourWp` and `truthWp`
 * are index-aligned per-play series at the same grain.
 */
export function buildWpCalibration(
  ourWp: readonly number[],
  truthWp: readonly number[],
): CalibrationReport {
  return buildPlayGrainCalibration(ourWp, truthWp);
}

export type GraduationVerdict = "graduated" | "provisional" | "insufficient-sample" | "failed";

/** Thresholds for grading a metric against ground truth. */
export interface GraduationThresholds {
  /** Minimum joined players before any correlation verdict is trustworthy. */
  readonly minSample: number;
  /** Pearson at/above this → graduated (metric reproduces ground truth). */
  readonly graduatedPearson: number;
  /** Pearson at/above this (but below graduated) → provisional. */
  readonly provisionalPearson: number;
}

export interface GraduationResult {
  readonly verdict: GraduationVerdict;
  readonly reason: string;
  readonly report: CalibrationReport;
  readonly thresholds: GraduationThresholds;
}

/**
 * Default, HONEST thresholds per metric family. These reflect how much of NGS's
 * tracking-based signal is recoverable from public play-by-play:
 *  - CPOE is mostly a function of pass depth + pressure, both public → high bar.
 *  - xYAC is air-yards-driven but also depends on defender proximity → medium bar.
 *  - RYOE leans hardest on box counts / closing speed we cannot see → lower bar.
 * Setting these truthfully is the point: we grade ourselves against what a public
 * reconstruction can actually achieve, not against a number we wish we hit.
 */
export const DEFAULT_GRADUATION_THRESHOLDS = {
  cpoe: { minSample: 12, graduatedPearson: 0.6, provisionalPearson: 0.35 },
  ryoe: { minSample: 12, graduatedPearson: 0.4, provisionalPearson: 0.2 },
  xyac: { minSample: 12, graduatedPearson: 0.5, provisionalPearson: 0.25 },
  // EP/WP are play-grain: `minSample` is reinterpreted as paired PLAYS, not players.
  // The bars are HIGH because EP and WP are almost fully functions of the public
  // situation (down/distance/field/score/time), so a faithful public reconstruction
  // should correlate strongly with the referee — we hold ourselves to that.
  ep: { minSample: 200, graduatedPearson: 0.9, provisionalPearson: 0.75 },
  wp: { minSample: 200, graduatedPearson: 0.9, provisionalPearson: 0.8 },
} as const satisfies Record<string, GraduationThresholds>;

/**
 * Grade a calibration report into a graduation verdict. Uses Pearson as the
 * headline; a metric "graduates" only when the joined sample is large enough AND
 * the correlation clears the (honest) bar for that metric family.
 */
export function graduationVerdict(
  report: CalibrationReport,
  thresholds: GraduationThresholds,
): GraduationResult {
  if (report.n < thresholds.minSample) {
    return {
      verdict: "insufficient-sample",
      reason: `Only ${report.n} players joined ground truth; need ≥ ${thresholds.minSample} before grading.`,
      report,
      thresholds,
    };
  }
  if (report.pearson >= thresholds.graduatedPearson) {
    return {
      verdict: "graduated",
      reason: `Pearson ${report.pearson} ≥ ${thresholds.graduatedPearson} over ${report.n} players — reproduces ground truth.`,
      report,
      thresholds,
    };
  }
  if (report.pearson >= thresholds.provisionalPearson) {
    return {
      verdict: "provisional",
      reason: `Pearson ${report.pearson} in [${thresholds.provisionalPearson}, ${thresholds.graduatedPearson}) over ${report.n} players — directionally aligned, not yet graduated.`,
      report,
      thresholds,
    };
  }
  return {
    verdict: "failed",
    reason: `Pearson ${report.pearson} < ${thresholds.provisionalPearson} over ${report.n} players — does not track ground truth.`,
    report,
    thresholds,
  };
}
