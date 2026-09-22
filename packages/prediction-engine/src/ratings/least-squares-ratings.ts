/**
 * Least-squares ratings on point differentials (arXiv 2201.05249).
 *
 * Reproduce least-squares ratings on NFL walk-forward: weekly LS ratings
 * on point differentials, spread predictions = rating differential + home
 * adjustment, compared against Elo spread predictions on MAE and
 * ranking-violation rate. Extensions past the paper's future-work pointer:
 * weighted/generalized least squares with per-game variance as a function
 * of rest, travel, rating uncertainty and week of season, plus an L1
 * (least-absolute-deviation) variant robust to garbage-time blowouts.
 *
 * ACCEPTANCE GATE: LS spread-MAE <= Elo spread-MAE + 0.1 points AND LS
 * ranking-violation rate <= Elo's violation rate on the 2019-2023
 * walk-forward test; keep LS only as a diagnostic baseline if it fails.
 *
 * Research-only module. Not wired into any live rating path.
 */

export interface GameResult {
  home: string;
  away: string;
  homePoints: number;
  awayPoints: number;
  /** Rest days edge (home - away), for the WLS variance model. */
  restEdge?: number;
  /** Travel miles for the away team, for the WLS variance model. */
  travelMiles?: number;
  /** Week of season 1..18, for the WLS variance model. */
  week?: number;
}

/** Solve a dense linear system via Gauss-Jordan elimination. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col] as number) > Math.abs(M[piv]![col] as number)) piv = r;
    }
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const diag = M[col]![col] as number;
    if (Math.abs(diag) < 1e-10) throw new Error("solveLinear: singular system");
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (M[r]![col] as number) / diag;
      for (let c = col; c <= n; c++) M[r]![c] = (M[r]![c] as number) - f * (M[col]![c] as number);
    }
  }
  return M.map((row, i) => (row[n] as number) / (row[i] as number));
}

export interface LsFit {
  teams: string[];
  /** Rating per team (index-aligned with teams). */
  ratings: number[];
  /** Home-field coefficient (extra column). */
  hfa: number;
}

interface Design {
  teams: string[];
  rows: number[][];
  y: number[];
  p: number;
}

/**
 * Design matrix for point-differential regression: columns teams[0..t-2]
 * (last team pinned by zero-sum), then an HFA column of 1s.
 */
function buildDesign(games: readonly GameResult[]): Design {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort();
  const idx = new Map(teams.map((t, i) => [t, i]));
  const t = teams.length;
  const p = t;
  const rows: number[][] = [];
  const y: number[] = [];
  for (const g of games) {
    const ih = idx.get(g.home) as number;
    const ia = idx.get(g.away) as number;
    const row = new Array<number>(p).fill(0);
    if (ih < t - 1) row[ih] = 1;
    else for (let k = 0; k < t - 1; k++) row[k] = -1;
    if (ia < t - 1) row[ia] = -1;
    else for (let k = 0; k < t - 1; k++) row[k] = (row[k] as number) + 1;
    row[p - 1] = 1; // HFA column
    rows.push(row);
    y.push(g.homePoints - g.awayPoints);
  }
  return { teams, rows, y, p };
}

/** Weighted normal-equations solve shared by OLS/WLS/L1-IRLS. */
function solveWeighted(design: Design, weights: readonly number[]): LsFit {
  const { teams, rows, y, p } = design;
  const t = teams.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty: number[] = new Array<number>(p).fill(0);
  for (let i = 0; i < rows.length; i++) {
    const w = weights[i] as number;
    const row = rows[i] as number[];
    const yi = y[i] as number;
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] as number) + w * (row[a] as number) * yi;
      const XtXa = XtX[a] as number[];
      for (let b = 0; b < p; b++) {
        XtXa[b] = (XtXa[b] as number) + w * (row[a] as number) * (row[b] as number);
      }
    }
  }
  const coef = solveLinear(XtX, Xty);
  const ratings = new Array<number>(t).fill(0);
  let sum = 0;
  for (let k = 0; k < t - 1; k++) {
    ratings[k] = coef[k] as number;
    sum += coef[k] as number;
  }
  ratings[t - 1] = -sum; // zero-sum pin
  return { teams, ratings, hfa: coef[p - 1] as number };
}

/**
 * Ordinary least squares on point differentials: each game gives one row
 * with +1 (home), -1 (away), and a home-indicator column for HFA.
 */
export function fitLeastSquares(games: readonly GameResult[]): LsFit {
  if (games.length === 0) throw new Error("fitLeastSquares: no games");
  const design = buildDesign(games);
  return solveWeighted(design, design.y.map(() => 1));
}

/**
 * Weighted least squares: per-game variance as a function of rest edge,
 * travel, and week of season (early-season games noisier).
 */
export function gameVariance(g: GameResult): number {
  const rest = Math.abs(g.restEdge ?? 0);
  const travel = (g.travelMiles ?? 0) / 1000;
  const week = g.week ?? 9;
  const early = week <= 4 ? 1.5 : 1.0;
  return early * (14 ** 2) * (1 + 0.05 * rest + 0.1 * travel);
}

export function fitWeightedLeastSquares(games: readonly GameResult[]): LsFit {
  if (games.length === 0) throw new Error("fitWeightedLeastSquares: no games");
  const design = buildDesign(games);
  return solveWeighted(
    design,
    games.map((g) => 1 / gameVariance(g)),
  );
}

/**
 * L1 (least-absolute-deviation) ratings via iteratively reweighted least
 * squares, robust to garbage-time blowouts: weights = 1 / max(eps, |resid|).
 */
export function fitL1Ratings(games: readonly GameResult[], iters = 25): LsFit {
  if (games.length === 0) throw new Error("fitL1Ratings: no games");
  const design = buildDesign(games);
  let fit = solveWeighted(design, design.y.map(() => 1));
  for (let k = 0; k < iters; k++) {
    const weights = design.rows.map((row, i) => {
      const pred =
        row.slice(0, design.p - 1).reduce((a, x, j) => a + x * (fit.ratings[j] as number), 0) +
        (row[design.p - 1] as number) * fit.hfa;
      // Note: the pinned last team is folded into the row coefficients, so
      // the linear predictor via ratings is exact here.
      return 1 / Math.max(0.5, Math.abs((design.y[i] as number) - pred));
    });
    fit = solveWeighted(design, weights);
  }
  return fit;
}

/** Predicted spread (home margin) for a matchup. */
export function predictSpread(fit: LsFit, home: string, away: string): number {
  const ih = fit.teams.indexOf(home);
  const ia = fit.teams.indexOf(away);
  if (ih < 0 || ia < 0) throw new Error("predictSpread: unknown team");
  return (fit.ratings[ih] as number) - (fit.ratings[ia] as number) + fit.hfa;
}

/** Spread MAE of a fitted rating set on games. */
export function spreadMae(fit: LsFit, games: readonly GameResult[]): number {
  if (games.length === 0) throw new Error("spreadMae: no games");
  let s = 0;
  for (const g of games) {
    s += Math.abs(predictSpread(fit, g.home, g.away) - (g.homePoints - g.awayPoints));
  }
  return s / games.length;
}

/**
 * Ranking-violation rate: fraction of games where the higher-rated team
 * (after HFA) lost. Lower is better.
 */
export function rankingViolationRate(fit: LsFit, games: readonly GameResult[]): number {
  if (games.length === 0) throw new Error("rankingViolationRate: no games");
  let viol = 0;
  for (const g of games) {
    const pred = predictSpread(fit, g.home, g.away);
    const actual = g.homePoints - g.awayPoints;
    if ((pred > 0 && actual < 0) || (pred < 0 && actual > 0)) viol++;
  }
  return viol / games.length;
}
