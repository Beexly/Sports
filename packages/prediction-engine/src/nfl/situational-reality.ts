/**
 * Situational play counts. Not a power rating.
 *
 * Regular season 2023–2025. nflverse play-by-play joined to pbp_participation
 * (personnel, coverage, time to throw, was_pressure) and ftn_charting
 * (motion, play-action). 2026 participation has not been published.
 * 2026 quarterback pressure is the PFR week file, weeks 1–6.
 *
 * A cell is plays and EPA. It is not a point spread. Scoring does not read it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PARTICIPATION_SEASON = 2025;

/** Dropbacks that joined a cell of at least 15 plays. */
export const POOLED_DROPBACK = {
  seasons: "2023-2025",
  dropbacks: 57524,
  pressured: 16777,
  sacks: 3989,
  pressureRate: 16777 / 57524,
  sackRate: 3989 / 57524,
  /** Mean yards_gained on sack plays in the same three seasons. n = 4,011. */
  sackYards: -6.594,
  sackYardPlays: 4011,
} as const;

export interface SituationCell {
  n: number;
  epaPerPlay: number;
  successRate: number;
  dropbacks: number;
  pressureRate: number | null;
  sackRate: number | null;
  completionRate: number | null;
}

interface Cube {
  dims: string[];
  metrics: string[];
  rows: Array<Array<string | number>>;
}

const cache = new Map<string, Cube>();

function cube(name: string): Cube {
  const hit = cache.get(name);
  if (hit) return hit;
  const loaded = JSON.parse(readFileSync(join(__dirname, "data", name), "utf8")) as Cube;
  cache.set(name, loaded);
  return loaded;
}

function cellFrom(row: Array<string | number>, dims: number): SituationCell {
  const n = row[dims] as number;
  const epa = row[dims + 1] as number;
  const success = row[dims + 2] as number;
  const drop = row[dims + 3] as number;
  const press = row[dims + 4] as number;
  const sacks = row[dims + 5] as number;
  const comp = row[dims + 6] as number;
  const att = row[dims + 7] as number;
  return {
    n,
    epaPerPlay: n ? epa / n : 0,
    successRate: n ? success / n : 0,
    dropbacks: drop,
    pressureRate: drop ? press / drop : null,
    sackRate: drop ? sacks / drop : null,
    completionRate: att ? comp / att : null,
  };
}

function find(name: string, key: Array<string | number>): SituationCell | null {
  const table = cube(name);
  const dims = table.dims.length;
  for (const row of table.rows) {
    let match = true;
    for (let i = 0; i < dims; i++) {
      if (row[i] !== key[i]) {
        match = false;
        break;
      }
    }
    if (match) return cellFrom(row, dims);
  }
  return null;
}

export function personnelVsCoverage(
  season: number,
  personnel: string,
  coverage: string,
): SituationCell | null {
  return find("league_shell.json", [season, personnel, coverage]);
}

export function teamPersonnelVsCoverage(
  season: number,
  team: string,
  personnel: string,
  coverage: string,
): SituationCell | null {
  return find("shell.json", [season, team, personnel, coverage]);
}

/** Throws with a tracked time. Sacks usually have no time, so they are not in these rows. */
export function pressureByThrowTime(season: number, bucket: "FAST" | "MID" | "SLOW"): SituationCell | null {
  return find("league_clock.json", [season, bucket]);
}

export function playActionMotion(
  season: number,
  playAction: "PA" | "NO_PA",
  motion: "MOT" | "NO_MOT",
  shell: "SINGLE" | "SPLIT" | "OTHER",
): SituationCell | null {
  return find("league_sii.json", [season, playAction, motion, shell]);
}

export function teamPlayActionMotion(
  season: number,
  team: string,
  playAction: "PA" | "NO_PA",
  motion: "MOT" | "NO_MOT",
  shell: "SINGLE" | "SPLIT" | "OTHER",
): SituationCell | null {
  return find("sii.json", [season, team, playAction, motion, shell]);
}

export function teamPressure(season: number, team: string): SituationCell | null {
  const table = cube("shell.json");
  let n = 0;
  let epa = 0;
  let success = 0;
  let drop = 0;
  let press = 0;
  let sacks = 0;
  let comp = 0;
  let att = 0;
  for (const row of table.rows) {
    if (row[0] !== season || row[1] !== team) continue;
    n += row[4] as number;
    epa += row[5] as number;
    success += row[6] as number;
    drop += row[7] as number;
    press += row[8] as number;
    sacks += row[9] as number;
    comp += row[10] as number;
    att += row[11] as number;
  }
  if (!n) return null;
  return {
    n,
    epaPerPlay: epa / n,
    successRate: success / n,
    dropbacks: drop,
    pressureRate: drop ? press / drop : null,
    sackRate: drop ? sacks / drop : null,
    completionRate: att ? comp / att : null,
  };
}

export interface QbPressureWeek {
  season: number;
  week: number;
  team: string;
  opponent: string;
  player: string;
  dropbacks: number;
  pressured: number;
  hurried: number;
  hit: number;
  sacked: number;
  blitzed: number;
  pressureRate: number;
}

export function qbPressureWeeks(season: number, team: string): QbPressureWeek[] {
  const table = JSON.parse(readFileSync(join(__dirname, "data", "pfr_qb_pressure.json"), "utf8")) as {
    rows: QbPressureWeek[];
  };
  return table.rows.filter((row) => row.season === season && row.team === team);
}

export function qbPressureRate(season: number, team: string): { dropbacks: number; rate: number } | null {
  const weeks = qbPressureWeeks(season, team);
  let drop = 0;
  let press = 0;
  for (const week of weeks) {
    drop += week.dropbacks;
    press += week.pressured;
  }
  if (!drop) return null;
  return { dropbacks: Math.round(drop), rate: press / drop };
}
