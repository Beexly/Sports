/**
 * Opponent-adjusted team ratings, loaded from persisted team-game efficiency.
 *
 * Reads the season's TeamGameEfficiency rows and runs the opponent-adjustment
 * engine to net out schedule strength → adjusted offense / defense / overall per
 * team. A reproduced DVOA-family rating over public play-by-play. Read-only;
 * honest empty state until the team-efficiency backfill has run.
 */
import { db } from "@sports/db";
import { opponentAdjustedRatings, type TeamGameEfficiency as EngineEfficiency, type TeamRating } from "@sports/prediction-engine";

export interface TeamRatingsReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly generatedAt: string;
  readonly teamCount: number;
  readonly gamesUsed: number;
  readonly ratings: readonly TeamRating[];
  readonly note: string;
}

export async function loadTeamRatings(season: number): Promise<TeamRatingsReport> {
  const generatedAt = new Date().toISOString();

  const rows = await db.teamGameEfficiency.findMany({
    where: { season },
    select: { team: true, opponent: true, offEpaPerPlay: true, defEpaPerPlay: true },
  });
  const list = Array.isArray(rows) ? rows : [];

  if (list.length === 0) {
    return {
      status: "no-data",
      season,
      generatedAt,
      teamCount: 0,
      gamesUsed: 0,
      ratings: [],
      note: "No team-game efficiency for this season yet. Run the team-efficiency backfill, then re-check.",
    };
  }

  const games: EngineEfficiency[] = list.map((r) => ({
    team: r.team,
    opponent: r.opponent,
    offValue: r.offEpaPerPlay,
    defValue: r.defEpaPerPlay,
  }));
  const ratings = opponentAdjustedRatings(games);

  return {
    status: "ok",
    season,
    generatedAt,
    teamCount: ratings.length,
    gamesUsed: list.length,
    ratings,
    note: "Opponent-adjusted efficiency (EPA/play netted for schedule strength). overall = adjOff − adjDef; higher is better.",
  };
}
