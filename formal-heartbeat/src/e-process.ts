/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch (Decision-A-independent pieces).
 * NOT wired into production. No side effects, no I/O, no DB, no alerts.
 * Pure statistics.
 * ============================================================================
 *
 * Sequential-confidence / e-process kernel.
 *
 * This is a genuine e-process (a.k.a. test supermartingale / e-value process)
 * for ANYTIME-VALID sequential testing of a one-sided Bernoulli-rate null.
 * It is the honest mathematical core that the Formal Heartbeat (heartbeat.ts)
 * uses to accumulate evidence: each detected invariant violation is a
 * Bernoulli observation, and the e-process turns a stream of such observations
 * into an anytime-valid decision without any fixed sample-size assumption.
 *
 * -------------------------------------------------------------------------
 * SOURCE CONSTRUCTION (checkable):
 *   Ramdas, Grunwald, Vovk, Shafer, "Game-theoretic statistics and safe
 *   anytime-valid inference" (Statistical Science, 2023); Shafer, "Testing
 *   by betting" (JRSS-A, 2021); Waudby-Smith & Ramdas, "Estimating means of
 *   bounded random variables by betting" (JRSS-B, 2024). The multiplicative
 *   "testing-by-betting" supermartingale used here is Equation-1-style from
 *   those works.
 *
 *   TERMINOLOGY NOTE (per this repo's terminology discipline and
 *   COMPLIANCE_AND_RESPONSIBLE_GAMING.md section 1 — "GSE is a paid
 *   sports-analytics/content subscription; it does not accept wagers, hold
 *   customer funds, or settle bets"): the statistics literature names this
 *   construction "testing by betting". That is a formal game-theoretic-
 *   statistics term of art referring to a nonnegative martingale, and it is
 *   cited here ONLY for source-attribution/contrast. It has nothing to do
 *   with customer wagering. Throughout this module the neutral vocabulary
 *   "e-process / wealth / evidence factor / null rate" is used instead.
 * -------------------------------------------------------------------------
 *
 * NULL HYPOTHESIS THIS CONTROLS (stated exactly):
 *   Let X_1, X_2, ... in {0, 1} be the observation stream (1 = event of
 *   interest occurred at step t, e.g. an invariant violation; 0 = clean).
 *   H0:  the X_t are drawn such that, conditional on the past, the
 *        probability of a 1 is at most `nullRate` p0, i.e.
 *        E[X_t | X_1..X_{t-1}] <= p0  for every t.
 *   H1 (what we gain power against): that conditional rate exceeds p0.
 *   The one-sided test REJECTS H0 the first time the e-process wealth
 *   E_t >= 1/alpha.
 *
 * WHY IT IS A VALID E-PROCESS (proof sketch, verified empirically in tests):
 *   Wealth: E_0 = 1, E_t = E_{t-1} * g(X_t), with evidence factor
 *       g(x) = 1 + lambda * (x - p0),   lambda in (0, 1/p0].
 *   (1) NONNEGATIVE: worst case x = 0 gives g = 1 - lambda*p0 >= 0 for
 *       lambda <= 1/p0; x = 1 gives g = 1 + lambda*(1-p0) > 0. So E_t >= 0.
 *   (2) SUPERMARTINGALE UNDER H0: since lambda >= 0 and E[X_t|past] <= p0,
 *       E[g(X_t) | past] = 1 + lambda*(E[X_t|past] - p0) <= 1, hence
 *       E[E_t | past] <= E_{t-1}. With E_0 = 1, E[E_t] <= 1 for all t.
 *   (3) ANYTIME-VALID (Ville's inequality): for any nonnegative
 *       supermartingale with E_0 = 1,
 *          P( sup_{t>=0} E_t >= 1/alpha )  <=  alpha.
 *       Rejecting at the boundary E_t >= 1/alpha therefore has type-I error
 *       at most alpha, SIMULTANEOUSLY over all stopping times / sample sizes
 *       (the "anytime-valid" guarantee — you may peek after every
 *       observation and stop whenever you like).
 *
 * DEFAULT lambda:
 *   lambda = 1 is always admissible (1 <= 1/p0 for any p0 in (0,1]) and, for
 *   x = 0, gives g = 1 - p0 > 0, so wealth is never absorbed at exactly 0 —
 *   the process can always recover, and can always eventually reject given
 *   enough 1s. At the boundary rate p = p0 it is a tight MARTINGALE (fair
 *   game, no false drift), which is exactly the worst case for type-I error.
 *
 * Numerics: wealth is tracked in the log domain (`logWealth`) so long streams
 * neither underflow nor overflow. The reject boundary log E_t >= log(1/alpha)
 * = -log(alpha) is compared in the log domain too.
 */

export interface EProcessConfig {
  /** Null one-sided rate p0 in (0, 1). */
  readonly nullRate: number;
  /** Significance level alpha in (0, 1); reject boundary is wealth >= 1/alpha. */
  readonly alpha: number;
  /**
   * Evidence weight lambda in (0, 1/p0]. Defaults to 1 (always admissible;
   * see module docstring). Larger lambda = more aggressive evidence
   * accumulation but higher variance; lambda = 1/p0 makes a single clean
   * observation absorb wealth to 0 and is discouraged.
   */
  readonly lambda: number;
}

export interface EProcessState {
  /** Natural log of the wealth E_t. Starts at 0 (E_0 = 1). */
  readonly logWealth: number;
  /** Number of observations processed so far. */
  readonly count: number;
  /** Running count of 1-observations (events of interest) seen. */
  readonly eventCount: number;
  /**
   * Max logWealth ever attained over the whole path (running supremum).
   * Because the reject decision is a running-supremum crossing (Ville is a
   * statement about sup_t E_t), a stream that crossed the boundary and later
   * fell back below it has still rejected — `peakLogWealth` records that.
   */
  readonly peakLogWealth: number;
}

export type Observation = 0 | 1;

const DEFAULT_LAMBDA = 1;

/** Build and validate a config; fills lambda with the admissible default 1. */
export function makeEProcessConfig(input: {
  nullRate: number;
  alpha: number;
  lambda?: number;
}): EProcessConfig {
  const { nullRate, alpha } = input;
  if (!(nullRate > 0 && nullRate < 1)) {
    throw new RangeError(`nullRate must be in (0,1), got ${nullRate}`);
  }
  if (!(alpha > 0 && alpha < 1)) {
    throw new RangeError(`alpha must be in (0,1), got ${alpha}`);
  }
  const lambda = input.lambda ?? DEFAULT_LAMBDA;
  if (!(lambda > 0 && lambda <= 1 / nullRate)) {
    throw new RangeError(
      `lambda must be in (0, 1/nullRate] = (0, ${1 / nullRate}], got ${lambda}`,
    );
  }
  return { nullRate, alpha, lambda };
}

/** Initial state E_0 = 1 (logWealth 0). */
export function initEProcess(): EProcessState {
  return { logWealth: 0, count: 0, eventCount: 0, peakLogWealth: 0 };
}

/**
 * The evidence factor g(x) = 1 + lambda*(x - p0) for one observation.
 * Nonnegative for lambda in (0, 1/p0]. Exported for testability.
 */
export function evidenceFactor(config: EProcessConfig, x: Observation): number {
  return 1 + config.lambda * (x - config.nullRate);
}

/**
 * Pure incremental update: multiply wealth by the evidence factor for one
 * observation. Returns a NEW state (no mutation).
 */
export function updateEProcess(
  config: EProcessConfig,
  state: EProcessState,
  x: Observation,
): EProcessState {
  const factor = evidenceFactor(config, x);
  // factor >= 0 by construction; log(0) = -Infinity is the legitimate
  // "wealth absorbed" state (only reachable at the discouraged lambda = 1/p0).
  const nextLogWealth = state.logWealth + Math.log(factor);
  return {
    logWealth: nextLogWealth,
    count: state.count + 1,
    eventCount: state.eventCount + x,
    peakLogWealth: Math.max(state.peakLogWealth, nextLogWealth),
  };
}

/** Fold a whole sequence of observations through the e-process. */
export function runEProcess(
  config: EProcessConfig,
  observations: readonly Observation[],
  from: EProcessState = initEProcess(),
): EProcessState {
  let state = from;
  for (const x of observations) {
    state = updateEProcess(config, state, x);
  }
  return state;
}

/** The reject boundary in the log domain: log(1/alpha) = -log(alpha). */
export function logRejectBoundary(config: EProcessConfig): number {
  return -Math.log(config.alpha);
}

/**
 * Anytime-valid reject decision. TRUE iff the wealth EVER reached the
 * boundary 1/alpha (running supremum crossing) — this is the honest
 * Ville-inequality decision, robust to the wealth later dropping back.
 */
export function hasRejected(config: EProcessConfig, state: EProcessState): boolean {
  return state.peakLogWealth >= logRejectBoundary(config);
}

/** Current wealth E_t = exp(logWealth) (may overflow to +Infinity — that is fine). */
export function wealth(state: EProcessState): number {
  return Math.exp(state.logWealth);
}
