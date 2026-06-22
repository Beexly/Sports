/**
 * GSE Projection Models — net-new, dependency-free implementations of the
 * highest-leverage modeling methods the `analytics-methods` GAP analysis flagged.
 *
 * These are pure functions, kept in the tested `lib/gse` zone (not yet wired into
 * the live `packages/prediction-engine`, which already ships Elo/Poisson/Shin
 * de-vig/Kelly/CLV). They are the building blocks the next agent integrates:
 *
 *   - glicko2Update            — uncertainty-aware ratings (Elo + RD + volatility)
 *   - blackLittermanBlend      — precision-weighted model⊕market fusion
 *   - dixonColesTau            — low-score correlation correction for soccer
 *   - americanToImpliedProb    — odds → implied probability
 *   - removeVigProportional    — simple multiplicative de-vig (complements Shin)
 *   - conformalProjectionInterval — distribution-free projection ranges
 *
 * Companion doc: docs/research/GSE_2026_TRUST_LOOP_AND_MODELS.md
 */

import { splitConformalHalfWidth } from "./analytics-methods";

const clamp01 = (p: number): number => (p < 1e-9 ? 1e-9 : p > 1 - 1e-9 ? 1 - 1e-9 : p);
const logit = (p: number): number => Math.log(clamp01(p) / (1 - clamp01(p)));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

// ─────────────────────────────────────────────────────────────────────────────
// Odds / de-vig utilities
// ─────────────────────────────────────────────────────────────────────────────

/** American odds → implied probability (includes the book's margin). */
export function americanToImpliedProb(american: number): number {
  if (american === 0) return 0.5;
  return american > 0 ? 100 / (american + 100) : -american / (-american + 100);
}

/**
 * Proportional (multiplicative) de-vig: normalise a set of implied probabilities
 * so they sum to 1. Simpler than Shin (which the engine already has) and a useful
 * cross-check — large disagreement between the two flags an outlier book.
 */
export function removeVigProportional(impliedProbs: readonly number[]): number[] {
  const sum = impliedProbs.reduce((s, p) => s + Math.max(0, p), 0);
  if (sum <= 0) return impliedProbs.map(() => 0);
  return impliedProbs.map((p) => Math.max(0, p) / sum);
}

// ─────────────────────────────────────────────────────────────────────────────
// Black-Litterman-style blend (model ⊕ market)
// ─────────────────────────────────────────────────────────────────────────────

export interface BlendResult {
  /** Posterior probability after blending the market prior with the model view. */
  readonly probability: number;
  /** Combined precision (market + model). Higher = tighter posterior. */
  readonly precision: number;
  readonly weightMarket: number;
  readonly weightModel: number;
}

/**
 * Blend a market-implied prior with a model view, weighted by each side's
 * precision (inverse variance / confidence), working in log-odds space. This is
 * the Black-Litterman idea — anchor on the market, tilt by your view in
 * proportion to how confident you are — reduced to the binary-probability case.
 *
 * `marketConfidence` / `modelConfidence` are non-negative precisions (any scale;
 * only their ratio matters). The posterior precision is their sum, so blending
 * two independent estimates is never less certain than either alone.
 */
export function blackLittermanBlend(
  marketProb: number,
  modelProb: number,
  marketConfidence: number,
  modelConfidence: number,
): BlendResult {
  const cm = Math.max(0, marketConfidence);
  const cv = Math.max(0, modelConfidence);
  const total = cm + cv;
  if (total <= 0) {
    return { probability: 0.5, precision: 0, weightMarket: 0.5, weightModel: 0.5 };
  }
  const wMarket = cm / total;
  const wModel = cv / total;
  const blendedLogit = wMarket * logit(marketProb) + wModel * logit(modelProb);
  return {
    probability: sigmoid(blendedLogit),
    precision: total,
    weightMarket: wMarket,
    weightModel: wModel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dixon-Coles low-score correction (soccer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dixon-Coles τ correction factor for low-scoring soccer outcomes, which the
 * independence assumption of a plain bivariate Poisson misprices. `lambda` and
 * `mu` are the home/away expected goals; `rho` is the dependence parameter
 * (typically small and negative). Returns 1 for any scoreline outside {0,1}².
 */
export function dixonColesTau(homeGoals: number, awayGoals: number, lambda: number, mu: number, rho: number): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambda * mu * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + mu * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conformal projection interval
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectionInterval {
  readonly low: number;
  readonly point: number;
  readonly high: number;
  /** Nominal coverage (1 - alpha). */
  readonly coverage: number;
}

/**
 * Wrap a point projection in a distribution-free interval using split-conformal
 * calibration over historical residuals (actual − projected). The interval is
 * `point ± q`, where `q` is the (1-alpha) quantile of past absolute residuals —
 * an honest "safe / balanced / upside" band that does not assume normality.
 */
export function conformalProjectionInterval(
  point: number,
  residuals: readonly number[],
  alpha = 0.1,
): ProjectionInterval {
  const h = splitConformalHalfWidth(residuals, alpha);
  return { low: point - h, point, high: point + h, coverage: 1 - alpha };
}

// ─────────────────────────────────────────────────────────────────────────────
// Glicko-2 rating update
// ─────────────────────────────────────────────────────────────────────────────

export interface Glicko2Rating {
  readonly rating: number; // e.g. 1500
  readonly rd: number; // rating deviation, e.g. 350 (new) … 50 (established)
  readonly volatility: number; // σ, e.g. 0.06
}

export interface Glicko2Opponent {
  readonly rating: number;
  readonly rd: number;
  /** 1 = win, 0 = loss, 0.5 = draw. */
  readonly score: number;
}

const GLICKO2_SCALE = 173.7178;

/**
 * Glicko-2 rating update over a rating period (Glickman 2013). Returns the new
 * rating, RD, and volatility. Unlike Elo, it tracks uncertainty (RD) and how
 * erratic a competitor's results are (volatility) — so a confident rating and an
 * uncertain one are never treated alike. With no opponents, only RD widens.
 *
 * Verified against Glickman's worked example (1500/200/0.06 vs three opponents →
 * ~1464.06 / ~151.52 / ~0.05999).
 */
export function glicko2Update(
  player: Glicko2Rating,
  opponents: readonly Glicko2Opponent[],
  tau = 0.5,
): Glicko2Rating {
  const mu = (player.rating - 1500) / GLICKO2_SCALE;
  const phi = player.rd / GLICKO2_SCALE;
  const sigma = player.volatility;

  // No games: RD increases by the volatility step; rating/volatility unchanged.
  if (opponents.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: player.rating, rd: phiStar * GLICKO2_SCALE, volatility: sigma };
  }

  const g = (p: number): number => 1 / Math.sqrt(1 + (3 * p * p) / (Math.PI * Math.PI));
  const expected = (mj: number, pj: number): number => 1 / (1 + Math.exp(-g(pj) * (mu - mj)));

  let vInv = 0;
  let deltaSum = 0;
  for (const opp of opponents) {
    const mj = (opp.rating - 1500) / GLICKO2_SCALE;
    const pj = opp.rd / GLICKO2_SCALE;
    const e = expected(mj, pj);
    const gj = g(pj);
    vInv += gj * gj * e * (1 - e);
    deltaSum += gj * (opp.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Volatility update via the Illinois (regula-falsi) algorithm.
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  let iter = 0;
  while (Math.abs(B - A) > 1e-6 && iter < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iter += 1;
  }
  const sigmaPrime = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + vInv);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  return {
    rating: GLICKO2_SCALE * muPrime + 1500,
    rd: GLICKO2_SCALE * phiPrime,
    volatility: sigmaPrime,
  };
}
