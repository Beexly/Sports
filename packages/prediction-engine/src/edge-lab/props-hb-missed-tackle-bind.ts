/**
 * Missed-tackle covariate bind: forwards weekly PFR `missedTackleRate` into
 * RecTdSample enrichments for the receiving-TD model (props-hb-rec-td).
 *
 * H2 Edge — Receiving TDs (swarm-PRE-3: missed-tackle-rate -> recTD, SIGN +).
 *
 * EDGE THESIS: Books price receiving TDs on red-zone targets and volume but
 * miss tackle-avoidance signal. A defense with a high missed-tackle rate
 * lets short completions turn into long gains and broken-play red-zone
 * trips — extra TD chances the market never prices in. missedTackleRate is
 * the independent p-path process covariate the rec-TD count model never sees.
 *
 * This is a BIND, not a model. It couples `missedTackleRate` (from the
 * covariate bus) into RecTdSample enrichments for the Receiving TDs model.
 *
 * HONESTY:
 *  - `missedTackleRate` comes from week t for game t+1 (strict prior via
 *    latestPriorRow). Never week=0 (season aggregate), never same-week.
 *  - `statType: "defense"`, provenance `weekly_pfr_def_mean` — only PFR
 *    defensive rows feed this metric, preventing cross-vendor contamination.
 *  - Fail-closed: if no prior row exists, or missedTackleRate is null or
 *    non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { RecTdSample } from "./props-hb-rec-td.js";

export const MISSED_TACKLE_BIND_METHOD_TAG = "missed_tackle_bind_v1" as const;

/** One receiving-TD target that needs the missed-tackle covariate-bind. */
export interface MissedTackleBindRequest {
  /** Player gsis id — same gsisId as the PFR defensive rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rec-TD sample (targets / recTds) to enrich. */
  readonly recTd: RecTdSample;
}

/** `RecTdSample` enriched with leak-safe PFR missed-tackle rate. */
export interface BoundMissedTackleRecTdSample extends RecTdSample {
  /** Weekly PFR mean: missed tackles / tackles attempted, from the covariate bus. */
  readonly missedTackleRate: CovariateCell;
}

/**
 * Result of binding the missed-tackle covariate to a request.
 *  - `ok: true`  → sample fully bound from the bus.
 *  - `ok: false` → fail-closed drop (`no_prior_row`). Diagnostic, never a guess.
 */
export type MissedTackleBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof MISSED_TACKLE_BIND_METHOD_TAG;
      readonly sample: BoundMissedTackleRecTdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof MISSED_TACKLE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

export function bindMissedTackleSamples(
  rows: readonly CovariateRow[],
  requests: readonly MissedTackleBindRequest[],
): MissedTackleBindResult[] {
  const out: MissedTackleBindResult[] = [];
  for (const req of requests) {
    // Single strict-prior scan — week=0 excluded, week >= kickoffWeek excluded.
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
        methodTag: MISSED_TACKLE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Fail-closed on null/non-finite — never imputed.
    const mtr = row.missedTackleRate;
    if (mtr === null || !Number.isFinite(mtr)) {
      out.push({
        ok: false,
        methodTag: MISSED_TACKLE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: MISSED_TACKLE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        targets: req.recTd.targets,
        recTds: req.recTd.recTds,
        // Weekly PFR def mean missed-tackle rate — cell metadata from bus contract.
        missedTackleRate: { ...BUS_CELL, value: mtr },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundMissedTackleSamples(
  rows: readonly CovariateRow[],
  requests: readonly MissedTackleBindRequest[],
): BoundMissedTackleRecTdSample[] {
  return bindMissedTackleSamples(rows, requests)
    .filter((r): r is Extract<MissedTackleBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
