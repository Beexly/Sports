/**
 * 2026 weeks 1-3 rates for the week-4 slate. Not the 2025 prior.
 * A side under 60 scrimmage plays abstains. That is the early-down
 * sample floor already in the bridge. Other weeks abstain.
 */
import type { SignalDefinition } from "@sports/types";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { MIN_EARLY_DOWN_PLAYS } from "./signals-bridge.js";
import { NFL_2026_W4_ENTERING, type EnteringRates } from "./priors/nfl-2026-w4-entering.js";

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

function sides(ctx: { homeTeam: unknown; awayTeam: unknown; commenceTime?: Date; sportKey?: string }): { home: EnteringRates; away: EnteringRates } | null {
  if (ctx.sportKey !== "americanfootball_nfl" || !(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const homeAbbr = nflTeamAbbr(teamLabel(ctx.homeTeam));
  const awayAbbr = nflTeamAbbr(teamLabel(ctx.awayTeam));
  if (homeAbbr == null || awayAbbr == null) return null;
  const home = NFL_2026_W4_ENTERING[homeAbbr];
  const away = NFL_2026_W4_ENTERING[awayAbbr];
  if (home == null || away == null) return null;
  if (home.scrimmagePlays < MIN_EARLY_DOWN_PLAYS || away.scrimmagePlays < MIN_EARLY_DOWN_PLAYS) return null;
  return { home, away };
}

function measured(
  id: string,
  label: string,
  read: (home: EnteringRates, away: EnteringRates) => number,
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
      const value = Number(read(pair.home, pair.away).toFixed(4));
      if (!Number.isFinite(value)) return null;
      return {
        value,
        capturedAt: "2026-10-01",
        metadata: { season: 2026, countedThroughWeek: 3, source: note },
      };
    },
  };
}

export const nflEnteringPassRateSignal = measured(
  "nfl_entering_pass_rate",
  "NFL Pass Rate, 2026 weeks 1-3",
  (home, away) => home.passRate - away.passRate,
  "pass plays over pass plus run, home minus away, not the 2025 prior",
);

export const nflEnteringEarlyDownPassSignal = measured(
  "nfl_entering_early_down_pass_rate",
  "NFL Early-Down Pass Rate, 2026 weeks 1-3",
  (home, away) => home.earlyDownPassRate - away.earlyDownPassRate,
  "downs 1 and 2 only, home minus away, not all-downs and not pass-rate-over-expected",
);

export const nflEnteringOffenseEpaSignal = measured(
  "nfl_entering_offense_epa",
  "NFL Offensive EPA per play, 2026 weeks 1-3",
  (home, away) => home.offEpa - away.offEpa,
  "mean nflverse epa on scrimmage plays, home minus away, not the 2025 prior",
);

export const nflEnteringPaceSignal = measured(
  "nfl_entering_pace",
  "NFL Pace, plays per game, 2026 weeks 1-3",
  (home, away) => (home.playsPerGame - away.playsPerGame) / 10,
  "scrimmage plays per game, home minus away, divided by 10, three games not seventeen",
);

export const nflEnteringShotgunSignal = measured(
  "nfl_entering_shotgun",
  "NFL Shotgun Rate, 2026 weeks 1-3",
  (home, away) => home.shotgun - away.shotgun,
  "shotgun flag mean on scrimmage plays, same definition as the 2025 scheme script, not that season",
);

export const nflEnteringNoHuddleSignal = measured(
  "nfl_entering_no_huddle",
  "NFL No-Huddle Rate, 2026 weeks 1-3",
  (home, away) => home.noHuddle - away.noHuddle,
  "no_huddle flag mean on scrimmage plays, same definition as the 2025 scheme script",
);

export const nflEnteringProeSignal = measured(
  "nfl_entering_proe",
  "NFL Pass Rate Over Expected, 2026 weeks 1-3",
  (home, away) => (home.proePp - away.proePp) / 100,
  "mean pass_oe in percentage points, divided by 100, same scale as the 2025 PROE vote",
);

export const nflEnteringNeutralPassSignal = measured(
  "nfl_entering_neutral_pass",
  "NFL Neutral-Situation Pass Rate, 2026 weeks 1-3",
  (home, away) => home.neutralPass - away.neutralPass,
  "downs 1-2 with win probability between 0.20 and 0.80, same definition as the 2025 scheme script",
);

export const nflEnteringRzPassSignal = measured(
  "nfl_entering_rz_pass",
  "NFL Red-Zone Pass Rate, 2026 weeks 1-3",
  (home, away) => home.rzPass - away.rzPass,
  "pass rate inside the opponent 20, same definition as the 2025 scheme script, three-game sample",
);

export const nflEnteringBellcowSignal = measured(
  "nfl_entering_rb_bellcow",
  "NFL RB Bellcow Share, 2026 weeks 1-3",
  (home, away) => home.rbBellcow - away.rbBellcow,
  "top rusher share of team rushes on the play file, not the 2025 stats_reg column",
);

export const nflEnteringWrFunnelSignal = measured(
  "nfl_entering_wr_funnel",
  "NFL WR1 Target Funnel, 2026 weeks 1-3",
  (home, away) => home.wrFunnel - away.wrFunnel,
  "top pass-catcher share of team targets on the play file, not the 2025 stats_reg column",
);

export const ENTERING_RATE_SIGNALS: readonly SignalDefinition[] = [
  nflEnteringPassRateSignal,
  nflEnteringEarlyDownPassSignal,
  nflEnteringOffenseEpaSignal,
  nflEnteringPaceSignal,
  nflEnteringShotgunSignal,
  nflEnteringNoHuddleSignal,
  nflEnteringProeSignal,
  nflEnteringNeutralPassSignal,
  nflEnteringRzPassSignal,
  nflEnteringBellcowSignal,
  nflEnteringWrFunnelSignal,
];
