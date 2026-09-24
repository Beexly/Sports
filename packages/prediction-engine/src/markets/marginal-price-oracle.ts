/**
 * Marginal-price oracle on multi-book quotes (arXiv 2307.08768).
 *
 * Engine-honesty infrastructure: fit a logarithmic-utility AMM curve
 * through each book's bid/ask (moneyline) quotes; the oracle's mid
 * marginal price becomes a synthetic consensus; flag books whose
 * quotes deviate from the oracle by more than the paper's implied fee
 * band (~1%) as candidate mispricings for manual review — plus a
 * liquidity diagnostic: invert the framework to back out the implied
 * LP fee gamma* each book is effectively charging from observed
 * cross-book spreads, tracking gamma* over the week as a
 * market-tightness index (falling gamma* into the weekend = sharpening
 * market).
 *
 * ACCEPTANCE GATE: ADAPT iff the oracle-mid predicts the direction of
 * subsequent book-specific line moves at >= 58% on the 4-week sample
 * (paired test vs 50%, p < 0.05); REJECT the oracle as a mispricing
 * detector if the hit rate is within noise of 50%.
 *
 * Research-only module. Not wired into any live market path.
 */

export interface BookQuote {
  book: string;
  /**
   * Decimal odds, home side. bid = lay odds (book buys the home
   * contract from you), ask = back odds (book sells it to you).
   * Normal market: bid > ask > 1 (higher odds = lower price, so in
   * price space 0 < 1/bid < 1/ask < 1).
   */
  bid: number;
  ask: number;
}

function devig(bid: number, ask: number): number {
  if (ask <= 1 || bid <= ask) throw new Error("devig: need bid > ask > 1");
  const pBid = 1 / bid;
  const pAsk = 1 / ask;
  // Logarithmic-score de-vigging (equal overround split).
  return (pBid + pAsk) / 2;
}

/**
 * Logarithmic-utility marginal price curve: p(q) = 1/(1+exp(-q/b)).
 * Fit the liquidity parameter b from the observed bid/ask at a
 * reference size s (quotes are for the marginal unit around 0).
 */
export function fitLiquidity(bid: number, ask: number, size = 1): { b: number; mid: number } {
  const mid = devig(bid, ask);
  // Ask = p(+s/2), bid = p(-s/2): invert the logistic curve for b.
  const pAsk = 1 / ask;
  const pBid = 1 / bid;
  // Invert: b = s / (2 * (logit(pAsk) - logit(mid))).
  const logit = (p: number): number => Math.log(p / (1 - p));
  const denom = 2 * (logit(pAsk) - logit(mid));
  if (denom <= 1e-9) throw new Error("fitLiquidity: degenerate quotes");
  return { b: size / denom, mid };
}

/** Marginal price at inventory q under the fitted curve. */
export function marginalPrice(b: number, mid: number, q: number): number {
  if (b <= 0) throw new Error("marginalPrice: b > 0");
  const logitMid = Math.log(mid / (1 - mid));
  return 1 / (1 + Math.exp(-(logitMid + q / b)));
}

/**
 * Oracle consensus: median of book mids (robust synthetic consensus).
 */
export function oracleMid(quotes: readonly BookQuote[]): number {
  if (quotes.length === 0) throw new Error("oracleMid: no quotes");
  const mids = quotes.map((q) => devig(q.bid, q.ask)).sort((a, b) => a - b);
  const m = mids.length >> 1;
  return mids.length % 2 === 1
    ? (mids[m] as number)
    : ((mids[m - 1] as number) + (mids[m] as number)) / 2;
}

export interface MispricingFlag {
  book: string;
  deviation: number; // |book mid - oracle| / oracle
  flagged: boolean;
}

/**
 * Flag books deviating from the oracle by more than the fee band
 * (~1%) as candidate mispricings for manual review.
 */
export function flagMispricings(
  quotes: readonly BookQuote[],
  feeBand = 0.01,
): MispricingFlag[] {
  const oracle = oracleMid(quotes);
  return quotes.map((q) => {
    const mid = devig(q.bid, q.ask);
    const deviation = Math.abs(mid - oracle) / oracle;
    return { book: q.book, deviation, flagged: deviation > feeBand };
  });
}

/**
 * Implied LP fee gamma*: the effective proportional fee each book
 * charges, backed out from the observed spread: gamma* = 1 - mid/ask
 * (ask side), averaged with the bid side 1 - bid/mid... in price
 * space: gamma* = (ask - bid) / (ask + bid) at the margin.
 */
export function impliedFeeGamma(quote: BookQuote): number {
  if (quote.ask <= 1 || quote.bid <= quote.ask) {
    throw new Error("impliedFeeGamma: need bid > ask > 1");
  }
  const pBid = 1 / quote.bid;
  const pAsk = 1 / quote.ask;
  return (pAsk - pBid) / (pAsk + pBid);
}

/**
 * Market-tightness index: median gamma* across books; falling into
 * the weekend = sharpening market.
 */
export function tightnessIndex(quotes: readonly BookQuote[]): number {
  if (quotes.length === 0) throw new Error("tightnessIndex: no quotes");
  const gammas = quotes.map(impliedFeeGamma).sort((a, b) => a - b);
  const m = gammas.length >> 1;
  return gammas.length % 2 === 1
    ? (gammas[m] as number)
    : ((gammas[m - 1] as number) + (gammas[m] as number)) / 2;
}
