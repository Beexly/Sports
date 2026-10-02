/**
 * 2026 weeks 1-3 situational rates. Week 4 only.
 * Higher is better except interception rate and fumble-lost rate.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_SITUATIONAL, type SituationalRates } from "./priors/nfl-2026-w4-situational.js";

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
  const home = NFL_2026_W4_SITUATIONAL[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_SITUATIONAL[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function rate(
  id: string,
  label: string,
  weight: number,
  read: (home: SituationalRates, away: SituationalRates) => number,
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
      const sides = pair(ctx);
      if (sides == null) return null;
      return {
        value: Number(read(sides.home, sides.away).toFixed(4)),
        capturedAt: "2026-weeks-1-3",
        metadata: { source: note },
      };
    },
  };
}

export const SITUATIONAL_SIGNALS: readonly SignalDefinition[] = [
  rate("nfl_third_down_rate", "NFL Third-Down Conversion, 2026 weeks 1-3", 0.07,
    (h, a) => h.thirdDownRate - a.thirdDownRate,
    "third_down_converted over third-down plays, at least 30 plays, home minus away"),
  rate("nfl_explosive_rate", "NFL Explosive Play Rate, 2026 weeks 1-3", 0.06,
    (h, a) => h.explosiveRate - a.explosiveRate,
    "gains of 20 or more over scrimmage plays, home minus away"),
  rate("nfl_int_rate", "NFL Interception Rate, 2026 weeks 1-3", 0.06,
    (h, a) => (a.intRate - h.intRate) * 100,
    "interceptions per dropback, visitor minus home, in percentage points"),
  rate("nfl_def_int_rate", "NFL Interceptions Forced, 2026 weeks 1-3", 0.06,
    (h, a) => (h.defIntRate - a.defIntRate) * 100,
    "interceptions forced per dropback faced, home minus visitor, in percentage points"),
  rate("nfl_fumble_lost_rate", "NFL Fumbles Lost, 2026 weeks 1-3", 0.04,
    (h, a) => (a.fumbleLostRate - h.fumbleLostRate) * 100,
    "fumbles lost per rush, visitor minus home, in percentage points"),
  rate("nfl_rz_td_rate", "NFL Red-Zone Touchdown Rate, 2026 weeks 1-3", 0.06,
    (h, a) => h.rzTdRate - a.rzTdRate,
    "touchdowns over plays inside the opponent 20, home minus away, sample at least 15"),
];
