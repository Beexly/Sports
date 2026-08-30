/**
 * Catch-cushion covariate bind: couples the covariate bus (PR 1) to the
 * catch-rate model (props-hb-catch).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent catch rate or cushion.
 *
 * `props-hb-catch.ts` models receptions | targets as Beta-Binomial on a
 * catch-rate signal. Its `CatchSample` carries only the *realized* `targets`
 * and `receptions` — the historical samples the prior fits on. Nothing
 * upstream fed it a leak-safe, honest NGS signal for how much space the
 * receiver is getting at the catch point.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the key
 * process signal drawn from the latest `1..kickoffWeek-1` NGS receiving row:
 *
 *   `avgCushion` (L2, covariate): weekly NGS mean yards of cushion at the
 *      catch point. More cushion → easier catch → higher catch probability
 *      for the same throw. This is a process/scheme space-creation signal,
 *      not a per-target arrival measurement.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgCushion` is a weekly MEAN, NOT a per-play frame measurement. Every
 *    emitted cell carries its grain and provenance so the y-axis model can
 *    tell the difference.
 *  - `avgExpectedYac` (vendor): y-axis only, GSE-xYAC referee. The bus never
 *    emits it; the bind never reads it.
 *
 * The bind forwards the weekly mean verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "receiving", kickoffWeek)`
 * returns null (no prior per-game history, or only a week=0 aggregate row),
 * or if the prior row's `avgCushion` is null/non-finite, the sample is
 * DROPPED. It is NOT imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path catch-rate covariates meet the catch model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { CatchSample } from "./props-hb-catch.js";

export const CATCH_CUSHION_BIND_METHOD_TAG = "catch_cushion_bind_v1" as const;

/**
 * One catch-rate target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior receiving row.
 */
export interface CatchCushionBindRequest {
  /** Player gsis id — same gsisId as the NGS receiving rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The catch sample (targets / receptions) to enrich. */
  readonly catch: CatchSample;
}

/**
 * `CatchSample` enriched with leak-safe NGS covariates. The `targets` /
 * `receptions` fields are the model's existing realized inputs (unchanged);
 * `avgCushion` is a weekly NGS mean, week t for game t+1 — an independent
 * p-path covariate, never y-axis.
 */
export interface BoundCatchSample extends CatchSample {
  /** Weekly NGS mean cushion at catch point (yards), from the covariate bus. */
  readonly avgCushion: CovariateCell;
}

/**
 * Result of binding catch-cushion covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundCatchSample whose covariates
 *                 came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 */
export type CatchCushionBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof CATCH_CUSHION_BIND_METHOD_TAG;
      readonly sample: BoundCatchSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof CATCH_CUSHION_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/**
 * Bind NGS weekly-mean `avgCushion` (from the covariate bus) into a batch
 * of catch samples, producing leak-safe `BoundCatchSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "receiving", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgCushion` directly from that row.
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

export function bindCatchCushionSamples(
  rows: readonly CovariateRow[],
  requests: readonly CatchCushionBindRequest[],
): CatchCushionBindResult[] {
  const out: CatchCushionBindResult[] = [];
  for (const req of requests) {
    // Single strict-prior scan — not one per covariate field.
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "receiving",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: CATCH_CUSHION_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgCushion directly from the single prior row; fail-closed on null/non-finite.
    const cushion = row.avgCushion;
    if (cushion === null || !Number.isFinite(cushion)) {
      out.push({
        ok: false,
        methodTag: CATCH_CUSHION_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: CATCH_CUSHION_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        targets: req.catch.targets,
        receptions: req.catch.receptions,
        // Weekly NGS mean cushion at catch point (yards) — cell metadata from bus contract.
        avgCushion: { ...BUS_CELL, value: cushion },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundCatchCushionSamples(
  rows: readonly CovariateRow[],
  requests: readonly CatchCushionBindRequest[],
): BoundCatchSample[] {
  return bindCatchCushionSamples(rows, requests)
    .filter((r): r is Extract<CatchCushionBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
