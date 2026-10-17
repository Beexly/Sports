/**
 * Rush-pct-over-expected (RPOE) covariate bind: forwards weekly NGS rushing
 * rushPctOverExpected into RushTdSample enrichments for the Rush TD model
 * (props-hb-rush-td).
 *
 * H2 Edge — Rush TDs.
 *
 * EDGE THESIS: Books price rush TDs on goal-line volume but miss the
 * efficiency-over-expectation signal. A RB who consistently exceeds expected
 * yards on a high percentage of carries is hitting holes better — and that
 * includes red-zone carries that turn into TDs. rushPctOverExpected (the % of
 * rushing attempts that gained more yards than NGS expected) is the independent
 * p-path efficiency covariate the rush-TD count model never sees.
 *
 * This is a BIND, not a model. It couples `rushPctOverExpected` (from the
 * covariate bus) into RushTdSample enrichments for the Rush TDs model.
 *
 * The Rush TDs *model* (props-hb-rush-td) scores raw rush-T/D counts via
 * Gamma-Poisson over rush attempts. The bind ships `rushPctOverExpected`
 * (weekly NGS mean: % of attempts over expected) as an independent process
 * covariate — the y-axis count model never sees it as a predictor.
 *
 * HONESTY:
 *  - `rushPctOverExpected` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "rushing"`, `provenance: "weekly_ngs_mean"` — only
 *    rushing NGS rows feed this metric, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or rushPctOverExpected is
 *    null/non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { RushTdSample } from "./props-hb-rush-td.js";

export const RPOE_BIND_METHOD_TAG = "rpoe_bind_v1" as const;

/**
 * One rush-TD target that needs the RPOE covariate-bind from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior rushing row.
 */
export interface RpoeBindRequest {
  /** Player gsis id — same gsisId as the NGS rushing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rush-TD sample (rushAtt, rushTds) to enrich. */
  readonly rushTd: RushTdSample;
}

/**
 * `RushTdSample` enriched with leak-safe NGS rushPctOverExpected. The
 * `rushAtt` / `rushTds` fields are the model's existing realized inputs
 * (unchanged); `rushPctOverExpected` is the weekly NGS mean % of rushes over
 * expected, week t for game t+1 — an efficiency covariate, never y-axis.
 */
export interface BoundRpoRushTdSample extends RushTdSample {
  /** Weekly NGS mean: % of rushing attempts that exceeded expected yards. */
  readonly rushPctOverExpected: CovariateCell;
}

/**
 * Result of binding the RPOE covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundRpoRushTdSample whose
 *                 covariate came from the covariate bus.
 *  - `ok: false` → no prior row, or rushPctOverExpected was null/non-finite
 *                 (fail-closed). The sample is DROPPED. `refuse` is
 *                 diagnostic, never a guess.
 */
export type RpoeBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof RPOE_BIND_METHOD_TAG;
      readonly sample: BoundRpoRushTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof RPOE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_ngs_mean",
};

export function bindRpoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly RpoeBindRequest[],
): RpoeBindResult[] {
  const out: RpoeBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "rushing",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: RPOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const rpoe = row.rushPctOverExpected;
    if (rpoe === null || !Number.isFinite(rpoe)) {
      out.push({
        ok: false,
        methodTag: RPOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: RPOE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        rushAtt: req.rushTd.rushAtt,
        rushTds: req.rushTd.rushTds,
        // Weekly NGS mean % of rushes over expected — cell metadata from the bus contract.
        rushPctOverExpected: { ...BUS_CELL, value: rpoe },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundRpoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly RpoeBindRequest[],
): BoundRpoRushTdSample[] {
  return bindRpoeSamples(rows, requests)
    .filter((r): r is Extract<RpoeBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
