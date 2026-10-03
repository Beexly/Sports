/**
 * arXiv 1708.02715v1: Order Flows and Limit Order Book Resiliency on the Meso-Scale
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Meso-scale limit-order-book resiliency ported to prediction markets
(Kalshi/Polymarket NFL contracts): fixed volume buckets (contracts traded per
bucket, not time bars); per-bucket taker imbalance TI and maker net flow VL
(limit adds minus cancels); OLS of price change on TI + beta*VL to separate
how much maker flow moves price vs taker flow; a hockey-stick steam detector
(one-sided taker flow while maker flow on the active side fades); and a
residual-based scarce-liquidity flag (>1.5 SD move given flow) marking
do-not-bet-into regimes.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port the meso-scale limit order book resiliency toolkit to prediction markets (Kalshi/Polymarket NFL contracts): volume bucketing (fixed contracts-traded per bucket) instead of time bars; order flows decomposition -- per bucket compute taker imbalance TI (aggressive buys-sells) and maker net flow VL (limit adds - cancels) per side, regress price change on TI + beta*VL to estimate how much maker flow moves price vs taker flow; steam detector -- hockey-stick logic: when taker flow goes one-sided AND maker flow on the active side fades (cancellations dominate), flag an imminent outsized move; scarce-liquidity regime flag -- residual-based SL indicator (>1.5 SD price move given flow) -> in live betting, treat SL regimes as 'do not bet into the move / good liquidity-provision regimes.'
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT gate: (a) Test 1 must replicate the qualitative pattern (order-flow decomposition adds explanatory power) on prediction-market data; (b) the SL detector must beat a volume-only baseline out-of-sample.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs prediction-market order-flow data (Tests 1a/1b).

export interface Trade {
  side: "buy" | "sell";
  size: number;
  kind: "taker" | "maker-add" | "maker-cancel";
  price: number;
}

export interface FlowBucket {
  /** Taker imbalance: aggressive buys minus sells. */
  takerImbalance: number;
  /** Maker net flow: limit adds minus cancels. */
  makerNetFlow: number;
  priceChange: number;
  volume: number;
}

/** Fixed-contracts-traded volume buckets (meso-scale bars, not time bars). */
export function volumeBuckets(trades: Trade[], contractsPerBucket: number): FlowBucket[] {
  const buckets: FlowBucket[] = [];
  let buy = 0;
  let sell = 0;
  let add = 0;
  let cancel = 0;
  let volume = 0;
  let firstPrice = 0;
  let lastPrice = 0;
  let started = false;
  const flush = () => {
    buckets.push({
      takerImbalance: buy - sell,
      makerNetFlow: add - cancel,
      priceChange: lastPrice - firstPrice,
      volume,
    });
  };
  const reset = () => {
    buy = 0;
    sell = 0;
    add = 0;
    cancel = 0;
    volume = 0;
    started = false;
  };
  for (const t of trades) {
    if (!started) {
      firstPrice = t.price;
      started = true;
    }
    if (t.kind === "taker") {
      if (t.side === "buy") buy += t.size;
      else sell += t.size;
    } else if (t.kind === "maker-add") {
      add += t.size;
    } else {
      cancel += t.size;
    }
    volume += t.size;
    lastPrice = t.price;
    if (volume >= contractsPerBucket) {
      flush();
      reset();
    }
  }
  return buckets;
}

export interface ResiliencyFit {
  intercept: number;
  betaTaker: number;
  betaMaker: number;
  rSquared: number;
  residSd: number;
  n: number;
}

/** OLS of per-bucket price change on taker imbalance + maker net flow. */
export function resiliencyRegression(buckets: FlowBucket[]): ResiliencyFit {
  const n = buckets.length;
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const ti = buckets.map((b) => b.takerImbalance);
  const vl = buckets.map((b) => b.makerNetFlow);
  const dp = buckets.map((b) => b.priceChange);
  const mTI = mean(ti);
  const mVL = mean(vl);
  const mP = mean(dp);
  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  let s1p = 0;
  let s2p = 0;
  for (let i = 0; i < n; i++) {
    const a = ti[i]! - mTI;
    const b = vl[i]! - mVL;
    const c = dp[i]! - mP;
    s11 += a * a;
    s12 += a * b;
    s22 += b * b;
    s1p += a * c;
    s2p += b * c;
  }
  const det = s11 * s22 - s12 * s12;
  const betaTaker = (s22 * s1p - s12 * s2p) / det;
  const betaMaker = (s11 * s2p - s12 * s1p) / det;
  const intercept = mP - betaTaker * mTI - betaMaker * mVL;
  const resid = buckets.map((b) => b.priceChange - (intercept + betaTaker * b.takerImbalance + betaMaker * b.makerNetFlow));
  const rss = resid.reduce((s, r) => s + r * r, 0);
  const tss = dp.reduce((s, x) => s + (x - mP) ** 2, 0);
  return {
    intercept,
    betaTaker,
    betaMaker,
    rSquared: tss === 0 ? 0 : 1 - rss / tss,
    residSd: Math.sqrt(rss / Math.max(n - 3, 1)),
    n,
  };
}

/**
 * Hockey-stick steam detector: taker flow one-sided over the lookback while
 * maker net flow is negative (cancellations dominate on the active side) ->
 * flag an imminent outsized move.
 */
export function steamSignal(buckets: FlowBucket[], lookback = 3): boolean {
  if (buckets.length < lookback) return false;
  const recent = buckets.slice(-lookback);
  const oneSided =
    recent.every((b) => b.takerImbalance > 0) || recent.every((b) => b.takerImbalance < 0);
  const makerFades = recent.every((b) => b.makerNetFlow < 0);
  return oneSided && makerFades;
}

/**
 * Scarce-liquidity regime flag: residual-based SL indicator; a >1.5 SD price
 * move given the order flow marks a do-not-bet-into / liquidity-provision
 * regime.
 */
export function scarceLiquidityFlag(
  buckets: FlowBucket[],
  index: number,
  fit: ResiliencyFit,
  thresholdSd = 1.5,
): boolean {
  const b = buckets[index]!;
  const predicted = fit.intercept + fit.betaTaker * b.takerImbalance + fit.betaMaker * b.makerNetFlow;
  const resid = Math.abs(b.priceChange - predicted);
  return fit.residSd > 0 && resid > thresholdSd * fit.residSd;
}
