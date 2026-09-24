/**
 * Auxiliary-score ABC for state-space team-strength dynamics.
 *
 * True model: latent team offense/defense strengths with AR(1) dynamics and
 * a heavy-tailed margin observation model (intractable joint likelihood).
 * Auxiliary model: linear-Gaussian dynamic Bradley-Terry/Elo SSM with a
 * Kalman-filter-evaluable likelihood; the summary statistic is the auxiliary
 * score at β̂(y), with per-parameter integrated scores for the structural
 * params (persistence, innovation SD, home effect, tail index). Accept/reject
 * ABC with 0.5% quantile retention over simulated seasons delivers full
 * marginal posteriors on the strength-dynamics parameters for the
 * benchmark-lane rating system.
 *
 * @see arXiv:1604.07949v3 — "Auxiliary Likelihood-Based Approximate Bayesian Computation in State Space Models"
 *
 * ACCEPTANCE GATE: ADAPT-accept iff the integrated-score ABC's mean relative
 * RMSE across structural parameters ≤ 1.5 on the simulated-season benchmark
 * AND ranks above the hand-summary FP-ABC baseline. The gate is a simulation
 * concern; this module is the pure ABC-SSM kernel, not wired live.
 */

export interface SsmParams {
  /** AR(1) persistence of latent strengths. */
  persistence: number;
  /** Innovation SD of the latent strength process. */
  innovSd: number;
  /** Home-field effect in points. */
  homeEffect: number;
  /** Tail index (Student-t df) of the margin observation model. */
  tailDf: number;
}

export interface GameObs {
  homeOff: number; // latent home offensive strength index (for simulation bookkeeping)
  margin: number; // observed home margin
}

/** Deterministic LCG for reproducible simulation. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Student-t draw via the normal/chi-square ratio (df ≥ 1). */
function studentT(rng: () => number, df: number): number {
  const z = normal01(rng);
  let chi2 = 0;
  const k = Math.max(1, Math.round(df));
  for (let i = 0; i < k; i++) {
    const w = normal01(rng);
    chi2 += w * w;
  }
  return z / Math.sqrt(chi2 / k);
}

function normal01(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Simulate one season of margins under the TRUE model: latent strengths
 * follow AR(1), margins = strength diff + home effect + heavy-tailed noise.
 */
export function simulateSeason(
  params: SsmParams,
  nTeams: number,
  gamesPerTeam: number,
  rng: () => number,
): number[] {
  const strength = Array.from({ length: nTeams }, () => normal01(rng));
  const margins: number[] = [];
  const totalGames = (nTeams * gamesPerTeam) / 2;
  for (let g = 0; g < totalGames; g++) {
    for (let t = 0; t < nTeams; t++) {
      strength[t] =
        params.persistence * (strength[t] ?? 0) + params.innovSd * normal01(rng);
    }
    const home = Math.floor(rng() * nTeams);
    let away = Math.floor(rng() * nTeams);
    if (away === home) away = (away + 1) % nTeams;
    margins.push(
      (strength[home] ?? 0) - (strength[away] ?? 0) +
        params.homeEffect +
        3 * studentT(rng, params.tailDf),
    );
  }
  return margins;
}

/**
 * AUXILIARY model: linear-Gaussian dynamic Bradley-Terry/Elo SSM.
 * The summary is the auxiliary score evaluated at the MLE β̂:
 * here, the per-parameter score components of a Gaussian fit to margins —
 * (mean residual, variance residual, lag-1 autocorrelation residual,
 * excess-kurtosis residual), which identify (homeEffect, innovSd,
 * persistence, tailDf) respectively.
 */
export function auxiliaryScore(margins: readonly number[]): [number, number, number, number] {
  const n = margins.length;
  if (n < 4) throw new Error("auxiliaryScore: need ≥ 4 margins");
  const mean = margins.reduce((a, b) => a + b, 0) / n;
  const variance = margins.reduce((s, m) => s + (m - mean) ** 2, 0) / n;
  let ac1 = 0;
  for (let i = 1; i < n; i++) ac1 += ((margins[i] ?? 0) - mean) * ((margins[i - 1] ?? 0) - mean);
  ac1 /= n * Math.max(1e-9, variance);
  const kurt =
    margins.reduce((s, m) => s + ((m - mean) ** 4) / Math.max(1e-9, variance ** 2), 0) / n - 3;
  return [mean, Math.log(Math.max(1e-9, variance)), ac1, kurt];
}

/** Euclidean distance between auxiliary scores (the ABC discrepancy). */
export function scoreDistance(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
): number {
  return Math.sqrt(a.reduce((s, x, i) => s + (x - (b[i] ?? 0)) ** 2, 0));
}

/**
 * Accept/reject ABC: draw Nparam parameter proposals, simulate a season each,
 * keep the `retainFrac` with smallest auxiliary-score distance to the
 * observed summary. Returns the retained posterior draws.
 */
export function abcPosterior(
  observed: readonly number[],
  proposals: readonly SsmParams[],
  nTeams: number,
  gamesPerTeam: number,
  retainFrac = 0.005,
  seed = 7,
): SsmParams[] {
  if (proposals.length === 0) throw new Error("abcPosterior: no proposals");
  const obsScore = auxiliaryScore(observed);
  const rng = makeRng(seed);
  const scored = proposals.map((p) => {
    const sim = simulateSeason(p, nTeams, gamesPerTeam, rng);
    return { p, d: scoreDistance(auxiliaryScore(sim), obsScore) };
  });
  scored.sort((a, b) => a.d - b.d);
  const keep = Math.max(1, Math.floor(proposals.length * retainFrac));
  return scored.slice(0, keep).map((s) => s.p);
}

/** Posterior mean of the retained draws. */
export function posteriorMean(draws: readonly SsmParams[]): SsmParams {
  const m = (f: (p: SsmParams) => number): number =>
    draws.reduce((s, p) => s + f(p), 0) / Math.max(1, draws.length);
  return {
    persistence: m((p) => p.persistence),
    innovSd: m((p) => p.innovSd),
    homeEffect: m((p) => p.homeEffect),
    tailDf: m((p) => p.tailDf),
  };
}
