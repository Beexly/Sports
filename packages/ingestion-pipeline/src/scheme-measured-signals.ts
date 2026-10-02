/**
 * Votes from columns already on the 2025 scheme prior. Each is a home-minus-away
 * differential. A missing club abstains. None of these call a kernel whose
 * inputs they do not have.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_SCHEME_PRIOR, NFL_SCHEME_PRIOR_SEASON, type NflSchemePrior } from "./priors/nfl-2025-scheme.js";

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

function pair(homeTeam: unknown, awayTeam: unknown): { home: NflSchemePrior; away: NflSchemePrior; homeAbbr: string; awayAbbr: string } | null {
  const homeAbbr = nflTeamAbbr(teamLabel(homeTeam));
  const awayAbbr = nflTeamAbbr(teamLabel(awayTeam));
  if (homeAbbr == null || awayAbbr == null) return null;
  const home = NFL_SCHEME_PRIOR[homeAbbr];
  const away = NFL_SCHEME_PRIOR[awayAbbr];
  if (home == null || away == null) return null;
  return { home, away, homeAbbr, awayAbbr };
}

function measured(
  id: string,
  label: string,
  family: "SITUATIONAL" | "EFFICIENCY",
  weight: number,
  read: (home: NflSchemePrior, away: NflSchemePrior) => number,
  note: string,
): SignalDefinition {
  return {
    id,
    label,
    category: "TEAM_RATES",
    family,
    outputKind: "CONTINUOUS_VALUE",
    validSports: ["americanfootball_nfl"],
    owner: "quant-scheme",
    dataDependencies: ["nflverse_2025_scheme_prior"],
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
      return {
        value,
        capturedAt: ctx.now().toISOString(),
        metadata: {
          season: NFL_SCHEME_PRIOR_SEASON,
          source: note,
          homeAbbr: sides.homeAbbr,
          awayAbbr: sides.awayAbbr,
        },
      };
    },
  };
}

export const nflRedzonePassTendencySignal = measured(
  "nfl_redzone_pass_tendency",
  "NFL Red-Zone Pass Rate, prior season",
  "SITUATIONAL",
  0.08,
  (home, away) => home.rzPass - away.rzPass,
  "nflverse 2025 pass rate inside the opponent 20, home minus away",
);

export const nflWrTargetFunnelSignal = measured(
  "nfl_wr_target_funnel",
  "NFL WR1 Target Funnel, prior season",
  "SITUATIONAL",
  0.07,
  (home, away) => home.wrFunnel - away.wrFunnel,
  "nflverse 2025 top pass-catcher target share, home minus away",
);

export const nflPacePlaysSignal = measured(
  "nfl_pace_plays_per_game",
  "NFL Pace, plays per game, prior season",
  "SITUATIONAL",
  0.08,
  (home, away) => (home.playsPg - away.playsPg) / 10,
  "nflverse 2025 scrimmage plays per game, home minus away, divided by 10 so a 10-play gap is one unit",
);

export const nflPassDefensePriorSignal = measured(
  "nfl_pass_defense_prior",
  "NFL Pass Defense Rank, prior season",
  "EFFICIENCY",
  0.09,
  (home, away) => (away.passDefenseRank - home.passDefenseRank) / 31,
  "rank 1 is the lowest pass EPA allowed. Positive means the home defense ranked better than the visitor",
);

export const nflPriorOffenseEpaSignal = measured(
  "nfl_prior_offense_epa",
  "NFL Offensive EPA per play, prior season",
  "EFFICIENCY",
  0.08,
  (home, away) => home.offEpa - away.offEpa,
  "nflverse 2025 EPA per scrimmage play, home minus away. A prior, not the live EPA blend",
);

export const nflPriorPassRateSignal = measured(
  "nfl_prior_pass_rate",
  "NFL Pass Rate, prior season",
  "EFFICIENCY",
  0.08,
  (home, away) => home.passRate - away.passRate,
  "nflverse 2025 pass plays over pass plus run, home minus away, not the 2026 weeks 1-3 rate",
);

export const nflShotgunRateSignal = measured(
  "nfl_shotgun_rate",
  "NFL Shotgun Rate, prior season",
  "SITUATIONAL",
  0.06,
  (home, away) => home.shotgun - away.shotgun,
  "nflverse 2025 shotgun share, home minus away",
);

export const nflNoHuddleRateSignal = measured(
  "nfl_no_huddle_rate",
  "NFL No-Huddle Rate, prior season",
  "SITUATIONAL",
  0.05,
  (home, away) => home.noHuddle - away.noHuddle,
  "nflverse 2025 no-huddle share, home minus away",
);

export const nflRbBellcowSignal = measured(
  "nfl_rb_bellcow",
  "NFL RB Bellcow Share, prior season",
  "EFFICIENCY",
  0.06,
  (home, away) => home.rbBellcow - away.rbBellcow,
  "nflverse 2025 top running back share of team rushes, home minus away",
);

export const SCHEME_MEASURED_SIGNALS: readonly SignalDefinition[] = [
  nflRedzonePassTendencySignal,
  nflWrTargetFunnelSignal,
  nflPacePlaysSignal,
  nflPassDefensePriorSignal,
  nflPriorOffenseEpaSignal,
  nflPriorPassRateSignal,
  nflShotgunRateSignal,
  nflNoHuddleRateSignal,
  nflRbBellcowSignal,
];
