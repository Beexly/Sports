/**
 * Covariate bus: pure leak-safe feature extraction from NGS weekly rows.
 *
 * Company posture (Galaxy Sports Edge): independent p with process, then
 * e = p − q. The site is a window — we do NOT build chrome. This module is
 * the covariate side of that split: it reads NGS weekly-mean rows already
 * shaped by the data-ingestion parsers and returns the *input* features (p
 * path inputs), never the y-axis.
 *
 * LEAK SAFETY (enforced in code, not by convention):
 *   - `week=0` is the NGS full-season aggregate → it is the season total,
 *     never a next-game covariate. It is dropped unconditionally.
 *   - Features for the game at week `t+1` are drawn ONLY from weeks
 *     `1..t`. Same-week is never read. No same-week, no future.
 *   - If no qualifying prior row exists, the result is `null`
 *     (fail-closed). We do not impute. We do not invent.
 *
 * HONESTY (weekly mean ≠ catch frame):
 *   - NGS `avg_separation` is a weekly MEAN over catch/incompletion frames,
 *     not a single arrival-separation measurement. Callers must not treat
 *     the scalar as a per-target arrival SEP. Every cell carries its grain
 *     and provenance so the y-axis model can tell the difference.
 *
 * NEVER as p (these are y-axis, excluded from the bus):
 *   - `expectedCompletionPct`        (passing NGS proprietary model)
 *   - `avgExpectedYac`               (receiving NGS proprietary model)
 *   - `expectedRushYards` / `ryoe`   (rushing NGS proprietary model)
 *   - vendor `cpoe`                  (published CPOE)
 * The bus exposes none of the above; it only emits the covariate fields
 * listed under `CovariateField` (avgYac included — it is the per-reception
 * YAC mean, a process/scheme signal, not the per-target arrival YAC the y-axis
 * model fits).
 *
 * Pure. No I/O. No Prisma. No model inference.
 */

export const COVARIATE_BUS_METHOD_TAG = "covariate_bus_v1" as const;

export type StatType = "receiving" | "passing" | "rushing";

/**
 * Normalized NGS weekly-mean row. The data-ingestion parsers
 * (packages/data-ingestion/src/nflverse-ngs.ts) shape raw CSV records into
 * this contract. Field names are the parser names, not renamed to `p`.
 *
 * `week=0` (NGS_FULL_SEASON_WEEK) is the season aggregate; it is valid data
 * to carry through for calibration, but it is NEVER selected as a next-game
 * covariate by `sepForKickoff` / `nextGameCovariate`.
 */
export interface CovariateRow {
  readonly gsisId: string;
  readonly season: number;
  readonly week: number; // 1..22 per-game; 0 = full-season aggregate
  readonly statType: StatType;
  // ── receiving ─────────────────────────────────────────────
  readonly avgSeparation: number | null; // weekly mean, yards — NOT catch-frame
  readonly avgCushion: number | null; // weekly mean, yards
  readonly airYardsShare: number | null; // % of team intended air yards (volume / T only)
  // ── passing ───────────────────────────────────────────────
  readonly avgTimeToThrow: number | null; // seconds, weekly mean
  readonly aggressiveness: number | null; // % throws into tight coverage (<1 yd)
  readonly avgIntendedAirYards: number | null; // yards per attempt, weekly mean
  // ── rushing ─────────────────────────────────────────────────────────────
  /** % of rushing attempts facing 8+ defenders in the box. */
  readonly pctAttemptsGte8Defenders: number | null;
  readonly avgTimeToLos: number | null; // seconds from snap to LOS crossing, weekly mean
  // ── yac (receiving, covariate) ─────────────────────────────────────────────
  /** Average yards-after-catch per reception (weekly NGS mean). NOT per-target arrival YAC. */
  readonly avgYac: number | null;
  // ── receiving vendor y-axis (NEVER exposed as p) ──────────────────────────
  /** NFL NGS proprietary xYAC. Y-axis only — the bus never emits this as a covariate. */
  readonly avgExpectedYac: number | null;
  /** NFL NGS rush-yards-over-expected. Y-axis only. */
  readonly expectedRushYards: number | null;
}

/**
 * The covariate fields the bus is willing to hand to a model as independent
 * inputs. Vendor `p` metrics (expected-completion, xYAC, xRY, CPOE, RYOE) are
 * deliberately absent — they are y-axis, never p.
 */
export type CovariateField =
  | "avgSeparation"
  | "avgCushion"
  | "airYardsShare"
  | "avgTimeToThrow"
  | "aggressiveness"
  | "avgIntendedAirYards"
  | "pctAttemptsGte8Defenders"
  | "avgTimeToLos"
  | "avgYac";

/** Grain + provenance tag so callers never mistake a weekly mean for a
 * single-frame measurement. Honest header on every emitted cell. */
export type CovariateGrain = "week_t_for_tplus1";
export type CovariateProvenance = "weekly_ngs_mean";

export interface CovariateCell {
  readonly value: number;
  readonly grain: CovariateGrain;
  readonly provenance: CovariateProvenance;
}

/** Stable row key for dedup / join. */
export function covariateKey(gsisId: string, season: number, week: number, statType: StatType): string {
  return `${gsisId}|${season}|${week}|${statType}`;
}

/**
 * Select the latest prior-game row for a player's stat line.
 *
 * Leak rule: only weeks in `1..kickoffWeek-1` are eligible. `week=0`
 * (season aggregate) is excluded here even though it is a valid CovariateRow,
 * because a season-total is not a per-game input for the kickoff game.
 *
 * Returns the single latest qualifying row (by week), or `null` when no
 * per-game history exists before kickoff (fail-closed).
 */
export function latestPriorRow(
  rows: readonly CovariateRow[],
  gsisId: string,
  season: number,
  statType: StatType,
  kickoffWeek: number,
): CovariateRow | null {
  let best: CovariateRow | null = null;
  for (const r of rows) {
    if (r.gsisId !== gsisId) continue;
    if (r.season !== season) continue;
    if (r.statType !== statType) continue;
    if (r.week === 0) continue; // season aggregate — never a next-game X
    if (r.week <= 0 || r.week >= kickoffWeek) continue; // leak-safe: strictly prior
    if (best === null || r.week > best.week) best = r;
  }
  return best;
}

/**
 * Pull a single covariate field from the latest prior-game row.
 *
 * Returns `{ value, grain, provenance }` when a finite field value is
 * available on the latest eligible week `t < kickoffWeek` row, otherwise
 * `null` (fail-closed — does not impute, does not cross the same-week
 * boundary).
 */
export function nextGameCovariate(
  rows: readonly CovariateRow[],
  gsisId: string,
  season: number,
  kickoffWeek: number,
  statType: StatType,
  field: CovariateField,
): CovariateCell | null {
  const row = latestPriorRow(rows, gsisId, season, statType, kickoffWeek);
  if (row === null) return null; // no history before kickoff — fail closed
  const raw = row[field];
  if (raw === null || !Number.isFinite(raw)) return null;
  return { value: raw, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" };
}

/**
 * Receiving separation covariate for the kickoff game.
 *
 * Uses the latest `1..kickoffWeek-1` receiving row's `avgSeparation` —
 * a weekly MEAN over catch/incompletion frames, not an arrival separation.
 * If the player has no per-game receiving history before kickoffWeek,
 * returns `null` (fail-closed). Does NOT use week=0 (season aggregate),
 * does NOT use same-week, does NOT impute.
 *
 * Callers bind this into the aDOT×SEP catch model via `AdotSepCatchSample`.
 */
export function sepForKickoff(
  rows: readonly CovariateRow[],
  gsisId: string,
  season: number,
  kickoffWeek: number,
): CovariateCell | null {
  return nextGameCovariate(rows, gsisId, season, kickoffWeek, "receiving", "avgSeparation");
}

export { COVARIATE_BUS_METHOD_TAG as COVARIATE_BUS_TAG };
