/**
 * Robust Kelly under Knightian uncertainty in p (research spec Part XI) — shadow.
 *
 * RELATION TO bankroll.ts (which this module does NOT modify or replace).
 * `bankroll.ts` is the money-management surface: it takes a win probability, decimal
 * odds and a bankroll, calls `fullKellyFraction` from `kelly.ts`, then applies a
 * fractional-Kelly mode ("quarter" by default) plus a hard per-pick percent cap.
 * Every one of those defenses is a *variance* defense — they all still treat the
 * supplied p as if it were known exactly. This module sits one step UPSTREAM and
 * attacks a different failure mode: the p handed to Kelly is itself an estimate, and
 * standard Kelly is famously not just volatile but *biased toward ruin* when p is
 * overstated (dEV/dp is steep; a 3-point probability error at short odds can turn a
 * growth-optimal stake into a negative-growth one). So instead of asking "how much of
 * my bankroll at this p", it asks "what p should Kelly even be fed, given how little
 * evidence stands behind it" — maximising worst-case log-growth over a confidence set
 * around p rather than log-growth at the point estimate.
 *
 * Conventions are deliberately shared with bankroll.ts / kelly.ts:
 *   - odds are DECIMAL odds (b = decimalOdds − 1), same as `fullKellyFraction`;
 *   - fractions are fractions OF BANKROLL in [0, 1] (bankroll.ts multiplies by 100
 *     to reach percent, kelly.ts by 100 to reach "units");
 *   - a stake is never negative — no edge means exactly 0, never a lay.
 * The output of `robustKellyFraction` is therefore drop-in composable: feed
 * `worstCaseProbability` to `recommendStake(bankroll, p, decimalOdds)` and the existing
 * quarter-Kelly + cap machinery applies unchanged, on top of the uncertainty haircut.
 * `fullKellyFraction` is reused directly rather than re-deriving f = (p(b+1) − 1)/b.
 *
 * THE CONFIDENCE SET. Around the central estimate p we place a Beta credible set with
 * the spec's pseudo-count parameterisation, driven by an effective sample size n:
 *
 *     a = p·n + 1,   b = (1 − p)·n + 1
 *
 * n is "how many independent settled observations is this belief actually worth" — not
 * how many rows fed the model. Small n ⇒ a wide, flat Beta ⇒ a distant worst case ⇒ a
 * small stake. n → ∞ ⇒ the Beta collapses onto p and robust Kelly → standard Kelly from
 * below. Because we are BACKING the outcome, we are hurt by p being smaller than
 * believed, so the worst case is the LOWER tail: p_worst = Q(α; a, b), the α-quantile of
 * the Beta. (Fading/laying is out of scope: fade by passing the complementary
 * probability and the opposite side's price, which puts the same lower tail on the side
 * actually being backed.)
 *
 * One honesty clamp: the Laplace-style +1 pseudo-counts pull the set's mass toward 0.5
 * (its mean is (p·n + 1)/(n + 2), not p), so for a LOW p with a TINY n the α-quantile can
 * sit *above* the central estimate — an "uncertainty" adjustment that made us bet more.
 * We take p_worst = min(p, Q(α; a, b)) so the robust stake is never more aggressive than
 * the standard one. That inequality is an invariant of this module, not an accident.
 *
 * NUMERICS. The Beta quantile needs an inverse regularised incomplete beta, and there is
 * no scipy here. Rather than duplicate a continued fraction that this package already
 * carries, we reuse `regularizedIncompleteBeta` from `edge-lab/stats.ts` (Numerical
 * Recipes `betai`: modified Lentz continued fraction, taken on whichever side of the
 * symmetry point converges, double precision) and `gammaLn` (Lanczos) for the density.
 * The inversion itself is implemented here as a bracket-safeguarded Newton iteration:
 * Newton on I_x(a,b) − q using the exact Beta pdf as the derivative, with every step
 * validated against a monotonically shrinking [lo, hi] bracket and demoted to bisection
 * whenever it would escape. That gives Newton's quadratic convergence with bisection's
 * unconditional guarantee.
 *
 * Accuracy is INHERITED from that shared continued fraction, not better than it. Its own
 * convergence criterion is BETACF_EPS = 3e-11, and measured against an exact
 * Beta-Binomial-duality reference it delivers ~1e-15 absolute in the CDF for small
 * shapes but only ~1e-10 near the centre of a sharply peaked one (worst observed:
 * 7.5e-11 at Beta(500, 500), x = 0.5). Past a + b ≈ 1e8 it stops converging altogether
 * in a narrow band around its own branch-switch point and returns values OUTSIDE [0, 1];
 * those are rejected rather than propagated (see `admissibleBetaCdf`), and if no
 * admissible reading exists at all the quantile is NaN and the stake fails closed to 0.
 *
 * KNOWN RESIDUAL, stated rather than hidden. Immediately outside that rejected band the
 * same expansion returns values that are in [0, 1] and therefore indistinguishable from
 * good ones, but still wrong (at a = 6.2e8 it reads 0.687 where the truth is 0.480), so
 * I_x is not monotone there and Q(q) is unreliable for q within ~±0.1 standard
 * deviations of the centre once a + b ≳ 1e8. The defect is in the shared
 * `regularizedIncompleteBeta`, not here, and this module is insulated from it three
 * ways: n_eff of 1e8 is five orders past anything the settled-pick history can support,
 * the affected q sit at α ≈ 0.5 where the "worst case" is the median by construction,
 * and `min(p, ·)` clamps any resulting optimism away. The α ≤ 0.25 tail that actually
 * sizes stakes is verified correct to ~1e-5 of a standard deviation out to n_eff = 1e12.
 *
 * DETERMINISM. Fully deterministic and pure: no Math.random, no Date.now, no PRNG (the
 * algorithm is not stochastic, so there is no seed to take), no I/O, no env reads.
 * Identical inputs produce bit-identical outputs.
 *
 * SHADOW / R&D ONLY. Reads and writes no feature gate — not CALIBRATION_ADJUSTMENTS,
 * not PERFORMANCE_STATS, not RANKING_PAUSE_APPLY, not AUTO_PUBLISH. Nothing here is
 * priced into a live user-facing stake, and as with kelly.ts/bankroll.ts none of it is
 * a recommendation to bet.
 *
 * References:
 *   - Kelly, J. L. (1956). "A New Interpretation of Information Rate."
 *   - Knight, F. (1921). "Risk, Uncertainty and Profit" (risk vs. unmeasured uncertainty).
 *   - Baker & McHale (2013). "Optimal betting under parameter uncertainty."
 *   - Gilboa & Schmeidler (1989). "Maxmin expected utility with non-unique prior."
 */

import { fullKellyFraction } from "./kelly.js";
import { gammaLn, regularizedIncompleteBeta } from "./edge-lab/stats.js";

/** Default one-sided tail mass left outside the confidence set (10% ⇒ a 90% set). */
export const DEFAULT_ROBUST_ALPHA = 0.1;

/** α is clamped here: 0.5 would put the "worst case" at the median and stop being one. */
const MIN_ALPHA = 1e-9;
const MAX_ALPHA = 0.5;

/**
 * Bisection halves the bracket once per iteration, so the budget is also the number
 * of binary decades the solver can travel from its starting bracket. 1100 covers the
 * whole positive double range down to the smallest denormal; ordinary calls return in
 * well under 20 iterations, so the headroom is only ever spent on shapes whose
 * quantile sits tens of decades from the endpoints (a < 1 with a tiny q).
 */
const QUANTILE_MAX_ITERATIONS = 1100;
/** Absolute tolerance on I_x(a,b) − q. */
const QUANTILE_CDF_ABS_TOLERANCE = 1e-15;
/**
 * RELATIVE tolerance on I_x(a,b) − q. The accepted residual is the tighter of the two
 * arms: ABS ∧ REL·min(q, 1−q). The relative arm is what makes a TAIL quantile honest —
 * an absolute 1e-15 on its own is satisfied by almost any x once q itself falls near
 * 1e-15, which is how Q(1e-15; 1, 1) used to return 5.55e-16 (a 44% error on a case
 * with a closed form) and Q(1e-12; 1, 1) used to return 9.9953e-13.
 */
const QUANTILE_CDF_REL_TOLERANCE = 1e-12;
/**
 * RELATIVE tolerance on the step size in x, and on the residual bracket width. Also
 * relative for the same reason: an absolute 1e-16 floor silently caps every returned
 * quantile at ~5.5e-17 resolution and terminated the iteration while the CDF was still
 * orders of magnitude away from q.
 */
const QUANTILE_X_TOLERANCE = 8 * Number.EPSILON;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * I_x(a, b) with an admissibility check. A regularised incomplete beta is a
 * PROBABILITY, so a reading outside [0, 1] — or a non-finite one — is not a slightly
 * inaccurate answer, it is a failed evaluation, and it is reported as NaN rather than
 * passed on.
 *
 * This is not hypothetical. The shared Numerical-Recipes continued fraction stops
 * converging inside a narrow band around its own branch-switch point (a+1)/(a+b+2)
 * once a and b reach ~1e8: at a = 6.2e8, b = 3.8e8 it returns 2.73 just below the
 * switch and −1.52 just above it. Both are inadmissible, and both used to be fed
 * straight into the quantile solver's bracket update (see `betaQuantile`).
 */
function admissibleBetaCdf(x: number, a: number, b: number): number {
  const value = regularizedIncompleteBeta(x, a, b);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : Number.NaN;
}

/**
 * Regularised incomplete beta I_x(a, b) = P(X ≤ x) for X ~ Beta(a, b).
 *
 * Thin, deliberate re-export of the package's shared Numerical-Recipes implementation
 * (`edge-lab/stats.ts`) so robust-Kelly callers and tests exercise the SAME continued
 * fraction the Clopper-Pearson / selective-gate code paths already depend on, instead
 * of a second private copy that could drift.
 *
 * Returns NaN on invalid shape parameters, and also NaN wherever that shared continued
 * fraction fails to converge and hands back a value outside [0, 1] — see
 * `admissibleBetaCdf`. Reporting the failure is the honest option: fabricating a 0 or a
 * 1 by clamping would leave the CDF non-monotone, which is strictly worse for any
 * caller that inverts it.
 */
export function betaCdf(x: number, a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return Number.NaN;
  if (!Number.isFinite(x)) return Number.NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return admissibleBetaCdf(x, a, b);
}

/**
 * Beta(a, b) density at x, evaluated in log space so large pseudo-counts (a big
 * effective sample size drives a, b into the hundreds) neither overflow nor lose
 * precision. Used as the analytic derivative of `betaCdf` inside the Newton inversion.
 */
export function betaPdf(x: number, a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return Number.NaN;
  if (!Number.isFinite(x) || x <= 0 || x >= 1) return 0;
  const logBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta);
}

/**
 * Beta quantile Q(q; a, b): the x with I_x(a, b) = q.
 *
 * Bracket-safeguarded Newton. I_x is strictly increasing in x on (0, 1), so [lo, hi] is
 * a valid bracket that we shrink on every ADMISSIBLE evaluation regardless of which rule
 * produced the step; a Newton step is accepted only when it lands strictly inside the
 * current bracket, otherwise the iteration falls back to bisection for that step.
 * Convergence is therefore unconditional (bisection floor) while still quadratic near
 * the root.
 *
 * The word "admissible" is load-bearing. The bracket is this solver's only
 * unconditional correctness guarantee, so it must never be moved by a CDF reading that
 * is not a probability. The seed sits at the distribution mean, which is within
 * 1/(a+b) of the shared continued fraction's branch-switch point (a+1)/(a+b+2) — i.e.
 * exactly where that expansion stops converging for large shapes. One inadmissible
 * reading there (I_mean evaluating to −1.52 at a = 6.2e8, b = 3.8e8) sets `lo = mean`,
 * which puts the true α-quantile permanently OUTSIDE the bracket and returns a "worst
 * case" ABOVE the central estimate. So an inadmissible reading is discarded and the
 * solver probes elsewhere instead; the failing band is narrow, so alternating
 * sub-interval midpoints escape it in a step or two.
 *
 * Accuracy is bounded by the shared continued fraction (BETACF_EPS = 3e-11 in
 * edge-lab/stats.ts), which delivers ~1e-10 absolute in the CDF near the centre of a
 * sharply peaked Beta — NOT the 1e-15 the tolerance constants ask for. The solver asks
 * for more than it can always get on purpose: whichever criterion binds first, the
 * answer stays inside a proven bracket.
 *
 * Returns 0 for q ≤ 0 and 1 for q ≥ 1 (the closed-form endpoints), and NaN on invalid
 * a/b or when no admissible CDF reading exists anywhere in [0, 1].
 */
export function betaQuantile(q: number, a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return Number.NaN;
  if (!Number.isFinite(q)) return Number.NaN;
  if (q <= 0) return 0;
  if (q >= 1) return 1;

  // Tighter of the absolute and relative arms — see the tolerance constants.
  const cdfTolerance = Math.min(
    QUANTILE_CDF_ABS_TOLERANCE,
    QUANTILE_CDF_REL_TOLERANCE * Math.min(q, 1 - q),
  );

  let lo = 0;
  let hi = 1;
  // Start at the distribution mean; the bracket makes a poor start harmless.
  let x = Math.min(1 - 1e-12, Math.max(1e-12, a / (a + b)));

  for (let i = 0; i < QUANTILE_MAX_ITERATIONS; i++) {
    const cdf = admissibleBetaCdf(x, a, b);
    if (Number.isNaN(cdf)) {
      // Failed evaluation: leave the bracket untouched and probe a different point
      // inside it. Alternating the two sub-intervals x splits [lo, hi] into keeps
      // every retry distinct and keeps the probe strictly inside the bracket.
      const retry = i % 2 === 0 ? 0.5 * (lo + x) : 0.5 * (x + hi);
      if (!(retry > lo) || !(retry < hi) || retry === x) break;
      x = retry;
      continue;
    }

    const err = cdf - q;
    if (err > 0) hi = x;
    else lo = x;
    if (Math.abs(err) <= cdfTolerance) return x;

    const density = betaPdf(x, a, b);
    let next =
      Number.isFinite(density) && density > 0 ? x - err / density : Number.NaN;
    // Demote to bisection whenever Newton would leave the proven bracket.
    if (!Number.isFinite(next) || next <= lo || next >= hi) next = 0.5 * (lo + hi);

    if (Math.abs(next - x) <= QUANTILE_X_TOLERANCE * Math.abs(next)) return next;
    // The bracket itself has collapsed to double-precision width: no further
    // refinement is representable, so stop rather than burn the iteration budget
    // chasing continued-fraction noise.
    if (hi - lo <= QUANTILE_X_TOLERANCE * hi) return 0.5 * (lo + hi);
    x = next;
  }

  // The bracket never moved, so not one admissible reading was found anywhere in
  // [0, 1] — the shapes are past the point where the shared continued fraction can be
  // evaluated at all. Fail closed with NaN rather than hand back an unvalidated
  // endpoint: `robustKellyFraction` reads a non-finite quantile as "no usable worst
  // case" and stakes 0.
  if (lo === 0 && hi === 1) return Number.NaN;
  return x;
}

/** The Beta confidence set placed around a central probability estimate. */
export type BetaConfidenceSet = {
  /** Central estimate, clamped to [0, 1]. */
  readonly probability: number;
  /** Effective sample size backing the estimate (pseudo-observations). */
  readonly effectiveSampleSize: number;
  /** One-sided tail mass, clamped to [1e-9, 0.5]. */
  readonly alpha: number;
  /** Beta shape a = p·n + 1. */
  readonly a: number;
  /** Beta shape b = (1 − p)·n + 1. */
  readonly b: number;
  /** Posterior mean (a)/(a + b) — drifts toward 0.5 for small n. */
  readonly mean: number;
  /** α-quantile: the pessimistic edge of the set for a bet BACKING the outcome. */
  readonly lower: number;
  /** (1 − α)-quantile: the optimistic edge, reported for width/diagnostics only. */
  readonly upper: number;
  /** upper − lower. Shrinks toward 0 as the effective sample size grows. */
  readonly width: number;
};

/**
 * Build the Beta confidence set for a central probability at a given effective sample
 * size. Exposed separately from the sizing call so ops surfaces can show the interval
 * (and its width) without committing to a stake.
 */
export function betaConfidenceSet(args: {
  readonly probability: number;
  readonly effectiveSampleSize: number;
  readonly alpha?: number;
}): BetaConfidenceSet {
  const probability = Number.isFinite(args.probability) ? clamp01(args.probability) : 0;
  const effectiveSampleSize =
    Number.isFinite(args.effectiveSampleSize) && args.effectiveSampleSize > 0
      ? args.effectiveSampleSize
      : 0;
  const rawAlpha = args.alpha ?? DEFAULT_ROBUST_ALPHA;
  const alpha = Number.isFinite(rawAlpha)
    ? Math.min(MAX_ALPHA, Math.max(MIN_ALPHA, rawAlpha))
    : DEFAULT_ROBUST_ALPHA;

  const a = probability * effectiveSampleSize + 1;
  const b = (1 - probability) * effectiveSampleSize + 1;
  const lower = betaQuantile(alpha, a, b);
  const upper = betaQuantile(1 - alpha, a, b);

  return {
    probability,
    effectiveSampleSize,
    alpha,
    a,
    b,
    mean: a / (a + b),
    lower,
    upper,
    width: upper - lower,
  };
}

export type RobustKellyInput = {
  /** Central win-probability estimate for the outcome being BACKED. */
  readonly probability: number;
  /** Decimal odds (b = decimalOdds − 1), same convention as kelly.ts/bankroll.ts. */
  readonly decimalOdds: number;
  /** Pseudo-observations of evidence behind `probability`. Lower ⇒ more conservative. */
  readonly effectiveSampleSize: number;
  /** One-sided tail mass left outside the confidence set. Default 0.10. */
  readonly alpha?: number;
  /**
   * OPTIONAL hard ceiling on the returned bankroll fraction, in the same units as the
   * fraction itself (0.05 = never stake more than 5% of bankroll). This is a ceiling,
   * NOT a fractional-Kelly multiplier λ: to take quarter-Kelly of the robust fraction,
   * scale the result, or hand `worstCaseProbability` to bankroll.ts's `recommendStake`,
   * whose "quarter"/"half"/"full" modes already apply λ and its own percent cap.
   */
  readonly cap?: number;
};

export type RobustKellyResult = {
  /** Echoed central estimate after clamping to [0, 1]. */
  readonly probability: number;
  readonly decimalOdds: number;
  readonly effectiveSampleSize: number;
  readonly alpha: number;
  /** The Beta set the worst case was drawn from. */
  readonly confidenceSet: BetaConfidenceSet;
  /**
   * The pessimistic probability Kelly was actually run at: min(p, Q(α; a, b)). Never
   * above the central estimate — see the honesty clamp in the module header.
   */
  readonly worstCaseProbability: number;
  /** Break-even probability implied by the price, 1/decimalOdds. */
  readonly breakEvenProbability: number;
  /** p − break-even at the central estimate. */
  readonly centralEdge: number;
  /** p_worst − break-even. Negative ⇒ the set contains no bet. */
  readonly worstCaseEdge: number;
  /** Standard full-Kelly fraction at the central estimate (≥ 0). */
  readonly centralKellyFraction: number;
  /** Full-Kelly fraction at the worst-case probability, before `cap` (≥ 0). */
  readonly robustFractionBeforeCap: number;
  /** Final robust bankroll fraction: ≥ 0 always, ≤ centralKellyFraction always. */
  readonly robustFraction: number;
  /** centralKellyFraction − robustFraction: the price of not knowing p. Always ≥ 0. */
  readonly uncertaintyHaircut: number;
  /** robustFraction / centralKellyFraction in [0, 1]; 0 when there is no central edge. */
  readonly haircutRatio: number;
  /** The ceiling that was applied, or null when none was supplied. */
  readonly cap: number | null;
  /** True when `cap` bound (i.e. it, not the uncertainty, set the final number). */
  readonly capBinding: boolean;
  /** True when the worst case still clears break-even — an edge robust to the set. */
  readonly hasRobustEdge: boolean;
  readonly rationale: string;
  readonly priced: false;
  readonly status: "shadow";
};

/**
 * Kelly stake sizing that is robust to Knightian uncertainty in the win probability.
 *
 * Maximises worst-case log-growth over the Beta confidence set: because log-growth is
 * increasing in p for a backed outcome, the worst case over the set is attained at its
 * lower edge, so the maximin fraction is simply standard Kelly evaluated at p_worst.
 * The result is clamped at 0 (no bet — never a negative stake) and is guaranteed to be
 * ≤ the standard Kelly fraction at the central estimate.
 *
 * Fails closed on degenerate input rather than throwing: a non-finite probability, a
 * non-finite or non-paying price (decimalOdds ≤ 1), or a non-finite effective sample
 * size all resolve to a zero stake with the reason carried in `rationale`.
 */
export function robustKellyFraction(input: RobustKellyInput): RobustKellyResult {
  const confidenceSet = betaConfidenceSet({
    probability: input.probability,
    effectiveSampleSize: input.effectiveSampleSize,
    alpha: input.alpha,
  });
  const probability = confidenceSet.probability;
  const alpha = confidenceSet.alpha;

  const decimalOdds = Number.isFinite(input.decimalOdds) ? input.decimalOdds : 0;
  const paysOut = decimalOdds > 1;
  const breakEvenProbability = paysOut ? 1 / decimalOdds : 1;

  // Honesty clamp: the +1 pseudo-counts pull the set toward 0.5, so a low p at a tiny
  // effective sample size can produce an α-quantile ABOVE p. Never size above central.
  const quantile = confidenceSet.lower;
  const worstCaseProbability = Number.isFinite(quantile)
    ? Math.min(probability, quantile)
    : 0;

  const centralKellyFraction = paysOut
    ? Math.max(0, fullKellyFraction(probability, decimalOdds))
    : 0;
  const robustFractionBeforeCap = paysOut
    ? Math.max(0, fullKellyFraction(worstCaseProbability, decimalOdds))
    : 0;

  const cap =
    input.cap === undefined || !Number.isFinite(input.cap)
      ? null
      : Math.max(0, input.cap);
  const capped = cap === null ? robustFractionBeforeCap : Math.min(robustFractionBeforeCap, cap);
  // Belt and braces: the maximin fraction can never exceed the central one, and can
  // never be negative. Both already hold by construction; assert them in the value.
  const robustFraction = Math.max(0, Math.min(capped, centralKellyFraction));
  const capBinding = cap !== null && robustFractionBeforeCap > cap;

  const uncertaintyHaircut = Math.max(0, centralKellyFraction - robustFraction);
  const haircutRatio =
    centralKellyFraction > 0 ? robustFraction / centralKellyFraction : 0;
  const hasRobustEdge = paysOut && worstCaseProbability > breakEvenProbability;

  const rationale = !paysOut
    ? `No payout at decimal odds ${decimalOdds} (need > 1) — stake 0.`
    : centralKellyFraction <= 0
      ? `Central p=${probability.toFixed(4)} is at or below the ${breakEvenProbability.toFixed(4)} break-even for ${decimalOdds} — negative-EV, stake 0.`
      : !hasRobustEdge
        ? `Central p=${probability.toFixed(4)} clears break-even ${breakEvenProbability.toFixed(4)}, but the ${((1 - 2 * alpha) * 100).toFixed(0)}% Beta set (n_eff=${confidenceSet.effectiveSampleSize}) reaches down to ${worstCaseProbability.toFixed(4)} — the edge does not survive the uncertainty, stake 0.`
        : `Worst-case p=${worstCaseProbability.toFixed(4)} (α=${alpha} lower tail of Beta(${confidenceSet.a.toFixed(2)}, ${confidenceSet.b.toFixed(2)}), n_eff=${confidenceSet.effectiveSampleSize}) still beats break-even ${breakEvenProbability.toFixed(4)}. Robust fraction ${(robustFraction * 100).toFixed(2)}% of bankroll vs ${(centralKellyFraction * 100).toFixed(2)}% standard Kelly — a ${(uncertaintyHaircut * 100).toFixed(2)}pt uncertainty haircut${capBinding ? `, ceiling ${((cap ?? 0) * 100).toFixed(2)}% binding` : ""}. Shadow only — not a recommendation to bet.`;

  return {
    probability,
    decimalOdds,
    effectiveSampleSize: confidenceSet.effectiveSampleSize,
    alpha,
    confidenceSet,
    worstCaseProbability,
    breakEvenProbability,
    centralEdge: probability - breakEvenProbability,
    worstCaseEdge: worstCaseProbability - breakEvenProbability,
    centralKellyFraction,
    robustFractionBeforeCap,
    robustFraction,
    uncertaintyHaircut,
    haircutRatio,
    cap,
    capBinding,
    hasRobustEdge,
    rationale,
    priced: false,
    status: "shadow",
  };
}

/**
 * Re-size the same bet across a grid of effective sample sizes.
 *
 * The operator question this answers is "how much evidence would I need before this
 * edge is worth real money": the sweep shows the robust fraction climbing toward the
 * standard-Kelly asymptote as n_eff grows. Non-finite / non-positive grid entries are
 * treated as zero evidence (the most conservative reading) rather than dropped, so the
 * output is index-aligned with the input grid.
 */
export function sweepEffectiveSampleSize(
  input: RobustKellyInput,
  effectiveSampleSizes: readonly number[],
): readonly RobustKellyResult[] {
  const out: RobustKellyResult[] = [];
  for (const n of effectiveSampleSizes) {
    out.push(robustKellyFraction({ ...input, effectiveSampleSize: n }));
  }
  return out;
}

/** Re-export so callers get the standard Kelly baseline from the same module. */
export { fullKellyFraction };
