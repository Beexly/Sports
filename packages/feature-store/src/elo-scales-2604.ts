/**
 * Elo optimal scaling: ranking scale vs prediction scale, maturity, noise correction
 *
 * Research port: arXiv:2604.03840
 * Normalized lane: markets | Doctrine: BASELINE
 *
 * Pure port of the paper's practitioner insights: split Elo into a ranking
 * scale (published) and a prediction scale fit by monthly logistic regression
 * of outcomes on rating differences; compute tau = 4s/K per team as a
 * "rating maturity" indicator that widens published uncertainty for
 * low-experience teams; apply the closed-form noise correction v = sK/2 to
 * the rating covariance in downstream simulations. s is the logistic scale
 * from the monthly fit, K the Elo update factor.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if optimal-scaling Elo beats conventional
 * Elo on 2024 NFL walk-forward log score by >=0.005 with the paper's
 * direction replicated (no-HFA < HFA < optimal scaling ordering preserved);
 * calibration gate: low-maturity teams' 70% WP intervals must cover at a rate
 * statistically below high-maturity teams'.
 */

export interface ScaledElo {
  /** published ranking-scale rating */
  rankingRating: number;
  /** prediction-scale coefficient: WP = sigma(s * diff) with fitted s */
  logisticScale: number;
  /** games informing this team's rating */
  gamesPlayed: number;
  /** Elo K factor used */
  k: number;
}

/** Rating maturity tau = 4s/K: higher = more mature (tighter uncertainty). */
export function ratingMaturity(e: ScaledElo): number {
  if (e.k <= 0) return 0;
  return (4 * e.logisticScale * e.gamesPlayed) / e.k;
}

/**
 * Closed-form noise correction v = sK/2 applied to the rating covariance:
 * returns the variance inflation for downstream simulation draws.
 */
export function noiseCorrectionVariance(logisticScale: number, k: number): number {
  if (!(logisticScale > 0) || !(k > 0)) return Number.NaN;
  return (logisticScale * k) / 2;
}

/** Prediction-scale win probability from a rating difference. */
export function predictionScaleWp(ratingDiff: number, logisticScale: number): number {
  if (!Number.isFinite(ratingDiff) || !(logisticScale > 0)) return Number.NaN;
  return 1 / (1 + Math.exp(-logisticScale * ratingDiff));
}

export interface MonthlyFit {
  logisticScale: number;
  /** months of data in the fit */
  months: number;
}

/**
 * Monthly logistic regression of outcomes on rating differences (1-D
 * Newton-Raphson for the scale parameter s). Returns the fitted scale.
 */
export function fitLogisticScale(diffs: number[], outcomes: number[]): MonthlyFit {
  const n = diffs.length;
  if (n === 0 || outcomes.length !== n) return { logisticScale: Number.NaN, months: 0 };
  let s = 0.005;
  for (let iter = 0; iter < 100; iter++) {
    let grad = 0;
    let hess = 0;
    for (let i = 0; i < n; i++) {
      const d = diffs[i] ?? 0;
      const y = outcomes[i] ?? 0;
      const p = 1 / (1 + Math.exp(-s * d));
      grad += d * (y - p);
      hess -= d * d * p * (1 - p);
    }
    if (Math.abs(hess) < 1e-12) break;
    const step = grad / hess;
    s -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return { logisticScale: s > 0 ? s : Number.NaN, months: n };
}

export interface MaturityCoverage {
  lowMaturityCover: number;
  highMaturityCover: number;
  /** low-maturity 70% intervals cover at a statistically lower rate */
  lowCoversLess: boolean;
}

/**
 * Calibration gate: compare 70% WP-interval coverage between low-maturity
 * (tau below median) and high-maturity teams. Uses a one-sided two-proportion
 * z-test at 5%.
 */
export function maturityCoverageGate(
  teams: Array<{ tau: number; intervalCovered: boolean }>,
): MaturityCoverage {
  const sorted = [...teams].sort((a, b) => a.tau - b.tau);
  const half = Math.floor(sorted.length / 2);
  const low = sorted.slice(0, half);
  const high = sorted.slice(sorted.length - half);
  const cover = (ts: typeof teams): number =>
    ts.length === 0 ? Number.NaN : ts.filter((t) => t.intervalCovered).length / ts.length;
  const pl = cover(low);
  const ph = cover(high);
  let lowCoversLess = false;
  if (Number.isFinite(pl) && Number.isFinite(ph) && low.length > 0 && high.length > 0) {
    const pPool = (low.filter((t) => t.intervalCovered).length + high.filter((t) => t.intervalCovered).length) / (low.length + high.length);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / low.length + 1 / high.length));
    const z = se > 0 ? (ph - pl) / se : 0;
    lowCoversLess = z > 1.645;
  }
  return { lowMaturityCover: pl, highMaturityCover: ph, lowCoversLess };
}

export const GSE_ELO_SCALES_ENABLED = false;
