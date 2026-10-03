/**
 * Parlay MRI v1 — same-match correlation via Karlis & Ntzoufras bivariate Poisson.
 *
 * X = W1 + W3, Y = W2 + W3, Wi ~ Pois(λi) independent. Cov(X, Y) = λ3 exactly:
 * λ3 is the shared-component (pace / weather / game-script). λ3 → 0 collapses
 * to the independent product a book's flat parlay pricer assumes.
 *
 * Ported from penaltyblog (MIT), github.com/martineastwood/penaltyblog
 * (`models/probabilities.pyx` compute_bivariate_poisson_probabilities;
 * verified exact float64 match against 1.12.0 commit 5ebd602).
 *
 * Scope: v1 is SAME-MATCH SGP only. Cross-game parlay correlation is a
 * separate problem — do not claim it here.
 *
 * `priced: false` until real book SGP quotes are ingested and
 * correlatedSurvivability beats naive on a walk-forward backtest.
 * Ship as transparency / education until then.
 *
 * Pure, deterministic, no I/O. Not wired into the live pick pipeline.
 */

import { factorial, poissonPmf as independentPoissonPmf } from "../poisson.js";

export const PARLAY_MRI_PRICED = false as const;
export const PARLAY_MRI_SCOPE = "same-match" as const;

export function poissonPmf(k: number, lam: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lam === 0) return k === 0 ? 1 : 0;
  if (lam < 0 || !Number.isFinite(lam)) return 0;
  // log-space for stability at moderate k: exp(-λ + k ln λ - ln k!)
  return Math.exp(-lam + k * Math.log(lam) - Math.log(factorial(k)));
}

export function bivariatePoissonPmf(
  x: number,
  y: number,
  lam1: number,
  lam2: number,
  lam3: number,
): number {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return 0;
  let p = 0;
  const kMax = Math.min(x, y);
  for (let k = 0; k <= kMax; k++) {
    p += poissonPmf(x - k, lam1) * poissonPmf(y - k, lam2) * poissonPmf(k, lam3);
  }
  return p;
}

export function buildScoreGrid(
  lam1: number,
  lam2: number,
  lam3: number,
  maxGoals: number,
  normalize = true,
): number[][] {
  if (maxGoals < 0 || !Number.isInteger(maxGoals)) {
    throw new RangeError(`maxGoals must be a non-negative integer, got ${maxGoals}`);
  }
  const grid: number[][] = [];
  let mass = 0;
  for (let x = 0; x <= maxGoals; x++) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y++) {
      const p = bivariatePoissonPmf(x, y, lam1, lam2, lam3);
      row.push(p);
      mass += p;
    }
    grid.push(row);
  }
  if (normalize && mass > 0) {
    for (const row of grid) {
      for (let y = 0; y < row.length; y++) {
        row[y] = (row[y] ?? 0) / mass;
      }
    }
  }
  return grid;
}

export type SameMatchLeg =
  | { kind: "home_win" }
  | { kind: "away_win" }
  | { kind: "draw" }
  | { kind: "over"; line: number }
  | { kind: "under"; line: number }
  | { kind: "btts" }
  | { kind: "exact"; home: number; away: number };

function cellSatisfies(x: number, y: number, leg: SameMatchLeg): boolean {
  switch (leg.kind) {
    case "home_win":
      return x > y;
    case "away_win":
      return y > x;
    case "draw":
      return x === y;
    case "over":
      return x + y > leg.line;
    case "under":
      return x + y < leg.line;
    case "btts":
      return x > 0 && y > 0;
    case "exact":
      return x === leg.home && y === leg.away;
    default: {
      const _never: never = leg;
      throw new Error(`unknown parlay leg: ${JSON.stringify(_never)}`);
    }
  }
}

function gridProbability(
  grid: readonly number[][],
  predicate: (x: number, y: number) => boolean,
): number {
  let p = 0;
  for (let x = 0; x < grid.length; x++) {
    const row = grid[x] ?? [];
    for (let y = 0; y < row.length; y++) {
      if (predicate(x, y)) p += row[y] ?? 0;
    }
  }
  return p;
}

export interface ParlayEvaluation {
  naiveSurvivability: number;
  correlatedSurvivability: number;
  priced: typeof PARLAY_MRI_PRICED;
  scope: typeof PARLAY_MRI_SCOPE;
}

/**
 * Compare naive product-of-marginals survivability against the bivariate-Poisson
 * joint. A mispriced same-match parlay is one where the two diverge.
 *
 * Naive = product of each leg's marginal on the independent Poisson grid
 * (the book's flat-pricer assumption). Correlated = one sum over joint cells
 * that satisfy every leg. Same-match legs remain dependent even at λ3 = 0
 * because they share the scoreline; λ3 only adds the shared-component extra.
 */
export function evaluateParlay(
  legs: readonly SameMatchLeg[],
  lam1: number,
  lam2: number,
  lam3: number,
  maxGoals = 12,
): ParlayEvaluation {
  if (legs.length === 0) {
    throw new RangeError("evaluateParlay requires at least one same-match leg");
  }

  const correlatedGrid = buildScoreGrid(lam1, lam2, lam3, maxGoals, true);
  const independentGrid: number[][] = [];
  for (let x = 0; x <= maxGoals; x++) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y++) {
      row.push(independentPoissonPmf(x, lam1 + lam3) * independentPoissonPmf(y, lam2 + lam3));
    }
    independentGrid.push(row);
  }
  let independentMass = 0;
  for (const row of independentGrid) {
    for (const p of row) independentMass += p;
  }
  if (independentMass > 0) {
    for (const row of independentGrid) {
      for (let y = 0; y < row.length; y++) {
        row[y] = (row[y] ?? 0) / independentMass;
      }
    }
  }

  let naive = 1;
  for (const leg of legs) {
    naive *= gridProbability(independentGrid, (x, y) => cellSatisfies(x, y, leg));
  }
  const correlated = gridProbability(correlatedGrid, (x, y) =>
    legs.every((leg) => cellSatisfies(x, y, leg)),
  );

  return {
    naiveSurvivability: naive,
    correlatedSurvivability: correlated,
    priced: PARLAY_MRI_PRICED,
    scope: PARLAY_MRI_SCOPE,
  };
}

export function lambdasFromAttackDefense(params: {
  homeAdvantage: number;
  homeAttack: number;
  awayDefense: number;
  awayAttack: number;
  homeDefense: number;
  correlationLog: number;
}): { lam1: number; lam2: number; lam3: number } {
  return {
    lam1: Math.exp(params.homeAdvantage + params.homeAttack + params.awayDefense),
    lam2: Math.exp(params.awayAttack + params.homeDefense),
    lam3: Math.exp(params.correlationLog),
  };
}
