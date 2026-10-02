/**
 * 2025 intel-file differentials. Not 2026. Not PBWR.
 * Index points are divided by 10 because the source built them as 50 + 10z.
 * Coverage rating and PROE delta are divided so a raw 100 does not become the vote.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_2025_INTEL, type IntelPrior } from "./priors/nfl-2025-intel.js";

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

function pair(homeTeam: unknown, awayTeam: unknown): { home: IntelPrior; away: IntelPrior } | null {
  const home = NFL_2025_INTEL[nflTeamAbbr(teamLabel(homeTeam)) ?? ""];
  const away = NFL_2025_INTEL[nflTeamAbbr(teamLabel(awayTeam)) ?? ""];
  if (home == null || away == null) return null;
  return { home, away };
}

function intelSignal(
  id: string,
  label: string,
  weight: number,
  read: (home: IntelPrior, away: IntelPrior) => number,
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
    trustWeight: weight,
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
      return { value, capturedAt: "2025", metadata: { source: note, season: 2025 } };
    },
  };
}

export const nflOlVsDlSignal = intelSignal(
  "nfl_ol_vs_dl",
  "NFL Home Protection vs Visitor Rush, 2025",
  0.07,
  (home, away) => (home.olIdx - away.dlIdx) / 10,
  "OL_idx minus the visitor DL_idx, divided by 10. Higher OL_idx is better protection. Not a pass-block win rate",
);

export const nflDlVsOlSignal = intelSignal(
  "nfl_dl_vs_ol",
  "NFL Home Rush vs Visitor Protection, 2025",
  0.07,
  (home, away) => (home.dlIdx - away.olIdx) / 10,
  "DL_idx minus the visitor OL_idx, divided by 10. Higher DL_idx is a better pass rush",
);

export const nflCoverageRatingAllowedSignal = intelSignal(
  "nfl_coverage_rating_allowed",
  "NFL Coverage Rating Allowed, 2025",
  0.07,
  (home, away) => (away.covRatAllowed - home.covRatAllowed) / 10,
  "passer rating allowed, visitor minus home, divided by 10. Positive means the home coverage allowed the lower rating",
);

export const nflProeFormDeltaSignal = intelSignal(
  "nfl_proe_form_delta",
  "NFL PROE Form Delta, 2025 last four weeks",
  0.06,
  (home, away) => (home.proeDeltaPp - away.proeDeltaPp) / 100,
  "last four 2025 weeks minus the 2025 season, home minus away, divided by 100. Not 2026 form",
);

export const INTEL_PRIOR_SIGNALS: readonly SignalDefinition[] = [
  nflOlVsDlSignal,
  nflDlVsOlSignal,
  nflCoverageRatingAllowedSignal,
  nflProeFormDeltaSignal,
];
