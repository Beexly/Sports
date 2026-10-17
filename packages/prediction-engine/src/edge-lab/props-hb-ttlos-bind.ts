/**
 * TtLOS (time-to-LOS) covariate bind: forwards weekly NGS `avgTimeToLos`
 * into RushAttemptsSample enrichments for the rush-attempts volume model
 * (props-hb-rush-attempts).
 *
 * H2 Edge — Rush Attempts (swarm-PRE-6: ttlos -> rushAttempts, SIGN − soft).
 *
 * EDGE THESIS: Books price rush-attempt props off season volume and game
 * script but miss the tempo/defense-depth signal. A back whose carries take
 * longer to develop (slower snap-to-LOS time) is running into deeper boxes /
 * longer-developing designs — coordinators pull him for quicker-hitting
 * backs. avgTimeToLos is the independent p-path process covariate the
 * attempts model never sees.
 *
 * This is a BIND, not a model. It couples `avgTimeToLos` (from the covariate
 * bus) into RushAttemptsSample enrichments for the rush-attempts model.
 *
 * The rush-attempts *model* (props-hb-rush-attempts) scores attempt counts
 * via Gamma-Poisson per-game rate (games = denominator). The bind ships
 * `avgTimeToLos` (weekly NGS mean: seconds from snap to LOS crossing) as an
 * independent process covariate — the y-axis count model never sees it as a
 * predictor.
 *
 * HONESTY:
 *  - `avgTimeToLos` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "rushing"`, `provenance: "weekly_ngs_mean"` — only rushing
 *    NGS rows feed this metric, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or avgTimeToLos is null/non-finite,
 *    the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { RushAttemptsSample } from "./props-hb-rush-attempts.js";

export const TTLOS_BIND_METHOD_TAG = "ttlos_bind_v1" as const;

/**
 * One rush-attempts target that needs the TtLOS covariate-bind from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior rushing row.
 */
export interface TtlosBindRequest {
  /** Player gsis id — same gsisId as the NGS rushing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rush-attempts sample (games, attempts) to enrich. */
  readonly rushAttempts: RushAttemptsSample;
}

/**
 * `RushAttemptsSample` enriched with leak-safe NGS avgTimeToLos. The `games` /
 * `attempts` fields are the model's existing realized inputs (unchanged);
 * `avgTimeToLos` is the weekly NGS mean seconds-to-LOS, week t for game t+1 —
 * a process covariate, never y-axis.
 */
export interface BoundTtlosSample extends RushAttemptsSample {
  /** Weekly NGS mean seconds snap→LOS crossing, from the covariate bus. */
  readonly avgTimeToLos: CovariateCell;
}

/**
 * Result of binding the TtLOS covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundTtlosSample whose
 *                 covariate came from the covariate bus.
 *  - `ok: false` → no prior row, or avgTimeToLos was null/non-finite
 *                 (fail-closed). The sample is DROPPED. `refuse` is
 *                 diagnostic, never a guess.
 */
export type TtlosBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof TTLOS_BIND_METHOD_TAG;
      readonly sample: BoundTtlosSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof TTLOS_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_ngs_mean",
};

/**
 * Bind NGS weekly-mean `avgTimeToLos` (from the covariate bus) into a batch of
 * rush-attempts samples, producing leak-safe `BoundTtlosSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "rushing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgTimeToLos` directly from that row.
 *      If null/undefined/non-finite → refuse `no_prior_row` (fail-closed,
 *      never imputed).
 *   4. If valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCell.
 *
 * The weekly mean is NOT per-carry frame measurement — every emitted cell
 * carries its grain and provenance.
 */
export function bindTtlosSamples(
  rows: readonly CovariateRow[],
  requests: readonly TtlosBindRequest[],
): TtlosBindResult[] {
  const out: TtlosBindResult[] = [];
  for (const req of requests) {
    // Single strict-prior scan — not one per covariate field.
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "rushing",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: TTLOS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgTimeToLos directly from the single prior row; fail-closed on null/undefined/non-finite.
    const ttlos = row.avgTimeToLos;
    if (ttlos === null || ttlos === undefined || !Number.isFinite(ttlos)) {
      out.push({
        ok: false,
        methodTag: TTLOS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: TTLOS_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        games: req.rushAttempts.games,
        attempts: req.rushAttempts.attempts,
        // Weekly NGS mean seconds snap→LOS — cell metadata from the bus contract.
        avgTimeToLos: { ...BUS_CELL, value: ttlos },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundTtlosSamples(
  rows: readonly CovariateRow[],
  requests: readonly TtlosBindRequest[],
): BoundTtlosSample[] {
  return bindTtlosSamples(rows, requests)
    .filter((r): r is Extract<TtlosBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
