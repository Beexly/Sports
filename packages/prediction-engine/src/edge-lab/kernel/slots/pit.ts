/**
 * SLOT `pit` — randomized probability integral transform for discrete
 * predictives, plus the uniformity histogram/test built on top of it.
 *
 * WHY RANDOMIZED
 * For a CONTINUOUS predictive F, the plain PIT u = F(y) is Uniform(0,1) when the
 * forecast is correct. For a DISCRETE predictive it is NOT: F(Y) can only take
 * the finitely many values {F(k)}, so its histogram is spiky no matter how
 * perfect the forecast is, and a spiky histogram is indistinguishable from
 * genuine miscalibration. The randomized PIT
 *
 *     u = F(y − 1) + v · P(Y = y),      v ~ Uniform(0, 1),  F(min − 1) = 0
 *
 * spreads each atom uniformly across the cdf jump it owns. Under a correct
 * forecast u ~ Uniform(0,1) EXACTLY (not asymptotically): conditional on Y = y
 * the draw is uniform on the interval (F(y−1), F(y)], those intervals partition
 * (0, 1], and interval y has length P(Y = y) — so the mixture is Lebesgue
 * measure on (0, 1]. The contract calls plain PIT a correctness bug here; the
 * test suite proves the difference empirically.
 *
 * Purity: the only randomness is the injected `Rng`. Exactly ONE uniform is
 * consumed per call to `pitDiscrete`, so the stream position advances
 * predictably and callers can reproduce any audit run from a single seed.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  type PitHistogram,
  type PitHistogramFn,
  type PitDiscreteFn,
} from "../contract.js";
import { regularizedGammaP } from "../numeric.js";

/** Default bin count for the uniformity histogram (contract-specified). */
const DEFAULT_BINS = 10;

/**
 * Slack allowed when checking that the assembled PIT value lies in [0, 1].
 * The mathematical value is always in [0, 1]; a few ULP of overshoot can come
 * from a distribution whose `cdf` is accumulated by summation. Anything beyond
 * this tolerance means `cdf` and `pmf` disagree, which is a real defect in the
 * distribution and is reported rather than silently clamped.
 */
const CONSISTENCY_TOL = 1e-9;

/**
 * RANDOMIZED probability integral transform of a single observation against a
 * discrete predictive.
 *
 * Consumes exactly one value from `rng`.
 *
 * Domain / failure modes:
 *  - `observed` must be a finite integer            → DOMAIN / NOT_FINITE
 *  - `rng` must return a finite value in [0, 1)     → DOMAIN / NOT_FINITE
 *  - `dist.cdf` / `dist.pmf` must return finite
 *    probabilities that are mutually consistent     → DOMAIN / NOT_FINITE
 *
 * Observations outside the support are NOT an error — they are the strongest
 * possible calibration signal. An outcome below `support().min` returns 0 and
 * one above `support().max` returns 1, which is exactly what the defining
 * formula yields there (the forecast assigned the outcome zero mass).
 */
export const pitDiscrete: PitDiscreteFn = (dist, observed, rng) => {
  assertFinite(observed, "observed");
  if (!Number.isInteger(observed)) {
    throw new KernelError(
      "DOMAIN",
      `observed must be an integer for a discrete predictive, received ${observed}`,
    );
  }
  if (typeof rng !== "function") {
    throw new KernelError("DOMAIN", "rng must be a function returning uniforms in [0,1)");
  }

  const support = dist.support();

  // Draw the randomizing uniform FIRST and unconditionally, so that the number
  // of values consumed from the stream does not depend on the observation.
  // A data-dependent consumption pattern would make audit replays diverge.
  const v = rng();
  assertFinite(v, "rng() draw");
  if (v < 0 || v >= 1) {
    throw new KernelError("DOMAIN", `rng() must return a value in [0,1), received ${v}`);
  }

  // Outcome the forecast declared impossible: F(y−1) = 0, P(Y = y) = 0 below the
  // support; F(y−1) = 1, P(Y = y) = 0 above it.
  if (observed < support.min) return 0;
  if (observed > support.max) return 1;

  const lower = observed === support.min ? 0 : dist.cdf(observed - 1);
  assertProbability(lower, `cdf(${observed - 1})`);

  const mass = dist.pmf(observed);
  assertProbability(mass, `pmf(${observed})`);

  const u = lower + v * mass;
  assertFinite(u, "pit value");
  if (u < -CONSISTENCY_TOL || u > 1 + CONSISTENCY_TOL) {
    throw new KernelError(
      "DOMAIN",
      `pit value ${u} outside [0,1]: cdf(${observed - 1})=${lower} and pmf(${observed})=${mass} are inconsistent`,
    );
  }
  // Clamp only the sub-tolerance rounding slack admitted above.
  return u < 0 ? 0 : u > 1 ? 1 : u;
};

/**
 * Bin PIT values uniformly on [0, 1] and test them against the uniform with a
 * chi-square goodness-of-fit statistic on (bins − 1) degrees of freedom:
 *
 *     expected  = n / bins
 *     X²        = Σ (observed_b − expected)² / expected
 *     p         = P(χ²_{bins−1} > X²) = 1 − P(df/2, X²/2)
 *
 * where P(·,·) is the regularized lower incomplete gamma from `./numeric.js`.
 *
 * A value of exactly 1 is placed in the last bin (bins are [b/B, (b+1)/B) with
 * the final one closed on the right) so that the bins partition [0, 1].
 *
 * Domain / failure modes:
 *  - `pitValues` must be non-empty                       → EMPTY
 *  - every value must be a finite probability in [0, 1]  → NOT_FINITE / DOMAIN
 *  - `bins` must be a finite integer >= 2                → NOT_FINITE / DOMAIN
 *
 * Caveat (statistical, not a failure): the chi-square approximation degrades
 * when the expected count n / bins is small (rule of thumb: < 5). The p-value is
 * still returned — under-powered, not wrong — because refusing to report is
 * worse than reporting a weak test, but callers gating on it should require a
 * sample size.
 */
export const pitHistogram: PitHistogramFn = (
  pitValues,
  bins = DEFAULT_BINS,
): PitHistogram => {
  assertNonEmpty(pitValues, "pitValues");
  assertFinite(bins, "bins");
  if (!Number.isInteger(bins) || bins < 2) {
    throw new KernelError("DOMAIN", `bins must be an integer >= 2, received ${bins}`);
  }

  const counts = new Array<number>(bins).fill(0);
  for (let i = 0; i < pitValues.length; i += 1) {
    const u = pitValues[i]!;
    assertProbability(u, `pitValues[${i}]`);
    // floor(u · bins) is the half-open bin; u === 1 folds into the last bin.
    let index = Math.floor(u * bins);
    if (index >= bins) index = bins - 1;
    if (index < 0) index = 0;
    counts[index] = counts[index]! + 1;
  }

  const n = pitValues.length;
  const expected = n / bins;
  let chiSquare = 0;
  for (let b = 0; b < bins; b += 1) {
    const diff = counts[b]! - expected;
    chiSquare += (diff * diff) / expected;
  }

  const df = bins - 1;
  // Upper tail of the chi-square: P(χ²_df > x) = 1 − P(df/2, x/2).
  const uniformityPValue = 1 - regularizedGammaP(df / 2, chiSquare / 2);
  assertFinite(uniformityPValue, "uniformityPValue");

  return {
    counts,
    bins,
    // regularizedGammaP is already confined to [0,1]; this guards only against
    // 1 − p rounding a hair outside the closed interval.
    uniformityPValue: uniformityPValue < 0 ? 0 : uniformityPValue > 1 ? 1 : uniformityPValue,
  };
};
