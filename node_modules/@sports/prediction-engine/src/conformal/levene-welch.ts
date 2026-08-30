/**
 * Levene / Brown-Forsythe variance-heterogeneity tests and Welch's
 * unequal-variance t — the scoring statistics behind candidate split search
 * when partitioning conformal residuals (LWT / Mondrian taxonomy refinement).
 *
 * WHY this module exists: a Mondrian conformal partition is only worth making
 * if the child buckets genuinely have DIFFERENT residual distributions. The
 * quantity a conformal interval publishes is a WIDTH, and width is driven by
 * the SCALE of the residuals, not by their centre. So the split criterion that
 * matters is variance heterogeneity, and the right test for it is
 * Brown-Forsythe (Levene-on-medians) — it keeps its nominal behaviour under
 * the heavy-tailed, skewed residual distributions sports models actually
 * produce, where classic Levene-on-means degrades badly. Classic Levene is
 * exported too, but only as the reference/diagnostic variant.
 *
 * A mean shift between children is a weaker but still real signal (it says the
 * point prediction is biased in one bucket), so splitQuality folds Welch's t
 * in with a deliberately SMALL weight rather than letting it compete.
 *
 * Every function here is pure and TOTAL: no throws, no NaN, no Infinity. When
 * the inputs cannot support a test, the result carries valid:false plus a
 * machine-readable reason and a statistic of exactly 0 — a split search must
 * never be steered by a number that is really an undefined form.
 */

/** Weight applied to the mean-shift (Welch) leg inside splitQuality.
 *
 * score = varianceStatistic + MEAN_SHIFT_WEIGHT * (|t| / (1 + |t|))
 *
 * 0.15 is chosen so the mean leg can break ties and nudge ordering between
 * splits of comparable variance separation, but cannot by itself promote a
 * split that fails to separate scale. Variance dominates BECAUSE conformal
 * width is a scale quantity: splitting on a mean shift alone leaves both
 * children with the same interval width and buys the calibration nothing.
 *
 * That guarantee is enforced STRUCTURALLY, by saturating the mean leg through
 * |t| / (1 + |t|) rather than trusting |t| to stay small. An earlier revision
 * used a raw 0.15 * |t| on the reasoning that |t| is "O(1)-O(5) in practice" —
 * which is false in exactly the case that matters: two children that differ
 * sharply in location produce an arbitrarily large |t| (a +50 shift on tight
 * data gives |t| ~ 100, i.e. a mean-leg contribution of 15, swamping a real
 * Brown-Forsythe W of ~8). The splitter would then have preferred a pure
 * location split over a genuine scale split — the precise inversion this
 * weight exists to prevent. Saturated, the mean leg is strictly < 0.15 and
 * can never outrank a W of 0.15 or more, whatever |t| does. */
const MEAN_SHIFT_WEIGHT = 0.15;

/** Result of a k-sample variance-heterogeneity test (Levene family). */
export interface VarianceTestResult {
  /** The W statistic, F(df1, df2) under the null. 0 when !valid. */
  readonly statistic: number;
  /** Numerator degrees of freedom, k - 1. 0 when !valid. */
  readonly df1: number;
  /** Denominator degrees of freedom, N - k. 0 when !valid. */
  readonly df2: number;
  /** Number of usable (non-empty, finite-bearing) groups. */
  readonly groupCount: number;
  /** Total usable observations across those groups. */
  readonly totalSamples: number;
  readonly valid: boolean;
  /** Machine-readable explanation when valid is false. */
  readonly reason?: string;
}

/** Result of Welch's unequal-variance two-sample t-test. */
export interface WelchTResult {
  /** Signed t statistic (mean(a) - mean(b) direction). 0 when !valid. */
  readonly t: number;
  /** Welch-Satterthwaite degrees of freedom. 0 when !valid. */
  readonly df: number;
  readonly valid: boolean;
  readonly reason?: string;
}

/** Combined score for one candidate binary split of a residual pool. */
export interface SplitQuality {
  /** varianceStatistic + MEAN_SHIFT_WEIGHT * saturated(|meanStatistic|). 0 when !valid. */
  readonly score: number;
  /** Brown-Forsythe W for the two children. 0 when unavailable. */
  readonly varianceStatistic: number;
  /** Signed Welch t for the two children. 0 when unavailable. */
  readonly meanStatistic: number;
  readonly valid: boolean;
  readonly reason?: string;
}

/** Keep only finite entries — non-finite residuals are dropped rather than
 * poisoning every downstream sum with NaN. */
function finiteOnly(xs: readonly number[]): number[] {
  const out: number[] = [];
  for (const x of xs) {
    if (Number.isFinite(x)) out.push(x);
  }
  return out;
}

/** Arithmetic mean over finite entries; 0 for an empty (or all-non-finite) input. */
export function mean(xs: readonly number[]): number {
  const vals = finiteOnly(xs);
  const n = vals.length;
  if (n === 0) return 0;
  let sum = 0;
  for (const v of vals) sum += v;
  const m = sum / n;
  return Number.isFinite(m) ? m : 0;
}

/** Median over finite entries; averages the two middle order statistics on
 * even length. 0 for an empty (or all-non-finite) input. */
export function median(xs: readonly number[]): number {
  const vals = finiteOnly(xs);
  const n = vals.length;
  if (n === 0) return 0;
  vals.sort((a, b) => a - b);
  const mid = n >> 1;
  if (n % 2 === 1) return vals[mid]!;
  const m = (vals[mid - 1]! + vals[mid]!) / 2;
  return Number.isFinite(m) ? m : 0;
}

/** Unbiased sample variance (n - 1 denominator) over finite entries.
 * 0 when fewer than 2 usable observations — an honest "no dispersion
 * information", never a divide-by-zero. */
export function sampleVariance(xs: readonly number[]): number {
  const vals = finiteOnly(xs);
  const n = vals.length;
  if (n < 2) return 0;
  const m = mean(vals);
  let ss = 0;
  for (const v of vals) {
    const d = v - m;
    ss += d * d;
  }
  const variance = ss / (n - 1);
  return Number.isFinite(variance) && variance > 0 ? variance : 0;
}

const INVALID_VARIANCE_TEST: VarianceTestResult = {
  statistic: 0,
  df1: 0,
  df2: 0,
  groupCount: 0,
  totalSamples: 0,
  valid: false,
};

/**
 * Shared Levene-family engine.
 *
 * W = ((N - k) / (k - 1)) * sum_i n_i (Zbar_i - Zbar)^2
 *                         / sum_i sum_j (Z_ij - Zbar_i)^2
 *
 * where Z_ij = |x_ij - center_i| and center_i is the group mean (classic
 * Levene) or the group median (Brown-Forsythe).
 */
function leveneFamily(
  groups: readonly (readonly number[])[],
  center: (xs: readonly number[]) => number,
): VarianceTestResult {
  const usable: number[][] = [];
  for (const g of groups) {
    const vals = finiteOnly(g);
    if (vals.length > 0) usable.push(vals);
  }

  const k = usable.length;
  if (k < 2) {
    return { ...INVALID_VARIANCE_TEST, groupCount: k, reason: "need at least 2 non-empty groups" };
  }

  let totalSamples = 0;
  for (const g of usable) totalSamples += g.length;
  if (totalSamples <= k) {
    return {
      ...INVALID_VARIANCE_TEST,
      groupCount: k,
      totalSamples,
      reason: "need total samples greater than group count",
    };
  }

  // Per-group absolute deviations from the chosen center, and their means.
  const deviations: number[][] = [];
  const groupZMeans: number[] = [];
  let grandZSum = 0;
  for (const g of usable) {
    const c = center(g);
    const z: number[] = [];
    for (const v of g) z.push(Math.abs(v - c));
    deviations.push(z);
    groupZMeans.push(mean(z));
    for (const value of z) grandZSum += value;
  }
  const grandZMean = grandZSum / totalSamples;

  let between = 0;
  let within = 0;
  for (let i = 0; i < k; i++) {
    const z = deviations[i]!;
    const zBar = groupZMeans[i]!;
    const gap = zBar - grandZMean;
    between += z.length * gap * gap;
    for (const value of z) {
      const d = value - zBar;
      within += d * d;
    }
  }

  const df1 = k - 1;
  const df2 = totalSamples - k;

  if (!(within > 0) || !Number.isFinite(within) || !Number.isFinite(between)) {
    // Zero within-group deviation spread: every |x - center| is identical
    // inside every group, so the F ratio is 0/0 — undefined, not "infinitely
    // significant". Report it honestly.
    return {
      ...INVALID_VARIANCE_TEST,
      groupCount: k,
      totalSamples,
      reason: "zero within-group deviation sum of squares",
    };
  }

  const statistic = (df2 / df1) * (between / within);
  if (!Number.isFinite(statistic) || statistic < 0) {
    return {
      ...INVALID_VARIANCE_TEST,
      groupCount: k,
      totalSamples,
      reason: "non-finite test statistic",
    };
  }

  return { statistic, df1, df2, groupCount: k, totalSamples, valid: true };
}

/**
 * Classic Levene's test — deviations taken from each group MEAN. Kept for
 * reference and diagnostics; prefer brownForsythe for residual split search,
 * because the mean-centred variant loses its nominal level under the skewed,
 * heavy-tailed residuals this engine produces.
 */
export function levene(groups: readonly (readonly number[])[]): VarianceTestResult {
  return leveneFamily(groups, mean);
}

/**
 * Brown-Forsythe test — Levene with deviations from each group MEDIAN. The
 * robust member of the family and the PREFERRED variance-heterogeneity
 * statistic for split scoring.
 */
export function brownForsythe(groups: readonly (readonly number[])[]): VarianceTestResult {
  return leveneFamily(groups, median);
}

/**
 * Welch's unequal-variance two-sample t with Welch-Satterthwaite degrees of
 * freedom. Signed in the (mean(a) - mean(b)) direction. Requires at least 2
 * finite observations per side and a strictly positive pooled standard error
 * (both groups constant => the difference is either exactly 0 or infinitely
 * significant; neither is a usable split score, so we report invalid).
 */
export function welchT(a: readonly number[], b: readonly number[]): WelchTResult {
  const xa = finiteOnly(a);
  const xb = finiteOnly(b);
  const na = xa.length;
  const nb = xb.length;

  if (na < 2 || nb < 2) {
    return { t: 0, df: 0, valid: false, reason: "each side needs at least 2 finite samples" };
  }

  const va = sampleVariance(xa);
  const vb = sampleVariance(xb);
  const sa = va / na;
  const sb = vb / nb;
  const seSquared = sa + sb;

  if (!(seSquared > 0) || !Number.isFinite(seSquared)) {
    return { t: 0, df: 0, valid: false, reason: "zero or non-finite pooled standard error" };
  }

  const t = (mean(xa) - mean(xb)) / Math.sqrt(seSquared);

  const dfDenominator = (sa * sa) / (na - 1) + (sb * sb) / (nb - 1);
  if (!(dfDenominator > 0) || !Number.isFinite(dfDenominator)) {
    return { t: 0, df: 0, valid: false, reason: "degenerate Welch-Satterthwaite denominator" };
  }
  const df = (seSquared * seSquared) / dfDenominator;

  if (!Number.isFinite(t) || !Number.isFinite(df)) {
    return { t: 0, df: 0, valid: false, reason: "non-finite Welch statistic" };
  }

  return { t, df, valid: true };
}

const INVALID_SPLIT: SplitQuality = {
  score: 0,
  varianceStatistic: 0,
  meanStatistic: 0,
  valid: false,
};

/**
 * Score one candidate binary split of a residual pool.
 *
 * Formula:
 *   score = W_BrownForsythe + MEAN_SHIFT_WEIGHT * (|t_Welch| / (1 + |t_Welch|))
 * with MEAN_SHIFT_WEIGHT = 0.15 (see the constant's doc comment).
 *
 * Brown-Forsythe is PRIMARY because conformal intervals publish a WIDTH, and
 * width tracks residual SCALE: a split that separates variance immediately
 * buys tighter intervals on the low-scale child and honestly wider ones on the
 * high-scale child. A split that only separates means leaves both children
 * with the same width, so it earns only the small additive bonus. The Welch
 * leg enters through |t| because either direction of mean shift is equally
 * informative about bucket bias.
 *
 * Returns score 0 with valid:false when either side has fewer than 2 finite
 * observations, or when Brown-Forsythe itself is undefined — a misleading
 * finite number here would silently steer the whole split search.
 */
export function splitQuality(
  left: readonly number[],
  right: readonly number[],
): SplitQuality {
  const xl = finiteOnly(left);
  const xr = finiteOnly(right);

  if (xl.length < 2 || xr.length < 2) {
    return { ...INVALID_SPLIT, reason: "each side needs at least 2 finite samples" };
  }

  const variance = brownForsythe([xl, xr]);
  if (!variance.valid) {
    return { ...INVALID_SPLIT, reason: variance.reason ?? "variance test undefined" };
  }

  // A degenerate Welch leg is survivable: variance separation alone is a
  // legitimate split signal, so we keep the variance score and contribute 0
  // from the mean leg rather than invalidating the whole candidate.
  const welch = welchT(xl, xr);
  const meanStatistic = welch.valid ? welch.t : 0;

  // The mean leg is SATURATED, not linear. |t| grows without bound as the two
  // children separate in location, so a raw `+ w * |t|` term would let a large
  // enough mean shift outscore any amount of genuine variance separation —
  // breaking this module's documented guarantee that the mean leg "cannot by
  // itself promote a split that fails to separate scale", and pointing the
  // splitter at location splits when conformal width depends on SCALE.
  //
  // |t| / (1 + |t|) maps [0, ∞) onto [0, 1), so the mean contribution is
  // strictly below MEAN_SHIFT_WEIGHT. It stays monotone in |t| (still a usable
  // tie-breaker between splits of comparable variance separation) but can
  // never dominate a Brown-Forsythe statistic of MEAN_SHIFT_WEIGHT or more.
  const absT = Math.abs(meanStatistic);
  const score = variance.statistic + MEAN_SHIFT_WEIGHT * (absT / (1 + absT));
  if (!Number.isFinite(score)) {
    return { ...INVALID_SPLIT, reason: "non-finite combined score" };
  }

  return {
    score,
    varianceStatistic: variance.statistic,
    meanStatistic,
    valid: true,
  };
}
