/**
 * The Informational Content of the Limit Order Book: An Empirical Study of Prediction Markets
 *
 * arXiv:1609.03471v1 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Engine-honesty infrastructure: replicate the paper's limit-order-book informational-content
 * audit on prediction-market data in GSE's universe (Polymarket/Kalshi tooling): compute the
 * trader profitability distribution (paper: 4,452 traders, <1% profit >$400 vs ~5% losses >$400,
 * day-trader mean trading profit -$214.71), test whether entry timing predicts profit (paper: KS
 * test n.s. at 95%), check whether mean-belief intervals straddle 0.5 -- and publish the honest
 * baseline that most market participants lose and timing does not save them.
 *
 * ACCEPTANCE GATE: Replicate-to-baseline gate: confirm on 2024-2025 prediction-market data the paper's empirical
 * pattern -- <1% of traders profit >$400 vs ~5% losing >$400, day-trader mean trading profit
 * negative, KS test on entry-time profits n.s. at 95%, mean-belief intervals straddling 0.5 -- as
 * GSE's published market-honesty baseline.
 *
 * Ingest role: normalizer (trader profitability distribution + timing/entry tests).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1609.03471v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Replicate-to-baseline gate: confirm on 2024-2025 prediction-market data the paper's empirical
 * pattern -- <1% of traders profit >$400 vs ~5% losing >$400, day-trader mean trading profit
 * negative, KS test on entry-time profits n.s. at 95%, mean-belief intervals straddling 0.5 -- as
 * GSE's published market-honesty baseline.`;

export const CONFIG = {
  enabled: false,
  profitThreshold: 400,
  ksAlpha: 0.05,
  baselineNote: "paper: <1% profit >$400 vs ~5% lose >$400; day-trader mean -$214.71; entry-time KS n.s.",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TraderPnl {
  readonly traderId: string;
  readonly profit: number;
  readonly isDayTrader: boolean;
  readonly entryTime: number;
}

export function isTraderPnl(x: unknown): x is TraderPnl {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["traderId"] === "string" &&
    isFiniteNumber(o["profit"]) &&
    typeof o["isDayTrader"] === "boolean" &&
    isFiniteNumber(o["entryTime"])
  );
}

/** The paper's headline stats: share profiting/losing >$400, day-trader mean. */
export function profitDistributionStats(rows: readonly unknown[], threshold = 400): {
  n: number;
  pctProfitOver: number;
  pctLossOver: number;
  dayTraderMean: number | null;
} | null {
  const valid: TraderPnl[] = [];
  for (const r of rows) if (isTraderPnl(r)) valid.push(r);
  if (valid.length === 0 || !isFiniteNumber(threshold) || threshold <= 0) return null;
  const n = valid.length;
  const pctProfitOver = valid.filter((t) => t.profit > threshold).length / n;
  const pctLossOver = valid.filter((t) => t.profit < -threshold).length / n;
  const day = valid.filter((t) => t.isDayTrader);
  const dayTraderMean = day.length > 0 ? day.reduce((a, t) => a + t.profit, 0) / day.length : null;
  return { n, pctProfitOver, pctLossOver, dayTraderMean };
}

/** Two-sample Kolmogorov-Smirnov statistic (entry timing vs profit test). */
export function ksStatistic(a: readonly number[], b: readonly number[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  const points = [...new Set([...sa, ...sb])].sort((x, y) => x - y);
  let d = 0;
  let ia = 0;
  let ib = 0;
  for (const p of points) {
    while (ia < sa.length && (sa[ia] ?? Infinity) <= p) ia++;
    while (ib < sb.length && (sb[ib] ?? Infinity) <= p) ib++;
    d = Math.max(d, Math.abs(ia / sa.length - ib / sb.length));
  }
  return d;
}

/** Do mean-belief intervals straddle 0.5 (the paper's no-edge check)? */
export function beliefIntervalsStraddle(intervals: ReadonlyArray<{ lo: number; hi: number }>): boolean | null {
  if (intervals.length === 0) return null;
  for (const iv of intervals) {
    if (!isFiniteNumber(iv.lo) || !isFiniteNumber(iv.hi) || iv.lo > iv.hi) return null;
  }
  return intervals.every((iv) => iv.lo <= 0.5 && iv.hi >= 0.5);
}

/** Entry timing predicts profit? Compares entry times of winners vs losers. */
export function entryTimingTest(rows: readonly unknown[]): { ks: number; nWinners: number; nLosers: number } | null {
  const valid: TraderPnl[] = [];
  for (const r of rows) if (isTraderPnl(r)) valid.push(r);
  const winners = valid.filter((t) => t.profit > 0).map((t) => t.entryTime);
  const losers = valid.filter((t) => t.profit < 0).map((t) => t.entryTime);
  const ks = ksStatistic(winners, losers);
  if (ks === null) return null;
  return { ks, nWinners: winners.length, nLosers: losers.length };
}
