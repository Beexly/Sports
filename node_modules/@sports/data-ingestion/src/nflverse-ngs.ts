/**
 * Next Gen Stats typed access — the consumer layer over the raw `ngs` dataset in
 * nflverse-source.ts. Turns the CC-BY-4.0 `ngs_receiving.csv.gz` /
 * `ngs_rushing.csv.gz` / `ngs_passing.csv.gz` release assets into typed rows
 * carrying the tracking-derived advanced metrics that no box score contains:
 * receiver SEPARATION / cushion / expected-YAC, rusher RUSH-YARDS-OVER-EXPECTED /
 * efficiency / 8+-box%, and passer TIME-TO-THROW / expected-completion% / CPOE.
 *
 * WHY THIS IS THE LEGAL PATH (verified by execution 2026-07-03, all three
 * variants): these files are value-identical to nextgenstats.nfl.com — Jaxon
 * Smith-Njigba's 2025 avg_separation 3.018 vs the site's 3.0; James Cook's
 * rush_yards_over_expected 358.16 vs 358; Matthew Stafford's CPOE 1.476 vs +1.5 —
 * but arrive through nflverse's CC-BY-4.0 redistribution (attribution required, no
 * scraping, no ToS breach), with full 2016→current history for calibration.
 * See docs/data/ngs-legal-leverage.md for the full pathway analysis.
 *
 * POSTURE: dark/additive. This is a pure typed access + reshape layer; it performs
 * no writes and is NOT wired into live scoring (a founder-gated MODEL_VERSION step).
 * Its first intended consumer is CALIBRATION, not publication: avg_separation is
 * the ground-truth target for apps/web/lib/reconstruction (which ESTIMATES
 * separation from cleared aggregates) — see ngsReceivingToSeparationTruth below.
 *
 * When an NGS-proprietary EXPECTED metric (RYOE, xYAC, expected_rush_yards) is
 * ever surfaced publicly it must be ATTRIBUTED ("NFL Next Gen Stats via nflverse")
 * — GSE's own published numbers should be re-derived from open play-by-play so the
 * headline figure is our IP, not a re-served vendor model. [data-and-method rule]
 */

import type { CsvTable } from "./nflverse-source.js";

/** NGS ships week=0 for the full-season aggregate row; weeks 1..22 are per-week. */
export const NGS_FULL_SEASON_WEEK = 0;

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

export interface NgsReceivingRow {
  readonly season: number;
  readonly seasonType: string; // REG | POST
  readonly week: number; // 0 = full-season aggregate
  readonly gsisId: string; // join key to every other nflverse dataset
  readonly player: string;
  readonly position: string;
  readonly team: string;
  /** Average defender cushion at snap (yards). Pre-snap alignment. */
  readonly avgCushion: number | null;
  /** Average separation from nearest defender at catch/incompletion (yards) — the moat metric. */
  readonly avgSeparation: number | null;
  readonly avgIntendedAirYards: number | null;
  readonly airYardsShare: number | null; // % of team's intended air yards
  readonly receptions: number | null;
  readonly targets: number | null;
  readonly catchPct: number | null;
  readonly yards: number | null;
  readonly touchdowns: number | null;
  readonly avgYac: number | null;
  /** NFL's expected-YAC model output (proprietary). Attribute if published. */
  readonly avgExpectedYac: number | null;
  readonly yacAboveExpected: number | null;
}

export interface NgsRushingRow {
  readonly season: number;
  readonly seasonType: string;
  readonly week: number;
  readonly gsisId: string;
  readonly player: string;
  readonly position: string;
  readonly team: string;
  readonly efficiency: number | null;
  /** % of attempts facing 8+ defenders in the box — stacked-box rate. */
  readonly eightPlusBoxPct: number | null;
  readonly avgTimeToLos: number | null;
  readonly rushAttempts: number | null;
  readonly rushYards: number | null;
  readonly avgRushYards: number | null;
  readonly touchdowns: number | null;
  /** NFL's expected-rush-yards model output (proprietary). Attribute if published. */
  readonly expectedRushYards: number | null;
  /** Rush Yards Over Expected — actual minus model. Attribute if published. */
  readonly ryoe: number | null;
  readonly ryoePerAtt: number | null;
  readonly rushPctOverExpected: number | null;
}

export interface NgsPassingRow {
  readonly season: number;
  readonly seasonType: string;
  readonly week: number;
  readonly gsisId: string;
  readonly player: string;
  readonly position: string;
  readonly team: string;
  readonly avgTimeToThrow: number | null;
  readonly avgCompletedAirYards: number | null;
  readonly avgIntendedAirYards: number | null;
  readonly avgAirYardsDifferential: number | null;
  readonly aggressiveness: number | null; // % throws into tight coverage (<1 yd separation)
  readonly maxCompletedAirDistance: number | null;
  readonly avgAirYardsToSticks: number | null;
  readonly attempts: number | null;
  readonly passYards: number | null;
  readonly passTouchdowns: number | null;
  readonly interceptions: number | null;
  readonly passerRating: number | null;
  readonly completions: number | null;
  readonly completionPct: number | null;
  /** NFL's expected-completion% model output (proprietary). Attribute if published. */
  readonly expectedCompletionPct: number | null;
  /** CPOE — completion% above expectation. The QB moat metric. Attribute if published. */
  readonly cpoe: number | null;
  readonly avgAirDistance: number | null;
  readonly maxAirDistance: number | null;
}

/** Parse the `ngs_passing` table (variant="passing") into typed rows. */
export function parseNgsPassing(table: CsvTable): NgsPassingRow[] {
  const out: NgsPassingRow[] = [];
  for (const r of table.records) {
    const season = int(r["season"]);
    const gsisId = str(r["player_gsis_id"]);
    if (season === null || gsisId === "") continue;
    out.push({
      season,
      seasonType: str(r["season_type"]) || "REG",
      week: int(r["week"]) ?? NGS_FULL_SEASON_WEEK,
      gsisId,
      player: str(r["player_display_name"]),
      position: str(r["player_position"]),
      team: str(r["team_abbr"]),
      avgTimeToThrow: num(r["avg_time_to_throw"]),
      avgCompletedAirYards: num(r["avg_completed_air_yards"]),
      avgIntendedAirYards: num(r["avg_intended_air_yards"]),
      avgAirYardsDifferential: num(r["avg_air_yards_differential"]),
      aggressiveness: num(r["aggressiveness"]),
      maxCompletedAirDistance: num(r["max_completed_air_distance"]),
      avgAirYardsToSticks: num(r["avg_air_yards_to_sticks"]),
      attempts: int(r["attempts"]),
      passYards: int(r["pass_yards"]),
      passTouchdowns: int(r["pass_touchdowns"]),
      interceptions: int(r["interceptions"]),
      passerRating: num(r["passer_rating"]),
      completions: int(r["completions"]),
      completionPct: num(r["completion_percentage"]),
      expectedCompletionPct: num(r["expected_completion_percentage"]),
      cpoe: num(r["completion_percentage_above_expectation"]),
      avgAirDistance: num(r["avg_air_distance"]),
      maxAirDistance: num(r["max_air_distance"]),
    });
  }
  return out;
}

/** Parse the `ngs_receiving` table (variant="receiving") into typed rows. */
export function parseNgsReceiving(table: CsvTable): NgsReceivingRow[] {
  const out: NgsReceivingRow[] = [];
  for (const r of table.records) {
    const season = int(r["season"]);
    const gsisId = str(r["player_gsis_id"]);
    if (season === null || gsisId === "") continue; // skip malformed/blank rows
    out.push({
      season,
      seasonType: str(r["season_type"]) || "REG",
      week: int(r["week"]) ?? NGS_FULL_SEASON_WEEK,
      gsisId,
      player: str(r["player_display_name"]),
      position: str(r["player_position"]),
      team: str(r["team_abbr"]),
      avgCushion: num(r["avg_cushion"]),
      avgSeparation: num(r["avg_separation"]),
      avgIntendedAirYards: num(r["avg_intended_air_yards"]),
      airYardsShare: num(r["percent_share_of_intended_air_yards"]),
      receptions: int(r["receptions"]),
      targets: int(r["targets"]),
      catchPct: num(r["catch_percentage"]),
      yards: int(r["yards"]),
      touchdowns: int(r["rec_touchdowns"]),
      avgYac: num(r["avg_yac"]),
      avgExpectedYac: num(r["avg_expected_yac"]),
      yacAboveExpected: num(r["avg_yac_above_expectation"]),
    });
  }
  return out;
}

/** Parse the `ngs_rushing` table (variant="rushing") into typed rows. */
export function parseNgsRushing(table: CsvTable): NgsRushingRow[] {
  const out: NgsRushingRow[] = [];
  for (const r of table.records) {
    const season = int(r["season"]);
    const gsisId = str(r["player_gsis_id"]);
    if (season === null || gsisId === "") continue;
    out.push({
      season,
      seasonType: str(r["season_type"]) || "REG",
      week: int(r["week"]) ?? NGS_FULL_SEASON_WEEK,
      gsisId,
      player: str(r["player_display_name"]),
      position: str(r["player_position"]),
      team: str(r["team_abbr"]),
      efficiency: num(r["efficiency"]),
      eightPlusBoxPct: num(r["percent_attempts_gte_eight_defenders"]),
      avgTimeToLos: num(r["avg_time_to_los"]),
      rushAttempts: int(r["rush_attempts"]),
      rushYards: int(r["rush_yards"]),
      avgRushYards: num(r["avg_rush_yards"]),
      touchdowns: int(r["rush_touchdowns"]),
      expectedRushYards: num(r["expected_rush_yards"]),
      ryoe: num(r["rush_yards_over_expected"]),
      ryoePerAtt: num(r["rush_yards_over_expected_per_att"]),
      rushPctOverExpected: num(r["rush_pct_over_expected"]),
    });
  }
  return out;
}

/** Keep only rows for a given season and week (default: full-season aggregate). */
export function filterNgs<T extends { season: number; week: number }>(
  rows: readonly T[],
  season: number,
  week: number = NGS_FULL_SEASON_WEEK,
): T[] {
  return rows.filter((r) => r.season === season && r.week === week);
}

export interface SeparationTruth {
  readonly gsisId: string;
  readonly player: string;
  readonly season: number;
  readonly week: number;
  /** The measured ground-truth separation (yards) the reconstruction model estimates. */
  readonly actualSeparation: number;
}

/**
 * Bridge NGS receiving rows to separation ground-truth for the reconstruction
 * engine's calibration (apps/web/lib/reconstruction/calibration-eval.ts). Rows
 * with no measured separation (null) or below a minimum target volume are dropped
 * — a 1-target sample is noise, not a calibration anchor.
 */
export function ngsReceivingToSeparationTruth(
  rows: readonly NgsReceivingRow[],
  minTargets = 20,
): SeparationTruth[] {
  const out: SeparationTruth[] = [];
  for (const r of rows) {
    if (r.avgSeparation === null) continue;
    if ((r.targets ?? 0) < minTargets) continue;
    out.push({
      gsisId: r.gsisId,
      player: r.player,
      season: r.season,
      week: r.week,
      actualSeparation: r.avgSeparation,
    });
  }
  return out;
}

export interface CpoeTruth {
  readonly gsisId: string;
  readonly player: string;
  readonly season: number;
  readonly week: number;
  /** Measured completion% above the NFL's expected-completion model (the QB truth). */
  readonly cpoe: number;
  readonly expectedCompletionPct: number | null;
}

/**
 * Bridge NGS passing rows to QB expected-value ground truth (CPOE) for
 * calibration / triangulation of GSE's own QB models. Default min-attempts (135)
 * mirrors NGS's own qualifier ("15 attempts × weeks ÷ 2") so a low-volume QB is
 * not treated as a stable anchor. Rows with no measured CPOE are dropped.
 */
export function ngsPassingToCpoeTruth(rows: readonly NgsPassingRow[], minAttempts = 135): CpoeTruth[] {
  const out: CpoeTruth[] = [];
  for (const r of rows) {
    if (r.cpoe === null) continue;
    if ((r.attempts ?? 0) < minAttempts) continue;
    out.push({
      gsisId: r.gsisId,
      player: r.player,
      season: r.season,
      week: r.week,
      cpoe: r.cpoe,
      expectedCompletionPct: r.expectedCompletionPct,
    });
  }
  return out;
}
