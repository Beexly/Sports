/**
 * RYOE (rush yards over expected per attempt) covariate bind: forwards weekly
 * NGS rushing ryoePerAtt into RushTdSample enrichments for the Rush TD model
 * (props-hb-rush-td).
 *
 * H2 Edge — Rush TDs.
 *
 * EDGE THESIS: Books price rush TDs based on goal-line volume but miss
 * efficiency signal. A RB with positive RYOE per attempt is gaining more than
 * the model expects on every carry — including red-zone carries that become
 * TDs. ryoePerAtt is the independent p-path efficiency covariate the rush-TD
 * count model never sees.
 *
 * This is a BIND, not a model. It couples `ryoePerAtt` (from the covariate
 * bus) into RushTdSample enrichments for the Rush TDs model.
 *
 * The Rush TDs *model* (props-hb-rush-td) scores raw rush-T/D counts via
 * Gamma-Poisson over rush attempts. The bind ships `ryoePerAtt` (weekly NGS
 * mean: rush yards over expected per attempt) as an independent process
 * covariate — the y-axis count model never sees it as a predictor.
 *
 * HONESTY:
 *  - `ryoePerAtt` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "rushing"`, `provenance: "weekly_ngs_mean"` — only
 *    rushing NGS rows feed this metric, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or ryoePerAtt is null/non-finite,
 *    the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { RushTdSample } from "./props-hb-rush-td.js";

export const RYOE_BIND_METHOD_TAG = "ryoe_bind_v1" as const;

/**
 * One rush-TD target that needs the RYOE covariate-bind from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior rushing row.
 */
export interface RyoeBindRequest {
  /** Player gsis id — same gsisId as the NGS rushing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rush-TD sample (rushAtt, rushTds) to enrich. */
  readonly rushTd: RushTdSample;
}

/**
 * `RushTdSample` enriched with leak-safe NGS ryoePerAtt. The `rushAtt` /
 * `rushTds` fields are the model's existing realized inputs (unchanged);
 * `ryoePerAtt` is the weekly NGS mean RYOE per attempt, week t for game t+1 —
 * an efficiency covariate, never y-axis.
 */
export interface BoundRushTdSample extends RushTdSample {
  /** Weekly NGS mean: rush yards over expected per attempt, from the covariate bus. */
  readonly ryoePerAtt: CovariateCell;
}

/**
 * Result of binding the RYOE covariate to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundRushTdSample whose
 *                 covariate came from the covariate bus.
 *  - `ok: false` → no prior row, or ryoePerAtt was null/non-finite
 *                 (fail-closed). The sample is DROPPED. `refuse` is
 *                 diagnostic, never a guess.
 */
export type RyoeBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof RYOE_BIND_METHOD_TAG;
      readonly sample: BoundRushTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof RYOE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_ngs_mean",
};

export function bindRyoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly RyoeBindRequest[],
): RyoeBindResult[] {
  const out: RyoeBindResult[] = [];
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
        methodTag: RYOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const ryoe = row.ryoePerAtt;
    if (ryoe === null || !Number.isFinite(ryoe)) {
      out.push({
        ok: false,
        methodTag: RYOE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: RYOE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        rushAtt: req.rushTd.rushAtt,
        rushTds: req.rushTd.rushTds,
        // Weekly NGS mean RYOE per attempt — cell metadata from the bus contract.
        ryoePerAtt: { ...BUS_CELL, value: ryoe },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundRyoeSamples(
  rows: readonly CovariateRow[],
  requests: readonly RyoeBindRequest[],
): BoundRushTdSample[] {
  return bindRyoeSamples(rows, requests)
    .filter((r): r is Extract<RyoeBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
