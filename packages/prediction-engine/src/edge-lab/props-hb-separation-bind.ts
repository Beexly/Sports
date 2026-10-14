/**
 * Catch-separation covariate bind: couples the covariate bus (PR 1) to the
 * catch-rate model (props-hb-catch).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent separation.
 *
 * EDGE THESIS (H2 Edge — Catches/Receptions): Books price catches on target
 * volume but miss separation. A receiver averaging 3.5 yards of separation is
 * much more likely to be targeted successfully than one at 1.2 yards. The
 * market prices the target count, not how open the receiver gets. NGS
 * Receiving has avgSeparation — this bind is the seam where that weekly-mean
 * separation (an independent p-path covariate, week t for game t+1) meets the
 * catch-rate model.
 *
 * `props-hb-catch.ts` models receptions | targets as Beta-Binomial on a
 * catch-rate signal. Its `CatchSample` carries only the *realized* `targets`
 * and `receptions` — the historical samples the prior fits on. Nothing
 * upstream fed it a leak-safe, honest NGS signal for how much space the
 * receiver is getting at the catch point.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the separation
 * process signal drawn from the latest `1..kickoffWeek-1` NGS receiving row:
 *
 *   `avgSeparation` (L2, covariate): weekly NGS mean yards of separation
 *      (over catch + incompletion frames). More separation → easier catch →
 *      higher catch probability for the same throw. This is a
 *      process/scheme-style space-creation signal, NOT a per-target arrival
 *      measurement. (Note: avgSeparation already lives on CovariateRow via the
 *      NGS receiving parsers — no schema add is needed here.)
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgSeparation` is a weekly MEAN, NOT a per-play frame measurement. Every
 *    emitted cell carries its grain and provenance so the y-axis model can
 *    tell the difference.
 *  - `avgExpectedYac` (vendor): y-axis only, GSE-xYAC referee. The bus never
 *    emits it; the bind never reads it.
 *
 * The bind forwards the weekly mean verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "receiving", kickoffWeek)` returns null
 * (no prior per-game history, or only a week=0 aggregate row), or if the prior
 * row's `avgSeparation` is null/non-finite, the sample is DROPPED. It is NOT
 * imputed. It is NOT replaced with a constant ("3.0 yards"). The catch-rate
 * cell is allowed to have fewer samples — fewer than noise is still honest.
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

export const CATCH_SEPARATION_BIND_METHOD_TAG = "catch_separation_bind_v1" as const;

/**
 * One catch-rate target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior receiving row.
 */
export interface CatchSeparationBindRequest {
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
 * `avgSeparation` is a weekly NGS mean (yards), week t for game t+1 — an
 * independent p-path covariate, never y-axis.
 */
export interface BoundSeparationCatchSample extends CatchSample {
  /** Weekly NGS mean separation at catch point (yards), from the covariate bus. */
  readonly avgSeparation: CovariateCell;
}

/**
 * Result of binding catch-separation covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundSeparationCatchSample whose
 *                   covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                   DROPPED. `refuse` is diagnostic, never a guess.
 */
export type CatchSeparationBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof CATCH_SEPARATION_BIND_METHOD_TAG;
      readonly sample: BoundSeparationCatchSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof CATCH_SEPARATION_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };

/**
 * Bind NGS weekly-mean `avgSeparation` (from the covariate bus) into a batch
 * of catch samples, producing leak-safe `BoundSeparationCatchSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "receiving", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `avgSeparation` directly from that row.
 *      If null/non-finite → refuse `no_prior_row` (fail-closed, never imputed,
 *      never replaced with a constant).
 *   4. If valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCell.
 *
 * The bus's cell template (`BUS_CELL`) is the single source of truth for
 * grain/provenance. The value comes directly from the row we already scanned,
 * avoiding a second O(N) scan per field.
 *
 * The weekly mean is NOT a per-play frame measurement — every emitted cell
 * carries its grain and provenance.
 */
export function bindCatchSeparationSamples(
  rows: readonly CovariateRow[],
  requests: readonly CatchSeparationBindRequest[],
): CatchSeparationBindResult[] {
  const out: CatchSeparationBindResult[] = [];
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
        methodTag: CATCH_SEPARATION_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read avgSeparation directly from the single prior row; fail-closed on null/non-finite.
    const separation = row.avgSeparation;
    if (separation === null || !Number.isFinite(separation)) {
      out.push({
        ok: false,
        methodTag: CATCH_SEPARATION_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: CATCH_SEPARATION_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        targets: req.catch.targets,
        receptions: req.catch.receptions,
        // Weekly NGS mean separation at catch point (yards) — cell metadata from bus contract.
        avgSeparation: { ...BUS_CELL, value: separation },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundCatchSeparationSamples(
  rows: readonly CovariateRow[],
  requests: readonly CatchSeparationBindRequest[],
): BoundSeparationCatchSample[] {
  return bindCatchSeparationSamples(rows, requests)
    .filter((r): r is Extract<CatchSeparationBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
