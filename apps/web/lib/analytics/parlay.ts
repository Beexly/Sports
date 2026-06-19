/**
 * Parlay probability math — pure, zero dependencies.
 *
 * Computes parlay payout odds and win probability from constituent legs.
 * Used for display/analysis only — not a recommendation tool.
 *
 * The parlay "bonus" (vs. single bets) is the bookmaker's margin expanding
 * exponentially with legs; this is documented honestly.
 */

export interface ParlayLeg {
  /** American odds for this leg */
  readonly americanOdds: number;
  /** Your estimated true win probability (0–1) if known */
  readonly trueProbability?: number;
}

export interface ParlayResult {
  /** Number of legs */
  readonly legs: number;
  /** Combined decimal odds (product of individual decimal odds) */
  readonly combinedDecimalOdds: number;
  /** American odds equivalent of the combined payout */
  readonly combinedAmericanOdds: number;
  /** Implied win probability from the combined payout (market implied) */
  readonly impliedWinProb: number;
  /** Your estimated true win probability (product of trueProbabilities, if all provided) */
  readonly estimatedTrueProb: number | null;
  /** Expected value given your true probabilities (null if not all provided) */
  readonly expectedValue: number | null;
  /** The "parlay tax": how much margin the book takes vs. single bets */
  readonly parlayTaxPct: number | null;
}

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  if (american < 0) return 100 / Math.abs(american) + 1;
  return 2; // EV
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * Compute parlay stats from a list of legs.
 */
export function computeParlay(legs: readonly ParlayLeg[]): ParlayResult {
  if (legs.length === 0) {
    return {
      legs: 0,
      combinedDecimalOdds: 1,
      combinedAmericanOdds: 0,
      impliedWinProb: 1,
      estimatedTrueProb: 1,
      expectedValue: null,
      parlayTaxPct: null,
    };
  }

  const combinedDecimalOdds = legs.reduce(
    (acc, leg) => acc * americanToDecimal(leg.americanOdds),
    1,
  );

  const combinedAmericanOdds = decimalToAmerican(combinedDecimalOdds);
  const impliedWinProb = 1 / combinedDecimalOdds;

  const allHaveTrue = legs.every((l) => l.trueProbability !== undefined);
  const estimatedTrueProb = allHaveTrue
    ? legs.reduce((acc, leg) => acc * (leg.trueProbability ?? 0), 1)
    : null;

  const expectedValue =
    estimatedTrueProb !== null
      ? estimatedTrueProb * (combinedDecimalOdds - 1) - (1 - estimatedTrueProb)
      : null;

  // Parlay tax: how much of the expected return the book keeps
  // For a fair parlay, EV should be 0; parlayTax is the negative EV expressed as %
  const parlayTaxPct =
    estimatedTrueProb !== null ? -expectedValue! * 100 : null;

  return {
    legs: legs.length,
    combinedDecimalOdds,
    combinedAmericanOdds,
    impliedWinProb,
    estimatedTrueProb,
    expectedValue,
    parlayTaxPct,
  };
}

/**
 * Compute the "fair" parlay odds (no vig) given true probabilities.
 * This is what the parlay would pay in an honest market.
 */
export function fairParlayOdds(trueProbabilities: readonly number[]): {
  fairDecimalOdds: number;
  fairAmericanOdds: number;
  fairWinProb: number;
} {
  const fairWinProb = trueProbabilities.reduce((acc, p) => acc * p, 1);
  const fairDecimalOdds = 1 / fairWinProb;
  return {
    fairDecimalOdds,
    fairAmericanOdds: decimalToAmerican(fairDecimalOdds),
    fairWinProb,
  };
}

/**
 * Build parlay legs from American odds array (without true probabilities).
 * Useful for quick payout calculations.
 */
export function parlayFromOdds(oddsArray: readonly number[]): ParlayResult {
  return computeParlay(oddsArray.map((o) => ({ americanOdds: o })));
}

/**
 * Quick helper: payout on a $1 parlay bet.
 * Returns net profit (stake not included).
 */
export function parlayNetProfit(oddsArray: readonly number[], stake = 1): number {
  const { combinedDecimalOdds } = parlayFromOdds(oddsArray);
  return (combinedDecimalOdds - 1) * stake;
}
