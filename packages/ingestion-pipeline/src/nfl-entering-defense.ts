/**
 * 2026 weeks 1-3 EPA allowed, week-4 slate only.
 * Positive value means the home defense allowed less EPA than the visitor.
 * A side under 60 plays on that split abstains.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { MIN_EARLY_DOWN_PLAYS } from "./signals-bridge.js";
import { NFL_2026_W4_DEFENSE, type DefenseAllowed } from "./priors/nfl-2026-w4-defense.js";

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

function sides(ctx: { homeTeam: unknown; awayTeam: unknown; commenceTime?: Date; sportKey: string }): { home: DefenseAllowed; away: DefenseAllowed } | null {
  if (ctx.sportKey !== "americanfootball_nfl") return null;
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = NFL_2026_W4_DEFENSE[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_DEFENSE[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function defenseSignal(
  id: string,
  label: string,
  plays: (row: DefenseAllowed) => number,
  read: (home: DefenseAllowed, away: DefenseAllowed) => number,
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
    trustWeight: 0.08,
    homeSign: 1 as const,
    neutralValue: 0,
    killLine: KILL_LINE,
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    evaluate: async (ctx) => {
      const pair = sides(ctx);
      if (pair == null) return null;
      if (plays(pair.home) < MIN_EARLY_DOWN_PLAYS || plays(pair.away) < MIN_EARLY_DOWN_PLAYS) return null;
      const value = Number(read(pair.home, pair.away).toFixed(4));
      if (!Number.isFinite(value)) return null;
      return {
        value,
        capturedAt: "2026-10-01",
        metadata: { source: note, countedThroughWeek: 3 },
      };
    },
  };
}

export const nflEnteringPassDefenseSignal = defenseSignal(
  "nfl_entering_pass_epa_allowed",
  "NFL Pass EPA Allowed, 2026 weeks 1-3",
  (row) => row.passPlays,
  (home, away) => away.passEpaAllowed - home.passEpaAllowed,
  "mean EPA allowed on pass plays, visitor minus home, so a positive value is a better home pass defense",
);

export const nflEnteringRushDefenseSignal = defenseSignal(
  "nfl_entering_rush_epa_allowed",
  "NFL Rush EPA Allowed, 2026 weeks 1-3",
  (row) => row.rushPlays,
  (home, away) => away.rushEpaAllowed - home.rushEpaAllowed,
  "mean EPA allowed on rush plays, visitor minus home, so a positive value is a better home rush defense",
);

export const ENTERING_DEFENSE_SIGNALS: readonly SignalDefinition[] = [
  nflEnteringPassDefenseSignal,
  nflEnteringRushDefenseSignal,
];
