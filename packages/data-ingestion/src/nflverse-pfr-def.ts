/**
 * PFR advanced defensive stats typed access — consumer layer over the raw
 * `pfr_advstats` dataset (variant='def') from nflverse-source.ts.
 *
 * Turns `advstats_week_def_<season>.csv` into typed rows carrying the
 * charting-grade defensive signals that no box score contains:
 *   - pressures (hurries + hits + sacks)
 *   - pressure rate (pressures / dropbacks)
 *  - TFL (tackles for loss)
 *  - TFL rate (TFL / defensive snaps)
 *  - pass deflections (PD)
 *  - defensive snap share
 *
 * These are the H1 Edge Tier 1 signals. All are weekly means, grain =
 * week_t_for_tplus1 when consumed by the covariate bus. priced:false.
 *
 * Leak rule: week=0 is the full-season aggregate — the bus excludes it.
 * Consumers must never feed week=0 aggregates into same-week predictions.
 */

import type { CsvTable } from "./nflverse-source.js";

export interface PfrDefRow {
  readonly season: number;
  readonly seasonType: string;
  readonly week: number;
  readonly gsisId: string;
  readonly player: string;
  readonly position: string;
  readonly team: string;
  readonly dropbacks: number | null;
  readonly pressures: number | null;
  readonly pressureRate: number | null;
  readonly tfl: number | null;
  readonly snaps: number | null;
  readonly tflRate: number | null;
  readonly pd: number | null;
  readonly targets: number | null;
  readonly pdRate: number | null;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === "" || v === "null") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v: string | undefined): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

function str(v: string | undefined): string {
  return v ?? "";
}

const PFR_DEF_WEEK = 0; // sentinel: advstats_week_def doesn't embed week; full-season = 0

/**
 * Parse the `pfr_advstats` table variant='def' into typed PfrDefRow[].
 *
 * Column mapping (verified live against advstats_week_def_2023.csv):
 *   def_pressures        → pressures (hurries + hits + sacks, total)
 *   def_sacks            → (available but used for sack edge only)
 *   def_times_hurried    → (subset of pressures, component)
 *   def_times_hitqb      → (subset of pressures, component)
 *   def_tackles_loss     → tfl
 *   def_snaps            → snaps (defensive snaps played)
 *   def_pd               → pd (pass deflections / PD)
 *   def_targets          → targets (passes defended, i.e. targets faced)
 *
 * NOTE: PFR advstats_week_def is a SEASON-level table (no per-week granularity).
 * The covariate bus treats week=0 as the full-season aggregate and excludes it
 * from same-week predictions. When consumed by the bind, this becomes the
 * week_t_for_tplus1 prior cell (season aggregate as prior belief).
 */
export function parsePfrDef(table: CsvTable): PfrDefRow[] {
  const out: PfrDefRow[] = [];
  for (const r of table.records) {
    const season = int(r["season"]);
    const player = str(r["player_name"]);
    if (season === null || player === "") continue;
    out.push({
      season,
      seasonType: str(r["season_type"]) || "REG",
      week: PFR_DEF_WEEK, // season-level: week 0 = aggregate
      gsisId: str(r["player_gsis_id"]) || str(r["pfr_player_id"]),
      player,
      position: str(r["position"] || r["pos"]),
      team: str(r["team_abbr"]),
      dropbacks: int(r["dropbacks"]),
      pressures: int(r["def_pressures"]),
      pressureRate: num(r["def_pressures"]) && int(r["dropbacks"]) && int(r["dropbacks"]) > 0
        ? num(r["def_pressures"])! / int(r["dropbacks"])!
        : null,
      tfl: int(r["def_tackles_loss"]),
      snaps: int(r["def_snaps"]),
      tflRate: num(r["def_tackles_loss"]) && int(r["def_snaps"]) && int(r["def_snaps"]) > 0
        ? num(r["def_tackles_loss"])! / int(r["def_snaps"])!
        : null,
      pd: int(r["def_pd"]),
      targets: int(r["def_targets"]),
      pdRate: num(r["def_pd"]) && int(r["def_targets"]) && int(r["def_targets"]) > 0
        ? num(r["def_pd"])! / int(r["def_targets"])!
        : null,
    });
  }
  return out;
}
