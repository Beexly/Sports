/**
 * GSE Scoreline Model — a Dixon-Coles-corrected bivariate-Poisson scoreline grid
 * for soccer, deriving match outcome (1X2), over/under, both-teams-to-score, and
 * correct-score probabilities from expected goals.
 *
 * Composes the `dixonColesTau` correction from `projection-models.ts` (plain
 * Poisson independence misprices low-scoring draws). Pure + tested. Expands GSE's
 * sport coverage toward soccer, the largest global market and a competitor blind
 * spot after FBref lost its advanced feed (Jan 2026).
 *
 * Companion doc: docs/research/GSE_2026_FORECASTING_AND_SCORELINE.md
 */

import { dixonColesTau } from "./projection-models";

/** Poisson probability mass P(K = k | λ). Stable for the small k used here. */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

/**
 * Build a normalised home×away scoreline probability grid. `lambda`/`mu` are the
 * home/away expected goals; `rho` is the Dixon-Coles dependence parameter
 * (typically small and negative). `grid[i][j]` = P(home i, away j).
 */
export function dixonColesScorelineGrid(
  lambda: number,
  mu: number,
  rho: number,
  maxGoals = 10,
): number[][] {
  const size = Math.max(1, maxGoals) + 1;
  const grid: number[][] = [];
  let total = 0;
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      const p = poissonPmf(i, lambda) * poissonPmf(j, mu) * dixonColesTau(i, j, lambda, mu, rho);
      const safe = p > 0 ? p : 0; // a large negative rho could push a cell <0; floor it
      row.push(safe);
      total += safe;
    }
    grid.push(row);
  }
  // Normalise so the grid is a proper distribution.
  if (total > 0) {
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) grid[i]![j]! /= total;
  }
  return grid;
}

export interface MatchOutcome {
  readonly homeWin: number;
  readonly draw: number;
  readonly awayWin: number;
}

/** Sum the grid into 1X2 match-outcome probabilities. */
export function matchOutcomeProbs(grid: readonly (readonly number[])[]): MatchOutcome {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i]!;
    for (let j = 0; j < row.length; j++) {
      const p = row[j]!;
      if (i > j) homeWin += p;
      else if (i === j) draw += p;
      else awayWin += p;
    }
  }
  return { homeWin, draw, awayWin };
}

export interface TotalsProbs {
  readonly line: number;
  readonly over: number;
  readonly under: number;
  /** Non-zero only for an integer line (a push is possible). */
  readonly push: number;
}

/** Over/under total-goals probabilities for a given line (e.g. 2.5). */
export function overUnderProbs(grid: readonly (readonly number[])[], line: number): TotalsProbs {
  let over = 0;
  let under = 0;
  let push = 0;
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i]!;
    for (let j = 0; j < row.length; j++) {
      const total = i + j;
      if (total > line) over += row[j]!;
      else if (total < line) under += row[j]!;
      else push += row[j]!;
    }
  }
  return { line, over, under, push };
}

/** Both-teams-to-score yes/no probabilities. */
export function bttsProbs(grid: readonly (readonly number[])[]): { yes: number; no: number } {
  let yes = 0;
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]!;
    for (let j = 1; j < row.length; j++) yes += row[j]!;
  }
  return { yes, no: 1 - yes };
}

export interface CorrectScore {
  readonly home: number;
  readonly away: number;
  readonly prob: number;
}

/** The `topN` most likely exact scorelines. */
export function topScorelines(grid: readonly (readonly number[])[], topN = 5): CorrectScore[] {
  const all: CorrectScore[] = [];
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i]!;
    for (let j = 0; j < row.length; j++) all.push({ home: i, away: j, prob: row[j]! });
  }
  return all.sort((a, b) => b.prob - a.prob).slice(0, Math.max(0, topN));
}

export interface ScorelineModelResult {
  readonly outcome: MatchOutcome;
  readonly totals2_5: TotalsProbs;
  readonly btts: { yes: number; no: number };
  readonly topScores: CorrectScore[];
  readonly expectedGoals: { home: number; away: number; total: number };
}

/**
 * Full Dixon-Coles match model from expected goals: returns 1X2, over/under 2.5,
 * BTTS, the most likely scorelines, and the expected-goals summary. Probabilities
 * are coherent (1X2 sums to 1) by construction.
 */
export function dixonColesMatch(lambda: number, mu: number, rho = -0.05, maxGoals = 10): ScorelineModelResult {
  const grid = dixonColesScorelineGrid(lambda, mu, rho, maxGoals);
  return {
    outcome: matchOutcomeProbs(grid),
    totals2_5: overUnderProbs(grid, 2.5),
    btts: bttsProbs(grid),
    topScores: topScorelines(grid, 5),
    expectedGoals: { home: lambda, away: mu, total: lambda + mu },
  };
}
