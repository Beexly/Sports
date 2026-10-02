/**
 * 2026 weeks 1-3 offensive EPA split. Week 4 only.
 * A side under 60 plays on that split abstains.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_OFF_EPA } from "./priors/nfl-2026-w4-off-epa.js";

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
  if (ctx.sportKey !== "americanfootball_nfl" || !(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = NFL_2026_W4_OFF_EPA[nflTeamAbbr(teamLabel(ctx.homeTeam)) ?? ""];
  const away = NFL_2026_W4_OFF_EPA[nflTeamAbbr(teamLabel(ctx.awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function split(
  id: string,
  label: string,
  plays: "passPlays" | "rushPlays",
  epa: "passEpa" | "rushEpa",
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
    trustWeight: 0.07,
    homeSign: 1 as const,
    neutralValue: 0,
    killLine: KILL_LINE,
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    evaluate: async (ctx) => {
      const pair = sides(ctx);
      if (pair == null) return null;
      if (pair.home[plays] < 60 || pair.away[plays] < 60) return null;
      return {
        value: Number((pair.home[epa] - pair.away[epa]).toFixed(4)),
        capturedAt: "2026-weeks-1-3",
        metadata: { source: note, homePlays: pair.home[plays], awayPlays: pair.away[plays] },
      };
    },
  };
}

export const OFF_EPA_SPLIT_SIGNALS: readonly SignalDefinition[] = [
  split("nfl_off_pass_epa", "NFL Offensive Pass EPA, 2026 weeks 1-3", "passPlays", "passEpa",
    "mean EPA on pass plays, home minus away"),
  split("nfl_off_rush_epa", "NFL Offensive Rush EPA, 2026 weeks 1-3", "rushPlays", "rushEpa",
    "mean EPA on rush plays, home minus away, abstains under 60 rushes"),
];
