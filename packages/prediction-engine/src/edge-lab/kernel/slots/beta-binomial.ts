/**
 * SLOT `beta-binomial` — the RATE-GIVEN-EXPOSURE family: catch|targets,
 * completions|attempts, sacks|dropbacks, made|attempted.
 *
 * WHY BETA-BINOMIAL AND NOT BINOMIAL
 * A plain Binomial(n, p) asserts that every trial shares one fixed success rate
 * and that the rate is known. Neither holds. A receiver's catch rate drifts with
 * coverage, weather, and who is throwing; a kicker's make rate drifts with
 * distance and surface. Pricing a "2.5 receptions on 5 targets" prop off a
 * binomial therefore understates BOTH tails, because it charges nothing for
 * uncertainty in the rate itself. The beta-binomial integrates the rate over a
 * Beta(alpha, beta) prior:
 *
 *   p ~ Beta(alpha, beta),   X | p ~ Binomial(n, p)
 *
 * which adds exactly one dispersion parameter and recovers the binomial in the
 * limit alpha + beta -> infinity at fixed ratio. It is strictly the safer default.
 *
 * PARAMETERIZATION (frozen by the contract)
 *
 *   pmf(k) = C(n, k) · B(k + alpha, n − k + beta) / B(alpha, beta),  k = 0..n
 *   mean     = n · alpha / (alpha + beta)
 *   variance = n · alpha · beta · (alpha + beta + n)
 *              ───────────────────────────────────────
 *                (alpha + beta)² · (alpha + beta + 1)
 *
 * The variance is the binomial variance n·mu·(1−mu) multiplied by the variance
 * inflation factor (s + n) / (s + 1), where s = alpha + beta is the
 * CONCENTRATION. That factor is >= 1 for every n >= 1, which is the family's one
 * structural limitation: a beta-binomial can be over-dispersed relative to a
 * binomial but never under-dispersed. The fit's degeneracy policy below is built
 * around that fact.
 *
 * NUMERICS
 * Everything is evaluated in LOG SPACE through `logChoose` and `logBeta` from
 * `./numeric.js` and exponentiated once. There are no raw factorials and no
 * products that can overflow, which is what lets the near-binomial convention
 * (s = 1e6) below evaluate cleanly.
 *
 * PURITY
 * Every export is pure. `makeBetaBinomial` closes over a lazily grown cumulative
 * table so that `cdf`, `quantile`, and `sample` are amortized cheap; that table
 * is pure memoization (same inputs -> same outputs, no observable side effect, no
 * I/O, no clock, no `Math.random`). All randomness comes from the injected `Rng`.
 */

import {
  KernelError,
  assertCount,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  assertSameLength,
  type BetaBinomialParams,
  type DiscreteDistribution,
  type FitBetaBinomialFn,
  type MakeBetaBinomialFn,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { logBeta, logChoose } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants (the fit's degeneracy policy lives here)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEAR-BINOMIAL CONVENTION (the primary documented degeneracy).
 *
 * The beta-binomial can only represent variance >= the binomial variance: the
 * inflation factor (s + n)/(s + 1) is bounded below by 1 and reaches 1 only as
 * s -> infinity. When the observed success/trial pairs show no MORE spread than
 * binomial sampling alone would produce, the method of moments returns an
 * intra-class correlation rho <= 0 and there is no admissible (alpha, beta).
 *
 * Throwing there would be wrong: an under-dispersed week of catch rates is
 * ordinary data, not a bug. So the fit degenerates to the binomial limit:
 *
 *   s = alpha + beta = 1e6,   alpha = p̂ · s,   beta = (1 − p̂) · s
 *
 * That choice reproduces the pooled success rate EXACTLY —
 *   mean / n = alpha / (alpha + beta) = p̂
 * — and inflates the variance by only (1e6 + n)/(1e6 + 1), i.e. one part in 1e5
 * for n = 100. It is a binomial for every practical purpose while remaining a
 * strictly valid beta-binomial with strictly positive parameters, so downstream
 * code needs no special case.
 *
 * `1e6` is also the UPPER CAP on a genuinely admissible fit: if the observed
 * overdispersion is so slight that moment matching returns s > 1e6, the extra
 * digits are noise, and letting s run to 1e12 would only degrade the cancellation
 * in logBeta(k + alpha, n − k + beta) − logBeta(alpha, beta). Measured cost at
 * s = 1e6: the pmf sums to 1 ± 4e-10 rather than 1 ± 3e-15, because logGamma's
 * ~1e-13 RELATIVE error is evaluated at arguments of magnitude 1.3e7 in log
 * space. That is nine orders inside the conformance suite's 1e-6 bar; at
 * s = 1e12 it would not be.
 */
const NEAR_BINOMIAL_CONCENTRATION = 1e6;

/**
 * LOWER CAP on the fitted concentration (the opposite degeneracy).
 *
 * rho -> 1 (equivalently s -> 0) is the all-or-nothing limit: the rate is drawn
 * once as 0 or 1 and every trial in a row agrees. It is a legitimate limit of
 * the family but not a member of it — s = 0 makes B(alpha, beta) undefined. A
 * moment estimate at or beyond rho = 1 is therefore snapped to s = 1e-6, which
 * puts ~p̂ of the mass on k = n and ~(1 − p̂) on k = 0 and leaves less than 1e-6
 * of it anywhere else. Strictly positive, fully evaluable, and honest about what
 * the data said.
 */
const MIN_CONCENTRATION = 1e-6;

/**
 * FINAL POSITIVITY FALLBACK for the returned alpha and beta.
 *
 * The contract requires both strictly positive. The branches above already
 * guarantee that for every reachable input: the boundary branch bounds p̃ away
 * from 0 and 1 by the Jeffreys correction, and s is bounded below by
 * MIN_CONCENTRATION. This fallback exists so the guarantee is unconditional
 * rather than argued.
 *
 * It is a FALLBACK, not a clamp: it is substituted only when p·s (or (1−p)·s)
 * is not a strictly positive finite number, i.e. only when the natural value
 * has underflowed to zero. Clamping every value up to 1e-12 instead would be
 * REACHABLE and would silently break the fit's headline guarantee that every
 * branch reproduces the pooled rate exactly — at the all-or-nothing floor
 * s = MIN_CONCENTRATION = 1e-6, p·s drops under 1e-12 as soon as the pooled
 * rate drops under 1e-6, which needs only ~1e6 pooled trials (not the ~1e17
 * an earlier revision of this comment claimed). Substituting only for a value
 * that is not representable keeps both promises simultaneously: strictly
 * positive parameters, and an exactly reproduced pooled rate.
 */
const MIN_PARAM = 1e-12;

/**
 * The cumulative table's saturation tolerance. Unlike an unbounded family, the
 * support here is finite, so the table simply stops at `n`; this constant only
 * guards the cdf against a running sum that drifts a few ulp above 1.
 */
const CDF_CLAMP_MAX = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates `(n, alpha, beta)`.
 *
 * `n` must be a non-negative integer — it is a trial COUNT. `n = 0` is
 * admissible and is the degenerate point mass at 0 (no trials, no successes);
 * it is a real state for a receiver who was inactive, so it is representable
 * rather than an error.
 *
 * `alpha, beta > 0` strictly: `logBeta` is undefined at 0 and the family has no
 * meaning for negative concentration.
 */
function validateParams(params: BetaBinomialParams): void {
  assertCount(params.n, "params.n");
  assertFinite(params.alpha, "params.alpha");
  if (params.alpha <= 0) {
    throw new KernelError(
      "DOMAIN",
      `beta-binomial requires alpha > 0, received ${params.alpha}`,
    );
  }
  assertFinite(params.beta, "params.beta");
  if (params.beta <= 0) {
    throw new KernelError(
      "DOMAIN",
      `beta-binomial requires beta > 0, received ${params.beta}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 1 — method-of-moments fit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Method-of-moments fit of `(alpha, beta)` to observed (successes, trials) pairs
 * with UNEQUAL trial counts — Kleinman's moment estimator of the intra-class
 * correlation.
 *
 * THE ESTIMATOR
 * Write p̂ᵢ = xᵢ / nᵢ, n• = Σnᵢ, p̂ = Σxᵢ / n•, and rho = 1 / (alpha + beta + 1),
 * so that Var(p̂ᵢ) = p(1−p)·[1 + (nᵢ − 1)·rho] / nᵢ. Taking
 *
 *   S = Σ nᵢ (p̂ᵢ − p̂)²
 *
 * and subtracting the n•·Var(p̂) absorbed by centring on p̂ rather than p gives
 *
 *   E[S] = p(1−p) · { (N − 1) + rho · [ n• − N − Σnᵢ²/n• + 1 ] }
 *
 * so with  A = N − 1  and  B = n• − N − Σnᵢ²/n• + 1,
 *
 *   rhô = ( S / (p̂(1 − p̂)) − A ) / B
 *
 * For equal trial counts nᵢ = n this collapses to the textbook balanced form
 * B = (N − 1)(n − 1). Then
 *
 *   s = alpha + beta = 1/rhô − 1,   alpha = p̂ · s,   beta = (1 − p̂) · s
 *
 * which matches the first two moments of the pooled data by construction.
 *
 * DEGENERACY POLICY (none of these throw; all reproduce the pooled rate exactly)
 *  - No row has `trials > 0` (every exposure is zero) -> `{ alpha: 1, beta: 1 }`,
 *    the uniform Beta(1,1). There is literally no evidence about the rate, and
 *    the uniform is the maximally non-committal proper prior; it also makes the
 *    resulting distribution the discrete uniform on 0..n, which is the correct
 *    "we know nothing" predictive.
 *  - p̂ = 0 (all failures) or p̂ = 1 (all successes). Both force S = 0, so rho is
 *    unestimable, AND p̂·s or (1 − p̂)·s would be zero, violating strict
 *    positivity. Policy: the JEFFREYS continuity correction
 *      p̃ = (Σxᵢ + 0.5) / (n• + 1)
 *    (the Beta(½,½) posterior mean, the standard boundary correction for a
 *    proportion) together with the near-binomial concentration. So 40-for-40
 *    fits a rate just under 1, never exactly 1 — the engine never claims a
 *    certainty the data cannot support.
 *  - B <= 0: no dispersion information at all. This happens exactly when N = 1
 *    (a single observation) and when every row is a single Bernoulli trial —
 *    in both cases within-row and between-row variation are not separable.
 *    -> near-binomial at p̂.
 *  - rhô <= 0, i.e. observed spread at or below the binomial floor (this covers
 *    the zero-variance case S = 0, where every p̂ᵢ is identical), or an
 *    admissible fit with s > 1e6 -> near-binomial at p̂.
 *  - rhô >= 1 -> s floored at MIN_CONCENTRATION (see that constant).
 *
 * Rows with `trials === 0` carry no information (p̂ᵢ is undefined) and are
 * dropped before any of the above; they do not count toward N.
 *
 * Throws MISMATCHED_LENGTH if the arrays do not align; EMPTY if there are no
 * pairs; DOMAIN on a negative/non-integer count or on `successes[i] > trials[i]`;
 * NOT_FINITE on NaN/Infinity.
 */
export const fitBetaBinomial: FitBetaBinomialFn = (
  successes: readonly number[],
  trials: readonly number[],
): Omit<BetaBinomialParams, "n"> => {
  assertSameLength(successes, trials, "successes", "trials");
  assertNonEmpty(successes, "successes");

  const rows = successes.length;
  // Informative rows only (trials > 0); parallel arrays for the second pass.
  const rowTrials: number[] = [];
  const rowProportions: number[] = [];
  let totalSuccesses = 0;
  let totalTrials = 0;
  let sumSquaredTrials = 0;

  for (let i = 0; i < rows; i += 1) {
    const t = trials[i]!;
    const x = successes[i]!;
    assertCount(t, `trials[${i}]`);
    assertCount(x, `successes[${i}]`);
    if (x > t) {
      throw new KernelError(
        "DOMAIN",
        `successes[${i}] (${x}) must not exceed trials[${i}] (${t})`,
      );
    }
    if (t === 0) continue;
    rowTrials.push(t);
    rowProportions.push(x / t);
    totalSuccesses += x;
    totalTrials += t;
    sumSquaredTrials += t * t;
  }

  // Degeneracy 1 — every exposure is zero: no evidence, uniform prior.
  if (rowTrials.length === 0) {
    return { alpha: 1, beta: 1 };
  }

  const pooled = totalSuccesses / totalTrials;

  // Degeneracy 2 — boundary proportion: Jeffreys correction + binomial limit.
  if (pooled === 0 || pooled === 1) {
    const jeffreys = (totalSuccesses + 0.5) / (totalTrials + 1);
    return concentrationToParams(jeffreys, NEAR_BINOMIAL_CONCENTRATION);
  }

  const informativeRows = rowTrials.length;
  const a = informativeRows - 1;
  const b = totalTrials - informativeRows - sumSquaredTrials / totalTrials + 1;

  // Degeneracy 3 — no separable dispersion information (N = 1, or all-Bernoulli).
  if (!(b > 0)) {
    return concentrationToParams(pooled, NEAR_BINOMIAL_CONCENTRATION);
  }

  let weightedScatter = 0;
  for (let j = 0; j < informativeRows; j += 1) {
    const d = rowProportions[j]! - pooled;
    weightedScatter += rowTrials[j]! * d * d;
  }

  const chiSquare = weightedScatter / (pooled * (1 - pooled));
  const rho = (chiSquare - a) / b;
  assertFinite(rho, "fitted intra-class correlation");

  let concentration: number;
  if (!(rho > 0)) {
    // Degeneracy 4 — at or below the binomial dispersion floor.
    concentration = NEAR_BINOMIAL_CONCENTRATION;
  } else if (rho >= 1) {
    // Degeneracy 5 — at or beyond the all-or-nothing limit.
    concentration = MIN_CONCENTRATION;
  } else {
    const s = 1 / rho - 1;
    // Upper cap is the same near-binomial point; lower cap is unreachable here
    // (rho < 1 implies s > 0) but is applied for a single exit invariant.
    concentration = Math.min(
      NEAR_BINOMIAL_CONCENTRATION,
      Math.max(MIN_CONCENTRATION, s),
    );
  }

  return concentrationToParams(pooled, concentration);
};

/**
 * Splits a concentration `s` across a mean rate `p` into (alpha, beta) with the
 * documented strict-positivity fallback applied. See `MIN_PARAM`.
 */
function concentrationToParams(
  p: number,
  s: number,
): Omit<BetaBinomialParams, "n"> {
  const rawAlpha = p * s;
  const rawBeta = (1 - p) * s;
  // NaN-safe positivity test (`!(finite && > 0)`, never `<= 0`): the fallback
  // is substituted only for a value that is not a representable positive
  // number, so a representable one is never distorted.
  const alpha = Number.isFinite(rawAlpha) && rawAlpha > 0 ? rawAlpha : MIN_PARAM;
  const beta = Number.isFinite(rawBeta) && rawBeta > 0 ? rawBeta : MIN_PARAM;
  assertFinite(alpha, "fitted alpha");
  assertFinite(beta, "fitted beta");
  return { alpha, beta };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 2 — the distribution object
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a full `DiscreteDistribution` for `BetaBinomial(n, alpha, beta)` on the
 * bounded support {0, 1, …, n}.
 *
 * - `pmf`      closed form via `logChoose` + `logBeta`, exponentiated once.
 * - `cdf`      cumulative sum of the pmf over a lazily grown, memoized table.
 *              Each term is computed independently in log space (never by a
 *              forward ratio recurrence), so a mode far from 0 cannot start from
 *              an underflowed pmf(0) and stay pinned at zero.
 * - `quantile` smallest k with `cdf(k) >= p`, by binary search on [0, n].
 * - `sample`   inverse-cdf: `quantile(u)`, `u = rng()`. Chosen over a
 *              beta-then-binomial two-stage draw because it consumes exactly ONE
 *              uniform per draw and is monotone in `u`, which keeps the sample
 *              stream stable and auditable under a fixed seed.
 *
 * Throws DOMAIN / NOT_FINITE for invalid `(n, alpha, beta)` — see
 * `validateParams`.
 */
export const makeBetaBinomial: MakeBetaBinomialFn = (
  params: BetaBinomialParams,
): DiscreteDistribution => {
  validateParams(params);
  const { n, alpha, beta } = params;

  const logBetaAlphaBeta = logBeta(alpha, beta);
  const concentration = alpha + beta;
  const support: Support = { min: 0, max: n };

  /** pmf at an integer k in [0, n] (validation already done by the caller). */
  function pmfAt(k: number): number {
    return Math.exp(
      logChoose(n, k) + logBeta(k + alpha, n - k + beta) - logBetaAlphaBeta,
    );
  }

  // ── memoized cumulative table over the bounded support ─────────────────────
  // `cumulative[i]` is the raw running sum of pmf(0..i), grown on demand and
  // never beyond index n. This is pure memoization: identical inputs always
  // produce identical outputs.
  const cumulative: number[] = [];

  /** Ensures the table covers index k (0 <= k <= n). */
  function ensureIndex(k: number): void {
    while (cumulative.length <= k) {
      const index = cumulative.length;
      const previous = index === 0 ? 0 : cumulative[index - 1]!;
      cumulative.push(previous + pmfAt(index));
    }
  }

  /**
   * P(X <= k) for integer k in [0, n].
   *
   * CLAMP RATIONALE: the analytic total mass over this BOUNDED support is
   * exactly 1, so the running sum's departure from 1 is pure floating-point
   * residual (order 1e-13 from `logGamma`'s 1e-13 relative error). Interior
   * indices are clamped from above at 1 because a cdf must be a probability;
   * the top index returns exactly 1 because that is the analytic value, not an
   * approximation. Both adjustments move the value by less than 1e-8 — far
   * inside the 1e-7 pmf/cdf consistency tolerance the conformance suite
   * enforces — so neither can hide a real defect.
   */
  function cdfAtIndex(index: number): Probability {
    if (index >= n) return 1;
    ensureIndex(index);
    return Math.min(CDF_CLAMP_MAX, cumulative[index]!);
  }

  function cdf(k: number): Probability {
    assertFinite(k, "k");
    // The cdf of an integer-valued variable is a step function: P(X <= k) for
    // real k is P(X <= floor(k)).
    const floor = Math.floor(k);
    if (floor < 0) return 0;
    return cdfAtIndex(floor);
  }

  function quantile(probability: Probability): number {
    assertProbability(probability, "p");
    // Generalized inverse: the smallest k in the support with cdf(k) >= p.
    // p = 0 is satisfied at k = 0 since cdf is non-negative everywhere.
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      // Math.floor rather than >>1: n is only bounded by MAX_SAFE_INTEGER and a
      // bit-shift would wrap above 2³¹.
      const mid = Math.floor((lo + hi) / 2);
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
          `beta-binomial pmf requires an integer k, received ${k}`,
        );
      }
      // Outside the support: zero mass, per the `DiscreteDistribution` contract
      // ("Zero outside the support"). Non-integer k is the DOMAIN error above.
      if (k < 0 || k > n) return 0;
      return pmfAt(k);
    },
    cdf,
    quantile,
    sample,
    // MOMENTS — evaluated through the mean RATE, not through the raw ratio.
    //
    // The textbook forms `(n·alpha)/s` and `n·alpha·beta·(s + n) / (s²·(s + 1))`
    // are algebraically right and numerically fragile: `n·alpha` overflows to
    // Infinity once it passes ~1.8e308, and `s²·(s + 1)` overflows for
    // s > ~5.6e102 and underflows to zero for s < ~1e-154. Each blow-up makes
    // the surviving expression Infinity/Infinity or 0/0, i.e. a silent NaN, and
    // the contract's rule 3 forbids ever returning one. Splitting the ratio
    // into the bounded factors alpha/s and beta/s — each in (0, 1) by
    // construction — removes every overflow path. The identity is exact
    // (n·(alpha/s)·(beta/s)·(s + n)/(s + 1) is the same expression regrouped)
    // and agrees with the raw form to within one ulp on ordinary parameters.
    mean(): number {
      return n * (alpha / concentration);
    },
    variance(): number {
      const successRate = alpha / concentration;
      const failureRate = beta / concentration;
      const inflation = (concentration + n) / (concentration + 1);
      return n * successRate * failureRate * inflation;
    },
    support(): Support {
      return support;
    },
  };
};
