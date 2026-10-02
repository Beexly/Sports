/**
 * 2025 rush attempts per game for the QB who led 2026 weeks 1-3 snaps.
 * A leader missing from the 2025 file abstains. Week 4 only.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_QB_RUSH } from "./priors/nfl-2026-w4-qb-rush.js";
import { NFL_2026_W4_QB_RUSH_YARDS } from "./priors/nfl-2026-w4-qb-rush-yards.js";

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

export const nflQbRushRateSignal: SignalDefinition = {
  id: "nfl_qb_rush_rate",
  label: "NFL QB Rush Attempts, snap leader",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-scheme",
  dataDependencies: ["snap_counts_2026_weeks_1_3", "qb_types_2025"],
  activationStatus: "ACTIVE",
  trustWeight: 0.06,
  homeSign: 1 as const,
  neutralValue: 0,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    if (!(ctx.commenceTime instanceof Date)) return null;
    const week = nflWeekOf(ctx.commenceTime);
    if (week == null || week.season !== 2026 || week.week !== 4) return null;
    const home = NFL_2026_W4_QB_RUSH[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_QB_RUSH[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return {
      value: Number((home.rushAttPerGame - away.rushAttPerGame).toFixed(4)),
      capturedAt: "2025-rate-of-2026-snap-leader",
      metadata: {
        homeQb: home.qb,
        awayQb: away.qb,
        homeType: home.qbType,
        awayType: away.qbType,
        rateSeason: 2025,
        snapsThroughWeek: 3,
      },
    };
  },
};

export const nflQbRushYardsSignal: SignalDefinition = {
  id: "nfl_qb_rush_yards",
  label: "NFL QB Rush Yards, snap leader",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-scheme",
  dataDependencies: ["snap_counts_2026_weeks_1_3", "qb_types_2025"],
  activationStatus: "ACTIVE",
  trustWeight: 0.05,
  homeSign: 1 as const,
  neutralValue: 0,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    if (!(ctx.commenceTime instanceof Date)) return null;
    const week = nflWeekOf(ctx.commenceTime);
    if (week == null || week.season !== 2026 || week.week !== 4) return null;
    const home = NFL_2026_W4_QB_RUSH_YARDS[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
    const away = NFL_2026_W4_QB_RUSH_YARDS[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
    if (home == null || away == null) return null;
    return {
      value: Number(((home.rushYardsPerGame - away.rushYardsPerGame) / 10).toFixed(4)),
      capturedAt: "2025-yards-of-2026-snap-leader",
      metadata: { homeQb: home.qb, awayQb: away.qb, unit: "yards per game divided by 10" },
    };
  },
};
