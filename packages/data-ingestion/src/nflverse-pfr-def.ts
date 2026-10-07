/**
 * PFR defensive advanced-stats typed access — the consumer layer over the
 * nflverse `pfr_advstats` release asset's `def` variant (variant='def').
 *
 * Turns the CC-BY-4.0 `advstats_week_def_<season>.csv` (Pro-Football-Reference
 * defensive charting) into typed rows carrying the defensive metrics that no
 * box score contains: pressures, TFL, pass deflections, blitz/hurry/hit/sack
 * components, and coverage context (targets, completions, yards, PD rating).
 *
 * COLUMN MAPPING (verified against the live nflverse release, 2022–2025):
 *
 *   def_pressures        → pressureRate numerator (hurries + hits + sacks)
 *   def_times_hurried    → raw pressure sub-count (hurries)
 *   def_times_hitqb      → raw pressure sub-count (hits on QB)
 *   def_sacks            → raw pressure sub-count (sacks)
 *   def_times_blitzed    → blitz participation count
 *   def_tackles_for_loss → tflRate numerator (TFL per target)
 *   def_tackles_combined → combined tackles (context only — NOT a TFL source)
 *   def_missed_tackles   → missed-tackle count
 *   def_missed_tackle_pct → missed-tackle rate
 *   def_pass_deflections → pdRate numerator (PD per target)
 *   def_targets           → denominator for pressureRate / tflRate / pdRate
 *
 * FORWARD COMPATIBILITY:
 * The current nflverse `advstats_week_def` release does NOT carry
 * `def_tackles_for_loss` or `def_pass_deflections` (verified live 2026-07).
 * The parser looks each column up by name from the CSV header and yields
 * `null` for absent columns — so a future upstream column addition is a
 * no-code-change improvement here (the binds fail-closed today, then bind
 * automatically once the column appears).
 *
 * LEAK SAFETY (week t for t+1):
 * The parser emits per-player-week rows (week 1..22). It does NOT aggregate or
 * forward-fill; it does NOT fabricate. The covariate bus's `latestPriorRow`
 * enforces the week_t_for_tplus1 grain — it excludes week=0 (season aggregate)
 * and week >= kickoffWeek. This parser simply shapes the CSV faithfully, so the
 * leak-safety contract lives in one place (covariate-bus.ts), not duplicated.
 *
 * PURE. No I/O. No Prisma. priced:false (CovariateRows carry no price tag;
 * the binds that consume this output emit priced:false on every result).
 */
import type { CsvTable } from "./nflverse-source.js";
import type { IdCrosswalk } from "./nflverse-id-crosswalk.js";
import { resolveGsisFromRow } from "./nflverse-id-crosswalk.js";

/** Column-name aliases the parser resolves from the CSV header. Each tuple is
 * [primary, ...fallbacks]; the first that exists in the header wins. This lets
 * the parser adapt to upstream renames (e.g. def_pdef → def_pass_deflections). */
const COL_LOOKUPS: ReadonlyArray<readonly [string, ...string[]]> = [
  ["def_pressures", "pressures"],
  ["def_times_hurried", "times_hurried"],
  ["def_times_hitqb", "times_hit_qb", "times_hitqb"],
  ["def_sacks", "sacks"],
  ["def_times_blitzed", "times_blitzed"],
  ["def_tackles_for_loss", "def_tfl", "tfl"],
  ["def_tackles_combined", "tackles_combined"],
  ["def_missed_tackles", "missed_tackles"],
  ["def_missed_tackle_pct", "missed_tackle_pct"],
  ["def_pass_deflections", "def_pdef", "pass_deflections"],
  ["def_targets", "targets"],
  ["def_completions_allowed", "completions_allowed"],
  ["def_completion_pct", "completion_pct"],
  ["def_yards_allowed", "yards_allowed"],
  ["def_yards_allowed_per_cmp", "yards_allowed_per_cmp"],
  ["def_yards_allowed_per_tgt", "yards_allowed_per_tgt"],
  ["def_receiving_td_allowed", "receiving_td_allowed"],
  ["def_passer_rating_allowed", "passer_rating_allowed"],
  ["def_adot", "adot"],
  ["def_air_yards_completed", "air_yards_completed"],
  ["def_yards_after_catch", "yards_after_catch"],
  ["def_ints", "ints"],
];

/** Resolve the first existing column name from the header, or null. */
function resolveCol(
  header: readonly string[],
  primary: string,
  ...fallbacks: string[]
): string | null {
  if (header.includes(primary)) return primary;
  for (const f of fallbacks) {
    if (header.includes(f)) return f;
  }
  return null;
}

/** Coerce a CSV cell to a finite number, or null on empty/non-numeric. */
function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function int(v: string | undefined): number | null {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}
function str(v: string | undefined): string {
  return (v ?? "").trim();
}

/**
 * Safe rate: numerator / denominator.
 *   - numerator null    → null (no data, never impute)
 *   - denominator null  → null (no exposure, never impute)
 *   - denominator 0     → null (undefined rate, never divide by zero)
 *   - otherwise         → numerator / denominator (0/5 → 0.0, a valid rate)
 */
function rate(n: number | null, d: number | null): number | null {
  if (n === null || d === null || d === 0) return null;
  return n / d;
}

/** The raw PFR def CSV columns we read, plus computed rates and resolved identity. */
export interface PfrDefRow {
  readonly season: number;
  readonly seasonType: string; // REG | POST | PRE | etc. (from game_type)
  readonly week: number; // 1..22 per-game; 0 if absent/blank (season aggregate)
  readonly gameKey: string; // game_id
  readonly team: string;
  readonly opponent: string;
  readonly pfrPlayerId: string; // pfr_player_id (e.g. "BoltNi00")
  readonly gsisId: string; // resolved via crosswalk; "" when no crosswalk / unresolved
  readonly player: string; // pfr_player_name
  readonly position: string;

  // ── pressure components (sub-counts of def_pressures) ──
  readonly pressures: number | null; // def_pressures total (hurries + hits + sacks)
  readonly timesHurried: number | null;
  readonly timesHitQb: number | null;
  readonly sacks: number | null;
  readonly timesBlitzed: number | null;

  // ── TFL ──
  readonly tacklesForLoss: number | null; // def_tackles_for_loss (absent in current release)
  readonly tacklesCombined: number | null;
  readonly missedTackles: number | null;
  readonly missedTacklePct: number | null;

  // ── pass deflections ──
  readonly passDeflections: number | null; // def_pass_deflections / def_pdef (absent in current release)

  // ── coverage context ──
  readonly targets: number | null;
  readonly completionsAllowed: number | null;
  readonly completionPct: number | null;
  readonly yardsAllowed: number | null;
  readonly yardsPerCompletion: number | null;
  readonly yardsPerTarget: number | null;
  readonly passerRatingAllowed: number | null;
  readonly receivingTdAllowed: number | null;
  readonly ints: number | null;
  readonly avgAdot: number | null;
  readonly avgAirYardsCompleted: number | null;
  readonly avgYardsAfterCatch: number | null;

  // ── derived CovariateRow fields ──
  /** pressures / targets — weekly PFR mean pressure rate per target faced. */
  readonly pressureRate: number | null;
  /** tackles_for_loss / targets — weekly PFR mean TFL rate per target faced. */
  readonly tflRate: number | null;
  /** pass_deflections / targets — weekly PFR mean PD rate per target faced. */
  readonly pdRate: number | null;
}

/**
 * PFR def row bridged into the CovariateRow contract (statType='defense').
 *
 * This type is STRUCTURALLY COMPATIBLE with CovariateRow from
 * packages/prediction-engine/src/edge-lab/covariate-bus.ts — the consumer
 * can assign `PfrDefCovariateRow[]` to `CovariateRow[]` with zero casts.
 * The prediction-engine package is NOT imported here (no cross-package
 * dependency); structural typing closes the loop.
 *
 * All non-defense covariate fields are null (the PFR def file carries only
 * defensive charting). `snapShare` is null too — it comes from the separate
 * snap_counts dataset (nflverse snap_counts), not from PFR advstats.
 */
export interface PfrDefCovariateRow {
  readonly gsisId: string;
  readonly season: number;
  readonly week: number;
  readonly statType: "defense";
  // receiving (null — not in PFR def file)
  readonly avgSeparation: null;
  readonly avgCushion: null;
  readonly airYardsShare: null;
  // passing (null)
  readonly avgTimeToThrow: null;
  readonly aggressiveness: null;
  readonly avgIntendedAirYards: null;
  readonly avgCompletedAirYards: null;
  readonly avgAirYardsDifferential: null;
  // rushing (null)
  readonly pctAttemptsGte8Defenders: null;
  readonly avgTimeToLos: null;
  // yac covariate (null)
  readonly avgYac: null;
  // ── defense (PFR advstats def) ──
  /** Weekly PFR mean: pressures per target faced. H1 Edge #1. */
  readonly pressureRate: number | null;
  /** Weekly PFR defensive snap share — null here (sourced from snap_counts). H1 Edge #4. */
  readonly snapShare: number | null;
  /** Weekly PFR mean: TFL rate per target. H1 Edge #2. */
  readonly tflRate: number | null;
  /** Weekly PFR mean: PD rate per target. H1 Edge #3. */
  readonly pdRate: number | null;
  // vendor y-axis (null — defense has no NGS proprietary exposure here)
  readonly avgExpectedYac: null;
  readonly expectedRushYards: null;
}

/**
 * Parse the `pfr_advstats` def variant CSV (variant='def') into typed rows.
 *
 * @param table     Parsed CSV from `fetchNflverse('pfr_advstats', season, 'def')`.
 * @param crosswalk Season-matched PFR→GSIS identity map. When omitted,
 *                  `gsisId` is left empty (caller can bridge by pfrPlayerId
 *                  later) — never fabricated.
 */
export function parsePfrDef(
  table: CsvTable,
  crosswalk?: IdCrosswalk,
): PfrDefRow[] {
  const out: PfrDefRow[] = [];

  // Pre-resolve column names once per parse (header is uniform across rows).
  const defPressuresCol = resolveCol(table.header, "def_pressures", "pressures");
  const defHurriedCol = resolveCol(table.header, "def_times_hurried", "times_hurried");
  const defHitQbCol = resolveCol(table.header, "def_times_hitqb", "times_hit_qb");
  const defSacksCol = resolveCol(table.header, "def_sacks", "sacks");
  const defBlitzedCol = resolveCol(table.header, "def_times_blitzed", "times_blitzed");
  const defTflCol = resolveCol(table.header, "def_tackles_for_loss", "def_tfl", "tfl");
  const defTacklesCombinedCol = resolveCol(table.header, "def_tackles_combined", "tackles_combined");
  const defMissedTklCol = resolveCol(table.header, "def_missed_tackles", "missed_tackles");
  const defMissedTklPctCol = resolveCol(table.header, "def_missed_tackle_pct", "missed_tackle_pct");
  const defPdCol = resolveCol(table.header, "def_pass_deflections", "def_pdef", "pass_deflections");
  const defTargetsCol = resolveCol(table.header, "def_targets", "targets");
  const defCompAllowCol = resolveCol(table.header, "def_completions_allowed", "completions_allowed");
  const defCompPctCol = resolveCol(table.header, "def_completion_pct", "completion_pct");
  const defYardsAllowCol = resolveCol(table.header, "def_yards_allowed", "yards_allowed");
  const defYardsPerCmpCol = resolveCol(table.header, "def_yards_allowed_per_cmp", "yards_allowed_per_cmp");
  const defYardsPerTgtCol = resolveCol(table.header, "def_yards_allowed_per_tgt", "yards_allowed_per_tgt");
  const defTdAllowCol = resolveCol(table.header, "def_receiving_td_allowed", "receiving_td_allowed");
  const defPasserRatingCol = resolveCol(table.header, "def_passer_rating_allowed", "passer_rating_allowed");
  const defAdotCol = resolveCol(table.header, "def_adot", "adot");
  const defAirYardsCompCol = resolveCol(table.header, "def_air_yards_completed", "air_yards_completed");
  const defYacAllowCol = resolveCol(table.header, "def_yards_after_catch", "yards_after_catch");
  const defIntsCol = resolveCol(table.header, "def_ints", "ints");

  const readNum = (c: string | null, r: Readonly<Record<string, string>>): number | null =>
    c ? num(r[c]) : null;
  const readInt = (c: string | null, r: Readonly<Record<string, string>>): number | null =>
    c ? int(r[c]) : null;

  for (const r of table.records) {
    const season = num(r["season"]);
    if (season === null) continue; // skip blank/malformed rows

    const pfrPlayerId = str(r["pfr_player_id"]);
    if (pfrPlayerId === "") continue; // skip rows without a player identity

    // Resolve GSIS id via crosswalk (never fabricate — returns "" on miss).
    const gsisId = crosswalk
      ? resolveGsisFromRow(crosswalk, r as Record<string, string>)
      : "";

    // ── pressure components ──
    const pressures = readInt(defPressuresCol, r);
    const timesHurried = readInt(defHurriedCol, r);
    const timesHitQb = readInt(defHitQbCol, r);
    const sacks = readInt(defSacksCol, r);
    const timesBlitzed = readInt(defBlitzedCol, r);

    // ── TFL ──
    // def_tackles_for_loss is the true TFL numerator. The current nflverse
    // release omits it — in that case tflRate resolves to null (bind fails closed).
    // def_tackles_combined is context only, never a TFL numerator.
    const tacklesForLoss = readInt(defTflCol, r);
    const tacklesCombined = readInt(defTacklesCombinedCol, r);
    const missedTackles = readInt(defMissedTklCol, r);
    const missedTacklePct = readNum(defMissedTklPctCol, r);

    // ── pass deflections ──
    const passDeflections = readInt(defPdCol, r);

    // ── coverage context ──
    const targets = readInt(defTargetsCol, r);

    // ── derived rates (per target) ──
    const pressureRate = rate(pressures, targets);
    const tflRate = rate(tacklesForLoss, targets);
    const pdRate = rate(passDeflections, targets);

    out.push({
      season,
      seasonType: str(r["game_type"]) || "REG",
      week: int(r["week"]) ?? 0,
      gameKey: str(r["game_id"]),
      team: str(r["team"]),
      opponent: str(r["opponent"]),
      pfrPlayerId,
      gsisId,
      player: str(r["pfr_player_name"]),
      position: str(r["player_position"]),
      pressures,
      timesHurried,
      timesHitQb,
      sacks,
      timesBlitzed,
      tacklesForLoss,
      tacklesCombined,
      missedTackles,
      missedTacklePct,
      passDeflections,
      targets,
      completionsAllowed: readInt(defCompAllowCol, r),
      completionPct: readNum(defCompPctCol, r),
      yardsAllowed: readNum(defYardsAllowCol, r),
      yardsPerCompletion: readNum(defYardsPerCmpCol, r),
      yardsPerTarget: readNum(defYardsPerTgtCol, r),
      passerRatingAllowed: readNum(defPasserRatingCol, r),
      receivingTdAllowed: readInt(defTdAllowCol, r),
      ints: readInt(defIntsCol, r),
      avgAdot: readNum(defAdotCol, r),
      avgAirYardsCompleted: readNum(defAirYardsCompCol, r),
      avgYardsAfterCatch: readNum(defYacAllowCol, r),
      pressureRate,
      tflRate,
      pdRate,
    });
  }
  return out;
}

/**
 * Bridge PFR def rows into CovariateRow-compatible objects (statType='defense').
 *
 * One PfrDefRow → one PfrDefCovariateRow (the PFR def CSV is already at the
 * player-week grain — no aggregation needed). All non-defense covariate fields
 * are null; defense fields (pressureRate, tflRate, pdRate) carry the computed
 * PFR weekly means. `snapShare` is null — it is sourced separately from the
 * snap_counts dataset.
 *
 * Leak-safety is NOT enforced here — it is the covariate bus's job
 * (`latestPriorRow` excludes week=0 and week >= kickoffWeek). This bridge
 * faithfully shapes data; the row-selection contract lives in one place.
 *
 * priced:false is satisfied at the bind layer (the binds that consume
 * CovariateRows emit priced:false on every result). CovariateRows themselves
 * carry no price tag.
 */
export function pfrDefToCovariateRows(
  rows: readonly PfrDefRow[],
): PfrDefCovariateRow[] {
  return rows.map((r) => ({
    gsisId: r.gsisId,
    season: r.season,
    week: r.week,
    statType: "defense" as const,
    // receiving (null — not in PFR def file)
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    // passing (null)
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    // rushing (null)
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    // yac covariate (null)
    avgYac: null,
    // ── defense (PFR advstats def) ──
    pressureRate: r.pressureRate,
    snapShare: null,
    tflRate: r.tflRate,
    pdRate: r.pdRate,
    // vendor y-axis (null)
    avgExpectedYac: null,
    expectedRushYards: null,
  }));
}
