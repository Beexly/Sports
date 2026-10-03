/**
 * ESPN PowerIndex → independent win probability (logistic conversion).
 *
 * FPI / BPI-style power index is expected point margin vs average opponent.
 * Convert home−away differential (+ HFA) to P(home wins) via logistic:
 *
 *   m = FPI_home − FPI_away + HFA
 *   p_home = sigmoid(m / s)   // s = residual margin scale (points)
 *
 * Pure, null-safe, never fabricates FPI. Source label for independents:
 * "espn_powerindex" — model-fair only, NEVER a book line.
 *
 * Apply OFF as book label; feed independentFairValues only.
 */

import type { IndependentMarketFairValue } from "@sports/types";

const EPS = 1e-6;

/** Sport keys that have a meaningful PowerIndex / FPI scale. */
export type PowerIndexSport =
  | "americanfootball_nfl"
  | "americanfootball_ncaaf"
  | "basketball_nba"
  | "basketball_ncaab";

/** Residual margin scale s (points) for logistic. Larger s → flatter probs. */
export const POWERINDEX_MARGIN_SCALE: Readonly<Record<PowerIndexSport, number>> = {
  americanfootball_nfl: 13.5,
  americanfootball_ncaaf: 14.5,
  basketball_nba: 11.0,
  basketball_ncaab: 11.5,
};

/** Home field advantage in power-index points (same units as FPI). */
export const POWERINDEX_HFA: Readonly<Record<PowerIndexSport, number>> = {
  americanfootball_nfl: 2.0,
  americanfootball_ncaaf: 2.5,
  basketball_nba: 2.5,
  basketball_ncaab: 3.0,
};

const SPORT_ALIASES: Readonly<Record<string, PowerIndexSport>> = {
  americanfootball_nfl: "americanfootball_nfl",
  nfl: "americanfootball_nfl",
  americanfootball_ncaaf: "americanfootball_ncaaf",
  ncaaf: "americanfootball_ncaaf",
  college_football: "americanfootball_ncaaf",
  basketball_nba: "basketball_nba",
  nba: "basketball_nba",
  basketball_ncaab: "basketball_ncaab",
  ncaab: "basketball_ncaab",
  mens_college_basketball: "basketball_ncaab",
};

export function resolvePowerIndexSport(sportKey: string): PowerIndexSport | null {
  const k = sportKey.trim().toLowerCase();
  return SPORT_ALIASES[k] ?? null;
}

export function sigmoidMargin(m: number, scale: number): number {
  const s = scale > 0 ? scale : 13.5;
  // Numerically stable sigmoid(m/s)
  const z = m / s;
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function clipProb(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

export type PowerIndexLogisticInput = {
  readonly homeFpi: number;
  readonly awayFpi: number;
  readonly sportKey: string;
  /** Override HFA (points); default from sport table. */
  readonly homeFieldAdvantage?: number;
  /** Override residual scale s; default from sport table. */
  readonly marginScale?: number;
};

export type PowerIndexLogisticResult = {
  readonly margin: number;
  readonly pHome: number;
  readonly pAway: number;
  readonly scale: number;
  readonly hfa: number;
  readonly sport: PowerIndexSport;
};

/**
 * Convert FPI differential to home/away win probabilities.
 * Returns null when sport unsupported or FPI non-finite.
 */
export function powerIndexToWinProbs(
  input: PowerIndexLogisticInput,
): PowerIndexLogisticResult | null {
  const sport = resolvePowerIndexSport(input.sportKey);
  if (!sport) return null;
  if (!Number.isFinite(input.homeFpi) || !Number.isFinite(input.awayFpi)) {
    return null;
  }
  const hfa =
    input.homeFieldAdvantage != null && Number.isFinite(input.homeFieldAdvantage)
      ? input.homeFieldAdvantage
      : POWERINDEX_HFA[sport];
  const scale =
    input.marginScale != null && Number.isFinite(input.marginScale) && input.marginScale > 0
      ? input.marginScale
      : POWERINDEX_MARGIN_SCALE[sport];
  const margin = input.homeFpi - input.awayFpi + hfa;
  const pHome = clipProb(sigmoidMargin(margin, scale));
  const pAway = clipProb(1 - pHome);
  return { margin, pHome, pAway, scale, hfa, sport };
}

/**
 * Wrap PowerIndex logistic into IndependentMarketFairValue for the edge engine.
 * source = "espn_powerindex". Null when conversion fails.
 */
export function powerIndexToIndependentFairValue(
  input: PowerIndexLogisticInput,
  options?: { readonly now?: () => Date },
): IndependentMarketFairValue | null {
  const r = powerIndexToWinProbs(input);
  if (!r) return null;
  return {
    source: "espn_powerindex",
    homeFairProb: r.pHome,
    awayFairProb: r.pAway,
    capturedAt: (options?.now ?? (() => new Date()))().toISOString(),
  };
}
