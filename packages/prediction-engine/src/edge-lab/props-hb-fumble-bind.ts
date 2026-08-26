/**
 * Fumble-rate covariate bind: forwards weekly PFR fumble rate into the
 * Fumbles model (props-hb-fumble).
 *
 * H2 Edge — Fumbles.
 *
 * This is a BIND, not a model. It couples `fumbleRate` (from the covariate
 * bus) into FumbleSample enrichments for the Fumbles model.
 *
 * The Fumbles *model* (props-hb-fumble) scores raw fumble counts via
 * Beta-Binomial over touches. The bind ships `fumbleRate` (weekly PFR mean:
 * fumbles per touch) as an independent process covariate — the y-axis
 * count model never sees it.
 *
 * HONESTY:
 *  - `fumbleRate` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "defense"`, `provenance: "weekly_pfr_def_mean"` — only
 *    defense rows feed this rate, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or fumbleRate is null/non-finite,
 *    the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { FumbleSample, FumblePrior } from "./props-hb-fumble.js";
import { fumblePosterior, probOverFumble } from "./props-hb-fumble.js";

export const FUMBLE_BIND_METHOD_TAG = "fumble_rate_bind_v1" as const;

export interface FumbleBindRequest {
  readonly gsisId: string;
  readonly season: number;
  readonly kickoffWeek: number;
  readonly fumble: FumbleSample;
}

export interface BoundFumbleSample extends FumbleSample {
  readonly fumbleRate: CovariateCell;
}

export type FumbleBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof FUMBLE_BIND_METHOD_TAG;
      readonly sample: BoundFumbleSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof FUMBLE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

const BUS_CELL: CovariateCell = {
  value: 0,
  grain: "week_t_for_tplus1",
  provenance: "weekly_pfr_def_mean",
};

export function bindFumbleSamples(
  rows: readonly CovariateRow[],
  requests: readonly FumbleBindRequest[],
): FumbleBindResult[] {
  const out: FumbleBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "defense",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({ ok: false, methodTag: FUMBLE_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    const rate = row.fumbleRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({ ok: false, methodTag: FUMBLE_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    out.push({
      ok: true,
      methodTag: FUMBLE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        touches: req.fumble.touches,
        fumbles: req.fumble.fumbles,
        fumbleRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

export function boundFumbleSamples(
  rows: readonly CovariateRow[],
  requests: readonly FumbleBindRequest[],
): BoundFumbleSample[] {
  return bindFumbleSamples(rows, requests)
    .filter((r): r is Extract<FumbleBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}

export function scoreFumbleOver(
  rows: readonly CovariateRow[],
  req: FumbleBindRequest,
  prior: FumblePrior,
  line: number,
): number | null {
  const results = bindFumbleSamples(rows, [req]);
  if (!results[0] || !results[0].ok) return null;
  const sample = results[0].sample;
  const post = fumblePosterior(prior, sample.fumbles, sample.touches);
  return probOverFumble(post, line, sample.touches);
}
