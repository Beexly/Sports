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
 *   - `expectedRushYards` / `ryoe`   (rushing NGS proprietary TOTAL)
 *   - vendor `cpoe`                  (published CPOE)
 * The bus exposes none of the above; it only emits the covariate fields
 * listed under `CovariateField` (avgYac included — it is the per-reception
 * YAC mean, a process/scheme signal, not the per-target arrival YAC the y-axis
 * model fits).
 *
 * NOTE: `ryoePerAtt` (RYOE per attempt, a weekly NGS MEAN rate) is promoted
 * to a covariate — see props-hb-ryoe-bind. It is a leak-safe efficiency signal
 * (week t for t+1), NOT a y-axis prediction. `expectedRushYards` (the total
 * RYOE) remains y-axis only above.
 *
 * Pure. No I/O. No Prisma. No model inference.
 */

export const COVARIATE_BUS_METHOD_TAG = "covariate_bus_v1" as const;

export type StatType = "receiving" | "passing" | "rushing" | "defense";

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
  readonly avgCompletedAirYards: number | null; // yards per completion, weekly mean
  readonly avgAirYardsDifferential: number | null; // intended minus completed, weekly mean
  /** Weekly NGS mean: intended air yards to the sticks (distance past LOS to line to gain). H2 Edge. */
  readonly avgAirYardsToSticks: number | null; // yards past LOS to the line to gain, weekly mean
  // ── rushing ─────────────────────────────────────────────────────────────
  /** % of rushing attempts facing 8+ defenders in the box. */
  readonly pctAttemptsGte8Defenders: number | null;
  readonly avgTimeToLos: number | null; // seconds from snap to LOS crossing, weekly mean
  /** Weekly NGS mean: rush yards over expected per attempt (RYOE/att). Efficiency. H2 Edge. */
  readonly ryoePerAtt: number | null;
  /** Weekly NGS mean: % of rushing attempts that exceeded expected yards (RYOE > 0). Hole-hit / efficiency signal; books price rush TDs on volume but miss this. H2 Edge. */
  readonly rushPctOverExpected: number | null;
  // ── yac (receiving, covariate) ─────────────────────────────────────────────
  /** Average yards-after-catch per reception (weekly NGS mean). NOT per-target arrival YAC. */
  readonly avgYac: number | null;
  /**
   * Weekly NGS mean: yards-after-catch above expectation per reception. H2 Edge — rec TDs.
   * Optional so existing CovariateRow literals remain valid; absent = unknown (binds fail closed).
   */
  readonly yacAboveExpected?: number | null;
  // ── defense (PFR advstats def) ──────────────────────────────────────────────
  /** Weekly PFR mean: pressures (hurries + hits + sacks) per dropback faced. H1 Edge #1. */
  readonly pressureRate: number | null;
  /** Weekly PFR defensive snap share: fraction of team defensive snaps the player appeared in. H1 Edge #4. */
  readonly snapShare: number | null;
  /** Weekly PFR mean: TFL (tackles for loss) rate per defensive game. H1 Edge #2. */
  readonly tflRate: number | null;
  /** Weekly PFR mean: pass deflections (PD) rate per target faced. H1 Edge #3. */
  readonly pdRate: number | null;
  /** Weekly PFR mean: INT rate per target faced. H2 Edge. */
  readonly intRate: number | null;
  /** Weekly PFR mean: fumble rate per touch. H2 Edge. */
  readonly fumbleRate: number | null;
  /** Weekly PFR mean: missed-tackle rate (missed tackles / tackles attempted), week t for game t+1. H2 Edge — rec TDs. */
  readonly missedTackleRate: number | null;
  /** Weekly NGS mean: air yards per attempt (passer). H2 Edge. */
  readonly airYardsPerAttempt: number | null;
  /** Weekly PFR def mean: opponent passer rating allowed (0–158.3). Lower =
   * stingier coverage; higher (e.g. 100+) → opposing QBs get the ball out
   * faster → fewer pressures available to generate. H2 Edge (pressures). */
  readonly passerRatingAllowed: number | null;
  /** Weekly NGS mean: passer rating — public NFL formula (0–158.3). H2 Edge. */
  readonly passerRating: number | null;
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
  | "avgCompletedAirYards"
  | "avgAirYardsDifferential"
  | "avgAirYardsToSticks"
  | "pctAttemptsGte8Defenders"
  | "avgTimeToLos"
  | "avgYac"
  | "yacAboveExpected"
  | "pressureRate"
  | "snapShare"
  | "tflRate"
  | "pdRate"
  | "intRate"
  | "fumbleRate"
  | "missedTackleRate"
  | "airYardsPerAttempt"
  | "ryoePerAtt"
  | "rushPctOverExpected"
  | "passerRating"
  | "passerRatingAllowed";

/** Grain + provenance tag so callers never mistake a weekly mean for a
 * single-frame measurement. Honest header on every emitted cell. */
export type CovariateGrain = "week_t_for_tplus1";
export type CovariateProvenance = "weekly_ngs_mean" | "weekly_pfr_def_mean" | "expected_metric_v1";

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
 *
 * NON-FINITE WEEKS FAIL CLOSED, and that needs its own test rather than falling
 * out of the ordering comparison. Every comparison against NaN is false, so an
 * ordering-only guard (`r.week >= kickoffWeek`) does not REJECT a NaN week — it
 * ADMITS it. A guard written only as an ordering test is fail-OPEN on precisely
 * the values that carry no ordering. With `kickoffWeek` NaN/undefined that made
 * week-17 data pass as "strictly prior", leaking the future into a pre-kickoff
 * covariate and silently invalidating every backtest built on top of this call.
 * The same hole admits a poisoned row week (a parser emitting NaN, a rate
 * divided by a zero snap count), which would walk through the leak wall and
 * become evidence for a game it may postdate.
 *
 * Both sides are therefore checked for finiteness up front, BEFORE the ordering
 * checks, precisely so that a non-finite week can never reach a comparison that
 * would let it through: a non-finite `kickoffWeek` has no defined "before", so
 * nothing is eligible; a non-finite `r.week` cannot be located in time, so it is
 * never evidence for anything.
 */
export function latestPriorRow(
  rows: readonly CovariateRow[],
  gsisId: string,
  season: number,
  statType: StatType,
  kickoffWeek: number,
): CovariateRow | null {
  // A non-finite kickoff week has no defined "before", so nothing is eligible.
  if (!Number.isFinite(kickoffWeek)) return null;
  let best: CovariateRow | null = null;
  for (const r of rows) {
    if (r.gsisId !== gsisId) continue;
    if (r.season !== season) continue;
    if (r.statType !== statType) continue;
    if (!Number.isFinite(r.week)) continue; // poisoned row — never evidence
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
  const raw: number | null | undefined = row[field];
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return null;
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
