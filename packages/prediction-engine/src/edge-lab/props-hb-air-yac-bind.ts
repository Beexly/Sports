/**
 * YAC covariate bind: couples the covariate bus (PR 1) to the air+YAC model.
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent YAC.
 *
 * `props-hb-air-yac.ts` models receiving yards as air-caught + YAC, but its
 * `AirYacSample` carries only the *realized* `yac` (total YAC on caught balls)
 * and `airYards`. Nothing upstream fed it a leak-safe, honest NGS signal —
 * the caller was free to drop in a constant or a future-week figure. That is over.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the YAC input:
 * the latest `1..kickoffWeek-1` NGS receiving row's `avg_yac`, returned as
 * `{ value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" }`.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule, docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `avgYac` (L2, covariate): weekly MEAN yards-after-catch PER RECEPTION, over
 *    catch/incompletion frames. A process/route-running and scheme signal — fed
 *    into the YAC-rate prior as an independent `p` input.
 *  - `yac` on `AirYacSample` (L0, the sample's own realized total YAC): the y-axis
 *    component the Gamma-Poisson model fits. NOT replaced here.
 *  - `avgExpectedYac` / `yacAboveExpected` (vendor / vendor-residual): y-axis only,
 *    GSE-xYAC referee. The bus never emits them; the bind never reads them.
 *
 * `avgYac` is a weekly MEAN per reception, NOT a per-target arrival YAC — every
 * emitted cell carries its grain and provenance so the y-axis model can tell the
 * difference. The bind forwards that mean verbatim and never crosses the
 * same-week boundary.
 *
 * Fail-closed: if `nextGameCovariate(..., "receiving", "avgYac")` returns null
 * (no prior per-game history, null/non-finite field, or only a week=0 aggregate
 * row), the sample is DROPPED. It is NOT imputed. 3.0 yards is never emitted
 * here. The air+YAC cell is allowed to have fewer samples — fewer than noise is
 * still honest.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path YAC covariate meets the air+YAC model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  nextGameCovariate,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { AirYacSample } from "./props-hb-air-yac.js";

export const YAC_BIND_METHOD_TAG = "yac_bind_v1" as const;

/**
 * One air+YAC target that still needs the `avgYac` covariate bound from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the bus
 * can pick the strictly-prior receiving row.
 */
export interface YacBindRequest {
  /** Player join key — same gsisId as the NGS receiving rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The air+YAC sample (receptions / airYards / yac) to enrich. */
  readonly airYac: AirYacSample;
}

/**
 * `AirYacSample` enriched with a leak-safe NGS `avgYac` covariate. The
 * `airYards` / `yac` / `receptions` fields are the model's existing realized
 * inputs (unchanged); `avgYac` is the weekly NGS mean per-reception YAC,
 * week t for game t+1 — an independent p-path covariate, never y-axis.
 */
export interface BoundAirYacSample extends AirYacSample {
  /** Weekly NGS mean YAC per reception, from the covariate bus. Read-only. */
  readonly avgYac: CovariateCell;
}

/**
 * Result of binding avgYac to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundAirYacSample whose
 *                 `avgYac` came from the covariate bus.
 *  - `ok: false` → the bus returned null (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type YacBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof YAC_BIND_METHOD_TAG;
      readonly sample: BoundAirYacSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof YAC_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row" | "null_yac" | "non_finite_yac";
    };

/**
 * Bind NGS weekly-mean avgYac (from the covariate bus) into a batch of air+YAC
 * samples, producing leak-safe `BoundAirYacSample`s.
 *
 * For each request:
 *   1. `nextGameCovariate(rows, gsisId, season, kickoffWeek, "receiving", "avgYac")`
 *      — strictly-prior per-game receiving row, week=0 excluded, fail-closed.
 *   2. If the cell is non-null → build the sample with `avgYac` = the bus value
 *      (weekly mean per reception, NOT a per-target arrival YAC).
 *   3. If the cell is null → DROP the sample (refuse: "no_prior_row").
 *
 * The caller no longer invents YAC. 3.0 yards is never emitted here.
 */
export function bindYacSamples(
  rows: readonly CovariateRow[],
  requests: readonly YacBindRequest[],
): YacBindResult[] {
  const out: YacBindResult[] = [];
  for (const req of requests) {
    const cell: CovariateCell | null = nextGameCovariate(
      rows,
      req.gsisId,
      req.season,
      req.kickoffWeek,
      "receiving",
      "avgYac",
    );
    if (cell === null) {
      out.push({
        ok: false,
        methodTag: YAC_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }
    // Defensive guard: the bus already returns null for non-finite, but guard regardless.
    const v = cell.value;
    if (v === null || Number.isNaN(v) || !Number.isFinite(v)) {
      out.push({
        ok: false,
        methodTag: YAC_BIND_METHOD_TAG,
        priced: false,
        refuse: Number.isNaN(v) ? "non_finite_yac" : "null_yac",
      });
      continue;
    }
    out.push({
      ok: true,
      methodTag: YAC_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        receptions: req.airYac.receptions,
        airYards: req.airYac.airYards,
        yac: req.airYac.yac,
        // Weekly NGS mean yards-after-catch per reception, week t for game t+1.
        avgYac: cell,
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundYacSamples(
  rows: readonly CovariateRow[],
  requests: readonly YacBindRequest[],
): BoundAirYacSample[] {
  return bindYacSamples(rows, requests)
    .filter((r): r is Extract<YacBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
