/**
 * Vendored Polymarket SDKs.
 *
 * The MIT trees live in packages/polymarket-sdks. They are in the engine so
 * a caller can import the official client instead of a one-off fetch.
 *
 * Publish stays closed. source-router.ts marks polymarket-gamma cleared:false
 * until counsel approves storage and commercial display. This module does
 * not flip that flag and does not place orders.
 */

export const VENDORED_POLYMARKET_SDKS = [
  "ts-sdk",
  "py-sdk",
  "lattice-std",
  "py-clob-client-v2",
  "polymarket-us-python",
  "polymarket-us-typescript",
  "real-time-data-client",
  "clob-client-v2",
  "rs-clob-client-v2",
] as const;

export const POLYMARKET_PUBLISH_HOLD =
  "polymarket-gamma is cleared:false. Storage and commercial display stay off until a counsel-approved registry entry.";

export function polymarketPublishAllowed(): false {
  return false;
}

/* ------------------------------------------------------------------ *
 * Stream 14B — internal Polymarket CLOB microstructure and lead-lag.
 * These functions are research/measurement only; publishAllowed stays
 * false and no order is placed. Book inputs are supplied by the caller.
 * ------------------------------------------------------------------ */

export interface BookLevel {
  price: number;
  size: number;
}

export interface ClobMicroPriceInput {
  bids: readonly BookLevel[];
  asks: readonly BookLevel[];
}

export interface ClobMicroPriceResult {
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  microPrice: number | null;
  spread: number | null;
  depthImbalance: number | null;
  bidDepth: number;
  askDepth: number;
}

/**
 * Microprice = (bestBid * askSize + bestAsk * bidSize) / (bidSize + askSize).
 * The size-weighted price leans toward the side with less resting size,
 * which is the standard CLOB microprice. Empty books return nulls rather
 * than a fabricated mid.
 */
export function computeClobMicroPrice(input: ClobMicroPriceInput): ClobMicroPriceResult {
  const bids = [...input.bids].filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size) && l.size > 0);
  const asks = [...input.asks].filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size) && l.size > 0);
  if (bids.some((l) => l.price <= 0 || l.price >= 1) || asks.some((l) => l.price <= 0 || l.price >= 1)) {
    throw new Error("Polymarket prices must be strictly between 0 and 1");
  }
  const bestBid = bids.length === 0 ? null : Math.max(...bids.map((l) => l.price));
  const bestAsk = asks.length === 0 ? null : Math.min(...asks.map((l) => l.price));
  const bidDepth = bids.reduce((s, l) => s + l.size, 0);
  const askDepth = asks.reduce((s, l) => s + l.size, 0);
  if (bestBid === null || bestAsk === null) {
    return {
      bestBid,
      bestAsk,
      mid: null,
      microPrice: null,
      spread: null,
      depthImbalance: null,
      bidDepth,
      askDepth,
    };
  }
  if (bestBid >= bestAsk) throw new Error("crossed book: best bid must be below best ask");
  const bidSize = bids.filter((l) => l.price === bestBid).reduce((s, l) => s + l.size, 0);
  const askSize = asks.filter((l) => l.price === bestAsk).reduce((s, l) => s + l.size, 0);
  const microPrice = (bestBid * askSize + bestAsk * bidSize) / (bidSize + askSize);
  return {
    bestBid,
    bestAsk,
    mid: (bestBid + bestAsk) / 2,
    microPrice,
    spread: bestAsk - bestBid,
    depthImbalance: (bidDepth - askDepth) / (bidDepth + askDepth),
    bidDepth,
    askDepth,
  };
}

export interface LeadLagInput {
  /** Driver series, e.g. the CLOB microprice returns. */
  driver: readonly number[];
  /** Follower series, e.g. the prop or sportsbook price returns. */
  follower: readonly number[];
  /** Maximum lag in observations to test. */
  maxLag?: number;
  /** Histogram bins for discretization. */
  bins?: number;
}

export interface LeadLagResult {
  transferEntropyByLag: number[];
  bestLag: number;
  bestTransferEntropy: number;
  /** Net direction: positive means driver leads follower. */
  netInformationFlow: number;
  samples: number;
  bins: number;
}

function discretize(series: readonly number[], bins: number): number[] {
  if (series.length === 0) return [];
  const min = Math.min(...series);
  const max = Math.max(...series);
  if (max === min) return series.map(() => 0);
  const width = (max - min) / bins;
  return series.map((v) => Math.min(bins - 1, Math.floor((v - min) / width)));
}

function transferEntropy(source: readonly number[], target: readonly number[], lag: number, bins: number): number {
  const n = Math.min(source.length, target.length) - lag;
  if (n <= 2) return 0;
  const s = discretize(source, bins);
  const t = discretize(target, bins);
  const triple = new Map<string, number>();
  const pairTY = new Map<string, number>();
  const pairTYX = new Map<string, number>();
  const pairYX = new Map<string, number>();
  for (let i = 0; i + lag < Math.min(s.length, t.length); i += 1) {
    const yNext = t[i + lag]!;
    const yNow = t[i]!;
    const xNow = s[i]!;
    const k3 = `${yNext}|${yNow}|${xNow}`;
    const k2 = `${yNext}|${yNow}`;
    triple.set(k3, (triple.get(k3) ?? 0) + 1);
    pairTY.set(k2, (pairTY.get(k2) ?? 0) + 1);
    pairTYX.set(`${yNow}|${xNow}`, (pairTYX.get(`${yNow}|${xNow}`) ?? 0) + 1);
    pairYX.set(`${yNow}`, (pairYX.get(`${yNow}`) ?? 0) + 1);
  }
  let te = 0;
  const total = n;
  for (const [key, count] of triple) {
    const [yNext, yNow, xNow] = key.split("|") as [string, string, string];
    const p3 = count / total;
    const pTY = (pairTY.get(`${yNext}|${yNow}`) ?? 0) / total;
    const pTYX = (pairTYX.get(`${yNow}|${xNow}`) ?? 0) / total;
    const pY = (pairYX.get(yNow) ?? 0) / total;
    if (p3 <= 0 || pTY <= 0 || pTYX <= 0 || pY <= 0) continue;
    te += p3 * Math.log((p3 * pY) / (pTY * pTYX));
  }
  return Math.max(0, te);
}

/**
 * Transfer entropy TE(driver -> follower) for lags 1..maxLag on discretized
 * returns. TE is asymmetric by construction; the reverse direction is
 * computed over the same lag grid and the difference is returned as net
 * information flow. No p-value is claimed: this is a descriptive estimator,
 * not a significance test.
 */
export function fitLeadLagTransferEntropy(input: LeadLagInput): LeadLagResult {
  const { driver, follower, maxLag = 5, bins = 5 } = input;
  if (driver.length !== follower.length) throw new Error("driver and follower series must be equal length");
  if (driver.length < maxLag + 3) throw new Error("series too short for the requested maxLag");
  if (!Number.isInteger(maxLag) || maxLag < 1) throw new Error("maxLag must be a positive integer");
  if (!Number.isInteger(bins) || bins < 2) throw new Error("bins must be an integer >= 2");
  if (driver.some((v) => !Number.isFinite(v)) || follower.some((v) => !Number.isFinite(v))) {
    throw new Error("lead-lag series must be finite");
  }
  const forward: number[] = [];
  const reverse: number[] = [];
  for (let lag = 1; lag <= maxLag; lag += 1) {
    forward.push(transferEntropy(driver, follower, lag, bins));
    reverse.push(transferEntropy(follower, driver, lag, bins));
  }
  let bestLag = 1;
  for (let i = 1; i < forward.length; i += 1) {
    if (forward[i]! > forward[bestLag - 1]!) bestLag = i + 1;
  }
  return {
    transferEntropyByLag: forward,
    bestLag,
    bestTransferEntropy: forward[bestLag - 1]!,
    netInformationFlow: forward[bestLag - 1]! - reverse[bestLag - 1]!,
    samples: driver.length,
    bins,
  };
}

export interface ExecutionOrder {
  side: "buy" | "sell";
  size: number;
  /** Optional limit; the walk stops when the next level is worse. */
  priceLimit?: number;
}

export interface ExecutionShortfallInput {
  order: ExecutionOrder;
  /** Levels on the side being executed, best price first. */
  book: readonly BookLevel[];
  /** Mid at decision time. */
  midPrice: number;
  /** Contract multiplier; 1 for prediction-market shares. */
  multiplier?: number;
}

export interface ExecutionShortfallResult {
  filledSize: number;
  unfilledSize: number;
  averagePrice: number | null;
  notional: number;
  shortfall: number | null;
  shortfallBps: number | null;
  levelsConsumed: number;
  notes: string[];
}

/**
 * Walks the book in price order and reports implementation shortfall:
 * (average fill - mid) * filled size * multiplier for a buy, the negative
 * for a sell. A limit that stops the walk leaves the remainder unfilled and
 * the result says so; it does not pretend the whole order filled.
 */
export function simulateExecutionShortfall(input: ExecutionShortfallInput): ExecutionShortfallResult {
  const { order, book, midPrice } = input;
  const multiplier = input.multiplier ?? 1;
  if (!(order.size > 0)) throw new Error("order size must be positive");
  if (!Number.isFinite(midPrice) || midPrice <= 0 || midPrice >= 1) {
    throw new Error("mid price must be strictly between 0 and 1");
  }
  const levels = [...book]
    .filter((l) => Number.isFinite(l.price) && Number.isFinite(l.size) && l.size > 0)
    .sort((a, b) => (order.side === "buy" ? a.price - b.price : b.price - a.price));
  let remaining = order.size;
  let filled = 0;
  let notional = 0;
  let levelsConsumed = 0;
  const notes: string[] = [];
  for (const level of levels) {
    if (remaining <= 0) break;
    if (order.priceLimit !== undefined) {
      if (order.side === "buy" && level.price > order.priceLimit) {
        notes.push(`limit ${order.priceLimit} stops the walk at ${level.price}`);
        break;
      }
      if (order.side === "sell" && level.price < order.priceLimit) {
        notes.push(`limit ${order.priceLimit} stops the walk at ${level.price}`);
        break;
      }
    }
    const take = Math.min(remaining, level.size);
    filled += take;
    notional += take * level.price;
    remaining -= take;
    levelsConsumed += 1;
  }
  const averagePrice = filled > 0 ? notional / filled : null;
  const shortfall =
    averagePrice === null
      ? null
      : (order.side === "buy" ? averagePrice - midPrice : midPrice - averagePrice) * filled * multiplier;
  return {
    filledSize: filled,
    unfilledSize: remaining,
    averagePrice,
    notional,
    shortfall,
    shortfallBps: averagePrice === null ? null : ((averagePrice - midPrice) / midPrice) * 10_000,
    levelsConsumed,
    notes,
  };
}
