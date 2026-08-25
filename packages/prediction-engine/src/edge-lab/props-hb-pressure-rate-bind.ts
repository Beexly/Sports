/**
 * Pressure-rate covariate bind: couples the covariate bus to the pressures model.
 *
 * H1 Edge #1 — QB Pressures (hurries + hits + sacks).
 *
 * Books price sacks only. Pressures capture QB disruption (~5% edge per
 * PropsBot). PFR `advstats_week_def` publishes per-player-game pressures
 * (def_pressures = hurries + hits + sacks). This bind forwards the weekly mean
 * pressure rate (pressures / dropbacks) from the covariate bus into a
 * `PressureSample` for the pressures model (props-hb-pressures).
 *
 * HONESTY HEADER
 * ──────────────
 * This is a BIND, not a model. It does not invent pressures or dropbacks.
 *
 * The covariate bus (covariate-bus.ts) is the single source of the key process
 * signal drawn from the latest `1..kickoffWeek-1` defensive row:
 *
 *   `pressureRate` (L2, covariate): weekly mean pressures per dropback faced.
 *      Higher pressure rate → QB disruption → but on the DEFENSIVE side, this
 *      means the QB is being hurried, which correlates with higher INT risk on
 *      the offensive side. This is a process/pressure signal, not a per-play
 *      frame measurement.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `pressureRate` is a weekly MEAN, NOT a per-play frame measurement.
 *    Every emitted cell carries its grain and provenance so the y-axis model
 *    can tell the difference.
 *  - The bus never emits y-axis metrics (expectedCompletionPct, xYAC, etc.).
 *    This bind never reads them.
 *
 * The bind forwards the weekly mean verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "defense", kickoffWeek)` returns null
 * (no prior per-game history, or only a week=0 aggregate row), or if the prior
 * row's `pressureRate` is null/non-finite, the sample is DROPPED. It is NOT
 * imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path pressure covariates meet the pressures model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { PressureSample } from "./props-hb-pressures.js";

export const PRESSURE_RATE_BIND_METHOD_TAG = "pressure_rate_bind_v1" as const;

/**
 * One pressure target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior defensive row.
 */
export interface PressureBindRequest {
  /** Player gsis id — same gsisId as the NGS/PFR defensive rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The pressure sample (dropbacks / pressures) to enrich. */
  readonly pressure: PressureSample;
}

/**
 * `PressureSample` enriched with leak-safe PFR defensive covariates. The
 * `dropbacks` / `pressures` fields are the model's existing realized inputs
 * (unchanged); `pressureRate` is a weekly PFR mean, week t for game t+1 — an
 * independent p-path covariate, never y-axis.
 */
export interface BoundPressureSample extends PressureSample {
  /** Weekly PFR mean pressure rate (pressures per dropback), from the covariate bus. */
  readonly pressureRate: CovariateCell;
}

/**
 * Result of binding pressure-rate covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundPressureSample whose
 *                 covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type PressureBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof PRESSURE_RATE_BIND_METHOD_TAG;
      readonly sample: BoundPressureSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof PRESSURE_RATE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

/**
 * Bind PFR weekly-mean `pressureRate` (from the covariate bus) into a batch
 * of pressure samples, producing leak-safe `BoundPressureSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "defense", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `pressureRate` directly from that row.
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
export function bindPressureSamples(
  rows: readonly CovariateRow[],
  requests: readonly PressureBindRequest[],
): PressureBindResult[] {
  const out: PressureBindResult[] = [];
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
        methodTag: PRESSURE_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read pressureRate directly from the single prior row; fail-closed on null/non-finite.
    const rate = row.pressureRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({
        ok: false,
        methodTag: PRESSURE_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: PRESSURE_RATE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        dropbacks: req.pressure.dropbacks,
        pressures: req.pressure.pressures,
        // Weekly PFR mean pressure rate (pressures per dropback) — cell metadata from bus contract.
        pressureRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundPressureSamples(
  rows: readonly CovariateRow[],
  requests: readonly PressureBindRequest[],
): BoundPressureSample[] {
  return bindPressureSamples(rows, requests)
    .filter((r): r is Extract<PressureBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
