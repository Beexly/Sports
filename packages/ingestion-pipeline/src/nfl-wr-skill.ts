/**
 * 2025 YAC and drop rate for the 2026 weeks 1-3 target leader.
 * Same join as the adot vote. A missing cell abstains. Week 4 only.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_WR_SKILL } from "./priors/nfl-2026-w4-wr-skill.js";

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

function sides(ctx: { sportKey: string; homeTeam: unknown; awayTeam: unknown; commenceTime?: Date }) {
  if (ctx.sportKey !== "americanfootball_nfl") return null;
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = NFL_2026_W4_WR_SKILL[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_WR_SKILL[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

export const nflWrYacSignal: SignalDefinition = {
  id: "nfl_wr_yac",
  label: "NFL Target-Leader YAC, 2025 file",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nflverse_pbp_2026_weeks_1_3", "wr_smash_2025"],
  activationStatus: "ACTIVE",
  trustWeight: 0.05,
  homeSign: 1 as const,
  neutralValue: 0,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    const pair = sides(ctx);
    if (pair == null) return null;
    return {
      value: Number((pair.home.yacPerReception - pair.away.yacPerReception).toFixed(4)),
      capturedAt: "2025-skill-of-2026-target-leader",
      metadata: { homePlayer: pair.home.player, awayPlayer: pair.away.player },
    };
  },
};

export const nflWrDropRateSignal: SignalDefinition = {
  id: "nfl_wr_drop_rate",
  label: "NFL Target-Leader Drop Rate, 2025 file",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nflverse_pbp_2026_weeks_1_3", "wr_smash_2025"],
  activationStatus: "ACTIVE",
  trustWeight: 0.05,
  homeSign: 1 as const,
  neutralValue: 0,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    const pair = sides(ctx);
    if (pair == null) return null;
    return {
      value: Number(((pair.away.dropRate - pair.home.dropRate) * 100).toFixed(4)),
      capturedAt: "2025-skill-of-2026-target-leader",
      metadata: { homePlayer: pair.home.player, awayPlayer: pair.away.player, unit: "percentage points, visitor minus home" },
    };
  },
};
