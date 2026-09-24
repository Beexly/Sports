/**
 * Using Machine Learning and Alternative Data to Predict Movements in Market Risk
 *
 * arXiv:2009.07947v1 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Treat this paper as engine-honesty infrastructure, not an objective: build the line-movement-
 * direction model (target = sign(close - now) for spread/total, market data (line history,
 * ticket/handle splits) + alt data (X volume, news counts, Wikipedia page views), 78-style
 * technical expansion on line series) as a bet-timing honesty instrument, and audit GSE's existing
 * backtest pipelines against the paper's walk-forward/no-look-ahead discipline -- any pipeline
 * standardizing on the full sample before splitting has look-ahead bias by this standard; ablate
 * alt-data features per model class (linear vs non-linear).
 *
 * ACCEPTANCE GATE: Market-only features must beat 50% balanced accuracy OOS with walk-forward evaluation; then test
 * whether alt-data features add anything under a non-linear model. If nothing beats chance, the
 * transfer fails for that market.
 *
 * Ingest role: feature builder (market regime risk features: vol-of-vol, credit-implied default, skew).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2009.07947v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Market-only features must beat 50% balanced accuracy OOS with walk-forward evaluation; then test
 * whether alt-data features add anything under a non-linear model. If nothing beats chance, the
 * transfer fails for that market.`;

export const CONFIG = {
  enabled: false,
  feed: "public macro series (FRED)",
  models: ["lasso", "elastic-net", "random-forest"],
  target: "VIX-equivalent market stress",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function returnsFromPrices(prices: readonly number[]): number[] | null {
  if (prices.length < 2 || !prices.every(isFiniteNumber) || prices.some((p) => p <= 0)) return null;
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(Math.log((prices[i] ?? 1) / (prices[i - 1] ?? 1)));
  return r;
}

/** Realized volatility (annualized) over the trailing window. */
export function realizedVol(returns: readonly number[], annualizer = Math.sqrt(252)): number | null {
  if (returns.length < 2 || !returns.every(isFiniteNumber)) return null;
  const m = returns.reduce((a, b) => a + b, 0) / returns.length;
  const v = returns.reduce((a, r) => a + (r - m) * (r - m), 0) / (returns.length - 1);
  return Math.sqrt(v) * annualizer;
}

/** Vol-of-vol: std of rolling realized vol (regime-shift detector). */
export function volOfVol(returns: readonly number[], window = 20): number | null {
  if (!Number.isInteger(window) || window < 2 || returns.length < 2 * window) return null;
  if (!returns.every(isFiniteNumber)) return null;
  const vols: number[] = [];
  for (let i = window; i <= returns.length; i++) {
    const v = realizedVol(returns.slice(i - window, i));
    if (v === null) return null;
    vols.push(v);
  }
  const m = vols.reduce((a, b) => a + b, 0) / vols.length;
  return Math.sqrt(vols.reduce((a, v) => a + (v - m) * (v - m), 0) / (vols.length - 1));
}

/** Skew of returns (crash-risk feature). */
export function returnSkew(returns: readonly number[]): number | null {
  if (returns.length < 3 || !returns.every(isFiniteNumber)) return null;
  const m = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sd = Math.sqrt(returns.reduce((a, r) => a + (r - m) * (r - m), 0) / returns.length);
  if (sd === 0) return null;
  return returns.reduce((a, r) => a + ((r - m) / sd) ** 3, 0) / returns.length;
}

/** Credit-implied default probability from a spread (hazard-rate approximation). */
export function impliedDefaultProb(spreadBps: number, recovery = 0.4): number | null {
  if (!isFiniteNumber(spreadBps) || spreadBps < 0 || !isFiniteNumber(recovery) || recovery < 0 || recovery >= 1) return null;
  const s = spreadBps / 10000;
  return 1 - Math.exp((-s * 1) / (1 - recovery));
}

/** Feature vector for the regime model. */
export function marketRiskFeatures(prices: readonly number[], creditSpreadBps: number): Record<string, number> | null {
  const r = returnsFromPrices(prices);
  if (!r) return null;
  const vol = realizedVol(r);
  const vov = r.length >= 40 ? volOfVol(r) : null;
  const skew = returnSkew(r);
  const dp = impliedDefaultProb(creditSpreadBps);
  if (vol === null || skew === null || dp === null) return null;
  const out: Record<string, number> = { realizedVol: vol, returnSkew: skew, impliedDefaultProb: dp };
  if (vov !== null) out["volOfVol"] = vov;
  return out;
}
