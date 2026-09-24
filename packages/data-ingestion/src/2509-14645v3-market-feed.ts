/**
 * Are Final Market Prices Sufficient for Information Aggregation? Evidence from Last-Minute Dynamics in Parimutuel Betting
 *
 * arXiv:2509.14645v3 · lane:markets · verdict:ADAPT · owner:Mimo · doctrine:BASELINE
 *
 * Mechanism: Market microstructure primitives: American-to-implied probability conversion, overround devigging by normalization, closing-line value, median consensus lines, and steam-move magnitude.
 *
 * Improvement (record):
 * GSE builds steam-detection features from timestamped sharp-book odds: late-window move velocity, acceleration, and path convexity as pick-model features, backtesting a 'follow sharp late steam' rule at post-move prices with slippage.
 *
 * ACCEPTANCE GATE:
 * ADAPT confirmed if late-move features add significant explanatory power for CLV beyond final odds (p<0.01 on the move coefficient in at least one league); if no league shows the effect, record the parimutuel-specific boundary.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: market feed normalizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2509.14645v3" as const;
export const LANE = "markets" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT confirmed if late-move features add significant explanatory power for CLV beyond final odds (p<0.01 on the move coefficient in at least one league); if no league shows the effect, record the parimutuel-specific boundary.`;

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
