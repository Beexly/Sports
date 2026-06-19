/**
 * Kelly criterion and devigging utilities — pure math, no side effects.
 * Attribution: Kelly (1956) "A New Interpretation of Information Rate"
 */

/** Convert American odds to decimal (European) odds */
export function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

/** Convert decimal odds to implied probability (with vig) */
export function decimalToImplied(decimal: number): number {
  if (decimal <= 0) return 0;
  return 1 / decimal;
}

/**
 * Full Kelly fraction — the theoretically optimal bet size as a fraction of bankroll.
 * @param p Estimated win probability (0–1)
 * @param b Net decimal odds (decimal odds - 1, i.e. profit per unit wagered)
 * @returns Kelly fraction (0 = no bet; negative clamped to 0)
 */
export function kellyFraction(p: number, b: number): number {
  if (b <= 0 || p <= 0 || p >= 1) return 0;
  return Math.max(0, (b * p - (1 - p)) / b);
}

/**
 * Fractional Kelly — scales the full Kelly by a multiplier for risk management.
 * Half-Kelly (fraction=0.5) is the common practitioner default.
 */
export function fractionalKelly(p: number, b: number, fraction = 0.5): number {
  return kellyFraction(p, b) * Math.max(0, Math.min(1, fraction));
}

/**
 * Kelly fraction from American odds and estimated probability.
 */
export function kellyFromAmerican(p: number, american: number): number {
  const decimal = americanToDecimal(american);
  const b = decimal - 1;
  return kellyFraction(p, b);
}

/**
 * Remove the vig from a two-way market using the basic normalization method.
 * Returns [true_prob_side1, true_prob_side2].
 * For sharp Pinnacle-style devigging, see packages/prediction-engine/src/shin-devig.ts.
 */
export function basicDevig(price1: number, price2: number): [number, number] {
  const imp1 = decimalToImplied(americanToDecimal(price1));
  const imp2 = decimalToImplied(americanToDecimal(price2));
  const total = imp1 + imp2;
  if (total <= 0) return [0.5, 0.5];
  return [imp1 / total, imp2 / total];
}

/**
 * Expected value of a bet as a fraction of the wager.
 * Positive EV = +edge; negative = favoring the house.
 */
export function expectedValue(p: number, american: number): number {
  const decimal = americanToDecimal(american);
  const b = decimal - 1;
  return p * b - (1 - p);
}

/**
 * Break-even probability for a given price (the implied probability with no edge).
 */
export function breakEvenProb(american: number): number {
  return decimalToImplied(americanToDecimal(american));
}
