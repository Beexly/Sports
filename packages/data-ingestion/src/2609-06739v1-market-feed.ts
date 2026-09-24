/**
 * The profit-bias identity in sports betting: bookmaker profit as the public's prediction error
 *
 * arXiv:2609.06739v1 · lane:markets · verdict:ADOPT · owner:Mimo · doctrine:BASELINE
 *
 * Mechanism: Market microstructure primitives: American-to-implied probability conversion, overround devigging by normalization, closing-line value, median consensus lines, and steam-move magnitude.
 *
 * Improvement (record):
 * Build a three-component bookmaker-profit attribution pipeline for NFL spreads/totals from public bet%/handle% splits, The Odds API history, and nflverse outcomes, decomposing the book's edge into losing-side share, favorite-identity stratification, and profit attribution to isolate any tradable public-bias signal.
 *
 * ACCEPTANCE GATE:
 * ADOPT the decomposition framework if, on 2024-2025 NFL spreads/totals: (a) the pipeline reproduces the paper's qualitative pattern - a pooled losing-side share significantly != 50% that shrinks toward zero (|gap| < 2 pp, p > 0.10) under favorite-identity stratification - OR finds a stratified gap that survives (|gap| >= 3 pp, p < 0.05), which would be a genuine, tradable public-bias signal; and (b) the three-component profit attribution is computable for >= 90% of games without manual intervention. REJECT (keep as reference only) if split coverage is too sparse (< 60% of games) or the decomposition terms are numerically unstable.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: market feed normalizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2609.06739v1" as const;
export const LANE = "markets" as const;
export const VERDICT = "ADOPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the decomposition framework if, on 2024-2025 NFL spreads/totals: (a) the pipeline reproduces the paper's qualitative pattern - a pooled losing-side share significantly != 50% that shrinks toward zero (|gap| < 2 pp, p > 0.10) under favorite-identity stratification - OR finds a stratified gap that survives (|gap| >= 3 pp, p < 0.05), which would be a genuine, tradable public-bias signal; and (b) the three-component profit attribution is computable for >= 90% of games without manual intervention. REJECT (keep as reference only) if split coverage is too sparse (< 60% of games) or the decomposition terms are numerically unstable.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Convert American odds to an implied probability. Null on invalid odds. */
export function americanToImplied(odds: number): number | null {
  if (!isFiniteNumber(odds) || odds === 0 || (odds > -100 && odds < 100)) return null;
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

/** Remove the overround by normalizing implied probabilities to sum to 1. */
export function devig(probs: number[]): number[] | null {
  if (probs.length === 0) return null;
  if (!probs.every((p) => isFiniteNumber(p) && p > 0)) return null;
  const s = probs.reduce((a, b) => a + b, 0);
  if (s === 0) return null;
  return probs.map((p) => p / s);
}

/**
 * Closing-line value in percentage points: positive means the placed price
 * implied a lower win probability than the close (beat the closing line).
 */
export function clvPct(placedAmerican: number, closingAmerican: number): number | null {
  const p = americanToImplied(placedAmerican);
  const c = americanToImplied(closingAmerican);
  if (p === null || c === null || c === 0) return null;
  return ((c - p) / c) * 100;
}

/** Median consensus line across books (robust to stale outliers). */
export function consensusLine(lines: number[]): number | null {
  if (lines.length === 0 || !lines.every(isFiniteNumber)) return null;
  const s = [...lines].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[m] as number;
  return ((s[m - 1] as number) + (s[m] as number)) / 2;
}

/** Steam magnitude: largest absolute line move in a sequence. */
export function steamMagnitude(moves: number[]): number | null {
  if (moves.length === 0 || !moves.every(isFiniteNumber)) return null;
  return Math.max(...moves.map((v) => Math.abs(v)));
}
