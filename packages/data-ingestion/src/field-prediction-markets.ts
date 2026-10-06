/**
 * Price Formation in Field Prediction Markets: the Wisdom in the Crowd
 *
 * arXiv:2209.08778v1 · lane:markets · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Run the informed-flow detector in rolling windows and close the paper's untested loop: test
 * whether the detected informed-flow share predicts the market-efficiency alpha metric — i.e.,
 * does the market become efficient (alpha -> negative) exactly when informed flow dominates?
 * Implement as a rolling validation layer over record 141's detector: per window, compute
 * informed-flow share (2-3/4+ PS-trader market equivalents) and the subsequent window's alpha
 * (mean(W/p) - 1), and test the predicted negative relationship.
 *
 * ACCEPTANCE GATE: Gate is the same market-microstructure validation: rolling informed-flow-share windows must
 * predict the alpha efficiency metric with the predicted sign at statistical significance — if the
 * informed-flow share does not predict efficiency, the detector is descriptive only, not
 * predictive.
 *
 * Ingest role: connector interface (field prediction-market price formation: schema + wisdom-of-crowd aggregation).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2209.08778v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Gate is the same market-microstructure validation: rolling informed-flow-share windows must
 * predict the alpha efficiency metric with the predicted sign at statistical significance — if the
 * informed-flow share does not predict efficiency, the detector is descriptive only, not
 * predictive.`;

export const CONFIG = {
  enabled: false,
  venue: "field prediction markets",
  aggregation: "wisdom of the crowd",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface FieldTrade {
  readonly marketId: string;
  readonly traderId: string;
  readonly tradedAt: string;
  readonly price: number;
  readonly size: number;
  readonly side: "yes" | "no";
}

export function isFieldTrade(x: unknown): x is FieldTrade {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["marketId"] === "string" &&
    typeof o["traderId"] === "string" &&
    typeof o["tradedAt"] === "string" && Number.isFinite(Date.parse(o["tradedAt"] as string)) &&
    isFiniteNumber(o["price"]) && (o["price"] as number) > 0 && (o["price"] as number) < 1 &&
    isFiniteNumber(o["size"]) && (o["size"] as number) > 0 &&
    (o["side"] === "yes" || o["side"] === "no")
  );
}

/** VWAP price formation. */
export function vwap(trades: readonly unknown[]): number | null {
  const v: FieldTrade[] = [];
  for (const t of trades) if (isFieldTrade(t)) v.push(t);
  if (v.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const t of v) {
    const p = t.side === "yes" ? t.price : 1 - t.price;
    num += p * t.size;
    den += t.size;
  }
  return num / den;
}

/** Trader diversity: unique traders per market (wisdom-of-crowd precondition). */
export function traderDiversity(trades: readonly unknown[]): number | null {
  const v: FieldTrade[] = [];
  for (const t of trades) if (isFieldTrade(t)) v.push(t);
  if (v.length === 0) return null;
  return new Set(v.map((t) => t.traderId)).size;
}

/** Price impact decay: does the price revert after large trades (manipulation check). */
export function priceReversion(
  trades: readonly unknown[],
  windowTrades = 5,
): number | null {
  const v: FieldTrade[] = [];
  for (const t of trades) if (isFieldTrade(t)) v.push(t);
  if (v.length < windowTrades + 1 || !Number.isInteger(windowTrades) || windowTrades <= 0) return null;
  const sorted = [...v].sort((a, b) => Date.parse(a.tradedAt) - Date.parse(b.tradedAt));
  let rev = 0;
  let n = 0;
  for (let i = 0; i + windowTrades < sorted.length; i++) {
    const shock = (sorted[i]?.price ?? 0) - (sorted[Math.max(0, i - 1)]?.price ?? 0);
    const later = (sorted[i + windowTrades]?.price ?? 0) - (sorted[i]?.price ?? 0);
    if (shock !== 0) {
      rev += -later / shock;
      n++;
    }
  }
  if (n === 0) return null;
  return rev / n;
}
