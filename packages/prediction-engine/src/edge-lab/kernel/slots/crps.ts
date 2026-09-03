/**
 * SLOT `crps` — Continuous Ranked Probability Score for whole predictive
 * distributions. This is the score that makes the engine judge DISTRIBUTIONS
 * rather than point picks: it is strictly proper, it is reported in
 * outcome-units, and it collapses to the absolute error when the predictive is
 * a point mass — so it can be read next to a MAE without a translation table.
 *
 * Two entry points:
 *  - `crpsDiscrete`  — closed-form sum over the (truncated) integer support.
 *  - `crpsEmpirical` — ensemble form for simulator output with no closed form,
 *                      via the O(n log n) sorted-sample identity.
 *
 * Both are pure. Neither mutates its inputs. Both fail closed with `KernelError`.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  type CrpsDiscreteFn,
  type CrpsEmpiricalFn,
} from "../contract.js";

/**
 * Remaining-tail-mass threshold at which an unbounded support is truncated.
 * Mandated by the contract: "truncate an unbounded support where the remaining
 * tail mass is < 1e-12".
 */
const TAIL_MASS_TOL = 1e-12;

/**
 * Hard iteration budget for the support walk. A discrete predictive whose CDF
 * has not accumulated 1 − 1e-12 of its mass within this many integer steps is
 * not something this scorer can summarise honestly, so it throws
 * NO_CONVERGENCE rather than returning a silently truncated number.
 */
const MAX_SUPPORT_WALK = 1_000_000;

/**
 * Tolerance on the requirement that `cdf(support.max) == 1` for a bounded
 * support. Matches the slack used by `conformance.ts` ("cdf-reaches-one").
 */
const CDF_CLOSURE_TOL = 1e-6;

/**
 * CRPS of a discrete predictive against an observed integer:
 *
 *   CRPS(F, y) = Σ_{k ∈ ℤ} ( F(k) − 1{k >= y} )²
 *
 * Lower is better; the units are outcome-units (a point mass at `m` scores
 * exactly |m − y|, and a two-point {0,1} predictive scores exactly the Brier
 * score of P(X = 1)).
 *
 * TRUNCATION (documented as required by the contract). The infinite sum is
 * evaluated exactly on [support.min, k*], where k* is the first integer whose
 * CDF reaches 1 − 1e-12 (or `support.max`, whichever comes first). The two
 * discarded regions are bounded analytically rather than ignored:
 *
 *  - Below `support.min`: F(k) = 0 there, so every k in [y, support.min − 1]
 *    contributes exactly 1. That count is added in closed form — it is exact,
 *    not an approximation.
 *  - Above k*: F(k) >= 1 − 1e-12 by construction and by monotonicity.
 *      · For k >= y the term is (F(k) − 1)² <= 1e-24. The whole discarded
 *        region is bounded by (number of remaining terms) · 1e-24; for a
 *        distribution with a real tail this is far below double precision and
 *        it is dropped.
 *      · For k < y (an observation past the 1 − 1e-12 quantile — a badly
 *        misspecified forecast, which is exactly what CRPS exists to expose)
 *        the term is F(k)² ∈ [1 − 2e-12, 1]. Those terms are added in closed
 *        form as 1 each, an under-count of at most 2e-12 per term.
 *
 * Throws:
 *  - NOT_FINITE  — `observed` not finite, or the CDF returned a non-finite value.
 *  - DOMAIN      — `observed` not an integer; support bounds not integers;
 *                  a bounded support whose CDF fails to reach 1 at its max.
 *  - UNSUPPORTED — support unbounded below (no truncation point exists).
 *  - NO_CONVERGENCE — the support walk exceeded its iteration budget.
 */
export const crpsDiscrete: CrpsDiscreteFn = (dist, observed) => {
  assertFinite(observed, "observed");
  if (!Number.isInteger(observed)) {
    throw new KernelError(
      "DOMAIN",
      `crpsDiscrete requires an integer observed value, received ${observed}`,
    );
  }

  const support = dist.support();
  const lo = support.min;
  const hi = support.max;

  if (!Number.isFinite(lo)) {
    throw new KernelError(
      "UNSUPPORTED",
      `crpsDiscrete requires a support bounded below, received min=${lo}`,
    );
  }
  if (!Number.isInteger(lo)) {
    throw new KernelError(
      "DOMAIN",
      `crpsDiscrete requires an integer support.min, received ${lo}`,
    );
  }
  if (Number.isFinite(hi) && !Number.isInteger(hi)) {
    throw new KernelError(
      "DOMAIN",
      `crpsDiscrete requires an integer support.max, received ${hi}`,
    );
  }
  if (hi < lo) {
    throw new KernelError(
      "DOMAIN",
      `crpsDiscrete requires support.max >= support.min, received [${lo}, ${hi}]`,
    );
  }

  let total = 0;

  // Region k < support.min: F(k) = 0 and 1{k >= y} = 1 for k in [y, lo − 1].
  // Each such term is exactly (0 − 1)² = 1. Exact, no approximation.
  if (observed < lo) {
    total += lo - observed;
  }

  // Exact evaluation on [support.min, k*].
  let k = lo;
  let lastCdf = 0;
  let reachedTop = false;
  for (let steps = 0; ; steps += 1) {
    if (steps >= MAX_SUPPORT_WALK) {
      throw new KernelError(
        "NO_CONVERGENCE",
        `crpsDiscrete support walk exceeded ${MAX_SUPPORT_WALK} steps without ` +
          `the remaining tail mass falling below ${TAIL_MASS_TOL}`,
      );
    }
    const c = dist.cdf(k);
    assertFinite(c, `cdf(${k})`);
    const delta = c - (k >= observed ? 1 : 0);
    total += delta * delta;

    lastCdf = c;
    reachedTop = k >= hi;
    if (reachedTop || c >= 1 - TAIL_MASS_TOL) break;
    k += 1;
  }

  if (reachedTop && lastCdf < 1 - CDF_CLOSURE_TOL) {
    throw new KernelError(
      "DOMAIN",
      `cdf(${k}) = ${lastCdf} at support.max; a bounded support must reach 1`,
    );
  }

  // Region k > k* with k < observed: F(k) >= 1 − 1e-12, indicator 0, so each
  // term is within 2e-12 of 1. See the TRUNCATION note above.
  if (observed > k) {
    total += observed - 1 - k;
  }

  return total;
};

/**
 * CRPS from an ensemble of draws (simulator output, no closed form):
 *
 *   CRPS = mean_i |X_i − y| − ½ · mean_{i,j} |X_i − X_j|
 *
 * The second term is computed with the O(n log n) sorted-sample identity, NOT
 * the naive O(n²) double loop (the engine draws 10⁴–10⁵ paths per prop). For
 * `x` sorted ascending and 0-indexed:
 *
 *   Σ_{i<j} (x_j − x_i) = Σ_j j·x_j − Σ_i (n − 1 − i)·x_i = Σ_i (2i − n + 1)·x_i
 *
 * because in the ascending order every x_i appears as the larger element of
 * exactly i pairs and as the smaller element of exactly (n − 1 − i) pairs.
 * Since |X_i − X_j| is symmetric and zero on the diagonal,
 *
 *   Σ_{i,j} |x_i − x_j| = 2 · Σ_{i<j} (x_j − x_i) = 2 · Σ_i (2i − n + 1)·x_i
 *   mean_{i,j} |X_i − X_j| = (2 / n²) · Σ_i (2i − n + 1)·x_i
 *
 * so the ½·mean term reduces to (1 / n²) · Σ_i (2i − n + 1)·x_i.
 *
 * The mean over pairs is taken over all n² ordered pairs INCLUDING the n
 * diagonal (zero) terms — that is the definition in the contract. It makes the
 * estimator biased upward by E|X − X'| / (2n), which vanishes at the ensemble
 * sizes this engine uses; the unbiased "fair" variant is a different score and
 * is deliberately not what is specified here.
 *
 * The input array is copied before sorting — never mutated.
 *
 * The returned value is the raw quantity. It is mathematically non-negative
 * (it equals ∫ (F_n(t) − 1{t >= y})² dt for the empirical CDF F_n), and it is
 * deliberately NOT clamped at zero: rounding may leave a residue on the order
 * of 1e-16 · scale, and hiding that behind a clamp would hide real numeric
 * trouble too.
 *
 * Throws:
 *  - EMPTY      — `samples` has no elements.
 *  - NOT_FINITE — `observed` or any sample is not finite.
 */
export const crpsEmpirical: CrpsEmpiricalFn = (samples, observed) => {
  assertNonEmpty(samples, "samples");
  assertFinite(observed, "observed");

  const n = samples.length;

  // Copy before sorting: the caller's ensemble must survive scoring untouched.
  const sorted = samples.slice();
  for (let i = 0; i < n; i += 1) {
    assertFinite(sorted[i]!, `samples[${i}]`);
  }
  sorted.sort((a, b) => a - b);

  let sumAbsToObserved = 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i += 1) {
    const x = sorted[i]!;
    sumAbsToObserved += Math.abs(x - observed);
    weightedSum += (2 * i - n + 1) * x;
  }

  // mean_i |X_i − y|  −  ½ · (2 / n²) · Σ_i (2i − n + 1)·x_(i)
  return sumAbsToObserved / n - weightedSum / (n * n);
};
