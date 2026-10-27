/**
 * Hierarchical partial-pooling estimator (pre-seal only).
 *
 * Model
 * -----
 *   R_i ~ N(mu, tau^2)                       team rating prior
 *   y_ij ~ N(R_i - R_j + HFA, sigma^2)       observed margin, home perspective
 *
 * Empirical-Bayes shrinkage weight per team:
 *   w_i = (n_i / sigma^2) / (n_i / sigma^2 + 1 / tau^2)
 *
 * The shrunken rating is:
 *   R_i_hat = w_i * raw_i + (1 - w_i) * mu
 *
 * Variance components are estimated by method of moments from the raw
 * (unshrunk) ratings:
 *   tau^2 = max(0, var(raw ratings) - mean(within-team sampling variance))
 *   sigma^2 = mean squared residual of the raw fit
 *
 * This runs ONLY pre-seal. It never calls seal() and writes only into the
 * candidate baseline.
 */

import type {
  GameObservation,
  PoolingParams,
  PoolingResult,
  TeamRating,
} from "./types.js";

const DEFAULT_PARAMS: PoolingParams = {
  mu: 0,
  tau: 1,
  sigma: 13.5,
  hfa: 2.0,
};

/** A team's raw fit plus the statistics needed for the variance components. */
interface RawFit {
  ratings: Map<string, { rating: number; n: number; residualSumSq: number }>;
  residuals: number[];
  rmsResidual: number;
  sigma2: number;
}

/**
 * Unshrunk fit: ordinary least squares on the margin design matrix with the
 * league mean as the reference level. Ratings are in points above league mean.
 */
function fitRaw(observations: GameObservation[], params: PoolingParams): RawFit {
  const teams = Array.from(
    new Set(observations.flatMap((o) => [o.home, o.away])),
  ).sort();

  const index = new Map<string, number>();
  teams.forEach((t, i) => index.set(t, i));

  const n = teams.length;
  const m = observations.length;

  // Design matrix X: +1 for home, -1 for away. y = margin - HFA for home games.
  const X: number[][] = observations.map((o) => {
    const row = new Array<number>(n).fill(0);
    row[index.get(o.home)!] = 1;
    row[index.get(o.away)!] = -1;
    return row;
  });
  const y: number[] = observations.map((o) => o.margin - params.hfa);

  // Normal equations (X'X + lambda I) R = X'y with lambda -> 0 for the raw fit.
  // Ridge lambda = 1e-6 keeps the system solvable when a team has no games.
  const lambda = 1e-6;
  const XtX: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  const Xty: number[] = new Array<number>(n).fill(0);

  for (let k = 0; k < m; k += 1) {
    const row = X[k]!;
    for (let i = 0; i < n; i += 1) {
      if (row[i] === 0) continue;
      Xty[i]! += row[i]! * y[k]!;
      for (let j = 0; j < n; j += 1) {
        XtX[i]![j]! += row[i]! * row[j]!;
      }
    }
  }
  for (let i = 0; i < n; i += 1) XtX[i]![i]! += lambda;

  const ratings = solveLinearSystem(XtX, Xty);

  // Residuals and per-team counts / residual sums of squares.
  const byTeam = new Map<string, { rating: number; n: number; residualSumSq: number }>();
  teams.forEach((t, i) => byTeam.set(t, { rating: ratings[i]!, n: 0, residualSumSq: 0 }));

  const residuals: number[] = [];
  for (let k = 0; k < m; k += 1) {
    const o = observations[k]!;
    const pred = ratings[index.get(o.home)!]! - ratings[index.get(o.away)!]! + params.hfa;
    const resid = o.margin - pred;
    residuals.push(resid);

    const h = byTeam.get(o.home)!;
    h.n += 1;
    h.residualSumSq += resid * resid;
    const a = byTeam.get(o.away)!;
    a.n += 1;
    a.residualSumSq += resid * resid;
  }

  const sigma2 =
    residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, residuals.length);
  const rmsResidual = Math.sqrt(sigma2);

  return { ratings: byTeam, residuals, rmsResidual, sigma2 };
}

/** Gaussian elimination with partial pivoting. */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];

    const d = M[col]![col]!;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = col + 1; r < n; r += 1) {
      const f = M[r]![col]! / d;
      for (let c = col; c <= n; c += 1) M[r]![c]! -= f * M[col]![c]!;
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = M[r]![n]!;
    for (let c = r + 1; c < n; c += 1) s -= M[r]![c]! * x[c]!;
    const d = M[r]![r]!;
    x[r] = Math.abs(d) < 1e-12 ? 0 : s / d;
  }
  return x;
}

/**
 * Estimate the variance components and the shrunken rating vector.
 *
 * tau^2 is estimated by method of moments: the observed variance of raw
 * ratings exceeds the sampling variance when there is real between-team
 * spread. When it does not, tau^2 floors to a small positive number so the
 * weights stay well defined and every team is pulled almost fully to mu.
 */
export function estimatePartialPooling(
  observations: GameObservation[],
  overrides: Partial<PoolingParams> = {},
): PoolingResult {
  const params: PoolingParams = { ...DEFAULT_PARAMS, ...overrides };

  if (observations.length === 0) {
    return {
      ratings: [],
      params,
      weights: {},
      residuals: [],
      rmsResidual: 0,
    };
  }

  const raw = fitRaw(observations, params);
  const teams = Array.from(raw.ratings.keys()).sort();

  const rawVals = teams.map((t) => raw.ratings.get(t)!.rating);
  const meanRaw = rawVals.reduce((a, b) => a + b, 0) / rawVals.length;
  const varRaw =
    rawVals.reduce((acc, r) => acc + (r - meanRaw) ** 2, 0) /
    Math.max(1, rawVals.length - 1);

  // Mean within-team sampling variance: sigma^2 / n_i.
  const within = teams
    .map((t) => raw.ratings.get(t)!)
    .filter((r) => r.n > 0)
    .map((r) => raw.sigma2 / r.n);
  const meanWithin =
    within.length > 0 ? within.reduce((a, b) => a + b, 0) / within.length : raw.sigma2;

  const tau2 = Math.max(1e-6, varRaw - meanWithin);
  const tau = Math.sqrt(tau2);
  const sigma = Math.max(1e-6, Math.sqrt(raw.sigma2));

  const weights: Record<string, number> = {};
  const ratings: TeamRating[] = teams.map((team) => {
    const r = raw.ratings.get(team)!;
    const precisionData = r.n / (sigma * sigma);
    const precisionPrior = 1 / (tau * tau);
    const w = r.n > 0 ? precisionData / (precisionData + precisionPrior) : 0;
    weights[team] = Number(w.toFixed(6));
    const shrunk = w * r.rating + (1 - w) * meanRaw;
    return { team, rating: Number(shrunk.toFixed(4)), n: r.n };
  });

  return {
    ratings,
    params: {
      mu: Number(meanRaw.toFixed(4)),
      tau: Number(tau.toFixed(4)),
      sigma: Number(sigma.toFixed(4)),
      hfa: params.hfa,
    },
    weights,
    residuals: raw.residuals.map((r) => Number(r.toFixed(4))),
    rmsResidual: Number(raw.rmsResidual.toFixed(4)),
  };
}

export { DEFAULT_PARAMS };
