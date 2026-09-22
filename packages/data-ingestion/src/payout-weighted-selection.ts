/**
 * Wages of wins: could an amateur make money from match outcome predictions?
 *
 * arXiv:1702.05982v1 · lane:props_dfs · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the paper's pay-out-weighted selection doctrine, not its models: for every GSE model
 * version, report the correct-pick breakdown by market class (favorite / underdog / pick'em) and
 * the implied flat-stake pay-out at closing lines alongside accuracy/log-loss; shift the pick-
 * selection layer from accuracy to expected pay-out -- weight training samples by market-implied
 * pay-out (or optimize a pay-out-weighted log-loss); implement confidence-thresholded betting (bet
 * only when model edge > threshold) with pre-registered rules, backtested on 2020-2025, answering
 * whether an amateur-style disciplined bettor could make money from match outcome predictions.
 *
 * ACCEPTANCE GATE: ADOPT the pay-out-weighted selection doctrine if on 2024-2025 holdout the pay-out-optimized
 * variant beats the accuracy-optimized variant by >=$500 per season at flat $100 stakes (or >=2 pp
 * ROI) with the gain concentrated in underdog/pick'em hits.
 *
 * Ingest role: feature builder (pay-out-weighted training + confidence-thresholded betting doctrine).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1702.05982v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the pay-out-weighted selection doctrine if on 2024-2025 holdout the pay-out-optimized
 * variant beats the accuracy-optimized variant by >=$500 per season at flat $100 stakes (or >=2 pp
 * ROI) with the gain concentrated in underdog/pick'em hits.`;

export const CONFIG = {
  enabled: false,
  stake: 100,
  roiGainThresholdPp: 2,
  payoutGainThreshold: 500,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type MarketClass = "favorite" | "underdog" | "pickem";

export interface PickResult {
  readonly marketClass: MarketClass;
  readonly won: boolean;
  readonly payout: number;
}

export function isPickResult(x: unknown): x is PickResult {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    (o["marketClass"] === "favorite" || o["marketClass"] === "underdog" || o["marketClass"] === "pickem") &&
    typeof o["won"] === "boolean" &&
    isFiniteNumber(o["payout"])
  );
}

export interface ClassBreakdown {
  n: number;
  wins: number;
  accuracy: number | null;
  totalPayout: number;
}

/** Correct-pick breakdown by market class + implied flat-stake pay-out. */
export function classBreakdown(results: readonly unknown[]): Record<MarketClass, ClassBreakdown> {
  const init = (): ClassBreakdown => ({ n: 0, wins: 0, accuracy: null, totalPayout: 0 });
  const out: Record<MarketClass, ClassBreakdown> = { favorite: init(), underdog: init(), pickem: init() };
  for (const r of results) {
    if (!isPickResult(r)) continue;
    const c = out[r.marketClass];
    c.n++;
    if (r.won) c.wins++;
    c.totalPayout += r.payout;
  }
  for (const k of Object.keys(out) as MarketClass[]) {
    const c = out[k];
    c.accuracy = c.n > 0 ? c.wins / c.n : null;
  }
  return out;
}

/** Pay-out-weighted log-loss (training objective shift: accuracy -> expected pay-out). */
export function payoutWeightedLogLoss(ps: readonly number[], ys: readonly number[], payouts: readonly number[]): number | null {
  if (ps.length !== ys.length || ys.length !== payouts.length || ps.length === 0) return null;
  let num = 0;
  let den = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = Math.min(Math.max(ps[i] ?? 0.5, 1e-9), 1 - 1e-9);
    const y = ys[i];
    const w = payouts[i];
    if ((y !== 0 && y !== 1) || !isFiniteNumber(w) || (w ?? 0) < 0) return null;
    num += (w ?? 0) * (y === 1 ? -Math.log(p) : -Math.log(1 - p));
    den += w ?? 0;
  }
  if (den === 0) return null;
  return num / den;
}

/** Confidence-thresholded betting rule: bet only when model edge > threshold. */
export function thresholdBet(edge: number, threshold: number): boolean {
  if (!isFiniteNumber(edge) || !isFiniteNumber(threshold)) return false;
  return edge > threshold;
}

/** ROI in percentage points at flat stakes. */
export function roiPp(results: readonly PickResult[], stake = 100): number | null {
  if (results.length === 0 || !isFiniteNumber(stake) || stake <= 0) return null;
  const profit = results.reduce((a, r) => a + (r.won ? r.payout : -stake), 0);
  return (profit / (results.length * stake)) * 100;
}
