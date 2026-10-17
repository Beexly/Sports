/**
 * Expected-value detector with vig (overround) removal — the STRONG variant
 * from handoff/research/forecasting/review-academic-bibliography.md §1.
 *
 * EDGE THESIS: the naive bibliography formula compares a model probability to
 * RAW implied probability (1/decimal_odds). Because Σ(1/odds) = 1 + margin > 1,
 * raw implied probabilities are biased — favorites underestimated, longshots
 * overestimated — so the naive detector both misses real edges on favorites and
 * fabricates edges on longshots. The corrected detector devigs first:
 *
 *   implied_raw = 1 / decimal_odds
 *   margin      = Σ implied_raw          (> 1 for two-sided books)
 *   fair_prob   = implied_raw / margin   (proportional normalization)
 *   edge        = model_prob − fair_prob
 *   EV per unit stake = model_prob·(decimal_odds − 1) − (1 − model_prob)
 *
 * It also reports the Kelly fraction f* = (b·p − q) / b with b = odds − 1,
 * which the review flagged as the correct sizing companion to any EV signal.
 *
 * Honesty rules: fail closed (throw) on non-finite inputs, odds ≤ 1, empty or
 * zero-margin books. No thresholds are applied here — callers decide what edge
 * size justifies action. Pure math, no I/O.
 */

const EPS = 1e-12;

export interface BookOdds {
  /** Decimal odds ≥ 1.01 for one outcome of a two-sided book. */
  readonly decimalOdds: number;
}

export interface EvDetectionResult {
  /** Devigged book probability for this outcome: implied / Σ(implied). */
  readonly fairProbBook: number;
  /** Total overround Σ(1/odds) of the book. */
  readonly marginTotal: number;
  /** model_prob − fairProbBook; >0 = model sees value on this outcome. */
  readonly edge: number;
  /** EV per 1-unit stake at these odds. */
  readonly evPerUnit: number;
  /**
   * Full Kelly fraction f* = (b·p − q)/b, b = odds−1. Negative when the bet
   * is -EV (do not bet). Not clipped to [0,1] — caller owns sizing policy.
   */
  readonly kellyFraction: number;
}

/** Proportionally devig a complete two-sided (or n-way) book. */
export function devigProportional(odds: readonly number[]): { fairProbs: number[]; marginTotal: number } {
  if (!Array.isArray(odds) || odds.length < 2) {
    throw new Error("book must contain at least two outcomes");
  }
  let marginTotal = 0;
  const implied: number[] = [];
  for (const o of odds) {
    if (!Number.isFinite(o) || o <= 1) {
      throw new Error(`decimal odds must be finite and > 1, got ${String(o)}`);
    }
    const imp = 1 / o;
    implied.push(imp);
    marginTotal += imp;
  }
  if (!(marginTotal > EPS)) {
    throw new Error("book margin is degenerate");
  }
  return { fairProbs: implied.map((i) => i / marginTotal), marginTotal };
}

/**
 * Detect + quantify EV of backing ONE outcome of a book, given a model
 * probability for that same outcome and the full set of book odds (so the
 * margin is computed from the whole book, not assumed).
 */
export function detectEv(
  modelProb: number,
  outcomeIndex: number,
  bookOdds: readonly number[],
): EvDetectionResult {
  if (!Number.isFinite(modelProb) || modelProb < 0 || modelProb > 1) {
    throw new Error(`modelProb must be in [0,1], got ${String(modelProb)}`);
  }
  if (!Number.isInteger(outcomeIndex) || outcomeIndex < 0 || outcomeIndex >= bookOdds.length) {
    throw new Error("outcomeIndex out of range for book");
  }
  const { fairProbs, marginTotal } = devigProportional(bookOdds);
  const decimalOdds = bookOdds[outcomeIndex]!;
  const fairProbBook = fairProbs[outcomeIndex]!;
  const b = decimalOdds - 1;
  const q = 1 - modelProb;
  const evPerUnit = modelProb * b - q;
  return {
    fairProbBook,
    marginTotal,
    edge: modelProb - fairProbBook,
    evPerUnit,
    kellyFraction: b > EPS ? (modelProb * b - q) / b : 0,
  };
}
