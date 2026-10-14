/**
 * Sticks (air-yards-to-the-sticks) covariate bind: forwards weekly NGS
 * `avgAirYardsToSticks` into CompSample enrichments for the completions model
 * (props-hb-comp).
 *
 * H2 Edge — Completions (swarm-PRE-7: sticks -> completions, SIGN − soft).
 *
 * EDGE THESIS: Books price completion props off season catch rate and
 * volume but miss the downfield-targeting signal. A passer whose intended
 * air yards routinely reach the line to gain (high AYTS) is pushing the ball
 * further downfield — lower completion probability per attempt, even at the
 * same attempt count. avgAirYardsToSticks is the independent p-path process
 * covariate the completions model never sees.
 *
 * This is a BIND, not a model. It couples `avgAirYardsToSticks` (from the
 * covariate bus) into CompSample enrichments for the completions model.
 *
 * The completions *model* (props-hb-comp) scores catches given attempts via
 * Beta-Binomial. The bind ships `avgAirYardsToSticks` (weekly NGS mean:
 * intended air yards to the sticks — distance past LOS to the line to gain)
 * as an independent process covariate — the y-axis count model never sees it
 * as a predictor.
 *
 * HONESTY:
 *  - `avgAirYardsToSticks` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "passing"`, `provenance: "weekly_ngs_mean"` — only passing
 *    NGS rows feed this metric, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or avgAirYardsToSticks is
 *    null/undefined/non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { CompSample } from "./props-hb-comp.js";

export const STICKS_BIND_METHOD_TAG = "sticks_bind_v1" as const;

/**
 * One completions target that needs the sticks covariate-bind from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior passing row.
 */
export interface SticksBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The completions sample (attempts, completions) to enrich. */
  readonly comp: CompSample;
}

/**
 * `CompSample` enriched with leak-safe NGS avgAirYardsToSticks. The
 * `attempts` / `completions` fields are the model's existing realized inputs
 * (unchanged); `avgAirYardsToSticks` is the weekly NGS mean air-yards to the
 * sticks, week t for game t+1 — a process covariate, never y-axis.
 */
export interface BoundSticksSample extends CompSample {
  /** Weekly NGS mean intended air yards to the sticks, from the covariate bus. */
  readonly avgAirYardsToSticks: CovariateCell;
}

/**
 * Result of binding the sticks covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundSticksSample whose
 *                 covariate came from the covariate bus.
 *  - `ok: false` → no prior row, or avgAirYardsToSticks was null/non-finite
 *                 (fail-closed). The sample is DROPPED. `refuse` is
 *                 diagnostic, never a guess.
 */
export type SticksBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof STICKS_BIND_METHOD_TAG;
      readonly sample: BoundSticksSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof STICKS_BIND_METHOD_TAG;
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
 * Bind NGS weekly-mean `avgAirYardsToSticks` (from the covariate bus) into a
 * batch of completions samples, producing leak-safe `BoundSticksSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgAirYardsToSticks` directly from that row.
 *      If null/undefined/non-finite → refuse `no_prior_row` (fail-closed,
 *      never imputed).
 *   4. If valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCell.
 *
 * The weekly mean is NOT per-play frame measurement — every emitted cell
 * carries its grain and provenance.
 */
export function bindSticksSamples(
  rows: readonly CovariateRow[],
  requests: readonly SticksBindRequest[],
): SticksBindResult[] {
  const out: SticksBindResult[] = [];
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
        methodTag: STICKS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgAirYardsToSticks directly from the single prior row; fail-closed on null/undefined/non-finite.
    const sticks = row.avgAirYardsToSticks;
    if (sticks === null || sticks === undefined || !Number.isFinite(sticks)) {
      out.push({
        ok: false,
        methodTag: STICKS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: STICKS_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        attempts: req.comp.attempts,
        completions: req.comp.completions,
        // Weekly NGS mean air-yards-to-sticks — cell metadata from the bus contract.
        avgAirYardsToSticks: { ...BUS_CELL, value: sticks },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundSticksSamples(
  rows: readonly CovariateRow[],
  requests: readonly SticksBindRequest[],
): BoundSticksSample[] {
  return bindSticksSamples(rows, requests)
    .filter((r): r is Extract<SticksBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
