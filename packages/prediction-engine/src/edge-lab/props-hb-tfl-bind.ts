/**
 * TFL covariate bind: forwards weekly PFR TFL rate into the TFL model.
 *
 * H1 Edge #2 — TFL (tackles for loss).
 *
 * This is a BIND, not a model. It couples `tflRate` (from the covariate bus)
 * into `TflSample` enrichments for the TFL model (props-hb-tfl).
 *
 * PFR `advstats_week_def` publishes per-player-game TFL data. This bind
 * forwards the leak-safe weekly mean verbatim — week t for game t+1 — and
 * never crosses the same-week boundary.
 *
 * Fail-closed: if no prior per-game row exists, or tflRate is null /
 * non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { TflSample } from "./props-hb-tfl.js";

export const TFL_BIND_METHOD_TAG = "tfl_rate_bind_v1" as const;

export interface TflBindRequest {
  readonly gsisId: string;
  readonly season: number;
  readonly kickoffWeek: number;
  readonly tfl: TflSample;
}

export interface BoundTflSample extends TflSample {
  readonly tflRate: CovariateCell;
}

export type TflBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof TFL_BIND_METHOD_TAG;
      readonly sample: BoundTflSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof TFL_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

export function bindTflSamples(
  rows: readonly CovariateRow[],
  requests: readonly TflBindRequest[],
): TflBindResult[] {
  const out: TflBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(rows, req.gsisId, req.season, "defense", req.kickoffWeek);
    if (row === null) {
      out.push({ ok: false, methodTag: TFL_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    // Read tflRate directly from the prior row; fail-closed on null/non-finite.
    const rate = row.tflRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({ ok: false, methodTag: TFL_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    out.push({
      ok: true,
      methodTag: TFL_BIND_METHOD_TAG,
      priced: false,
      sample: { snaps: req.tfl.snaps, tfl: req.tfl.tfl, tflRate: { ...BUS_CELL, value: rate } },
    });
  }
  return out;
}

export function boundTflSamples(rows: readonly CovariateRow[], requests: readonly TflBindRequest[]): BoundTflSample[] {
  return bindTflSamples(rows, requests)
    .filter((r): r is Extract<TflBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
