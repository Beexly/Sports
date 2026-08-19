/**
 * Opponent-adjusted EPA/play overall → independent NFL ML fair value.
 *
 * overall = adjOff − adjDef (from opponentAdjustedRatings / TeamGameEfficiency).
 * Logistic margin conversion mirrors FPI path but in EPA units:
 *
 *   m = overall_home − overall_away + HFA
 *   p_home = sigmoid(m / scale)
 *
 * Defaults: HFA ≈ 0.025 EPA/play, scale ≈ 0.12 (typical season spread of overall).
 * Never invents ratings — null when either side missing or non-finite.
 * Source: "nfl_epa_adj"
 */

import type { IndependentMarketFairValue } from "@sports/types";
import { sigmoidMargin } from "./espn-powerindex.js";

const EPS = 1e-6;

function clipProb(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

/** Default residual scale (EPA/play) for logistic. */
export const NFL_EPA_MARGIN_SCALE = 0.12;
/** Default home-field advantage in EPA/play units. */
export const NFL_EPA_HFA = 0.025;
/** Minimum games of efficiency history per team before we opine. */
export const NFL_EPA_MIN_GAMES = 4;

export type NflEpaFairValueInput = {
  readonly homeOverall: number;
  readonly awayOverall: number;
  readonly homeGames?: number;
  readonly awayGames?: number;
  readonly homeFieldAdvantage?: number;
  readonly marginScale?: number;
  readonly minGames?: number;
};

export function nflEpaToWinProbs(
  input: NflEpaFairValueInput,
): { readonly pHome: number; readonly pAway: number; readonly margin: number } | null {
  if (!Number.isFinite(input.homeOverall) || !Number.isFinite(input.awayOverall)) {
    return null;
  }
  const minG = input.minGames ?? NFL_EPA_MIN_GAMES;
  if (
    (input.homeGames != null && input.homeGames < minG) ||
    (input.awayGames != null && input.awayGames < minG)
  ) {
    return null;
  }
  const hfa =
    input.homeFieldAdvantage != null && Number.isFinite(input.homeFieldAdvantage)
      ? input.homeFieldAdvantage
      : NFL_EPA_HFA;
  const scale =
    input.marginScale != null &&
    Number.isFinite(input.marginScale) &&
    input.marginScale > 0
      ? input.marginScale
      : NFL_EPA_MARGIN_SCALE;
  const margin = input.homeOverall - input.awayOverall + hfa;
  const pHome = clipProb(sigmoidMargin(margin, scale));
  return { pHome, pAway: clipProb(1 - pHome), margin };
}

export function nflEpaToIndependentFairValue(
  input: NflEpaFairValueInput,
  options?: { readonly now?: () => Date },
): IndependentMarketFairValue | null {
  const r = nflEpaToWinProbs(input);
  if (!r) return null;
  return {
    source: "nfl_epa_adj",
    homeFairProb: r.pHome,
    awayFairProb: r.pAway,
    capturedAt: (options?.now ?? (() => new Date()))().toISOString(),
  };
}
