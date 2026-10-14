/**
 * YACOE (yards-after-catch-over-expectation) covariate bind: forwards
 * weekly NGS receiving `yacAboveExpected` into RecTdSample enrichments for
 * the receiving-TD model (props-hb-rec-td).
 *
 * H2 Edge — Receiving TDs.
 *
 * EDGE THESIS: Books price receiving TDs on red-zone targets and target
 * volume but miss the YAC-ability signal. A receiver who consistently
 * generates positive YACOE turns short passes into long gains, extends
 * drives, and creates red-zone opportunities the market never prices in.
 * The covariate bus carries `yacAboveExpected` (weekly NGS mean per
 * reception) — leak-safe at week t for game t+1, NOT a y-axis prediction.
 *
 * This is a BIND, not a model. It couples `yacAboveExpected` (from the
 * covariate bus) into `RecTdSample` enrichments for the receiving-TDs
 * count model. The model ships `priced: false` (shadow-only signal).
 *
 * Fail-closed:
 *  - `null` / non-finite `yacAboveExpected` on the latest prior row →
 *    `no_prior_row` refusal (sample dropped, never imputed).
 *  - No prior per-game row → `no_prior_row`.
 */
import type { CovariateCell, CovariateRow } from "./covariate-bus.js";
import { latestPriorRow } from "./covariate-bus.js";
import type { RecTdSample } from "./props-hb-rec-td.js";

export const YACOE_BIND_METHOD_TAG = "yacoe_bind_v1" as const;

/** One receiving-TD target that needs the YACOE covariate-bind from the bus. */
export interface YacoeBindRequest {
  /** Player gsis id — same gsisId as the NGS receiving rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rec-TD sample (targets / recTds) to enrich. */
  readonly recTd: RecTdSample;
}

/** `RecTdSample` enriched with leak-safe NGS yacAboveExpected. */
export interface BoundYacoeRecTdSample extends RecTdSample {
  /** Weekly NGS mean: yards-after-catch above expectation per reception. */
  readonly yacAboveExpected: CovariateCell;
}

/**
 * Result of binding the YACOE covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundYacoeRecTdSample whose
 *                 covariate came from the covariate bus.
 *  - `ok: false` → no prior row, or yacAboveExpected was null/non-finite
 *                 (fail-closed). The sample is DROPPED. `refuse` is
 *                 diagnostic, never a guess.
 */
export type YacoeBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof YACOE_BIND_METHOD_TAG;
      readonly sample: BoundYacoeRecTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof YACOE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_ngs_mean",
};

export function bindYacoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly YacoeBindRequest[],
): YacoeBindResult[] {
  const out: YacoeBindResult[] = [];
  for (const req of requests) {
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
        methodTag: YACOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const yacoe = row.yacAboveExpected;
    if (yacoe === null || yacoe === undefined || !Number.isFinite(yacoe)) {
      out.push({
        ok: false,
        methodTag: YACOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: YACOE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        targets: req.recTd.targets,
        recTds: req.recTd.recTds,
        // Weekly NGS mean YACOE — cell metadata from the bus contract.
        yacAboveExpected: { ...BUS_CELL, value: yacoe },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundYacoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly YacoeBindRequest[],
): BoundYacoeRecTdSample[] {
  return bindYacoeSamples(rows, requests)
    .filter((r): r is Extract<YacoeBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
