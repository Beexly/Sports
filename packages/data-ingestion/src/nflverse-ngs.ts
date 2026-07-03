/**
 * Next Gen Stats typed access — the consumer layer over the raw `ngs` dataset in
 * nflverse-source.ts. Turns the CC-BY-4.0 `ngs_receiving.csv.gz` /
 * `ngs_rushing.csv.gz` release assets into typed rows carrying the tracking-derived
 * advanced metrics that no box score contains: receiver SEPARATION / cushion /
 * expected-YAC, and rusher RUSH-YARDS-OVER-EXPECTED / efficiency / 8+-box%.
 *
 * WHY THIS IS THE LEGAL PATH (verified by execution 2026-07-03): these files are
 * value-identical to the numbers on nextgenstats.nfl.com — Jaxon Smith-Njigba's
 * 2025 avg_separation reads 3.018 here vs the site's rounded 3.0; James Cook's
 * rush_yards_over_expected reads 358.16 vs 358 — but arrive through nflverse's
 * CC-BY-4.0 redistribution (attribution required, no scraping, no ToS breach),
 * with full 2016→current history for calibration instead of a one-off page scrape.
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
