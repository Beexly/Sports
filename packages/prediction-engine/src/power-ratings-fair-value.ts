/**
 * External team power ratings → independent ML fair value.
 *
 * Two rating scales already present in the research corpus and in the
 * rights-cleared TeamRankings client, neither previously wired into the
 * independent blend:
 *
 *  1) Points-vs-average (composite power ratings, TeamRankings rating, FPI-like).
 *     margin = homeRating − awayRating + HFA; logistic residual scale.
 *  2) Win% vs a league-average team on a neutral field (market-implied tiers).
 *     logit difference + HFA (same family as standings-strength).
 *
 * Pure math. Never invents ratings. Null when either side is missing or
 * non-finite. Source label is caller-supplied so each corpus keeps its own
 * provenance string ("research_power_ratings", "teamrankings", …).
 *
 * Model-fair only — never a book line.
 */

import type { IndependentMarketFairValue } from "@sports/types";
import { powerIndexToWinProbs } from "./espn-powerindex.js";
import { standingsWinPctToWinProbs } from "./standings-strength.js";

const EPS = 1e-6;

function clipProb(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

export type PowerRatingsMarginInput = {
  /** Expected points vs league average (positive = better than average). */
  readonly homeRating: number;
  readonly awayRating: number;
  readonly sportKey: string;
  /** Points. Default from sport table (NFL 2.0). */
  readonly homeFieldAdvantage?: number;
  /** Points residual scale. Default from sport table (NFL 13.5). */
  readonly marginScale?: number;
  /** Provenance label for IndependentMarketFairValue.source. Required. */
  readonly source: string;
};

export type WinPctVsAverageInput = {
  /** P(beat league-average team on neutral field), (0, 1). */
  readonly homeWinPctVsAvg: number;
  readonly awayWinPctVsAvg: number;
  /** Default 0.18 (≈ +4.5% for equal teams). */
  readonly hfaLogit?: number;
  readonly source: string;
};

/**
 * Points-vs-average ratings → home/away win probs via logistic margin.
 * Returns null on non-finite ratings or unsupported sport.
 */
export function powerRatingsToWinProbs(
  input: PowerRatingsMarginInput,
): { readonly pHome: number; readonly pAway: number; readonly margin: number } | null {
  if (!Number.isFinite(input.homeRating) || !Number.isFinite(input.awayRating)) {
    return null;
  }
  const r = powerIndexToWinProbs({
    homeFpi: input.homeRating,
    awayFpi: input.awayRating,
    sportKey: input.sportKey,
    homeFieldAdvantage: input.homeFieldAdvantage,
    marginScale: input.marginScale,
  });
  if (!r) return null;
  return { pHome: clipProb(r.pHome), pAway: clipProb(r.pAway), margin: r.margin };
}

export function powerRatingsToIndependentFairValue(
  input: PowerRatingsMarginInput,
  options?: { readonly now?: () => Date },
): IndependentMarketFairValue | null {
  const r = powerRatingsToWinProbs(input);
  if (!r) return null;
  return {
    source: input.source,
    homeFairProb: r.pHome,
    awayFairProb: r.pAway,
    capturedAt: (options?.now ?? (() => new Date()))().toISOString(),
  };
}

/**
 * Win% vs a common baseline (league-average opponent) → home/away via logit
 * difference. minGames is forced to 0: these tables carry no games-played
 * column and the strength parameter is already a rate against average.
 */
export function winPctVsAverageToWinProbs(
  input: WinPctVsAverageInput,
): { readonly pHome: number; readonly pAway: number; readonly marginLogit: number } | null {
  const r = standingsWinPctToWinProbs({
    homeWinPct: input.homeWinPctVsAvg,
    awayWinPct: input.awayWinPctVsAvg,
    minGames: 0,
    hfaLogit: input.hfaLogit,
  });
  if (!r) return null;
  return {
    pHome: clipProb(r.pHome),
    pAway: clipProb(r.pAway),
    marginLogit: r.marginLogit,
  };
}

export function winPctVsAverageToIndependentFairValue(
  input: WinPctVsAverageInput,
  options?: { readonly now?: () => Date },
): IndependentMarketFairValue | null {
  const r = winPctVsAverageToWinProbs(input);
  if (!r) return null;
  return {
    source: input.source,
    homeFairProb: r.pHome,
    awayFairProb: r.pAway,
    capturedAt: (options?.now ?? (() => new Date()))().toISOString(),
  };
}
