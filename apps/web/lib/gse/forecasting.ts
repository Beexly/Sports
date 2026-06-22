/**
 * GSE Forecasting Toolkit — the calibration/scoring/selection methods that deepen
 * the product's core moat (honest, calibrated probability) and feed the
 * self-learning loop. Pure, dependency-free, tested.
 *
 * Complements `packages/prediction-engine` (Brier/ECE) and the GSE primitives in
 * `analytics-methods.ts` (opinion pools, conformal, isotonic). New here:
 *   - brierDecomposition   — reliability / resolution / uncertainty
 *   - logLoss              — proper score for probabilistic forecasts
 *   - crpsGaussian / crpsEnsemble — CRPS for full predictive distributions
 *   - plattScale / temperatureScale — parametric recalibration
 *   - kalmanFilterSeries   — state-space in-season "form" tracking
 *   - ucb1Select           — deterministic bandit for model/strategy selection
 *
 * Companion doc: docs/research/GSE_2026_FORECASTING_AND_SCORELINE.md
 */

const clamp01 = (p: number): number => (p < 1e-12 ? 1e-12 : p > 1 - 1e-12 ? 1 - 1e-12 : p);
const logit = (p: number): number => Math.log(clamp01(p) / (1 - clamp01(p)));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

// Abramowitz-Stegun erf approximation (≈1e-7) → standard normal CDF/pdf.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
const normCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));
const normPdf = (z: number): number => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);

// ─────────────────────────────────────────────────────────────────────────────
// Proper scores
// ─────────────────────────────────────────────────────────────────────────────

/** Mean log loss (a.k.a. cross-entropy / logarithmic score). Lower is better. */
export function logLoss(predictions: readonly number[], outcomes: readonly (0 | 1)[]): number {
  const n = Math.min(predictions.length, outcomes.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = clamp01(predictions[i]!);
    acc += outcomes[i] === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return acc / n;
}

export interface BrierDecomposition {
  readonly brier: number;
  readonly reliability: number; // lower is better (calibration error)
  readonly resolution: number; // higher is better (discrimination)
  readonly uncertainty: number; // base-rate variance (irreducible)
}

/**
 * Murphy's decomposition of the Brier score into reliability − resolution +
 * uncertainty over `nBins` probability bins. Reliability is calibration error
 * (want low); resolution is how much forecasts separate outcomes (want high);
 * uncertainty is the base-rate variance you can't reduce.
 */
export function brierDecomposition(
  predictions: readonly number[],
  outcomes: readonly (0 | 1)[],
  nBins = 10,
): BrierDecomposition {
  const n = Math.min(predictions.length, outcomes.length);
  if (n === 0) return { brier: 0, reliability: 0, resolution: 0, uncertainty: 0 };

  let brier = 0;
  let baseRate = 0;
  for (let i = 0; i < n; i++) {
    const p = clamp01(predictions[i]!);
    const y = outcomes[i]!;
    brier += (p - y) * (p - y);
    baseRate += y;
  }
  brier /= n;
  baseRate /= n;

  const bins = Math.max(2, nBins);
  const cnt = Array(bins).fill(0) as number[];
  const sumP = Array(bins).fill(0) as number[];
  const sumY = Array(bins).fill(0) as number[];
  for (let i = 0; i < n; i++) {
    const p = clamp01(predictions[i]!);
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
    cnt[idx]! += 1;
    sumP[idx]! += p;
    sumY[idx]! += outcomes[i]!;
  }

  let reliability = 0;
  let resolution = 0;
  for (let k = 0; k < bins; k++) {
    if (cnt[k]! === 0) continue;
    const pk = sumP[k]! / cnt[k]!;
    const ok = sumY[k]! / cnt[k]!;
    reliability += cnt[k]! * (pk - ok) * (pk - ok);
    resolution += cnt[k]! * (ok - baseRate) * (ok - baseRate);
  }
  reliability /= n;
  resolution /= n;
  const uncertainty = baseRate * (1 - baseRate);

  return { brier, reliability, resolution, uncertainty };
}

/**
 * Closed-form CRPS for a Gaussian predictive distribution N(mu, sigma²) against
 * an observation. CRPS generalises absolute error to full distributions — a
 * sharp, well-centered forecast scores best. Lower is better.
 */
export function crpsGaussian(mu: number, sigma: number, observation: number): number {
  const s = Math.max(1e-9, sigma);
  const z = (observation - mu) / s;
  return s * (z * (2 * normCdf(z) - 1) + 2 * normPdf(z) - 1 / Math.sqrt(Math.PI));
}

/**
 * Empirical CRPS for an ensemble of samples against an observation:
 * mean|s − x| − ½·mean|sᵢ − sⱼ|. Lower is better; a tight ensemble on the
 * observation scores near 0.
 */
export function crpsEnsemble(samples: readonly number[], observation: number): number {
  const m = samples.length;
  if (m === 0) return 0;
  let term1 = 0;
  for (const s of samples) term1 += Math.abs(s - observation);
  term1 /= m;
  let term2 = 0;
  for (const a of samples) for (const b of samples) term2 += Math.abs(a - b);
  term2 /= m * m;
  return term1 - 0.5 * term2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parametric recalibration
// ─────────────────────────────────────────────────────────────────────────────

export interface PlattParams {
  readonly a: number;
  readonly b: number;
}

/**
 * Fit Platt scaling p' = sigmoid(a·score + b) via IRLS (Newton's method for
 * logistic regression with one feature). Turns uncalibrated scores into
 * calibrated probabilities. Returns {a, b}; apply with {@link applyPlatt}.
 */
export function plattScale(scores: readonly number[], outcomes: readonly (0 | 1)[]): PlattParams {
  const n = Math.min(scores.length, outcomes.length);
  if (n === 0) return { a: 1, b: 0 };
  let b0 = 0;
  let a1 = 0;
  for (let iter = 0; iter < 25; iter++) {
    // Accumulate gradient and 2x2 Hessian of the negative log-likelihood.
    let g0 = 0;
    let g1 = 0;
    let h00 = 0;
    let h01 = 0;
    let h11 = 0;
    for (let i = 0; i < n; i++) {
      const s = scores[i]!;
      const p = sigmoid(b0 + a1 * s);
      const w = Math.max(1e-9, p * (1 - p));
      const err = outcomes[i]! - p;
      g0 += err;
      g1 += err * s;
      h00 += w;
      h01 += w * s;
      h11 += w * s * s;
    }
    const det = h00 * h11 - h01 * h01;
    if (Math.abs(det) < 1e-12) break;
    // Newton step: β += H⁻¹ g.
    const d0 = (h11 * g0 - h01 * g1) / det;
    const d1 = (-h01 * g0 + h00 * g1) / det;
    b0 += d0;
    a1 += d1;
    if (Math.abs(d0) < 1e-9 && Math.abs(d1) < 1e-9) break;
  }
  return { a: a1, b: b0 };
}

/** Apply fitted Platt parameters to a raw score → calibrated probability. */
export function applyPlatt(params: PlattParams, score: number): number {
  return sigmoid(params.a * score + params.b);
}

/**
 * Fit a single temperature T > 0 that minimises log loss of
 * sigmoid(logit(p)/T) via golden-section search. T > 1 softens an
 * over-confident model; T < 1 sharpens an under-confident one.
 */
export function temperatureScale(predictions: readonly number[], outcomes: readonly (0 | 1)[]): number {
  const loss = (T: number): number => logLoss(predictions.map((p) => sigmoid(logit(p) / T)), outcomes);
  let lo = 0.05;
  let hi = 10;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 60; i++) {
    if (loss(c) < loss(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  return (lo + hi) / 2;
}

/** Apply a temperature to a probability. */
export function applyTemperature(p: number, T: number): number {
  return sigmoid(logit(p) / Math.max(1e-6, T));
}

// ─────────────────────────────────────────────────────────────────────────────
// State-space "form" tracking (1D Kalman filter)
// ─────────────────────────────────────────────────────────────────────────────

export interface KalmanState {
  readonly mean: number;
  readonly variance: number;
}

export interface KalmanOptions {
  /** Process variance — how fast true form drifts (higher = more reactive). */
  readonly processVar: number;
  /** Observation variance — how noisy each result is (higher = more smoothing). */
  readonly obsVar: number;
  readonly init: KalmanState;
}

/** One Kalman predict+update step for a latent 1D state given an observation. */
export function kalmanStep(state: KalmanState, observation: number, processVar: number, obsVar: number): KalmanState {
  const predVar = state.variance + processVar;
  const gain = predVar / (predVar + obsVar);
  return { mean: state.mean + gain * (observation - state.mean), variance: (1 - gain) * predVar };
}

/**
 * Run a 1D Kalman filter over a series of observations to track latent "form"
 * that reacts to new results without overreacting to noise. Returns the filtered
 * state after each observation.
 */
export function kalmanFilterSeries(observations: readonly number[], opts: KalmanOptions): KalmanState[] {
  const out: KalmanState[] = [];
  let state = opts.init;
  for (const obs of observations) {
    state = kalmanStep(state, obs, opts.processVar, opts.obsVar);
    out.push(state);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bandit selection (deterministic UCB1) — for choosing among models/strategies
// ─────────────────────────────────────────────────────────────────────────────

export interface BanditArm {
  readonly pulls: number;
  /** Sum of rewards observed (rewards in [0,1] for the standard bound). */
  readonly totalReward: number;
}

/**
 * UCB1 arm selection: explore any unpulled arm first, otherwise pick the arm
 * maximising mean + sqrt(2·ln N / nᵢ). Deterministic (no RNG), so it is testable
 * and reproducible — appropriate for choosing which model/strategy to trust as
 * evidence accrues in the self-learning loop.
 */
export function ucb1Select(arms: readonly BanditArm[]): number {
  if (arms.length === 0) return -1;
  const totalPulls = arms.reduce((s, a) => s + a.pulls, 0);
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < arms.length; i++) {
    const arm = arms[i]!;
    if (arm.pulls === 0) return i; // explore an untried arm immediately
    const mean = arm.totalReward / arm.pulls;
    const bonus = Math.sqrt((2 * Math.log(Math.max(1, totalPulls))) / arm.pulls);
    const score = mean + bonus;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}
