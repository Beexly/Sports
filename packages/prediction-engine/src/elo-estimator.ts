/**
 * Elo independent estimator — a structured, market-INDEPENDENT estimate of P(home
 * wins) from team ratings (it never looks at the sportsbook line). It becomes
 * another "referee" in the edge engine's independentFairValues: the engine only
 * surfaces a pick when independent estimators diverge from the book AND agree with
 * each other, so each extra honest estimator hardens the signal.
 *
 * Pure, no I/O. Ratings storage/seeding and wiring into the scorer are separate,
 * founder-gated steps. Reference: 538-style Elo (cf. WagerBrain).
 */
import type { IndependentMarketFairValue } from "@sports/types";

export interface EloOptions {
  /** Home-field advantage in rating points added to the home side. Default 65. */
  readonly homeAdvantage?: number;
  /** Logistic scale (the Elo divisor). Default 400. */
  readonly scale?: number;
}

/** P(home wins) under the logistic Elo model, in (0, 1). */
export function eloWinProbability(homeRating: number, awayRating: number, options: EloOptions = {}): number {
  const homeAdvantage = options.homeAdvantage ?? 65;
  const scale = options.scale ?? 400;
  const diff = homeRating - awayRating + homeAdvantage;
  return 1 / (1 + Math.pow(10, -diff / scale));
}

export interface EloUpdate {
  readonly home: number;
  readonly away: number;
}

/** Zero-sum rating update after a settled game (home delta = −away delta). */
export function updateEloRatings(
  homeRating: number,
  awayRating: number,
  homeWon: boolean,
  k = 20,
  options: EloOptions = {},
): EloUpdate {
  const expectedHome = eloWinProbability(homeRating, awayRating, options);
  const delta = k * ((homeWon ? 1 : 0) - expectedHome);
  return { home: round2(homeRating + delta), away: round2(awayRating - delta) };
}

/** Bridge an Elo estimate into the engine's independent fair-value shape. */
export function toEloFairValue(
  homeRating: number,
  awayRating: number,
  options: EloOptions & { readonly now?: () => Date } = {},
): IndependentMarketFairValue {
  const homeFairProb = eloWinProbability(homeRating, awayRating, options);
  const now = (options.now ?? (() => new Date()))();
  return {
    source: "elo",
    homeFairProb: round4(homeFairProb),
    awayFairProb: round4(1 - homeFairProb),
    capturedAt: now.toISOString(),
  };
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
