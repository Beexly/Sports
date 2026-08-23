/**
 * PD-rate covariate bind: forwards weekly PFR pass-deflection rate into the
 * PD model (props-hb-pd).
 *
 * H1 Edge #3 — Pass Deflections.
 *
 * This is a BIND, not a model. It couples `pdRate` (from the covariate bus)
 * into `PdSample` enrichments for the PD model.
 *
 * PFR `advstats_week_def` publishes per-player-game PD data. This bind
 * forwards the leak-safe weekly mean verbatim — week t for game t+1 — and
 * never crosses the same-week boundary.
 *
 * Fail-closed: if no prior per-game row exists, or pdRate is null /
 * non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { PdSample } from "./props-hb-pd.js";

export const PD_RATE_BIND_METHOD_TAG = "pd_rate_bind_v1" as const;

export interface PdBindRequest {
  readonly gsisId: string;
  readonly season: number;
  readonly kickoffWeek: number;
  readonly pd: PdSample;
}

export interface BoundPdSample extends PdSample {
  readonly pdRate: CovariateCell;
}

export type PdBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof PD_BIND_METHOD_TAG;
      readonly sample: BoundPdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof PD_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

export function bindPdSamples(
  rows: readonly CovariateRow[],
  requests: readonly PdBindRequest[],
): PdBindResult[] {
  const out: PdBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(rows, req.gsisId, req.season, "defense", req.kickoffWeek);
    if (row === null) {
      out.push({ ok: false, methodTag: PD_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    const rate = row.pdRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({ ok: false, methodTag: PD_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    out.push({
      ok: true,
      methodTag: PD_BIND_METHOD_TAG,
      priced: false,
      sample: {
        targets: req.pd.targets,
        pd: req.pd.pd,
        pdRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

export function boundPdSamples(rows: readonly CovariateRow[], requests: readonly PdBindRequest[]): BoundPdSample[] {
  return bindPdSamples(rows, requests)
    .filter((r): r is Extract<PdBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
