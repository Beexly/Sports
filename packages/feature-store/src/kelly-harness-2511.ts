/**
 * Betting-game harness: Kelly-fractional model comparison on held-out seasons
 *
 * Research port: arXiv:2511.14537
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Pure standing model-comparison tool from the paper: every held-out season,
 * each model converts its win probabilities to fair odds and stakes
 * Kelly-fractional bets against every other model — "which model would make
 * money against which" instead of Brier gaps alone. Head-to-head P&L is
 * computed on the disagreement set (games where the two models' fair odds
 * imply opposite sides at the stake threshold), with half-season split
 * stability reporting.
 *
 * ACCEPTANCE GATE: Adopt if on the 2024 held-out season it identifies at
 * least one model pair whose profitability ranking reverses the Brier
 * ranking AND results are stable under half-season splits.
 */

export interface ModelGameProb {
  gameId: string;
  /** model name -> P(home win) */
  probs: Record<string, number>;
  homeWon: boolean;
}

export interface KellyBet {
  gameId: string;
  model: string;
  side: "home" | "away";
  /** fair decimal odds derived from the model's probability */
  fairOdds: number;
  /** fraction of bankroll staked (Kelly fraction, capped) */
  stakeFraction: number;
}

function clampP(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(0.99, Math.max(0.01, p));
}

/**
 * Kelly fraction for a fair-odds bet: f = (bp - q) / b, where b = odds - 1.
 * Scaled by kellyDivisor (fractional Kelly) and capped at maxStake.
 */
export function kellyFraction(
  p: number,
  fairOdds: number,
  kellyDivisor = 2,
  maxStake = 0.05,
): number {
  // fail closed: malformed probability or odds -> stake nothing
  if (!Number.isFinite(p) || !Number.isFinite(fairOdds)) return 0;
  const pc = clampP(p);
  const b = Math.max(fairOdds - 1, 1e-9);
  const q = 1 - pc;
  const f = (b * pc - q) / b / kellyDivisor;
  return Math.min(maxStake, Math.max(0, f));
}

export interface HeadToHead {
  modelA: string;
  modelB: string;
  games: number;
  pnlA: number;
  pnlB: number;
  /** profitability ranking of the pair: "A" | "B" | "tie" */
  winner: "A" | "B" | "tie";
}

/**
 * Head-to-head: on games where A and B disagree on the side (at minEdge),
 * each stakes Kelly-fractional on its own fair odds; P&L is settled at the
 * opponent's fair odds (zero-sum exchange between the models).
 */
export function headToHead(
  games: ModelGameProb[],
  modelA: string,
  modelB: string,
  minEdge = 0.02,
  kellyDivisor = 2,
): HeadToHead {
  let pnlA = 0;
  let pnlB = 0;
  let n = 0;
  for (const g of games) {
    const pa = clampP(g.probs[modelA] ?? 0.5);
    const pb = clampP(g.probs[modelB] ?? 0.5);
    const sideA = pa >= 0.5 ? "home" : "away";
    const sideB = pb >= 0.5 ? "home" : "away";
    if (sideA === sideB || Math.abs(pa - pb) < minEdge) continue;
    n++;
    const pSideA = sideA === "home" ? pa : 1 - pa; // A's conviction in its side
    const pSideB = sideB === "home" ? pb : 1 - pb; // B's conviction in its side
    // Each model bets at the opponent's fair odds for its side: the
    // disagreement is the price. Kelly is sized on own conviction at that price.
    const pSideAfromB = sideA === "home" ? pb : 1 - pb;
    const settleOddsA = 1 / clampP(pSideAfromB);
    const pSideBfromA = sideB === "home" ? pa : 1 - pa;
    const settleOddsB = 1 / clampP(pSideBfromA);
    const stakeA = kellyFraction(pSideA, settleOddsA, kellyDivisor);
    const stakeB = kellyFraction(pSideB, settleOddsB, kellyDivisor);
    const aWonSide = (sideA === "home") === g.homeWon;
    pnlA += aWonSide ? stakeA * (settleOddsA - 1) : -stakeA;
    pnlB += !aWonSide ? stakeB * (settleOddsB - 1) : -stakeB;
  }
  const winner = Math.abs(pnlA - pnlB) < 1e-12 ? "tie" : pnlA > pnlB ? "A" : "B";
  return { modelA, modelB, games: n, pnlA, pnlB, winner };
}

export interface SeasonComparison {
  pair: HeadToHead;
  brierA: number;
  brierB: number;
  brierWinner: "A" | "B" | "tie";
  /** does the profitability ranking reverse the Brier ranking */
  rankingReversed: boolean;
  stableUnderSplit: boolean;
}

function brierOf(games: ModelGameProb[], model: string): number {
  if (games.length === 0) return Number.NaN;
  let sum = 0;
  for (const g of games) {
    const p = clampP(g.probs[model] ?? 0.5);
    const y = g.homeWon ? 1 : 0;
    sum += (p - y) * (p - y);
  }
  return sum / games.length;
}

/**
 * Full-season comparison with half-season split stability: the pair's
 * profitability winner must agree across both halves.
 */
export function compareSeason(
  games: ModelGameProb[],
  modelA: string,
  modelB: string,
): SeasonComparison {
  const pair = headToHead(games, modelA, modelB);
  const brierA = brierOf(games, modelA);
  const brierB = brierOf(games, modelB);
  const brierWinner =
    Math.abs(brierA - brierB) < 1e-12 ? "tie" : brierA < brierB ? "A" : "B";
  const rankingReversed =
    pair.winner !== "tie" && brierWinner !== "tie" && pair.winner !== brierWinner;
  const half = Math.floor(games.length / 2);
  const h1 = headToHead(games.slice(0, half), modelA, modelB);
  const h2 = headToHead(games.slice(half), modelA, modelB);
  const stableUnderSplit = h1.winner === h2.winner && h1.winner === pair.winner;
  return { pair, brierA, brierB, brierWinner, rankingReversed, stableUnderSplit };
}

export const GSE_KELLY_HARNESS_ENABLED = false;
