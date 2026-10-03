/**
 * Forecast-skill E-process — anytime-valid sequential evidence that OUR
 * probabilities explain realised outcomes BETTER THAN THE MARKET'S. Immune to
 * optional stopping and to the look-elsewhere effect; no multiple-testing
 * correction needed.
 *
 * WHY THIS IS NOT A DUPLICATE OF anytime-ledger.ts. That module tests
 * PROFITABILITY — its null is "true mean per-bet RETURN <= nullMean", so it
 * needs stake sizing, an odds model, and a bounded-return licensing argument.
 * This module tests FORECAST SKILL — its null is "our probability forecasts are
 * no better than the market's at explaining realised outcomes". No stakes, no
 * odds, no bankroll: it speaks directly to the resolution/calibration content of
 * the forecasts, which is what the PROVEN rung of the pricing ladder actually
 * turns on. The two answer DIFFERENT questions and are allowed to disagree —
 * skill without profit (the vig eats the edge) and profit without skill
 * (variance, or a stake schedule that got lucky) are both real states of the
 * world. Report them as two instruments, never as one number.
 * calibration-sequence.ts is the third sibling: it tests our probabilities
 * against THEMSELVES ("are the stated numbers honest?") and takes no market
 * input at all. Skill-vs-market, profit, and self-honesty are three separate
 * claims; this file owns exactly the first.
 *
 * ── THE MATH (first principles, nothing load-bearing taken on faith) ─────────
 *
 * H0 (the null being tested): the realised outcomes are drawn from the MARKET's
 * distribution — y_t | F_{t-1} ~ Bernoulli(m_t), where m_t is the market-implied
 * probability of the event and F_{t-1} is everything known before pick t
 * settles. Under H0 we have no skill the market does not already have.
 *
 * The test statistic is the sequential likelihood ratio (our model's likelihood
 * of what actually happened, over the market's):
 *
 *     E_t = p_t / m_t            if y_t = 1
 *     E_t = (1 - p_t)/(1 - m_t)  if y_t = 0
 *     M_T = prod_{t<=T} E_t,      M_0 = 1
 *
 * E_t has conditional expectation EXACTLY 1 under H0 — not <= 1, exactly 1:
 *
 *     E[E_t | F_{t-1}] = m_t * (p_t/m_t) + (1-m_t) * ((1-p_t)/(1-m_t))
 *                     = p_t + (1 - p_t) = 1.
 *
 * The only thing that argument uses is that p_t is PREDICTABLE (fixed before
 * y_t is revealed) and that y_t ~ Bernoulli(m_t). (As implemented the identity
 * is exact whenever the supplied m_t lies inside the clamp band
 * [floor, 1-floor], and degrades to <= 1 — the SAFE direction — outside it; the
 * derivation is in mitigation (2) below, and the suite pins both halves
 * exactly rather than by simulation.) So M_T is a nonnegative
 * (super)MARTINGALE with M_0 = 1, and Ville's inequality (Ville 1939;
 * Ramdas–Grünwald–Vovk–Shafer anytime-valid e-processes) gives
 *
 *     P( exists T : M_T >= 1/alpha ) <= alpha
 *
 * for EVERY stopping rule — including an adversary who recomputes after every
 * settled pick and stops at the most flattering moment. That inequality IS the
 * anytime-validity, and it is why 1/max_t M_t is an honest anytime-valid
 * p-value that needs no correction for how often it was looked at.
 *
 * THE RUNNING MAXIMUM IS THE STATISTIC, NOT THE FINAL VALUE. Ville bounds the
 * SUPREMUM of the path. A crossing at pick 87 is a valid alpha-level rejection
 * even if M has since drifted back below the threshold — the licence was spent
 * at the crossing. So `rejectsAt` / `verdict` are driven by `maxLogM`, and
 * `logM` is reported alongside as the CURRENT state of the evidence, not as the
 * test. (Reporting only the final value would be strictly conservative, i.e.
 * safe but weaker; reporting the max and pretending it was a fixed-n test would
 * be the dishonest direction, which Ville is exactly what licenses us out of.)
 *
 * ── THE NAIVE VERSION IS BROKEN. FOUR MITIGATIONS, ALL LOAD-BEARING ──────────
 *
 * (0) THE DEFECT: ABSORBING ZERO. The raw product has a one-shot death mode. A
 *     single confident-and-wrong forecast (p_t -> 0 on an event that happens)
 *     drives one factor to ~0, and the product is then permanently dead: it is
 *     a product, so no amount of subsequent skill can ever climb back. One bad
 *     pick would silently retire the instrument for the life of the ledger, and
 *     the failure is invisible — logM just sits there. The naive version also
 *     has unbounded variance when m_t is extreme (a longshot factor 1/m_t can
 *     be enormous), which wrecks the Monte-Carlo behaviour of the mean-1
 *     property even where it is formally true.
 *
 * (1) SHRINKAGE (the fix). Mix our forecast toward the market before scoring:
 *
 *         p~_t = (1 - eps) * p_t + eps * m_t,   eps small (default 0.05)
 *
 *     Then every factor is bounded BELOW by eps > 0, in both branches:
 *       y=1: E = p~/m >= (eps*m)/m = eps        (since (1-eps)*p >= 0)
 *       y=0: E = (1-p~)/(1-m) >= (eps*(1-m))/(1-m) = eps
 *     so ln E_t >= ln(eps) — with the default, a catastrophic pick costs at most
 *     ln(1/0.05) = 3.0 nats and is fully recoverable by ~17 picks earning 0.18
 *     nats each. The process can be knocked down but never killed. (Exposed as
 *     `worstCaseLogFactorPerPick`; the invariant is asserted in the suite.)
 *
 *     WHY VALIDITY SURVIVES SHRINKAGE — the key argument, stated exactly. The
 *     mean-1 identity above never used any property of p_t beyond
 *     PREDICTABILITY: for ANY F_{t-1}-measurable q_t in [0,1],
 *         E[ q_t/m_t * 1{y=1} + (1-q_t)/(1-m_t) * 1{y=0} | F_{t-1} ] = 1
 *     under H0, because the m_t and (1-m_t) weights cancel the denominators
 *     identically. p~_t is a fixed deterministic function of (p_t, m_t), both
 *     of which are known BEFORE y_t is revealed, so p~_t is F_{t-1}-measurable
 *     — it is a perfectly legitimate forecast in its own right, just a
 *     more timid one. Substituting q_t = p~_t therefore preserves E[E_t|F]=1
 *     exactly, M stays a martingale, and Ville still applies with the SAME
 *     alpha. Shrinkage costs POWER (evidence accrues more slowly, because a
 *     timid forecaster earns less per pick), never validity — the same shape of
 *     argument as anytime-ledger.ts's "validity does not depend on the betting
 *     schedule". eps therefore needs no tuning and CANNOT be tuned into a false
 *     positive: every value in [0, 0.5] buys exactly the same alpha, so the
 *     choice is a power/robustness trade-off with no honesty content at all.
 *
 * (2) CLAMPING — and the ONE place the identity is not exact. Both p and m are
 *     clamped into [floor, 1-floor] (floor default 1e-6) before anything else,
 *     so log(0) and division by zero are structurally impossible even when a
 *     caller hands us a 0 or a 1.
 *
 *     Clamping p is free, by the paragraph above: the identity holds for ANY
 *     predictable forecast and clamp(p) is one. Clamping m is NOT free and must
 *     not be waved through in the same sentence — m sits in the DENOMINATOR,
 *     i.e. it IS the null measure the identity cancels against, and replacing it
 *     with m^ = clamp(m) breaks that cancellation whenever m^ != m. The honest
 *     derivation, which is what actually licenses the module:
 *
 *         f(p~) := m * (p~/m^) + (1-m) * ((1-p~)/(1-m^))   [TRUE m, CLAMPED m^]
 *
 *     is LINEAR in p~ with f(m^) = m + (1-m) = 1 for any m^, and slope
 *     m/m^ - (1-m)/(1-m^). Three exhaustive cases:
 *       - m in [floor, 1-floor]: m^ = m, slope 0, so f == 1 EXACTLY (martingale);
 *       - m < floor: m^ = floor > m, so m/m^ < 1 < (1-m)/(1-m^) and the slope is
 *         NEGATIVE, while the clamp forces p~ >= floor = m^ — hence f(p~) <= 1;
 *       - m > 1-floor: m^ = 1-floor < m, slope POSITIVE, and p~ <= 1-floor = m^
 *         — hence f(p~) <= 1 again.
 *     So E[E_t | F_{t-1}] <= 1 always: M is a nonnegative SUPERmartingale, which
 *     is everything Ville needs, and the only departure from equality is in the
 *     CONSERVATIVE direction (it can make the test reject less often, never
 *     more). Both halves — exact equality inside the band, strict inequality
 *     outside it — are asserted directly to 1e-12 in the suite, not inferred
 *     from a Monte-Carlo average.
 *
 * (3) LOG-SPACE ACCUMULATION. We accumulate sum of ln E_t, never the raw
 *     product: over thousands of picks the product overflows or underflows to
 *     0/Infinity long before the log sum loses a digit. `m` is reported as a
 *     SATURATING exp (capped at Number.MAX_VALUE) so a huge-evidence ledger
 *     renders as a giant finite number rather than Infinity, while `logM` stays
 *     the number any downstream math should use.
 *
 * (4) GROWTH RATE PER PICK. logM/n (nats) and logM/(n*ln2) (bits) are the
 *     interpretable "evidence per pick" quantities, and unlike M itself they are
 *     comparable across sample sizes: 0.02 nats/pick over 2000 picks and over
 *     50 picks describe the same forecaster, whereas their M values differ by
 *     ~17 orders of magnitude. This is the number to put in front of a human.
 *
 * ── HONEST SCOPE: WHAT A HIGH M DOES *NOT* MEAN ─────────────────────────────
 *
 *  - It is evidence of skill VERSUS THE SUPPLIED MARKET PROBABILITIES ONLY. It
 *    is NOT evidence of profitability: there is no vig, no odds, no stake and no
 *    settlement model anywhere in this file. Beating the market's probabilities
 *    by less than the hold is a losing business and this statistic cannot tell
 *    the difference. Profit questions go to anytime-ledger.ts / clv.ts.
 *  - It is NOT a licence to claim PROVEN. PROVEN is a product gate (>= 100
 *    settled picks AND published calibration); this is one input to that
 *    conversation, not the conversation.
 *  - It is a comparison against ONE benchmark. "Better than this book's number
 *    on this slice of picks" is not "better than the market", and it is not
 *    "calibrated" either — a forecaster can beat the market's likelihood while
 *    still being miscalibrated (that is what calibration-sequence.ts and
 *    probability-calibration.ts are for).
 *
 * DE-VIGGED INPUTS ARE REQUIRED — and what happens if you ignore that. Raw
 * bookmaker odds imply probabilities that sum to more than 1 across outcomes;
 * the excess is the hold. A vig-inclusive m for the side we took is therefore
 * SYSTEMATICALLY TOO HIGH relative to the true market probability, which makes
 * the denominator of our y=1 factors too large... and, more importantly, makes
 * the whole H0 easier to beat on the y=0 side, because the market is being
 * scored with a number it does not actually believe. Net effect: the test is
 * BIASED IN OUR FAVOUR — M drifts up on a forecaster with no skill at all, and
 * the alpha bound no longer holds. Callers MUST pass de-vigged probabilities (see
 * shin-devig.ts). We cannot detect this per-pick, so the result carries a
 * crude population-level tripwire instead (`vigWarning`): if the mean market
 * probability exceeds the realised base rate by more than ~2 standard errors,
 * that is CONSISTENT WITH vig-inclusive inputs — though it is equally
 * consistent with a genuine edge on this slice, and the tripwire cannot tell
 * those apart. It is a prompt to go check the inputs, not a finding.
 *
 * ORDER AND INDEPENDENCE. This is a sequential statistic: pass points in
 * settlement order, never shuffled, never from a query without ORDER BY. The
 * martingale step needs y_t | F_{t-1} ~ Bernoulli(m_t) GIVEN THE PAST, so
 * multiple markets on ONE game (spread/total/moneyline) structurally break it —
 * once the first has settled, the second's conditional mean is no longer its
 * marginal m_t (in the perfectly-correlated case it is already determined).
 * This kernel's inflation under correlation has NOT been measured (do not
 * borrow the siblings' numbers as if they were ours); what is measured is that
 * the two closest twins in this package inflate ~2x (anytime-ledger.ts) to ~5x
 * (calibration-sequence.ts) the alpha budget under strong same-game clustering.
 * Treat ONE PICK PER GAME as required input discipline for any published claim.
 *
 * THE CLAIMS ABOVE ARE MEASURED, NOT MERELY ASSERTED (seeded, so these are
 * fixed numbers the suite pins, not dice):
 *  - THE CONDITIONAL identity E[E_t | F_{t-1}] = 1, checked EXACTLY (to 1e-12)
 *    on a deterministic grid of (p, m, eps, floor) rather than by averaging:
 *    m*E(y=1) + (1-m)*E(y=0) = 1 at every grid point inside the clamp band, and
 *    <= 1 outside it. This is the load-bearing test. A Monte-Carlo mean of M
 *    alone CANNOT stand in for it: a conditional violation whose sign flips with
 *    (m - 1/2) — e.g. scoring y=1 with the y=0 branch — averages to exactly 1
 *    under a symmetric generator and slips through every simulation below. That
 *    escape was demonstrated by mutation, which is why the exact test exists.
 *  - Mean of the final M over 5000 independent H0 ledgers (50 picks each):
 *    1.0091 at eps = 0.05 and 1.0099 at eps = 0, against the theoretical 1 —
 *    both inside one standard error. Corroboration of the identity above under
 *    a realistic path, and the empirical half of "validity survives shrinkage".
 *  - Ville false-rejection rate over 1500 H0 ledgers (400 picks each, a
 *    confidently-wrong-by-0.12 forecaster): 0.0453 at threshold 20 against the
 *    0.05 budget, and 0.0067 at threshold 100 against the 0.01 budget, with
 *    33.6% of runs wandering above M = e. The bound is nearly ATTAINED rather
 *    than merely respected, which is the strongest available evidence that the
 *    bound is not holding by accident of a process that simply never moves.
 *    (Why "nearly" and not "exactly": for a nonnegative martingale that drifts
 *    to 0 — which this one does under H0, since E[ln E_t] = -KL < 0 whenever
 *    p != m — P(sup M >= a) approaches 1/a from BELOW as the horizon grows, the
 *    shortfall being the discrete overshoot past the threshold. 0.0453 < 0.05
 *    is that shortfall, not slack in the theorem.)
 *  - The running maximum is verified against an INDEPENDENT oracle (max over
 *    per-prefix logM, recomputed outside the fold), including the case where the
 *    maximum lands on the final pick — an off-by-one there would silently
 *    understate the very supremum Ville bounds.
 *  - Power: outcomes drawn from p = 0.68 against a market of 0.50 cross the
 *    threshold on 20/20 seeds within 600 picks, so the test is not valid merely
 *    by never rejecting.
 *
 * DETERMINISM — STRONGER THAN SEEDED. No RNG, no clock, no env, no I/O: the
 * whole result is a closed-form function of the ordered points. Any two parties
 * recompute bit-identical numbers from the sealed ledger.
 *
 * BATCH AND FOLD CANNOT DIVERGE. `forecastSkillEProcess` is literally
 * init + fold-each + summarize, so the streaming trajectory IS the batch
 * trajectory by construction rather than by parallel implementation (and the
 * exact equality is additionally pinned in the suite).
 *
 * References:
 *   - Ville, J. (1939). Étude critique de la notion de collectif. Gauthier-Villars.
 *     (P(sup M ≥ 1/α) ≤ α for a nonnegative supermartingale with M_0 = 1)
 *   - Wald, A. (1947). Sequential Analysis. (sequential likelihood ratio)
 *   - Ramdas, A., Ruf, J., Larsson, M. & Koolen, W. (2020). "Admissible anytime-valid sequential inference via supermartingales."
 *   - Ramdas, A., Grünwald, P., Vovk, V. & Shafer, G. (2023). "Game-theoretic statistics and safe anytime-valid inference." Statistical Science 38(4).
 *   - Waudby-Smith, I. & Ramdas, A. (2024). "Estimating means of bounded random variables by betting." J. R. Statist. Soc. B 86(1).
 *   - Shafer, G. & Vovk, V. (2019). Game-Theoretic Foundations for Probability and Finance.
 */

import type { CalibrationSample } from "./probability-calibration.js";

/**
 * One settled pick: a `CalibrationSample` (our forecast + realised outcome) plus
 * the market's probability for the SAME event, so the two can be scored head to
 * head on the same realised y.
 */
export interface ForecastSkillPoint extends CalibrationSample {
  /**
   * DE-VIGGED market-implied probability of the same event, in [0,1] (values at
   * the endpoints are clamped). Vig-inclusive inputs bias the test in our
   * favour — see the header. Must be frozen BEFORE the outcome is known.
   */
  readonly m: number;
}

export interface ForecastSkillOptions {
  /**
   * Significance level; sets the default threshold to 1/alpha. Default 0.05
   * (=> M >= 20). NOTE: when `evidenceThreshold` is also supplied it WINS, and
   * the level Ville then actually delivers is 1/evidenceThreshold, not this
   * number. Quote `deliveredAlpha` from the result, never this field.
   */
  readonly alpha?: number;
  /**
   * Explicit evidence threshold on M, overriding 1/alpha. The platform's very
   * conservative convention is 100 (= alpha 0.01) — pass
   * `CONSERVATIVE_EVIDENCE_THRESHOLD`. Must be > 1 (M starts at 1, so a
   * threshold <= 1 would "reject" before seeing any data).
   */
  readonly evidenceThreshold?: number;
  /**
   * Shrinkage toward the market, in [0, 0.5]. Default 0.05. Bounds every factor
   * below by eps and so removes the absorbing-zero failure mode. eps = 0 is the
   * naive, absorbing-zero-prone process — permitted only so the suite can
   * demonstrate the contrast; do not run it in production.
   */
  readonly epsilon?: number;
  /** Probability clamp, in (0, 0.5). Default 1e-6. Makes log(0)/div-by-0 impossible. */
  readonly floor?: number;
  /**
   * Minimum settled picks before ANY verdict other than "insufficient" is
   * reported. Default 30. This is a PRODUCT floor, not a statistical
   * requirement — Ville is valid at every n — so it can only ever withhold a
   * claim, never manufacture one.
   */
  readonly minPicks?: number;
}

export type ForecastSkillVerdict =
  /** Below `minPicks` (or no data): no verdict is available. Never "proven". */
  | "insufficient"
  /** Enough picks, threshold never crossed: H0 stands. Say nothing. */
  | "no-evidence"
  /** Threshold crossed at some point: an alpha-level rejection of H0. Scope-limited — see header. */
  | "evidence-of-skill-vs-market";

export interface ForecastSkillResult {
  // ---- configuration echoed back (so a stored result is self-describing) ----
  /**
   * The CONFIGURED alpha, echoed verbatim. This is NOT necessarily the level
   * being tested at: `evidenceThreshold` overrides it. Report
   * `deliveredAlpha`; publishing this field alongside an overriding threshold
   * is how a stored result turns into an overclaim.
   */
  readonly alpha: number;
  /** Threshold on M that constitutes rejection (1/alpha unless overridden). */
  readonly threshold: number;
  /**
   * The level Ville ACTUALLY delivers for this configuration: 1/threshold.
   * Equal to `alpha` in the default case; strictly the number to quote when
   * `evidenceThreshold` was supplied (which can be either tighter OR looser than
   * the configured alpha — the API does not stop a caller asking for a looser
   * threshold while naming a small alpha, so the honest level is derived here).
   */
  readonly deliveredAlpha: number;
  readonly epsilon: number;
  readonly floor: number;
  readonly minPicks: number;

  // ---- the evidence ----
  readonly n: number;
  /** sum of ln E_t — the numerically stable state; use THIS for downstream math. */
  readonly logM: number;
  /** exp(logM), SATURATING at Number.MAX_VALUE instead of overflowing to Infinity. */
  readonly m: number;
  /** Running max of logM over the path — the quantity Ville actually bounds. */
  readonly maxLogM: number;
  /** exp(maxLogM), saturating. */
  readonly maxM: number;
  /** ln E per pick (nats). 0 when n = 0. Comparable across sample sizes. */
  readonly growthRatePerPick: number;
  /** The same quantity in bits per pick. */
  readonly growthRateBitsPerPick: number;
  /**
   * Anytime-valid p-value min(1, 1/max_t M_t). Valid under continuous
   * monitoring; needs no correction for how many times it was looked at.
   * Floored at Number.MIN_VALUE: a huge maxLogM underflows exp() to literal 0,
   * and "p = 0" asserts impossibility, which is never something a finite ledger
   * earns. MIN_VALUE is still a true UPPER bound on 1/max M there, so the
   * bound stays in the safe direction.
   */
  readonly anytimeValidPValue: number;

  // ---- the verdict ----
  /** The threshold the RUNNING MAXIMUM crossed (e.g. 20), or null if never crossed. */
  readonly rejectsAt: number | null;
  /** 1-indexed pick at which the threshold was first crossed, or null. */
  readonly firstCrossedAtPick: number | null;
  /** n >= minPicks — whether a verdict beyond "insufficient" is even permitted. */
  readonly eligible: boolean;
  readonly verdict: ForecastSkillVerdict;

  // ---- diagnostics (not tests) ----
  readonly ourMeanProbability: number;
  readonly marketMeanProbability: number;
  readonly realisedRate: number;
  /**
   * Heuristic screen ONLY, no alpha-level meaning: mean market probability
   * exceeds the realised base rate by > 2 standard errors, which is consistent
   * with vig-inclusive inputs (and equally consistent with a real edge on this
   * slice — it cannot tell them apart). Prompts an input audit, proves nothing.
   */
  readonly vigWarning: boolean;
  /**
   * A LOWER BOUND on ln of the single-pick factor given (epsilon, floor) — the
   * concrete quantification of the absorbing-zero fix: no single pick can cost
   * more than this many nats, so every drawdown is recoverable. It is a bound,
   * not the exact attained minimum: the true minimum is
   * ln(epsilon + (1-epsilon)*floor/(1-floor)), a hair above this. The gap is
   * float dust and the bound errs pessimistic, which is the safe direction for a
   * "worst case" number.
   */
  readonly worstCaseLogFactorPerPick: number;
  /** Plain-English, deliberately un-flattering summary for operators/UI. */
  readonly operatorHint: string;
}

export const DEFAULT_FORECAST_SKILL_ALPHA = 0.05;
export const DEFAULT_FORECAST_SKILL_EPSILON = 0.05;
export const DEFAULT_FORECAST_SKILL_FLOOR = 1e-6;
export const DEFAULT_FORECAST_SKILL_MIN_PICKS = 30;
/** Conservative Ville threshold: M >= 100, i.e. delivered alpha = 0.01. */
export const CONSERVATIVE_EVIDENCE_THRESHOLD = 100;

function clampTo(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * THE shared single-pick stepper — the one place the likelihood ratio is
 * computed. Both the batch entry point and the fold route through it (the batch
 * function IS the fold), so the two can never diverge.
 *
 * Returns ln E_t for the shrunk-and-clamped forecast. Predictability holds by
 * construction: every input is frozen before y_t is read, and y_t only selects
 * which branch is taken.
 */
function logFactor(point: ForecastSkillPoint, epsilon: number, floor: number): number {
  const hi = 1 - floor;
  const mHat = clampTo(point.m, floor, hi);
  const pHat = clampTo(point.p, floor, hi);
  // Shrink toward the market. A convex combination of two values in
  // [floor, 1-floor] is already in [floor, 1-floor]; the re-clamp is float dust
  // insurance only.
  const pShrunk = clampTo((1 - epsilon) * pHat + epsilon * mHat, floor, hi);
  return point.y === 1
    ? Math.log(pShrunk) - Math.log(mHat)
    : Math.log(1 - pShrunk) - Math.log(1 - mHat);
}

/** exp with a saturating cap so huge evidence renders finite instead of Infinity. */
function saturatingExp(logValue: number): number {
  return Math.min(Math.exp(logValue), Number.MAX_VALUE);
}

// ============================================================
// Incremental fold — explicit immutable state, O(1) per pick
// ============================================================

/**
 * Streaming state for the forecast-skill E-process. Immutable: every fold
 * returns a NEW state and never mutates its input, so a caller can keep and
 * replay historical states (e.g. to render the evidence path) for free.
 *
 * The state is fully self-describing — it carries its own configuration — so a
 * persisted state can be resumed without re-supplying options and can be
 * audited without reference to the call site that created it.
 */
export interface ForecastSkillFoldState {
  readonly alpha: number;
  readonly threshold: number;
  readonly epsilon: number;
  readonly floor: number;
  readonly minPicks: number;
  /** Picks folded so far. */
  readonly n: number;
  /** sum of ln E_t. */
  readonly logM: number;
  /** Running maximum of logM (the Ville-relevant quantity). */
  readonly maxLogM: number;
  /** 1-indexed pick at which ln(threshold) was first reached. */
  readonly firstCrossedAtPick: number | null;
  /** Running sums backing the diagnostics (exposed so the state is fully replayable). */
  readonly sumOurP: number;
  readonly sumMarketP: number;
  readonly sumOutcome: number;
}

/**
 * Start an empty fold state. Returns null on REFUSED OPTIONS (bad alpha,
 * threshold <= 1, epsilon outside [0,0.5], floor outside (0,0.5), non-integer or
 * non-positive minPicks) — never a silently-corrected default.
 */
export function initForecastSkillFold(
  opts: ForecastSkillOptions = {},
): ForecastSkillFoldState | null {
  const alpha = opts.alpha ?? DEFAULT_FORECAST_SKILL_ALPHA;
  const epsilon = opts.epsilon ?? DEFAULT_FORECAST_SKILL_EPSILON;
  const floor = opts.floor ?? DEFAULT_FORECAST_SKILL_FLOOR;
  const minPicks = opts.minPicks ?? DEFAULT_FORECAST_SKILL_MIN_PICKS;
  const threshold = opts.evidenceThreshold ?? 1 / alpha;

  if (!Number.isFinite(alpha) || !(alpha > 0 && alpha < 1)) return null;
  if (!Number.isFinite(threshold) || !(threshold > 1)) return null;
  if (!Number.isFinite(epsilon) || !(epsilon >= 0 && epsilon <= 0.5)) return null;
  if (!Number.isFinite(floor) || !(floor > 0 && floor < 0.5)) return null;
  if (!Number.isInteger(minPicks) || minPicks < 1) return null;

  return {
    alpha,
    threshold,
    epsilon,
    floor,
    minPicks,
    n: 0,
    logM: 0,
    maxLogM: 0,
    firstCrossedAtPick: null,
    sumOurP: 0,
    sumMarketP: 0,
    sumOutcome: 0,
  };
}

/**
 * Fold ONE settled pick into the state. O(1), immutable. Returns null on a
 * refused observation (non-finite p or m, either outside [0,1], y not exactly 0
 * or 1) — the caller decides whether that is a data bug; the state it already
 * holds remains valid either way.
 */
export function foldForecastSkillPick(
  state: ForecastSkillFoldState,
  point: ForecastSkillPoint,
): ForecastSkillFoldState | null {
  if (!Number.isFinite(point.p) || !Number.isFinite(point.m)) return null;
  if (point.p < 0 || point.p > 1) return null;
  if (point.m < 0 || point.m > 1) return null;
  if (point.y !== 0 && point.y !== 1) return null;

  const logM = state.logM + logFactor(point, state.epsilon, state.floor);
  const n = state.n + 1;
  const maxLogM = Math.max(state.maxLogM, logM);
  const crossedNow = logM >= Math.log(state.threshold);

  return {
    alpha: state.alpha,
    threshold: state.threshold,
    epsilon: state.epsilon,
    floor: state.floor,
    minPicks: state.minPicks,
    n,
    logM,
    maxLogM,
    firstCrossedAtPick:
      state.firstCrossedAtPick !== null ? state.firstCrossedAtPick : crossedNow ? n : null,
    sumOurP: state.sumOurP + point.p,
    sumMarketP: state.sumMarketP + point.m,
    sumOutcome: state.sumOutcome + point.y,
  };
}

/**
 * Render a fold state as the reportable result. Pure; safe to call after every
 * pick (that is the whole point of an anytime-valid test).
 */
export function summarizeForecastSkillFold(state: ForecastSkillFoldState): ForecastSkillResult {
  const { n, logM, maxLogM } = state;
  const growthRatePerPick = n > 0 ? logM / n : 0;
  const crossed = state.firstCrossedAtPick !== null;
  const eligible = n >= state.minPicks;
  const verdict: ForecastSkillVerdict = !eligible
    ? "insufficient"
    : crossed
      ? "evidence-of-skill-vs-market"
      : "no-evidence";

  const ourMeanProbability = n > 0 ? state.sumOurP / n : 0;
  const marketMeanProbability = n > 0 ? state.sumMarketP / n : 0;
  const realisedRate = n > 0 ? state.sumOutcome / n : 0;
  const se =
    n > 0 ? Math.sqrt(Math.max(marketMeanProbability * (1 - marketMeanProbability), 0) / n) : 0;
  const vigWarning = eligible && se > 0 && marketMeanProbability - realisedRate > 2 * se;

  // Smallest attainable single-pick factor: shrinkage floors it at epsilon, and
  // clamping floors it at floor/(1-floor) even when epsilon = 0.
  const worstCaseLogFactorPerPick = Math.log(
    Math.max(state.epsilon, state.floor / (1 - state.floor)),
  );

  const deliveredAlpha = 1 / state.threshold;

  return {
    alpha: state.alpha,
    threshold: state.threshold,
    deliveredAlpha,
    epsilon: state.epsilon,
    floor: state.floor,
    minPicks: state.minPicks,
    n,
    logM,
    m: saturatingExp(logM),
    maxLogM,
    maxM: saturatingExp(maxLogM),
    growthRatePerPick,
    growthRateBitsPerPick: growthRatePerPick / Math.LN2,
    // Floor at MIN_VALUE: exp(-maxLogM) underflows to literal 0 past ~745 nats,
    // and a published "p = 0" claims impossibility. MIN_VALUE is still an upper
    // bound on the true value there, so the bound stays in the safe direction.
    anytimeValidPValue: Math.max(Math.min(1, Math.exp(-maxLogM)), Number.MIN_VALUE),
    rejectsAt: crossed ? state.threshold : null,
    firstCrossedAtPick: state.firstCrossedAtPick,
    eligible,
    verdict,
    ourMeanProbability,
    marketMeanProbability,
    realisedRate,
    vigWarning,
    worstCaseLogFactorPerPick,
    operatorHint: buildOperatorHint({
      n,
      minPicks: state.minPicks,
      threshold: state.threshold,
      configuredAlpha: state.alpha,
      deliveredAlpha,
      verdict,
      maxM: saturatingExp(maxLogM),
      firstCrossedAtPick: state.firstCrossedAtPick,
      growthRatePerPick,
      vigWarning,
    }),
  };
}

interface HintInput {
  readonly n: number;
  readonly minPicks: number;
  readonly threshold: number;
  readonly configuredAlpha: number;
  readonly deliveredAlpha: number;
  readonly verdict: ForecastSkillVerdict;
  readonly maxM: number;
  readonly firstCrossedAtPick: number | null;
  readonly growthRatePerPick: number;
  readonly vigWarning: boolean;
}

/**
 * The honesty surface. Every branch is written to be quotable verbatim by an
 * operator without the sentence becoming an overclaim: the rejection branch
 * carries the "not profitability / not PROVEN" scope inline, because a scope
 * caveat that lives only in this file's header is a caveat nobody reads.
 */
function buildOperatorHint(input: HintInput): string {
  const parts: string[] = [];
  const rate = input.growthRatePerPick;
  const rateText = `${rate >= 0 ? "+" : ""}${rate.toFixed(4)} nats/pick`;
  const thresholdText = formatThreshold(input.threshold);

  if (input.verdict === "insufficient") {
    parts.push(
      input.n === 0
        ? "No settled picks supplied — nothing is being claimed."
        : `Only ${input.n} settled pick(s) against a ${input.minPicks}-pick minimum: NO verdict. ` +
            `This is not evidence of skill, and it is not evidence of its absence.`,
    );
  } else if (input.verdict === "no-evidence") {
    parts.push(
      `After ${input.n} picks the evidence peaked at M=${formatEvidence(input.maxM)}, below the ` +
        `${thresholdText} threshold: H0 ("no better than the supplied market probabilities") stands. ` +
        `No skill claim may be published.`,
    );
    if (rate < 0) {
      parts.push(
        `Growth is NEGATIVE (${rateText}) — the market's probabilities are currently explaining ` +
          `outcomes better than ours. Read this as a diagnostic only: this instrument tests one ` +
          `direction, so a negative path is NOT an alpha-level finding against us.`,
      );
    }
  } else {
    parts.push(
      `M reached ${formatEvidence(input.maxM)} (threshold ${thresholdText}, i.e. an alpha budget of ` +
        `${formatAlpha(input.deliveredAlpha)}) at pick ` +
        `${input.firstCrossedAtPick ?? input.n} of ${input.n}, growing ${rateText}. ` +
        `Anytime-valid: the crossing counts even though the record was checked after every pick.`,
    );
    parts.push(
      `SCOPE: this is evidence our probabilities beat THE SUPPLIED MARKET PROBABILITIES at ` +
        `explaining outcomes. It is NOT profitability (no vig, odds or stake modelling exists in ` +
        `this test) and NOT the PROVEN gate. Do not publish it as a win rate, an ROI, or a ` +
        `"beats the books" claim.`,
    );
  }

  parts.push(
    `Requires DE-VIGGED market probabilities and at most one pick per game; vig-inclusive or ` +
      `same-game-correlated inputs bias this test in our favour and invalidate the alpha bound.`,
  );

  // An explicit evidenceThreshold silently overrides alpha. Saying so here is
  // the difference between a self-describing record and a quotable overclaim.
  if (Math.abs(input.configuredAlpha - input.deliveredAlpha) > 1e-12) {
    parts.push(
      `LEVEL: evidenceThreshold ${thresholdText} OVERRIDES the configured alpha ` +
        `${formatAlpha(input.configuredAlpha)}. The level actually delivered here is ` +
        `1/threshold = ${formatAlpha(input.deliveredAlpha)} — quote that, not the configured alpha.`,
    );
  }

  if (input.vigWarning) {
    parts.push(
      `INPUT AUDIT: mean market probability exceeds the realised base rate by more than 2 standard ` +
        `errors — consistent with vig-inclusive inputs (also consistent with a genuine edge on this ` +
        `slice; this screen cannot distinguish them). Verify the de-vig step before quoting anything.`,
    );
  }

  return parts.join(" ");
}

function formatEvidence(value: number): string {
  if (value >= 1e6) return value.toExponential(2);
  return value >= 100 ? value.toFixed(0) : value.toFixed(2);
}

/**
 * Thresholds come from 1/alpha and are routinely non-terminating in binary
 * (alpha = 0.03 -> 33.333333333333336). Operator copy must not carry sixteen
 * digits of float dust; the exact value stays on `threshold`.
 */
function formatThreshold(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(4);
}

/** Alpha levels are small; fixed notation until it stops being readable. */
function formatAlpha(value: number): string {
  return value >= 1e-4
    ? value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
    : value.toExponential(2);
}

// ============================================================
// Batch entry point
// ============================================================

/**
 * Run the forecast-skill E-process over an ordered batch of settled picks.
 *
 * Returns null on refused OPTIONS or on any malformed point (the whole batch is
 * refused rather than silently skipping a row — a silently dropped pick is a
 * selection effect, and selection effects are exactly what an anytime-valid
 * test cannot survive). An EMPTY batch is not an error: it returns an n=0
 * result with verdict "insufficient", identical to the freshly-initialised fold
 * state, so streaming and batch callers render "no data yet" the same way.
 *
 * Points MUST be in settlement order.
 */
export function forecastSkillEProcess(
  points: readonly ForecastSkillPoint[],
  opts: ForecastSkillOptions = {},
): ForecastSkillResult | null {
  let state = initForecastSkillFold(opts);
  if (state === null) return null;
  for (const point of points) {
    const next = foldForecastSkillPick(state, point);
    if (next === null) return null;
    state = next;
  }
  return summarizeForecastSkillFold(state);
}
