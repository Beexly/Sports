/**
 * Rush-yards covariate bind: couples the covariate bus (PR 1) to the
 * rushing-yards | attempts model (props-hb-rush).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent rushing yards.
 *
 * `props-hb-rush.ts` models rushing yards given attempts as a two-part
 * NB: attempts ~ Gamma-Poisson, yards | attempts ~ Gamma-Poisson. Its
 * `RushSample` carries only the *realized* `attempts` and `yards` — the
 * historical samples the prior fits on. Nothing upstream fed it a leak-safe,
 * honest NGS signal for how often the back faces a stacked box.
 *
 * The covariate bus (`covariate-bus.ts`) is the single source of the
 * key process signal: the latest `1..kickoffWeek-1` NGS rushing row's
 * `pctAttemptsGte8Defenders` — the fraction of rushing attempts facing
 * 8+ defenders in the box, a weekly NGS mean. A stacked-box signal is a
 * process/coverage covariate: more 8-in-the-box → fewer designed runs
 * through the hole → shorter gains, even for the same back.
 *
 *   - `pctAttemptsGte8Defenders` (L2, covariate): weekly NGS mean share of
 *     rushing attempts facing 8+ in the box, week t for game t+1. Forwarded
 *     verbatim into the `RushSample` enrichment. NOT y-axis.
 *   - `avgTimeToLos` (L2, covariate): weekly NGS mean seconds from snap to
 *     LOS crossing, week t for game t+1. A tempo/defense-depth signal —
 *     slower TtLOS suggests a deeper box / longer-developing run.
 *
 * IMPORTANT grain distinction (the gap map's honesty rule,
 * docs/data/PROP_COVARIATE_GAP.md §4):
 *  - `pctAttemptsGte8Defenders` is a weekly MEAN share, NOT a per-carry
 *    frame measurement. Every emitted cell carries its grain and provenance
 *    so the y-axis model can tell the difference.
 *  - `expectedRushYards` (vendor / vendor-residual): y-axis only, GSE-RYOE
 *    referee. The bus never emits it; this bind never reads it.
 *  - `ryoePerAtt` (RYOE per attempt): H2 Edge efficiency covariate — see
 *    props-hb-ryoe-bind. Promoted from y-axis-only to a p-path covariate.
 *
 * The bind forwards the weekly means verbatim and never crosses the same-week
 * boundary.
 *
 * Fail-closed: if `latestPriorRow(..., "rushing", kickoffWeek)`
 * returns null (no prior per-game history, or only a week=0 aggregate row),
 * or if the prior row's `pctAttemptsGte8Defenders` / `avgTimeToLos` is
 * null/non-finite, the sample is DROPPED. It is NOT imputed.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path rushing-yards covariates meet the rush model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { RushSample } from "./props-hb-rush.js";

export const RUSH_YARDS_BIND_METHOD_TAG = "rush_yards_bind_v1" as const;

/**
 * One rushing-yards target that still needs covariate-binds from the bus.
 * The caller supplies identity + the kickoff week it is predicting so the
 * bus can pick the strictly-prior rushing row.
 */
export interface RushYardsBindRequest {
  /** Player gsis id — same gsisId as the NGS rushing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The rushing sample (attempts / yards) to enrich. */
  readonly rush: RushSample;
}

/**
 * `RushSample` enriched with leak-safe NGS covariates. The `attempts` /
 * `yards` fields are the model's existing realized inputs (unchanged);
 * `pctAttemptsGte8Defenders` and `avgTimeToLos` are weekly NGS means,
 * week t for game t+1 — independent p-path covariates, never y-axis.
 */
export interface BoundRushSample extends RushSample {
  /** Weekly NGS share of rush attempts vs 8+ in the box, from the covariate bus. */
  readonly pctAttemptsGte8Defenders: CovariateCell;
  /** Weekly NGS mean time-to-LOS (seconds), from the covariate bus. */
  readonly avgTimeToLos: CovariateCell;
}

/**
 * Result of binding rushing covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundRushSample whose
 *                 covariates came from the covariate bus.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 */
export type RushYardsBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof RUSH_YARDS_BIND_METHOD_TAG;
      readonly sample: BoundRushSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof RUSH_YARDS_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/**
 * Bind NGS weekly-mean `pctAttemptsGte8Defenders` + `avgTimeToLos` (from the
 * covariate bus) into a batch of rushing samples, producing leak-safe
 * `BoundRushSample`s.
 *
 * For each request:
 *   1. `latestPriorRow(rows, gsisId, season, "rushing", kickoffWeek)` — one
 *      strict-prior scan (week=0 excluded, week >= kickoffWeek excluded).
 *   2. If no prior row → refuse `no_prior_row` (fail-closed).
 *   3. Read `pctAttemptsGte8Defenders` and `avgTimeToLos` directly from that row.
 *      If either is null/non-finite → refuse `no_prior_row` (fail-closed,
 *      never imputed).
 *   4. If both are valid → build the sample with the bus's cell metadata
 *      (grain + provenance) as CovariateCells.
 *
 * The bus's `nextGameCovariate` returns a complete `CovariateCell` — we use the
 * same cell template (`BUS_CELL`) so any future bus provenance evolution
 * propagates via a single source of truth on the bus. The value comes directly
 * from the row we already scanned, avoiding a second O(N) scan per field.
 *
 * The 8-in-the-box share and time-to-LOS are weekly MEANS, NOT per-carry
 * frame measurements — every emitted cell carries its grain and provenance.
 */

/** Cell template matching the covariate bus's contract — single source of truth. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };

export function bindRushYardsSamples(
  rows: readonly CovariateRow[],
  requests: readonly RushYardsBindRequest[],
): RushYardsBindResult[] {
  const out: RushYardsBindResult[] = [];
  for (const req of requests) {
    // Single strict-prior scan — not one per covariate field.
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
        methodTag: RUSH_YARDS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    // Read both fields from the single prior row; fail-closed on null/non-finite.
    const boxShare = row.pctAttemptsGte8Defenders;
    if (boxShare === null || !Number.isFinite(boxShare)) {
      out.push({
        ok: false,
        methodTag: RUSH_YARDS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const tlos = row.avgTimeToLos;
    if (tlos === null || !Number.isFinite(tlos)) {
      out.push({
        ok: false,
        methodTag: RUSH_YARDS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: RUSH_YARDS_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        attempts: req.rush.attempts,
        yards: req.rush.yards,
        // Weekly NGS mean share of rush attempts vs 8+ in the box — cell
        // metadata forwarded from the bus contract template.
        pctAttemptsGte8Defenders: { ...BUS_CELL, value: boxShare },
        // Weekly NGS mean time-to-LOS (seconds).
        avgTimeToLos: { ...BUS_CELL, value: tlos },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundRushYardsSamples(
  rows: readonly CovariateRow[],
  requests: readonly RushYardsBindRequest[],
): BoundRushSample[] {
  return bindRushYardsSamples(rows, requests)
    .filter((r): r is Extract<RushYardsBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
