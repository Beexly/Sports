/**
 * Wilson score interval — the honest answer to the hostile-quant attack
 * "your edge is just small-sample variance."
 *
 * A beat-close rate of 60% means very different things over 10 picks vs 1,000.
 * The Wilson score interval puts an honest 95% confidence band around a binomial
 * proportion (beat-close rate, calibration-bin accuracy) and — unlike the naive
 * normal approximation — stays inside [0,1] and behaves well for small n and for
 * rates near 0 or 1. We surface the band next to the point estimate so a skeptic
 * sees the uncertainty, not a falsely precise number.
 *
 * Pure, dependency-free, fully unit-testable.
 */

export interface WilsonInterval {
  /** Point estimate p̂ = successes / n, in 0..1. */
  readonly point: number;
  /** Lower bound of the interval, clamped to 0..1. */
  readonly low: number;
  /** Upper bound of the interval, clamped to 0..1. */
  readonly high: number;
  readonly n: number;
  /** z used (1.96 ≈ 95%). */
  readonly z: number;
}

/** z for the common two-sided confidence levels. Default 95%. */
export const Z_95 = 1.959963984540054;
export const Z_90 = 1.6448536269514722;
export const Z_99 = 2.5758293035489004;

/**
 * Wilson score interval for `successes` out of `n` Bernoulli trials. Returns null
 * for a non-positive or non-finite n (no honest interval exists with zero data).
 * `successes` is clamped to [0, n] defensively.
 */
export function wilsonInterval(successes: number, n: number, z: number = Z_95): WilsonInterval | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const total = Math.floor(n);
  const k = Math.min(total, Math.max(0, Math.floor(successes)));
  const p = k / total;

  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;

  return {
    point: round(p, 4),
    low: round(clamp01(center - margin), 4),
    high: round(clamp01(center + margin), 4),
    n: total,
    z,
  };
}

/** Format a Wilson interval as a percentage band, e.g. "48.1–71.9%". */
export function formatWilsonPct(ci: WilsonInterval, decimals = 1): string {
  return `${(ci.low * 100).toFixed(decimals)}–${(ci.high * 100).toFixed(decimals)}%`;
}

/**
 * Whether the interval clears a reference rate — i.e. the LOWER bound is above it.
 * Use to answer "is the beat-close rate honestly above the 52.4% vig break-even?"
 * rather than reading the point estimate alone. A point of 0.6 over n=12 may have a
 * lower bound below 0.524 — meaning we cannot yet claim we beat break-even.
 */
export function clearsThreshold(ci: WilsonInterval, threshold: number): boolean {
  return ci.low > threshold;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
