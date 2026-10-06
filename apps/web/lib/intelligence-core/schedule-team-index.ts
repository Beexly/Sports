/**
 * Schedule-derived team resolution for `player_game_stats`.
 *
 * THE GAP THIS CLOSES
 * `player_game_stats.team` is NULL on every prod row for the 2025 and 2026
 * seasons (measured on Neon 2026-09-30: season 2026 = 1,091 rows, 0 non-null;
 * season 2025 = 6,396 rows, 0 non-null; seasons 2024 and earlier are 100%
 * populated). `loadPlayerStats` filters on that column, so the player-stat
 * surfaces returned zero rows on 100% of picks — a permanent, silent zero that
 * looks like "no data yet" instead of "this column is empty for these seasons".
 *
 * Two obvious substitutes were measured and both are dead ends:
 *   - `players.recentTeam`: NULL on every player backing a 2025/2026 stat row
 *     (measured: 0 of 1,091 for 2026, 0 of 6,396 for 2025). The players table
 *     holds 740 set / 696 null overall, but none of the set ones are players
 *     in the current season's stats.
 *   - `snap_counts.team` / `next_gen_stats.team`: these ARE populated for 2026
 *     (4,488 and 414 rows), but they are different grains and cannot stand in
 *     for the player's own team without inventing a join.
 *
 * THE JOIN THAT DOES WORK
 * `player_game_stats.opponent` is populated on 100% of those same rows
 * (1,091/1,091 for 2026, 6,396/6,396 for 2025) and holds a real abbreviation.
 * An NFL club plays exactly one game per week, so within one (season, week) a
 * stat row's opponent determines the row's team: whoever played that opponent
 * that week. `games` holds the schedule, so the resolution is exact rather
 * than inferred.
 *
 * FALSIFIED BEFORE SHIPPING (not assumed)
 * Joined on (playerId, season, week) against `next_gen_stats.team` — an
 * independently-ingested column that IS populated for 2026 weeks 1-3 — the
 * inversion agrees on 414 of 414 comparable rows. The only raw-string
 * mismatches (15) were `LA` vs `LAR`, i.e. the GSE spelling against the
 * nflverse spelling of the Rams, and all 15 vanish under that normalization.
 * `snap_counts` cannot serve as a second control: it is 100% `pfrPlayerId`
 * with 0 `playerId` rows for 2026, so there is no shared key to join on.
 *
 * FAIL-CLOSED, NEVER A GUESS
 * A (season, week, opponent) that maps to more than one team is DROPPED, not
 * resolved to the first or last writer. That happens for real on prod: the
 * week-22 clamp in `nflSeasonWeekForDate` folds every postseason game into one
 * bucket, so 32 keys are genuinely ambiguous (e.g. `2025:22:SF` maps to
 * LV, TEN and LAC). A row that cannot be resolved exactly is dropped and
 * counted, never attributed to a neighbouring club — returning another real
 * team's rows is worse than returning none.
 *
 * READ-ONLY BY CONSTRUCTION
 * Only `findMany` on `games`. No writes.
 */

import { db } from "@sports/db";
import { nflTeamAbbr } from "@sports/ingestion-pipeline";
// NOTE: `nflSeasonWeekForDate` is deliberately NOT imported from ./db-loaders.
// This module is called BY db-loaders, so importing back would form a cycle.
// The week function is injected instead, which also guarantees both sides
// bucket games by identical arithmetic.

/** `season:week:opponent` -> the one team that played that opponent. */
export type ScheduleTeamIndex = ReadonlyMap<string, string>;

/** `season:week:team` -> the opponent that team played that week. */
export type TeamOpponentIndex = ReadonlyMap<string, string>;

/** How many rows the index actually resolved, and how many it refused to. */
export interface ScheduleTeamResolution {
  readonly index: ScheduleTeamIndex;
  /**
   * The reverse view, used to pick WHICH stat rows to fetch. A stat row's team
   * is unknown, so filtering on `opponent IN (home, away)` is wrong — the home
   * club's rows mostly name some third team as the opponent. Querying by the
   * opponents these two clubs actually faced in the lagged window is exact.
   */
  readonly opponentsByTeamWeek: TeamOpponentIndex;
  /** Keys dropped because more than one team could have been the answer. */
  readonly ambiguousKeys: number;
  /** Games whose names did not resolve to an abbreviation. */
  readonly unmappedGames: number;
}

const EMPTY_RESOLUTION: ScheduleTeamResolution = {
  index: new Map(),
  opponentsByTeamWeek: new Map(),
  ambiguousKeys: 0,
  unmappedGames: 0,
};

/**
 * Opponents a set of clubs faced across a lagged season window.
 *
 * Returns the distinct abbreviations to filter `player_game_stats.opponent`
 * on, plus which club each one belongs to so the caller can attribute rows
 * without a second lookup. Weeks with no scheduled game for that club (bye
 * weeks) simply contribute nothing.
 */
export function opponentsInWindow(
  resolution: ScheduleTeamResolution,
  season: number,
  teams: readonly string[],
  beforeWeek: number,
): { readonly opponent: string; readonly team: string }[] {
  const out: { opponent: string; team: string }[] = [];
  for (const team of teams) {
    for (let week = 1; week < beforeWeek; week++) {
      const opp = resolution.opponentsByTeamWeek.get(`${season}:${week}:${team}`);
      if (opp) out.push({ opponent: opp, team });
    }
  }
  return out;
}

/**
 * Build the index from the live NFL schedule.
 *
 * `seasonWeekFor` is injected so the index is bucketed by exactly the same
 * arithmetic the loaders use to resolve an as-of week. If the two ever
 * disagree, every lookup misses and the surface returns empty — which is the
 * safe direction, but it is why the function is not reimplemented here.
 */
export async function buildScheduleTeamIndex(
  seasonWeekFor: (d: Date) => { season: number; week: number } | null,
): Promise<ScheduleTeamResolution> {
  const games = await db.game.findMany({
    where: { sport: { key: "americanfootball_nfl" } },
    select: { homeTeamName: true, awayTeamName: true, commenceTime: true },
  });

  // Collect candidate answers first so ambiguity is visible, not order-dependent.
  const candidates = new Map<string, Set<string>>();
  const reverseCandidates = new Map<string, Set<string>>();
  let unmappedGames = 0;
  for (const g of games) {
    const home = nflTeamAbbr(g.homeTeamName);
    const away = nflTeamAbbr(g.awayTeamName);
    if (!home || !away) {
      unmappedGames++;
      continue;
    }
    const sw = seasonWeekFor(g.commenceTime);
    if (!sw) continue;
    for (const [opponent, team] of [
      [away, home],
      [home, away],
    ] as const) {
      const key = `${sw.season}:${sw.week}:${opponent}`;
      let set = candidates.get(key);
      if (!set) {
        set = new Set<string>();
        candidates.set(key, set);
      }
      set.add(team);

      const revKey = `${sw.season}:${sw.week}:${team}`;
      let rev = reverseCandidates.get(revKey);
      if (!rev) {
        rev = new Set<string>();
        reverseCandidates.set(revKey, rev);
      }
      rev.add(opponent);
    }
  }

  // Same fail-closed rule in both directions: a club with two games in one
  // bucket (the week-22 postseason clamp on prod) has no single opponent, so
  // its key is dropped rather than resolved to whichever game was read last.
  const index = new Map<string, string>();
  const opponentsByTeamWeek = new Map<string, string>();
  let ambiguousKeys = 0;
  for (const [key, teams] of candidates) {
    if (teams.size === 1) index.set(key, [...teams][0] as string);
    else ambiguousKeys++;
  }
  for (const [key, opps] of reverseCandidates) {
    if (opps.size === 1) opponentsByTeamWeek.set(key, [...opps][0] as string);
  }
  return { index, opponentsByTeamWeek, ambiguousKeys, unmappedGames };
}

// ---------------------------------------------------------------------------
// Memoisation
// ---------------------------------------------------------------------------

/**
 * One schedule read per process for `TTL_MS`, because `/api/picks` calls
 * `loadBundleSurfaces` once per pick in parallel — a slate of 30 would
 * otherwise issue 30 identical reads of the whole NFL schedule.
 *
 * A single-flight promise (not just a cached value) so concurrent callers on
 * a cold cache share one read instead of racing to start 30.
 */
const TTL_MS = 5 * 60_000;
let cached: { at: number; value: Promise<ScheduleTeamResolution> } | null = null;

/** Test seam: drop the memo so one test cannot leak into the next. */
export function __resetScheduleTeamIndexCache(): void {
  cached = null;
}

export function scheduleTeamIndex(
  seasonWeekFor: (d: Date) => { season: number; week: number } | null,
): Promise<ScheduleTeamResolution> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const promise = buildScheduleTeamIndex(seasonWeekFor).catch((err: unknown) => {
    // A failing schedule read must not blank the surface that already worked
    // off the stored column, so degrade to an empty index and let the caller
    // fall back rather than throwing.
    console.warn("[schedule-team-index] read failed; player-stat team resolution disabled", err);
    return EMPTY_RESOLUTION;
  });
  cached = { at: now, value: promise };
  return promise;
}

/** Convenience wrapper that resolves a stat row's team, or null if unresolvable. */
export async function resolveStatRowTeam(
  season: number,
  week: number,
  opponent: string | null,
  seasonWeekFor: (d: Date) => { season: number; week: number } | null,
): Promise<string | null> {
  if (!opponent) return null;
  const { index } = await scheduleTeamIndex(seasonWeekFor);
  return index.get(`${season}:${week}:${opponent}`) ?? null;
}
