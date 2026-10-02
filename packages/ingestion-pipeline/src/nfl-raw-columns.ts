/**
 * Raw 2025 columns the index votes hide.
 * Component trust is lower than the index so the same file is not counted twice at full weight.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_2025_RAW, type RawPrior } from "./priors/nfl-2025-raw.js";

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

function pair(homeTeam: unknown, awayTeam: unknown): { home: RawPrior; away: RawPrior } | null {
  const home = NFL_2025_RAW[nflTeamAbbr(teamLabel(homeTeam)) ?? ""];
  const away = NFL_2025_RAW[nflTeamAbbr(teamLabel(awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function rawSignal(
  id: string,
  label: string,
  read: (home: RawPrior, away: RawPrior) => number,
  note: string,
): SignalDefinition {
  return {
    id,
    label,
    category: "TEAM_RATES",
    family: "EFFICIENCY",
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-trenches",
    dataDependencies: ["gse_competitive_intel_fantasyguru_2025"],
    activationStatus: "ACTIVE",
    trustWeight: 0.04,
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
      const value = Number(read(sides.home, sides.away).toFixed(4));
      if (!Number.isFinite(value)) return null;
      return { value, capturedAt: "2025", metadata: { source: note, season: 2025, componentOfIndex: true } };
    },
  };
}

export const RAW_COLUMN_SIGNALS: readonly SignalDefinition[] = [
  rawSignal(
    "nfl_pressure_pct",
    "NFL Pressure Percent Allowed, 2025",
    (home, away) => (away.pressurePct - home.pressurePct) / 10,
    "pressure percent, visitor minus home, divided by 10. Positive means the home line was pressured less",
  ),
  rawSignal(
    "nfl_sack_rate_allowed",
    "NFL Sack Rate Allowed, 2025",
    (home, away) => (away.sackRate - home.sackRate) * 100,
    "sack rate as percentage points, visitor minus home. Positive means the home line allowed fewer sacks",
  ),
  rawSignal(
    "nfl_pocket_time",
    "NFL Pocket Time, 2025",
    (home, away) => home.pocketTime - away.pocketTime,
    "seconds, home minus away. Higher pocket time is better protection",
  ),
  rawSignal(
    "nfl_yards_before_contact",
    "NFL Yards Before Contact, 2025",
    (home, away) => home.yardsBeforeContact - away.yardsBeforeContact,
    "yards per rush before contact, home minus away",
  ),
  rawSignal(
    "nfl_pace_form_delta",
    "NFL Pace Form Delta, 2025 last four weeks",
    (home, away) => (home.paceDelta - away.paceDelta) / 10,
    "plays per game, last four weeks minus the season, home minus away, divided by 10. Not 2026 pace",
  ),
  rawSignal(
    "nfl_yds_per_target_allowed",
    "NFL Yards per Target Allowed, 2025",
    (home, away) => away.ydsPerTargetAllowed - home.ydsPerTargetAllowed,
    "visitor minus home. Positive means the home coverage allowed fewer yards per target",
  ),
];
