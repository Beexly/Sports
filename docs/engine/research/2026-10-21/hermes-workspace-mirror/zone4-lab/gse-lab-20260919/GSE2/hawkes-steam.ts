/**
 * Hawkes-process "steam" detector — market-microstructure module (research spec).
 *
 * WHAT "STEAM" MEANS HERE. Steam is informed, clustered betting pressure: several
 * independent-looking line moves on the SAME side arriving close together in time,
 * more often than a steady background rate would produce. This module does not
 * decide what counts as a "move" — the caller does that (the spec's suggestion is
 * a >=0.5% implied-probability shift). What this module owns is purely the ARRIVAL
 * PROCESS of whatever events it is handed: given a stream of timestamps, is the
 * clustering statistically excessive relative to a fitted background rate, and if
 * so, on which side and by how much.
 *
 * MODEL. A univariate (mark-free — see below) Hawkes process with an exponential
 * decay kernel, fit SEPARATELY per side:
 *
 *     lambda_side(t) = mu + alpha * sum_{t_i < t} exp(-beta * (t - t_i))
 *
 * Home and away events are two INDEPENDENT Hawkes processes (separate mu, alpha,
 * beta), never pooled into one intensity. Steam has a direction: a cluster of
 * home-favoring moves and a cluster of away-favoring moves are different market
 * events, and summing their counts into one intensity would wash out exactly the
 * asymmetry this module exists to detect.
 *
 * MARK-FREE BY DESIGN. `SteamEvent.impliedProbDelta` is carried on the event type
 * for the caller's own audit trail (it is presumably how the caller decided this
 * was a "significant" move worth reporting), but this module's intensity model
 * never reads it. The spec's lambda(t) formula above is a function of arrival
 * TIMES only — a magnitude-weighted ("marked") Hawkes process is a different,
 * more complex model and is explicitly out of scope here.
 *
 * ── TWO DEFECTS THIS MODULE DELIBERATELY DOES NOT REPRODUCE ─────────────────
 *
 * (1) O(n^2) NAIVE INTENSITY. A naive implementation recomputes
 *     sum_{t_i<t} exp(-beta*(t-t_i)) by rescanning the entire event history on
 *     every query. There is a standard O(1) recursive identity for the
 *     exponential kernel: maintain a single decay statistic A (the excitation
 *     "state"), and on a new event at time t with the previous event/update time
 *     t_prev,
 *
 *         A_before = A * exp(-beta * (t - t_prev))     [pre-event value, used
 *                                                        for the pre-event
 *                                                        intensity]
 *         A_after  = A_before + 1                       [post-event value,
 *                                                        stored for next time]
 *
 *     so that lambda(t-) = mu + alpha * A_before at every observation, in O(1)
 *     amortised per event and O(1) per read (`intensityAt` decays the stored A
 *     forward from the last observed time to the query time — still O(1), no
 *     history rescan). `observeEvent` and `intensityAt` below implement exactly
 *     this identity; nothing in this module ever re-scans past events on a query.
 *     Test coverage cross-checks this against an INDEPENDENT O(n) brute-force
 *     resum written directly against the raw event list (ground truth, not a
 *     golden constant).
 *
 * (2) ONE-GRADIENT-STEP-PER-EVENT ONLINE SGD. Fitting this exact nonconvex
 *     3-parameter likelihood with per-event SGD is well known to be fragile: it
 *     routinely drifts into the SUPERCRITICAL regime (alpha/beta >= 1, where the
 *     branching process is explosive and expected-future-event-count integrals
 *     diverge) or wanders uselessly because the loss surface is poorly
 *     conditioned as beta -> 0. This module does NOT do per-event gradient
 *     descent. Fitting is a BATCH operation, triggered explicitly by the caller
 *     via `refit(windowEvents)` on a rolling window (e.g. "last 2 hours",
 *     refit every 15 minutes) — never on a per-event or wall-clock-timer basis
 *     inside this module (no `Date.now()` here; "every 15 minutes" is a
 *     caller-side cron concern).
 *
 * ── FITTING METHOD: COORDINATE ASCENT ON A CONSTRAINED SEARCH SPACE ─────────
 *
 * Given a window of N event times t_1 < ... < t_N for one side, observed over
 * [t_1, T_obs] (see "OBSERVATION WINDOW" below for why the window starts at the
 * first event rather than at some earlier caller-side boundary), the exact Hawkes
 * log-likelihood (Ogata 1981) is
 *
 *     LL(mu,alpha,beta) = sum_i log(lambda(t_i-)) - integral_0^{T_obs} lambda(s) ds
 *     integral_0^{T_obs} lambda(s) ds = mu*T_obs
 *         + (alpha/beta) * sum_i (1 - exp(-beta*(T_obs - t_i)))
 *
 * where lambda(t_i-) = mu + alpha*A_i and A_i is the PRE-event decay statistic
 * from the recursion above (§1). `hawkesWindowLogLikelihood` below computes this
 * exactly and is the single function both the fitter and the test suite's
 * independent grid-search check evaluate — so a passing "coordinate ascent beats
 * brute-force grid" test is a real optimizer-quality check, not a
 * formula-vs-itself tautology.
 *
 * THE MU FIRST-ORDER CONDITION — DERIVED, NOT ASSUMED. For FIXED (alpha,beta),
 *
 *     d LL/d mu = sum_i 1/(mu + alpha*A_i) - T_obs = 0.
 *
 * This is closed-form linear ONLY in the special case alpha=0, where it collapses
 * to the classical Poisson MLE mu = N/T_obs (used directly, exactly, as a fast
 * path — see `solveMuExact`). For alpha > 0 it is a sum of reciprocals, not
 * literally linear in mu — but the left-hand side is STRICTLY DECREASING in mu
 * (each term's derivative -1/(mu+alpha*A_i)^2 < 0), running from +infinity as
 * mu -> 0+ down to 0 as mu -> infinity, so it has a unique positive root that a
 * bracket-safeguarded Newton iteration finds to machine precision (`solveMuExact`
 * — same bisection-safeguarded-Newton idiom used elsewhere in this package for
 * monotone scalar equations, e.g. `betaQuantile` in robust-kelly.ts). "Solve it
 * exactly" is honoured to numerical tolerance in the general case and literally
 * in the alpha=0 case, rather than silently reproducing an inexact "linear"
 * claim that does not hold once alpha > 0.
 *
 * ALPHA AND BETA — GRID-SEEDED COORDINATE ASCENT, NOT BLIND GOLDEN-SECTION.
 * A pure golden-section search only converges to the right answer if the
 * objective is unimodal on the search bracket, which is not guaranteed here.
 * So the search is grid-SEEDED: for each beta candidate (a deterministic
 * log-spaced coarse grid over `[betaSearchMin, betaSearchMax]`, default
 * [0.001, 100] — see "UNITS" below), the profiled alpha is found by first
 * evaluating a deterministic linear grid over the FEASIBLE range
 * `[0, beta*(1 - SUBCRITICALITY_MARGIN))`, then polishing the grid's winner with
 * a golden-section search LOCAL to its two neighbouring grid cells (where local
 * unimodality is a far safer assumption than global unimodality). mu is solved
 * exactly for every (alpha,beta) candidate via the monotone equation above — so
 * every objective evaluation is a true likelihood value, never an approximation.
 * The whole thing is then polished for a further `COORD_ASCENT_ROUNDS` rounds by
 * alternating a local golden-section refinement of beta (re-profiling alpha at
 * each beta trial) around the current best point. This is coordinate ascent —
 * each round improves one coordinate holding the others' *optimal response*
 * fixed — seeded by an exhaustive coarse grid specifically so a non-convex or
 * multi-modal likelihood surface cannot strand it in a bad local optimum the way
 * a cold-started golden-section search could.
 *
 * HARD CONSTRAINT: SUBCRITICALITY. mu > 0, alpha >= 0, beta > 0, and
 * alpha < beta (branching ratio alpha/beta < 1) are enforced by CONSTRUCTING the
 * search space so every candidate the optimizer ever evaluates already satisfies
 * them — never by clamping an unconstrained optimum after the fact. That
 * distinction matters: a post-hoc clamp can return a point whose gradient
 * conditions no longer hold (a clamped projection of an infeasible answer,
 * not a real constrained optimum), whereas a search that only ever visits
 * feasible points returns a genuine constrained optimum. Why subcriticality is
 * non-negotiable: alpha/beta >= 1 makes a Hawkes process's branching structure
 * EXPLOSIVE — the expected total number of "descendant" events per immigrant,
 * 1/(1 - alpha/beta), diverges at alpha/beta=1 and is meaningless above it. Any
 * downstream consumer that extrapolates this module's fit forward (an
 * expected-additional-events estimate, a stability check, a long-horizon
 * simulation) inherits that divergence silently unless subcriticality is
 * structural, not advisory. `alpha < beta` is enforced with a small strict
 * margin (`SUBCRITICALITY_MARGIN`) so equality — the boundary itself, still
 * technically critical, not sub — is never returned even as a floating-point
 * coincidence.
 *
 * OBSERVATION WINDOW T_obs. `refit(windowEvents)` takes only the window's
 * events, no separate window-start parameter. Lacking one, T_obs is taken as the
 * SPAN of the supplied events, [t_1, t_N] with t_1 shifted to a local time origin
 * of 0. Honesty about what that costs: if the caller's actual window (e.g. "last
 * 2 hours") started strictly before t_1, the true "quiet time" preceding the
 * first observed event is not counted in T_obs, which biases the fitted mu
 * slightly HIGH (less quiet time observed per event than the true window
 * contains). This is a documented modelling simplification forced by the given
 * API shape, not an oversight — a caller that wants an exact window boundary
 * accounted for should widen the supplied window rather than relying on this
 * approximation to correct itself.
 *
 * UNITS. The default beta search range [0.001, 100] and the default priors
 * (`DEFAULT_PRIOR_MU = 0.02`, `DEFAULT_PRIOR_BETA = 0.1`) assume the caller's
 * `time` values are in MINUTES. Under that assumption the beta range covers
 * excitation half-lives (ln(2)/beta) from about 0.007 minutes up to ~693
 * minutes — from near-instantaneous to multi-hour clustering — and the default
 * prior (mu = 1 significant move per ~50 minutes of quiet background, half-life
 * ~6.9 minutes for excited clustering) is a plausible starting guess for line-
 * move microstructure, not a fitted constant. Any consistent time unit works;
 * just re-scale `betaSearchMin`/`betaSearchMax`/`priorBeta`/`priorMu` to match
 * (e.g. multiply by 60 for a seconds-based caller).
 *
 * DEFAULTS BEFORE ANY REFIT (and the honest fallback on an under-powered
 * window). A freshly constructed detector, or a `refit()` window with 0 or 1
 * events for a side, cannot estimate excitation at all (you need at least two
 * points to see clustering) and cannot even estimate a rate from a single
 * timestamp with no known window duration. Rather than fabricate a
 * back-of-nothing number, both cases degrade to the configured PRIOR:
 * `priorMu` (documented naive-rate default above), `priorAlpha` (default 0 —
 * "no evidence of self-excitation" is the honest starting position), and
 * `priorBeta` (documented decay-timescale default above). `HawkesFit.
 * logLikelihood` is `null` exactly when the fit is this fallback, never a
 * fabricated number standing in for "not actually fitted."
 *
 * THE SAME PRIOR DOUBLES AS THE TESTING SEED. `HawkesSteamOptions` exposes
 * `priorAlpha` (not just `priorMu`/`priorBeta`) precisely so a caller — in
 * practice, the test suite — can construct a detector with a specific KNOWN
 * fixed (mu,alpha,beta) and drive `observeEvent`/`intensityAt` against it
 * directly, without going through `refit`'s estimation. That is what "initial
 * seed/prior state" means for this module: a deterministic starting (mu,alpha,
 * beta), not an RNG seed. No RNG is used ANYWHERE in this file — fitting is
 * deterministic coordinate ascent (optimization, not sampling), so there is
 * nothing here for a random seed to legitimately parameterise, and the house
 * rule against `Math.random()`/`Date.now()` in module logic is honoured by
 * construction, not by careful avoidance.
 *
 * STEAM SIGNAL AND THE BOUNDED NUDGE. `steamSignal(t)` compares each side's
 * background-subtracted intensity ratio (intensity(t) - mu) / mu against a
 * threshold multiple of mu (`steamThresholdMultiple`, default 3, i.e. "current
 * intensity is more than 3x background above mu"). The side with the larger
 * ratio wins if it clears the threshold; otherwise no side is steaming.
 * `suggestedProbabilityNudge` is a MAGNITUDE (never signed — the caller applies
 * it in the direction of the reported `side`) and is EXPLICITLY BOUNDED at
 * `maxProbabilityNudge` (default 0.05 implied-probability points) regardless of
 * how extreme the underlying ratio is. Why the cap exists and is non-negotiable:
 * a thin/noisy window can produce a spuriously huge alpha or a tight burst can
 * legitimately produce a huge instantaneous A, and unlike the long-run
 * subcriticality guarantee above, NOTHING structurally bounds instantaneous
 * intensity right after a dense cluster — mu + alpha*A can be arbitrarily large
 * for large A. Piping an unbounded function of that straight into a probability
 * adjustment would let one noisy window corrupt a downstream probability by an
 * unbounded amount. The cap is the last line of defense against exactly that,
 * and is enforced by `Math.min`, independent of how the raw ratio is scaled —
 * tests exercise this under an adversarially dense synthetic burst designed to
 * make the uncapped quantity enormous.
 *
 * PURITY. No env vars, no gates, no DB, no network, no `Date.now()`, no
 * `Math.random()`. Every method is a pure function of its explicit arguments and
 * the detector's own prior state; identical call sequences produce bit-identical
 * results.
 *
 * References:
 *   - Hawkes, A. G. (1971). "Spectra of some self-exciting and mutually
 *     exciting point processes." Biometrika 58(1), 83-90.
 *   - Ogata, Y. (1981). "On Lewis' simulation method for point processes."
 *     IEEE Trans. Information Theory 27(1), 23-31 (the log-likelihood and the
 *     thinning-simulation machinery this module's tests independently
 *     replicate for synthetic ground truth).
 */

export type SteamSide = "home" | "away";

/**
 * One caller-classified odds-change event. `time` and `side` are the only
 * fields this module's intensity model reads; `impliedProbDelta` is carried
 * for the caller's own audit trail (see the mark-free design note above) and is
 * intentionally unused by the arrival-time-only model implemented here.
 */
export interface SteamEvent {
  readonly time: number;
  readonly impliedProbDelta: number;
  readonly side: SteamSide;
}

/** Fitted (or defaulted) Hawkes parameters for one side. */
export interface HawkesFit {
  readonly mu: number;
  readonly alpha: number;
  readonly beta: number;
  /** Log-likelihood of this fit on the window it was fitted from, or `null` when this is the prior/default fallback (not an actual fit). */
  readonly logLikelihood: number | null;
  /** Number of events the fit used (0 or 1 implies a prior fallback, never a real fit). */
  readonly fittedEventCount: number;
}

/** Prior / search-space configuration shared by fitting and the detector's initial state. */
export interface HawkesPrior {
  /** Naive background-rate prior, events per time-unit. Default `DEFAULT_PRIOR_MU`. Must be > 0 (else the default is used). */
  readonly priorMu?: number;
  /** Prior self-excitation strength. Default 0 ("no evidence of clustering yet"). Must be >= 0 (else 0 is used) and is clamped below `priorBeta` for subcriticality. */
  readonly priorAlpha?: number;
  /** Prior decay rate, 1/time-unit. Default `DEFAULT_PRIOR_BETA`. Must be > 0 (else the default is used). */
  readonly priorBeta?: number;
  /** Lower bound of the beta search range. Default `BETA_SEARCH_MIN`. */
  readonly betaSearchMin?: number;
  /** Upper bound of the beta search range. Default `BETA_SEARCH_MAX`. */
  readonly betaSearchMax?: number;
}

/** Options for the standalone fitter `fitHawkesToWindow`. */
export type HawkesFitOptions = HawkesPrior;

/** Options for `HawkesSteamDetector`. */
export interface HawkesSteamOptions extends HawkesPrior {
  /** Steam threshold, as a multiple of mu. Default `DEFAULT_STEAM_THRESHOLD_MULTIPLE` (3x). Must be > 0 (else the default is used). */
  readonly steamThresholdMultiple?: number;
  /** Hard cap on the suggested probability nudge, in implied-probability units. Default `DEFAULT_MAX_PROBABILITY_NUDGE` (0.05). Must be >= 0 (else the default is used). */
  readonly maxProbabilityNudge?: number;
}

/** Structured verdict from `HawkesSteamDetector.steamSignal`. */
export interface SteamSignal {
  /** Which side is steaming, or `null` if neither clears the threshold. */
  readonly side: SteamSide | null;
  /** (intensity - mu) / mu for the winning side, or 0 when `side` is `null`. */
  readonly magnitude: number;
  readonly homeIntensity: number;
  readonly awayIntensity: number;
  readonly homeMu: number;
  readonly awayMu: number;
  /** The threshold multiple actually used (echoes the detector's configuration). */
  readonly thresholdMultiple: number;
  /**
   * Magnitude-only suggested shift in implied probability, in [0, maxProbabilityNudge].
   * Always 0 when `side` is `null`. The CALLER applies direction (toward `side`).
   */
  readonly suggestedProbabilityNudge: number;
}

// ============================================================
// Defaults / constants
// ============================================================

/** Naive background-rate prior (events per time-unit; assumes minutes — see UNITS above). */
export const DEFAULT_PRIOR_MU = 0.02;
/** Decay-rate prior (1/time-unit). Half-life ln(2)/beta ~= 6.9 time-units. */
export const DEFAULT_PRIOR_BETA = 0.1;
export const BETA_SEARCH_MIN = 0.001;
export const BETA_SEARCH_MAX = 100;
export const DEFAULT_STEAM_THRESHOLD_MULTIPLE = 3;
export const DEFAULT_MAX_PROBABILITY_NUDGE = 0.05;

/** Strict margin below 1 for the branching ratio alpha/beta, so equality (still critical) is never returned. */
const SUBCRITICALITY_MARGIN = 1e-6;

/** Deterministic search-space sizing (see the fitting-method header section for rationale). */
const BETA_GRID_POINTS = 24;
const ALPHA_GRID_POINTS = 20;
const REFINE_ITERATIONS = 30;
const COORD_ASCENT_ROUNDS = 2;

/** Bracket-safeguarded Newton solver for mu (see the mu-FOC header section). */
const MU_SOLVE_FLOOR = 1e-9;
const MU_SOLVE_MAX_ITERATIONS = 100;
const MU_SOLVE_ABS_TOLERANCE = 1e-12;
const MU_SOLVE_X_TOLERANCE = 1e-13;

/**
 * Suggested-nudge scale: implied-probability points per unit of (ratio -
 * threshold) "excess". This slope is a UX tuning knob with NO honesty content —
 * only the cap (`maxProbabilityNudge`) is safety-critical (see the header note on
 * the bounded nudge). Any positive finite value here keeps the module's safety
 * property (bounded output) intact.
 */
const NUDGE_SCALE_PER_EXCESS_UNIT = 0.01;

function clampTo(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

interface ResolvedPrior {
  readonly priorMu: number;
  readonly priorAlpha: number;
  readonly priorBeta: number;
  readonly betaSearchMin: number;
  readonly betaSearchMax: number;
}

/**
 * Resolve caller-supplied prior/search-space options into a fully-defined,
 * internally-consistent configuration: invalid or missing fields fall back to
 * documented defaults, and `priorAlpha` is clamped below `priorBeta` so the
 * PRIOR itself never violates subcriticality (the hard constraint applies to the
 * starting point, not just to fitted results).
 */
function resolvePrior(options: HawkesPrior): ResolvedPrior {
  let betaSearchMin = positiveOr(options.betaSearchMin, BETA_SEARCH_MIN);
  let betaSearchMax = positiveOr(options.betaSearchMax, BETA_SEARCH_MAX);
  if (!(betaSearchMax > betaSearchMin)) {
    betaSearchMin = BETA_SEARCH_MIN;
    betaSearchMax = BETA_SEARCH_MAX;
  }
  const priorBeta = clampTo(positiveOr(options.priorBeta, DEFAULT_PRIOR_BETA), betaSearchMin, betaSearchMax);
  const priorMu = positiveOr(options.priorMu, DEFAULT_PRIOR_MU);
  const priorAlphaRaw = options.priorAlpha;
  const priorAlphaNonNegative =
    priorAlphaRaw !== undefined && Number.isFinite(priorAlphaRaw) && priorAlphaRaw >= 0 ? priorAlphaRaw : 0;
  const priorAlpha = Math.min(priorAlphaNonNegative, priorBeta * (1 - SUBCRITICALITY_MARGIN));
  return { priorMu, priorAlpha, priorBeta, betaSearchMin, betaSearchMax };
}

// ============================================================
// The recursive excitation statistic (§1 in the header)
// ============================================================

/**
 * Pre-event decay statistic A_i for every event in `shiftedSortedTimes`
 * (ascending, first element assumed to be the local time origin 0), given a
 * fixed beta. `A_before[i]` is the value the O(1) recursion in `observeEvent`
 * implements: the decayed sum of all STRICTLY EARLIER events' contributions,
 * NOT including event i itself — i.e. exactly `lambda(t_i-) - mu` divided by
 * alpha. Used both by the fitter (which needs it once per beta candidate,
 * reused across many alpha candidates) and, indirectly via `replayDecayState`,
 * to seed the detector's live recursive state after a refit.
 */
function computeABefore(shiftedSortedTimes: readonly number[], beta: number): number[] {
  const result: number[] = [];
  let a = 0;
  let prevTime = 0;
  for (let i = 0; i < shiftedSortedTimes.length; i++) {
    const t = shiftedSortedTimes[i];
    if (t === undefined) continue; // unreachable given the loop bound; noUncheckedIndexedAccess guard
    const decayed = i === 0 ? 0 : a * Math.exp(-beta * (t - prevTime));
    result.push(decayed);
    a = decayed + 1;
    prevTime = t;
  }
  return result;
}

/**
 * Replay a side's window events through the O(1) recursion at a FIXED beta to
 * produce the live runtime state (`decayStat`, `lastTime`) a freshly-refit
 * detector should carry forward. This is what keeps `observeEvent`'s O(1)
 * updates numerically consistent across a `refit` that changes beta: the
 * recursive identity assumes a constant beta between updates, so after any
 * refit the decay statistic is rebuilt from the SAME window the new beta was
 * fitted on, rather than decayed forward under a beta it was never valid for.
 */
function replayDecayState(
  sortedTimes: readonly number[],
  beta: number,
): { readonly decayStat: number; readonly lastTime: number | null } {
  if (sortedTimes.length === 0) return { decayStat: 0, lastTime: null };
  let a = 0;
  let prev: number | undefined = sortedTimes[0];
  if (prev === undefined) return { decayStat: 0, lastTime: null }; // unreachable given the length check
  for (let i = 0; i < sortedTimes.length; i++) {
    const t = sortedTimes[i];
    if (t === undefined) continue; // unreachable given the loop bound
    const decayed = i === 0 ? 0 : a * Math.exp(-beta * (t - prev));
    a = decayed + 1;
    prev = t;
  }
  return { decayStat: a, lastTime: prev };
}

// ============================================================
// Log-likelihood (Ogata 1981) — single source of truth
// ============================================================

/**
 * Exact Hawkes log-likelihood given precomputed pre-event decay statistics.
 * Internal fast path (reuses `aBefore`, which the fitter caches per beta across
 * many alpha/mu candidates); `hawkesWindowLogLikelihood` below is the public,
 * self-contained equivalent that recomputes everything from raw times, and both
 * route through this one formula so they cannot diverge.
 */
function logLikelihoodFromABefore(
  aBefore: readonly number[],
  shiftedSortedTimes: readonly number[],
  tObs: number,
  mu: number,
  alpha: number,
  beta: number,
): number {
  let sumLog = 0;
  for (const a of aBefore) sumLog += Math.log(mu + alpha * a);
  let compensatorExcite = 0;
  for (const t of shiftedSortedTimes) compensatorExcite += 1 - Math.exp(-beta * (tObs - t));
  return sumLog - mu * tObs - (alpha / beta) * compensatorExcite;
}

/**
 * Public, self-contained Hawkes log-likelihood for a window of (unsorted,
 * possibly-unshifted) event times against explicit (mu,alpha,beta). This is the
 * SAME formula `fitHawkesToWindow` maximises internally — exported specifically
 * so a test suite can run an independent brute-force grid search over it and
 * compare against the fitted optimum without re-deriving (or risking a
 * divergent re-implementation of) the likelihood itself. Returns `null` for
 * structurally invalid input: fewer than 1 event, a non-positive observation
 * span (all events at the same instant), or parameters outside the hard
 * constraints (mu>0, alpha>=0, beta>0).
 */
export function hawkesWindowLogLikelihood(
  times: readonly number[],
  mu: number,
  alpha: number,
  beta: number,
): number | null {
  if (!(mu > 0) || !(alpha >= 0) || !(beta > 0)) return null;
  const sorted = times.filter((t) => Number.isFinite(t)).slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  const t0 = sorted[0];
  const tLast = sorted[n - 1];
  if (t0 === undefined || tLast === undefined) return null; // unreachable given n > 0
  const tObs = tLast - t0;
  if (!(tObs > 0)) return null;
  const shifted = sorted.map((t) => t - t0);
  const aBefore = computeABefore(shifted, beta);
  return logLikelihoodFromABefore(aBefore, shifted, tObs, mu, alpha, beta);
}

// ============================================================
// mu first-order-condition solver (exact; see header)
// ============================================================

/**
 * Solve `sum_i 1/(mu + alpha*A_i) = T_obs` for mu > 0 — the exact first-order
 * condition of the log-likelihood in mu, for FIXED (alpha,beta). Closed-form
 * (mu = N/T_obs, the Poisson MLE) when alpha = 0; otherwise the left-hand side
 * is strictly decreasing in mu (see header), so a bracket-safeguarded Newton
 * iteration converges to the unique root to a tight tolerance.
 */
function solveMuExact(aBefore: readonly number[], alpha: number, tObs: number): number {
  const n = aBefore.length;
  if (n === 0) return MU_SOLVE_FLOOR; // unreachable via fitHawkesToWindow (n >= 2 there)
  if (alpha === 0) return n / tObs;

  const g = (mu: number): number => {
    let s = 0;
    for (const a of aBefore) s += 1 / (mu + alpha * a);
    return s - tObs;
  };
  const dg = (mu: number): number => {
    let s = 0;
    for (const a of aBefore) {
      const denom = mu + alpha * a;
      s += -1 / (denom * denom);
    }
    return s;
  };

  let lo = MU_SOLVE_FLOOR;
  let hi = Math.max(2 * (n / tObs), MU_SOLVE_FLOOR * 2);
  for (let guard = 0; guard < 200 && g(hi) > 0; guard++) hi *= 2;

  let mu = (lo + hi) / 2;
  for (let i = 0; i < MU_SOLVE_MAX_ITERATIONS; i++) {
    const gv = g(mu);
    if (gv > 0) lo = mu;
    else hi = mu;
    if (Math.abs(gv) <= MU_SOLVE_ABS_TOLERANCE || hi - lo <= MU_SOLVE_X_TOLERANCE * Math.max(1, hi)) {
      return mu;
    }
    const slope = dg(mu);
    let next = slope !== 0 ? mu - gv / slope : Number.NaN;
    if (!Number.isFinite(next) || next <= lo || next >= hi) next = (lo + hi) / 2;
    mu = next;
  }
  return mu;
}

function logLikelihoodGivenAlphaBeta(
  aBefore: readonly number[],
  shiftedSortedTimes: readonly number[],
  tObs: number,
  alpha: number,
  beta: number,
): { readonly mu: number; readonly ll: number } {
  const mu = solveMuExact(aBefore, alpha, tObs);
  const ll = logLikelihoodFromABefore(aBefore, shiftedSortedTimes, tObs, mu, alpha, beta);
  return { mu, ll };
}

// ============================================================
// Golden-section maximizer (local polish only — see header)
// ============================================================

/**
 * Golden-section search for the maximizer of `f` on `[lo, hi]`. Used ONLY to
 * polish a candidate already found by an exhaustive coarse grid (see
 * `bestGivenBeta` / `fitViaCoordinateAscent`) — the grid is what protects
 * against a non-unimodal likelihood surface; this only needs local good
 * behaviour near the grid's winner, not global unimodality.
 */
function goldenSectionMaximize(f: (x: number) => number, lo: number, hi: number, iterations: number): number {
  const invPhi = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  if (!(b > a)) return a;
  let c = b - invPhi * (b - a);
  let d = a + invPhi * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < iterations && b > a; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - invPhi * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + invPhi * (b - a);
      fd = f(d);
    }
  }
  const mid = (a + b) / 2;
  const fmid = f(mid);
  if (fmid >= fc && fmid >= fd) return mid;
  return fc >= fd ? c : d;
}

// ============================================================
// Coordinate ascent fitter
// ============================================================

/** Profile out alpha (and, within that, mu) for one fixed beta candidate. */
function bestGivenBeta(
  shiftedSortedTimes: readonly number[],
  tObs: number,
  beta: number,
): { readonly alpha: number; readonly mu: number; readonly ll: number } {
  const aBefore = computeABefore(shiftedSortedTimes, beta);
  const alphaMax = beta * (1 - SUBCRITICALITY_MARGIN);
  const objective = (alpha: number): number =>
    logLikelihoodGivenAlphaBeta(aBefore, shiftedSortedTimes, tObs, alpha, beta).ll;

  let bestAlpha = 0;
  let bestLL = Number.NEGATIVE_INFINITY;
  const step = alphaMax / (ALPHA_GRID_POINTS - 1);
  for (let k = 0; k < ALPHA_GRID_POINTS; k++) {
    const alpha = step * k;
    const ll = objective(alpha);
    if (ll > bestLL) {
      bestLL = ll;
      bestAlpha = alpha;
    }
  }

  const lo = Math.max(0, bestAlpha - step);
  const hi = Math.min(alphaMax, bestAlpha + step);
  const refinedAlpha = goldenSectionMaximize(objective, lo, hi, REFINE_ITERATIONS);
  const refinedLL = objective(refinedAlpha);
  const finalAlpha = refinedLL > bestLL ? refinedAlpha : bestAlpha;
  const finalLL = Math.max(bestLL, refinedLL);
  const finalMu = logLikelihoodGivenAlphaBeta(aBefore, shiftedSortedTimes, tObs, finalAlpha, beta).mu;

  return { alpha: finalAlpha, mu: finalMu, ll: finalLL };
}

/** Full (mu,alpha,beta) coordinate-ascent search — see the fitting-method header section. */
function fitViaCoordinateAscent(
  shiftedSortedTimes: readonly number[],
  tObs: number,
  betaMin: number,
  betaMax: number,
): { readonly mu: number; readonly alpha: number; readonly beta: number; readonly logLikelihood: number } {
  const logMin = Math.log(betaMin);
  const logMax = Math.log(betaMax);
  const logStep = (logMax - logMin) / (BETA_GRID_POINTS - 1);

  let bestBeta = betaMin;
  let best = bestGivenBeta(shiftedSortedTimes, tObs, betaMin);
  for (let k = 1; k < BETA_GRID_POINTS; k++) {
    const beta = Math.exp(logMin + logStep * k);
    const res = bestGivenBeta(shiftedSortedTimes, tObs, beta);
    if (res.ll > best.ll) {
      best = res;
      bestBeta = beta;
    }
  }

  let beta = bestBeta;
  let current = best;
  const stepRatio = Math.exp(Math.max(logStep, 1e-6));
  for (let round = 0; round < COORD_ASCENT_ROUNDS; round++) {
    const lo = Math.max(betaMin, beta / stepRatio);
    const hi = Math.min(betaMax, beta * stepRatio);
    const objective = (b: number): number => bestGivenBeta(shiftedSortedTimes, tObs, b).ll;
    const refinedBeta = goldenSectionMaximize(objective, lo, hi, REFINE_ITERATIONS);
    const refined = bestGivenBeta(shiftedSortedTimes, tObs, refinedBeta);
    if (refined.ll > current.ll) {
      beta = refinedBeta;
      current = refined;
    }
  }

  return { mu: current.mu, alpha: current.alpha, beta, logLikelihood: current.ll };
}

/**
 * Fit a single side's Hawkes parameters to a window of event times via
 * coordinate ascent (see the module header for the full derivation). Degrades
 * honestly to the resolved prior — `logLikelihood: null` — for 0 or 1 events, or
 * for a window whose span collapses to (numerically) zero; never throws, never
 * divides by zero.
 */
export function fitHawkesToWindow(times: readonly number[], options: HawkesFitOptions = {}): HawkesFit {
  const prior = resolvePrior(options);
  const sorted = times.filter((t) => Number.isFinite(t)).slice().sort((a, b) => a - b);
  const n = sorted.length;
  const fallback: HawkesFit = {
    mu: prior.priorMu,
    alpha: prior.priorAlpha,
    beta: prior.priorBeta,
    logLikelihood: null,
    fittedEventCount: n,
  };
  if (n < 2) return fallback;

  const t0 = sorted[0];
  const tLast = sorted[n - 1];
  if (t0 === undefined || tLast === undefined) return fallback; // unreachable given n >= 2
  const tObs = tLast - t0;
  if (!(tObs > 0)) return fallback;

  const shifted = sorted.map((t) => t - t0);
  const fit = fitViaCoordinateAscent(shifted, tObs, prior.betaSearchMin, prior.betaSearchMax);
  return { mu: fit.mu, alpha: fit.alpha, beta: fit.beta, logLikelihood: fit.logLikelihood, fittedEventCount: n };
}

// ============================================================
// The detector
// ============================================================

interface SideState {
  readonly fit: HawkesFit;
  /** Post-last-event decay statistic A (see header §1); 0 before any event. */
  readonly decayStat: number;
  /** Time of the last observed event (via `observeEvent` or the last `refit` window); null before any. */
  readonly lastTime: number | null;
}

function extractSortedTimes(events: readonly SteamEvent[], side: SteamSide): number[] {
  const times: number[] = [];
  for (const e of events) {
    if (e.side === side && Number.isFinite(e.time)) times.push(e.time);
  }
  times.sort((a, b) => a - b);
  return times;
}

function boundedNudge(magnitude: number, threshold: number, maxNudge: number): number {
  const excess = Math.max(0, magnitude - threshold);
  return Math.min(maxNudge, NUDGE_SCALE_PER_EXCESS_UNIT * excess);
}

/**
 * Per-side Hawkes steam detector. See the module header for the full model,
 * fitting method, and safety-property derivations. Stateful (mirrors this
 * package's other online detectors, e.g. `TeamStrengthFilter`): `observeEvent`
 * and `refit` mutate the instance; `intensityAt` and `steamSignal` are
 * read-only queries.
 */
export class HawkesSteamDetector {
  private readonly prior: ResolvedPrior;
  private readonly steamThresholdMultiple: number;
  private readonly maxProbabilityNudge: number;
  private homeState: SideState;
  private awayState: SideState;

  constructor(options: HawkesSteamOptions = {}) {
    this.prior = resolvePrior(options);
    this.steamThresholdMultiple = positiveOr(options.steamThresholdMultiple, DEFAULT_STEAM_THRESHOLD_MULTIPLE);
    const nudgeRaw = options.maxProbabilityNudge;
    this.maxProbabilityNudge =
      nudgeRaw !== undefined && Number.isFinite(nudgeRaw) && nudgeRaw >= 0 ? nudgeRaw : DEFAULT_MAX_PROBABILITY_NUDGE;

    const initialFit: HawkesFit = {
      mu: this.prior.priorMu,
      alpha: this.prior.priorAlpha,
      beta: this.prior.priorBeta,
      logLikelihood: null,
      fittedEventCount: 0,
    };
    this.homeState = { fit: initialFit, decayStat: 0, lastTime: null };
    this.awayState = { fit: initialFit, decayStat: 0, lastTime: null };
  }

  private stateFor(side: SteamSide): SideState {
    return side === "home" ? this.homeState : this.awayState;
  }

  private setStateFor(side: SteamSide, state: SideState): void {
    if (side === "home") this.homeState = state;
    else this.awayState = state;
  }

  /** Current (mu,alpha,beta,...) fit for a side — for introspection/testing. */
  getFit(side: SteamSide): HawkesFit {
    return this.stateFor(side).fit;
  }

  /**
   * Fold one new event into a side's O(1) recursive state. Returns the
   * PRE-event intensity (out-of-sample: computed from history strictly before
   * this event, matching this package's "report the pre-update forecast"
   * convention — see forecast-skill-eprocess.ts). Throws `RangeError` on a
   * non-finite `time` (a caller bug, not a data-quality edge case — see
   * `team-strength-filter.ts`'s "structural misuse throws" precedent).
   */
  observeEvent(time: number, side: SteamSide): number {
    if (!Number.isFinite(time)) {
      throw new RangeError(`HawkesSteamDetector.observeEvent: time must be finite, got ${time}`);
    }
    const state = this.stateFor(side);
    const elapsed = state.lastTime === null ? 0 : Math.max(0, time - state.lastTime);
    const decayedBefore = state.lastTime === null ? 0 : state.decayStat * Math.exp(-state.fit.beta * elapsed);
    const preEventIntensity = state.fit.mu + state.fit.alpha * decayedBefore;
    this.setStateFor(side, { fit: state.fit, decayStat: decayedBefore + 1, lastTime: time });
    return preEventIntensity;
  }

  /**
   * Read-only intensity query at an arbitrary time, using the current fit and
   * the current O(1) recursive state (no history rescan). Out-of-order queries
   * (time before the last observed event) clamp elapsed time at 0 rather than
   * decaying "backward" — this returns the intensity as of the last event
   * rather than an unphysical extrapolation. Throws `RangeError` on a
   * non-finite `time`.
   */
  intensityAt(time: number, side: SteamSide): number {
    if (!Number.isFinite(time)) {
      throw new RangeError(`HawkesSteamDetector.intensityAt: time must be finite, got ${time}`);
    }
    const state = this.stateFor(side);
    if (state.lastTime === null) return state.fit.mu;
    const elapsed = Math.max(0, time - state.lastTime);
    const decayed = state.decayStat * Math.exp(-state.fit.beta * elapsed);
    return state.fit.mu + state.fit.alpha * decayed;
  }

  /**
   * Re-estimate (mu,alpha,beta) per side from a caller-supplied window (e.g.
   * "last 2 hours") via coordinate ascent, and rebuild the O(1) recursive state
   * from that same window at the newly-fitted beta (see `replayDecayState`'s
   * doc for why this replay is required whenever beta can change). Never
   * throws; a side with 0 or 1 events in the window degrades honestly to the
   * configured prior (see `fitHawkesToWindow`).
   */
  refit(windowEvents: readonly SteamEvent[]): void {
    const homeTimes = extractSortedTimes(windowEvents, "home");
    const awayTimes = extractSortedTimes(windowEvents, "away");
    this.setStateFor("home", this.buildSideState(homeTimes));
    this.setStateFor("away", this.buildSideState(awayTimes));
  }

  private buildSideState(sortedTimes: readonly number[]): SideState {
    const fit = fitHawkesToWindow(sortedTimes, this.prior);
    const { decayStat, lastTime } = replayDecayState(sortedTimes, fit.beta);
    return { fit, decayStat, lastTime };
  }

  /**
   * Compare each side's background-subtracted intensity ratio against
   * `steamThresholdMultiple` (default 3x mu) and report which side (if either)
   * is steaming, with a magnitude and an EXPLICITLY BOUNDED suggested
   * probability nudge (see the module header's "bounded nudge" section for why
   * the cap is safety-critical, not cosmetic).
   */
  steamSignal(time: number): SteamSignal {
    const homeIntensity = this.intensityAt(time, "home");
    const awayIntensity = this.intensityAt(time, "away");
    const homeMu = this.homeState.fit.mu;
    const awayMu = this.awayState.fit.mu;
    const homeRatio = (homeIntensity - homeMu) / homeMu;
    const awayRatio = (awayIntensity - awayMu) / awayMu;
    const threshold = this.steamThresholdMultiple;

    let side: SteamSide | null = null;
    let magnitude = 0;
    if (homeRatio >= threshold && homeRatio >= awayRatio) {
      side = "home";
      magnitude = homeRatio;
    } else if (awayRatio >= threshold) {
      side = "away";
      magnitude = awayRatio;
    }

    const suggestedProbabilityNudge =
      side === null ? 0 : boundedNudge(magnitude, threshold, this.maxProbabilityNudge);

    return {
      side,
      magnitude,
      homeIntensity,
      awayIntensity,
      homeMu,
      awayMu,
      thresholdMultiple: threshold,
      suggestedProbabilityNudge,
    };
  }
}
