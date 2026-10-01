/**
 * Home win rate minus the visitor's road win rate, from the official week-4
 * standings. Overall record is a different signal. A split with no games abstains.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_HOME_ROAD, NFL_STANDINGS_W4 } from "./priors/nfl-2026-standings-w4.js";

const KILL_LINE = {
  maxBrierScoreVsMarket: 0.250,
  minSettledSample: 100,
  maxDivergenceZScore: 3.0,
  maxAgeMinutes: 10080,
} as const;

function label(team: unknown): string | null {
  if (typeof team === "string") return team;
  if (team && typeof team === "object") {
    const row = team as { abbreviation?: unknown; name?: unknown };
    if (typeof row.abbreviation === "string" && row.abbreviation.trim() !== "") return row.abbreviation;
    if (typeof row.name === "string") return row.name;
  }
  return null;
}

function rate(wins: number, losses: number, ties: number): number | null {
  const games = wins + losses + ties;
  if (games <= 0) return null;
  return (wins + ties * 0.5) / games;
}

export const nflHomeRoadSplitSignal: SignalDefinition = {
  id: "nfl_home_road_split",
  label: "NFL Home Form vs Visitor Road Form",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-situational",
  dataDependencies: ["nfl_com_standings_2026_w4"],
  activationStatus: "ACTIVE",
  trustWeight: 0.07,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const week = nflWeekOf(ctx.commenceTime);
    if (week == null || week.season !== NFL_STANDINGS_W4.season || week.week !== NFL_STANDINGS_W4.week) {
      return null;
    }
    if (ctx.commenceTime.getTime() <= Date.parse(NFL_STANDINGS_W4.observedAt)) return null;
    const home = NFL_HOME_ROAD[nflTeamAbbr(label(ctx.homeTeam)) ?? ""];
    const away = NFL_HOME_ROAD[nflTeamAbbr(label(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    const homeRate = rate(home.homeWins, home.homeLosses, home.homeTies);
    const roadRate = rate(away.roadWins, away.roadLosses, away.roadTies);
    if (homeRate == null || roadRate == null) return null;
    return {
      value: homeRate - roadRate,
      capturedAt: NFL_STANDINGS_W4.observedAt,
      metadata: {
        basis: "home win rate minus visitor road win rate",
        homeSplit: home,
        awayRoadSplit: { wins: away.roadWins, losses: away.roadLosses, ties: away.roadTies },
        week: NFL_STANDINGS_W4.week,
        season: NFL_STANDINGS_W4.season,
      },
    };
  },
};
