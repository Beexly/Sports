/**
 * Empirical-Bayes shrinkage primitives.
 *
 * These helpers pull a noisy `observed` reading toward a stabler `prior` by an
 * amount that scales with how much evidence backs the observation. They are the
 * engine's defense against small-sample overconfidence: a rate seen over a
 * handful of plays is trusted less than the same rate seen over hundreds. All
 * functions here are pure and deterministic (no clock, no I/O, no global state)
 * and compose on top of the primitives in {@link ./math.js}.
 *
 * The shared model is the conjugate posterior mean
 *   (sampleSize·observed + priorStrength·prior) / (sampleSize + priorStrength),
 * i.e. a weighted average whose weights are the evidence count (`sampleSize`)
 * and the prior's pseudo-count strength (`priorStrength`). As `sampleSize` grows
 * the result converges to `observed`; as `priorStrength` grows it converges to
 * `prior`. All results are rounded to 4 decimal places for stable serialization.
 */
import { clamp01, round, weightedMean } from "./math.js";

/**
 * Inputs to {@link empiricalBayesShrink}.
 *
 * `observed` and `prior` must share the same scale/units (e.g. both
 * probabilities, both per-play rates); the result is returned on that same
 * scale. This primitive does not itself bound the scale — see
 * {@link shrinkProbability} for the [0, 1] specialization.
 */
export interface EmpiricalBayesShrinkageInput {
  /** The raw, small-sample reading to be regularized. */
  readonly observed: number;
  /** The stable fallback the reading is pulled toward when evidence is thin. */
  readonly prior: number;
  /** Amount of evidence behind `observed` (e.g. play/sample count); floored at 0. */
  readonly sampleSize: number;
  /** Prior pseudo-count weight; larger = stronger pull toward `prior`; floored at 0. */
  readonly priorStrength: number;
}

/**
 * Shrink `observed` toward `prior` via the conjugate posterior mean.
 *
 * @returns the evidence-weighted blend
 * `(sampleSize·observed + priorStrength·prior) / (sampleSize + priorStrength)`,
 * rounded to 4 decimal places, on the same scale as the inputs.
 *
 * Contract / edge cases:
 * - `sampleSize` and `priorStrength` are floored at 0 before use, so negative
 *   inputs are treated as "no weight" rather than flipping the blend.
 * - When both floored weights are 0 (degenerate denominator) the function
 *   returns `prior` (rounded): with no evidence and no prior mass it falls back
 *   to the prior mean rather than producing `NaN`.
 * - The output is NOT clamped to any range; callers whose scale is bounded
 *   (e.g. probabilities) must clamp themselves — see {@link shrinkProbability}.
 */
export function empiricalBayesShrink(input: EmpiricalBayesShrinkageInput): number {
  const sampleSize = Math.max(0, input.sampleSize);
  const priorStrength = Math.max(0, input.priorStrength);
  const denominator = sampleSize + priorStrength;
  if (denominator <= 0) return round(input.prior, 4);
  return round((sampleSize * input.observed + priorStrength * input.prior) / denominator, 4);
}

/**
 * Inputs to {@link shrinkProbability}. Same shape as
 * {@link EmpiricalBayesShrinkageInput}, specialized to probabilities: `observed`
 * and `prior` are interpreted as probabilities and are clamped into [0, 1]
 * before shrinking.
 */
export interface ProbabilityShrinkageInput {
  /** Observed win/hit probability; clamped into [0, 1] before shrinking. */
  readonly observed: number;
  /** Prior probability the reading is pulled toward; clamped into [0, 1]. */
  readonly prior: number;
  /** Amount of evidence behind `observed`; floored at 0 (see {@link empiricalBayesShrink}). */
  readonly sampleSize: number;
  /** Prior pseudo-count weight; floored at 0 (see {@link empiricalBayesShrink}). */
  readonly priorStrength: number;
}

/**
 * Probability-specialized {@link empiricalBayesShrink}.
 *
 * Clamps `observed` and `prior` into [0, 1] before shrinking and clamps the
 * blended result back into [0, 1], so the output is always a valid probability
 * even when the inputs are out of range. The [0, 1] blend of two [0, 1] values
 * is already in range; the outer clamp is defensive against rounding at the
 * boundaries.
 */
export function shrinkProbability(input: ProbabilityShrinkageInput): number {
  return clamp01(
    empiricalBayesShrink({
      observed: clamp01(input.observed),
      prior: clamp01(input.prior),
      priorStrength: input.priorStrength,
      sampleSize: input.sampleSize,
    }),
  );
}

/**
 * Shrink the weighted mean of several `{ value, weight }` readings toward
 * `prior`, using the total entry weight as the effective sample size.
 *
 * The observed rate is the weighted mean of the entries (via
 * {@link weightedMean}); the shrink strength is driven by `observedWeight`, the
 * summed positive weight of the entries, passed as `sampleSize`. So a rate
 * backed by more total weight is trusted more (pulled less toward `prior`).
 *
 * Limitation — effective-sample-size vs. observed-mean support can diverge:
 * `observedWeight` sums `Math.max(0, weight)` over ALL entries, whereas
 * {@link weightedMean} additionally excludes entries whose `value` is non-finite
 * (`NaN`/`Infinity`). For an input containing a non-finite value paired with a
 * positive weight, the effective sample size therefore over-counts relative to
 * the support of the observed mean, over-trusting `observed` versus `prior`.
 * This is latent, not live: every current caller passes a single clamped, finite
 * entry, for which the two entry sets coincide exactly. Callers that may pass
 * multiple entries with possibly non-finite values should pre-filter to finite,
 * positively-weighted entries so the sample size and the observed mean are
 * derived from an identical set.
 */
export function shrinkWeightedMean(
  values: readonly { readonly value: number; readonly weight: number }[],
  prior: number,
  priorStrength: number,
): number {
  // NOTE: summed over all positively-weighted entries — this can include an
  // entry that weightedMean() drops for a non-finite value (see doc above).
  const observedWeight = values.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  const observed = weightedMean(values);
  return empiricalBayesShrink({ observed, prior, priorStrength, sampleSize: observedWeight });
}
