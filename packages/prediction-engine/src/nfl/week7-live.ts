/**
 * Week 7 public wires. Status, snap share, and points. Not a spread.
 * Scoring does not read this.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(__dirname, "data", "public-boards", name), "utf8")) as T;
}

export interface SlateGame {
  name: string;
  state: string;
  away: string;
  home: string;
  away_score: string;
  home_score: string;
}

export function week7Slate(): { byes: string[]; games: SlateGame[] } {
  return load("week7-slate.json");
}

export function sleeperBoard(position: "QB" | "RB" | "WR" | "TE"): Array<{ name: string; team: string; pts_ppr: number }> {
  return load<{ projections: Record<string, Array<{ name: string; team: string; pts_ppr: number }>> }>("sleeper-week7.json").projections[position] ?? [];
}

export function thursdayActual(name: string): { pts_ppr: number; pass_yd?: number; pass_td?: number; rush_yd?: number } | null {
  const rows = load<{ thursday_actual: Array<{ name: string; pts_ppr: number; pass_yd?: number; pass_td?: number; rush_yd?: number }> }>("sleeper-week7.json").thursday_actual;
  return rows.find((row) => row.name === name) ?? null;
}

export function espnStatus(name: string): { team: string; pos: string; status: string } | null {
  const rows = load<{ designations: Array<{ name: string; team: string; pos: string; status: string }> }>("espn-designations.json").designations;
  return rows.find((row) => row.name === name) ?? null;
}

export function snapShock(name: string): { team: string; pos: string; week6_pct: number; prior_pct: number; delta: number } | null {
  const rows = load<{ players: Array<{ name: string; team: string; pos: string; week6_pct: number; prior_pct: number; delta: number }> }>("snap-shocks.json").players;
  return rows.find((row) => row.name === name) ?? null;
}

export function rotowireHeadlines(): string[] {
  return load<{ titles: string[] }>("rotowire-headlines.json").titles;
}
