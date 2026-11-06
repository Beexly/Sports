/**
 * SLOT `block-bootstrap` — moving-block bootstrap percentile confidence
 * intervals for a statistic of a TIME-ORDERED series.
 *
 * WHY THE BLOCK FORM IS MANDATED
 * The ordinary (i.i.d.) bootstrap resamples single observations, which destroys
 * every bit of serial dependence in the series. On football data — a receiver's
 * week-to-week target share, a team's weekly pace, a model's weekly ROI — the
 * observations are positively autocorrelated, so the variance of a statistic
 * like the mean is governed by the LONG-RUN variance
 *   σ²_LR = γ(0) + 2 Σ_{h>=1} γ(h),
 * not by γ(0) alone. Resampling one point at a time estimates γ(0)/n and
 * therefore reports an interval that is far too narrow — it manufactures
 * confidence that the data does not contain. Resampling contiguous BLOCKS of
 * length L keeps the within-block dependence intact, so the resampling
 * distribution picks up the Σ_{h>=1} γ(h) terms and the interval widens to
 * something honest. (The unit tests prove this: on an AR(1) series with
 * φ = 0.9 the L = 50 interval is materially wider than the L = 1 interval.)
 *
 * ALGORITHM (exactly as the contract specifies — no wrapping, no centring)
 *   1. n = values.length, L = blockLength, B = ceil(n / L).
 *   2. Draw B block starts independently and uniformly from {0, …, n − L}
 *      (that is n − L + 1 admissible starts — NON-wrapping / "moving block",
 *      Künsch 1989, not the circular block bootstrap of Politis & Romano).
 *   3. Concatenate the B blocks in draw order and TRUNCATE the concatenation
 *      to the first n elements, so every resample has the same length as the
 *      original series.
 *   4. Apply `statistic` to the resample.
 *   5. Repeat `resamples` times; the interval is the percentile interval of
 *      the resampled statistics at `level`.
 *   6. `point` is `statistic(values)` — the statistic on the ORIGINAL series,
 *      NOT the mean of the resamples. (The mean of the resamples is a
 *      bootstrap estimate of E[statistic] and carries the bootstrap's own bias;
 *      reporting it as the point estimate would silently change what the number
 *      means.)
 *
 * KNOWN LIMITATION OF THE MANDATED (NON-WRAPPING) FORM — documented, not hidden
 * Because starts are drawn from {0 … n − L} without wrapping, observation i is
 * eligible for min(i + 1, L, n − L + 1, n − i) of the admissible blocks: the
 * observations near BOTH ends of the series appear in strictly fewer blocks
 * than the interior ones. E*[resample statistic] is therefore a slightly
 * end-down-weighted version of the sample statistic. The tilt is O(L / n) and
 * disappears as L/n → 0 (the regime the method is defined for); at large L/n —
 * say L = 60 on n = 150 — it can exceed the interval half-width, so the
 * percentile band may sit entirely to one side of `point`. The circular block
 * bootstrap (Politis & Romano) removes this by wrapping, which this contract
 * explicitly forbids. The interval is NOT recentred on `point` to paper over
 * it: recentring would fabricate coverage the resampling distribution does not
 * support. Both behaviours are pinned by tests. Choose L ≪ n.
 *
 * PURITY
 * The only randomness is `options.rng`. The input array is never mutated and a
 * fresh array is allocated for each resample, so a `statistic` that retains a
 * reference to (or sorts in place) the array it is handed cannot corrupt a
 * later resample or the caller's data.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  type BlockBootstrapFn,
  type BlockBootstrapOptions,
  type Interval,
  type Rng,
  type Probability,
} from "../contract.js";

/**
 * Percentile of an ASCENDING-sorted sample.
 *
 * INTERPOLATION CHOICE (documented as required):
 * linear interpolation between the two order statistics that bracket the
 * position h = (m − 1) · p — i.e. the "type 7" definition, which is R's
 * `quantile(..., type = 7)` default and NumPy's `percentile` default. It is
 * chosen over nearest-rank because (a) it is continuous in `level`, so the
 * reported interval widens smoothly as the confidence level rises instead of
 * jumping in steps of one order statistic, and (b) it agrees with the two
 * reference implementations a reviewer is most likely to check against. It
 * returns an EXISTING order statistic whenever h is an integer, so at m = 1 it
 * degenerates correctly to that single value, and at p = 0 / p = 1 it returns
 * the sample minimum / maximum exactly.
 *
 * No extrapolation is ever performed: the result is always inside
 * [sorted[0], sorted[m − 1]].
 */
function percentileSorted(sorted: readonly number[], p: Probability): number {
  const m = sorted.length;
  if (m === 1) return sorted[0]!;
  const h = (m - 1) * p;
  const lo = Math.floor(h);
  // `h <= m - 1` always, so `lo <= m - 1`; guard the p = 1 corner explicitly.
  if (lo >= m - 1) return sorted[m - 1]!;
  const frac = h - lo;
  const a = sorted[lo]!;
  const b = sorted[lo + 1]!;
  return a + frac * (b - a);
}

/**
 * Uniform integer in {0, …, bound − 1} from the injected source.
 *
 * `Rng` is contractually [0, 1), but a caller-supplied source could return
 * exactly 1 (or a value whose product rounds up at the last ulp). The `min`
 * guard exists ONLY to keep such a source from producing an out-of-range block
 * start; it never alters the distribution for a conforming `Rng`.
 */
function uniformInt(rng: Rng, bound: number): number {
  const u = rng();
  if (!Number.isFinite(u) || u < 0 || u > 1) {
    // Fail closed rather than silently folding a broken source back in range.
    throw new KernelError(
      "DOMAIN",
      `options.rng() must return a value in [0,1), received ${u}`,
    );
  }
  return Math.min(bound - 1, Math.floor(u * bound));
}

/**
 * Moving-block bootstrap percentile CI.
 *
 * Failure modes (all fail closed with `KernelError`):
 *  - EMPTY       — `values` has no elements.
 *  - DOMAIN      — `blockLength` is not an integer in [1, n]; `resamples` is
 *                  not an integer >= 1; `level` is not strictly inside (0, 1);
 *                  `options.rng` is not a function or returns outside [0,1].
 *  - NOT_FINITE  — any element of `values` is non-finite; `statistic` returns a
 *                  non-finite value on the original series or on any resample
 *                  (the message names the offending resample index — a
 *                  non-finite replicate is never silently dropped, because
 *                  dropping it would quietly change the effective `resamples`
 *                  and bias the percentile).
 *
 * Validation order is: EMPTY → option DOMAIN checks → per-element NOT_FINITE.
 * The option checks come first because they are O(1) and because `blockLength`
 * is validated against `n`, which the EMPTY check has already established.
 */
export const blockBootstrap: BlockBootstrapFn = (
  values: readonly number[],
  statistic: (sample: readonly number[]) => number,
  options: BlockBootstrapOptions,
): Interval => {
  assertNonEmpty(values, "values");
  const n = values.length;

  if (typeof statistic !== "function") {
    throw new KernelError("DOMAIN", "statistic must be a function");
  }
  if (typeof options?.rng !== "function") {
    throw new KernelError("DOMAIN", "options.rng must be a function");
  }

  const { blockLength, resamples, level, rng } = options;

  // NaN / Infinity fail these integer predicates, so a non-finite option is
  // reported as DOMAIN (the code the contract documents for an out-of-domain
  // option) rather than as NOT_FINITE.
  if (!Number.isInteger(blockLength) || blockLength < 1 || blockLength > n) {
    throw new KernelError(
      "DOMAIN",
      `options.blockLength must be an integer in [1, ${n}], received ${blockLength}`,
    );
  }

  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new KernelError(
      "DOMAIN",
      `options.resamples must be an integer >= 1, received ${resamples}`,
    );
  }

  // `level` must be strictly interior: a percentile interval is degenerate at
  // level 0 (zero width by construction) and undefined at level 1 (it would ask
  // for the 0th and 100th percentiles, i.e. the resample min and max, which is
  // not a confidence statement).
  if (!Number.isFinite(level) || level <= 0 || level >= 1) {
    throw new KernelError(
      "DOMAIN",
      `options.level must be in (0,1), received ${level}`,
    );
  }

  for (let i = 0; i < n; i += 1) {
    assertFinite(values[i]!, `values[${i}]`);
  }

  // Defensive copy: `statistic` is caller-supplied and the most natural
  // statistics to bootstrap (median, trimmed mean, any quantile) sort in place.
  // Handing it `values` directly would reorder the CALLER's array — and this is
  // a time-ordered series, so a silent reorder destroys the very
  // autocorrelation the block form exists to preserve, corrupting every
  // resample drawn afterwards.
  const point = statistic(values.slice());
  if (!Number.isFinite(point)) {
    throw new KernelError(
      "NOT_FINITE",
      `statistic returned ${point} on the original series; the point estimate must be finite`,
    );
  }

  const numBlocks = Math.ceil(n / blockLength);
  const numStarts = n - blockLength + 1; // >= 1 because blockLength <= n

  const replicates = new Float64Array(resamples);
  for (let b = 0; b < resamples; b += 1) {
    const resample = new Array<number>(n);
    let filled = 0;
    for (let blk = 0; blk < numBlocks && filled < n; blk += 1) {
      const start = uniformInt(rng, numStarts);
      // Truncate the final block so the concatenation is exactly n long.
      const take = Math.min(blockLength, n - filled);
      for (let j = 0; j < take; j += 1) {
        resample[filled + j] = values[start + j]!;
      }
      filled += take;
    }
    const s = statistic(resample);
    if (!Number.isFinite(s)) {
      throw new KernelError(
        "NOT_FINITE",
        `statistic returned ${s} on resample ${b}; every bootstrap replicate must be finite`,
      );
    }
    replicates[b] = s;
  }

  const sorted = Array.from(replicates);
  sorted.sort((a, z) => a - z);

  const alpha = 1 - level;
  const lower = percentileSorted(sorted, alpha / 2);
  const upper = percentileSorted(sorted, 1 - alpha / 2);

  return { point, lower, upper, level };
};
