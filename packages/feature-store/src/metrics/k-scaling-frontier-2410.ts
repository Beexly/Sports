/**
 * sqrt(K) scaling frontier for Elo K-factor scheduling + bias curve
 *
 * Research port: arXiv:2410.09180
 * Normalized lane: team_ratings | Doctrine: SITUATIONAL
 *
 * Schedules GSE's Elo K-factors from the paper's sqrt(K) scaling frontier (K choices from an explicit error budget) and applies an empirically estimated bias curve E[X] - rho (final Elo vs next-season win total, 2015-2025) as a correction. Frontier fit + bias application; pure.
 *
 * ACCEPTANCE GATE: Adopt the sqrt(K) frontier only if the 2015-2025 fit yields R^2 >= 0.6 on the sqrt(K) regression of team-level rating dispersion. Live-data gate -> GSE_K_FRONTIER_ENABLED flag (default false).
 */

export interface FrontierPoint {
  k: number;
  /** team-level rating dispersion (std of end-of-season Elos) */
  dispersion: number;
}

/** OLS fit of dispersion on sqrt(K); returns R^2 and the fitted line. */
export function fitSqrtKFrontier(points: FrontierPoint[]): { r2: number; a: number; b: number } {
  const xs = points.map((p) => Math.sqrt(p.k));
  const ys = points.map((p) => p.dispersion);
  const n = xs.length;
  if (n < 2) return { r2: 0, a: ys[0] ?? 0, b: 0 }; // degenerate: constant fit at the lone point
  const mx = xs.reduce((a, x) => a + x, 0) / n;
  const my = ys.reduce((a, y) => a + y, 0) / n;
  let sxy = 0, sxx = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const x = (xs[i] ?? 0) - mx;
    const y = (ys[i] ?? 0) - my;
    sxy += x * y;
    sxx += x ** 2;
    sst += y ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  const a = my - b * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const xi = xs[i] ?? 0;
    const yi = ys[i] ?? 0;
    ssr += (yi - (a + b * xi)) ** 2;
  }
  return { r2: sst === 0 ? 0 : 1 - ssr / sst, a, b };
}

/** K from an explicit error budget: invert the frontier for a target dispersion. */
export function kFromBudget(targetDispersion: number, fit: { a: number; b: number }): number {
  if (fit.b === 0) return 0;
  const sqrtK = (targetDispersion - fit.a) / fit.b;
  return sqrtK <= 0 ? 0 : sqrtK * sqrtK;
}

export interface BiasPoint {
  finalElo: number;
  nextSeasonWins: number;
}

/**
 * Empirical bias curve E[X] - rho: expected wins from final Elo (linear map) minus
 * realized next-season wins, averaged. Positive = Elo overestimates.
 */
export function biasCurve(points: BiasPoint[], eloToWins: (elo: number) => number): { meanBias: number; n: number } {
  if (points.length === 0) return { meanBias: 0, n: 0 };
  const biases = points.map((p) => eloToWins(p.finalElo) - p.nextSeasonWins);
  return { meanBias: biases.reduce((a, b) => a + b, 0) / biases.length, n: points.length };
}

/** Gate: R^2 >= 0.6 on the sqrt(K) regression. */
export function kFrontierGatePasses(r2: number): boolean {
  return r2 >= 0.6;
}

/** Live-data gate: 2015-2025 fit must clear R^2 >= 0.6. */
export const GSE_K_FRONTIER_ENABLED = false;

