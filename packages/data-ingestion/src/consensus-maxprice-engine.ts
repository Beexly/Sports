/**
 * Beating the Bookmakers with Consensus Odds
 *
 * arXiv:1710.02824v2 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the consensus/max-price rule as live signal infrastructure the model-comparison harness
 * must beat (not as the predictive objective): build the nightly consensus engine -- multi-book
 * odds feeds (OddsPapi/API Vault), invert mean odds to fair probabilities, flag markets where max
 * odds imply positive EV beyond an alpha margin (start alpha=0.05, tune on backtest); log every
 * signal with the full odds panel; paper-trade the signals for a full season before any real-money
 * consideration; track stale-quote rate and limit/selection effects. The point is the paper's
 * published validation ladder (simulation -> realistic simulation -> paper trading -> real money)
 * that GSE's consensus lane currently lacks -- it disciplines GSE's existing consensus numbers
 * into a decision rule with a measurable CLV trail.
 *
 * ACCEPTANCE GATE: ADOPT the consensus/max-price rule as a live signal iff on the 2023-2024 backtest it delivers
 * ROI >= 2% over >= 500 signals with positive mean CLV. If ROI <= 0 or CLV <= 0, reject -- the
 * dispersion edge doesn't exist in current NFL markets.
 *
 * Ingest role: connector interface (nightly consensus engine; paper-trade only, no real money).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1710.02824v2" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the consensus/max-price rule as a live signal iff on the 2023-2024 backtest it delivers
 * ROI >= 2% over >= 500 signals with positive mean CLV. If ROI <= 0 or CLV <= 0, reject -- the
 * dispersion edge doesn't exist in current NFL markets.`;

export const CONFIG = {
  enabled: false,
  mode: "paper-trade",
  alpha: 0.05,
  roiGate: 0.02,
  minSignals: 500,
  validationLadder: ["simulation", "realistic-simulation", "paper-trading", "real-money"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface BookQuote {
  readonly book: string;
  readonly decimalOdds: number;
  readonly capturedAt: string;
}

export function isBookQuote(x: unknown): x is BookQuote {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["book"] === "string" &&
    isFiniteNumber(o["decimalOdds"]) && (o["decimalOdds"] as number) > 1 &&
    typeof o["capturedAt"] === "string" && Number.isFinite(Date.parse(o["capturedAt"] as string))
  );
}

/** Invert MEAN odds to fair probabilities (paper's consensus recipe). */
export function fairProbFromMeanOdds(quotes: readonly unknown[]): number | null {
  const valid: BookQuote[] = [];
  for (const q of quotes) if (isBookQuote(q)) valid.push(q);
  if (valid.length === 0) return null;
  const mean = valid.reduce((a, q) => a + q.decimalOdds, 0) / valid.length;
  return 1 / mean;
}

/**
 * Max-price rule: flag when the best available price implies positive EV
 * beyond the alpha margin. Returns the signal or null.
 */
export function maxPriceSignal(
  quotes: readonly unknown[],
  alpha = 0.05,
): { book: string; bestOdds: number; fairProb: number; ev: number } | null {
  const valid: BookQuote[] = [];
  for (const q of quotes) if (isBookQuote(q)) valid.push(q);
  if (valid.length < 2 || !isFiniteNumber(alpha) || alpha < 0) return null;
  const fair = fairProbFromMeanOdds(valid);
  if (fair === null) return null;
  let best = valid[0]!;
  for (const q of valid) if (q.decimalOdds > best.decimalOdds) best = q;
  const ev = best.decimalOdds * fair - 1;
  if (ev <= alpha) return null;
  return { book: best.book, bestOdds: best.decimalOdds, fairProb: fair, ev };
}

/** Stale-quote rate: share of quotes older than maxAgeMs (selection-effect monitor). */
export function staleQuoteRate(quotes: readonly unknown[], maxAgeMs: number, nowMs: number): number | null {
  const valid: BookQuote[] = [];
  for (const q of quotes) if (isBookQuote(q)) valid.push(q);
  if (valid.length === 0 || !isFiniteNumber(maxAgeMs) || !isFiniteNumber(nowMs) || maxAgeMs <= 0) return null;
  const stale = valid.filter((q) => nowMs - Date.parse(q.capturedAt) > maxAgeMs).length;
  return stale / valid.length;
}

/** Full odds panel log entry for the paper-trade trail. */
export function signalLogEntry(
  gameId: string,
  market: string,
  quotes: readonly unknown[],
  signal: { book: string; bestOdds: number; fairProb: number; ev: number } | null,
): string | null {
  if (typeof gameId !== "string" || typeof market !== "string") return null;
  const n = quotes.filter(isBookQuote).length;
  return JSON.stringify({ gameId, market, books: n, signal, mode: "paper-trade", at: new Date().toISOString() });
}
