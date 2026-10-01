/**
 * Official NFL practice and game-status report, wired to a pick only when the
 * report was observed before kickoff and the kickoff is that report's week.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_INJURY_BY_TEAM, NFL_INJURY_REPORT } from "./priors/nfl-injury-2026-w4.js";

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

function gseToNflCom(abbr: string): string {
  if (abbr === "ARI") return "AZ";
  return abbr;
}

function rowFor(name: unknown) {
  const abbr = nflTeamAbbr(label(name));
  if (abbr == null) return null;
  const nfl = gseToNflCom(abbr);
  const row = NFL_INJURY_BY_TEAM[nfl];
  if (row == null) return null;
  return { abbr, row };
}

function reportApplies(commenceTime: Date): boolean {
  const week = nflWeekOf(commenceTime);
  if (week == null) return false;
  if (week.season !== NFL_INJURY_REPORT.season || week.week !== NFL_INJURY_REPORT.week) return false;
  return commenceTime.getTime() > Date.parse(NFL_INJURY_REPORT.observedAt);
}

function gapSignal(
  id: string,
  labelText: string,
  weight: number,
  pick: (row: { dnpSkill: number; outSkill: number }) => number,
): SignalDefinition {
  return {
    id,
    label: labelText,
    category: "PLAYER_AVAILABILITY",
    family: "SITUATIONAL",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-availability",
    dataDependencies: ["nfl_com_injury_report"],
    activationStatus: "ACTIVE",
    trustWeight: weight,
    homeSign: 1 as const,
    neutralValue: 0,
    killLine: KILL_LINE,
    isRightsCleared: () => true,
    acquisitionTask: null,
    blockedReason: null,
    evaluate: async (ctx) => {
      if (ctx.sportKey !== "americanfootball_nfl") return null;
      if (!reportApplies(ctx.commenceTime)) return null;
      const home = rowFor(ctx.homeTeam);
      const away = rowFor(ctx.awayTeam);
      if (home == null || away == null) return null;
      const value = Number((pick(away.row) - pick(home.row)).toFixed(4));
      if (!Number.isFinite(value)) return null;
      return {
        value,
        capturedAt: NFL_INJURY_REPORT.observedAt,
        metadata: {
          season: NFL_INJURY_REPORT.season,
          week: NFL_INJURY_REPORT.week,
          sourceUrl: NFL_INJURY_REPORT.sourceUrl,
          home: home.abbr,
          away: away.abbr,
          homeValue: pick(home.row),
          awayValue: pick(away.row),
        },
      };
    },
  };
}

export const NFL_INJURY_SIGNALS: readonly SignalDefinition[] = [
  gapSignal(
    "nfl_practice_dnp_skill",
    "NFL skill-position practice absences (official report)",
    0.1,
    (row) => row.dnpSkill / 4,
  ),
  gapSignal(
    "nfl_official_out_skill",
    "NFL skill-position game-status OUT (official report)",
    0.12,
    (row) => row.outSkill,
  ),
];
