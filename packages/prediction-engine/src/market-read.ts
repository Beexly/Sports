/**
 * Market read — the no-vig probability primitive (Galaxy Data Doctrine,
 * build order #1). Turns a book's posted American prices into fair outcome
 * probabilities (Shin de-vig), the book's hold, and a consensus fair price
 * across books. This is the denominator of every honest "model vs market"
 * sentence: the market's opinion only counts after its margin is removed.
 *
 * Pure, no I/O. Prices arrive as American odds (ingestion stores
 * ODDS_FORMAT="american").
 */

import { americanToDecimalOdds } from "./kelly.js";
import { impliedFromDecimalOdds, shinDevig } from "./shin-devig.js";

export interface MarketRead {
  /** Fair (de-vigged) probabilities for the market's outcomes; sums to 1. */
  readonly fairProbabilities: readonly number[];
  /** Book hold (over-round) in percentage points, e.g. 4.76 for a -110/-110 line. */
  readonly bookHoldPct: number;
  /** Shin's estimated insider share z — favourite–longshot correction strength. */
  readonly insiderShareZ: number;
  readonly outcomeCount: number;
}

/**
 * De-vig one book's market. Outcomes are positional (e.g. [home, away] or
 * [home, away, draw]). Returns null when fewer than two valid prices exist —
 * a one-sided quote cannot be de-vigged honestly.
 */
export function noVigFromAmericanPrices(prices: readonly number[]): MarketRead | null {
  const valid = prices.filter((p) => Number.isFinite(p) && p !== 0);
  if (valid.length < 2 || valid.length !== prices.length) return null;

  const decimal = valid.map(americanToDecimalOdds);
  if (decimal.some((d) => !Number.isFinite(d) || d <= 1)) return null;

  const raw = impliedFromDecimalOdds(decimal);
  const shin = shinDevig(raw);

  // Shin's early-return for an underround book (booksum < 1) leaves the raw
  // implied probabilities unchanged, so they sum to < 1. Renormalize so the
  // interface's "sums to 1" contract holds on both sides — otherwise a
  // best-home/best-away price pair leaks probability mass and shows impossible
  // simultaneous positive edge. Idempotent when the probs already sum to 1.
  const probSum = shin.probabilities.reduce((acc, p) => acc + p, 0);
  const fairProbabilities =
    probSum > 0 ? shin.probabilities.map((p) => p / probSum) : shin.probabilities;

  return {
    fairProbabilities,
    bookHoldPct: round2(Math.max(0, (shin.booksum - 1) * 100)),
    insiderShareZ: shin.z,
    outcomeCount: valid.length,
  };
}

export interface ConsensusMarketRead {
  /** Median fair P(home) across books, renormalized; 0–1. */
  readonly fairHomeProb: number;
  readonly fairAwayProb: number;
  readonly fairDrawProb: number | null;
  readonly bookCount: number;
  readonly medianHoldPct: number;
  /**
   * Each pooled book's own no-vig P(home), ascending. This is the Simulation
   * Cloud's raw material: the market's spread of belief as REAL samples (one
   * per book), never an invented variance parameter.
   */
  readonly fairHomeProbsByBook: readonly number[];
  /**
   * Book disagreement: mean absolute deviation of each book's fair P(home)
   * from the consensus median, 0–1. 0 = the books agree exactly; higher =
   * the market is split. Robust to a single outlier because it deviates from
   * the median, not the mean.
   */
  readonly homeProbDispersion: number;
}

interface BookPrices {
  readonly home: number;
  readonly away: number;
  readonly draw?: number | null;
}

/**
 * Consensus fair probabilities across books: de-vig each book independently,
 * take the median per outcome, renormalize. Median (not mean) so one stale or
 * outlier book cannot drag the consensus. Null when no book de-vigs cleanly.
 */
export function consensusNoVig(perBook: readonly BookPrices[]): ConsensusMarketRead | null {
  const reads: Array<{ probs: readonly number[]; holdPct: number; hasDraw: boolean }> = [];

  for (const book of perBook) {
    const hasDraw = typeof book.draw === "number" && Number.isFinite(book.draw) && book.draw !== 0;
    const prices = hasDraw ? [book.home, book.away, book.draw as number] : [book.home, book.away];
    const read = noVigFromAmericanPrices(prices);
    if (read) reads.push({ probs: read.fairProbabilities, holdPct: read.bookHoldPct, hasDraw });
  }
  if (reads.length === 0) return null;

  // Only mix like with like: if any book quotes a draw, use draw-quoting books.
  const withDraw = reads.filter((r) => r.hasDraw);
  const pool = withDraw.length > 0 ? withDraw : reads;
  const hasDraw = withDraw.length > 0;

  const home = median(pool.map((r) => r.probs[0]!));
  const away = median(pool.map((r) => r.probs[1]!));
  const draw = hasDraw ? median(pool.map((r) => r.probs[2]!)) : 0;
  const total = home + away + draw;
  if (total <= 0) return null;

  // Simulation Cloud raw material: each pooled book's own no-vig P(home).
  const fairHomeProbsByBook = pool
    .map((r) => round4(r.probs[0]!))
    .sort((a, b) => a - b);

  // Disagreement on the home side: each book's home prob is normalized within
  // that book, then we take the mean absolute deviation from the pool median.
  const homeProbs = pool.map((r) => {
    const t = r.probs.reduce((s, p) => s + p, 0);
    return t > 0 ? r.probs[0]! / t : 0;
  });
  const medHome = median(homeProbs);
  const dispersion =
    homeProbs.reduce((s, p) => s + Math.abs(p - medHome), 0) / homeProbs.length;

  return {
    fairHomeProb: round4(home / total),
    fairAwayProb: round4(away / total),
    fairDrawProb: hasDraw ? round4(draw / total) : null,
    bookCount: pool.length,
    medianHoldPct: round2(median(pool.map((r) => r.holdPct))),
    fairHomeProbsByBook,
    homeProbDispersion: round4(dispersion),
  };
}

export type GravityBand = "strong" | "moderate" | "slight" | "balanced";

export interface MarketGravity {
  /** 0–100 — how strongly the market pulls toward one side. */
  readonly index: number;
  /** Which side the pull favours. "none" only when the index is ~0. */
  readonly side: "home" | "away" | "none";
  readonly band: GravityBand;
  /** Conviction: distance of consensus from a coin flip, 0–1. */
  readonly conviction: number;
  /** Agreement: 1 − (dispersion capped), 0–1. */
  readonly agreement: number;
  /** Liquidity: book coverage vs target, 0–1. */
  readonly liquidity: number;
}

// Above this much book disagreement (MAD in prob points), agreement → 0.
const DISPERSION_CAP = 0.1;
// Book count at which liquidity confidence saturates.
const LIQUIDITY_TARGET = 6;

/**
 * Market Gravity Index (Galaxy Data Doctrine stat factory) — how strongly the
 * market is pulling toward one side, on a 0–100 scale.
 *
 * Conviction (distance of the consensus from a coin flip) is the anchor; book
 * AGREEMENT and LIQUIDITY are confidence factors that discount a lopsided
 * median when books disagree or coverage is thin. They modulate within
 * [0.6, 1.0] so they sharpen the read without erasing a genuine lean.
 *
 * Known weakness (stat commandment): this measures the market's CONVICTION,
 * never whether the market is RIGHT. Strong gravity against our read is a
 * reason to look harder, not to fold.
 */
export function marketGravityIndex(consensus: ConsensusMarketRead): MarketGravity {
  const conviction = Math.min(1, Math.abs(consensus.fairHomeProb - 0.5) * 2);
  const agreement = 1 - Math.min(1, consensus.homeProbDispersion / DISPERSION_CAP);
  const liquidity = Math.min(1, consensus.bookCount / LIQUIDITY_TARGET);

  const quality = 0.6 + 0.25 * agreement + 0.15 * liquidity; // [0.6, 1.0]
  const index = Math.round(conviction * quality * 100);

  const band: GravityBand =
    index >= 60 ? "strong" : index >= 30 ? "moderate" : index >= 10 ? "slight" : "balanced";
  // Field-relative side test: equivalent to `fairHomeProb >= 0.5` on a 2-way
  // market (where fairHomeProb + fairAwayProb = 1), but correct on a 3-way
  // (1X2) consensus where the favourite can lead the field with P < 0.5.
  const side =
    band === "balanced"
      ? "none"
      : consensus.fairHomeProb >= consensus.fairAwayProb
        ? "home"
        : "away";

  return {
    index,
    side,
    band,
    conviction: round4(conviction),
    agreement: round4(agreement),
    liquidity: round4(liquidity),
  };
}

/**
 * Model-vs-market disagreement in percentage points (positive = the model is
 * higher than the fair market price). The edge sentence — "we make this 56,
 * the market says 52.8" — is exactly this number.
 */
export function marketDisagreementPct(modelProb: number, fairMarketProb: number): number {
  return round2((modelProb - fairMarketProb) * 100);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
