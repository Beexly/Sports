/**
 * SEP bind: couples the covariate bus (PR 1) to the aDOT×SEP catch model.
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent separation.
 *
 * `props-hb-adot-sep.ts` already required an `avgSeparation: number` on every
 * `AdotSepCatchSample`, but nothing upstream fed it a leak-safe, honest value —
 * the caller was free to hand-wave a constant ("3.0 yards") or copy next-gen
 * stats into a served metric. That is over.
 *
 * The covariate bus (`covariate-bus.ts` / `sepForKickoff`) is the single source
 * of the separation input: the latest `1..kickoffWeek-1` NGS receiving row's
 * `avg_separation`, returned as `{ value, grain: "week_t_for_tplus1",
 * provenance: "weekly_ngs_mean" }`. That is a weekly MEAN over catch frames —
 * NOT an arrival separation. The bind forwards that mean verbatim and never
 * crosses the same-week boundary.
 *
 * Fail-closed: if `sepForKickoff` returns null (no prior per-game history,
 * null/ non-finite field, or only a week=0 aggregate row), the sample is DROPPED.
 * It is NOT imputed. It is NOT replaced with 3.0 yards. The aDOT×SEP cell
 * is allowed to have fewer samples — fewer than noise is still honest.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path covariate meets the catch-rate model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import { sepForKickoff, type CovariateRow, type CovariateCell } from "./covariate-bus.js";
import type { AdotCatchSample } from "./props-hb-adot-catch.js";
import type { AdotSepCatchSample } from "./props-hb-adot-sep.js";

export const SEP_BIND_METHOD_TAG = "sep_bind_v1" as const;

/**
 * One aDOT×SEP catch target that still needs separation bound from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the bus
 * can pick the strictly-prior receiving row.
 */
export interface SepBindRequest {
  /** Player join key — same gsisId as the NGS receiving rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The aDOT catch sample (targets / receptions / airYards) to enrich. */
  readonly adot: AdotCatchSample;
}

/**
 * Result of binding separation to a request.
 *  - `ok: true`  → `sample` is a fully-honest AdotSepCatchSample whose
 *                   avgSeparation came from the covariate bus.
 *  - `ok: false` → the bus returned null (fail-closed). The sample is DROPPED.
 *                   `reason` is diagnostic, never a guess.
 */
export type SepBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof SEP_BIND_METHOD_TAG;
      readonly sample: AdotSepCatchSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof SEP_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row" | "null_separation" | "non_finite_separation";
    };

/**
 * Bind NGS weekly-mean separation (from the covariate bus) into a batch of
 * aDOT catch samples, producing leak-safe `AdotSepCatchSample`s.
 *
 * For each request:
 *   1. `sepForKickoff(rows, gsisId, season, kickoffWeek)` — strictly-prior
 *      per-game receiving row, week=0 excluded, fail-closed.
 *   2. If the cell is non-null → build the sample with `avgSeparation` = the
 *      bus value (weekly mean, NOT arrival separation).
 *   3. If the cell is null → DROP the sample (refuse: "no_prior_row").
 *
 * The caller no longer invents separation. 3.0 yards is never emitted here.
 */
export function bindSepSamples(
  rows: readonly CovariateRow[],
  requests: readonly SepBindRequest[],
): SepBindResult[] {
  const out: SepBindResult[] = [];
  for (const req of requests) {
    const cell: CovariateCell | null = sepForKickoff(rows, req.gsisId, req.season, req.kickoffWeek);
    if (cell === null) {
      out.push({ ok: false, methodTag: SEP_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }
    const v = cell.value;
    if (v === null || !Number.isFinite(v)) {
      // Defensive: bus already returns null for non-finite, but guard regardless.
      out.push({
        ok: false,
        methodTag: SEP_BIND_METHOD_TAG,
        priced: false,
        refuse: Number.isNaN(v) ? "non_finite_separation" : "null_separation",
      });
      continue;
    }
    out.push({
      ok: true,
      methodTag: SEP_BIND_METHOD_TAG,
      priced: false,
      sample: {
        targets: req.adot.targets,
        receptions: req.adot.receptions,
        airYards: req.adot.airYards,
        // Weekly NGS mean over catch/incompletion frames, week t for game t+1.
        avgSeparation: v,
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundSepSamples(
  rows: readonly CovariateRow[],
  requests: readonly SepBindRequest[],
): AdotSepCatchSample[] {
  return bindSepSamples(rows, requests)
    .filter((r): r is Extract<SepBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
