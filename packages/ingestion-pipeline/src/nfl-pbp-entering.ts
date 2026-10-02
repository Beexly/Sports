/**
 * 2026 weeks 1-3 rates measured on the play file. Week 4 only.
 * These cover clubs the 2025 name-join missed.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_QB_RUSH_PBP } from "./priors/nfl-2026-w4-qb-rush-pbp.js";
import { NFL_2026_W4_WR_PBP } from "./priors/nfl-2026-w4-wr-pbp.js";

const KILL_LINE = {
  maxBrierScoreVsMarket: 0.250,
  minSettledSample: 100,
  maxDivergenceZScore: 3.0,
  maxAgeMinutes: 120,
} as const;

function teamLabel(team: unknown): string | null {
  if (typeof team === "string") return team;
  if (team && typeof team === "object") {
    const row = team as { abbreviation?: unknown; name?: unknown };
    if (typeof row.abbreviation === "string" && row.abbreviation.trim() !== "") return row.abbreviation;
    if (typeof row.name === "string") return row.name;
  }
  return null;
}

function week4(ctx: { sportKey: string; commenceTime?: Date }): boolean {
  if (ctx.sportKey !== "americanfootball_nfl" || !(ctx.commenceTime instanceof Date)) return false;
  const week = nflWeekOf(ctx.commenceTime);
  return week != null && week.season === 2026 && week.week === 4;
}

function signal(
  id: string,
  label: string,
  weight: number,
  read: (ctx: { homeTeam: unknown; awayTeam: unknown }) => number | null,
  note: string,
): SignalDefinition {
  return {
    id,
    label,
    category: "TEAM_RATES",
    family: "EFFICIENCY",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-scheme",
    dataDependencies: ["nflverse_pbp_2026_weeks_1_3"],
    activationStatus: "ACTIVE",
    trustWeight: weight,
    homeSign: 1 as const,
    neutralValue: 0,
    killLine: KILL_LINE,
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    evaluate: async (ctx) => {
      if (!week4(ctx)) return null;
      const value = read(ctx);
      if (value == null || !Number.isFinite(value)) return null;
      return { value: Number(value.toFixed(4)), capturedAt: "2026-weeks-1-3", metadata: { source: note } };
    },
  };
}

export const nflPbpQbRushAttSignal = signal(
  "nfl_pbp_qb_rush_att",
  "NFL QB Rush Attempts, 2026 weeks 1-3",
  0.07,
  (ctx) => {
    const home = NFL_2026_W4_QB_RUSH_PBP[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_QB_RUSH_PBP[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return home.rushAttPerGame - away.rushAttPerGame;
  },
  "rush attempts per game by the dropback leader, play file, not the 2025 name join",
);

export const nflPbpQbRushYardsSignal = signal(
  "nfl_pbp_qb_rush_yards",
  "NFL QB Rush Yards, 2026 weeks 1-3",
  0.06,
  (ctx) => {
    const home = NFL_2026_W4_QB_RUSH_PBP[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_QB_RUSH_PBP[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return (home.rushYardsPerGame - away.rushYardsPerGame) / 10;
  },
  "rush yards per game by the dropback leader, divided by 10",
);

export const nflPbpWrAdotSignal = signal(
  "nfl_pbp_wr_adot",
  "NFL Target-Leader Air Yards, 2026 weeks 1-3",
  0.06,
  (ctx) => {
    const home = NFL_2026_W4_WR_PBP[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_WR_PBP[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return home.adot - away.adot;
  },
  "mean air_yards on the target leader's targets with a recorded air yard",
);

export const nflPbpWrYacSignal = signal(
  "nfl_pbp_wr_yac",
  "NFL Target-Leader YAC, 2026 weeks 1-3",
  0.05,
  (ctx) => {
    const home = NFL_2026_W4_WR_PBP[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_WR_PBP[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return home.yacPerReception - away.yacPerReception;
  },
  "mean yards_after_catch on the target leader's completions",
);

export const PBP_ENTERING_SIGNALS = [
  nflPbpQbRushAttSignal,
  nflPbpQbRushYardsSignal,
  nflPbpWrAdotSignal,
  nflPbpWrYacSignal,
];
