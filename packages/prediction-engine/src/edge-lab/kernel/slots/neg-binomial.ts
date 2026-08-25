/**
 * SLOT `neg-binomial` — the volume-count family (attempts, targets, carries,
 * dropbacks given game script).
 *
 * WHY NB AND NOT POISSON
 * A Poisson forces variance = mean. Football volume is almost never like that:
 * game script, pace, and injury-driven role changes inflate the spread of a
 * player's weekly attempts well beyond the Poisson floor. Pricing a 24.5-attempt
 * line off a Poisson understates both tails, which is exactly where the props
 * settle. The negative binomial adds one dispersion parameter and recovers the
 * Poisson as a limiting case, so it is strictly the safer default.
 *
 * PARAMETERIZATION (frozen by the contract, `(r, p)` form)
 *
 *   pmf(k) = C(k + r − 1, k) · p^r · (1 − p)^k,   k = 0, 1, 2, …
 *   mean     = r(1 − p) / p
 *   variance = r(1 − p) / p²  = mean / p  ≥ mean
 *
 * `r` need NOT be an integer (method of moments routinely returns a fractional
 * dispersion), so the binomial coefficient is the GENERALIZED one, evaluated
 * through `logGamma` from `./numeric.js`:
 *
 *   log C(k + r − 1, k) = logΓ(k + r) − logΓ(r) − logΓ(k + 1)
 *
 * For integer `r` this is identical to `logChoose(k + r − 1, k)`; the test suite
 * asserts that equivalence. Everything is computed in LOG SPACE and exponentiated
 * once — there are no raw factorials and no products that can overflow, which is
 * what lets `r = 1e6` (the near-Poisson convention below) evaluate cleanly.
 *
 * PURITY
 * Every export is pure. `makeNegBinomial` closes over a lazily grown cumulative
 * table so that `cdf`, `quantile`, and `sample` are amortized cheap; that table
 * is pure memoization (same inputs → same outputs, no observable side effect, no
 * I/O, no clock, no `Math.random`). All randomness comes from the injected `Rng`.
 */

import {
  KernelError,
  assertCount,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  type DiscreteDistribution,
  type FitNegBinomialFn,
  type MakeNegBinomialFn,
  type NegBinomialParams,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { logGamma } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEAR-POISSON CONVENTION (the documented degeneracy).
 *
 * The negative binomial can only represent variance ≥ mean. When a sample is
 * equi- or UNDER-dispersed (`sampleVariance <= mean`) the method-of-moments
 * equations have no admissible solution: `r = mean² / (variance − mean)` is
 * undefined at equality and negative below it. The contract forbids throwing
 * here — an under-dispersed week of carries is ordinary data, not a bug — so the
 * fit degenerates to the Poisson limit instead.
 *
 * The convention is: `r = 1e6`, `p = r / (r + mean)`.
 *
 * That choice reproduces the sample mean EXACTLY —
 *   mean = r(1 − p)/p = r · (mean/(r + mean)) / (r/(r + mean)) = mean
 * — and inflates the variance by only a factor (1 + mean/r), i.e. one part in
 * 1e5 for a mean of 10. It is therefore a Poisson for every practical purpose
 * while remaining a strictly valid NB, so downstream code needs no special case.
 *
 * `1e6` is also the UPPER CAP applied to a genuinely admissible fit: if the
 * observed overdispersion is so slight that moment matching returns `r > 1e6`,
 * the extra digits are noise, and letting `r` run to 1e12 would only degrade the
 * `logΓ(k + r) − logΓ(r)` cancellation. Such fits are snapped to this same
 * near-Poisson point.
 */
const NEAR_POISSON_R = 1e6;

/**
 * The cumulative table stops growing once it has accumulated this much mass.
 * 1 − 1e-15 is at the edge of double precision, and it is strictly tighter than
 * the 1 − 1e-12 tail threshold `conformance.ts` walks to, so the conformance
 * support walk always terminates inside the saturated region.
 */
const CDF_SATURATION_TOL = 1e-15;

/**
 * The other saturation trigger is the NUMERICAL fixed point: a tail term too
 * small to move the running sum at all (`next === previous`, which includes an
 * underflowed `term === 0`). Because NB tail terms decrease monotonically past
 * the mode, no later term can move it either. Summing thousands of terms
 * accumulates ~1e-14 of rounding, so the running total typically stalls a few
 * ulp BELOW 1 and the `1 − 1e-15` trigger alone would never fire.
 *
 * A stall is only accepted as "all the mass is in" when the total is already
 * within this tolerance of 1. Stalling further away means the tail genuinely
 * has not been accounted for, and that is a NO_CONVERGENCE error, not a result.
 */
const CDF_STALL_TOL = 1e-9;

/**
 * Hard ceiling on the cumulative table. A negative binomial whose mass has not
 * closed within five million integer steps is outside anything this engine
 * prices (that would be a mean in the millions), and silently truncating it
 * would produce a cdf that never reaches 1. Fail closed with NO_CONVERGENCE
 * instead of guessing.
 */
const MAX_SUPPORT_INDEX = 5_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates `(r, p)`.
 *
 * `r > 0` strictly: `r = 0` puts all mass on an empty product and `logΓ(0)` is
 * undefined. `p` must be in (0, 1]: at `p = 0` the "distribution" has zero mass
 * at every k and infinite mean, which is not a probability distribution at all,
 * so it is a DOMAIN error rather than a representable edge case. `p = 1` IS
 * admissible and is the degenerate point mass at 0.
 */
function validateParams(params: NegBinomialParams): void {
  assertFinite(params.r, "params.r");
  if (params.r <= 0) {
    throw new KernelError(
      "DOMAIN",
      `negative binomial requires r > 0, received ${params.r}`,
    );
  }
  assertProbability(params.p, "params.p");
  if (params.p === 0) {
    throw new KernelError(
      "DOMAIN",
      "negative binomial requires p in (0,1]; p = 0 has infinite mean and no normalisable mass",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 1 — method-of-moments fit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Method-of-moments fit of `(r, p)` to observed counts.
 *
 * Matching the first two moments:
 *   p = mean / variance,   r = mean² / (variance − mean)
 *
 * `variance` is the UNBIASED sample variance (denominator n − 1). That is the
 * conventional moment estimator and it avoids systematically understating
 * dispersion — which, on this family, would systematically overstate `r` and
 * hand the book a cheap tail. With a single observation the sample variance is
 * undefined; it is treated as 0, which routes to the near-Poisson branch.
 *
 * Degeneracies (all documented on `NEAR_POISSON_R`, none of which throw):
 *  - `variance <= mean` (equi/under-dispersed) → near-Poisson fit.
 *  - `n === 1`                                 → near-Poisson fit at that value.
 *  - all counts zero                           → near-Poisson with `p = 1`,
 *    i.e. an exact point mass at 0 (mean 0, variance 0).
 *  - admissible but `r > 1e6`                  → snapped to the near-Poisson fit.
 *
 * Throws EMPTY on no counts; DOMAIN on a negative or non-integer count;
 * NOT_FINITE on NaN/Infinity (both via `assertCount`).
 */
export const fitNegBinomial: FitNegBinomialFn = (
  counts: readonly number[],
): NegBinomialParams => {
  assertNonEmpty(counts, "counts");

  const n = counts.length;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const c = counts[i]!;
    assertCount(c, `counts[${i}]`);
    sum += c;
  }
  const mean = sum / n;

  let sumSquaredDeviation = 0;
  for (let i = 0; i < n; i += 1) {
    const d = counts[i]! - mean;
    sumSquaredDeviation += d * d;
  }
  // n === 1: the unbiased sample variance is undefined. Reported as 0, which is
  // the honest statement "this sample exhibits no observed dispersion" and takes
  // the near-Poisson branch below.
  const variance = n > 1 ? sumSquaredDeviation / (n - 1) : 0;

  if (!(variance > mean)) {
    return nearPoissonFit(mean);
  }

  const p = mean / variance;
  const r = (mean * mean) / (variance - mean);

  // `variance > mean` forces mean > 0 (all-zero samples have variance 0), so
  // both are finite and positive here; the guard is belt-and-braces, never
  // silently coercing.
  assertFinite(r, "fitted r");
  assertFinite(p, "fitted p");

  if (r > NEAR_POISSON_R) {
    return nearPoissonFit(mean);
  }
  return { r, p };
};

/** The documented near-Poisson point: `r = 1e6`, `p = r / (r + mean)`. */
function nearPoissonFit(mean: number): NegBinomialParams {
  const r = NEAR_POISSON_R;
  return { r, p: r / (r + mean) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 2 — the distribution object
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a full `DiscreteDistribution` for `NegBinomial(r, p)`.
 *
 * - `pmf`   closed form, evaluated in log space.
 * - `cdf`   cumulative sum of the pmf over a lazily grown, memoized table. There
 *           is no regularized incomplete BETA in `./numeric.js` and slots may not
 *           re-derive shared numerics, so the summation is the sanctioned route;
 *           each term is computed independently in log space (never by a forward
 *           ratio recurrence) so a mode far from 0 cannot start from an
 *           underflowed pmf(0) and stay pinned at zero.
 * - `quantile` smallest k with `cdf(k) >= p`, by binary search over that table.
 * - `sample`   inverse-cdf: `quantile(u)`, `u = rng()`. Chosen over a
 *           gamma-Poisson mixture because it consumes exactly ONE uniform per
 *           draw and is monotone in `u`, which keeps the sample stream stable
 *           and auditable under a fixed seed.
 *
 * Throws DOMAIN / NOT_FINITE for invalid `(r, p)` — see `validateParams`.
 */
export const makeNegBinomial: MakeNegBinomialFn = (
  params: NegBinomialParams,
): DiscreteDistribution => {
  validateParams(params);
  const { r, p } = params;

  /** Degenerate point mass at 0 (mean 0, variance 0). */
  const isPointMass = p === 1;

  const logP = Math.log(p);
  // log1p for accuracy when p is close to 0; -Infinity only when p === 1, which
  // is short-circuited by `isPointMass` before it is ever multiplied by k.
  const log1mP = Math.log1p(-p);
  const logGammaR = logGamma(r);

  const support: Support = { min: 0, max: Number.POSITIVE_INFINITY };

  /** log pmf at a non-negative integer k. */
  function logPmfAt(k: number): number {
    return logGamma(k + r) - logGammaR - logGamma(k + 1) + r * logP + k * log1mP;
  }

  /** pmf at a non-negative integer k (validation already done by the caller). */
  function pmfAt(k: number): number {
    if (isPointMass) return k === 0 ? 1 : 0;
    return Math.exp(logPmfAt(k));
  }

  // ── memoized cumulative table ──────────────────────────────────────────────
  // `cumulative[i]` is the raw running sum of pmf(0..i). `saturated` marks that
  // no further index can add meaningful mass, so the table stops growing.
  const cumulative: number[] = [];
  let saturated = false;

  /** Grows the table by one index. Returns false once saturated. */
  function growOne(): boolean {
    if (saturated) return false;
    const index = cumulative.length;
    if (index > MAX_SUPPORT_INDEX) {
      throw new KernelError(
        "NO_CONVERGENCE",
        `negative binomial cdf did not accumulate unit mass within ${MAX_SUPPORT_INDEX} integer steps (r=${r}, p=${p})`,
      );
    }
    const previous = index === 0 ? 0 : cumulative[index - 1]!;
    const term = pmfAt(index);
    const next = previous + term;
    cumulative.push(next);

    // Saturation trigger 1: unit mass reached to double precision.
    // Saturation trigger 2: the numerical fixed point described on
    // `CDF_STALL_TOL` — the sum can no longer move, and it stalled close enough
    // to 1 that the unaccounted tail is below 1e-9.
    const stalled = next === previous;
    if (next >= 1 - CDF_SATURATION_TOL || (stalled && next >= 1 - CDF_STALL_TOL)) {
      // PINNED TO EXACTLY 1. The shortfall here is at most 1e-9 (in practice a
      // few ulp of accumulated rounding), and a cdf must reach 1 at the top of
      // its support for `quantile(1)` to be well defined. Pinning moves the
      // value by less than the 1e-7 pmf/cdf-consistency tolerance the
      // conformance suite enforces, so it cannot mask a real defect.
      cumulative[index] = 1;
      saturated = true;
      return true;
    }
    if (stalled) {
      throw new KernelError(
        "NO_CONVERGENCE",
        `negative binomial cdf stalled at ${next} before accumulating unit mass (r=${r}, p=${p})`,
      );
    }
    return true;
  }

  /** Ensures the table covers index k (or is saturated below it). */
  function ensureIndex(k: number): void {
    while (cumulative.length <= k) {
      if (!growOne()) return;
    }
  }

  /** Ensures the table's mass reaches `target` (or is saturated below it). */
  function ensureMass(target: number): void {
    for (;;) {
      const last = cumulative.length === 0 ? 0 : cumulative[cumulative.length - 1]!;
      if (cumulative.length > 0 && last >= target) return;
      if (!growOne()) return;
    }
  }

  /**
   * cdf value at a cached index, clamped to 1.
   *
   * CLAMP RATIONALE: the running sum can exceed 1 by a few ulp (and, for the
   * near-Poisson `r = 1e6`, by up to ~1e-9 of accumulated `logΓ` error). A cdf
   * must be a probability, so the excess is clamped away. The clamp only ever
   * moves the value by less than 1e-8, far inside the 1e-7 pmf/cdf consistency
   * tolerance the conformance suite enforces — it never hides a real defect.
   */
  function cdfAtIndex(index: number): Probability {
    return Math.min(1, cumulative[index]!);
  }

  function cdf(k: number): Probability {
    assertFinite(k, "k");
    // The cdf of an integer-valued variable is a step function: P(X <= k) for
    // real k is P(X <= floor(k)).
    const floor = Math.floor(k);
    if (floor < 0) return 0;
    ensureIndex(floor);
    const index = Math.min(floor, cumulative.length - 1);
    return cdfAtIndex(index);
  }

  function quantile(probability: Probability): number {
    assertProbability(probability, "p");
    ensureMass(probability);
    const highIndex = cumulative.length - 1;
    // Only reachable for probability === 1 when the running sum saturated on the
    // underflow trigger just short of 1. The saturation index is then the
    // largest representable outcome, and `cdfAtIndex` reports 1 there.
    if (cdfAtIndex(highIndex) < probability) return highIndex;
    let lo = 0;
    let hi = highIndex;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdfAtIndex(mid) >= probability) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return lo;
  }

  function sample(rng: Rng): number {
    const u = rng();
    assertFinite(u, "rng() output");
    if (u < 0 || u >= 1) {
      throw new KernelError("DOMAIN", `rng() must return a value in [0,1), received ${u}`);
    }
    return quantile(u);
  }

  return {
    kind: "discrete",
    pmf(k: number): Probability {
      assertFinite(k, "k");
      if (!Number.isInteger(k)) {
        throw new KernelError(
          "DOMAIN",
          `negative binomial pmf requires an integer k, received ${k}`,
        );
      }
      // Below the support: zero mass, per the `DiscreteDistribution` contract
      // ("Zero outside the support"). Non-integer k is the DOMAIN error above.
      if (k < 0) return 0;
      return pmfAt(k);
    },
    cdf,
    quantile,
    sample,
    mean(): number {
      return (r * (1 - p)) / p;
    },
    variance(): number {
      return (r * (1 - p)) / (p * p);
    },
    support(): Support {
      return support;
    },
  };
};
