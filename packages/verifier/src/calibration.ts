/**
 * Calibration diagnostics for a set of probabilistic forecasts.
 *
 * Ported from arXiv:2607.00164, "Verifiable Rewards for Calibrated
 * Probabilistic Forecasting" (Singh, Reddy & Chopra, Cascade Research).
 * That paper's central reporting lesson is that Brier score alone is
 * ambiguous: by the Murphy decomposition, two forecasters can be equally
 * CALIBRATED and differ in Brier purely through RESOLUTION — how sharply they
 * separate states of differing outcome rate. Its Table 3 therefore reports
 * Brier (with a bootstrap interval), expected and maximum calibration error,
 * accuracy, and resolution, for every system, against the betting market as a
 * near-ceiling reference.
 *
 * This repo's scorecard reported Brier and log-loss only, so the case
 * "loses on Brier, wins on calibration" was invisible — exactly the case the
 * paper says is worth knowing. These functions make it visible, and the
 * Murphy identity (brier = reliability - resolution + uncertainty) is asserted
 * as a self-check in the pins so a sign error cannot pass.
 *
 * Binning follows the paper: ten EQUAL-WIDTH bins over [0, 1]. Reliability is
 * measured against the realized frequency in each bin, and each bin carries a
 * Wilson band, so a bucket with 3 rows cannot masquerade as a calibration
 * failure. Empty bins are skipped rather than counted as gaps — an unvisited
 * bin is not evidence of miscalibration.
 *
 * No dependencies. Every exported number is pinned by hand-computed values in
 * `__tests__/calibration-pins.test.ts`.
 */

import { wilsonInterval } from "./stats";

/** Minimum forecast count before calibration is worth reporting at all. */
export const MIN_CALIBRATION_N = 20;

/** The paper's bin count: ten equal-width bins over [0, 1]. */
export const DEFAULT_CALIBRATION_BINS = 10;

export type CalibrationRow = {
  readonly p: number;
  readonly y: 0 | 1;
};

export type ReliabilityBucket = {
  /** Inclusive lower edge of the bucket. */
  readonly lo: number;
  /** Exclusive upper edge, except the last bucket where it is 1 inclusive. */
  readonly hi: number;
  readonly n: number;
  /** Mean stated probability in the bucket. */
  readonly meanP: number;
  /** Realized outcome frequency in the bucket. */
  readonly observedRate: number;
  /** meanP - observedRate. Positive means overconfident. */
  readonly gap: number;
  /** Wilson band on observedRate, or null when n = 0. */
  readonly band: { readonly low: number; readonly high: number } | null;
  /** |gap| against the band: 0 when the truth is inside the band. */
  readonly exceedsBand: boolean;
};

export type MurphyDecomposition = {
  readonly brier: number;
  /** Weighted squared gap of the calibration curve against perfect. */
  readonly reliability: number;
  /** Weighted spread of observed rates about the base rate. */
  readonly resolution: number;
  /** Base-rate variance — irreducible, not the forecaster's doing. */
  readonly uncertainty: number;
};

/**
 * Bucket forecasts into `bins` equal-width bins over [0, 1].
 * A p of exactly 1 lands in the last bucket, never out of range.
 */
export function reliabilityCurve(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): ReliabilityBucket[] {
  const k = Math.max(1, Math.floor(bins));
  const out: ReliabilityBucket[] = [];
  for (let b = 0; b < k; b++) {
    const lo = b / k;
    const hi = (b + 1) / k;
    let n = 0;
    let sumP = 0;
    let sumY = 0;
    for (const r of rows) {
      const p = Math.min(1, Math.max(0, r.p));
      const inBucket = b === k - 1 ? p >= lo && p <= hi : p >= lo && p < hi;
      if (!inBucket) continue;
      n += 1;
      sumP += p;
      sumY += r.y;
    }
    if (n === 0) {
      out.push({ lo, hi, n: 0, meanP: NaN, observedRate: NaN, gap: NaN, band: null, exceedsBand: false });
      continue;
    }
    const meanP = sumP / n;
    const observedRate = sumY / n;
    const band = wilsonInterval(sumY, n);
    out.push({
      lo,
      hi,
      n,
      meanP,
      observedRate,
      gap: meanP - observedRate,
      band: band ? { low: band.low, high: band.high } : null,
      exceedsBand: band ? meanP < band.low || meanP > band.high : false,
    });
  }
  return out;
}

/**
 * Expected calibration error: bucket-mass-weighted mean absolute gap.
 * Empty buckets contribute nothing (weight 0), never a gap of 1.
 */
export function expectedCalibrationError(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): number {
  const n = rows.length;
  if (n === 0) return NaN;
  let acc = 0;
  for (const b of reliabilityCurve(rows, bins)) {
    if (b.n === 0) continue;
    acc += (b.n / n) * Math.abs(b.gap);
  }
  return acc;
}

/** Worst per-bucket |gap| — the paper's MCE. Ignores empty buckets. */
export function maximumCalibrationError(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): number {
  let worst = 0;
  let seen = false;
  for (const b of reliabilityCurve(rows, bins)) {
    if (b.n === 0) continue;
    seen = true;
    worst = Math.max(worst, Math.abs(b.gap));
  }
  return seen ? worst : NaN;
}

/** Realized win rate — the paper's "Acc." column. */
export function accuracy(rows: readonly CalibrationRow[]): number {
  if (rows.length === 0) return NaN;
  let s = 0;
  for (const r of rows) s += r.y;
  return s / rows.length;
}

/** Base-rate variance, the Murphy "uncertainty" term. */
export function uncertainty(rows: readonly CalibrationRow[]): number {
  const base = accuracy(rows);
  return base * (1 - base);
}

/**
 * Murphy resolution: bucket-mass-weighted variance of realized rates about the
 * base rate. Zero for a forecaster that says the same number every time, which
 * is why "calibrated but useless" scores 0 here and 0.25 in Brier.
 */
export function resolution(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): number {
  const n = rows.length;
  if (n === 0) return NaN;
  const base = accuracy(rows);
  let acc = 0;
  for (const b of reliabilityCurve(rows, bins)) {
    if (b.n === 0) continue;
    acc += (b.n / n) * (b.observedRate - base) ** 2;
  }
  return acc;
}

/** Weighted squared deviation of the curve from the diagonal. */
export function reliabilityTerm(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): number {
  const n = rows.length;
  if (n === 0) return NaN;
  let acc = 0;
  for (const b of reliabilityCurve(rows, bins)) {
    if (b.n === 0) continue;
    acc += (b.n / n) * b.gap ** 2;
  }
  return acc;
}

/**
 * Full Murphy decomposition.
 *
 * The population identity is brier = reliability - resolution + uncertainty. On
 * a finite SAMPLE the identity does not hold for free, and the size of the gap
 * is knowable exactly: splitting p - y into its within-bucket part and its
 * bucket-level part, the two mean-zero within-bucket terms drop out, leaving
 *
 *     brier - (reliability - resolution + uncertainty)
 *         = SUM_b (n_b / n) * var_p(b)
 *
 * i.e. the residual is exactly the bucket-mass-weighted variance of the STATED
 * probabilities inside each bucket. It is 0 when every bucket holds a single
 * distinct probability (saturated bins) and positive when coarse bins mix
 * different probabilities — the normal case under the paper's ten bins. So the
 * residual measures binning coarseness, not estimator failure, and
 * `binningResidual` recomputes it from the buckets so the pins can compare two
 * independent routes to the same number.
 */
export function murphyDecomposition(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): MurphyDecomposition {
  let sumSq = 0;
  for (const r of rows) sumSq += (r.p - r.y) ** 2;
  const brier = rows.length === 0 ? NaN : sumSq / rows.length;
  return {
    brier,
    reliability: reliabilityTerm(rows, bins),
    resolution: resolution(rows, bins),
    uncertainty: uncertainty(rows),
  };
}

/** residual = brier - (reliability - resolution + uncertainty). */
export function identityError(
  d: MurphyDecomposition,
): number {
  return d.brier - (d.reliability - d.resolution + d.uncertainty);
}

/**
 * Bucket-mass-weighted within-bucket variance of the stated probabilities.
 * Computed from the buckets rather than from the decomposition, so comparing
 * it with `identityError` cross-checks all four terms.
 */
export function binningResidual(
  rows: readonly CalibrationRow[],
  bins: number = DEFAULT_CALIBRATION_BINS,
): number {
  const n = rows.length;
  if (n === 0) return NaN;
  let acc = 0;
  for (const b of reliabilityCurve(rows, bins)) {
    if (b.n === 0) continue;
    acc += (b.n / n) * bucketPVariance(rows, b.lo, b.hi, bins);
  }
  return acc;
}

function bucketPVariance(
  rows: readonly CalibrationRow[],
  lo: number,
  hi: number,
  bins: number,
): number {
  const inBucket = (p: number): boolean => {
    if (bins === 1) return true;
    const c = Math.min(1, Math.max(0, p));
    return hi >= 1 ? c >= lo && c <= hi : c >= lo && c < hi;
  };
  let count = 0;
  let sum = 0;
  for (const r of rows) {
    if (!inBucket(r.p)) continue;
    count += 1;
    sum += Math.min(1, Math.max(0, r.p));
  }
  if (count === 0) return 0;
  const mean = sum / count;
  let acc = 0;
  for (const r of rows) {
    if (!inBucket(r.p)) continue;
    acc += (Math.min(1, Math.max(0, r.p)) - mean) ** 2;
  }
  return acc / count;
}

/**
 * Honest verdict for a candidate-vs-market comparison.
 *
 * The paper's point in one line: a Brier loss that comes with equal-or-better
 * ECE and MCE is a RESOLUTION gap (the model separates fewer states), not a
 * reliability failure, and the two call for opposite responses. This returns
 * which one it is instead of a bare "worse".
 */
export type CalibrationVerdict = {
  readonly deltaBrier: number;
  readonly deltaEce: number;
  readonly deltaMce: number;
  readonly deltaResolution: number;
  /** "candidate-better" | "market-better" | "tied" on Brier, within tolerance. */
  readonly brierDirection: "candidate-better" | "market-better" | "tied";
  /**
   * "resolution-limited" — candidate trails on Brier while matching or beating
   * the market on calibration; "reliability-gap" — it is also less calibrated;
   * "calibrated-and-better" / "calibrated-and-worse"; "n-too-small" below
   * MIN_CALIBRATION_N.
   */
  readonly diagnosis:
    | "calibrated-and-better"
    | "resolution-limited"
    | "reliability-gap"
    | "calibrated-and-worse"
    | "n-too-small";
  /** Buckets where the candidate's stated p sits outside the truth's band. */
  readonly candidateOffBandBuckets: number;
  readonly marketOffBandBuckets: number;
  /** The single worst candidate bucket, or null when there is none. */
  readonly worstBucket: ReliabilityBucket | null;
};

export function compareCalibration(
  candidate: readonly CalibrationRow[],
  market: readonly CalibrationRow[],
  options?: { readonly bins?: number; readonly tol?: number },
): CalibrationVerdict {
  const bins = options?.bins ?? DEFAULT_CALIBRATION_BINS;
  const tol = options?.tol ?? 1e-12;
  const n = Math.min(candidate.length, market.length);
  const candBrier = brierOfRows(candidate);
  const marketBrier = brierOfRows(market);
  const deltaBrier = candBrier - marketBrier;
  const candEce = expectedCalibrationError(candidate, bins);
  const marketEce = expectedCalibrationError(market, bins);
  const deltaEce = candEce - marketEce;
  const deltaMce = maximumCalibrationError(candidate, bins) - maximumCalibrationError(market, bins);
  const deltaResolution = resolution(candidate, bins) - resolution(market, bins);

  const curve = reliabilityCurve(candidate, bins);
  const marketCurve = reliabilityCurve(market, bins);
  const offBand = (c: readonly ReliabilityBucket[]): number => c.filter((b) => b.n > 0 && b.exceedsBand).length;
  let worst: ReliabilityBucket | null = null;
  for (const b of curve) {
    if (b.n === 0) continue;
    if (worst === null || Math.abs(b.gap) > Math.abs(worst.gap)) worst = b;
  }

  const brierDirection =
    Math.abs(deltaBrier) <= tol ? "tied" : deltaBrier < 0 ? "candidate-better" : "market-better";

  let diagnosis: CalibrationVerdict["diagnosis"];
  if (n < MIN_CALIBRATION_N) diagnosis = "n-too-small";
  else if (brierDirection === "candidate-better") {
    diagnosis = deltaEce <= tol ? "calibrated-and-better" : "reliability-gap";
  } else if (brierDirection === "tied") {
    diagnosis = "calibrated-and-better";
  } else {
    // market-better on Brier: is the candidate at least as well calibrated?
    diagnosis = deltaEce <= tol && deltaMce <= tol ? "resolution-limited" : "reliability-gap";
  }

  return {
    deltaBrier,
    deltaEce,
    deltaMce,
    deltaResolution,
    brierDirection,
    diagnosis,
    candidateOffBandBuckets: offBand(curve),
    marketOffBandBuckets: offBand(marketCurve),
    worstBucket: worst,
  };
}

function brierOfRows(rows: readonly CalibrationRow[]): number {
  if (rows.length === 0) return NaN;
  let s = 0;
  for (const r of rows) s += (r.p - r.y) ** 2;
  return s / rows.length;
}
