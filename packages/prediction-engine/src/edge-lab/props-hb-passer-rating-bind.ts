/**
 * Passer-rating bind: couples the covariate bus (PR 1) weekly NGS `passerRating`
 * into `PassTdSample` enrichments for the pass-TD model (props-hb-pass-td).
 *
 * EDGE THESIS (H2): books price pass TDs off season totals and calendar games,
 * missing the weekly passer-rating signal. A QB riding a 115+ passer rating over
 * the last 3 weeks is in a different TD-scoring environment than one at 78. The
 * pass-TD prior (`props-hb-pass-td.ts`) has exactly two inputs — attempts and
 * pass TDs — so it cannot condition on *how* the QB threw this season. This
 * bind hands the prior one leak-safe, week t → t+1 covariate: the public NFL
 * passer rating (a deterministic formula over completions/attempts/yards/TDs/
 * INTs — all realized on the play-by-play plane the model already conditions
 * on), averaged over the strictly-prior weeks.
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent passer rating.
 *
 * `passerRating` is the public NFL passer-rating formula, NOT a vendor
 * expected/y-axis metric (unlike `expectedCompletionPct`, `avgExpectedYac`,
 * `expectedRushYards`/`ryoe`, or vendor `cpoe`). It is a weekly MEAN over the
 * prior per-game passing rows. The covariate bus already enforces: week=0
 * (season aggregate) is dropped unconditionally; only weeks `1..kickoffWeek-1`
 * are eligible; no same-week, no future. `latestPriorRow` returns `null` when
 * no per-game history exists before kickoff.
 *
 * Fail-closed: if the covariate bus has no prior passing row for the player
 * (no prior-game history, or only a week=0 aggregate row), or if the prior
 * row's `passerRating` is null/non-finite, the sample is DROPPED. It is NOT
 * imputed. A pass-TD cell with fewer samples — but an honest one — is still
 * honest.
 *
 * Grain: the emitted cell carries `{ value, grain: "week_t_for_tplus1",
 * provenance: "weekly_ngs_mean" }` so the y-axis model can tell the weekly
 * mean is not a per-play / per-game-total frame.
 *
 * Pure. No I/O. No Prisma. No model inference. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { PassTdSample } from "./props-hb-pass-td.js";

export const PASSER_RATING_BIND_METHOD_TAG = "passer_rating_bind_v1" as const;

/**
 * One pass-TD target that still needs the weekly-NPS passer-rating covariate.
 * The caller supplies identity + the kickoff week it is predicting so the bus
 * can pick the strictly-prior passing row.
 */
export interface PasserRatingBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The pass-TD sample (attempts / passTds) to enrich. */
  readonly passTd: PassTdSample;
}

/**
 * `PassTdSample` enriched with a leak-safe weekly NGS passer-rating cell.
 * The `attempts` / `passTds` fields are the model's existing realized inputs
 * (unchanged); the `passerRating` cell is a week t → t+1 signal the pass-TD
 * prior can condition on.
 */
export interface BoundPassTdSample extends PassTdSample {
  /** Weekly NGS passer rating (public NFL formula, 0–158.3), week t for game t+1. */
  readonly passerRating: CovariateCell;
}

/**
 * Result of binding the weekly passer-rating covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundPassTdSample whose covariate
 *                 came from the covariate bus (strictly-prior passing row).
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type PasserRatingBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof PASSER_RATING_BIND_METHOD_TAG;
      readonly sample: BoundPassTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof PASSER_RATING_BIND_METHOD_TAG;
      readonly priced: false;
      /** Why the sample was dropped. Diagnostic only — never a guess. */
      readonly refuse: "no_prior_row" | "null_passer_rating";
    };

/**
 * Bind the weekly NGS `passerRating` into a batch of pass-TD samples.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — a single
 *      strict-prior scan (week=0 excluded). If null → refuse `no_prior_row`.
 *   2. Read `passerRating` off that single row; null/non-finite → refuse
 *      `null_passer_rating`.
 *   3. Otherwise → build the BoundPassTdSample.
 *
 * One row scan per request (not two). Refuse codes are diagnostic, never
 * guesses — fail-closed, no imputation.
 */
export function bindPasserRatingSamples(
  rows: readonly CovariateRow[],
  requests: readonly PasserRatingBindRequest[],
): PasserRatingBindResult[] {
  const out: PasserRatingBindResult[] = [];
  const BUS_CELL: CovariateCell = {
    value: 0,
    grain: "week_t_for_tplus1",
    provenance: "weekly_ngs_mean",
  };
  for (const req of requests) {
    // Single strict-prior scan — not one per covariate field.
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "passing",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: PASSER_RATING_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const rating = row.passerRating;
    if (rating === null || !Number.isFinite(rating)) {
      out.push({
        ok: false,
        methodTag: PASSER_RATING_BIND_METHOD_TAG,
        priced: false,
        refuse: "null_passer_rating",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: PASSER_RATING_BIND_METHOD_TAG,
      priced: false,
      sample: {
        attempts: req.passTd.attempts,
        passTds: req.passTd.passTds,
        passerRating: { ...BUS_CELL, value: rating },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundPasserRatingSamples(
  rows: readonly CovariateRow[],
  requests: readonly PasserRatingBindRequest[],
): BoundPassTdSample[] {
  return bindPasserRatingSamples(rows, requests)
    .filter((r): r is Extract<PasserRatingBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
