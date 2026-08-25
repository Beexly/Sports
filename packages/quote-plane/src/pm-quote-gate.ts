/**
 * Prediction-market quote gate — informational q only.
 *
 * Corpus (DanMcInerney/kalshi-analysis, Stokastic Kalshi-to-projections):
 * a YES price is a probability only after you take the bid/ask **midpoint**,
 * refuse one-sided and last-trade quotes, and refuse a book whose spread is
 * wider than a sports-liquid board. Kalshi sports mids are close to efficient
 * (~2% after friction); entertainment/mention boards are not. Feeding a last
 * trade or a bid-only as `q` invents edge against the independent model.
 *
 * Mirrors props-priced-edge: fail closed without a two-way finite quote.
 *
 * Not a trading bot. No size, no order, no sportsbook scrape. PM `q` stays
 * labeled `prediction_market` and must not be blended unlabeled with book q.
 */

export const PM_MID_METHOD_TAG = "prediction_market_mid_v2";
export const PM_MID_MODEL_VERSION = "quote.pm-gate.v2";

/** Default max YES spread. 10¢ is wider than a liquid Kalshi sports board
 * and still kills mention/entertainment books (DanMcInerney). */
export const DEFAULT_MAX_SPREAD = 0.1;

export type PmQuoteRefuse =
  | "missing_two_way"
  | "inverted_book"
  | "wide_spread"
  | "out_of_range"
  | "last_trade_only";

export interface PmTwoWayQuote {
  /** Best YES bid in (0, 1). */
  readonly bid: number;
  /** Best YES ask in (0, 1). */
  readonly ask: number;
}

export interface GatedPmProb {
  readonly usable: boolean;
  readonly q: number | null;
  readonly mid: number | null;
  readonly spread: number | null;
  readonly refuse: PmQuoteRefuse | null;
  readonly methodTag: typeof PM_MID_METHOD_TAG;
}

function finiteUnit(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x < 1;
}

/**
 * Two-way midpoint, or unusable. Never last-trade, never bid-only, never
 * ask-only. Spread = ask − bid.
 */
export function gatePmTwoWay(
  quote: { readonly bid: number | null; readonly ask: number | null },
  opts: { readonly maxSpread?: number } = {},
): GatedPmProb {
  const maxSpread = opts.maxSpread ?? DEFAULT_MAX_SPREAD;
  const tag = PM_MID_METHOD_TAG;
  const refuse = (why: PmQuoteRefuse): GatedPmProb => ({
    usable: false,
    q: null,
    mid: null,
    spread:
      quote.bid != null && quote.ask != null && Number.isFinite(quote.bid) && Number.isFinite(quote.ask)
        ? quote.ask - quote.bid
        : null,
    refuse: why,
    methodTag: tag,
  });

  if (!Number.isFinite(maxSpread) || maxSpread <= 0 || maxSpread >= 1) {
    throw new RangeError(`gatePmTwoWay: maxSpread must be in (0, 1) (got ${maxSpread})`);
  }
  if (quote.bid == null || quote.ask == null) return refuse("missing_two_way");
  if (!finiteUnit(quote.bid) || !finiteUnit(quote.ask)) return refuse("out_of_range");
  if (quote.ask < quote.bid) return refuse("inverted_book");
  const spread = quote.ask - quote.bid;
  if (spread > maxSpread) return refuse("wide_spread");
  const mid = (quote.bid + quote.ask) / 2;
  if (!finiteUnit(mid)) return refuse("out_of_range");
  return { usable: true, q: mid, mid, spread, refuse: null, methodTag: tag };
}

/**
 * Gamma/index `outcomePrices` and last-trade prints are not a two-way book.
 * Always unusable as priced q — discovery only until a CLOB/orderbook exists.
 */
/**
 * N-way board (Stokastic): champion/award fields. Raw mids overround;
 * p_i = m_i / Σ m_j. Returns null if any mid is unusable or the sum is 0.
 */
export function normalizePmBoard(mids: readonly number[]): number[] | null {
  if (mids.length < 2) return null;
  const xs: number[] = [];
  let sum = 0;
  for (const m of mids) {
    if (!finiteUnit(m)) return null;
    xs.push(m);
    sum += m;
  }
  if (!(sum > 0)) return null;
  return xs.map((m) => m / sum);
}

export function gateLastTradeOnly(_last: number): GatedPmProb {
  return {
    usable: false,
    q: null,
    mid: null,
    spread: null,
    refuse: "last_trade_only",
    methodTag: PM_MID_METHOD_TAG,
  };
}
