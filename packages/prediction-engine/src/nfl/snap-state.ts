/**
 * One snap table. It is the league_sii cube, pooled.
 *
 * SINGLE is Cover 0, Cover 1, and Cover 3. SPLIT is Cover 2, Cover 4, and
 * Cover 6. That is the definition already pinned in league_sii.json.
 * A second join with a different shell does not get to disagree with it.
 *
 * Team-week motion, play-action, and EPA were correlated with the closing
 * spread on 672 games, weeks 4+, 2023-2025. Those correlations are about
 * zero. The snap cells are not a side. Scoring does not read this module.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PREGAME_SPREAD_CORRELATION = {
  games: 672,
  seasons: [2023, 2024, 2025],
  minWeek: 4,
  motionDiff: 0.001,
  playActionDiff: 0.031,
  epaDiff: 0.05,
} as const;

export interface SnapCell {
  n: number;
  epa: number;
}

interface SiiCube {
  rows: Array<Array<string | number>>;
}

interface PressureFile {
  cells: Array<{ quick: boolean; pressure: boolean; n: number; epa: number }>;
}

function sii(): SiiCube {
  return JSON.parse(readFileSync(join(__dirname, "data", "league_sii.json"), "utf8")) as SiiCube;
}

export function snapStateEpa(motion: boolean, playAction: boolean, shell: "single" | "split"): SnapCell {
  const pa = playAction ? "PA" : "NO_PA";
  const mot = motion ? "MOT" : "NO_MOT";
  const sh = shell === "single" ? "SINGLE" : "SPLIT";
  let n = 0;
  let sum = 0;
  for (const row of sii().rows) {
    if (row[1] !== pa || row[2] !== mot || row[3] !== sh) continue;
    n += row[4] as number;
    sum += row[5] as number;
  }
  return { n, epa: n ? sum / n : 0 };
}

/** Pass plays with a tracked time, regular season 2023-2025. Quick is under 2.0s. */
export function pressureStateEpa(quick: boolean, pressure: boolean): SnapCell {
  const file = JSON.parse(readFileSync(join(__dirname, "data", "snap-pressure.json"), "utf8")) as PressureFile;
  const cell = file.cells.find((row) => row.quick === quick && row.pressure === pressure);
  if (!cell) return { n: 0, epa: 0 };
  return { n: cell.n, epa: cell.epa };
}

/** A feature the close already contains may not move a side. */
export function pregameFeatureIsPriced(name: "motion" | "playAction" | "epa"): boolean {
  const r = {
    motion: PREGAME_SPREAD_CORRELATION.motionDiff,
    playAction: PREGAME_SPREAD_CORRELATION.playActionDiff,
    epa: PREGAME_SPREAD_CORRELATION.epaDiff,
  }[name];
  return Math.abs(r) < 0.1;
}
