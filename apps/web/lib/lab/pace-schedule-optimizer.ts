/**
 * Galaxy Lab — Pace & Schedule advantage optimizer engine.
 *
 * Wires the previously-dormant pure sports + math libraries
 * (`@/lib/sports/schedule-utils`, `@/lib/sports/pace-analytics`,
 * `@/lib/math/probability-distributions`, `@/lib/math/statistics`) into a
 * validated, user-driven tool. This is an INTERACTIVE MODEL EXPLORER: the user
 * supplies a matchup's rest situation (days rest, back-to-back flags) and an
 * optional tempo estimate, and we turn the real schedule/rest analytics into an
 * expected scoring-margin shift with a confidence interval.
 *
 * Honesty / responsible-gaming posture: every output is an educational
 * simulation of the user's OWN inputs — it is NOT a published pick, a
 * prediction, or a guarantee. Real injury/availability data is NOT included.
 * The disclaimer travels with the result. Pure compute, deterministic, no DB,
 * no secrets, no network, no side effects.
 */

import {
  analyzeRest,
  type ScheduledGame,
  type RestAnalysis,
} from "@/lib/sports/schedule-utils";
import {
  paceClassification,
  type Sport,
} from "@/lib/sports/pace-analytics";
import {
  normalCdf,
  normalQuantile,
} from "@/lib/math/probability-distributions";
import { mean } from "@/lib/math/statistics";

// ── Public types ─────────────────────────────────────────────────────────────

/** Leagues this tool understands. Mirrors the `Sport` union in pace-analytics. */
export type LeagueCode = Sport;

export interface PaceScheduleInput {
  /** League context (drives pace tiers and a per-league rest weight). */
  league: LeagueCode;
  homeName: string;
  awayName: string;
  /** Whole days of rest for the home side before this game (0–14). */
  homeDaysRest: number;
  awayDaysRest: number;
  /** Home side is playing the second leg of a back-to-back. */
  homeBackToBack: boolean;
  awayBackToBack: boolean;
  /**
   * Optional possessions-per-game tempo estimate for the home side. When both
   * sides supply one we add a tempo-mismatch note; otherwise the league pace
   * profile is left unclassified for that side.
   */
  homeTempo: number | null;
  awayTempo: number | null;
}

export interface RestFrame {
  daysRest: number;
  backToBack: boolean;
  /** Real `RestAnalysis` derived from a synthetic two-game schedule. */
  analysis: RestAnalysis;
  /** Tempo classification, or null when no tempo was supplied. */
  paceTier: "slow" | "moderate" | "fast" | "very-fast" | null;
}

export interface PaceScheduleOutput {
  league: LeagueCode;
  homeName: string;
  awayName: string;
  home: RestFrame;
  away: RestFrame;
  /** Home days rest minus away days rest (positive favors home). */
  restEdgeDays: number;
  /**
   * Expected scoring-margin shift (home − away) attributable to the rest/pace
   * picture you entered, in points. Positive favors home. This is the shift
   * from these factors alone, NOT a full game projection.
   */
  expectedMarginShift: number;
  /** 80% confidence interval around the expected margin shift, in points. */
  marginShiftInterval: [number, number];
  /**
   * Probability the home side carries the rest/pace edge, derived from the
   * margin-shift distribution. A directional read on your inputs, not a price.
   */
  homeAdvantageProbability: number;
  /** Plain-language read of which side the schedule favors. */
  leans: "home" | "away" | "neutral";
  /** Short factor notes explaining the components (back-to-back, long rest…). */
  notes: string[];
  disclaimer: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const PACE_MIN_REST = 0;
export const PACE_MAX_REST = 14;
export const PACE_MIN_TEMPO = 40;
export const PACE_MAX_TEMPO = 130;

/**
 * Points of margin per extra day of rest, by league. Modest, evidence-shaped
 * priors — NFL rest swings are larger per day than a dense NBA/NHL slate.
 */
const REST_POINTS_PER_DAY: Record<LeagueCode, number> = {
  NFL: 0.6,
  NBA: 0.35,
  NCAAB: 0.3,
  NHL: 0.2,
};

/** Extra margin penalty for being on the back-leg of a back-to-back, by league. */
const BACK_TO_BACK_PENALTY: Record<LeagueCode, number> = {
  NFL: 2.5,
  NBA: 1.6,
  NCAAB: 1.2,
  NHL: 1.0,
};

/**
 * Standard deviation (points) of the margin-shift estimate, by league. Used for
 * the confidence interval and the directional probability. Higher-variance
 * leagues get a wider band so the confidence is honestly humbler.
 */
const MARGIN_SHIFT_SIGMA: Record<LeagueCode, number> = {
  NFL: 3.0,
  NBA: 2.5,
  NCAAB: 2.8,
  NHL: 2.2,
};

const MS_PER_DAY = 86_400_000;

export const PACE_SCHEDULE_DISCLAIMER =
  "Educational simulation of the rest and tempo inputs you entered — a model " +
  "exploration tool, not a published pick, prediction, or guarantee. It " +
  "isolates the schedule/rest signal only and does NOT include real injury, " +
  "availability, weather, or roster data. Gambling involves risk — never wager " +
  "more than you can afford to lose. (1-800-GAMBLER)";

const VALID_LEAGUES: readonly LeagueCode[] = ["NFL", "NBA", "NCAAB", "NHL"];

// ── Validation helpers ───────────────────────────────────────────────────────

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const v = source[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = source[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim().slice(0, 48);
  return fallback;
}

function readBool(source: Record<string, unknown>, key: string): boolean {
  const v = source[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return false;
}

function readLeague(source: Record<string, unknown>): LeagueCode | null {
  const v = source["league"];
  if (typeof v !== "string") return null;
  const upper = v.trim().toUpperCase();
  return VALID_LEAGUES.find((l) => l === upper) ?? null;
}

/** Round to a sensible number of decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Validate and normalize an untrusted request body into a PaceScheduleInput.
 * Returns `{ error }` on a fatal validation problem.
 */
export function validatePaceScheduleInput(
  raw: unknown,
): PaceScheduleInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const league = readLeague(src);
  if (league === null) {
    return {
      error: "league is required and must be one of NFL, NBA, NCAAB, NHL.",
    };
  }

  const homeDaysRest = readNumber(src, "homeDaysRest");
  const awayDaysRest = readNumber(src, "awayDaysRest");
  if (homeDaysRest === null || awayDaysRest === null) {
    return {
      error:
        "homeDaysRest and awayDaysRest are required numbers (whole days of rest).",
    };
  }

  const homeTempoRaw = readNumber(src, "homeTempo");
  const awayTempoRaw = readNumber(src, "awayTempo");

  const homeB2B = readBool(src, "homeBackToBack");
  const awayB2B = readBool(src, "awayBackToBack");

  // A back-to-back is, by definition, one day of rest. Honor an explicit flag
  // by collapsing rest to a single day so the two inputs never contradict.
  const homeRest = homeB2B
    ? 1
    : Math.round(clampNumber(homeDaysRest, PACE_MIN_REST, PACE_MAX_REST));
  const awayRest = awayB2B
    ? 1
    : Math.round(clampNumber(awayDaysRest, PACE_MIN_REST, PACE_MAX_REST));

  return {
    league,
    homeName: readString(src, "homeName", "Home"),
    awayName: readString(src, "awayName", "Away"),
    homeDaysRest: homeRest,
    awayDaysRest: awayRest,
    homeBackToBack: homeB2B,
    awayBackToBack: awayB2B,
    homeTempo:
      homeTempoRaw === null
        ? null
        : clampNumber(homeTempoRaw, PACE_MIN_TEMPO, PACE_MAX_TEMPO),
    awayTempo:
      awayTempoRaw === null
        ? null
        : clampNumber(awayTempoRaw, PACE_MIN_TEMPO, PACE_MAX_TEMPO),
  };
}

// ── Engine internals ─────────────────────────────────────────────────────────

/**
 * Build a synthetic two-game schedule for one team — a prior game `daysRest`
 * days before a target game — so we can feed the real `analyzeRest` schedule
 * analytics rather than re-deriving rest logic here. The target game sits at a
 * fixed epoch (the analysis is relative, so the absolute date is irrelevant and
 * keeps the function deterministic).
 */
const TARGET_DATE = 1_700_000_000_000; // fixed epoch — deterministic.

function buildRestAnalysis(daysRest: number, isHome: boolean): RestAnalysis {
  const priorGame: ScheduledGame = {
    gameId: "prior",
    date: TARGET_DATE - daysRest * MS_PER_DAY,
    isHome: !isHome,
    opponent: "prior-opp",
  };
  const targetGame: ScheduledGame = {
    gameId: "target",
    date: TARGET_DATE,
    isHome,
    opponent: "target-opp",
  };
  return analyzeRest([priorGame, targetGame], TARGET_DATE);
}

function classifyTempo(
  tempo: number | null,
  league: LeagueCode,
): "slow" | "moderate" | "fast" | "very-fast" | null {
  if (tempo === null) return null;
  return paceClassification(tempo, league);
}

function buildFrame(
  daysRest: number,
  backToBack: boolean,
  tempo: number | null,
  league: LeagueCode,
  isHome: boolean,
): RestFrame {
  return {
    daysRest,
    backToBack,
    analysis: buildRestAnalysis(daysRest, isHome),
    paceTier: classifyTempo(tempo, league),
  };
}

/**
 * Per-side margin contribution (points) from the rest picture. Built from the
 * real `RestAnalysis` flags so the schedule lib genuinely drives the number.
 */
function restContribution(
  frame: RestFrame,
  league: LeagueCode,
): number {
  const a = frame.analysis;
  const restDays = a.daysSinceLastGame ?? frame.daysRest;
  // Baseline: points scaled off rest above the league's "normal" cadence.
  // NFL normal ≈ 7 days; the dense leagues ≈ 2 days.
  const normalRest = league === "NFL" ? 7 : 2;
  const components: number[] = [
    (restDays - normalRest) * REST_POINTS_PER_DAY[league],
  ];
  if (frame.backToBack) components.push(-BACK_TO_BACK_PENALTY[league]);
  if (a.isShortWeek && league === "NFL") {
    components.push(-REST_POINTS_PER_DAY[league] * 2);
  }
  if (a.isLongRest || a.hasByeWeekPrior) {
    components.push(REST_POINTS_PER_DAY[league]);
  }
  // `mean` from the statistics lib aggregates the component contributions.
  return mean(components) ?? 0;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/** Run the pace/schedule optimization and assemble an honest, complete result. */
export function runPaceScheduleOptimization(
  input: PaceScheduleInput,
): PaceScheduleOutput {
  const home = buildFrame(
    input.homeDaysRest,
    input.homeBackToBack,
    input.homeTempo,
    input.league,
    true,
  );
  const away = buildFrame(
    input.awayDaysRest,
    input.awayBackToBack,
    input.awayTempo,
    input.league,
    false,
  );

  const homeContribution = restContribution(home, input.league);
  const awayContribution = restContribution(away, input.league);
  const expectedMarginShift = homeContribution - awayContribution;

  const sigma = MARGIN_SHIFT_SIGMA[input.league];
  // 80% interval => z at the 0.90 quantile of the standard normal.
  const z = normalQuantile(0.9);
  const marginShiftInterval: [number, number] = [
    round(expectedMarginShift - z * sigma, 2),
    round(expectedMarginShift + z * sigma, 2),
  ];

  // P(margin shift > 0) under N(expectedMarginShift, sigma) = home carries edge.
  const homeAdvantageProbability = round(
    1 - normalCdf(0, expectedMarginShift, sigma),
    4,
  );

  const restEdgeDays = input.homeDaysRest - input.awayDaysRest;

  let leans: "home" | "away" | "neutral";
  if (expectedMarginShift > 0.25) leans = "home";
  else if (expectedMarginShift < -0.25) leans = "away";
  else leans = "neutral";

  const notes = buildNotes(input, home, away, expectedMarginShift);

  return {
    league: input.league,
    homeName: input.homeName,
    awayName: input.awayName,
    home,
    away,
    restEdgeDays,
    expectedMarginShift: round(expectedMarginShift, 2),
    marginShiftInterval,
    homeAdvantageProbability,
    leans,
    notes,
    disclaimer: PACE_SCHEDULE_DISCLAIMER,
  };
}

function buildNotes(
  input: PaceScheduleInput,
  home: RestFrame,
  away: RestFrame,
  expectedMarginShift: number,
): string[] {
  const notes: string[] = [];

  if (input.homeBackToBack && input.awayBackToBack) {
    notes.push("Both sides on the second leg of a back-to-back — rest is a wash.");
  } else if (input.homeBackToBack) {
    notes.push(`${input.homeName} is on a back-to-back; ${input.awayName} is not.`);
  } else if (input.awayBackToBack) {
    notes.push(`${input.awayName} is on a back-to-back; ${input.homeName} is not.`);
  }

  if (home.analysis.isLongRest) {
    notes.push(`${input.homeName} is on long rest (${home.daysRest} days).`);
  }
  if (away.analysis.isLongRest) {
    notes.push(`${input.awayName} is on long rest (${away.daysRest} days).`);
  }
  if (home.analysis.hasByeWeekPrior) {
    notes.push(`${input.homeName} looks to have extra rest from a prior gap.`);
  }
  if (away.analysis.hasByeWeekPrior) {
    notes.push(`${input.awayName} looks to have extra rest from a prior gap.`);
  }

  if (home.paceTier !== null && away.paceTier !== null) {
    if (home.paceTier === away.paceTier) {
      notes.push(`Tempo match: both project ${home.paceTier}.`);
    } else {
      notes.push(
        `Tempo mismatch: ${input.homeName} ${home.paceTier} vs. ${input.awayName} ${away.paceTier}.`,
      );
    }
  }

  if (Math.abs(expectedMarginShift) <= 0.25) {
    notes.push("Schedule factors roughly cancel — no meaningful rest edge.");
  }

  return notes;
}
