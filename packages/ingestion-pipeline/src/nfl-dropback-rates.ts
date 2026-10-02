/**
 * 2026 weeks 1-3 dropback rates. Week 4 only.
 * A lower allowed rate is better, so those votes are visitor minus home.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_DROPBACK, type DropbackRates } from "./priors/nfl-2026-w4-dropback.js";

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
  const home = NFL_2026_W4_DROPBACK[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_DROPBACK[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function rate(
  id: string,
  label: string,
  weight: number,
  read: (home: DropbackRates, away: DropbackRates) => number,
  note: string,
): SignalDefinition {
  return {
    id,
    label,
    category: "TEAM_RATES",
    family: "TRENCHES",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-trenches",
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

export const DROPBACK_SIGNALS: readonly SignalDefinition[] = [
  rate("nfl_sack_rate_allowed", "NFL Sack Rate Allowed, 2026 weeks 1-3", 0.06,
    (h, a) => (a.sackAllowed - h.sackAllowed) * 100,
    "sacks per dropback, visitor minus home, in percentage points"),
  rate("nfl_hit_rate_allowed", "NFL QB Hit Rate Allowed, 2026 weeks 1-3", 0.05,
    (h, a) => (a.hitAllowed - h.hitAllowed) * 100,
    "qb_hit per dropback, visitor minus home, in percentage points"),
  rate("nfl_sack_rate_forced", "NFL Sack Rate Forced, 2026 weeks 1-3", 0.06,
    (h, a) => (h.sackForced - a.sackForced) * 100,
    "sacks forced per dropback, home minus visitor, in percentage points"),
  rate("nfl_hit_rate_forced", "NFL QB Hit Rate Forced, 2026 weeks 1-3", 0.05,
    (h, a) => (h.hitForced - a.hitForced) * 100,
    "qb_hit forced per dropback, home minus visitor, in percentage points"),
  rate("nfl_scramble_rate", "NFL Scramble Rate, 2026 weeks 1-3", 0.04,
    (h, a) => (h.scrambleRate - a.scrambleRate) * 100,
    "qb_scramble per dropback, home minus visitor, in percentage points"),
  rate("nfl_cpoe", "NFL CPOE, 2026 weeks 1-3", 0.06,
    (h, a) => (h.cpoe - a.cpoe) / 10,
    "mean completion percentage over expected, divided by 10"),
];
