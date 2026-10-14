/**
 * Completed-air-yards covariate bind: couples the covariate bus
 * (PR 1) to the passing-yards model (props-hb-pass-yards).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent passing yards or volume.
 *
 * `props-hb-pass-yards.ts` models passing yards given attempts as a two-part
 * NB: attempts ~ Gamma-Poisson, yards | attempts ~ Gamma-Poisson. Its
 * `PassYardsSample` carries only the *realized* `attempts` and `yards` — the
 * historical samples the prior fits on. Nothing upstream fed it a leak-safe,
 * honest NGS signal for *how deep* the passer is completing passes — i.e. the
 * realized per-completion air-yards depth, which drives yardage ceiling.
 *
 * EDGE THESIS: the books price pass yards on recent totals but miss the
 * depth-of-target signal. A QB averaging 9 completed air yards is hitting
 * deeper routes, creating higher yardage ceiling per completion.
 * `avgCompletedAirYards` (NGS weekly mean yards per *completion* from the air
 * portion) captures that depth-realization that book totals do not.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the key
 * process signal drawn from the latest `1..kickoffWeek-1` NGS passing row:
 *
 *   `avgCompletedAirYards` (L2, covariate): weekly NGS mean completed air yards
 *      per completion — the realized depth of target that the ball actually
 *      reaches the receiver. A high value → throws already being *completed*
 *      downfield → higher yards-per-completion ceiling. This is a process
 *      depth-of-target signal, not a per-play frame measurement.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgCompletedAirYards` is a weekly MEAN, NOT a per-play frame
 *    measurement. Every emitted cell carries its grain and provenance so the
 *    y-axis model can tell the difference.
 *  - `expectedCompletionPct` (vendor): y-axis only, GSE-xCOMP referee. The
 *    bus never emits it; the bind never reads it.
 *
 * The bind forwards the weekly mean verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "passing", kickoffWeek)`
 * returns null (no prior per-game history, or only a week=0 aggregate row),
 * or if the prior row's `avgCompletedAirYards` is null/non-finite, the
 * sample is DROPPED. It is NOT imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path passing-yards covariates meet the pass-yards model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { PassYardsSample } from "./props-hb-pass-yards.js";

export const PASS_CAY_BIND_METHOD_TAG = "pass_cay_bind_v1" as const;

/**
 * One passing-yards target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior passing row.
 */
export interface PassCayBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The passing-yards sample (attempts / yards) to enrich. */
  readonly pass: PassYardsSample;
}

/**
 * `PassYardsSample` enriched with the leak-safe NGS covariate. The `attempts`
 * / `yards` fields are the model's existing realized inputs (unchanged);
 * `avgCompletedAirYards` is a weekly NGS mean, week t for game t+1 — an
 * independent p-path covariate, never y-axis.
 */
export interface BoundPassYardsCaySample extends PassYardsSample {
  /** Weekly NGS mean completed air yards per completion, from the covariate bus. */
  readonly avgCompletedAirYards: CovariateCell;
}

/**
 * Result of binding completed-air-yards covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundPassYardsCaySample whose
 *                 covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 */
export type PassCayBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof PASS_CAY_BIND_METHOD_TAG;
      readonly sample: BoundPassYardsCaySample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof PASS_CAY_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/**
 * Bind NGS weekly-mean `avgCompletedAirYards` (from the covariate bus)
 * into a batch of passing-yards samples, producing leak-safe
 * `BoundPassYardsCaySample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgCompletedAirYards` directly from that row.
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

export function bindPassCaySamples(
  rows: readonly CovariateRow[],
  requests: readonly PassCayBindRequest[],
): PassCayBindResult[] {
  const out: PassCayBindResult[] = [];
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
        methodTag: PASS_CAY_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgCompletedAirYards directly from the single prior row; fail-closed on null/non-finite.
    const cay = row.avgCompletedAirYards;
    if (cay === null || !Number.isFinite(cay)) {
      out.push({
        ok: false,
        methodTag: PASS_CAY_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: PASS_CAY_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        attempts: req.pass.attempts,
        yards: req.pass.yards,
        // Weekly NGS mean completed air yards — cell metadata from bus contract.
        avgCompletedAirYards: { ...BUS_CELL, value: cay },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundPassCaySamples(
  rows: readonly CovariateRow[],
  requests: readonly PassCayBindRequest[],
): BoundPassYardsCaySample[] {
  return bindPassCaySamples(rows, requests)
    .filter((r): r is Extract<PassCayBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
