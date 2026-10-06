/**
 * Bias-corrected Expected Calibration Error (C-290 / C-292, 2026-09-09).
 *
 * Binned ECE is a biased estimator: even a PERFECTLY calibrated forecaster
 * shows a positive ECE at finite n, because each bin's observed rate is a
 * binomial draw around the bin's mean forecast and ECE sums the ABSOLUTE
 * gaps. With 10 equal-width bins the expected ECE under perfect calibration
 * is roughly 0.09 at n 100 and 0.04 at n 500 (simulated 2026-09-09, see
 * docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md). The eligibility floor is
 * a literal 0.05 with an n floor of 100, so as written the raw estimator can
 * never clear its own floor at the n floor, whatever the model does.
 *
 * Two corrections are computed and BOTH are reported:
 *
 *   - `noise` / `noiseAnalytic`: the expected ECE of a perfectly calibrated
 *     forecaster on THIS sample's own forecasts and bins — a seeded Monte
 *     Carlo null (keep every p_i, redraw y_i ~ Bernoulli(p_i), average the
 *     binned ECE over REPLICATIONS draws) and its closed-form plug-in
 *     SUM_k (n_k/N) * sqrt(2/pi) * sqrt(SUM_i p_i(1-p_i)) / n_k. These say how
 *     much of the raw value a model with NO calibration error would show.
 *     They are diagnostics: `raw - noise` is NOT the corrected estimate,
 *     because E|delta + eps| is not |delta| + E|eps| — subtracting the full
 *     null expectation over-corrects whenever a real gap exists, and at
 *     n 274 it can read a true 10-point gap as 4 (C-292, the flaw the first
 *     cut of C-290 carried).
 *
 *   - `debiased`: the per-bin variance correction, which does not have that
 *     flaw. In bin k with gap g_k = mean forecast - observed rate and
 *     binomial variance v_k = SUM_i p_i(1-p_i) / n_k^2, E[g_k^2] = delta_k^2 +
 *     v_k, so g_k^2 - v_k is an unbiased estimate of the TRUE squared gap.
 *     debiased = SUM_k (n_k/N) * sqrt(max(0, g_k^2 - v_k)). For a perfectly
 *     calibrated forecaster it keeps roughly a third of the raw noise (the
 *     clip at 0 is one-sided); for a real gap well above the noise it reads
 *     the gap itself, not the gap minus the noise (tested both ways).
 *
 * Also reported: `reliability` (the Murphy reliability term on the same
 * bins, SUM_k (n_k/N) g_k^2, identical to brierDecomposition's) and
 * `reliabilityNoise` (its expectation under perfect calibration,
 * SUM_k (n_k/N) v_k), so the squared-domain reading is available beside the
 * absolute one. The floors themselves are NOT changed, and the raw ECE stays
 * reported next to the corrected value everywhere the gate is exposed.
 */
import type { CalibrationSample } from "@sports/prediction-engine";

export interface DebiasedEce {
  /** The plain binned ECE, unchanged from expectedCalibrationError. */
  readonly raw: number;
  /** Monte Carlo expected ECE of a perfectly calibrated forecaster on these forecasts and bins. */
  readonly noise: number;
  /** Closed-form plug-in expectation of the same quantity (cross-check). */
  readonly noiseAnalytic: number;
  /** Per-bin variance-corrected ECE: SUM_k w_k sqrt(max(0, g_k^2 - v_k)). */
  readonly debiased: number;
  /** Murphy reliability on the same bins (SUM_k w_k g_k^2). */
  readonly reliability: number;
  /** Expected reliability under perfect calibration (SUM_k w_k v_k). */
  readonly reliabilityNoise: number;
  readonly bins: number;
  readonly replications: number;
}

const SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);
/** Fixed seed: the correction must be reproducible run to run on the same sample. */
const NULL_SEED = 0x5eed_c290;
export const DEBIASED_ECE_REPLICATIONS = 400;

function binIndex(p: number, bins: number): number {
  const clamped = Math.min(1, Math.max(0, p));
  return Math.min(bins - 1, Math.floor(clamped * bins));
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/** mulberry32: small, fast, deterministic; quality is ample for a Bernoulli null. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Binned ECE from per-bin sums; shared by the observed and the null passes. */
function eceFromSums(
  n: number,
  count: readonly number[],
  forecastSum: readonly number[],
  outcomeSum: readonly number[],
): number {
  let ece = 0;
  for (let b = 0; b < count.length; b += 1) {
    const nk = count[b] ?? 0;
    if (nk === 0) continue;
    ece += (nk / n) * Math.abs((forecastSum[b] ?? 0) / nk - (outcomeSum[b] ?? 0) / nk);
  }
  return ece;
}

export function debiasedExpectedCalibrationError(
  samples: readonly CalibrationSample[],
  bins = 10,
  replications = DEBIASED_ECE_REPLICATIONS,
): DebiasedEce {
  const n = samples.length;
  if (n === 0) {
    return {
      raw: 0,
      noise: 0,
      noiseAnalytic: 0,
      debiased: 0,
      reliability: 0,
      reliabilityNoise: 0,
      bins,
      replications,
    };
  }
  const bin = new Array<number>(n);
  const count = new Array<number>(bins).fill(0);
  const forecastSum = new Array<number>(bins).fill(0);
  const outcomeSum = new Array<number>(bins).fill(0);
  const varianceSum = new Array<number>(bins).fill(0);
  for (let i = 0; i < n; i += 1) {
    const s = samples[i]!;
    const b = binIndex(s.p, bins);
    bin[i] = b;
    count[b] = (count[b] ?? 0) + 1;
    forecastSum[b] = (forecastSum[b] ?? 0) + s.p;
    outcomeSum[b] = (outcomeSum[b] ?? 0) + s.y;
    varianceSum[b] = (varianceSum[b] ?? 0) + s.p * (1 - s.p);
  }
  const raw = eceFromSums(n, count, forecastSum, outcomeSum);

  let noiseAnalytic = 0;
  let debiased = 0;
  let reliability = 0;
  let reliabilityNoise = 0;
  for (let b = 0; b < bins; b += 1) {
    const nk = count[b] ?? 0;
    if (nk === 0) continue;
    const w = nk / n;
    const gap = (forecastSum[b] ?? 0) / nk - (outcomeSum[b] ?? 0) / nk;
    // Binomial variance of the bin's observed rate around its mean forecast.
    const v = (varianceSum[b] ?? 0) / (nk * nk);
    noiseAnalytic += w * Math.sqrt(v) * SQRT_2_OVER_PI;
    reliability += w * gap * gap;
    reliabilityNoise += w * v;
    debiased += w * Math.sqrt(Math.max(0, gap * gap - v));
  }

  // Monte Carlo null: same forecasts, outcomes redrawn as Bernoulli(p).
  const rand = mulberry32(NULL_SEED);
  const nullOutcomeSum = new Array<number>(bins);
  let noiseTotal = 0;
  for (let r = 0; r < replications; r += 1) {
    nullOutcomeSum.fill(0);
    for (let i = 0; i < n; i += 1) {
      if (rand() < samples[i]!.p) nullOutcomeSum[bin[i]!] = (nullOutcomeSum[bin[i]!] ?? 0) + 1;
    }
    noiseTotal += eceFromSums(n, count, forecastSum, nullOutcomeSum);
  }
  const noise = replications > 0 ? noiseTotal / replications : noiseAnalytic;

  return {
    raw: round6(raw),
    noise: round6(noise),
    noiseAnalytic: round6(noiseAnalytic),
    debiased: round6(debiased),
    reliability: round6(reliability),
    reliabilityNoise: round6(reliabilityNoise),
    bins,
    replications,
  };
}
