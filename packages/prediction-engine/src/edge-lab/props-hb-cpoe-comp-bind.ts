/**
 * CPOE completion bind: couples the covariate bus (PR 1) + GSE-CPOE (L2) to
 * the completions | attempts model (props-hb-comp).
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent completion rate.
 *
 * `props-hb-comp.ts` models completions | attempts as a Beta-Binomial on the
 * pooled completion rate. That model has only two inputs: attempts and
 * completions. It cannot condition on *how* the pass was thrown — throw timing,
 * intended air yards, or QB accuracy over expected. This bind enriches each
 * `CompSample` with three independent-p covariates drawn from leak-safe
 * weekly sources:
 *
 *   1. `avgTimeToThrow` (passing NGS weekly mean, from the covariate bus) —
 *      the public pressure proxy for `qb_hit`: shorter TTT = more pressure
 *      = lower completion likelihood. The bus already enforces week t → t+1,
 *      week=0 excluded, fail-closed.
 *   2. `avgIntendedAirYards` (passing NGS weekly mean, from the covariate bus) —
 *      intended air yards per attempt. Deeper throws complete less often.
 *   3. `gseCpoe` (GSE-CPOE, computed by our own PBP model in
 *      `expected-metrics/expected-completion.ts`) — the passer's completion
 *      percentage over expected, fit on CC-BY play-by-play. Fed as-is, NOT
 *      crossed with the same-week row.
 *
 * GSE-CPOE is our IP — computed from public PBP features (airYards, qbHit,
 * passLocation, down, ydstogo, yardline100, shotgun, noHuddle). NGS's vendor
 * `expectedCompletionPct` / `cpoe` are y-axis only and are NEVER read here.
 *
 * Fail-closed: if the covariate bus has no prior passing row for the player
 * (no prior-game history, or only a week=0 aggregate row), or if the prior
 * row's `avgTimeToThrow` / `avgIntendedAirYards` is null/non-finite, the
 * sample is DROPPED. It is NOT imputed. The
 * completions cell is allowed to have fewer samples — fewer than noise is
 * still honest.
 *
 * Grain: every emitted cell carries `{ value, grain: "week_t_for_tplus1",
 * provenance: "weekly_ngs_mean" }` for the bus fields, so the y-axis model
 * can tell the weekly mean is not a per-play frame. GSE-CPOE carries its own
 * `expected_metric_v1` provenance as a CovariateCell.
 *
 * As-of boundary: `gseCpoeAsOfWeek` must be strictly less than `kickoffWeek`
 * AND non-zero (week=0 is the season aggregate). A season-level result or any
 * at-week value is refused — GSE-CPOE must be computed through the same
 * prior-window boundary as the bus fields.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This bind is the
 * seam where the p-path covariates (bus + GSE-CPOE) meet the completions model.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { CompSample } from "./props-hb-comp.js";

export const CPOE_COMP_BIND_METHOD_TAG = "cpoe_comp_bind_v1" as const;

/** Provenance for the GSE-CPOE covariate — computed from CC-BY PBP, not NGS. */
export const GSE_CPOE_PROVENANCE = "expected_metric_v1" as const;

/**
 * One completions target that still needs covariate-binds from the bus +
 * GSE-CPOE. The caller supplies identity + the kickoff week it is predicting
 * so the bus can pick the strictly-prior passing row.
 */
export interface CpoeCompBindRequest {
  /** Player gsis id — same gsisId as the NGS passing rows. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted (features come from weeks < this). */
  readonly kickoffWeek: number;
  /** The completion sample (attempts/completions) to enrich. */
  readonly comp: CompSample;
  /**
   * GSE-CPOE for the passer — completion percentage points over expected.
   * Defined as `100 × mean(complete − P̂(complete))`, so signed values
   * (typically ~−20..+20 pp; theoretical range −100..+100). NOT an
   * absolute completion %; a negative value means below expected.
   */
  readonly gseCpoe: number;
  /**
   * The season-week through which `gseCpoe` was computed.
   * Must be an integer, non-zero (week=0 is the season aggregate), and
   * strictly less than `kickoffWeek`. Enforces the as-of boundary.
   */
  readonly gseCpoeAsOfWeek: number;
}

/**
 * `CompSample` enriched with leak-safe NGS covariates + GSE-CPOE.
 * The `attempts` / `completions` fields are the model's existing realized
 * inputs (unchanged); the three covariate cells are week t → t+1 signals
 * the completion-rate prior can condition on.
 */
export interface BoundCompSample extends CompSample {
  /** Weekly NGS mean time-to-throw (seconds), week t for game t+1. */
  readonly avgTimeToThrow: CovariateCell;
  /** Weekly NGS mean intended air yards per attempt, week t for game t+1. */
  readonly avgIntendedAirYards: CovariateCell;
  /**
   * GSE-CPOE (our PBP-fit), completion% over expected — signed pp.
   * Provenance-tagged so consumers distinguish it from vendor CPOE.
   */
  readonly gseCpoe: CovariateCell;
}

/**
 * Result of binding CPOE + NGS covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundCompSample whose covariates
 *                 came from the covariate bus + GSE-CPOE.
 *  - `ok: false` → a covariate was missing (fail-closed). The sample is DROPPED.
 *                 `refuse` is diagnostic, never a guess.
 */
export type CpoeCompBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof CPOE_COMP_BIND_METHOD_TAG;
      readonly sample: BoundCompSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof CPOE_COMP_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row" | "null_ttt" | "null_air_yards" | "non_finite_cpoe" | "cpoe_as_of_boundary";
    };

/**
 * Bind NGS weekly-mean `avgTimeToThrow`, `avgIntendedAirYards` (from the
 * covariate bus) + GSE-CPOE into a batch of completion samples.
 *
 * For each request:
 *   1. GSE-CPOE as-of guard: `gseCpoeAsOfWeek` must be a non-zero integer
 *      strictly less than `kickoffWeek`. Otherwise → refuse
 *      `cpoe_as_of_boundary`. Non-finite `gseCpoe` → refuse
 *      `non_finite_cpoe`.
 *   2. `latestPriorRow(rows, gsisId, season, "passing", kickoffWeek)` — a
 *      single strict-prior scan (week=0 excluded). If null → refuse
 *      `no_prior_row`.
 *   3. Read `avgTimeToThrow` / `avgIntendedAirYards` off that single row;
 *      non-finite/null → refuse with the specific code.
 *   4. Otherwise → build the BoundCompSample.
 *
 * One row scan per request (not two). Refuse codes are diagnostic, never
 * guesses — fail-closed, no imputation.
 */
export function bindCpoeCompSamples(
  rows: readonly CovariateRow[],
  requests: readonly CpoeCompBindRequest[],
): CpoeCompBindResult[] {
  const out: CpoeCompBindResult[] = [];
  const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };
  const CPOE_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: GSE_CPOE_PROVENANCE };
  for (const req of requests) {
    // GSE-CPOE as-of boundary: must be strictly prior to kickoff week AND
    // not the season-level aggregate (week=0). Season-level CPOE would leak the
    // season total into the prediction.
    if (
      !Number.isInteger(req.gseCpoeAsOfWeek) ||
      req.gseCpoeAsOfWeek === 0 ||
      req.gseCpoeAsOfWeek >= req.kickoffWeek
    ) {
      out.push({
        ok: false,
        methodTag: CPOE_COMP_BIND_METHOD_TAG,
        priced: false,
        refuse: "cpoe_as_of_boundary",
      });
      continue;
    }
    // GSE-CPOE value guard: non-finite → refuse, never invent.
    if (!Number.isFinite(req.gseCpoe)) {
      out.push({
        ok: false,
        methodTag: CPOE_COMP_BIND_METHOD_TAG,
        priced: false,
        refuse: "non_finite_cpoe",
      });
      continue;
    }

    // Single strict-prior scan — not one per covariate field.
    const row = latestPriorRow(
      rows,
      req.gsisId,
      req.season,
      "passing",
      req.kickoffWeek,
    );
    if (row === null) {
      out.push({
        ok: false,
        methodTag: CPOE_COMP_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_prior_row",
      });
      continue;
    }

    const ttt = row.avgTimeToThrow;
    if (ttt === null || !Number.isFinite(ttt)) {
      out.push({
        ok: false,
        methodTag: CPOE_COMP_BIND_METHOD_TAG,
        priced: false,
        refuse: "null_ttt",
      });
      continue;
    }

    const aiy = row.avgIntendedAirYards;
    if (aiy === null || !Number.isFinite(aiy)) {
      out.push({
        ok: false,
        methodTag: CPOE_COMP_BIND_METHOD_TAG,
        priced: false,
        refuse: "null_air_yards",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: CPOE_COMP_BIND_METHOD_TAG,
      priced: false,
      sample: {
        attempts: req.comp.attempts,
        completions: req.comp.completions,
        avgTimeToThrow: { ...BUS_CELL, value: ttt },
        avgIntendedAirYards: { ...BUS_CELL, value: aiy },
        gseCpoe: { ...CPOE_CELL, value: req.gseCpoe },
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundCpoeCompSamples(
  rows: readonly CovariateRow[],
  requests: readonly CpoeCompBindRequest[],
): BoundCompSample[] {
  return bindCpoeCompSamples(rows, requests)
    .filter((r): r is Extract<CpoeCompBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}
