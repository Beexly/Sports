/**
 * Performance confidence intervals for CONTINUOUS returns (ROI, units, average
 * edge) — the honest counterpart to the Wilson interval, which only covers
 * binomial proportions (win rate, beat-close rate).
 *
 * Win rate is a proportion -> Wilson (model-limitations.ts). ROI / units / P&L
 * is a MEAN OF SKEWED CONTINUOUS returns -> the normal approximation lies (a few
 * big winners skew it) and Wilson does not apply. The right tool is the
 * BOOTSTRAP, and for small, skewed sports samples the bias-corrected and
 * accelerated (BCa) bootstrap (Efron & Tibshirani 1993) has the best coverage.
 *
 * Two design commitments make this fit GSE's trust doctrine, not just its math:
 *  1. DETERMINISTIC. A public performance claim's uncertainty band must be
 *     reproducible by anyone from the same sealed ledger, or it is not
 *     verifiable. The bootstrap RNG is seeded; the same returns + seed always
 *     yield the identical interval, so the CI itself can live in the receipt.
 *  2. HONEST BY CONSTRUCTION. The interval is reported next to the point
 *     estimate so a skeptic sees the uncertainty, never a falsely precise ROI.
 *
 * Pure, dependency-free, no I/O. The jackknife influence for a mean is exact
 * and O(n) (no optimization machinery needed — the trust-region/Newton solvers
 * some references reach for are irrelevant to a mean; they only matter for
 * fitting complex M-estimators, which a performance ledger does not do).
 */

export type CiMethod = "percentile" | "bca";

export interface PerformanceCi {
  readonly point: number; // observed mean (ROI / units per bet)
  readonly low: number;
  readonly high: number;
  readonly alpha: number; // e.g. 0.05 for a 95% interval
  readonly n: number;
  readonly resamples: number;
  readonly seed: number; // fixed -> the interval is reproducible/auditable
  readonly method: CiMethod;
  /** BCa bias-correction z0 and acceleration a (0 for the percentile method). */
  readonly z0: number;
  readonly acceleration: number;
}

/** Deterministic PRNG (mulberry32) — seeded so the interval is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Linear-interpolated percentile of a SORTED array; p in [0,1]. */
function sortedPercentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (idx - lo) * (sorted[hi]! - sorted[lo]!);
}

/** Error function via Abramowitz-Stegun 7.1.26 (|err| < 1.5e-7). */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Standard-normal CDF, Phi(x) = 0.5 (1 + erf(x/sqrt2)). */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Inverse standard-normal CDF (Acklam), |err| < 1.2e-9. */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("normalQuantile: p in (0,1)");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + 1));
  }
  if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + 1));
}

/**
 * A statistic of a sample: the mean (ROI/units) is the common case, but this is
 * deliberately general. A CONFOUND-ADJUSTED edge — a regression coefficient of
 * outcome on signal after controlling for game volatility/strength — is also a
 * Statistic, and it plugs straight in. That generality is the bridge to the
 * robust M-estimation toolkit (Newton with Levenberg-Marquardt / dogleg /
 * Steihaug-CG safeguards, and Hessian-based influence functions): those are the
 * machinery for FITTING such a statistic on ill-conditioned sports data and for
 * approximating its jackknife influence at scale. The BCa scaffold here consumes
 * whatever statistic that machinery produces.
 */
export type Statistic = (sample: readonly number[]) => number;

export const meanStatistic: Statistic = mean;

function bootstrapStatistic(
  data: readonly number[],
  statistic: Statistic,
  resamples: number,
  seed: number,
): number[] {
  const rng = mulberry32(seed);
  const n = data.length;
  const reps = new Array<number>(resamples);
  const sample = new Array<number>(n);
  for (let b = 0; b < resamples; b++) {
    for (let i = 0; i < n; i++) sample[i] = data[Math.floor(rng() * n)]!;
    reps[b] = statistic(sample);
  }
  reps.sort((x, y) => x - y);
  return reps;
}

/**
 * General bias-corrected & accelerated (BCa) bootstrap CI for ANY statistic of
 * `data` (Efron & Tibshirani 1993). The mean is the common case (bcaMeanCi); a
 * confound-adjusted edge estimate is the reason this is general. Delete-one
 * jackknife computes the acceleration exactly for any statistic. Falls back to a
 * point interval on zero variance; null on too-little / non-finite data.
 */
export function bcaCi(
  data: readonly number[],
  statistic: Statistic,
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): PerformanceCi | null {
  const alpha = opts.alpha ?? 0.05;
  const resamples = opts.resamples ?? 10000;
  const seed = opts.seed ?? 20260702; // FIXED default -> reproducible/auditable
  const n = data.length;
  if (n < 2 || !data.every(Number.isFinite)) return null;

  const point = statistic(data);
  const reps = bootstrapStatistic(data, statistic, resamples, seed);

  // Zero-variance resample distribution: the honest CI is a point.
  if (reps[0] === reps[reps.length - 1]) {
    return { point, low: point, high: point, alpha, n, resamples, seed, method: "bca", z0: 0, acceleration: 0 };
  }

  // Bias correction z0 = Phi^-1( fraction of bootstrap stats < observed ).
  let below = 0;
  for (const r of reps) if (r < point) below++;
  const frac = Math.min(1 - 1e-9, Math.max(1e-9, below / resamples));
  const z0 = normalQuantile(frac);

  // Acceleration a from delete-one jackknife influence (exact for any statistic).
  const jack = new Array<number>(n);
  const without = new Array<number>(n - 1);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j < n; j++) if (j !== i) without[k++] = data[j]!;
    jack[i] = statistic(without);
  }
  const jackMean = mean(jack);
  let s2 = 0;
  let s3 = 0;
  for (const jm of jack) {
    const u = (n - 1) * (jackMean - jm);
    s2 += u * u;
    s3 += u * u * u;
  }
  const acceleration = s2 > 0 ? s3 / (6 * Math.pow(s2, 1.5)) : 0;

  const adjust = (z: number): number => {
    const num = z0 + z;
    const denom = 1 - acceleration * num;
    if (Math.abs(denom) < 1e-9) return normalCdf(z0); // degenerate -> fall toward median
    return normalCdf(z0 + num / denom);
  };
  const aLo = Math.min(1 - 1e-9, Math.max(1e-9, adjust(normalQuantile(alpha / 2))));
  const aHi = Math.min(1 - 1e-9, Math.max(1e-9, adjust(normalQuantile(1 - alpha / 2))));

  return {
    point,
    low: sortedPercentile(reps, aLo),
    high: sortedPercentile(reps, aHi),
    alpha,
    n,
    resamples,
    seed,
    method: "bca",
    z0,
    acceleration,
  };
}

/** General percentile bootstrap CI — the un-corrected baseline for any statistic. */
export function percentileCi(
  data: readonly number[],
  statistic: Statistic,
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): PerformanceCi | null {
  const alpha = opts.alpha ?? 0.05;
  const resamples = opts.resamples ?? 10000;
  const seed = opts.seed ?? 20260702;
  const n = data.length;
  if (n < 2 || !data.every(Number.isFinite)) return null;
  const reps = bootstrapStatistic(data, statistic, resamples, seed);
  return {
    point: statistic(data),
    low: sortedPercentile(reps, alpha / 2),
    high: sortedPercentile(reps, 1 - alpha / 2),
    alpha,
    n,
    resamples,
    seed,
    method: "percentile",
    z0: 0,
    acceleration: 0,
  };
}

/** BCa CI for the MEAN (ROI/units per bet) — the common ledger case. */
export function bcaMeanCi(
  returns: readonly number[],
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): PerformanceCi | null {
  return bcaCi(returns, meanStatistic, opts);
}

/** Percentile CI for the MEAN — the un-corrected baseline. */
export function percentileMeanCi(
  returns: readonly number[],
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): PerformanceCi | null {
  return percentileCi(returns, meanStatistic, opts);
}
