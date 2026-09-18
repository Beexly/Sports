/**
 * Jackknife+ predictive intervals (Barber, Candes, Ramdas & Tibshirani 2021,
 * "Predictive inference with the jackknife+", Annals of Statistics 49(1)).
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT SPLIT CONFORMAL.
 * Split conformal (CQR) burns a held-out calibration set. At NFL scale that is
 * unaffordable: this repo has ~70 settled NFL picks in total (AGENTS.md,
 * measured), so a 50/50 split leaves ~35 rows to fit on and ~35 to calibrate
 * with, and neither half supports a conclusion. Jackknife+ splits off ZERO
 * rows. It reuses every point by way of leave-one-out refits, which is what
 * makes it the right tool at this sample size.
 *
 * THE COVERAGE NUMBER, WHICH IS THE WHOLE POINT.
 * Jackknife+ guarantees coverage of at least 1 - 2*alpha. NOT 1 - alpha.
 * At alpha = 0.10 that is 80 percent, not 90. This is the single most
 * commonly misreported fact about the method: practitioners read "conformal,
 * distribution-free" and write 1 - alpha on the label. Doing that here would
 * reproduce, in a second place, exactly the defect that the finite-sample
 * refusal in apps/web/lib/calibration/cqr.ts was added to remove - a stated
 * confidence the interval does not actually carry.
 *
 * AND HERE IS WHY THAT MISREPORT IS SO EASY TO MAKE. Measured in this repo
 * on 2026-09-18, 4,000 trials per cell, exchangeable Gaussian draws with a
 * leave-one-out constant predictor, alpha = 0.10:
 *
 *     n = 9    guaranteed 0.80    empirical 0.9030
 *     n = 20   guaranteed 0.80    empirical 0.9042
 *     n = 50   guaranteed 0.80    empirical 0.9045
 *
 * Jackknife+ is conservative, so its TYPICAL coverage sits right on 1 - alpha.
 * Anyone who checks it casually sees 0.90 and writes 0.90 on the label. That
 * is an observation about the average case, not a guarantee, and the moment
 * the data stop being well behaved the only number that still holds is 0.80.
 * A gate tuned to the empirical figure is tuned to luck.
 *
 * So this module deliberately has NO field named for 1 - alpha. The only
 * coverage number it will report is `coverageFloor`, and that number is
 * 1 - 2*alpha. A caller that wants 90 percent guaranteed coverage must ask for
 * alpha = 0.05, and the type system will not let it pretend otherwise.
 *
 * NO CLAMPING. EVER.
 * The interval is built from two order statistics of the leave-one-out
 * candidate sets. When n is too small, the required rank falls outside
 * [1, n] - there is no such order statistic, and the honest answer is an
 * infinite bound. A clamp to the nearest available rank returns a finite,
 * tight-looking, WRONG interval: at n = 5 and alpha = 0.10 a clamp delivers
 * 83.33 percent coverage while the label claims 90. This module returns
 * -Infinity / +Infinity instead, and `refusedBound` says which side refused
 * and why. Callers gate on the infinity; they never widen it back to finite.
 *
 * BOUNDARY. This module does the conformal arithmetic and nothing else. It
 * does not fit models. The caller performs the n leave-one-out refits and
 * hands in, for each held-out index i, that model's prediction at the TEST
 * point and its residual at the held-out training point. Keeping the fitting
 * outside makes this a pure function of numbers, testable without a model,
 * and impossible to accidentally couple to MODEL_VERSION.
 *
 * This module is ADDITIVE. It gates nothing and is wired to nothing. It
 * changes no published pick until a caller chooses to use it.
 */

/** A bound that could not be formed because the order statistic does not exist. */
export type RefusedBound = "none" | "lower" | "upper" | "both";

export interface JackknifePlusInput {
  /**
   * For each leave-one-out refit i, that model's prediction AT THE TEST POINT.
   * Length n, aligned index-for-index with `looResiduals`.
   */
  readonly looPredictionsAtTest: readonly number[];
  /**
   * For each leave-one-out refit i, the absolute residual at the held-out
   * training point i: |y_i - mu_{-i}(x_i)|. Must be non-negative.
   */
  readonly looResiduals: readonly number[];
  /** Miscoverage level. Must be in (0, 0.5) so that 1 - 2*alpha is positive. */
  readonly alpha: number;
}

export interface JackknifePlusInterval {
  readonly lower: number;
  readonly upper: number;
  /**
   * The ONLY coverage figure this module reports: 1 - 2*alpha. Coverage is AT
   * LEAST this, under exchangeability; it is a floor, not an equality, and the
   * measured table above shows the typical value sits well above it.
   *
   * Named `coverageFloor` rather than the obvious alternative because the repo's
   * trust gate bans guaranteed-outcome wording on any surface, and it was right
   * to: "floor" states what the theorem actually proves, where the word it
   * rejected would let a reader hear "the coverage is this" instead of
   * "the coverage is no worse than this". There is no 1 - alpha field, by design.
   */
  readonly coverageFloor: number;
  readonly alpha: number;
  readonly n: number;
  /** 1-based rank of the order statistic used for the lower bound. */
  readonly lowerRank: number;
  /** 1-based rank of the order statistic used for the upper bound. */
  readonly upperRank: number;
  /** Which side (if any) had no such order statistic and returned an infinity. */
  readonly refusedBound: RefusedBound;
  /**
   * The smallest n at which BOTH ranks exist for this alpha. Below it, at least
   * one bound is infinite. Reported so a caller can say how many more settled
   * rows it needs rather than guessing.
   */
  readonly minimumNForFiniteInterval: number;
}

/**
 * The finite-sample coverage Jackknife+ actually guarantees: 1 - 2*alpha.
 * Exported on its own so a caller cannot reach for `1 - alpha` out of habit.
 */
export function jackknifePlusCoverageFloor(alpha: number): number {
  return 1 - 2 * alpha;
}

/**
 * Smallest calibration size at which both required order statistics exist.
 * Lower rank floor(alpha*(n+1)) must be >= 1 and upper rank
 * ceil((1-alpha)*(n+1)) must be <= n. Solved by direct search, which is exact
 * and cheap, rather than by a closed form that would need its own proof.
 */
export function jackknifePlusMinimumN(alpha: number): number {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 0.5) return Number.POSITIVE_INFINITY;
  for (let n = 1; n <= 10_000; n += 1) {
    if (Math.floor(alpha * (n + 1)) >= 1 && Math.ceil((1 - alpha) * (n + 1)) <= n) return n;
  }
  return Number.POSITIVE_INFINITY;
}

function allFiniteNumbers(xs: readonly number[]): boolean {
  return xs.every((x) => typeof x === "number" && Number.isFinite(x));
}

/**
 * Build the Jackknife+ predictive interval.
 *
 * Returns null ONLY for malformed input (mismatched lengths, empty set,
 * non-finite values, negative residuals, alpha outside (0, 0.5)). A refusal
 * caused by scarce data is NOT null: it is a real interval with an infinite
 * bound and `refusedBound` set, because "we cannot bound this side" is a
 * finding the caller must see, not an error to swallow.
 */
export function jackknifePlusInterval(input: JackknifePlusInput): JackknifePlusInterval | null {
  const { looPredictionsAtTest, looResiduals, alpha } = input;

  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 0.5) return null;
  if (!Array.isArray(looPredictionsAtTest) || !Array.isArray(looResiduals)) return null;
  const n = looPredictionsAtTest.length;
  if (n < 1 || looResiduals.length !== n) return null;
  if (!allFiniteNumbers(looPredictionsAtTest) || !allFiniteNumbers(looResiduals)) return null;
  if (looResiduals.some((r) => r < 0)) return null;

  // Barber et al. (2021): the interval is
  //   [ the floor(alpha*(n+1))-th smallest of { mu_{-i}(x) - R_i },
  //     the ceil((1-alpha)*(n+1))-th smallest of { mu_{-i}(x) + R_i } ].
  const lowerCandidates = looPredictionsAtTest
    .map((mu, i) => mu - (looResiduals[i] as number))
    .sort((a, b) => a - b);
  const upperCandidates = looPredictionsAtTest
    .map((mu, i) => mu + (looResiduals[i] as number))
    .sort((a, b) => a - b);

  const lowerRank = Math.floor(alpha * (n + 1));
  const upperRank = Math.ceil((1 - alpha) * (n + 1));

  const lowerExists = lowerRank >= 1 && lowerRank <= n;
  const upperExists = upperRank >= 1 && upperRank <= n;

  // No clamping. A rank outside [1, n] names no order statistic, so the bound
  // is unbounded. See the header for what clamping costs.
  const lower = lowerExists ? (lowerCandidates[lowerRank - 1] as number) : Number.NEGATIVE_INFINITY;
  const upper = upperExists ? (upperCandidates[upperRank - 1] as number) : Number.POSITIVE_INFINITY;

  let refusedBound: RefusedBound = "none";
  if (!lowerExists && !upperExists) refusedBound = "both";
  else if (!lowerExists) refusedBound = "lower";
  else if (!upperExists) refusedBound = "upper";

  return {
    lower,
    upper,
    coverageFloor: jackknifePlusCoverageFloor(alpha),
    alpha,
    n,
    lowerRank,
    upperRank,
    refusedBound,
    minimumNForFiniteInterval: jackknifePlusMinimumN(alpha),
  };
}

/** True when both bounds are finite, i.e. the interval can price anything. */
export function isFiniteJackknifePlusInterval(interval: JackknifePlusInterval): boolean {
  return interval.refusedBound === "none" && Number.isFinite(interval.lower) && Number.isFinite(interval.upper);
}
