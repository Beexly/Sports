/**
 * INT covariate bind: couples the covariate bus (PR 1) to the interceptions
 * | attempts model (props-hb-int).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent interception rate.
 *
 * `props-hb-int.ts` models INTs given attempts as a two-part NB: attempts ~
 * Gamma-Poisson, INTs | attempts ~ Gamma-Poisson. Its `IntSample` carries
 * only the *realized* `attempts` and `ints` — the historical samples the
 * prior fits on. Nothing upstream fed it a leak-safe, honest NGS signal for
 * how aggressive the passer's process is or how quickly they release.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of two key
 * process signals drawn from the latest `1..kickoffWeek-1` NGS passing row:
 *
 *   1. `avgTimeToThrow` (L2, covariate): weekly NGS mean seconds from snap
 *      to release. Shorter TTT → less time for receivers to run their routes
 *      → higher per-attempt INT risk (more hurried throws, tighter windows).
 *      The bus enforces week t → t+1, week=0 excluded, fail-closed.
 *
 *   2. `aggressiveness` (L2, covariate): weekly NGS % of throws into <1 yard
 *      separation. Tighter windows → higher per-attempt INT risk. The % into
 *      tight coverage is a process signal, not a tout score.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgTimeToThrow` / `aggressiveness` are weekly MEANS, NOT per-play frame
 *    measurements. Every emitted cell carries its grain and provenance so the
 *    y-axis model can tell the difference.
 *  - `expectedCompletionPct` / `cpoe` (vendor, vendor-residual): y-axis only,
 *    GSE-CPOE referee. The bus never emits them; the bind never reads them.
 *
 * The bind forwards the weekly means verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "passing", kickoffWeek)`
 * returns null (no prior per-game history, or only a week=0 aggregate row),
 * or if the prior row's `avgTimeToThrow` / `aggressiveness` is null/non-finite,
 * the sample is DROPPED. It is NOT imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path INT covariates meet the interceptions model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { IntSample } from "./props-hb-int.js";

export const INT_BIND_METHOD_TAG = "int_bind_v1" as const;

/**
 * One INT target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior passing row.
 */
export interface IntBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The INT sample (attempts / ints) to enrich. */
  readonly int: IntSample;
}

/**
 * `IntSample` enriched with leak-safe NGS covariates. The `attempts` /
 * `ints` fields are the model's existing realized inputs (unchanged);
 * `avgTimeToThrow` and `aggressiveness` are weekly NGS means, week t
 * for game t+1 — independent p-path covariates, never y-axis.
 */
export interface BoundIntSample extends IntSample {
  /** Weekly NGS mean time-to-throw (seconds), from the covariate bus. */
  readonly avgTimeToThrow: CovariateCell;
  /** Weekly NGS % of throws into <1 yd separation, from the covariate bus. */
  readonly aggressiveness: CovariateCell;
}

/**
 * Result of binding INT covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundIntSample whose covariates
 *                 came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 *
 * The bus's `nextGameCovariate` returns `null` for both "no prior row" and
 * "field null/non-finite on the prior row" — the bind collapses both to
 * `no_prior_row`. This is fail-closed by design: the caller never sees a
 * null/non-finite covariate cell reach the model.
 */
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

/**
 * Bind NGS weekly-mean `avgTimeToThrow` + `aggressiveness` (from the
 * covariate bus) into a batch of INT samples, producing leak-safe
 * `BoundIntSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgTimeToThrow` and `aggressiveness` directly from that row.
 *      If either is null/non-finite → refuse `no_prior_row` (fail-closed,
 *      never imputed).
 *   4. If both are valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCells.
 *
 * The bus's cell template (`BUS_CELL`) is the single source of truth for
 * grain/provenance. The value comes directly from the row we already scanned,
 * avoiding a second O(N) scan per field.
 *
 * The weekly means are NOT per-play frame measurements — every emitted cell
 * carries its grain and provenance.
 */

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };

export function bindIntSamples(
  rows: readonly CovariateRow[],
  requests: readonly IntBindRequest[],
): IntBindResult[] {
  const out: IntBindResult[] = [];
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
        methodTag: INT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read both fields from the single prior row; fail-closed on null/non-finite.
    const ttt = row.avgTimeToThrow;
    if (ttt === null || !Number.isFinite(ttt)) {
      out.push({
        ok: false,
        methodTag: INT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const agg = row.aggressiveness;
    if (agg === null || !Number.isFinite(agg)) {
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
        // Realized model inputs — passed through unchanged.
        attempts: req.int.attempts,
        ints: req.int.ints,
        // Weekly NGS mean time-to-throw (seconds) — cell metadata from bus contract.
        avgTimeToThrow: { ...BUS_CELL, value: ttt },
        // Weekly NGS % throws into <1 yd separation — cell metadata from bus contract.
        aggressiveness: { ...BUS_CELL, value: agg },
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
