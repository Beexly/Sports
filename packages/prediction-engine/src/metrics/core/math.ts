/**
 * Shared numeric primitives for the prediction engine.
 *
 * These are the low-level, dependency-free building blocks that every metric,
 * estimator, and calibration routine composes on top of. They are pure and
 * deterministic (no clock, no I/O, no global state) and each guards its
 * degenerate inputs by collapsing to a neutral, honest sentinel rather than
 * propagating `NaN`/`Infinity`. Read each function's contract below before
 * relying on its edge-case behavior — several return a deliberate `0` that a
 * caller must not mistake for a measured value (see {@link normalizeClamped},
 * {@link zScore}, {@link weightedMean}).
 */

/**
 * Constrain `value` to the closed interval [`min`, `max`].
 *
 * @remarks
 * - `NaN` is not sanitized: a `NaN` input propagates to a `NaN` output.
 * - Inverted bounds (`min > max`) return `min`; callers are responsible for
 *   passing a well-ordered range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Clamp `value` to the unit interval [0, 1] (probabilities, weights, fractions). */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Clamp `value` to the canonical metric score scale [0, 100]. */
export function clampScore(value: number): number {
  return clamp(value, 0, 100);
}

/**
 * Min-max normalize `value` from [`min`, `max`] into [0, 1], clamping ends.
 *
 * @returns the normalized fraction in [0, 1]; `0` when the range is degenerate
 * (`max <= min`). That `0` is a "no usable range" sentinel, not a measured
 * bottom-of-range reading — do not treat the two cases as equivalent.
 */
export function normalizeClamped(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

/** Logistic function; maps the real line into the open interval (0, 1). */
export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

/**
 * Inverse logistic (log-odds) of a probability.
 *
 * The input is clamped to [1e-6, 1 - 1e-6] before the log so that `probability`
 * of exactly 0 or 1 maps to a large finite log-odds instead of ±Infinity,
 * keeping downstream linear combinations numerically well-behaved.
 */
export function logit(probability: number): number {
  const bounded = clamp(probability, 0.000001, 0.999999);
  return Math.log(bounded / (1 - bounded));
}

/**
 * Softplus, `log(1 + e^value)`, evaluated with numerically stable tails.
 *
 * For `value > 30` the `e^value` term dominates and `softplus ≈ value`; for
 * `value < -30` it underflows to `e^value`. Between the tails it uses
 * `log1p(exp(value))` to avoid overflow/precision loss.
 */
export function softplus(value: number): number {
  if (value > 30) return value;
  if (value < -30) return Math.exp(value);
  return Math.log1p(Math.exp(value));
}

/**
 * Standard score `(value - mean) / standardDeviation`.
 *
 * @returns the z-score; `0` when `standardDeviation` is non-positive or
 * non-finite. A degenerate/unknown spread is treated as "no signal" (neutral 0)
 * rather than producing `NaN`/`Infinity`.
 */
export function zScore(value: number, mean: number, standardDeviation: number): number {
  if (standardDeviation <= 0 || !Number.isFinite(standardDeviation)) return 0;
  return (value - mean) / standardDeviation;
}

/**
 * Round `value` to `digits` decimal places (default 4) via scale-multiply.
 *
 * Uses IEEE-754 `Math.round`, so results are the nearest representable double
 * to the rounded decimal — adequate for display/serialization, not exact
 * decimal arithmetic.
 */
export function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Weighted arithmetic mean of `{ value, weight }` entries.
 *
 * Contract / honesty gates:
 * - Entries are filtered out unless `value` is finite AND `weight > 0`. So
 *   `NaN`/`Infinity` values and zero/negative weights are silently dropped and
 *   contribute neither to the numerator nor to the total weight.
 * - When no entry survives that filter (empty input, all weights <= 0, or all
 *   values non-finite) the total weight is 0 and the function returns `0` as a
 *   sentinel. Callers MUST NOT read that `0` as a measured mean — it means
 *   "no usable data" and is indistinguishable from a legitimate weighted mean
 *   of 0. Guard the no-data case at the call site (e.g. check the input has at
 *   least one finite, positively-weighted entry) if the distinction matters.
 */
export function weightedMean(values: readonly { readonly value: number; readonly weight: number }[]): number {
  const valid = values.filter((entry) => Number.isFinite(entry.value) && entry.weight > 0);
  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 0;
  return valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

/**
 * Fixed non-linear basis expansion of a scalar, for smooth (spline-like) models.
 *
 * The input is clamped to [-8, 8] first, bounding the cubic terms so extreme
 * leverage points cannot blow up the feature vector. The returned vector is, in
 * order: [0] linear `x`, [1] quadratic `x²`, [2] cubic `x³`, then [3..] one
 * truncated-power hinge `max(0, x - knot)³` per knot (in `knots` order),
 * followed by `log1p(|x|)` and `sigmoid(1.7·x)` as the final two entries. With
 * the default 3 knots the vector has length 8 (3 polynomial + 3 hinge + 2 tail).
 * Consumers that select specific indices (e.g. expected-completion) depend on
 * this exact ordering, so keep the layout stable.
 */
export function protectedBasis(value: number, knots: readonly number[] = [-1, 0, 1]): readonly number[] {
  const bounded = clamp(value, -8, 8);
  return [
    bounded,
    bounded ** 2,
    bounded ** 3,
    ...knots.map((knot) => Math.max(0, bounded - knot) ** 3),
    Math.log1p(Math.abs(bounded)),
    sigmoid(1.7 * bounded),
  ];
}
