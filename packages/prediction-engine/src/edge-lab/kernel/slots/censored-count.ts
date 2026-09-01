/**
 * SLOT `censored-count` — right-censoring for blowout benchings.
 *
 * WHY THIS SLOT IS AN EDGE AND NOT A REFINEMENT
 * A star running back on a three-touchdown favourite does not have a "slightly
 * lower" attempt projection. He has TWO futures. In the ~65% of games that stay
 * competitive he runs his normal script and his volume distribution is untouched.
 * In the other ~35% the game is over by the middle of the third quarter, the
 * starters come out, and his exposure is CUT — the remainder of his snaps simply
 * never happen. A book that prices this by shaving the mean ("blowout risk, drop
 * the line 1.5") replaces a two-component mixture with one unimodal law centred
 * at the blended mean, and that single law is wrong in BOTH directions at once:
 *
 *   - It is too heavy in the middle. Nothing about the real process concentrates
 *     mass at the blended mean; the blended mean is the one outcome that the
 *     mixture is LEAST likely to produce relative to a shifted unimodal fit.
 *   - It is too light on the LOW side. The censored component sits far below the
 *     shifted mean, so genuine "benched at 14 carries" outcomes are underpriced.
 *   - It is too light on the HIGH side. The uncensored component keeps the base's
 *     full upper tail at its ORIGINAL location, but the mean-shift dragged the
 *     whole comparison law down, so "game stayed close, he got his 24" is
 *     underpriced too.
 *
 * Under and over on the same player in the same game can therefore BOTH be
 * mispriced, which is why this slot is a revenue question. The test suite pins
 * that two-tail claim numerically rather than asserting it in prose — and also
 * pins the regime in which it stops holding, because it is not a universal
 * theorem (see `THE TWO-TAIL CLAIM IS REGIME-DEPENDENT` below).
 *
 * MODEL (frozen by the contract — do not widen, narrow, or reparameterise)
 * With probability (1 − c) the count is the base draw; with probability c the
 * exposure is truncated and the count is a binomial thinning of the base draw
 * with retention f:
 *
 *   pmf(k) = (1 − c) · base.pmf(k) + c · Σ_j base.pmf(j) · Binom(j, f).pmf(k)
 *
 * over the base support truncated where its remaining tail mass falls below
 * 1e-12. Equivalently, with B ~ Bernoulli(c) independent of J ~ base:
 *
 *   X = (1 − B) · J + B · Binom(J, f).
 *
 * BINOMIAL THINNING, NOT A SCALE FACTOR. `f` is the expected fraction of
 * exposure retained, not a deterministic multiplier: a benched player who had 20
 * carries coming does not get exactly 11 when f = 0.55, he gets a random draw
 * around 11 whose own spread is f(1 − f)·20. Multiplying the count by f instead
 * would understate the censored component's dispersion and re-introduce, one
 * level down, exactly the mean-shift error this slot exists to correct.
 *
 * PRECOMPUTATION — THE CENSORED BRANCH IS BUILT ONCE, AT `make` TIME
 * The Σ_j runs over the whole base support, so evaluating the censored branch
 * inside `pmf(k)` costs O(n) per call with n the truncated support size — and any
 * consumer that walks the support (this slot's own cdf, `conformance.ts`, CRPS,
 * a PIT histogram, a Monte-Carlo joint simulator) pays O(n²) EVERY time it walks.
 * Building the entire branch once at `make` time costs the same O(n²) but exactly
 * once, after which `pmf` and `cdf` are O(1) and `quantile`/`sample` are O(log n).
 * Any consumer that touches the distribution more than once is strictly better
 * off, and every consumer in this engine touches it thousands of times.
 *
 * COST, CONCRETELY (n = hi + 1 = truncated support size):
 *   time   ≈ n²/2 binomial terms, each one `logChoose` (three logΓ) plus one
 *            `exp`. Measured: n = 157 → 1.5 ms, n = 896 → 42 ms, n = 4572 →
 *            1.04 s, n = 20229 → 18.9 s. Quadratic, as advertised.
 *   memory = three Float64Arrays of length n → 24n bytes; 120 KB at n = 5000.
 * Memory is never the binding constraint. TIME is, and it is why the truncated
 * support is capped at `MAX_SUPPORT_INDEX` = 5000 (~1 s of build). A support that
 * large already means a base with a mean in the thousands, which is not a prop
 * this engine prices — a realistic volume count (mean ≤ 100, even a heavy-tailed
 * one) truncates below n = 1000, i.e. under 50 ms. Past ~5000 the O(n²) build
 * stops being a reasonable thing to do inside a constructor and the slot fails
 * closed with UNSUPPORTED rather than silently taking twenty seconds.
 *
 * ALL BINOMIAL TERMS ARE EVALUATED IN LOG SPACE through `logChoose` from
 * `./numeric.js` and exponentiated once. `C(j, k)` overflows a double at j = 1030;
 * `f^k` underflows long before that; the log form has neither problem because the
 * quantity being exponentiated is a log-probability and is therefore ≤ 0. There
 * are no raw factorials anywhere in this file.
 *
 * PURITY. Every export is pure. `makeCensoredCount` closes over immutable
 * precomputed tables — same inputs → same outputs, no I/O, no clock, no
 * `Math.random`. All randomness arrives through the injected `Rng`.
 *
 * THE TWO-TAIL CLAIM IS REGIME-DEPENDENT — STATED HONESTLY
 * Against a mean-matched shift of the SAME base family, the censored law carries
 * strictly more mass in both tails throughout the regime this slot targets: a
 * volume base with moderate over-dispersion (Var/E ≲ 3) and a material truncation
 * (c ≳ 0.2, f ≲ 0.6). It can FAIL for a near-geometric base (Var/E ≳ 5) combined
 * with mild censoring (f ≳ 0.75), because binomial thinning REDUCES relative
 * dispersion — Var/E of Binom(J, f) is (1 − f) + f·Var(J)/E[J] — so on an already
 * violently over-dispersed base the thinned component can be tighter than the
 * mean-shifted comparison, and the low tail flips. The test suite asserts the
 * claim across the target regime AND pins one counter-case, so nobody reads the
 * paragraph at the top of this file as a theorem it is not.
 */

import {
  KernelError,
  assertFinite,
  assertProbability,
  type CensoredCountParams,
  type DiscreteDistribution,
  type MakeCensoredCountFn,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { logChoose } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The base support is truncated at the smallest index whose cumulative base mass
 * reaches 1 − 1e-12. The threshold is fixed BY THE CONTRACT ("with the base
 * support truncated where its tail mass < 1e-12"), not chosen here.
 *
 * Consequences, all of them deliberate:
 *  - The composite pmf sums to 1 only to within 1e-12, never exactly. That is
 *    three orders of magnitude inside the 1e-6 mass tolerance `conformance.ts`
 *    enforces and six inside its 1e-7 pmf/cdf tolerance.
 *  - The composite is NOT renormalised over the truncated support. Renormalising
 *    would divide every pmf value by ~(1 − 1e-12) and thereby destroy the exact
 *    reproduction of `base` at c = 0 and at f = 1, which is a far more valuable
 *    property than recovering 1e-12 of mass.
 *  - `pmf(k)` is 0 above the truncation point for EVERY c, including c = 0. The
 *    declared support is the truncated one, and the contract requires a pmf to be
 *    zero outside its support.
 */
const TAIL_MASS_TOLERANCE = 1e-12;

/**
 * Hard ceiling on the truncated support index, and therefore on the O(n²)
 * censored precompute. At n = 5000 the build is ~1 s and 120 KB; at n = 20000 it
 * is ~19 s. A base whose 1e-12 truncation point is past 5000 has a mean in the
 * thousands and is outside anything this engine prices, so the slot fails closed
 * instead of stalling a request for twenty seconds. See the header for the
 * measured cost curve.
 */
const MAX_SUPPORT_INDEX = 5000;

/**
 * If the walk reaches `MAX_SUPPORT_INDEX` with at least this much mass
 * accumulated, the base is a real distribution whose support is merely too large
 * for the quadratic precompute → UNSUPPORTED. Below it, the base has not even
 * approximately accumulated unit mass within the budget — either it is not
 * normalised or its tail is astronomically long → NO_CONVERGENCE. The threshold
 * is 1e-6 because that is exactly the total-mass tolerance `conformance.ts`
 * applies, so "essentially all the mass is in" means the same thing here as it
 * does to the shared conformance standard.
 */
const CLOSED_MASS_TOLERANCE = 1e-6;

/**
 * Tolerance on a base's declared mass when it is malformed rather than merely
 * long-tailed: a finite-support base is walked to its LAST index, so its pmf must
 * sum to 1 there, and no base may ever accumulate MORE than unit mass. 1e-9 is
 * far above the ~n·ε ≈ 1e-12 of accumulation rounding at n = 5000 and far below
 * any real modelling error, so it separates "malformed" from "rounded" cleanly.
 */
const BASE_MASS_TOLERANCE = 1e-9;

/** The methods a usable `DiscreteDistribution` must actually provide at runtime. */
const REQUIRED_BASE_METHODS = [
  "pmf",
  "cdf",
  "quantile",
  "sample",
  "mean",
  "variance",
  "support",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Fail-closed helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invokes a method on the caller-supplied `base` and normalises its failures.
 *
 * The `base` is the one input to this slot that is an arbitrary object rather
 * than a number, so it is the one input that can fail in arbitrary ways. A
 * `KernelError` from a sibling slot's distribution is already a typed, documented
 * failure and is re-thrown UNCHANGED (its code is more specific than anything
 * this slot could invent). Anything else — a plain `Error`, a thrown string, a
 * `TypeError` from a half-built object — becomes DOMAIN, because from this slot's
 * point of view the observable fact is that the supplied base is malformed.
 */
function callBase<T>(label: string, invoke: () => T): T {
  try {
    return invoke();
  } catch (error) {
    if (error instanceof KernelError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new KernelError(
      "DOMAIN",
      `${label} threw (${detail}); params.base is not a usable DiscreteDistribution`,
    );
  }
}

/** Structural validation of the supplied base — presence and shape, not values. */
function assertUsableBase(base: DiscreteDistribution): void {
  const candidate: unknown = base;
  if (typeof candidate !== "object" || candidate === null) {
    throw new KernelError(
      "DOMAIN",
      `params.base must be a DiscreteDistribution object, received ${String(candidate)}`,
    );
  }
  const record = candidate as Record<string, unknown>;
  if (record["kind"] !== "discrete") {
    throw new KernelError(
      "DOMAIN",
      `params.base.kind must be "discrete", received ${String(record["kind"])}`,
    );
  }
  for (const method of REQUIRED_BASE_METHODS) {
    if (typeof record[method] !== "function") {
      throw new KernelError("DOMAIN", `params.base.${method} must be a function`);
    }
  }
}

/**
 * Validates `(c, f)`.
 *
 * `c` is a probability, so `assertProbability` gives NOT_FINITE for NaN/Infinity
 * and DOMAIN outside [0, 1]; both endpoints are admissible and documented below.
 *
 * `f` is validated against the contract's HALF-OPEN interval (0, 1]:
 *  - `f = 0` is OUT OF DOMAIN and throws, even though "censoring removes the
 *    whole exposure" is a describable event. The contract says (0, 1], and the
 *    slot does not get to quietly widen its own interface; a caller who means
 *    "the player is scratched" wants the zero-inflation slot, whose parameter has
 *    that meaning, not a retention fraction of zero. It is also the numerically
 *    honest boundary: log(0) = −∞ propagates into every thinning term.
 *  - `f = 1` IS admissible and is the documented identity — Binom(j, 1) is the
 *    point mass at j, so censoring retains everything and the composite is `base`.
 *  - `f` is validated even when `c = 0` makes it operationally irrelevant. Failing
 *    closed on a nonsense parameter that happens not to be read is the difference
 *    between a caller finding out now and finding out when `c` becomes positive.
 */
function validateRates(censorProbability: number, retainedFraction: number): void {
  assertProbability(censorProbability, "params.censorProbability");
  assertFinite(retainedFraction, "params.retainedFraction");
  if (retainedFraction <= 0 || retainedFraction > 1) {
    throw new KernelError(
      "DOMAIN",
      `params.retainedFraction must be in (0,1], received ${retainedFraction}`,
    );
  }
}

/** Validates the base's declared support and returns it. */
function readBaseSupport(base: DiscreteDistribution): Support {
  const support = callBase("params.base.support()", () => base.support());
  const candidate: unknown = support;
  if (typeof candidate !== "object" || candidate === null) {
    throw new KernelError(
      "DOMAIN",
      `params.base.support() must return a Support object, received ${String(candidate)}`,
    );
  }
  const { min, max } = support;
  assertFinite(min, "params.base.support().min");
  if (!Number.isInteger(min) || min < 0) {
    throw new KernelError(
      "DOMAIN",
      `censored-count requires a non-negative integer base support minimum, received ${min}. ` +
        "Binomial thinning of a negative count is undefined.",
    );
  }
  if (max !== Number.POSITIVE_INFINITY) {
    assertFinite(max, "params.base.support().max");
    if (!Number.isInteger(max)) {
      throw new KernelError(
        "DOMAIN",
        `params.base.support().max must be an integer or +Infinity, received ${max}`,
      );
    }
    if (max < min) {
      throw new KernelError(
        "DOMAIN",
        `params.base.support() is empty: max ${max} < min ${min}`,
      );
    }
  }
  return support;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base support walk — truncation and base validation in ONE pass
// ─────────────────────────────────────────────────────────────────────────────

interface WalkedBase {
  /** Truncation point: the largest index carried by the composite. */
  readonly hi: number;
  /** `values[j]` = base.pmf(j) for j in [min, hi]; 0 below `min`. */
  readonly values: Float64Array;
  /** Σ base.pmf(j) over [min, hi] — within 1e-12 of 1 by construction. */
  readonly mass: number;
}

/**
 * Walks the base pmf upward from its support minimum until the accumulated mass
 * reaches 1 − 1e-12, and returns the values it collected on the way.
 *
 * The walk sums `base.pmf` rather than reading `base.cdf` for two reasons: the
 * pmf values are needed for the precomputed table anyway (so the cdf would be a
 * second, redundant traversal), and summing the pmf validates the base's mass
 * DIRECTLY instead of trusting a cdf that a malformed base could report
 * inconsistently with its own pmf.
 *
 * Fail-closed outcomes, each with a distinct documented code:
 *  - a negative or NaN/Infinite pmf value           → DOMAIN / NOT_FINITE
 *  - mass accumulating past 1 + 1e-9                → DOMAIN (not normalised)
 *  - a FINITE support fully walked with mass < 1    → DOMAIN (not normalised)
 *  - the cap reached with the mass essentially in   → UNSUPPORTED (support too
 *    large for the O(n²) precompute)
 *  - the cap reached with the mass still short      → NO_CONVERGENCE
 */
function walkBase(base: DiscreteDistribution, support: Support): WalkedBase {
  const min = support.min;
  const finiteMax = support.max !== Number.POSITIVE_INFINITY;
  const lastIndex = finiteMax ? Math.min(support.max, MAX_SUPPORT_INDEX) : MAX_SUPPORT_INDEX;
  const walkedWholeSupport = finiteMax && support.max <= MAX_SUPPORT_INDEX;

  const collected: number[] = [];
  let mass = 0;
  let hi = -1;

  for (let j = min; j <= lastIndex; j += 1) {
    const value = callBase(`params.base.pmf(${j})`, () => base.pmf(j));
    assertFinite(value, `params.base.pmf(${j})`);
    if (value < 0) {
      throw new KernelError(
        "DOMAIN",
        `params.base.pmf(${j}) returned ${value}; a pmf may not be negative`,
      );
    }
    collected.push(value);
    mass += value;
    if (mass > 1 + BASE_MASS_TOLERANCE) {
      throw new KernelError(
        "DOMAIN",
        `params.base.pmf accumulated ${mass} by k=${j}; a pmf may not exceed unit mass`,
      );
    }
    if (mass >= 1 - TAIL_MASS_TOLERANCE) {
      hi = j;
      break;
    }
  }

  if (hi < 0) {
    if (walkedWholeSupport) {
      if (mass < 1 - BASE_MASS_TOLERANCE) {
        throw new KernelError(
          "DOMAIN",
          `params.base.pmf sums to ${mass} over its whole declared support [${min}, ${support.max}]; a pmf must sum to 1`,
        );
      }
      // A legitimate finite-support base that closes to within 1e-9 but not to
      // 1e-12 (e.g. one whose own pmf carries a little rounding). Its last index
      // IS the truncation point — there is nothing above it to drop.
      hi = lastIndex;
    } else if (mass >= 1 - CLOSED_MASS_TOLERANCE) {
      throw new KernelError(
        "UNSUPPORTED",
        `params.base has accumulated ${mass} of unit mass by k=${lastIndex} but its 1e-12 truncation ` +
          `point is beyond ${MAX_SUPPORT_INDEX}; the O(n²) censored precompute is not a reasonable ` +
          "operation at that support size (see MAX_SUPPORT_INDEX)",
      );
    } else {
      throw new KernelError(
        "NO_CONVERGENCE",
        `params.base.pmf accumulated only ${mass} of unit mass within ${MAX_SUPPORT_INDEX} integer ` +
          "steps; the base is either not normalised or has a tail this slot cannot truncate",
      );
    }
  }

  const values = new Float64Array(hi + 1);
  for (let i = 0; i < collected.length && min + i <= hi; i += 1) {
    values[min + i] = collected[i]!;
  }
  return { hi, values, mass };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT — the distribution object
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a full `DiscreteDistribution` for the right-censored count model.
 *
 * SUPPORT — WHY IT IS [0 (or base.min), truncated base max]
 * Censoring can only move mass DOWN. Binom(j, f) is supported on {0, …, j}, so no
 * outcome the composite can produce exceeds an outcome the base could produce:
 *   - UPPER BOUND. The largest attainable value is the largest attainable base
 *     value, so the composite's max is the truncated base max — the same `hi` for
 *     every (c, f). Censoring never adds anything above it, and the uncensored
 *     branch reaches it with probability (1 − c) · base.pmf(hi).
 *   - LOWER BOUND. When the censoring branch is live (c > 0 and f < 1) thinning
 *     puts strictly positive mass on 0, because Binom(j, f).pmf(0) = (1 − f)^j > 0
 *     for every finite j. So the minimum is 0 even for a base whose own support
 *     starts above 0. When the branch is NOT live (c = 0 or f = 1) the composite
 *     IS the base and the minimum is the base's own minimum.
 * The base support minimum is required to be a non-negative integer: binomial
 * thinning of a negative count has no meaning and `logChoose` rejects it.
 *
 * THE TWO IDENTITY CASES ARE SHORT-CIRCUITED, NOT APPROXIMATED
 * At c = 0 the censored branch has weight zero; at f = 1, Binom(j, 1) is the point
 * mass at j, so Σ_j base.pmf(j)·1{k = j} = base.pmf(k) and the branch is the
 * identity map. In BOTH cases the composite is `base` exactly, so the O(n²) build
 * is skipped entirely and the pmf table is filled with the base's own values.
 * That is what makes the reduction BIT-FOR-BIT rather than merely close:
 * evaluating `(1 − c)·b + c·b` in floating point does NOT return `b` for a general
 * c, and a caller who sets f = 1 to disable censoring must get their base back
 * unchanged, not a distribution that differs from it in the last ulp at every k.
 * (`f` is still validated in the c = 0 case — see `validateRates`.)
 *
 * MEAN — DERIVED
 * With B ~ Bernoulli(c) independent of J ~ base, μ = E[J]:
 *   E[X] = (1 − c)·E[J] + c·E[Binom(J, f)] = (1 − c)·μ + c·f·μ = μ·(1 − c(1 − f)).
 * The factored right-hand form is the one evaluated, because it returns μ EXACTLY
 * at c = 0 (1 − 0 = 1) and at f = 1 (1 − c·0 = 1), where the expanded form does
 * not. The two are asserted equal in the tests.
 *
 * VARIANCE — DERIVED, SHOWING THE WORKING
 * Let σ² = Var(J). Condition on the censor indicator B and use the law of total
 * variance, Var(X) = E[Var(X | B)] + Var(E[X | B]).
 *
 * (1) The thinned component. Given J, T = Binom(J, f) has E[T | J] = f·J and
 *     Var(T | J) = f(1 − f)·J. Apply the law of total variance again, this time
 *     over J:
 *       Var(T) = E[Var(T | J)] + Var(E[T | J])
 *              = f(1 − f)·E[J] + Var(f·J)
 *              = f(1 − f)·μ + f²·σ².
 *     This is a RANDOM SUM, and that is the whole subtlety: the naive answer
 *     f²σ² (treating the thinning as a deterministic scale) drops the f(1 − f)μ
 *     term contributed by the thinning's own randomness.
 *
 * (2) Inner term, E[Var(X | B)]:
 *       Var(X | B = 0) = σ²
 *       Var(X | B = 1) = f(1 − f)μ + f²σ²        [from (1)]
 *       E[Var(X | B)]  = (1 − c)σ² + c·(f(1 − f)μ + f²σ²)
 *
 * (3) Outer term, Var(E[X | B]). E[X | B] is a two-point variable taking μ with
 *     probability (1 − c) and f·μ with probability c, so
 *       Var(E[X | B]) = c(1 − c)·(μ − fμ)² = c(1 − c)(1 − f)²μ².
 *     This is the MIXTURE's own contribution — the between-component spread. It
 *     is the term that a mean-shift model has no way to represent at all, and
 *     therefore the term that this slot's edge is made of. Dropping it (the
 *     classic bug in this family) understates the spread and prices both tails
 *     too cheap, which is precisely the mistake the header describes the books
 *     making.
 *
 * (4) Sum:
 *       Var(X) = (1 − c)σ² + c·f(1 − f)μ + c·f²σ² + c(1 − c)(1 − f)²μ²
 *              = σ²·(1 − c(1 − f)(1 + f)) + c(1 − f)·[ f·μ + (1 − c)(1 − f)·μ² ]
 *     using (1 − c + c f²) = 1 − c(1 − f²) = 1 − c(1 − f)(1 + f). The second,
 *     factored form is the one evaluated, for the same exactness reason as the
 *     mean: at c = 0 and at f = 1 it returns σ² with no rounding at all. Both
 *     forms, and the numeric sum Σ k²·pmf(k) − mean², are checked in the tests.
 *
 * Sanity checks the tests assert: c = 0 → σ²; f = 1 → σ²; c = 1 → f(1 − f)μ + f²σ².
 *
 * THE ONE PRICE OF THE FACTORED FORMS. `1 − f` rounds to exactly 1 for any f
 * below ~1e-16, so at c = 1 with a subnormal f the factored mean returns exactly
 * 0 where the expanded form would return a subnormal ~1e-323. That is the trade
 * taken deliberately and pinned in the tests: bit-for-bit reproduction of the
 * base at the two identity points is worth having, and a mean of 1e-323 is not.
 *
 * Throws DOMAIN / NOT_FINITE / UNSUPPORTED / NO_CONVERGENCE for the documented
 * invalid inputs — see `validateRates`, `assertUsableBase`, `readBaseSupport`,
 * and `walkBase`.
 */
export const makeCensoredCount: MakeCensoredCountFn = (
  params: CensoredCountParams,
): DiscreteDistribution => {
  const candidate: unknown = params;
  if (typeof candidate !== "object" || candidate === null) {
    throw new KernelError(
      "DOMAIN",
      `censored-count requires a CensoredCountParams object, received ${String(candidate)}`,
    );
  }

  const { base, censorProbability: c, retainedFraction: f } = params;
  assertUsableBase(base);
  validateRates(c, f);

  const baseSupport = readBaseSupport(base);
  const baseMean = callBase("params.base.mean()", () => base.mean());
  assertFinite(baseMean, "params.base.mean()");
  if (baseMean < 0) {
    throw new KernelError(
      "DOMAIN",
      `params.base.mean() returned ${baseMean}; a count distribution on [0, ∞) cannot have a negative mean`,
    );
  }
  const baseVariance = callBase("params.base.variance()", () => base.variance());
  assertFinite(baseVariance, "params.base.variance()");
  if (baseVariance < 0) {
    throw new KernelError(
      "DOMAIN",
      `params.base.variance() returned ${baseVariance}; a variance may not be negative`,
    );
  }

  const { hi, values: baseValues } = walkBase(base, baseSupport);
  const size = hi + 1;

  /**
   * The censoring branch is the identity map on `base`, so the composite IS the
   * base — bit-for-bit. See the header block on the two identity cases.
   */
  const isIdentity = c === 0 || f === 1;

  // ── the precomputed tables ─────────────────────────────────────────────────
  const pmfTable = new Float64Array(size);
  if (isIdentity) {
    pmfTable.set(baseValues);
  } else {
    // Σ_j base.pmf(j) · Binom(j, f).pmf(k), accumulated ONCE over the truncated
    // support. `f` is strictly inside (0, 1) here — f = 1 took the identity
    // branch — so both logs are finite.
    const censored = new Float64Array(size);
    const logF = Math.log(f);
    const log1mF = Math.log1p(-f);
    for (let j = baseSupport.min; j <= hi; j += 1) {
      const weight = baseValues[j]!;
      if (weight === 0) continue;
      // The binomial pmf is unimodal in k with its mode at ⌊f(j+1)⌋, so once a
      // term has underflowed to exactly zero PAST the mode, every later term in
      // the row is zero too and the row can stop. The guard `k > mode` is what
      // makes this safe: for f near 1 the k = 0 term underflows FIRST, long
      // before the mass arrives, and breaking there would silently lose the row.
      const mode = f * j;
      for (let k = 0; k <= j; k += 1) {
        const term = weight * Math.exp(logChoose(j, k) + k * logF + (j - k) * log1mF);
        if (term === 0 && k > mode) break;
        censored[k] = censored[k]! + term;
      }
    }
    for (let k = 0; k < size; k += 1) {
      // At c = 1 this is `0 · base + 1 · censored`, which is EXACTLY the pure
      // thinning in IEEE-754 (0 · x = 0 for finite x, and 0 + y = y for y ≠ −0).
      pmfTable[k] = (1 - c) * baseValues[k]! + c * censored[k]!;
    }
  }

  // ── cumulative table ───────────────────────────────────────────────────────
  // Every term is non-negative, so the running sum is non-decreasing and the cdf
  // is monotone by construction rather than by assertion.
  const cumulative = new Float64Array(size);
  let running = 0;
  for (let k = 0; k < size; k += 1) {
    running += pmfTable[k]!;
    // CLAMP RATIONALE: the running sum can pass 1 by an ulp or two of
    // accumulation rounding. A cdf must be a probability, and the excess is
    // ~1e-16 — nine orders inside the 1e-7 pmf/cdf-consistency tolerance the
    // conformance suite enforces — so it cannot hide a defect.
    cumulative[k] = Math.min(1, running);
  }
  // PINNED TO EXACTLY 1 at the top of the support. Binomial thinning is
  // mass-preserving over k ∈ [0, j] and every j ≤ hi contributes its whole row,
  // so the shortfall here is exactly the base's dropped tail: below 1e-12 by the
  // truncation rule. A cdf must reach 1 at the top of its support for
  // `quantile(1)` to be well defined, and pinning moves the value by less than
  // 1e-12.
  cumulative[size - 1] = 1;

  const supportMin = isIdentity ? baseSupport.min : 0;
  const support: Support = { min: supportMin, max: hi };

  function pmf(k: number): Probability {
    assertFinite(k, "k");
    if (!Number.isInteger(k)) {
      throw new KernelError(
        "DOMAIN",
        `censored-count pmf requires an integer k, received ${k}`,
      );
    }
    // Zero outside the support, per the `DiscreteDistribution` contract. Above
    // `hi` that is the documented 1e-12 truncation, applied for every c.
    if (k < supportMin || k > hi) return 0;
    return pmfTable[k]!;
  }

  function cdf(k: number): Probability {
    assertFinite(k, "k");
    // The cdf of an integer-valued variable is a step function: P(X <= k) for
    // real k is P(X <= floor(k)).
    const floor = Math.floor(k);
    if (floor < supportMin) return 0;
    if (floor >= size) return 1;
    return cumulative[floor]!;
  }

  function quantile(probability: Probability): number {
    assertProbability(probability, "p");
    // Binary search for the smallest index with cdf >= p. `cumulative[size − 1]`
    // is exactly 1, so the search always terminates inside the table and the
    // result is the generalized inverse the contract asks for.
    let lo = supportMin;
    let high = size - 1;
    while (lo < high) {
      const mid = (lo + high) >> 1;
      if (cumulative[mid]! >= probability) {
        high = mid;
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
    // Inverse-cdf: exactly ONE uniform per draw and monotone in u, matching the
    // sibling count slots, so a fixed seed produces a stable, auditable stream
    // and the draw count never depends on (c, f).
    return quantile(u);
  }

  return {
    kind: "discrete",
    pmf,
    cdf,
    quantile,
    sample,
    mean(): number {
      // μ·(1 − c(1 − f)) ≡ (1 − c)μ + c·f·μ — exact at c = 0 and at f = 1.
      return baseMean * (1 - c * (1 - f));
    },
    variance(): number {
      // σ²·(1 − c(1 − f)(1 + f)) + c(1 − f)·[ f·μ + (1 − c)(1 − f)·μ² ]
      // ≡ (1 − c)σ² + c·f(1 − f)μ + c·f²σ² + c(1 − c)(1 − f)²μ².
      // Derived by the law of total variance over the censor indicator AND over
      // j — see the header block. Exact at c = 0 and at f = 1.
      const oneMinusF = 1 - f;
      const shrink = 1 - c * oneMinusF * (1 + f);
      const mixture = c * oneMinusF * (f * baseMean + (1 - c) * oneMinusF * baseMean * baseMean);
      return baseVariance * shrink + mixture;
    },
    support(): Support {
      return support;
    },
  };
};
