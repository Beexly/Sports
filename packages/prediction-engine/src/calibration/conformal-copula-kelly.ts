/**
 * T7 -- 600-Test Conformal & TA-CQR Invariant Matrix.
 *
 * Four independently testable pieces, each exported:
 *
 *   (a) EXACT FINITE-SAMPLE RANK.
 *       conformalRank(n, epsilon) = ceil((n + 1) * (1 - epsilon)).
 *       Shafer & Vovk (2008), "A Tutorial on Conformal Prediction",
 *       JMLR 9:371-421, Sec 4, pp 379-381: the (1 - epsilon)-quantile of n
 *       nonconformity scores is the ceil((n+1)(1-epsilon))-th order
 *       statistic. Any other order statistic -- floor, round, a plain
 *       (1-epsilon) fraction of n -- breaks the finite-sample coverage
 *       guarantee, which is why the ceil is load-bearing and not cosmetic.
 *
 *   (b) ASYMMETRIC TA-CQR CONFORMITY SCORE.
 *       taCqrScore(y, qLower, qUpper, beta) = max(qLower - y, y - qUpper).
 *       Romano, Patterson & Candes (2019), "Conformalized Quantile
 *       Regression", NeurIPS 2019, p 3544; TA-CQR as in Wang (2026),
 *       arXiv:2604.25202. The lower-tail level beta* lies in (0, alpha) and
 *       the upper level is 1 - alpha + beta* (see taCqrLevels), so the two
 *       tails of the interval are allocated asymmetrically; the score itself
 *       is the larger of the two one-sided signed errors.
 *       optimalLowerTailLevel selects beta* from a grid by minimising a
 *       caller-supplied loss over the admissible grid.
 *
 *   (c) FRECHET-HOEFFDING COPULA BOUNDS.
 *       frechetHoeffdingBounds(pa, pb) = [max(0, pa + pb - 1), min(pa, pb)].
 *       Park, Tibshirani & Cho (2025), AISTATS; Cyusa Mukama et al. (2025),
 *       PMLR 266:317-335. Every joint probability of two events with
 *       marginals pa and pb must lie in that interval.
 *       A joint probability outside the interval is REJECTED, never clamped.
 *       Clamping is the bug this module exists to prevent: a clamped joint
 *       probability is a plausible-looking number that silently hides an
 *       incoherent pricing model, and downstream sizing then acts on a
 *       probability that no distribution can produce. checkJointProbability
 *       therefore returns a verdict and a reason and has no field that could
 *       carry a clamped value back to the caller; assertJointProbability
 *       throws with the reason attached.
 *
 *   (d) SLOW 75% CONFORMAL KELLY SIZING.
 *       conformalKellyStake implements the goal spec's section 5.2 equation
 *       verbatim:
 *
 *         f_stake,t = lambda_kelly * K_t * b_t * p_t
 *                      - (1 - p_t) * b_t * (1 + kappa_sigma * sigma_conf,t^2)
 *                        * max(0, 1 - max(0, D_break,t - alpha_down) / alpha_down)
 *
 *       sigma_conf,t is the SLOW (unweighted) 250-game rolling 75% conformal
 *       half-width (slowConformalHalfWidth / conformalHalfWidth); the
 *       250-game window and the 75% coverage level are the slow ones on
 *       purpose. Per Ryan (2026), "Conformal Kelly: Conformal Prediction
 *       Intervals as the Scale in Fractional Kelly Position Sizing",
 *       arXiv:2608.01494, Table 1 & Sec 6: fast-adapting intervals inject
 *       width variance into f* = mu / sigma^2 and regress log-growth by
 *       -1.4 to -3.3pp/yr; the slow unweighted 75% half-width is the
 *       remedy. The unweighted rolling half-width is therefore the default
 *       and the only width this module knows how to build.
 *
 *       D_break,t is the one-sided downside break-rate dial and alpha_down
 *       the downside allowance. The throttle factor
 *       max(0, 1 - max(0, D_break - alpha_down) / alpha_down) scales the
 *       DOWNSIDE PENALTY down as the break rate pushes past the allowance,
 *       so under the spec's equation a harsher break rate raises f_stake.
 *       That is the spec's equation, implemented as written and not
 *       "corrected" -- the sign convention is pinned by the invariant
 *       matrix so a later reader cannot silently flip it.
 *
 * Pure. No I/O, no clock, no randomness. Every function is total on its
 * documented domain and throws a named error outside it.
 *
 * Citations are recorded as the goal spec's Table 5 records them.
 */

/* ------------------------------------------------------------------ *
 * (a) EXACT FINITE-SAMPLE RANK
 * ------------------------------------------------------------------ */

/** Smallest calibration sample size the rank formula is defined for. */
export const MIN_CONFORMAL_N = 1;

/**
 * The rank formula is defined for epsilon in [0, 1). At epsilon = 1 the
 * formula asks for the 0th order statistic, which does not exist, so that
 * endpoint is rejected rather than silently returning 0.
 */
export const MAX_CONFORMAL_EPSILON = 1;

/**
 * The exact finite-sample conformal rank: the index of the order statistic
 * used as the (1 - epsilon) quantile of n nonconformity scores.
 *
 * ceil((n + 1) * (1 - epsilon)) -- Shafer & Vovk (2008), Sec 4, pp 379-381.
 * The result lies in [1, n + 1] for n >= 1 and epsilon in [0, 1).
 *
 * @throws when n is not an integer >= MIN_CONFORMAL_N, or epsilon is not
 *         finite and inside [0, 1).
 */
export function conformalRank(n: number, epsilon: number): number {
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`conformalRank: n must be a finite integer, got ${String(n)}`);
  }
  if (n < MIN_CONFORMAL_N) {
    throw new Error(`conformalRank: n must be >= ${MIN_CONFORMAL_N}, got ${n}`);
  }
  if (!Number.isFinite(epsilon) || epsilon < 0 || epsilon >= MAX_CONFORMAL_EPSILON) {
    throw new Error(
      `conformalRank: epsilon must be a finite number in [0, ${MAX_CONFORMAL_EPSILON}), got ${String(epsilon)}`,
    );
  }
  return Math.ceil((n + 1) * (1 - epsilon));
}

/* ------------------------------------------------------------------ *
 * (b) ASYMMETRIC TA-CQR CONFORMITY SCORE
 * ------------------------------------------------------------------ */

/** The two quantile levels of a TA-CQR interval at a given miscoverage and lower-tail level. */
export interface TaCqrLevels {
  /** Lower quantile level: beta*, in (0, alpha). */
  readonly lowerLevel: number;
  /** Upper quantile level: 1 - alpha + beta*, in (alpha + beta*, 1]. */
  readonly upperLevel: number;
}

/**
 * The quantile levels of a TA-CQR interval: the lower tail gets beta* and
 * the upper tail gets alpha - beta*, so the two together cover exactly the
 * miscoverage alpha.
 *
 * @throws when alpha is not in (0, 1) or beta is not in (0, alpha).
 */
export function taCqrLevels(alpha: number, beta: number): TaCqrLevels {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error(`taCqrLevels: alpha must be a finite number in (0, 1), got ${String(alpha)}`);
  }
  if (!Number.isFinite(beta) || beta <= 0 || beta >= alpha) {
    throw new Error(`taCqrLevels: beta must be a finite number in (0, alpha), got ${String(beta)}`);
  }
  return { lowerLevel: beta, upperLevel: 1 - alpha + beta };
}

/**
 * The asymmetric TA-CQR conformity score of one observation:
 *
 *   E(y) = max(qLower - y, y - qUpper)
 *
 * -- Romano, Patterson & Candes (2019), p 3544; TA-CQR as in Wang (2026),
 * arXiv:2604.25202.
 *
 * The score is the larger of the two one-sided signed errors. It is
 * POSITIVE when y falls outside [qLower, qUpper], EXACTLY zero on either
 * endpoint, and NEGATIVE when y lies strictly inside the interval -- the
 * Romano et al. score is not truncated at zero, and the conformal machinery
 * consumes its (1 - alpha) quantile (which may be negative) to build the
 * final interval.
 *
 * `beta` is the lower-tail level that produced `qLower`; the matching upper
 * level is 1 - alpha + beta (see taCqrLevels). The score does not depend on
 * beta numerically -- the asymmetry is already carried by the two quantiles
 * -- but beta is validated so a caller cannot record an inadmissible level.
 *
 * @throws when y, qLower or qUpper is not finite, when beta is not a finite
 *         number in (0, 1), or when qLower > qUpper (which is not an
 *         interval).
 */
export function taCqrScore(y: number, qLower: number, qUpper: number, beta: number): number {
  if (!Number.isFinite(y)) {
    throw new Error(`taCqrScore: y must be a finite number, got ${String(y)}`);
  }
  if (!Number.isFinite(qLower) || !Number.isFinite(qUpper)) {
    throw new Error(
      `taCqrScore: qLower and qUpper must be finite numbers, got ${String(qLower)} and ${String(qUpper)}`,
    );
  }
  if (!Number.isFinite(beta) || beta <= 0 || beta >= 1) {
    throw new Error(`taCqrScore: beta must be a finite number in (0, 1), got ${String(beta)}`);
  }
  if (qLower > qUpper) {
    throw new Error(
      `taCqrScore: qLower must be <= qUpper, got qLower=${qLower} and qUpper=${qUpper}`,
    );
  }
  return Math.max(qLower - y, y - qUpper);
}

/** The search problem solved by optimalLowerTailLevel. */
export interface TaCqrLowerTailSearch {
  /** Miscoverage level alpha, in (0, 1). */
  readonly alpha: number;
  /** Candidate lower-tail levels; every one must lie in (0, alpha). */
  readonly candidates: readonly number[];
  /**
   * The loss to minimise over the candidate levels, e.g. the expected
   * interval width at the candidate level. Must be finite.
   */
  readonly loss: (beta: number, levels: TaCqrLevels) => number;
}

/** The winning lower-tail level and everything needed to audit the choice. */
export interface TaCqrLowerTailChoice {
  /** The selected beta*, in (0, alpha). */
  readonly beta: number;
  /** The quantile levels implied by the selected beta*. */
  readonly levels: TaCqrLevels;
  /** The loss at the selected beta*. */
  readonly loss: number;
  /** How many candidates were evaluated. */
  readonly evaluated: number;
}

/**
 * Select the TA-CQR lower-tail level beta* from a grid.
 *
 * TA-CQR (Wang 2026, arXiv:2604.25202) picks beta* in (0, alpha) to
 * allocate the two tails of the interval; the "T" is the training step in
 * which the allocation is chosen against a loss rather than fixed at
 * alpha/2. The selection here is deterministic: the lowest loss wins, and
 * an exact tie is broken on the SMALLEST beta so the result does not depend
 * on the order of the candidate grid.
 *
 * @throws when alpha is not in (0, 1), when the candidate grid is empty,
 *         when a candidate is outside (0, alpha), or when the loss is not
 *         finite.
 */
export function optimalLowerTailLevel(search: TaCqrLowerTailSearch): TaCqrLowerTailChoice {
  const { alpha, candidates, loss } = search;
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error(`optimalLowerTailLevel: alpha must be a finite number in (0, 1), got ${String(alpha)}`);
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("optimalLowerTailLevel: the candidate grid must be non-empty");
  }
  let bestBeta: number | null = null;
  let bestLevels: TaCqrLevels | null = null;
  let bestLoss = Number.POSITIVE_INFINITY;
  let evaluated = 0;
  for (const beta of candidates) {
    if (!Number.isFinite(beta) || beta <= 0 || beta >= alpha) {
      throw new Error(
        `optimalLowerTailLevel: every candidate beta must be a finite number in (0, alpha), got ${String(beta)}`,
      );
    }
    const levels = taCqrLevels(alpha, beta);
    const value = loss(beta, levels);
    if (!Number.isFinite(value)) {
      throw new Error(`optimalLowerTailLevel: loss must be finite, got ${String(value)}`);
    }
    evaluated += 1;
    if (bestBeta === null || value < bestLoss || (value === bestLoss && beta < bestBeta)) {
      bestBeta = beta;
      bestLevels = levels;
      bestLoss = value;
    }
  }
  if (bestBeta === null || bestLevels === null) {
    throw new Error("optimalLowerTailLevel: no candidate was evaluated");
  }
  return { beta: bestBeta, levels: bestLevels, loss: bestLoss, evaluated };
}

/* ------------------------------------------------------------------ *
 * (c) FRECHET-HOEFFDING COPULA BOUNDS
 * ------------------------------------------------------------------ */

/** The Frechet-Hoeffding interval for a joint probability. */
export interface FrechetHoeffdingBounds {
  /** Lower bound: max(0, pa + pb - 1). */
  readonly lower: number;
  /** Upper bound: min(pa, pb). */
  readonly upper: number;
}

/**
 * The Frechet-Hoeffding bounds on the joint probability of two events with
 * marginals pa and pb:
 *
 *   max(0, pa + pb - 1) <= P(A and B) <= min(pa, pb)
 *
 * Park, Tibshirani & Cho (2025), AISTATS; Cyusa Mukama et al. (2025),
 * PMLR 266:317-335.
 *
 * The lower bound is min(max(0, pa + pb - 1), min(pa, pb)). In exact
 * arithmetic the two are the same number, because pa + pb - 1 <= min(pa, pb)
 * holds for every pa, pb in [0, 1]. In IEEE-754 they can differ: for
 * pa = 0.05, pb = 1 the double nearest 0.05 + 1 - 1 is 0.050000000000000044
 * while min(pa, pb) is 0.05, so the unguarded lower bound would sit ABOVE
 * the upper bound and the interval would be empty -- and a joint
 * probability of exactly 0.05, which is certain when pb = 1, would be
 * rejected by the checker. The min() is a floating-point repair, not a
 * change of the law: it can only pull the lower bound DOWN onto the upper
 * bound in the cases where the two disagree by rounding, and it never
 * lets a joint probability outside the true bounds through.
 *
 * @throws when pa or pb is not a finite probability in [0, 1].
 */
export function frechetHoeffdingBounds(pa: number, pb: number): FrechetHoeffdingBounds {
  assertProbability("pa", pa);
  assertProbability("pb", pb);
  const upper = Math.min(pa, pb);
  return { lower: Math.min(Math.max(0, pa + pb - 1), upper), upper };
}

/**
 * Is `joint` inside the Frechet-Hoeffding bounds for the marginals pa, pb?
 *
 * A joint probability outside [0, 1] is simply not within the bounds; it is
 * reported as `false` rather than thrown, so this predicate can be used as a
 * filter. Use assertJointProbability when a violation must stop the caller.
 *
 * @throws when pa or pb is not a finite probability in [0, 1].
 */
export function isWithinFrechetHoeffding(pa: number, pb: number, joint: number): boolean {
  const bounds = frechetHoeffdingBounds(pa, pb);
  if (!Number.isFinite(joint)) return false;
  return joint >= bounds.lower && joint <= bounds.upper;
}

/** The verdict of the joint-probability sanity check. */
export interface JointProbabilityCheck {
  /** True when the joint probability is admissible. */
  readonly ok: boolean;
  /** The bounds the joint probability was checked against. */
  readonly bounds: FrechetHoeffdingBounds;
  /** Why the joint probability was rejected; null when it was accepted. */
  readonly reason: string | null;
}

/**
 * Check a joint probability against the Frechet-Hoeffding bounds.
 *
 * THE CHECK REJECTS; IT NEVER CLAMPS. A violating joint probability is
 * reported as not ok with a reason naming the bound it broke. There is no
 * field on the result that could carry a clamped value back to the caller,
 * so a caller cannot accidentally consume a clamped probability.
 *
 * @throws when pa or pb is not a finite probability in [0, 1].
 */
export function checkJointProbability(pa: number, pb: number, joint: number): JointProbabilityCheck {
  const bounds = frechetHoeffdingBounds(pa, pb);
  if (!Number.isFinite(joint) || joint < 0 || joint > 1) {
    return {
      ok: false,
      bounds,
      reason: `joint probability ${String(joint)} is not a probability in [0, 1]`,
    };
  }
  if (joint < bounds.lower) {
    return {
      ok: false,
      bounds,
      reason:
        `joint probability ${joint} is below the Frechet-Hoeffding lower bound ` +
        `${bounds.lower} (pa=${pa}, pb=${pb})`,
    };
  }
  if (joint > bounds.upper) {
    return {
      ok: false,
      bounds,
      reason:
        `joint probability ${joint} is above the Frechet-Hoeffding upper bound ` +
        `${bounds.upper} (pa=${pa}, pb=${pb})`,
    };
  }
  return { ok: true, bounds, reason: null };
}

/**
 * Assert that a joint probability is inside the Frechet-Hoeffding bounds and
 * return it unchanged.
 *
 * The returned value is the joint probability AS SUPPLIED. It is never a
 * clamped or repaired version of it: a violating input throws, it does not
 * come back as a plausible-looking number. A caller that wants the nearest
 * admissible value has to ask for it explicitly.
 *
 * @throws when the joint probability is not admissible; the message carries
 *         the reason, including which bound was broken.
 * @throws when pa or pb is not a finite probability in [0, 1].
 */
export function assertJointProbability(pa: number, pb: number, joint: number): number {
  const check = checkJointProbability(pa, pb, joint);
  if (!check.ok) {
    throw new Error(`assertJointProbability: ${check.reason ?? "joint probability is inadmissible"}`);
  }
  return joint;
}

/* ------------------------------------------------------------------ *
 * (d) SLOW 75% CONFORMAL KELLY SIZING
 * ------------------------------------------------------------------ */

/** The slow conformal window: 250 games, unweighted. */
export const SLOW_CONFORMAL_WINDOW_GAMES = 250;

/** The slow conformal coverage: 75%. */
export const SLOW_CONFORMAL_COVERAGE = 0.75;

/**
 * The slow conformal half-width over a trailing window of nonconformity
 * scores (absolute residuals).
 *
 * The window is a plain trailing slice and every score in it counts once:
 * the window is UNWEIGHTED. The level is the conformal rank of the window
 * at the requested coverage -- for 250 games at 75% that is the 189th
 * smallest of 250, i.e. ceil((250 + 1) * 0.75) -- so the half-width is the
 * order statistic the finite-sample guarantee is stated for.
 *
 * A rank beyond the size of the window is the infinite-quantile case; the
 * window maximum is used instead, which is the conservative reading.
 *
 * @throws when the score list is empty, when a score is not finite and
 *         non-negative, when the window is not an integer >= 1, or when the
 *         coverage is not in (0, 1).
 */
export function conformalHalfWidth(
  scores: readonly number[],
  window: number = SLOW_CONFORMAL_WINDOW_GAMES,
  coverage: number = SLOW_CONFORMAL_COVERAGE,
): number {
  if (!Array.isArray(scores) || scores.length === 0) {
    throw new Error("conformalHalfWidth: need at least one nonconformity score");
  }
  if (!Number.isInteger(window) || window < 1) {
    throw new Error(`conformalHalfWidth: window must be an integer >= 1, got ${String(window)}`);
  }
  if (!Number.isFinite(coverage) || coverage <= 0 || coverage >= 1) {
    throw new Error(`conformalHalfWidth: coverage must be a finite number in (0, 1), got ${String(coverage)}`);
  }
  const recent = scores.slice(Math.max(0, scores.length - window));
  for (const score of recent) {
    if (!Number.isFinite(score) || score < 0) {
      throw new Error(
        `conformalHalfWidth: every score must be a finite non-negative number, got ${String(score)}`,
      );
    }
  }
  const rank = conformalRank(recent.length, 1 - coverage);
  const sorted = [...recent].sort((a, b) => a - b);
  const value = sorted[Math.min(rank, sorted.length) - 1];
  if (value === undefined) {
    throw new Error("conformalHalfWidth: the conformal rank exceeds the available scores");
  }
  return value;
}

/**
 * The slow (unweighted) 250-game rolling 75% conformal half-width.
 *
 * This is the width that goes into the Kelly sizing rule of section (d).
 * It is deliberately slow: per Ryan (2026), arXiv:2608.01494, Table 1 &
 * Sec 6, a fast-adapting interval injects width variance into
 * f* = mu / sigma^2 and costs -1.4 to -3.3pp/yr of log-growth, so the slow
 * unweighted half-width is the width the sizing rule is allowed to see.
 *
 * @throws when the score list is empty or a score is not finite and
 *         non-negative.
 */
export function slowConformalHalfWidth(scores: readonly number[]): number {
  return conformalHalfWidth(scores, SLOW_CONFORMAL_WINDOW_GAMES, SLOW_CONFORMAL_COVERAGE);
}

/** The inputs of the section 5.2 stake equation. */
export interface ConformalKellySizing {
  /** lambda_kelly: the fractional Kelly multiplier. In [0, 1]. */
  readonly lambdaKelly: number;
  /** K_t: the Kelly scale (the capital the fraction is taken of). >= 0. */
  readonly k: number;
  /** b_t: the odds/stake scale. >= 0. */
  readonly b: number;
  /** p_t: the win probability. In [0, 1]. */
  readonly p: number;
  /** sigma_conf,t: the slow conformal half-width. >= 0. */
  readonly sigmaConf: number;
  /** kappa_sigma: the width-variance penalty coefficient. >= 0. */
  readonly kappaSigma: number;
  /** D_break,t: the one-sided downside break-rate dial. >= 0. */
  readonly dBreak: number;
  /** alpha_down: the downside allowance. > 0. */
  readonly alphaDown: number;
}

/** The decomposition of the section 5.2 stake equation. */
export interface ConformalKellySizingResult {
  /** f_stake,t: the section 5.2 equation, evaluated verbatim. */
  readonly fStake: number;
  /** The executable stake: max(0, fStake). */
  readonly stake: number;
  /** The upside term: lambda_kelly * K_t * b_t * p_t. */
  readonly upside: number;
  /** The downside term, throttled by the break-rate dial. */
  readonly downside: number;
  /** The throttle factor max(0, 1 - max(0, D_break - alpha_down) / alpha_down). */
  readonly throttle: number;
}

/**
 * The downside throttle: max(0, 1 - max(0, D_break - alpha_down) / alpha_down).
 *
 * The factor is 1 while the break rate is inside the allowance, falls
 * linearly as the break rate pushes past it, and is 0 once the break rate
 * has run a full allowance beyond the allowance.
 *
 * @throws when dBreak is not finite and >= 0, or alphaDown is not finite
 *         and > 0.
 */
export function downsideThrottle(dBreak: number, alphaDown: number): number {
  if (!Number.isFinite(dBreak) || dBreak < 0) {
    throw new Error(`downsideThrottle: dBreak must be a finite number >= 0, got ${String(dBreak)}`);
  }
  if (!Number.isFinite(alphaDown) || alphaDown <= 0) {
    throw new Error(`downsideThrottle: alphaDown must be a finite number > 0, got ${String(alphaDown)}`);
  }
  return Math.max(0, 1 - Math.max(0, dBreak - alphaDown) / alphaDown);
}

/**
 * The slow 75% conformal Kelly stake -- the goal spec's section 5.2
 * equation, evaluated verbatim:
 *
 *   f_stake,t = lambda_kelly * K_t * b_t * p_t
 *                - (1 - p_t) * b_t * (1 + kappa_sigma * sigma_conf,t^2)
 *                  * max(0, 1 - max(0, D_break,t - alpha_down) / alpha_down)
 *
 * `fStake` is that equation. `stake` is max(0, fStake): a negative stake is
 * not executable, so the executable stake is floored at zero while the raw
 * value stays visible for audit.
 *
 * @throws when any input is outside its documented domain.
 */
export function conformalKellyStake(input: ConformalKellySizing): ConformalKellySizingResult {
  const { lambdaKelly, k, b, p, sigmaConf, kappaSigma, dBreak, alphaDown } = input;
  if (!Number.isFinite(lambdaKelly) || lambdaKelly < 0 || lambdaKelly > 1) {
    throw new Error(
      `conformalKellyStake: lambdaKelly must be a finite number in [0, 1], got ${String(lambdaKelly)}`,
    );
  }
  if (!Number.isFinite(k) || k < 0) {
    throw new Error(`conformalKellyStake: K must be a finite number >= 0, got ${String(k)}`);
  }
  if (!Number.isFinite(b) || b < 0) {
    throw new Error(`conformalKellyStake: b must be a finite number >= 0, got ${String(b)}`);
  }
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error(`conformalKellyStake: p must be a finite number in [0, 1], got ${String(p)}`);
  }
  if (!Number.isFinite(sigmaConf) || sigmaConf < 0) {
    throw new Error(
      `conformalKellyStake: sigmaConf must be a finite number >= 0, got ${String(sigmaConf)}`,
    );
  }
  if (!Number.isFinite(kappaSigma) || kappaSigma < 0) {
    throw new Error(
      `conformalKellyStake: kappaSigma must be a finite number >= 0, got ${String(kappaSigma)}`,
    );
  }
  const throttle = downsideThrottle(dBreak, alphaDown);
  const upside = lambdaKelly * k * b * p;
  const downside = (1 - p) * b * (1 + kappaSigma * sigmaConf * sigmaConf) * throttle;
  const fStake = upside - downside;
  return { fStake, stake: Math.max(0, fStake), upside, downside, throttle };
}

/** The inputs of slowConformalKellyStake: the section 5.2 inputs plus the residual history. */
export interface SlowConformalKellySizing extends Omit<ConformalKellySizing, "sigmaConf"> {
  /** The trailing absolute residuals the slow half-width is built from. */
  readonly absoluteResiduals: readonly number[];
  /** The slow window in games. Defaults to SLOW_CONFORMAL_WINDOW_GAMES. */
  readonly window?: number;
  /** The conformal coverage. Defaults to SLOW_CONFORMAL_COVERAGE. */
  readonly coverage?: number;
}

/**
 * The slow 75% conformal Kelly stake, with the width built from the trailing
 * residual history instead of being supplied.
 *
 * The width is the SLOW (unweighted) rolling conformal half-width, so the
 * whole chain -- residuals, conformal rank, half-width, section 5.2
 * equation -- is exercised by one call.
 *
 * @throws when the residual history is empty, when a residual is not finite
 *         and non-negative, or when any other input is outside its domain.
 */
export function slowConformalKellyStake(input: SlowConformalKellySizing): ConformalKellySizingResult {
  const { absoluteResiduals, window, coverage, ...rest } = input;
  const sigmaConf = conformalHalfWidth(
    absoluteResiduals,
    window ?? SLOW_CONFORMAL_WINDOW_GAMES,
    coverage ?? SLOW_CONFORMAL_COVERAGE,
  );
  return conformalKellyStake({ ...rest, sigmaConf });
}

/* ------------------------------------------------------------------ *
 * shared validation
 * ------------------------------------------------------------------ */

/** Throw unless the named argument is a finite probability in [0, 1]. */
function assertProbability(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a finite number in [0, 1], got ${String(value)}`);
  }
}
