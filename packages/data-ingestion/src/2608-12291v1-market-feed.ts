/**
 * When should one stop the most exciting game? Sequential Inference for win-martingales
 *
 * arXiv:2608.12291v1 · lane:markets · verdict:ADAPT · owner:Mimo · doctrine:BASELINE
 *
 * Mechanism: Market microstructure primitives: American-to-implied probability conversion, overround devigging by normalization, closing-line value, median consensus lines, and steam-move magnitude.
 *
 * Improvement (record):
 * Add an optimal act-now-vs-wait stopping policy for GSE's timed decisions (live-bet/hedge timing, pregame pick release, live-content commitment) built from the empirically estimated sigma(pi) quadratic-variation curve of win-probability streams.
 *
 * ACCEPTANCE GATE:
 * Adopt the timed-decision module if, on a holdout season of live-bet backtests, the optimal-stopping policy achieves >=10% lower realized Bayes risk than the best fixed-threshold baseline AND the estimated sigma(pi) is stable across seasons (per-decile quadratic-variation estimates within +-25% year over year). Reject if the gain over fixed thresholds is <5% — then the theory adds nothing over a tuned heuristic.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: market feed normalizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2608.12291v1" as const;
export const LANE = "markets" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the timed-decision module if, on a holdout season of live-bet backtests, the optimal-stopping policy achieves >=10% lower realized Bayes risk than the best fixed-threshold baseline AND the estimated sigma(pi) is stable across seasons (per-decile quadratic-variation estimates within +-25% year over year). Reject if the gain over fixed thresholds is <5% — then the theory adds nothing over a tuned heuristic.`;

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
