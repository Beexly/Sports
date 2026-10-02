/**
 * 2025 personnel shares. Home minus away. Not a package grade.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_2025_PERSONNEL, type PersonnelShare } from "./priors/nfl-2025-personnel.js";

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

function pair(homeTeam: unknown, awayTeam: unknown): { home: PersonnelShare; away: PersonnelShare } | null {
  const home = NFL_2025_PERSONNEL[nflTeamAbbr(teamLabel(homeTeam)) ?? ""];
  const away = NFL_2025_PERSONNEL[nflTeamAbbr(teamLabel(awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function personnelSignal(
  id: string,
  label: string,
  read: (home: PersonnelShare, away: PersonnelShare) => number,
  note: string,
): SignalDefinition {
  return {
    id,
    label,
    category: "TEAM_RATES",
    family: "SITUATIONAL",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-scheme",
    dataDependencies: ["participation_2025"],
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
      const sides = pair(ctx.homeTeam, ctx.awayTeam);
      if (sides == null) return null;
      return {
        value: Number(read(sides.home, sides.away).toFixed(4)),
        capturedAt: "2025",
        metadata: { source: note, season: 2025 },
      };
    },
  };
}

export const nflPersonnel11Signal = personnelSignal(
  "nfl_personnel_11",
  "NFL 11 Personnel Share, 2025",
  (home, away) => home.personnel11 - away.personnel11,
  "share of plays whose personnel string has 1 RB, 1 TE, and 3 WR",
);

export const nflPersonnel12Signal = personnelSignal(
  "nfl_personnel_12",
  "NFL 12 Personnel Share, 2025",
  (home, away) => home.personnel12 - away.personnel12,
  "share of plays whose personnel string has 1 RB, 2 TE, and 2 WR",
);

export const PERSONNEL_SIGNALS: readonly SignalDefinition[] = [nflPersonnel11Signal, nflPersonnel12Signal];
