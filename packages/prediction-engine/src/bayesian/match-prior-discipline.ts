/**
 * Bayesian prior discipline for forecasting match outcomes.
 *
 * Cumulative-probit skeleton over ordered NFL outcomes (cover/push/fail,
 * over/push/under):
 *   m_ij = (s_i − s_j) + h
 * Prior mean of team strength regressed on a pre-season external rating
 * (market-implied power ratings from lookahead lines); end-of-season
 * posteriors roll forward as next pre-season priors for (d, h, β, γ_s);
 * analyst/odds-setter views blend as implicit Dirichlet-multinomial
 * pseudo-data with a CV-calibrated weight w_m.
 *
 * @see arXiv:1501.05831 — "A simple Bayesian procedure for forecasting the outcomes of the UEFA Champions League matches"
 *
 * ACCEPTANCE GATE: ADOPT the external-rating regression prior + recursive
 * season roll-forward iff, on 2025 weeks 1–8, it beats the zero-prior
 * cumulative-probit on Brier by ≥ 5% (the paper's early-season effect). The
 * gate is a backtest concern; this module is the pure prior kernel, not wired
 * into any live path.
 */

/** Standard normal CDF (A&S approximation). */
function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp((-x * x) / 2) * poly * 0.3989422804014327;
  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * Cumulative-probit predictive distribution over ordered outcome buckets.
 * @param strengthDiff s_i − s_j (home perspective)
 * @param h home advantage
 * @param cutpoints ordered thresholds c_1 < c_2 < … < c_{K−1}
 * @returns probabilities over K ordered buckets (sums to 1)
 */
export function cumulativeProbitPredict(
  strengthDiff: number,
  h: number,
  cutpoints: readonly number[],
): number[] {
  const m = strengthDiff + h;
  const sorted = [...cutpoints].sort((a, b) => a - b);
  const probs: number[] = [];
  let prev = 0;
  for (const c of sorted) {
    const cum = phi(c - m);
    probs.push(Math.max(0, cum - prev));
    prev = cum;
  }
  probs.push(Math.max(0, 1 - prev));
  const total = probs.reduce((a, b) => a + b, 0);
  return total > 0 ? probs.map((p) => p / total) : probs.map(() => 1 / probs.length);
}

/**
 * Prior-mean regression: team strength prior mean = a + b·externalRating
 * (external = market-implied power rating from lookahead lines). OLS fit.
 */
export function fitPriorRegression(
  externalRatings: readonly number[],
  posteriorStrengths: readonly number[],
): { a: number; b: number } {
  if (externalRatings.length !== posteriorStrengths.length || externalRatings.length < 2) {
    throw new Error("fitPriorRegression: need ≥2 matched observations");
  }
  const n = externalRatings.length;
  const mx = externalRatings.reduce((s, x) => s + x, 0) / n;
  const my = posteriorStrengths.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += ((externalRatings[i] ?? 0) - mx) * ((posteriorStrengths[i] ?? 0) - my);
    sxx += ((externalRatings[i] ?? 0) - mx) ** 2;
  }
  const b = sxx > 0 ? sxy / sxx : 0;
  return { a: my - b * mx, b };
}

/**
 * Dirichlet-multinomial pseudo-data blending of an analyst view:
 * posterior ∝ priorCounts + w_m · viewCounts.
 */
export function blendAnalystView(
  priorCounts: readonly number[],
  viewProbs: readonly number[],
  pseudoN: number,
  wM: number,
): number[] {
  if (priorCounts.length !== viewProbs.length) {
    throw new Error("blendAnalystView: length mismatch");
  }
  if (!(wM >= 0)) throw new Error("blendAnalystView: wM must be ≥ 0");
  const blended = priorCounts.map((c, i) => c + wM * pseudoN * (viewProbs[i] ?? 0));
  const total = blended.reduce((a, b) => a + b, 0);
  return total > 0 ? blended.map((x) => x / total) : blended.map(() => 1 / blended.length);
}

/**
 * Recursive season roll-forward: end-of-season posterior means become next
 * pre-season prior means, shrunk toward the league mean by `shrinkage`.
 */
export function rollForwardPriors(
  posteriorMeans: Readonly<Record<string, number>>,
  shrinkage = 0.25,
): Record<string, number> {
  const vals = Object.values(posteriorMeans);
  const leagueMean = vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
  const out: Record<string, number> = {};
  for (const [team, mu] of Object.entries(posteriorMeans)) {
    out[team] = (1 - shrinkage) * mu + shrinkage * leagueMean;
  }
  return out;
}
