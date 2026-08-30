/**
 * Sack-TTT covariate bind: couples the covariate bus (PR 1) to the
 * sacks model (props-hb-sacks).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent sacks or time-to-throw.
 *
 * `props-hb-sacks.ts` models sacks | dropbacks as Beta-Binomial (sacks bounded
 * by dropbacks). Its `SackSample` carries only the *realized* `dropbacks` and
 * `sacks` — the historical samples the prior fits on. Nothing upstream fed it
 * a leak-safe, honest NGS signal for how quickly the passer is releasing.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the key
 * process signal drawn from the latest `1..kickoffWeek-1` NGS passing row:
 *
 *   `avgTimeToThrow` (L2, covariate): weekly NGS mean seconds from snap to
 *      release. Shorter TTT → less time for receivers to run routes →
 *      higher per-dropback INT risk (more hurried throws, tighter windows).
 *      This is a process/pressure signal, not a per-play frame measurement.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgTimeToThrow` is a weekly MEAN, NOT a per-play frame measurement.
 *    Every emitted cell carries its grain and provenance so the y-axis model
 *    can tell the difference.
 *  - `expectedCompletionPct` / `cpoe` (vendor): y-axis only, GSE-CPOE referee.
 *    The bus never emits them; the bind never reads them.
 *
 * The bind forwards the weekly mean verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "passing", kickoffWeek)`
 * returns null (no prior per-game history, or only a week=0 aggregate row),
 * or if the prior row's `avgTimeToThrow` is null/non-finite, the sample is
 * DROPPED. It is NOT imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path sack covariates meet the sacks model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { SackSample } from "./props-hb-sacks.js";

export const SACK_TTT_BIND_METHOD_TAG = "sack_ttt_bind_v1" as const;

/**
 * One sack target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior passing row.
 */
export interface SackTttBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The sack sample (dropbacks / sacks) to enrich. */
  readonly sack: SackSample;
}

/**
 * `SackSample` enriched with leak-safe NGS covariates. The `dropbacks` /
 * `sacks` fields are the model's existing realized inputs (unchanged);
 * `avgTimeToThrow` is a weekly NGS mean, week t for game t+1 — an independent
 * p-path covariate, never y-axis.
 */
export interface BoundSackSample extends SackSample {
  /** Weekly NGS mean time-to-throw (seconds), from the covariate bus. */
  readonly avgTimeToThrow: CovariateCell;
}

/**
 * Result of binding sack-TTT covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundSackSample whose covariates
 *                 came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 */
export type SackTttBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof SACK_TTT_BIND_METHOD_TAG;
      readonly sample: BoundSackSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof SACK_TTT_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/**
 * Bind NGS weekly-mean `avgTimeToThrow` (from the covariate bus) into a batch
 * of sack samples, producing leak-safe `BoundSackSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgTimeToThrow` directly from that row.
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

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };

export function bindSackTttSamples(
  rows: readonly CovariateRow[],
  requests: readonly SackTttBindRequest[],
): SackTttBindResult[] {
  const out: SackTttBindResult[] = [];
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
        methodTag: SACK_TTT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgTimeToThrow directly from the single prior row; fail-closed on null/non-finite.
    const ttt = row.avgTimeToThrow;
    if (ttt === null || !Number.isFinite(ttt)) {
      out.push({
        ok: false,
        methodTag: SACK_TTT_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: SACK_TTT_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        dropbacks: req.sack.dropbacks,
        sacks: req.sack.sacks,
        // Weekly NGS mean time-to-throw (seconds) — cell metadata from bus contract.
        avgTimeToThrow: { ...BUS_CELL, value: ttt },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundSackTttSamples(
  rows: readonly CovariateRow[],
  requests: readonly SackTttBindRequest[],
): BoundSackSample[] {
  return bindSackTttSamples(rows, requests)
    .filter((r): r is Extract<SackTttBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
