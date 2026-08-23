/**
 * PD-rate covariate bind: forwards weekly PFR pass-deflection rate into the
 * PD model (props-hb-pd).
 *
 * H1 Edge #3 — Pass Deflections.
 *
 * This is a BIND, not a model. It couples `pdRate` (from the covariate bus)
 * into `PdSample` enrichments for the PD model.
 *
 * The PD *model* (props-hb-pd) scores raw per-game PD counts via Gamma-Poisson.
 * The bind ships `pdRate` (PFR weekly mean: PD per target) as an independent
 * process covariate — the y-axis count model never sees it. This separation
 * preserves the honesty gap rule: covariates come from week t for game t+1,
 * never the same-week boundary.
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

/**
 * One PD target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior defensive row.
 */
export interface PdBindRequest {
  /** Player gsis id — same gsisId as the PFR/ESPN defensive rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The PD sample (games / total PD) to enrich. */
  readonly pd: PdSample;
}

/**
 * `PdSample` enriched with leak-safe PFR defensive covariates. The\n * `games` / `pd` fields are the model's existing realized inputs\n * (unchanged); `pdRate` is a weekly PFR mean, week t for game t+1 — an\n * independent p-path covariate, never y-axis.
 */
export interface BoundPdSample extends PdSample {
  /** Weekly PFR mean pass-deflection rate (pd per target), from the covariate bus. */
  readonly pdRate: CovariateCell;
}

/**
 * Result of binding PD-rate covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundPdSample whose
 *                 covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type PdBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof PD_RATE_BIND_METHOD_TAG;
      readonly sample: BoundPdSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof PD_RATE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

/**
 * Bind PFR weekly-mean `pdRate` (from the covariate bus) into a batch
 * of PD samples, producing leak-safe `BoundPdSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "defense", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `pdRate` directly from that row.
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
export function bindPdSamples(
  rows: readonly CovariateRow[],
  requests: readonly PdBindRequest[],
): PdBindResult[] {
  const out: PdBindResult[] = [];
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
        methodTag: PD_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read pdRate directly from the single prior row; fail-closed on null/non-finite.
    const rate = row.pdRate;
    if (rate === null || !Number.isFinite(rate)) {
      out.push({
        ok: false,
        methodTag: PD_RATE_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: PD_RATE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        games: req.pd.games,
        pd: req.pd.pd,
        // Weekly PFR mean PD rate (pd per target) — cell metadata from bus contract.
        pdRate: { ...BUS_CELL, value: rate },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundPdSamples(
  rows: readonly CovariateRow[],
  requests: readonly PdBindRequest[],
): BoundPdSample[] {
  return bindPdSamples(rows, requests)
    .filter((r): r is Extract<PdBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
