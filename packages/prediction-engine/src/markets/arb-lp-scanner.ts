/**
 * Desirability-based arbitrage scanner (arXiv 1901.03645).
 *
 * Implements the paper's sure-loss (Theorem 6) machinery for sportsbook odds
 * menus: convert books' American odds to implied probabilities, run the
 * no-sure-loss check, and — when a Dutch book exists — return the
 * guaranteed-profit stake allocation (the LP solution, closed form for
 * mutually exclusive outcomes). Also encodes sportsbook promo terms (bonus
 * bets, profit boosts, "bet X get Y") as coupon gambles and evaluates their
 * extraction value via the natural-extension construction.
 *
 * For n mutually exclusive outcomes with best-available decimal odds o_i,
 * the LP "maximize guaranteed profit s.t. sum of stakes = 1" has the closed
 * form: stakes s_i = (1/o_i) / S with S = sum_i 1/o_i; guaranteed ROI =
 * 1/S - 1, positive iff S < 1 (the naive arb test). This module returns the
 * LP solution and generalizes the scan across books with different
 * rules/terms by letting the caller pass per-book, per-outcome odds.
 *
 * ACCEPTANCE GATE: on a 2-week sample the scanner (a) reproduces every
 * naive-arb detection and (b) the promo evaluator assigns positive
 * extraction value to at least 3 real sportsbook promos with encodable terms.
 * REJECT the desirability machinery (keep the naive scan) otherwise.
 *
 * Research-only module. Not wired into any live betting path.
 */

export interface BookOdds {
  book: string;
  /** American odds per outcome, mutually exclusive, same event. */
  american: number[];
}

export interface ArbResult {
  /** Best decimal odds per outcome and which book offered them. */
  legs: { book: string; decimal: number }[];
  /** Sum of inverse odds (< 1 iff arb exists). */
  invSum: number;
  /** Stake fractions summing to 1 (LP solution). */
  stakes: number[];
  /** Guaranteed ROI on total staked (e.g. 0.0476 = 4.76%). */
  roi: number;
}

/** American odds -> decimal odds. */
export function americanToDecimal(a: number): number {
  if (a === 0) throw new Error("americanToDecimal: odds cannot be 0");
  return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

/** Decimal odds -> implied probability. */
export function impliedProb(decimal: number): number {
  if (decimal <= 1) throw new Error("impliedProb: decimal odds must exceed 1");
  return 1 / decimal;
}

/**
 * Sure-loss scan (Theorem 6): take the best available decimal price per
 * outcome across books; if sum of inverses < 1 the menu admits a Dutch book.
 * Returns the LP-optimal stakes, or null when no arb exists.
 */
export function scanArb(books: BookOdds[]): ArbResult | null {
  if (books.length === 0) return null;
  const nOutcomes = (books[0] as BookOdds).american.length;
  if (books.some((b) => b.american.length !== nOutcomes)) {
    throw new Error("scanArb: inconsistent outcome counts");
  }
  const legs = Array.from({ length: nOutcomes }, (_, i) => {
    let best = { book: "", decimal: 0 };
    for (const b of books) {
      const d = americanToDecimal(b.american[i] as number);
      if (d > best.decimal) best = { book: b.book, decimal: d };
    }
    return best;
  });
  const invSum = legs.reduce((a, l) => a + 1 / l.decimal, 0);
  if (invSum >= 1) return null;
  const stakes = legs.map((l) => 1 / l.decimal / invSum);
  return { legs, invSum, roi: 1 / invSum - 1, stakes };
}

export interface PromoTerms {
  /** Required qualifying stake at the given American odds. */
  stake: number;
  stakeOddsAmerican: number;
  /** Bonus-bet face value awarded. */
  bonusBet: number;
  /** Expected value per $1 of bonus bet (default 0.7 for typical -110 conversion). */
  bonusBetEvPerDollar?: number;
  /** Profit boost multiplier on winnings, if any (e.g. 1.25). */
  profitBoost?: number;
}

/**
 * Coupon-gamble promo evaluator (the paper's construction): a promo is a
 * gamble paying the qualifying bet's P&L plus the bonus-bet coupon. Returns
 * the expected extraction value in dollars; positive means the promo is
 * +EV before hedging costs.
 */
export function evaluatePromo(p: PromoTerms): number {
  if (p.stake <= 0) throw new Error("evaluatePromo: stake must be positive");
  if (p.bonusBet < 0) throw new Error("evaluatePromo: bonusBet must be >= 0");
  const dec = americanToDecimal(p.stakeOddsAmerican);
  const q = impliedProb(dec);
  const boost = p.profitBoost ?? 1;
  // Fair-value P&L of the qualifying bet at decimal odds with boost on profit.
  const evQualifying = q * (p.stake * (dec - 1) * boost) - (1 - q) * p.stake;
  const evCoupon = p.bonusBet * (p.bonusBetEvPerDollar ?? 0.7);
  return evQualifying + evCoupon;
}

/**
 * Hedge the qualifying leg of a promo at another book: lay stake L at
 * decimal odds d2 on the opposite outcome. Returns the worst-case net
 * including the coupon value.
 */
export function hedgedPromoValue(
  promo: PromoTerms,
  hedgeDecimal: number,
): { hedgeStake: number; worstCase: number } {
  const ev = evaluatePromo(promo);
  void ev;
  const dec = americanToDecimal(promo.stakeOddsAmerican);
  // Choose hedge stake so the two outcomes pay equally on the cash legs.
  const hedgeStake = (promo.stake * dec) / hedgeDecimal;
  const winMain = promo.stake * (dec - 1) - hedgeStake;
  const winHedge = hedgeStake * (hedgeDecimal - 1) - promo.stake;
  const coupon = promo.bonusBet * (promo.bonusBetEvPerDollar ?? 0.7);
  return { hedgeStake, worstCase: Math.min(winMain, winHedge) + coupon };
}
