/**
 * Model-market persuadability screen (arXiv 2008.05203).
 *
 * Per component model and game, regress the model's log-odds forecast on
 * contemporaneous market log-odds:
 *   model_logit = alpha + beta * market_logit + eps
 * slope = market-beta_iw. Models with market-beta near 1 are mostly
 * parroting the market; downweight them in aggregation proportionally to
 * their orthogonal share (1 - R^2 of the market regression): weight_i
 * propto the fraction of the model's log-odds variation the market does
 * NOT explain. A model that adds no orthogonal information gets no say.
 *
 * (The companion full-information market-feed rule — ingest the complete
 * line evolution rather than curated 'top steam picks' — is a data-pipeline
 * rule with no code surface here.)
 *
 * ACCEPTANCE GATE: ADOPT the orthogonal-information weighting if, on 2025
 * data, it beats the equal-weight ensemble on full-season Brier, and beats
 * it by a larger margin on the hard-game subset (top-tercile closing-line
 * uncertainty).
 *
 * Research-only module. Not wired into any live aggregation path.
 */

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

export function logit(p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(c / (1 - c));
}

export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface MarketBeta {
  /** Slope of the model's log-odds on market log-odds. */
  beta: number;
  intercept: number;
  /** R^2 of the market regression. */
  r2: number;
  /** Residual (orthogonal) variance. */
  residualVar: number;
  /**
   * Orthogonal share = 1 - R^2: the fraction of the model's log-odds
   * variation NOT explained by the market. A market parrot (beta ~= 1,
   * R^2 ~= 1) has orthogonal share near 0 and is downweighted; a model
   * carrying independent information has share near 1.
   */
  orthogonalShare: number;
}

/**
 * Regress one model's log-odds series on the market log-odds series.
 * Both series are probabilities of the same outcome over games/weeks.
 */
export function marketBeta(
  modelProbs: readonly number[],
  marketProbs: readonly number[],
): MarketBeta {
  if (modelProbs.length !== marketProbs.length) {
    throw new Error("marketBeta: length mismatch");
  }
  const n = modelProbs.length;
  if (n < 3) throw new Error("marketBeta: need >= 3 observations");
  const y = modelProbs.map(logit);
  const x = marketProbs.map(logit);
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += ((x[i] as number) - mx) ** 2;
    sxy += ((x[i] as number) - mx) * ((y[i] as number) - my);
  }
  if (sxx < 1e-300) throw new Error("marketBeta: market series is constant");
  const beta = sxy / sxx;
  const intercept = my - beta * mx;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const r = (y[i] as number) - (intercept + beta * (x[i] as number));
    ssRes += r * r;
    ssTot += ((y[i] as number) - my) ** 2;
  }
  const residualVar = ssRes / Math.max(1, n - 2);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return {
    beta,
    intercept,
    r2,
    residualVar,
    orthogonalShare: Math.max(0, Math.min(1, 1 - r2)),
  };
}

/**
 * Orthogonal-information aggregation weights: weight_i propto the model's
 * orthogonal share (1 - R^2), optionally tempered toward equal weights.
 * temper in [0,1]: 0 = pure orthogonal weights, 1 = equal weights.
 */
export function orthogonalWeights(
  betas: readonly MarketBeta[],
  temper = 0,
): number[] {
  if (betas.length === 0) throw new Error("orthogonalWeights: no models");
  if (temper < 0 || temper > 1) throw new Error("orthogonalWeights: temper in [0,1]");
  const raw = betas.map((b) => b.orthogonalShare);
  const sum = raw.reduce((a, w) => a + w, 0);
  const m = raw.length;
  if (sum <= 1e-300) return raw.map(() => 1 / m); // all parrots: fall back to equal
  return raw.map((w) => (1 - temper) * (w / sum) + temper * (1 / m));
}

/**
 * Aggregate one game's model probabilities with orthogonal weights,
 * computed from trailing market-beta fits.
 */
export function persuadabilityAggregate(
  gameProbs: readonly number[],
  betas: readonly MarketBeta[],
  temper = 0,
): number {
  if (gameProbs.length !== betas.length) {
    throw new Error("persuadabilityAggregate: length mismatch");
  }
  const w = orthogonalWeights(betas, temper);
  return gameProbs.reduce((a, p, i) => a + p * (w[i] as number), 0);
}
