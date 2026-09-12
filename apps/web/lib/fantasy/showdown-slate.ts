/**
 * Illustrative showdown slate — one fictional game, clearly labelled.
 *
 * Same doctrine as lib/fantasy/dfs-slate.ts: player NAMES are fictional so no
 * estimate is ever pinned to a real person; team codes and the salary/projection
 * shape are realistic. This is a demonstration of the format, not a live slate.
 *
 * Team codes are FICTIONAL-ONLY placeholders for a single game ("KCA" vs "BUF")
 * so the two-team rule is obvious on the surface. A licensed single-game slate is
 * injected by the founder behind the same gate pattern as the Classic slate.
 */

import type { ShowdownPlayer } from "./showdown";

const p = (
  id: string,
  name: string,
  pos: string,
  team: string,
  salary: number,
  proj: number,
  ceiling: number,
): ShowdownPlayer => ({ id, name, pos, team, salary, proj, ceiling });

/** One game: KCA at BUF. Six players per side is a realistic DK showdown pool. */
export const SHOWDOWN_SLATE: readonly ShowdownPlayer[] = [
  // KCA
  p("kca-qb", "Dane Marchetti", "QB", "KCA", 11200, 21.4, 31.2),
  p("kca-rb1", "Trell Baskin", "RB", "KCA", 8400, 15.1, 25.4),
  p("kca-wr1", "Owen Vash", "WR", "KCA", 7600, 13.8, 27.1),
  p("kca-wr2", "Cruz Delaine", "WR", "KCA", 5200, 9.2, 19.6),
  p("kca-te1", "Marek Sowa", "TE", "KCA", 4600, 8.4, 17.2),
  p("kca-dst", "KCA Defense", "DST", "KCA", 2800, 6.1, 14.8),
  // BUF
  p("buf-qb", "Silas Renner", "QB", "BUF", 10800, 20.6, 30.4),
  p("buf-rb1", "Jonah Pike", "RB", "BUF", 7900, 14.4, 23.8),
  p("buf-wr1", "Anders Kroll", "WR", "BUF", 7100, 12.9, 25.2),
  p("buf-wr2", "Remy Ibarra", "WR", "BUF", 4900, 8.8, 18.9),
  p("buf-te1", "Teo Vasquez", "TE", "BUF", 4400, 7.9, 16.4),
  p("buf-dst", "BUF Defense", "DST", "BUF", 2600, 5.7, 13.9),
];

export const SHOWDOWN_GAME_LABEL = "KCA at BUF";
