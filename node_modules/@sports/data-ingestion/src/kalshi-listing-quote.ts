/**
 * Kalshi listing two-way — take the machina sports-skills shape, refuse their q.
 *
 * SKILL.md (machina-sports/sports-skills kalshi v0.2.0, MIT):
 *   "A last_price of 20 means 20% implied probability"
 *   "Sort by last_price descending" for futures
 *   "get_market_candlesticks … Present OHLC with volume"
 *   search results include yes_bid, no_bid (often no yes_ask)
 *
 * Prices on the public listing are 0–100 integers (20 = 20¢). That scale is
 * real. Treating last_price or a candlestick close as q is not — it is a
 * trade print. GSE q is a two-way midpoint. Series tickers from this skill
 * are already in kalshi-series.ts; this module does not duplicate them.
 *
 * Unique closed-form lift: YES ask = 1 − NO bid when yes_ask is missing,
 * same complement the orderbook path uses. Cents → unit. last / candle
 * close always refuse.
 *
 * Public GET. Informational q only. No execution, no sportsbook scrape.
 */

export const KALSHI_LISTING_METHOD_TAG = "kalshi_listing_two_way_v1" as const;

export const DEFAULT_LISTING_MAX_SPREAD = 0.1;

export type ListingRefuse =
  | "missing_two_way"
  | "inverted_book"
  | "wide_spread"
  | "out_of_range"
  | "last_trade_only"
  | "not_live";

export type ListingSource = "yes_bid_ask" | "yes_bid_no_bid_complement";

export interface ListingQuote {
  readonly usable: boolean;
  readonly q: number | null;
  readonly bid: number | null;
  readonly ask: number | null;
  readonly spread: number | null;
  readonly refuse: ListingRefuse | null;
  readonly source: ListingSource | null;
  readonly methodTag: typeof KALSHI_LISTING_METHOD_TAG;
}

const LIVE = new Set(["open", "active"]);

function finiteUnit(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x < 1;
}

/**
 * Kalshi listing price → unit interval. Integers/cents 1–100 become /100.
 * "20" and 20 → 0.20. "0.20" and 0.20 stay. Null if not finite.
 */
export function kalshiPriceToUnit(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  return n;
}

/** YES ask from the NO bid. Same identity as the Kalshi orderbook path. */
export function yesAskFromNoBid(noBidUnit: number): number {
  return 1 - noBidUnit;
}

function refuse(why: ListingRefuse, extra: Partial<ListingQuote> = {}): ListingQuote {
  return {
    usable: false,
    q: null,
    bid: extra.bid ?? null,
    ask: extra.ask ?? null,
    spread: extra.spread ?? null,
    refuse: why,
    source: null,
    methodTag: KALSHI_LISTING_METHOD_TAG,
  };
}

/**
 * Two-way q from a listing row. Prefers yes_bid+yes_ask; else yes_bid+no_bid
 * complement. Never last_price. If status is present and not open/active, refuse.
 */
export function gateKalshiListing(
  fields: {
    readonly yesBid?: number | string | null;
    readonly yesAsk?: number | string | null;
    readonly noBid?: number | string | null;
    readonly last?: number | string | null;
    readonly status?: string | null;
    readonly maxSpread?: number;
  },
): ListingQuote {
  const maxSpread = fields.maxSpread ?? DEFAULT_LISTING_MAX_SPREAD;
  if (!Number.isFinite(maxSpread) || maxSpread <= 0 || maxSpread >= 1) {
    throw new RangeError(`gateKalshiListing: maxSpread must be in (0, 1) (got ${maxSpread})`);
  }
  if (fields.status != null && fields.status !== "") {
    if (!LIVE.has(fields.status.toLowerCase())) return refuse("not_live");
  }

  const yesBid = kalshiPriceToUnit(fields.yesBid);
  let yesAsk = kalshiPriceToUnit(fields.yesAsk);
  const noBid = kalshiPriceToUnit(fields.noBid);
  let source: ListingSource | null = null;

  if (yesBid != null && finiteUnit(yesBid) && yesAsk != null && finiteUnit(yesAsk)) {
    source = "yes_bid_ask";
  } else if (yesBid != null && finiteUnit(yesBid) && noBid != null && finiteUnit(noBid)) {
    yesAsk = yesAskFromNoBid(noBid);
    source = "yes_bid_no_bid_complement";
  } else {
    // last_price / candle close are on the row for discovery — never q.
    const last = kalshiPriceToUnit(fields.last);
    if (last != null && Number.isFinite(last)) return refuse("last_trade_only");
    return refuse("missing_two_way");
  }

  if (!finiteUnit(yesBid!) || !finiteUnit(yesAsk!)) return refuse("out_of_range", { bid: yesBid, ask: yesAsk });
  if (yesAsk! < yesBid!) {
    return refuse("inverted_book", { bid: yesBid, ask: yesAsk, spread: yesAsk! - yesBid! });
  }
  const spread = yesAsk! - yesBid!;
  if (spread > maxSpread) return refuse("wide_spread", { bid: yesBid, ask: yesAsk, spread });
  const mid = (yesBid! + yesAsk!) / 2;
  if (!finiteUnit(mid)) return refuse("out_of_range", { bid: yesBid, ask: yesAsk, spread });
  return {
    usable: true,
    q: mid,
    bid: yesBid,
    ask: yesAsk,
    spread,
    refuse: null,
    source,
    methodTag: KALSHI_LISTING_METHOD_TAG,
  };
}

/** Candlestick close / trades tape — always unusable as q. */
export function gateKalshiLastOrCandle(_last: number | string | null | undefined): ListingQuote {
  return refuse("last_trade_only");
}
