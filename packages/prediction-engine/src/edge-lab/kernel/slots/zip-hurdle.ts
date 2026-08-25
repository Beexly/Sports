/**
 * SLOT `zip-hurdle` — ZERO-INFLATED counts, on a negative-binomial base.
 *
 * WHY THE ZERO MASS IS THE PRODUCT, NOT A NUISANCE
 * The props this engine prices are overwhelmingly 0.5 / 1.5 / 2.5 lines on
 * quantities that are structurally zero a large fraction of the time: a tight
 * end who is inactive on a given snap package, a back-up back who only sees the
 * field in garbage time, a defender who is not in the sack rotation. For those
 * props the ONLY thing the market is really trading is P(X = 0). A pure count
 * family has to buy that zero mass out of its dispersion parameter — it can only
 * make P(0) large by making the whole distribution heavier-tailed — so it prices
 * the zero and the tail with a single knob and gets both wrong. Zero inflation
 * separates the two: one parameter for "did this player have a role at all",
 * the count process for "given a role, how much".
 *
 * MODEL (frozen by the contract as `ZipParams`)
 *
 *   Z ~ Bernoulli(π)                       (the structural / excess zero)
 *   N ~ NegBinomial(r, p)                  (the count process)
 *   X = 0 if Z = 1, else N
 *
 *   pmf(0)   = π + (1 − π) · nb.pmf(0)
 *   pmf(k>0) =     (1 − π) · nb.pmf(k)
 *   cdf(k)   = π + (1 − π) · nb.cdf(k),    k >= 0
 *   mean     = (1 − π) · μ
 *   variance = (1 − π)(σ² + μ²) − ((1 − π)μ)²
 *
 * with μ, σ² the base NB moments. Note the model can only ever ADD zero mass:
 * `pmf(0) >= nb.pmf(0)` for every admissible π. Zero DEFLATION — fewer zeros
 * than the count process alone predicts — is outside the family. That single
 * structural fact drives every degeneracy decision in `fitZip` below.
 *
 * REUSE
 * The base is the `neg-binomial` slot, imported, not reimplemented. `makeZip`
 * delegates `pmf` and `cdf` to it, and takes its `quantile` bracket from it
 * (and therefore inherits its lazily grown cumulative table, its saturation
 * policy, and its NO_CONVERGENCE guards — the one place the mixture must NOT
 * simply defer to the base is documented on `QUANTILE_REPAIR_BUDGET` below);
 * `fitZip` delegates the (r, p) solve to `fitNegBinomial` (and
 * therefore inherits its documented near-Poisson handling of an under-dispersed
 * sample — this slot must not, and does not, second-guess it).
 *
 * PURITY
 * Every export is pure. All randomness comes from the injected `Rng`; there is
 * no `Math.random`, no clock, no I/O. `fitZip` does not mutate its input.
 */

import {
  KernelError,
  assertCount,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  type DiscreteDistribution,
  type FitZipFn,
  type MakeZipFn,
  type NegBinomialParams,
  type Probability,
  type Rng,
  type Support,
  type ZipParams,
} from "../contract.js";
import { fitNegBinomial, makeNegBinomial } from "./neg-binomial.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `quantile` uses the algebraic inversion
 *
 *   cdf(k) >= q   ⟺   nb.cdf(k) >= (q − π) / (1 − π)
 *
 * only to obtain an UPPER BRACKET, and then bisects on this object's own cdf
 * inside that bracket. The seed is not trusted as the answer for a specific and
 * unavoidable reason: the mixture cdf saturates to 1 EARLIER than the base cdf
 * does. `π + (1 − π)·F(k)` rounds to exactly 1 as soon as the base's shortfall
 * `1 − F(k)` drops below one ulp divided by (1 − π), which for π = 0.99 happens
 * several integer steps before the base's own table saturates. In that region
 * the base quantile answers with ITS saturation index, which is larger than the
 * smallest k at which THIS cdf reaches 1 — so the generalized inverse of the
 * mixture is genuinely a different (smaller) integer, not a rounding artefact.
 * Bisecting on the mixture's own cdf gets it exactly right in O(log k), with no
 * assumption about how far apart the two saturation points are.
 *
 * This budget therefore only guards the tiny UPWARD repair of the bracket, which
 * covers the rescaling division landing a couple of ulp low. That error cannot
 * exceed a single step in real arithmetic; running past the budget would mean
 * the cdf is not the monotone function it is supposed to be, which is a defect
 * rather than a result. Fail closed there.
 */
const QUANTILE_REPAIR_BUDGET = 64;

/**
 * Iteration budget for the zero-allocation fixed point in `fitZip`. The map runs
 * on the INTEGER count of implied count-process zeros, which lives in the finite
 * set [0, n₀], so it must either reach a fixed point or revisit a value; both
 * terminate the loop long before this budget. Empirically the iteration is
 * monotone and settles in well under 20 steps for n in the thousands. The budget
 * exists only so that a pathological map cannot spin.
 */
const FIT_ITERATION_BUDGET = 200;

/**
 * How close to self-consistent the accepted zero allocation must be, measured in
 * OBSERVATIONS. At a true fixed point the residual is at most half an
 * observation (the rounding half-step); the loosest a two-cycle between adjacent
 * integers can leave the better of its two points is just under one observation.
 * A residual above one observation means the iteration never settled, and that
 * is a NO_CONVERGENCE error rather than a fit.
 */
const FIT_SELF_CONSISTENCY_TOL = 1;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 1 — the distribution object
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a full `DiscreteDistribution` for the zero-inflated negative binomial.
 *
 * `zeroInflation` must be a probability in [0, 1]; both endpoints are
 * admissible and both are exact:
 *
 *  - π = 0 reproduces the plain negative binomial BIT FOR BIT. `pmf(0)` is
 *    `0 + 1 · nb.pmf(0)`, `pmf(k)` is `1 · nb.pmf(k)`, `cdf` is `0 + 1 · nb.cdf`,
 *    the quantile rescaling is a division by exactly 1, and the variance form
 *    used below collapses to `1 · σ² + 0` — every one of those is an identity
 *    on IEEE doubles, not an approximation. The test suite asserts equality with
 *    `toBe`, not `toBeCloseTo`.
 *  - π = 1 is the degenerate point mass at 0. The base parameters are still
 *    validated: a malformed base is malformed whether or not it carries mass.
 *
 * `mean` and `variance` are ANALYTIC — no summation over the support. The
 * contract states the variance as
 *
 *   (1 − π)(σ² + μ²) − ((1 − π)μ)²
 *
 * and it is evaluated here in the algebraically identical GROUPED form
 *
 *   (1 − π)σ² + π(1 − π)μ²
 *
 * because the contract's form subtracts (1 − π)²μ² from a sum that contains
 * (1 − π)μ², and when μ² ≫ σ² (any near-Poisson base with a large mean) that
 * cancellation throws away significant digits — three of them at μ = 1000. The
 * grouped form has no cancellation at all: both terms are non-negative. The test
 * suite asserts the two forms agree, and asserts both against a numeric sum.
 *
 * Throws DOMAIN / NOT_FINITE for an invalid π (via `assertProbability`) or an
 * invalid base (via the neg-binomial slot's own validation).
 */
export const makeZip: MakeZipFn = (params: ZipParams): DiscreteDistribution => {
  assertProbability(params.zeroInflation, "params.zeroInflation");
  // Delegated validation: DOMAIN for r <= 0 or p outside (0, 1], NOT_FINITE for
  // NaN/Infinity. Performed even at π = 1, where the base contributes no mass.
  const base = makeNegBinomial(params.base);

  const zeroInflation = params.zeroInflation;
  const countWeight = 1 - zeroInflation;
  // The zero-inflated support is the base support: inflation only re-weights the
  // point already at the bottom of it, it never adds or removes outcomes.
  const support: Support = base.support();

  function pmfAt(k: number): Probability {
    const baseMass = base.pmf(k);
    return k === 0 ? zeroInflation + countWeight * baseMass : countWeight * baseMass;
  }

  function cdf(k: number): Probability {
    assertFinite(k, "k");
    // The cdf of an integer-valued variable is a step function: P(X <= k) for
    // real k is P(X <= floor(k)).
    const floor = Math.floor(k);
    if (floor < support.min) return 0;
    const baseCdf = base.cdf(floor);
    // EXACTNESS AT THE TOP OF THE SUPPORT. Once the base cdf has saturated to
    // exactly 1, the mixture is π·1 + (1 − π)·1 = 1 exactly — this is the
    // identity, not a clamp, so it is returned as such. Doing the arithmetic
    // instead would leave `π + (1 − π)` a few ulp off 1 for most π.
    if (baseCdf >= 1) return 1;
    // Below saturation the sum is mathematically < 1 but can round up to (or a
    // hair past) 1; `Math.min` keeps the result a probability. `Math.min` is
    // monotone, so this cannot break the non-decreasing guarantee.
    return Math.min(1, zeroInflation + countWeight * baseCdf);
  }

  function quantile(probability: Probability): number {
    assertProbability(probability, "p");

    // Everything at or below the zero mass answers `min`. This covers q = 0, the
    // whole π = 1 point mass, and any π large enough that cdf(min) is already 1 —
    // so the rescaling below never divides by a zero `countWeight`, and the
    // bisection below always starts from a bracket it can actually narrow.
    if (probability <= cdf(support.min)) return support.min;

    // Upper bracket by algebraic inversion. `probability > cdf(min) >= π`
    // guarantees a positive numerator; the clamp absorbs the division's rounding
    // at the top end, and q = 1 is rescaled to 1 directly rather than dividing
    // (1 − π) by itself and re-rounding.
    const rescaled =
      probability >= 1
        ? 1
        : Math.min(1, Math.max(0, (probability - zeroInflation) / countWeight));
    let high = base.quantile(rescaled);
    for (let steps = 0; cdf(high) < probability; steps += 1) {
      if (steps >= QUANTILE_REPAIR_BUDGET) {
        throw new KernelError(
          "NO_CONVERGENCE",
          `zero-inflated quantile bracket exceeded ${QUANTILE_REPAIR_BUDGET} repair steps at p=${probability}`,
        );
      }
      high += 1;
    }

    // Smallest k with cdf(k) >= probability, bisected on THIS object's cdf. The
    // invariant entering the loop is cdf(low) < probability <= cdf(high), so the
    // result is exactly the generalized inverse of the function `cdf` computes.
    let low = support.min;
    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      if (cdf(mid) >= probability) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  function sample(rng: Rng): number {
    // Inverse-cdf, matching the neg-binomial slot: exactly ONE uniform per draw
    // and monotone in that uniform, which keeps a seeded stream stable and
    // auditable. Drawing the Bernoulli and the count separately would consume
    // two uniforms and make the stream depend on π.
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
          `zero-inflated pmf requires an integer k, received ${k}`,
        );
      }
      // Below the support: zero mass, per the `DiscreteDistribution` contract.
      // Non-integer k is the DOMAIN error above.
      if (k < support.min) return 0;
      return pmfAt(k);
    },
    cdf,
    quantile,
    sample,
    mean(): number {
      return countWeight * base.mean();
    },
    variance(): number {
      const baseMean = base.mean();
      // Grouped form of (1 − π)(σ² + μ²) − ((1 − π)μ)² — see the docblock.
      return (
        countWeight * base.variance() + zeroInflation * countWeight * baseMean * baseMean
      );
    },
    support(): Support {
      return support;
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 2 — the fit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * THE ESTIMATOR, STATED HONESTLY.
 *
 * `fitZip` is a ZERO-FREQUENCY / METHOD-OF-MOMENTS HYBRID. It is NOT the maximum
 * likelihood estimator, it is not an EM algorithm, and nothing about it has the
 * MLE's efficiency or its asymptotic standard errors. Do not quote likelihood
 * intervals off these numbers.
 *
 * WHAT IT ACTUALLY DOES
 * Split the sample into n₊ strictly positive observations and n₀ zeros. Only
 * SOME of those zeros come from the count process; the rest are structural. Let
 * m₀ be the number attributable to the count process. Then the negative binomial
 * is fitted — by `fitNegBinomial`, i.e. by matching the first two moments — to
 * the "de-inflated" sample consisting of the n₊ positives plus m₀ zeros, and
 *
 *   π̂ = (n₀ − m₀) / n.
 *
 * m₀ is unknown and depends on the very fit it determines, so it is solved as a
 * FIXED POINT of the self-consistency condition "the de-inflated sample shows no
 * excess zeros of its own":
 *
 *   m₀ / (n₊ + m₀) = nb.pmf(0)    ⟺    m₀ = n₊ · f₀ / (1 − f₀),   f₀ = nb.pmf(0)
 *
 * iterated from m₀ = n₀ (i.e. from π̂ = 0, the plain NB fit on the whole sample:
 * no inflation is assumed until the data demands it) and clamped to [0, n₀] at
 * every step. That fixed point is algebraically identical to the classical
 * zero-frequency estimator
 *
 *   π̂ = (p̂₀ − f̂₀) / (1 − f̂₀),   p̂₀ = n₀ / n,
 *
 * evaluated at a self-consistent f̂₀; the two forms are proved equal in the test
 * suite. m₀ is rounded to an integer so that the NB solve can be delegated to
 * `fitNegBinomial` UNMODIFIED (which is what keeps its documented near-Poisson
 * degeneracy handling intact). That rounding perturbs the implied zero fraction
 * by O(1/n) — an order of magnitude below the O(n^(−1/2)) sampling noise in p̂₀
 * itself, so it is never the accuracy bottleneck.
 *
 * HOW IT IS BIASED
 *
 *  1. NON-IDENTIFIABILITY IS THE DOMINANT EFFECT, NOT AN ESTIMATOR DEFECT. π and
 *     r both put mass at zero. All the information separating them lives in the
 *     SHAPE of the positive part. When the base is strongly over-dispersed
 *     (small r) the count process can explain the observed zeros on its own, and
 *     π̂ is pulled toward 0 even when the truth is positive. No moment estimator,
 *     and no MLE either, can recover π from data that does not distinguish the
 *     two mechanisms.
 *
 *  2. THE (r, p) SOLVE IS METHOD OF MOMENTS, so it inherits that estimator's
 *     known problems: r̂ = mean² / (variance − mean) is a ratio whose denominator
 *     is a noisy difference of two moments. Its sampling distribution is heavily
 *     right-skewed and has no finite mean; when overdispersion is mild the
 *     denominator is frequently near zero or negative, which routes to the
 *     neg-binomial slot's near-Poisson cap. The practical consequence is that r̂
 *     is BIMODAL at small n — either a plausible moderate value, or pinned at the
 *     1e6 boundary — and is less efficient than the MLE at every n.
 *
 *  3. π̂ IS DOWNWARD-BIASED BY THE PLUG-IN NONLINEARITY. π̂ = (p̂₀ − f̂₀)/(1 − f̂₀)
 *     is CONCAVE in f̂₀ (∂²π̂/∂f̂₀² = 2(p̂₀ − 1)/(1 − f̂₀)³ < 0), so by Jensen's
 *     inequality the noise in f̂₀ drags E[π̂] below the value at E[f̂₀]. The effect
 *     scales with Var(f̂₀) and so decays like 1/n.
 *
 *  4. π̂ IS UPWARD-BIASED AT THE BOUNDARY, in the opposite direction to (3). The
 *     unconstrained estimate is negative whenever the sample happens to show
 *     fewer zeros than the fitted count process predicts; those draws are folded
 *     to π̂ = 0 rather than being allowed out of the parameter space. So at a true
 *     π of exactly 0, E[π̂] > 0 strictly. This is ordinary boundary bias and it is
 *     the price of returning a usable member of the family instead of throwing.
 *
 *  5. WHERE THE BIAS MATTERS. Below roughly n = 50 the estimator should not be
 *     trusted in either direction: π̂ has a visible point mass at 0, r̂ is
 *     frequently at the near-Poisson boundary, and the fixed point can settle on
 *     a zero allocation that a single extra observation would move. Between
 *     n ≈ 50 and n ≈ 200 it is directionally useful but the interval around π̂ is
 *     wide (order ±0.1). At n ≳ 1000, with a base mean above about 1 and a true
 *     π above about 0.1, recovery of π is typically within a couple of points and
 *     of (r, p) within a few percent — which is the regime the test suite pins.
 *     Season-level player samples (n ≈ 17) are squarely in the untrustworthy
 *     range; this estimator is for pooled panels, not for one player's season.
 *
 * DEGENERATE CASES — every one returns a documented value or throws.
 *
 *  - EMPTY input                    → EMPTY (via `assertNonEmpty`).
 *  - negative / non-integer count   → DOMAIN (via `assertCount`).
 *  - NaN / Infinity                 → NOT_FINITE (via `assertCount`).
 *  - ALL ZEROS. π is unidentifiable here in the strongest possible sense: with
 *    no positive observation there is no evidence of a count process at all, and
 *    EVERY π in [0, 1] paired with the point mass `fitNegBinomial` returns for an
 *    all-zero sample produces the IDENTICAL predictive (mass 1 at 0). The
 *    predictive is unique even though the parameters are not, so the convention
 *    chosen is the parsimonious one: π̂ = 0, with the whole structure carried by
 *    the base. Reporting π̂ = 1 instead would assert a count process that the data
 *    never exhibits.
 *  - NO ZEROS AT ALL. The unconstrained π̂ is ≤ 0 by construction, and it is
 *    clamped to 0, giving the plain NB fit on the whole sample. Clamping rather
 *    than returning a negative inflation is not cosmetic: `zeroInflation` is
 *    typed `Probability`, `makeZip` rejects anything outside [0, 1], and a
 *    negative value is not a member of the family at all — it would describe a
 *    distribution with NEGATIVE mass somewhere. Returning it would produce a
 *    `ZipParams` that cannot be turned into a distribution, i.e. a fit that fails
 *    at the next call rather than at this one. Zero is the closest admissible
 *    point and is exactly the boundary case (the plain NB), so the clamp returns
 *    a genuine, usable member of the family.
 *  - ZERO DEFLATION (fewer observed zeros than the fitted NB alone predicts).
 *    Same clamp, same reason, and the reason is structural: this family can only
 *    ADD zero mass, so deflation is OUTSIDE it and cannot be represented at any
 *    parameter value. The clamp returns the closest representable member — the
 *    plain NB, π̂ = 0 — rather than throwing, on the same principle the
 *    neg-binomial slot applies to under-dispersion: a sample with slightly fewer
 *    zeros than expected is ordinary sampling noise, not corrupt data. THE
 *    CALLER IS NOT TOLD, because `ZipParams` has nowhere to say it; a caller who
 *    needs to detect deflation must compare `n₀/n` against `makeZip(fit).pmf(0)`
 *    itself.
 *  - UNDER-DISPERSED POSITIVE PART. Handed to `fitNegBinomial` untouched, which
 *    returns its documented near-Poisson fit (r = 1e6). This slot does not check
 *    for, override, or reject that case — doing so would defeat the base slot's
 *    policy. Note the de-inflated sample always contains at least one positive
 *    observation (the all-zero case is short-circuited above), so its mean is
 *    strictly positive and the returned p is strictly below 1.
 *  - n = 1. A single positive observation gives n₀ = 0 → π̂ = 0 and the base
 *    slot's near-Poisson fit at that value. A single zero is the all-zero case.
 *    Neither throws, and neither should be believed.
 *
 * `fitZip` never returns π̂ = 1: that would require n₊ = 0, which is the all-zero
 * case and is short-circuited to π̂ = 0. `makeZip` still accepts π = 1.
 */
export const fitZip: FitZipFn = (counts: readonly number[]): ZipParams => {
  assertNonEmpty(counts, "counts");

  const n = counts.length;
  const positives: number[] = [];
  let zeros = 0;
  for (let i = 0; i < n; i += 1) {
    const c = counts[i]!;
    assertCount(c, `counts[${i}]`);
    if (c === 0) {
      zeros += 1;
    } else {
      positives.push(c);
    }
  }

  // ALL ZEROS — π unidentifiable, convention π̂ = 0 (see the docblock).
  // `fitNegBinomial` returns the exact point mass at 0 for this sample.
  if (positives.length === 0) {
    return { zeroInflation: 0, base: fitNegBinomial(counts) };
  }

  // NO ZEROS — unconstrained π̂ <= 0, clamped to 0 (see the docblock). Handled
  // explicitly so the result is the plain NB fit on the untouched sample.
  if (zeros === 0) {
    return { zeroInflation: 0, base: fitNegBinomial(counts) };
  }

  // The de-inflated sample is always a PREFIX of this buffer: the positives,
  // followed by as many zeros as the current allocation calls for.
  const positiveCount = positives.length;
  const buffer: number[] = new Array<number>(positiveCount + zeros);
  for (let i = 0; i < positiveCount; i += 1) buffer[i] = positives[i]!;
  for (let i = positiveCount; i < buffer.length; i += 1) buffer[i] = 0;

  let allocation = zeros; // start from π̂ = 0: the plain NB on the whole sample
  let bestAllocation = allocation;
  let bestBase: NegBinomialParams | null = null;
  let bestResidual = Number.POSITIVE_INFINITY;
  const visited = new Set<number>();

  for (let iteration = 0; iteration < FIT_ITERATION_BUDGET; iteration += 1) {
    visited.add(allocation);

    const base = fitNegBinomial(buffer.slice(0, positiveCount + allocation));
    // f₀ read straight off the base slot's own pmf — the p^r evaluation belongs
    // to the neg-binomial slot, not to this one.
    const zeroMass = makeNegBinomial(base).pmf(0);

    // Self-consistency target m₀ = n₊ · f₀ / (1 − f₀). `zeroMass` is strictly
    // below 1 because the de-inflated sample always holds a positive value, but
    // the guard keeps a hypothetical 1 from producing Infinity/NaN silently.
    const target =
      zeroMass >= 1 ? Number.POSITIVE_INFINITY : (positiveCount * zeroMass) / (1 - zeroMass);
    // Clamp to [0, n₀]: above n₀ is zero deflation (π̂ < 0), which the family
    // cannot represent, so the boundary IS the constrained solution and its
    // residual is measured against the clamped target, not the raw one.
    const clampedTarget = Math.min(zeros, Math.max(0, target));
    const residual = Math.abs(clampedTarget - allocation);

    if (residual < bestResidual) {
      bestResidual = residual;
      bestAllocation = allocation;
      bestBase = base;
    }

    const next = Math.round(clampedTarget);
    // `next === allocation` is the integer fixed point. `visited.has(next)` means
    // the integer map has entered a cycle (adjacent-integer two-cycles are the
    // only ones observed); either way, further iteration cannot improve on the
    // best point already recorded.
    if (next === allocation || visited.has(next)) break;
    allocation = next;
  }

  if (bestBase === null) {
    // Unreachable: the loop body runs at least once. Kept as a typed fail-closed
    // guard rather than a non-null assertion.
    throw new KernelError(
      "NO_CONVERGENCE",
      "zero-inflated fit produced no candidate base distribution",
    );
  }
  if (bestResidual > FIT_SELF_CONSISTENCY_TOL) {
    throw new KernelError(
      "NO_CONVERGENCE",
      `zero-inflated fit did not settle: best zero allocation ${bestAllocation} is ${bestResidual} observations from self-consistency`,
    );
  }

  return { zeroInflation: (zeros - bestAllocation) / n, base: bestBase };
};
