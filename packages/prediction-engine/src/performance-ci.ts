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

export type CiMethod = "percentile" | "bca" | "studentized" | "empirical-bernstein";

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
  /**
   * Studentized bootstrap-t pivot quantiles and the plug-in standard error, when
   * method === "studentized". A receipt can carry these so a skeptic re-derives
   * the interval as point - tHigh*se .. point - tLow*se (the inversion). Absent
   * for percentile/BCa. NOTE: on heavily lopsided ledgers a bound can be
   * +/-Infinity — the honest "bootstrap-t cannot bound this side from this
   * ledger" answer (see degenerateResamples).
   */
  readonly tLow?: number;
  readonly tHigh?: number;
  readonly standardError?: number;
  /**
   * Count of degenerate resamples (all draws identical -> se* = 0). These are a
   * CENSORED TAIL of the pivot distribution, not noise: an all-modal-value
   * resample puts theta* at an extreme with se* = 0, i.e. the pivot is properly
   * +/-Infinity. They are assigned signed infinite pivots so a heavy degenerate
   * fraction honestly widens (or unbounds) the interval instead of silently
   * narrowing it. Disclosed on the receipt so a skeptic sees the regime.
   */
  readonly degenerateResamples?: number;
  /**
   * Skewness (Fisher-Pearson g1) of the studentized pivot distribution t*
   * itself — a DIAGNOSTIC, not a certification. Near 0 = the pivot is close to
   * symmetric, the regime where the second-order theory motivating bootstrap-t
   * applies most cleanly; large magnitude = the quantile inversion leans on a
   * skewed pivot and the second-order-accuracy claim is weaker for this ledger.
   * It does NOT mean the interval is wrong (BCa and empirical-Bernstein remain
   * valid cross-checks), and no pass/fail threshold is asserted. ABSENT
   * (undefined) whenever any degenerate (infinite) pivots exist — a skewness
   * computed over only the finite subset would silently drop exactly the
   * asymmetric tail being diagnosed, overclaiming symmetry precisely where the
   * pivot is least trustworthy (the same bug class as imputing t*=0, fixed in
   * this file once already).
   */
  readonly tStarSkewness?: number;
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

/**
 * Linear-interpolated percentile of a SORTED array; p in [0,1]. Convention:
 * Hyndman-Fan type 7 (numpy default, R type 7) — idx = p*(n-1) with linear
 * interpolation between adjacent order statistics. Equal neighbors (including
 * equal infinities) short-circuit so interpolation never produces Inf-Inf NaNs.
 */
function sortedPercentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  // Equal neighbors (ties, or two same-sign infinities): interpolation would be
  // a no-op or an Inf-Inf NaN — return the shared value directly.
  if (sorted[lo]! === sorted[hi]!) return sorted[lo]!;
  // Infinite endpoint adjacent to a finite (or opposite-sign infinite) neighbor:
  // linear interpolation computes (±Inf) + frac·(±Inf) = NaN, which silently
  // destroys the honest unbounded-tail semantics (a NaN bound reads as a false
  // "cannot cover" downstream). Snap to the infinite endpoint so a boundary
  // straddle yields an honestly unbounded quantile instead of NaN. Finite/finite
  // pairs fall through to exact interpolation, unchanged.
  if (!Number.isFinite(sorted[lo]!)) return sorted[lo]!;
  if (!Number.isFinite(sorted[hi]!)) return sorted[hi]!;
  return sorted[lo]! + (idx - lo) * (sorted[hi]! - sorted[lo]!);
}

/**
 * Comparator safe for +/-Infinity: (a, b) => a - b returns NaN for two
 * same-sign infinities, which is unspecified behavior for Array#sort.
 */
function ascending(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Sample skewness, Fisher-Pearson g1 = m3 / m2^1.5 (moment estimator). The
 * bias-corrected G1 variant differs by sqrt(n(n-1))/(n-2), within ~1e-4 of 1 at
 * the resample counts used here (thousands), so g1 is preferred as the simplest
 * formula a skeptic can reproduce by hand from the receipt. Returns 0 for a
 * zero-variance sample (skewness of a constant is undefined; 0 is the honest
 * "no asymmetry evidence" answer for a degenerate spread).
 */
function sampleSkewness(xs: readonly number[]): number {
  const n = xs.length;
  // n<3 or zero spread: skewness is UNDEFINED, not zero — returning 0 would
  // read as "evidence of symmetry" from a sample that cannot evidence
  // anything (hostile-review fix). NaN here maps to an absent field upstream.
  if (n < 3) return NaN;
  const m = mean(xs);
  let m2 = 0;
  let m3 = 0;
  for (const x of xs) {
    const d = x - m;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;
  if (!(m2 > 0)) return NaN;
  return m3 / Math.pow(m2, 1.5);
}

/** Shared option validation: bad resamples/alpha -> the CI is refused (null). */
function validCiOptions(alpha: number, resamples: number): boolean {
  return Number.isInteger(resamples) && resamples >= 1 && alpha > 0 && alpha < 1;
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
      (((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
  }
  if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    (((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
}

/**
 * A statistic of a sample: the mean (ROI/units) is the common case, but this is
 * deliberately general. A CONFOUND-ADJUSTED edge — a regression coefficient of
 * outcome on signal after controlling for game volatility/strength — is also a
 * Statistic, and it plugs straight in.
 *
 * NOTE: this file ships NO optimizer. It only computes the injected statistic
 * (the mean, exactly) and its delete-one jackknife. When the injected statistic
 * is itself an expensive M-estimator fit on ill-conditioned data, the FITTING
 * (Newton with Levenberg-Marquardt / dogleg / Steihaug-CG safeguards, and
 * Hessian-based influence for scale) belongs in the caller / a future module —
 * it is a documented roadmap, not code that lives here.
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
  if (n < 2 || !data.every(Number.isFinite) || !validCiOptions(alpha, resamples)) return null;

  const point = statistic(data);
  const reps = bootstrapStatistic(data, statistic, resamples, seed);

  // Zero-variance resample distribution: the honest CI is a point.
  if (reps[0] === reps[reps.length - 1]) {
    return { point, low: point, high: point, alpha, n, resamples, seed, method: "bca", z0: 0, acceleration: 0 };
  }

  // Bias correction z0 = Phi^-1( P(theta* <= theta_hat) ), with the MID-P tie
  // correction (below + equal/2): sports ledgers are near-two-point discrete, so
  // a non-trivial mass of replicates EQUALS the point exactly; counting ties as
  // wholly "not below" (strict <) biases z0 negative and drags both bounds down.
  let below = 0;
  let equal = 0;
  for (const r of reps) {
    if (r < point) below++;
    else if (r === point) equal++;
  }
  const frac = Math.min(1 - 1e-9, Math.max(1e-9, (below + 0.5 * equal) / resamples));
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
  if (n < 2 || !data.every(Number.isFinite) || !validCiOptions(alpha, resamples)) return null;
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

/**
 * Delete-one jackknife standard error of a statistic — the exact, O(n),
 * dependency-free plug-in SE. For the mean it equals s/sqrt(n); for a general
 * statistic it is the standard nonparametric SE estimate. This is the default
 * per-replicate SE used by the studentized bootstrap.
 */
export function jackknifeStandardError(sample: readonly number[], statistic: Statistic): number {
  const n = sample.length;
  if (n < 2) return 0;
  const jack = new Array<number>(n);
  const without = new Array<number>(n - 1);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j < n; j++) if (j !== i) without[k++] = sample[j]!;
    jack[i] = statistic(without);
  }
  const jm = mean(jack);
  let s2 = 0;
  for (const j of jack) s2 += (j - jm) * (j - jm);
  return Math.sqrt(((n - 1) / n) * s2);
}

/**
 * STUDENTIZED (bootstrap-t) confidence interval — the second-order-accurate
 * method that INVERTS a pivotal quantity instead of reading quantiles off the
 * statistic's own scale (Efron & Tibshirani 1993 ch.12; Hall 1992). For each
 * resample it forms t* = (theta* - theta_hat) / se*, where se* is the resample's
 * own (jackknife) standard error, then inverts:
 *
 *     CI = [ theta_hat - t*_{1-a/2}·se_hat ,  theta_hat - t*_{a/2}·se_hat ]
 *
 * Note the TAIL REVERSAL — this is the inversion, not a bug. On right-skewed
 * data (a few big winners, the sports-ROI case) the studentized pivot's LOWER
 * tail is heavier, which stretches the interval's UPPER edge outward and gives
 * coverage measurably closer to nominal than the percentile method. Verified by
 * Monte-Carlo in the test suite (studentizedMeanCi covers a skewed true mean at
 * ~nominal, ahead of percentile).
 *
 * Why it belongs here: ROI/units per bet is a mean of skewed continuous returns
 * whose analytic SE is CHEAP and reliable (jackknife = s/sqrt(n), exact). The
 * literature's own rule is "studentize when a good SE estimator is available" —
 * which is exactly this case. Deterministic/seeded like BCa, so a public band
 * reproduces from the sealed ledger.
 *
 * The per-replicate SE is injectable (defaults to the jackknife) so a caller
 * with an analytic SE for a complex statistic can supply it. Returns null on
 * too-little / non-finite data; a point interval on zero variance.
 */
export function studentizedCi(
  data: readonly number[],
  statistic: Statistic,
  opts: {
    alpha?: number;
    resamples?: number;
    seed?: number;
    standardError?: (sample: readonly number[]) => number;
  } = {},
): PerformanceCi | null {
  const alpha = opts.alpha ?? 0.05;
  const resamples = opts.resamples ?? 10000;
  const seed = opts.seed ?? 20260702;
  const n = data.length;
  if (n < 2 || !data.every(Number.isFinite) || !validCiOptions(alpha, resamples)) return null;

  const se = opts.standardError ?? ((s: readonly number[]) => jackknifeStandardError(s, statistic));
  const point = statistic(data);
  const seHat = se(data);

  // Degeneracy TOLERANCE, not exact zero: a resample of 25 identical +0.909...
  // returns (a -110 win at 1 unit) has a floating-point-accumulation SD of
  // ~1e-16, not 0 — an exact-zero check would miss it and divide by FP noise,
  // producing an absurd ~1e15 pivot instead of the honest infinity. Any real
  // mixed resample of bet returns has SD orders of magnitude above this.
  const seTol = 1e-9 * (1 + Math.abs(point));

  // Zero variance -> the honest interval is a point (se_hat ~ 0, no pivot).
  if (!(seHat > seTol)) {
    return {
      point, low: point, high: point, alpha, n, resamples, seed,
      method: "studentized", z0: 0, acceleration: 0, tLow: 0, tHigh: 0, standardError: 0,
      degenerateResamples: 0,
    };
  }

  const rng = mulberry32(seed);
  const tStar = new Array<number>(resamples);
  const sample = new Array<number>(n);
  let degenerateResamples = 0;
  for (let b = 0; b < resamples; b++) {
    for (let i = 0; i < n; i++) sample[i] = data[Math.floor(rng() * n)]!;
    const thetaB = statistic(sample);
    const seB = se(sample);
    if (seB > seTol) {
      tStar[b] = (thetaB - point) / seB;
    } else {
      // Degenerate resample (all draws identical -> se* ~ 0). This is NOT
      // information-free: an all-modal-value resample puts theta* at an EXTREME
      // of the resample distribution with zero spread — the pivot is properly
      // +/-Infinity, the heaviest point of one tail. Imputing 0 would teleport
      // that tail to the center and silently narrow the interval (an
      // overconfident published bound on lopsided ledgers). Assign the signed
      // infinity; if enough mass lands in a tail, the corresponding bound is
      // honestly infinite: "bootstrap-t cannot bound this side from this
      // ledger." Only theta* at the point (within tolerance) is null info.
      degenerateResamples++;
      const diff = thetaB - point;
      tStar[b] = Math.abs(diff) <= seTol ? 0 : diff > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
  }
  tStar.sort(ascending); // (a-b) comparator NaNs on same-sign infinities

  // Pivot-symmetry diagnostic (skewness is order-independent, so computing on
  // the sorted array is identical). Withheld entirely when any infinite pivots
  // exist — see the tStarSkewness field doc for why a finite-subset skewness
  // would be the same silent-overclaim bug class this file already fixed once.
  // Also withheld (NaN -> undefined) when the pivot set is too small or has
  // zero spread — skewness is undefined there, and 0 would overclaim symmetry.
  const rawSkew = degenerateResamples === 0 ? sampleSkewness(tStar) : NaN;
  const tStarSkewness = Number.isFinite(rawSkew) ? rawSkew : undefined;

  // Quantiles of the pivot, then invert (tails reverse).
  const tLow = sortedPercentile(tStar, alpha / 2);
  const tHigh = sortedPercentile(tStar, 1 - alpha / 2);

  return {
    point,
    low: point - tHigh * seHat,
    high: point - tLow * seHat,
    alpha,
    n,
    resamples,
    seed,
    method: "studentized",
    z0: 0,
    acceleration: 0,
    tLow,
    tHigh,
    standardError: seHat,
    degenerateResamples,
    ...(tStarSkewness !== undefined ? { tStarSkewness } : {}),
  };
}

/**
 * Closed-form standard error of the MEAN: s/sqrt(n) (sample sd, (n-1) denom).
 * This is exactly equal to the delete-one jackknife SE of the mean (proven in
 * the test suite) but O(n) instead of O(n^2), which is what keeps the studentized
 * mean interval fast on a large ledger.
 */
export function meanStandardError(sample: readonly number[]): number {
  const n = sample.length;
  if (n < 2) return 0;
  const m = mean(sample);
  let ss = 0;
  for (const x of sample) ss += (x - m) * (x - m);
  return Math.sqrt(ss / (n * (n - 1)));
}

/**
 * Studentized (bootstrap-t) CI for the MEAN (ROI/units per bet). Uses the exact
 * O(n) closed-form SE (s/sqrt(n)) per resample — identical to the jackknife but
 * far cheaper — so this is the cheapest place the method's second-order accuracy
 * is fully earned. The recommended interval for a public ROI band on a small,
 * skewed ledger.
 */
export function studentizedMeanCi(
  returns: readonly number[],
  opts: { alpha?: number; resamples?: number; seed?: number } = {},
): PerformanceCi | null {
  return studentizedCi(returns, meanStatistic, { ...opts, standardError: meanStandardError });
}

/**
 * EMPIRICAL-BERNSTEIN worst-case CI for the MEAN (Maurer & Pontil 2009, thm 4)
 * — the third, NON-BOOTSTRAP leg of the interval stack, and the only one with a
 * FINITE-SAMPLE guarantee (no asymptotics at all).
 *
 * Why it is legitimately applicable to a bet ledger where generic concentration
 * bounds are not: per-bet unit returns are BOUNDED BY CONSTRUCTION — a loss is
 * exactly -1 stake, a win pays decimalOdds-1, both known per pick — so the
 * bounded-support assumption is a fact of the data, not a modeling choice. For
 * i.i.d. X in a range of width R, with probability >= 1-delta:
 *
 *   |mean - mu| <= sqrt(2·s²·ln(2/delta)/n) + 7·R·ln(2/delta)/(3(n-1))
 *
 * (s² the unbiased sample variance; two-sided at alpha uses delta = alpha/2 per
 * side.) The bound is deliberately CONSERVATIVE (wider than BCa/studentized) —
 * that is its role: a profit claim that clears even this band holds under
 * worst-case finite-sample assumptions, with zero resampling and therefore zero
 * Monte-Carlo error. Deterministic by construction (no RNG).
 *
 * `range` defaults to the observed support width of the sealed ledger (the
 * exact support of the record the claim is about); a caller wanting a stricter
 * prior bound (e.g. the max decimal payout offered) can inject it.
 */
export function empiricalBernsteinMeanCi(
  returns: readonly number[],
  opts: { alpha?: number; range?: number } = {},
): PerformanceCi | null {
  const alpha = opts.alpha ?? 0.05;
  const n = returns.length;
  if (n < 2 || !returns.every(Number.isFinite) || !(alpha > 0 && alpha < 1)) return null;

  const point = mean(returns);
  let lo = returns[0]!;
  let hi = returns[0]!;
  let ss = 0;
  for (const x of returns) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
    ss += (x - point) * (x - point);
  }
  const s2 = ss / (n - 1);
  const range = opts.range ?? hi - lo;
  if (!(range >= 0) || !Number.isFinite(range)) return null;

  // Zero spread -> the honest interval is a point.
  if (range === 0 || s2 === 0) {
    return {
      point, low: point, high: point, alpha, n, resamples: 0, seed: 0,
      method: "empirical-bernstein", z0: 0, acceleration: 0,
    };
  }

  const logTerm = Math.log(4 / alpha); // ln(2/(alpha/2)) per side, two-sided
  const width = Math.sqrt((2 * s2 * logTerm) / n) + (7 * range * logTerm) / (3 * (n - 1));

  return {
    point,
    low: point - width,
    high: point + width,
    alpha,
    n,
    resamples: 0, // no resampling: the bound is closed-form
    seed: 0,
    method: "empirical-bernstein",
    z0: 0,
    acceleration: 0,
  };
}
