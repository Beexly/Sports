/**
 * SLOT `lognormal-tail` — YAC and per-reception yardage: a Normal BODY plus a
 * lognormal TAIL, mixed with weight `tailWeight`.
 *
 * WHY THIS SHAPE (and what the naive alternative gets wrong)
 * Yards after the catch are not symmetric. The overwhelming majority of catches
 * gain a handful of yards — some LOSE yards, because being tackled behind the
 * point of the catch is an ordinary football event — and a small minority break
 * for a share of the game's total yardage that no symmetric distribution will
 * ever produce. Fitting one Gaussian to that sample sets its mean at the
 * average of a right-skewed variable, which sits well ABOVE the typical
 * outcome. The book's line is anchored near that mean. So a mean-anchored line
 * is beaten by the under more often than a symmetric model believes: the
 * probability mass below the mean is not 0.5, it can be 0.7–0.8. THAT
 * asymmetry is the edge this slot exists to express, and it only exists if the
 * model keeps the median and the mean apart. A Normal cannot: it forces
 * median = mean, prices the under at a coin flip, and hands the number back.
 *
 * The mixture keeps both facts at once:
 *   - a Normal body on (−∞, ∞) — the routine catch, and the tackle for a loss.
 *     The body is deliberately NOT truncated at 0. Truncating it would move the
 *     body mass upward, shrink the mean/median gap, and quietly destroy the
 *     very edge above.
 *   - a lognormal tail on [0, ∞) — the broken play. Lognormal because a broken
 *     play is multiplicative (a missed tackle compounds into open field), and
 *     because its right tail is heavy enough to carry a large share of the mean
 *     with a small share of the probability.
 *
 * PARAMETERIZATION (frozen by the contract)
 *
 *   cdf(x) = (1 − w)·Φ((x − bodyMean) / bodySd)
 *          + w·Φ((ln x − tailMu) / tailSigma)      [second term 0 for x ≤ 0]
 *
 *   pdf(x) = (1 − w)·φ((x − bodyMean)/bodySd) / bodySd
 *          + w·φ((ln x − tailMu)/tailSigma) / (x·tailSigma)   [0 for x ≤ 0]
 *
 * The lognormal density → 0 as x → 0⁺ faster than 1/x diverges, so the mixture
 * density is continuous at 0 even though the tail's support starts there.
 *
 * MOMENTS — derived from E[X²], evaluated by the law-of-total-variance form
 *
 * Write C for the component indicator, P(C = tail) = w. Both component moments
 * are standard:
 *   E[X | body] = bodyMean            E[X² | body] = bodyMean² + bodySd²
 *   E[X | tail] = m_T                 E[X² | tail] = exp(2·tailMu + 2·tailSigma²)
 * with m_T = exp(tailMu + tailSigma²/2) the lognormal mean. Note the second
 * lognormal moment factors as exp(2μ + 2σ²) = m_T²·exp(σ²), since
 * m_T² = exp(2μ + σ²).
 *
 * The mixture law E[g(X)] = (1 − w)·E[g(X) | body] + w·E[g(X) | tail] gives
 *   mean  = (1 − w)·bodyMean + w·m_T
 *   E[X²] = (1 − w)·(bodyMean² + bodySd²) + w·exp(2·tailMu + 2·tailSigma²)
 *   var   = E[X²] − mean²                                              (†)
 *
 * (†) reduces algebraically to the law-of-total-variance form. Split E[X²] into
 * its variance and squared-mean parts per component:
 *   E[X²] = (1 − w)·(bodySd² + bodyMean²) + w·(v_T + m_T²),
 *           v_T = (exp(tailSigma²) − 1)·m_T²   [since m_T²·exp(σ²) = v_T + m_T²]
 * so
 *   var = [(1 − w)·bodySd² + w·v_T]                       ← within-component
 *       + [(1 − w)·bodyMean² + w·m_T² − mean²]            ← between-component
 * and the second bracket is the two-point variance identity
 *   (1 − w)a² + w b² − ((1 − w)a + w b)² = w(1 − w)(a − b)²,
 * which yields
 *   var = (1 − w)·bodySd² + w·v_T + w(1 − w)·(bodyMean − m_T)².
 *
 * The two expressions are identical in exact arithmetic; `variance()` evaluates
 * the reduced one because the literal `E[X²] − mean²` route subtracts two
 * numbers that are both ~exp(2·tailMu + tailSigma²) — for a small tailSigma they
 * agree to 15 digits and the difference is pure rounding noise. The reduced form
 * never subtracts two large numbers, and `expm1` keeps the (exp(σ²) − 1) factor
 * of v_T accurate as σ → 0. The equivalence is pinned by a test that computes
 * E[X²] from the contract's formula and checks var = E[X²] − mean².
 *
 * QUANTILES — bisection, and why the bracket is the hard part
 * There is no closed form for the inverse of a mixture cdf, so `quantile` is a
 * monotone bisection (tolerance below). The failure mode is not the bisection,
 * it is the BRACKET. With w = 1e-6 and tailSigma = 3 the 1 − 1e-9 quantile sits
 * near 1e4 while the body scale is 1; push tailSigma to 6 and it is past 1e12.
 * Any fixed bracket — [mean ± 10·sd], [0, 1e6], anything — silently returns its
 * own upper end for exactly the deep-tail queries this slot is built to answer,
 * which is the worst possible failure: a confident, wrong, too-small number on
 * the side of the market where the money is. So the bracket is derived from the
 * parameters and then VERIFIED against the cdf, and expanded geometrically
 * until it genuinely brackets. See `quantile` for the full construction.
 *
 * PURITY
 * Every export is pure: no I/O, no clock, no `Math.random`. `sample` consumes
 * only the injected `Rng`, and consumes exactly three uniforms per draw
 * regardless of which component is selected (see `sample`).
 */

import {
  KernelError,
  assertFinite,
  assertProbability,
  type ContinuousDistribution,
  type LognormalTailMixtureParams,
  type MakeLognormalTailMixtureFn,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { boxMuller, normalCdf, normalQuantile } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standardised-argument saturation point for the standard normal cdf.
 *
 * This guard is NOT an optimisation, it is a correctness requirement.
 * `normalCdf` in `./numeric.js` routes through `erf(x) = P(1/2, x²)`, and `x²`
 * OVERFLOWS to Infinity for |x| > 1.34e154, at which point `regularizedGammaP`
 * fails its own `assertFinite` and throws NOT_FINITE. A mixture cdf must be
 * evaluable at any finite x — the bracket expansion below deliberately walks
 * out to 1e300 — and `(x − bodyMean)/bodySd` reaches 1e154 for x = 1e154 with
 * bodySd = 1, or for a much smaller x with a small bodySd. Without this guard
 * `cdf(1e200)` throws instead of returning 1.
 *
 * 40 is safe on both sides: Φ(−40) already underflows to exactly 0 and Φ(40)
 * already rounds to exactly 1 in `normalCdf` itself (Φ hits the double floor
 * near |z| = 8.4), so the guard returns precisely what the underlying routine
 * would have returned. It changes no value; it only prevents the overflow.
 */
const NORMAL_SATURATION_Z = 40;

/**
 * Bisection tolerance, mandated as 1e-10 by the contract. It is applied as a
 * CONJUNCTION of two arms, and the bisection stops only when BOTH hold:
 *
 *   (x-arm) hi − lo <= 1e-10 · max(1, |lo|, |hi|)
 *   (p-arm) F(hi) − F(lo) <= 1e-10
 *
 * Neither arm is sufficient alone, and the reason is the whole difficulty of
 * inverting this particular family:
 *
 *  - A PURE ABSOLUTE x-tolerance is unreachable exactly where this slot is
 *    used. ulp(4e5) already exceeds 1e-10, so a quantile past ~4e5 can never be
 *    bracketed to 1e-10 in double precision — and the heavy-tail quantiles this
 *    family exists to price routinely exceed 1e4 and can exceed 1e12. Absolute
 *    alone means an infinite loop, or a spurious NO_CONVERGENCE.
 *  - The MIXED x-arm alone is scale-blind in the other direction: a body with
 *    bodySd = 1e-6 has a density near 4e5, so a bracket 1e-10 wide in x still
 *    spans 4e-5 of PROBABILITY, and `cdf(quantile(p))` comes back ~1e-5 away
 *    from p. Every consumer of this slot (PIT, CRPS, line pricing) works in
 *    probability space, so that is the error that matters.
 *  - The p-arm alone cannot terminate on a numerical PLATEAU (Φ underflows to
 *    exactly 0 below z ≈ −8.4), where F(hi) − F(lo) is 0 but so is every other
 *    bracket, and it cannot terminate on a spike narrower than the local ulp.
 *
 * Together they give the guarantee the rest of the engine is entitled to rely
 * on: 0 <= cdf(quantile(p)) − p <= 1e-10, with the x-arm keeping the returned
 * ABSCISSA meaningful when the cdf itself has gone flat.
 *
 * DOCUMENTED PRECISION FLOORS (neither is hidden, both are pinned by tests):
 *  - The absolute arm means a quantile whose true magnitude is below 1e-10 —
 *    only reachable in the deep LOWER tail of a nearly pure lognormal, e.g.
 *    p ≈ 1e-300 — is resolved only to ±1e-10. This slot prices the RIGHT tail.
 *  - If the distribution is narrower than the local ulp (bodySd = 1e-300 at
 *    bodyMean = 5), its cdf IS a step function in double precision and no
 *    quantile can round-trip in probability at all. The bisection then exits on
 *    the adjacent-doubles rule with the best abscissa the type can represent.
 */
const QUANTILE_TOLERANCE = 1e-10;

/**
 * Hard iteration cap on the bisection loop.
 *
 * WHY A CAP IS NEEDED AT ALL — bisection provably halves its bracket, so it
 * "always converges". What is not guaranteed is that the STOPPING PREDICATE
 * ever becomes true. Two ways it does not:
 *  1. A tolerance below the local ulp (the reason for both arms above). With a
 *     pure 1e-10 absolute tolerance and a quantile near 1e12, `hi − lo` bottoms
 *     out around 2e-4 and the loop never exits. That is the cap being reachable
 *     in principle.
 *  2. A cdf that is flat to double precision over the bracket — the underflow
 *     plateaus described on `quantile`. A predicate phrased ONLY on the cdf
 *     value (|F(mid) − p| < tol) is unsatisfiable there no matter how many
 *     iterations run, which is why the p-arm is a conjunct and not the sole
 *     criterion.
 * With both defences plus the adjacent-doubles exit, every finite bracket
 * terminates: the whole double range spans ~2100 halvings (1.8e308 down to the
 * 5e-324 subnormal floor), so the cap is set just above that. It is therefore a
 * structural backstop — reachable only if the cdf stops being monotone, which
 * would be a defect — and failing closed with NO_CONVERGENCE beats looping
 * forever inside a pricing job.
 */
const MAX_BISECTION_ITERATIONS = 2200;

/**
 * Hard cap on geometric bracket expansions. Each expansion doubles the step, so
 * from the smallest step this slot ever uses (`MIN_EXPANSION_STEP` = 1e-12) it
 * takes log2(1.8e308 / 1e-12) ≈ 1064 doublings to walk off the end of the
 * finite doubles. The cap sits just above that, so a legitimate expansion — the
 * `tailSigma = 128` case where the analytic bracket overflows but the answer is
 * still representable near 1e305 needs ~1010 of them — always completes, and
 * the explicit non-finite check in `expand` is what actually reports a quantile
 * that is not representable.
 */
const MAX_BRACKET_EXPANSIONS = 1100;

/**
 * Floor on the initial expansion step. Prevents a zero or denormal step (which
 * doubling can never grow out of, or grows out of only after ~1000 iterations)
 * when every scale in the parameters rounds to zero.
 */
const MIN_EXPANSION_STEP = 1e-12;

/** 1/√(2π) — the standard normal density normalising constant. */
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

// ─────────────────────────────────────────────────────────────────────────────
// Guarded primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard normal cdf, saturated at ±`NORMAL_SATURATION_Z` so that an extreme
 * standardised argument returns 0/1 instead of throwing NOT_FINITE out of
 * `regularizedGammaP`. See `NORMAL_SATURATION_Z`.
 *
 * A NaN argument still reaches `normalCdf` and still throws NOT_FINITE — the
 * guard must not launder a NaN into a probability.
 */
function saturatedNormalCdf(z: number): Probability {
  if (z >= NORMAL_SATURATION_Z) return 1;
  if (z <= -NORMAL_SATURATION_Z) return 0;
  return normalCdf(z);
}

/** Standard normal density φ(z); underflows to 0 rather than overflowing. */
function standardNormalPdf(z: number): number {
  // z*z is Infinity for |z| > 1.3e154, and exp(−Infinity) is 0 — the correct
  // limit — so no guard is needed here, unlike the cdf.
  return INV_SQRT_2PI * Math.exp(-0.5 * z * z);
}

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation — every path fails closed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates all five parameters.
 *
 * Failure modes:
 *  - NOT_FINITE — any of the five is NaN or ±Infinity.
 *  - DOMAIN     — `tailWeight` outside [0, 1]; `bodySd <= 0`; `tailSigma <= 0`.
 *
 * `bodySd = 0` is a point mass at `bodyMean`. It is rejected rather than
 * supported: its cdf is a step, so it has no density to report from `pdf`, its
 * quantile is not a bisection problem, and every downstream consumer of this
 * slot (CRPS, PIT, line pricing) would be handed a distribution whose PIT is
 * degenerate. A caller who genuinely wants a point mass wants a different
 * object, not this one. `tailSigma = 0` is rejected for the same reason.
 *
 * ALL FIVE are validated even when a weight makes a component inert (w = 0
 * leaves the tail unused, w = 1 leaves the body unused). A mis-specified
 * parameter must not slip through on the strength of its weight — otherwise a
 * sweep that raises w from 0 to 0.01 would suddenly start throwing on a params
 * object that "worked" a moment earlier.
 */
function validateParams(params: LognormalTailMixtureParams): void {
  assertProbability(params.tailWeight, "params.tailWeight");
  assertFinite(params.bodyMean, "params.bodyMean");
  assertFinite(params.bodySd, "params.bodySd");
  if (params.bodySd <= 0) {
    throw new KernelError(
      "DOMAIN",
      `lognormal-tail mixture requires bodySd > 0 (bodySd = 0 is a point mass, which has no density), received ${params.bodySd}`,
    );
  }
  assertFinite(params.tailMu, "params.tailMu");
  assertFinite(params.tailSigma, "params.tailSigma");
  if (params.tailSigma <= 0) {
    throw new KernelError(
      "DOMAIN",
      `lognormal-tail mixture requires tailSigma > 0 (tailSigma = 0 is a point mass at exp(tailMu)), received ${params.tailSigma}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the `ContinuousDistribution` for the Normal-body / lognormal-tail
 * mixture.
 *
 * Construction validates the parameters and nothing else: a parameter set whose
 * MEAN overflows double precision still has a perfectly well-defined cdf,
 * quantile function and sampler, so it is constructible and only `mean()` /
 * `variance()` fail on it. Failing at construction would deny a caller the
 * quantiles it can legitimately compute.
 *
 * Throws DOMAIN / NOT_FINITE per `validateParams`.
 */
export const makeLognormalTailMixture: MakeLognormalTailMixtureFn = (
  params: LognormalTailMixtureParams,
): ContinuousDistribution => {
  validateParams(params);

  const { tailWeight: w, bodyMean, bodySd, tailMu, tailSigma } = params;

  /**
   * Degeneracy switches. Both components are evaluated through these rather
   * than multiplied by a possibly-zero weight, for two reasons:
   *  - EXACTNESS at w = 0: the mixture must reproduce the Normal bit for bit,
   *    and `1 * Φ(z) + 0 * T(x)` only does that if the second product is
   *    exactly 0 — which it is for a cdf, but not for a term that could be
   *    Infinity (0 · Infinity = NaN). Branching makes it unconditional.
   *  - The unused component's parameters may be numerically extreme (a
   *    tailSigma of 300 with w = 0), and an inert component must never be able
   *    to poison a value it does not contribute to.
   */
  const hasBody = w < 1;
  const hasTail = w > 0;
  const bodyWeight = 1 - w;

  /**
   * SUPPORT. The body is a Normal, so the support is unbounded BELOW whenever
   * it carries weight — `min` is −Infinity, which the `Support` interface
   * permits as a number even though its doc comment only calls out an infinite
   * `max` (that comment is written for the count families). At w = 1 the body
   * is inert and the support is the lognormal's [0, ∞); 0 is the infimum, not
   * an attained point (the density there is 0).
   */
  const support: Support = {
    min: hasBody ? Number.NEGATIVE_INFINITY : 0,
    max: Number.POSITIVE_INFINITY,
  };

  /** Body cdf contribution, unweighted. */
  function bodyCdfAt(x: number): Probability {
    return saturatedNormalCdf((x - bodyMean) / bodySd);
  }

  /** Tail cdf contribution, unweighted. Zero on x ≤ 0, per the contract. */
  function tailCdfAt(x: number): Probability {
    if (x <= 0) return 0;
    return saturatedNormalCdf((Math.log(x) - tailMu) / tailSigma);
  }

  /**
   * Internal cdf — no argument validation, used by the bisection where the
   * argument is already known finite (or ±Infinity by construction).
   *
   * CLAMP: the sum of two weighted probabilities can exceed 1 by an ulp or two
   * of rounding. A cdf must be a probability, so the excess is clamped. The
   * clamp moves the value by at most a few 1e-16 and therefore cannot mask a
   * real defect; it is never applied downward (both terms are non-negative, so
   * the sum cannot go below 0).
   */
  function cdfAt(x: number): Probability {
    if (x === Number.POSITIVE_INFINITY) return 1;
    if (x === Number.NEGATIVE_INFINITY) return 0;
    let c = 0;
    if (hasBody) c += bodyWeight * bodyCdfAt(x);
    if (hasTail) c += w * tailCdfAt(x);
    return c > 1 ? 1 : c;
  }

  /**
   * Geometric bracket expansion.
   *
   * Walks `from` in `direction` (−1 down, +1 up), doubling the step each time,
   * until `accept(cdfAt(x))` holds. The step doubles rather than growing by a
   * fixed amount because the distance to a heavy-tail quantile is not knowable
   * in advance: doubling reaches 1e12 from a start of 1 in 40 evaluations,
   * where a linear walk would need 1e12 of them.
   *
   * Throws NO_CONVERGENCE if the walk leaves the finite doubles (the quantile
   * is not representable — this is genuinely reachable, e.g. tailSigma = 300
   * puts the 1 − 1e-8 quantile at exp(1646)) or if the cap is exhausted.
   */
  function expand(
    from: number,
    step0: number,
    direction: 1 | -1,
    accept: (c: Probability) => boolean,
    label: string,
  ): number {
    let x = from;
    let step = step0;
    for (let i = 0; i < MAX_BRACKET_EXPANSIONS; i += 1) {
      if (accept(cdfAt(x))) return x;
      x += direction * step;
      step *= 2;
      if (!Number.isFinite(x)) {
        throw new KernelError(
          "NO_CONVERGENCE",
          `lognormal-tail quantile could not ${label} within the finite range (w=${w}, tailMu=${tailMu}, tailSigma=${tailSigma}); the quantile is not representable in double precision`,
        );
      }
    }
    throw new KernelError(
      "NO_CONVERGENCE",
      `lognormal-tail quantile exhausted ${MAX_BRACKET_EXPANSIONS} bracket expansions while trying to ${label}`,
    );
  }

  /**
   * Generalized inverse cdf, F⁻¹(p) = inf{ x : F(x) >= p }, by monotone
   * bisection.
   *
   * BRACKET. The initial bracket is analytic, not guessed. Writing B and T for
   * the body and tail cdfs, F = (1 − w)B + wT is a convex combination, so
   *   x <= min(B⁻¹(p), T⁻¹(p))  ⇒  B(x) <= p and T(x) <= p  ⇒  F(x) <= p
   *   x >= max(B⁻¹(p), T⁻¹(p))  ⇒  F(x) >= p
   * and both component inverses are closed form:
   *   B⁻¹(p) = bodyMean + bodySd·Φ⁻¹(p),  T⁻¹(p) = exp(tailMu + tailSigma·Φ⁻¹(p)).
   * That pair brackets the answer EXACTLY in exact arithmetic, at any p, at any
   * parameters — which is what makes the deep-tail queries safe.
   *
   * In floating point it can still fail, in three ways, all handled:
   *  - `Φ⁻¹(p)` itself degrades below p ≈ 1e-300 and returns NaN at p = 5e-324
   *    (its Halley step divides two overflowed quantities).
   *  - `exp(tailMu + tailSigma·z)` overflows to Infinity for a large tailSigma.
   *  - the ENDPOINTS satisfy the inequalities only weakly (F(lo) = p is
   *    allowed), while bisection needs the strict invariant F(lo) < p <= F(hi).
   * So each end is verified against the cdf and expanded geometrically until it
   * really does bracket; if both closed forms are lost, the bracket falls back
   * to the body scale and expansion does all the work.
   *
   * WHICH END IS RETURNED. `hi`. The loop invariant is F(lo) < p <= F(hi), so
   * `hi` is the only end PROVEN to satisfy F(x) >= p — returning it makes
   * `cdf(quantile(p)) >= p` hold, which is what the generalized inverse
   * promises and what CRPS/PIT consumers rely on. Combined with the p-arm of
   * the stopping rule it gives the round-trip guarantee
   *   0 <= cdf(quantile(p)) − p <= 1e-10
   * for every p in (0, 1), at every parameterisation, deep tails included —
   * except on the adjacent-doubles exit, where the cdf is a step function and
   * no quantile function can do better.
   *
   * FLAT REGIONS. Where the cdf is numerically constant — and it is: Φ
   * underflows to exactly 0 below z ≈ −8.4 and rounds to exactly 1 above
   * z ≈ 8.4 — bisection converges to the LEFT EDGE of the plateau, because
   * every interior point of a plateau at height c >= p satisfies F >= p and so
   * pulls `hi` down. That is the correct generalized inverse OF THE EVALUATED
   * CDF, but it is not the true analytic quantile: for p = 1e-300 against a
   * Normal body the answer comes back near bodyMean − 8.4·bodySd (the edge of
   * the underflow plateau) rather than at −37·bodySd. The limitation belongs to
   * the cdf's own precision floor, not to the bisection, and it is pinned by a
   * test.
   *
   * ENDPOINTS. `quantile(0)` returns `support().min` — −Infinity when the body
   * carries weight, 0 when w = 1 — and `quantile(1)` returns +Infinity. Both
   * are the honest values of inf{x : F(x) >= p} on an unbounded support, both
   * agree with `support()` by construction, and p = 0 / p = 1 are inside the
   * contract's documented domain for `quantile` (it throws only OUTSIDE [0,1]),
   * so failing closed on them would be a contract violation. `cdf` accepts
   * ±Infinity precisely so this round-trip stays closed.
   *
   * Failure modes: DOMAIN (p outside [0,1]), NOT_FINITE (p is NaN),
   * NO_CONVERGENCE (bracket not representable, or bisection cap exhausted).
   */
  function quantile(p: Probability): number {
    assertProbability(p, "p");
    if (p === 0) return support.min;
    if (p === 1) return Number.POSITIVE_INFINITY;

    // Φ⁻¹(p) is finite for every p in (0,1) that survives the checks above,
    // except in the extreme-subnormal corner noted in the docblock, where it
    // returns NaN — hence the isFinite screens below.
    const z = normalQuantile(p);
    const bodyGuess = bodyMean + bodySd * z;
    const tailGuess = Math.exp(tailMu + tailSigma * z);

    const useBody = hasBody && Number.isFinite(bodyGuess);
    const useTail = hasTail && Number.isFinite(tailGuess);

    let lo: number;
    let hi: number;
    if (useBody && useTail) {
      lo = Math.min(bodyGuess, tailGuess);
      hi = Math.max(bodyGuess, tailGuess);
    } else if (useBody) {
      lo = bodyGuess;
      hi = bodyGuess;
    } else if (useTail) {
      lo = tailGuess;
      hi = tailGuess;
    } else {
      // Both closed forms lost. Anchor on the body scale and let the geometric
      // expansion find the bracket from there.
      lo = bodyMean - bodySd;
      hi = bodyMean + bodySd;
    }

    // Expansion step: the largest scale in play, so that a bracket sitting at
    // 1e12 does not creep outward in steps of bodySd.
    const step0 = Math.max(
      bodySd,
      0.5 * Math.abs(lo),
      0.5 * Math.abs(hi),
      MIN_EXPANSION_STEP,
    );

    lo = expand(lo, step0, -1, (c) => c < p, "descend to a cdf below p");
    hi = expand(hi, step0, 1, (c) => c >= p, "ascend to a cdf at or above p");

    // The two bracket cdf values are carried along and updated from the single
    // midpoint evaluation each iteration, so the p-arm of the stopping rule
    // costs two cdf calls in total rather than two per iteration.
    let cLo = cdfAt(lo);
    let cHi = cdfAt(hi);

    for (let i = 0; i < MAX_BISECTION_ITERATIONS; i += 1) {
      // Conjunction of the mixed absolute/relative x-arm and the probability
      // arm — see QUANTILE_TOLERANCE for why neither alone is enough.
      const narrowInX =
        hi - lo <= QUANTILE_TOLERANCE * Math.max(1, Math.abs(lo), Math.abs(hi));
      if (narrowInX && cHi - cLo <= QUANTILE_TOLERANCE) {
        return hi;
      }
      // 0.5·lo + 0.5·hi rather than (lo + hi)/2 or lo + (hi − lo)/2: the first
      // overflows when the bracket straddles ±1e308, the second produces NaN
      // when hi − lo overflows.
      const mid = 0.5 * lo + 0.5 * hi;
      if (mid <= lo || mid >= hi) {
        // The bracket is two adjacent doubles; there is nothing left to halve.
        // This is convergence to the precision of the type, not a failure — and
        // it is the only exit for a distribution narrower than the local ulp,
        // whose cdf is a step function in double precision.
        return hi;
      }
      const cMid = cdfAt(mid);
      if (cMid >= p) {
        hi = mid;
        cHi = cMid;
      } else {
        lo = mid;
        cLo = cMid;
      }
    }

    throw new KernelError(
      "NO_CONVERGENCE",
      `lognormal-tail quantile did not converge for p=${p} within ${MAX_BISECTION_ITERATIONS} bisections (bracket [${lo}, ${hi}])`,
    );
  }

  /** Analytic lognormal mean exp(mu + sigma²/2), or null when it overflows. */
  function tailMeanOrNull(): number | null {
    const m = Math.exp(tailMu + 0.5 * tailSigma * tailSigma);
    return Number.isFinite(m) ? m : null;
  }

  /**
   * OVERFLOW POLICY for `mean` and `variance` — fail closed, do not report
   * Infinity.
   *
   * exp(tailMu + tailSigma²/2) overflows for a tailSigma past ~37 (and the
   * second moment, exp(2·tailMu + 2·tailSigma²), past ~19). The lognormal's
   * mean is FINITE for every finite sigma, so Infinity here is an artifact of
   * double precision, not a property of the distribution. Returning it would
   * state something false and then propagate: an EV computed against an
   * infinite mean is ±Infinity, a Kelly fraction against it is NaN, and a
   * sizing decision downstream would be made on a number that means nothing.
   * UNSUPPORTED ("the requested operation is not defined for these
   * parameters") is the honest report, and it leaves `cdf`, `quantile` and
   * `sample` — which are all still exact — usable.
   */
  function overflow(what: string, value: number): KernelError {
    return new KernelError(
      "UNSUPPORTED",
      `lognormal-tail ${what} overflows double precision for tailMu=${tailMu}, tailSigma=${tailSigma} (computed ${value}); the analytic value is finite but not representable — use quantiles instead`,
    );
  }

  function mean(): number {
    // w = 0: exactly the Normal mean, with no tail arithmetic at all.
    if (!hasTail) return bodyMean;
    const m = tailMeanOrNull();
    if (m === null) throw overflow("mean", Number.POSITIVE_INFINITY);
    if (!hasBody) return m;
    return bodyWeight * bodyMean + w * m;
  }

  function variance(): number {
    const bodyVar = bodySd * bodySd;
    if (!hasTail) {
      // w = 0: exactly the Normal variance. Still guard the square, which
      // overflows for bodySd > 1.3e154.
      if (!Number.isFinite(bodyVar)) throw overflow("variance", bodyVar);
      return bodyVar;
    }
    const m = tailMeanOrNull();
    if (m === null) throw overflow("variance", Number.POSITIVE_INFINITY);
    // v_T = (exp(σ²) − 1)·m², via expm1 so that σ → 0 stays accurate.
    const tailVar = Math.expm1(tailSigma * tailSigma) * m * m;
    if (!Number.isFinite(tailVar)) throw overflow("variance", tailVar);
    if (!hasBody) return tailVar;
    if (!Number.isFinite(bodyVar)) throw overflow("variance", bodyVar);
    const separation = bodyMean - m;
    const total =
      bodyWeight * bodyVar + w * tailVar + bodyWeight * w * separation * separation;
    if (!Number.isFinite(total)) throw overflow("variance", total);
    return total;
  }

  return {
    kind: "continuous",

    /**
     * Mixture density. Zero tail contribution at x <= 0 (the lognormal's
     * support), so on the negative half-line this is the body density alone —
     * which is exactly the "tackled behind the catch" mass the contract
     * requires be kept.
     *
     * `pdf(±Infinity)` is 0 (the limit of the density). NaN throws NOT_FINITE.
     */
    pdf(x: number): number {
      if (Number.isNaN(x)) {
        throw new KernelError("NOT_FINITE", `pdf requires a non-NaN x, received ${x}`);
      }
      if (!Number.isFinite(x)) return 0;
      let d = 0;
      if (hasBody) {
        d += (bodyWeight * standardNormalPdf((x - bodyMean) / bodySd)) / bodySd;
      }
      if (hasTail && x > 0) {
        d += (w * standardNormalPdf((Math.log(x) - tailMu) / tailSigma)) / (x * tailSigma);
      }
      return d;
    },

    /**
     * Mixture cdf.
     *
     * ±Infinity are ACCEPTED (returning 0 and 1) rather than rejected as
     * NOT_FINITE, unlike the count slots. Those have a finite lower support
     * bound and an integer argument, so ±Infinity is meaningless for them; here
     * the support is genuinely unbounded and `quantile(0)`/`quantile(1)` return
     * ∓Infinity, so rejecting them would leave the quantile/cdf round trip
     * unable to close on its own outputs. NaN still throws NOT_FINITE.
     */
    cdf(x: number): Probability {
      if (Number.isNaN(x)) {
        throw new KernelError("NOT_FINITE", `cdf requires a non-NaN x, received ${x}`);
      }
      return cdfAt(x);
    },

    quantile,

    /**
     * One draw: pick the component, then a Box–Muller normal deviate from
     * `./numeric.js`.
     *
     * The component uniform u is drawn FIRST and the branch is `u < w`, so the
     * tail is selected with probability exactly w (u is in [0,1)); w = 0 never
     * selects it and w = 1 always does.
     *
     * The normal deviate is drawn UNCONDITIONALLY, before the branch, so that
     * every draw consumes exactly three uniforms whichever component wins.
     * That keeps the stream aligned across a sensitivity sweep: re-running a
     * simulation with a perturbed `tailWeight` and the same seed changes which
     * component each draw takes, but not where the next draw starts, so the
     * two runs stay comparable draw-for-draw instead of decorrelating after
     * the first disagreement.
     *
     * Failure modes: DOMAIN (rng is not a function, or returned outside
     * [0,1)), NOT_FINITE (rng returned NaN/Infinity, or the tail draw
     * exp(tailMu + tailSigma·z) overflowed — an overflowed draw is not silently
     * returned as Infinity, because it would poison every downstream mean,
     * CRPS and empirical quantile it touched).
     */
    sample(rng: Rng): number {
      if (typeof rng !== "function") {
        throw new KernelError("DOMAIN", "sample requires an Rng function");
      }
      const u = rng();
      assertFinite(u, "rng() output");
      if (u < 0 || u >= 1) {
        throw new KernelError("DOMAIN", `rng() must return a value in [0,1), received ${u}`);
      }
      const z = boxMuller(rng);
      const x = u < w ? Math.exp(tailMu + tailSigma * z) : bodyMean + bodySd * z;
      if (!Number.isFinite(x)) {
        throw new KernelError(
          "NOT_FINITE",
          `lognormal-tail draw overflowed to ${x} (tailMu=${tailMu}, tailSigma=${tailSigma}, z=${z})`,
        );
      }
      return x;
    },

    mean,
    variance,

    support(): Support {
      return support;
    },
  };
};
