/**
 * Unit-level Impact Scores from win-probability-added regression.
 *
 * Adapts the paper's NBA impact regression to the NFL: define NFL "shifts"
 * as drives (nflverse 2015–2025), y_i = change in win probability over the
 * drive, regress onto signed positional-unit indicators (QB, OL unit, skill
 * group, DL, LB, secondary per team) with Laplace priors + team effects via
 * proximal-gradient Bayesian lasso; outputs unit Impact Scores with
 * bootstrap credible intervals, leverage profiles, and Mahalanobis
 * similarity between units.
 *
 * @see arXiv:1604.03186v1 — "Estimating an NBA player's impact on his team's chances of winning"
 *
 * ACCEPTANCE GATE: adopt unit Impact Scores for GSE content/ratings iff
 * year-to-year correlation ≥ 0.30 on the 2018–2024 test AND 95% credible
 * intervals exclude zero for at least 20% of starting units; otherwise keep
 * as descriptive only, never as a predictive rating. The gate is a training
 * concern; this module is the pure regression kernel, not wired live.
 */

export interface DriveObs {
  /** Change in win probability over the drive (home perspective). */
  wpDelta: number;
  /** Signed unit indicators: +1 unit played for home, −1 for away, 0 absent. */
  units: Record<string, -1 | 0 | 1>;
}

/** Soft-threshold operator (proximal step for the Laplace prior). */
export function softThreshold(x: number, lambda: number): number {
  return Math.sign(x) * Math.max(0, Math.abs(x) - lambda);
}

/**
 * Fit the Impact Score model by proximal gradient descent on
 *   (1/2n)Σ(y − Xβ)² + λΣ|β|.
 * Returns one coefficient per unit (the Impact Scores).
 */
export function fitImpactScores(
  drives: readonly DriveObs[],
  lambda = 0.01,
  iters = 500,
  step = 0.5,
): Record<string, number> {
  if (drives.length === 0) return {};
  const names = [...new Set(drives.flatMap((d) => Object.keys(d.units)))].sort();
  const n = drives.length;
  const beta = new Array<number>(names.length).fill(0);
  const X = drives.map((d) => names.map((u) => d.units[u] ?? 0));
  const y = drives.map((d) => d.wpDelta);
  for (let it = 0; it < iters; it++) {
    // gradient of the least-squares term
    const grad = new Array<number>(names.length).fill(0);
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < names.length; j++) pred += (X[i]?.[j] ?? 0) * (beta[j] ?? 0);
      const resid = pred - (y[i] ?? 0);
      for (let j = 0; j < names.length; j++) grad[j]! += ((X[i]?.[j] ?? 0) * resid) / n;
    }
    for (let j = 0; j < names.length; j++) {
      beta[j] = softThreshold((beta[j] ?? 0) - step * (grad[j] ?? 0), step * lambda);
    }
  }
  return Object.fromEntries(names.map((u, j) => [u, beta[j] ?? 0]));
}

/** Predict the WP delta for a drive from unit scores. */
export function predictWpDelta(
  scores: Readonly<Record<string, number>>,
  units: Record<string, -1 | 0 | 1>,
): number {
  return Object.entries(units).reduce((s, [u, sign]) => s + sign * (scores[u] ?? 0), 0);
}

/**
 * Bootstrap 95% credible intervals for the Impact Scores (resample drives
 * with replacement; deterministic LCG seed for reproducibility).
 */
export function impactScoreIntervals(
  drives: readonly DriveObs[],
  lambda = 0.01,
  nBoot = 200,
  seed = 42,
): Record<string, { score: number; lo: number; hi: number }> {
  const point = fitImpactScores(drives, lambda);
  let s = seed >>> 0;
  const rand = (): number => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const boots: Array<Record<string, number>> = [];
  for (let b = 0; b < nBoot; b++) {
    const sample = drives.map(() => drives[Math.floor(rand() * drives.length)]!);
    boots.push(fitImpactScores(sample, lambda, 200));
  }
  const out: Record<string, { score: number; lo: number; hi: number }> = {};
  for (const u of Object.keys(point)) {
    const vals = boots.map((bt) => bt[u] ?? 0).sort((a, b) => a - b);
    out[u] = {
      score: point[u] ?? 0,
      lo: vals[Math.floor(0.025 * nBoot)] ?? 0,
      hi: vals[Math.floor(0.975 * nBoot)] ?? 0,
    };
  }
  return out;
}

/**
 * Mahalanobis similarity between two units' leverage profiles
 * (per-drive indicator vectors), with a diagonal covariance guard.
 */
export function mahalanobisSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("mahalanobisSimilarity: length mismatch");
  }
  const mean = (v: readonly number[]): number => v.reduce((x, y) => x + y, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  const va = a.reduce((x, v) => x + (v - ma) ** 2, 0) / a.length + 1e-6;
  const vb = b.reduce((x, v) => x + (v - mb) ** 2, 0) / b.length + 1e-6;
  return Math.sqrt(((ma - mb) ** 2 / va + (ma - mb) ** 2 / vb) / 2);
}

/** Year-to-year correlation of unit scores (the gate's stability check). */
export function yearToYearCorrelation(
  scoresA: Readonly<Record<string, number>>,
  scoresB: Readonly<Record<string, number>>,
): number {
  const units = Object.keys(scoresA).filter((u) => u in scoresB);
  if (units.length < 3) return 0;
  const xs = units.map((u) => scoresA[u] ?? 0);
  const ys = units.map((u) => scoresB[u] ?? 0);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}
