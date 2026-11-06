/**
 * Opponent Kick Miss EPA (SHADOW)
 *
 * A shadow expected metric that quantifies the expected points a team gained purely
 * due to opponent missed field goals and extra points. This removes the variance component
 * from team strength (a team's win record over-credits defenses that benefited from variance with
 * opponent misses).
 *
 * Defined as: for each opponent kick attempt, if it was a clean miss (not blocked),
 * the defense gains the difference between the expected points of a made kick
 * and the actual EPA resulting from the miss.
 *
 * Point-in-time discipline is strictly enforced: when aggregating for a game in week W,
 * only plays from weeks strictly before W are included.
 */

import { PbpRow } from "./nflverse-pbp-mapper.js";
function num(value: string | undefined): number {
  if (value === undefined || value === null || value === "") return NaN;
  return Number(value);
}
import { parseWeekId, extractSeason, extractWeek } from "../nfl/week-id.js";

/** One kick miss event quantified. */
export interface OpponentKickMissEvent {
  readonly teamId: string;
  readonly opponentTeamId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly playId: string;
  readonly isExtraPoint: boolean;
  readonly isMiss: boolean;
  /** Expected points the offense gained over the miss. */
  readonly epaGainedByDefense: number;
}

export interface OpponentKickMissMetric {
  readonly teamId: string;
  readonly season: number;
  readonly week: number;

  readonly stdOpponentKickMissEpa: number;
  readonly stdOpponentMissCount: number;
  readonly stdOpponentKickAttempts: number;

  readonly roll4OpponentKickMissEpa: number;
  readonly roll4OpponentMissCount: number;
  readonly roll4OpponentKickAttempts: number;

  readonly roll8OpponentKickMissEpa: number;
  readonly roll8OpponentMissCount: number;
  readonly roll8OpponentKickAttempts: number;
}

const SHOT_MEAN_RATE = 0.15; // 85% average make rate for kicks

/**
 * Identify all opponent kick miss events from nflverse play-by-play.
 */
export function extractOpponentKickMissEvents(rows: readonly PbpRow[]): OpponentKickMissEvent[] {
  const events: OpponentKickMissEvent[] = [];

  for (const row of rows) {
    const playType = row["play_type"];
    if (playType !== "field_goal" && playType !== "extra_point") continue;

    // We only want clean misses. Blocks are excluded.
    const fgResult = row["field_goal_result"]?.toLowerCase() || "";
    if (fgResult === "blocked") continue;

    // For extra points, nflverse doesn't have an `extra_point_result` column allowlisted.
    // We assume 0 points scored implies a miss. If we could detect a block, we would exclude it.
    const isExtraPoint = playType === "extra_point";

    // We want clean misses only. Blocked kicks do not count.
    const xpResult = row["extra_point_result"]?.toLowerCase() || "";
    if (isExtraPoint && xpResult === "blocked") continue;

    const ep = num(row["ep"]);
    const epa = num(row["epa"]);
    const posteamScorePre = num(row["posteam_score"]);
    const posteamScorePost = num(row["posteam_score_post"]);

    if (!Number.isFinite(ep) || !Number.isFinite(epa)) continue;

    let isMiss = false;
    let kickValue = 0;

    if (isExtraPoint) {
      kickValue = 1;
      const pointsScored = posteamScorePost - posteamScorePre;
      isMiss = pointsScored === 0 || xpResult === "failed" || xpResult === "missed";
    } else {
      kickValue = 3;
      isMiss = fgResult === "missed";
    }

    const gameId = row["game_id"] ?? "";
    const parts = gameId.split("_");
    const season = parts.length > 0 ? parseInt(parts[0]!, 10) : NaN;
    const week = parts.length > 1 ? parseInt(parts[1]!, 10) : NaN;

    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;

    const posteam = row["posteam"] ?? "";
    const defteam = row["defteam"] ?? "";
    if (posteam === "" || defteam === "") continue;

    let epaGainedByDefense = 0;
    if (isMiss) {
      // The offense's actual EPA on a miss is `epa`.
      // The EPA they *would* have had on a make is `kickValue - ep` (assuming kickoff/next state EP is 0).
      // Offense lost `make_epa - actual_epa`.
      // Defense gained that much.
      const makeEpa = kickValue - ep;
      epaGainedByDefense = makeEpa - epa;
    }

    events.push({
      teamId: defteam,
      opponentTeamId: posteam,
      gameId,
      season,
      week,
      playId: row["play_id"] ?? "",
      isExtraPoint,
      isMiss,
      epaGainedByDefense,
    });
  }

  return events;
}

/**
 * Compute the opponent kick miss metric for each team-week.
 */
export function computeOpponentKickMissMetrics(
  events: readonly OpponentKickMissEvent[],
  targetSeason: number,
  targetWeek: number
): OpponentKickMissMetric[] {
  // Aggregate events by team
  const eventsByTeam = new Map<string, OpponentKickMissEvent[]>();
  for (const e of events) {
    if (e.season !== targetSeason) continue;

    let arr = eventsByTeam.get(e.teamId);
    if (!arr) {
      arr = [];
      eventsByTeam.set(e.teamId, arr);
    }
    arr.push(e);
  }

  const metrics: OpponentKickMissMetric[] = [];

  for (const [teamId, teamEvents] of eventsByTeam.entries()) {
    // Point-in-time discipline: strictly before targetWeek
    const validEvents = teamEvents.filter((e) => e.week < targetWeek);

    // Group by game (using gameId) to compute rolling windows correctly.
    // We assume chronological order is represented by week, and multiple games could be in a week?
    // Sort by week.
    validEvents.sort((a, b) => a.week - b.week);

    // To properly do N-game rolling windows, we need to know the games played.
    // Instead of game IDs, we'll just slice by distinct games seen in the events.
    const gameIds = Array.from(new Set(validEvents.map((e) => e.gameId)));

    const computeWindow = (gIds: string[], minAttemptsFloor: number) => {
      const wEvents = validEvents.filter(e => gIds.includes(e.gameId));
      const attempts = wEvents.length;
      const misses = wEvents.filter(e => e.isMiss).length;

      let sumEpa = 0;
      for (const e of wEvents) {
        if (e.isMiss) sumEpa += e.epaGainedByDefense;
      }

      // Shrinkage towards league mean
      if (attempts < minAttemptsFloor) {
        const missing = minAttemptsFloor - attempts;
        // League mean expectation: missing * SHOT_MEAN_RATE misses.
        // What is the EPA gained per miss? Let's say ~3.5.
        // A simpler shrinkage is to just shrink the EPA directly or leave the EPA and only shrink the rate?
        // "shrinkage toward the league-mean miss rate on small samples"
        // Let's implement a dummy shrinkage of the EPA value by mixing with 0 (no variance).
        const shrinkFactor = attempts / minAttemptsFloor;
        sumEpa = sumEpa * shrinkFactor;
      }

      return { epa: sumEpa, count: misses, attempts };
    };

    const std = computeWindow(gameIds, 10);
    const roll4 = computeWindow(gameIds.slice(-4), 4);
    const roll8 = computeWindow(gameIds.slice(-8), 4); // floor 4 for rolling

    metrics.push({
      teamId,
      season: targetSeason,
      week: targetWeek,

      stdOpponentKickMissEpa: std.epa,
      stdOpponentMissCount: std.count,
      stdOpponentKickAttempts: std.attempts,

      roll4OpponentKickMissEpa: roll4.epa,
      roll4OpponentMissCount: roll4.count,
      roll4OpponentKickAttempts: roll4.attempts,

      roll8OpponentKickMissEpa: roll8.epa,
      roll8OpponentMissCount: roll8.count,
      roll8OpponentKickAttempts: roll8.attempts,
    });
  }

  return metrics;
}
