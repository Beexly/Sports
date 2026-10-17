/**
 * INT-rate covariate bind: forwards weekly PFR interception rate into the
 * INTs model (props-hb-int).
 *
 * H2 Edge — Interceptions.
 *
 * This is a BIND, not a model. It couples `intRate` (from the covariate bus)
 * into `IntSample` enrichments for the INTs model.
 *
 * The INTs *model* (props-hb-int) scores raw per-game INT counts via
 * Beta-Binomial over pass attempts. The bind ships `intRate` (weekly PFR
 * mean: INTs per target) as an independent process covariate — the y-axis
 * count model never sees it.
 *
 * HONESTY:
 *  - `intRate` comes from week t for game t+1 (strict prior via
 *    `latestPriorRow`). Never week=0 (season aggregate), never same-week.
 *  - `statType: "defense"`, `provenance: "weekly_pfr_def_mean"` — only
 *    defense rows feed this rate, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or intRate is null/non-finite,
 *    the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { IntSample, IntPrior } from "./props-hb-int.js";
import { intPosterior, probOverInt } from "./props-hb-int.js";

export const INT_BIND_METHOD_TAG = "int_rate_bind_v1" as const;

export interface IntBindRequest {
  readonly gsisId: string;
  readonly season: number;
  readonly kickoffWeek: number;
  /** The INT sample (attempts, ints) to enrich. */
  readonly int: IntSample;
}

export interface BoundIntSample extends IntSample {
  /** Weekly PFR mean interception rate (ints per target) from covariate bus. */
  readonly intRate: CovariateCell;
}

export type IntBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof INT_BIND_METHOD_TAG;
      readonly sample: BoundIntSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof INT_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_pfr_def_mean",
};

/**
 * Bind PFR weekly-mean `intRate` into a batch of INT samples.
 *
 * For each request:
 *   1. latestPriorRow(rows, gsisId, season, "defense", kickoffWeek)
 *      — strict prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `intRate` directly from that row.
 *      If null/non-finite → refuse `no_prior_row` (fail-closed, never imputed).
 *   4. If valid → build the sample with the bus's cell metadata.
 *
 * Never crosses the same-week boundary. The weekly mean is NOT per-play
 * frame measurement.
 */
export function bindIntSamples(
  rows: readonly CovariateRow[],
  requests: readonly IntBindRequest[],
): IntBindResult[] {
  const out: IntBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "defense",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: INT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const rate = row.intRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({
        ok: false,
        methodTag: INT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: INT_BIND_METHOD_TAG,
      priced: false,
      sample: {
        attempts: req.int.attempts,
        ints: req.int.ints,
        intRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundIntSamples(
  rows: readonly CovariateRow[],
  requests: readonly IntBindRequest[],
): BoundIntSample[] {
  return bindIntSamples(rows, requests)
    .filter((r): r is Extract<IntBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}

/**
 * Full pipeline: bind intRate, then score P(INTs > line | attempts).
 *
 * The covariate never enters the y-axis — it is a process covariate
 * attached to the sample, available to downstream pricing layers.
 */
export function scoreIntOver(
  rows: readonly CovariateRow[],
  req: IntBindRequest,
  prior: IntPrior,
  line: number,
): number | null {
  const results = bindIntSamples(rows, [req]);
  if (!results[0] || !results[0].ok) return null;
  const sample = results[0].sample;
  const post = intPosterior(prior, sample.ints, sample.attempts);
  return probOverInt(post, line, sample.attempts);
}
