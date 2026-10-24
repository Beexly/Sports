/**
 * Public rebuilds of PFR, FTN, and RotoWire.
 * Counts and the printed DVOA table. Not a point spread. Scoring does not read this.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(__dirname, "data", "public-boards", name), "utf8")) as T;
}

export interface QuarterbackPressure {
  name: string;
  team: string;
  games: number;
  dropbacks: number;
  pressure_rate: number;
  sack_rate: number;
}

export interface DvoaTeam {
  rank: number;
  team: string;
  total_dvoa: number;
  record: string;
  off_dvoa: number;
  off_rank: number;
  def_dvoa: number;
  def_rank: number;
  st_dvoa: number;
  st_rank: number;
}

interface LineupPlayer {
  pos: string;
  name: string;
  tag: string | null;
}

interface LineupGame {
  away: string;
  home: string;
  status: string;
  away_players: LineupPlayer[];
  home_players: LineupPlayer[];
}

export function quarterbackPressure(): QuarterbackPressure[] {
  return load<{ quarterbacks: QuarterbackPressure[] }>("pfr-ftn-2026.json").quarterbacks;
}

export function teamMotion(): Array<{ team: string; motion_rate: number; play_action_rate: number; epa_per_play: number | null; charted_plays: number }> {
  return load<{ ftn_tendencies: Array<{ team: string; motion_rate: number; play_action_rate: number; epa_per_play: number | null; charted_plays: number }> }>(
    "pfr-ftn-2026.json",
  ).ftn_tendencies;
}

export function dvoaTable(): DvoaTeam[] {
  return load<{ teams: DvoaTeam[] }>("ftn-dvoa-week6.json").teams;
}

export function week7Lineups(): LineupGame[] {
  return load<{ games: LineupGame[] }>("rotowire-lineups-week7.json").games;
}

export function lineupTag(name: string): { team: string; pos: string; tag: string } | null {
  const key = name.toLowerCase();
  for (const game of week7Lineups()) {
    for (const [team, players] of [
      [game.away, game.away_players],
      [game.home, game.home_players],
    ] as const) {
      const hit = players.find((p) => p.name.toLowerCase() === key && p.tag);
      if (hit?.tag) return { team, pos: hit.pos, tag: hit.tag };
    }
  }
  return null;
}
