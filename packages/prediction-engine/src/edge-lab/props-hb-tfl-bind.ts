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

export const TFL_RATE_BIND_METHOD_TAG = "tfl_rate_bind_v1" as const;

/**
 * One TFL target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior defensive row.
 */
export interface TflBindRequest {
  /** Player gsis id — same gsisId as the PFR defensive rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The TFL sample (snaps / tfl) to enrich. */
  readonly tfl: TflSample;
}

/**
 * `TflSample` enriched with leak-safe PFR defensive covariates. The
 * `snaps` / `tfl` fields are the model's existing realized inputs
 * (unchanged); `tflRate` is a weekly PFR mean, week t for game t+1 — an
 * independent p-path covariate, never y-axis.
 */
export interface BoundTflSample extends TflSample {
  /** Weekly PFR mean TFL rate (tfl per snap), from the covariate bus. */
  readonly tflRate: CovariateCell;
}

/**
 * Result of binding TFL-rate covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundTflSample whose
 *                 covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type TflBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof TFL_RATE_BIND_METHOD_TAG;
      readonly sample: BoundTflSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof TFL_RATE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

/**
 * Bind PFR weekly-mean `tflRate` (from the covariate bus) into a batch
 * of TFL samples, producing leak-safe `BoundTflSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "defense", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `tflRate` directly from that row.
 *      If null/non-finite → refuse `no_prior_row` (fail-closed, never imputed).
 *   4. If valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCell.
 *
 * The bus's cell template (`BUS_CELL`) is the single source of truth for
 * grain/provenance. The value comes directly from the row we already scanned,
 * avoiding a second O(N) scan per field.
 *
 * The weekly mean is NOT per-play frame measurement — every emitted cell
 * carries its grain and provenance.
 */
export function bindTflSamples(
  rows: readonly CovariateRow[],
  requests: readonly TflBindRequest[],
): TflBindResult[] {
  const out: TflBindResult[] = [];
  for (const req of requests) {
    // Single strict-prior scan — not one per covariate field.
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
        methodTag: TFL_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read tflRate directly from the single prior row; fail-closed on null/non-finite.
    const rate = row.tflRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({
        ok: false,
        methodTag: TFL_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: TFL_RATE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        snaps: req.tfl.snaps,
        tfl: req.tfl.tfl,
        // Weekly PFR mean TFL rate (tfl per snap) — cell metadata from bus contract.
        tflRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundTflSamples(
  rows: readonly CovariateRow[],
  requests: readonly TflBindRequest[],
): BoundTflSample[] {
  return bindTflSamples(rows, requests)
    .filter((r): r is Extract<TflBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
