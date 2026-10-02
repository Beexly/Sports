/**
 * Entering win rate from the ESPN week-4 scoreboard. Votes only for a kickoff
 * in that week, after the board was observed, and only when both clubs are on it.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { ESPN_ENTERING_RECORD, ESPN_NFL_WEEK4 } from "./priors/espn-nfl-2026-w4.js";

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

export const nflEspnEnteringRecordSignal: SignalDefinition = {
  id: "nfl_espn_entering_record",
  label: "NFL entering win rate (ESPN scoreboard)",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-standings",
  dataDependencies: ["espn_scoreboard"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  homeSign: 1 as const,
  neutralValue: 0,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const week = nflWeekOf(ctx.commenceTime);
    if (week == null || week.season !== ESPN_NFL_WEEK4.season || week.week !== ESPN_NFL_WEEK4.week) return null;
    if (ctx.commenceTime.getTime() <= Date.parse(ESPN_NFL_WEEK4.observedAt)) return null;
    const homeAbbr = nflTeamAbbr(label(ctx.homeTeam));
    const awayAbbr = nflTeamAbbr(label(ctx.awayTeam));
    if (homeAbbr == null || awayAbbr == null) return null;
    const home = ESPN_ENTERING_RECORD[homeAbbr];
    const away = ESPN_ENTERING_RECORD[awayAbbr];
    if (home == null || away == null || home.winPct == null || away.winPct == null) return null;
    const value = Number((home.winPct - away.winPct).toFixed(4));
    if (!Number.isFinite(value)) return null;
    return {
      value,
      capturedAt: ESPN_NFL_WEEK4.observedAt,
      metadata: {
        home: homeAbbr,
        away: awayAbbr,
        homeRecord: `${home.wins}-${home.losses}`,
        awayRecord: `${away.wins}-${away.losses}`,
        source: "espn scoreboard week 4",
      },
    };
  },
};
