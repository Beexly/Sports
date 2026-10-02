/**
 * 2026 weeks 1-3 offensive success. Week 4 only.
 * Higher is better. Home minus away.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_SUCCESS } from "./priors/nfl-2026-w4-success.js";

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

function pair(ctx: { sportKey: string; homeTeam: unknown; awayTeam: unknown; commenceTime?: Date }) {
  if (ctx.sportKey !== "americanfootball_nfl" || !(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = NFL_2026_W4_SUCCESS[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_SUCCESS[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function rate(id: string, label: string, weight: number, key: "successRate" | "seriesSuccessRate", note: string): SignalDefinition {
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
      const sides = pair(ctx);
      if (sides == null) return null;
      return {
        value: Number((sides.home[key] - sides.away[key]).toFixed(4)),
        capturedAt: "2026-weeks-1-3",
        metadata: { source: note },
      };
    },
  };
}

export const SUCCESS_SIGNALS: readonly SignalDefinition[] = [
  rate("nfl_off_success_rate", "NFL Offensive Success Rate, 2026 weeks 1-3", 0.06, "successRate",
    "share of scrimmage plays with EPA above zero, home minus away"),
  rate("nfl_series_success_rate", "NFL Series Success Rate, 2026 weeks 1-3", 0.05, "seriesSuccessRate",
    "play-file series_success flag, home minus away"),
];
