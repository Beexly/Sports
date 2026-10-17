/**
 * Aggressiveness covariate bind: couples the covariate bus weekly NGS
 * `aggressiveness` into `PassTdSample` enrichments for the pass-TD model
 * (props-hb-pass-td).
 *
 * EDGE THESIS (H2): books price pass TDs off season totals and calendar games,
 * missing the *how* of the throw. NGS aggressiveness is the % of a QB's throws
 * into tight coverage (<1 yd intended-receiver separation). A QB forcing throws
 * into tight windows at ~25% is threading the needle — higher TD variance (the
 * ball can still arrive in the end zone) AND higher interception risk (the ball
 * can just as easily arrive at a defender). The market does not separate a QB
 * throwing TDs into wide-open coverage from one forcing them into tight windows.
 * This bind hands the pass-TD prior one leak-safe, week t → t+1 covariate:
 * the weekly NGS mean aggressiveness fraction, drawn only from strictly-prior
 * weeks.
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent aggressiveness.
 *
 * `aggressiveness` is the weekly NGS mean (% throws into tight coverage, <1 yd
 * separation) — a process/scheme signal, NOT a vendor expected/y-axis metric
 * (unlike `expectedCompletionPct`, `avgExpectedYac`, `expectedRushYards`/ryoe,
 * or vendor `cpoe`). The covariate bus already enforces: week=0 (season
 * aggregate) is dropped unconditionally; only weeks `1..kickoffWeek-1` are
 * eligible; no same-week, no future. `latestPriorRow` returns `null` when no
 * per-game history exists before kickoff.
 *
 * Fail-closed: if the covariate bus has no prior passing row for the player
 * (no prior-game history, or only a week=0 aggregate row), or if the prior
 * row's `aggressiveness` is null/non-finite, the sample is DROPPED. It is NOT
 * imputed. A pass-TD cell with fewer samples — but an honest one — is still
 * honest.
 *
 * Grain: the emitted cell carries `{ value, grain: "week_t_for_tplus1",
 * provenance: "weekly_ngs_mean" }` so the y-axis model can tell the weekly
 * mean is not a per-play frame.
 *
 * Pure. No I/O. No Prisma. No model inference. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { PassTdSample } from "./props-hb-pass-td.js";

export const AGGRESSIVENESS_BIND_METHOD_TAG = "aggressiveness_bind_v1" as const;

/**
 * One pass-TD target that still needs the weekly-NGS aggressiveness covariate.
 * The caller supplies identity + the kickoff week it is predicting so the bus
 * can pick the strictly-prior passing row.
 */
export interface AggressivenessBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The pass-TD sample (attempts / passTds) to enrich. */
  readonly passTd: PassTdSample;
}

/**
 * `PassTdSample` enriched with a leak-safe weekly NGS aggressiveness cell.
 * The `attempts` / `passTds` fields are the model's existing realized inputs
 * (unchanged); the `aggressiveness` cell is a week t → t+1 signal (weekly NGS
 * mean % throws into tight coverage, <1 yd separation) the pass-TD prior can
 * condition on.
 */
export interface BoundAggressivenessPassTdSample extends PassTdSample {
  /** Weekly NGS mean aggressiveness (% throws into tight coverage <1 yd), week t for game t+1. */
  readonly aggressiveness: CovariateCell;
}

/**
 * Result of binding the weekly aggressiveness covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundAggressivenessPassTdSample
 *                 whose covariate came from the covariate bus (strictly-prior
 *                 passing row).
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type AggressivenessBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof AGGRESSIVENESS_BIND_METHOD_TAG;
      readonly sample: BoundAggressivenessPassTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof AGGRESSIVENESS_BIND_METHOD_TAG;
      readonly priced: false;
      /** Why the sample was dropped. Diagnostic only — never a guess. */
      readonly refuse: "no_prior_row" | "null_aggressiveness";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_ngs_mean",
};

/**
 * Bind the weekly NGS `aggressiveness` into a batch of pass-TD samples.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — a single
 *      strict-prior scan (week=0 excluded). If null → refuse `no_prior_row`.
 *   2. Read `aggressiveness` off that single row; null/non-finite → refuse
 *      `null_aggressiveness`.
 *   3. Otherwise → build the BoundAggressivenessPassTdSample.
 *
 * One row scan per request (not two). Refuse codes are diagnostic, never
 * guesses — fail-closed, no imputation.
 */
export function bindAggressivenessSamples(
  rows: readonly CovariateRow[],
  requests: readonly AggressivenessBindRequest[],
): AggressivenessBindResult[] {
  const out: AggressivenessBindResult[] = [];
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
        methodTag: AGGRESSIVENESS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const agg = row.aggressiveness;
    if (agg === null || !Number.isFinite(agg)) {
      out.push({
        ok: false,
        methodTag: AGGRESSIVENESS_BIND_METHOD_TAG,
        priced: false,
        refuse: "null_aggressiveness",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: AGGRESSIVENESS_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        attempts: req.passTd.attempts,
        passTds: req.passTd.passTds,
        // Weekly NGS mean aggressiveness — cell metadata from the bus contract.
        aggressiveness: { ...BUS_CELL, value: agg },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundAggressivenessSamples(
  rows: readonly CovariateRow[],
  requests: readonly AggressivenessBindRequest[],
): BoundAggressivenessPassTdSample[] {
  return bindAggressivenessSamples(rows, requests)
    .filter((r): r is Extract<AggressivenessBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}