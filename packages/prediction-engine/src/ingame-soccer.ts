/**
 * In-game soccer win probability — R&D, offline only, `priced:false`.
 *
 * Ported from arXiv:1906.05029 (Robberechts, Van Haaren & Davis, "A Bayesian
 * Approach to In-Game Win Probability in Soccer," KDD '21). See
 * docs/ops/edge/extraction/2026-08-26-group-batch3.md §1(b) lane 2 for the
 * full port plan and what's deferred.
 *
 * The paper models each team's FUTURE goals after time t as independent
 * Poissons, `y_{>t,side} ~ Pois((T-t)·θ_{t,side})`, convolved with the
 * current score to get win/draw/loss — the t=0 boundary case of that model
 * IS the pregame independent-Poisson path GSE already has
 * (`poisson.ts`'s `moneylineProbabilities`), which `inGameWinProbability`
 * below is proven (see its test file) to reduce to exactly when frame=0 and
 * the current score is 0-0. This module is the extension, not a rewrite.
 *
 * Three mechanisms ported, all needing no event-stream data rights:
 *   (i)   `percentTimeFrame` — their T=100 percent-time normalization with
 *         halftime pinned at frame 50 (§3.2).
 *   (ii)  `randomWalkSmooth` — a closed-form Kalman filter + Rauch-Tung-
 *         Striebel smoother for a scalar local-level (random-walk) model,
 *         the "penalized-likelihood equivalent" their own spec permits in
 *         place of full ADVI/MCMC (§3.1/§3.3: `α_t ~ N(α_{t-1}, σ²)` shares
 *         statistical strength across adjacent frames so rare states — a
 *         red card in minute 1 — still get sane estimates).
 *   (iii) `inGameRateFactor` — their structural link,
 *         `θ_t = invlogit(α·x_t + β + Ha·1[home])`, on the SIMPLIFIED
 *         feature set their own §4.4 ablation validates as nearly as good
 *         as the full event-stream model (score diff, time, cards, Elo
 *         diff) — all obtainable from GSE's existing ESPN results path.
 *
 * What is deliberately NOT here: fitting `inGameRateFactor`'s coefficients
 * or `randomWalkSmooth`'s per-frame observations from real data. That needs
 * multiple seasons of settled soccer finals+cards GSE has not archived yet
 * (the ledger's own note: "start the archive now, fit later"). Everything
 * below is the pure, already-testable math core; the fit pipeline is a
 * separate, data-gated increment.
 *
 * Pure. No I/O.
 */

import { poissonPmf } from "./poisson.js";

// ---------------------------------------------------------------------------
// (i) Percent-time normalization, halftime pinned at frame 50.
// ---------------------------------------------------------------------------

export interface MatchClock {
  readonly half: 1 | 2;
  /** Elapsed minutes within this half, including any stoppage time (0 at kickoff / second-half restart). */
  readonly minute: number;
  /** Regulation length of one half in minutes. Default 45. */
  readonly regulationHalfMinutes?: number;
  /**
   * Assumed ceiling on added/stoppage time for this half, in minutes.
   * Default 6. The source paper's real-time deployment estimates this
   * per-match via a trained regressor (their App. A.1, MAE ~46-59s) — GSE
   * has no such model, so this is an honest, documented linear cap, not a
   * port of their stoppage-time estimator.
   */
  readonly maxStoppageMinutes?: number;
}

/**
 * Map a match clock onto a T=100 percent-time frame: half 1 spans [0,50],
 * half 2 spans [50,100], halftime pinned at exactly frame 50. Within a half,
 * minutes map linearly across `[0, regulationHalfMinutes + maxStoppageMinutes]`
 * → the half's 50-wide span; minutes beyond that ceiling saturate at the
 * half's upper boundary rather than overshooting into (or past) the other
 * half's span. Monotonic non-decreasing in `minute`.
 */
export function percentTimeFrame(clock: MatchClock): number {
  if (clock.half !== 1 && clock.half !== 2) throw new RangeError("half must be 1 or 2");
  const reg = clock.regulationHalfMinutes ?? 45;
  const maxStoppage = clock.maxStoppageMinutes ?? 6;
  if (!(reg > 0)) throw new RangeError("regulationHalfMinutes must be > 0");
  if (!(maxStoppage >= 0)) throw new RangeError("maxStoppageMinutes must be >= 0");
  if (!Number.isFinite(clock.minute) || clock.minute < 0) throw new RangeError("minute must be finite and >= 0");

  const span = reg + maxStoppage;
  const minute = Math.min(clock.minute, span);
  const within = (minute / span) * 50;
  const base = clock.half === 1 ? 0 : 50;
  return base + within;
}

// ---------------------------------------------------------------------------
// (ii) Random-walk smoother for time-varying coefficients across frames.
// ---------------------------------------------------------------------------

export interface FrameObservation {
  /** An independently-estimated value at this frame (e.g. a per-frame coefficient or log-odds fit). */
  readonly value: number;
  /** That estimate's own variance. Must be finite and > 0 — a noiseless observation should pass a small positive floor, never 0 (see below). */
  readonly variance: number;
}

export interface SmoothedFrame {
  readonly value: number;
  readonly variance: number;
}

/**
 * Random-walk (local-level) Kalman filter + Rauch-Tung-Striebel smoother —
 * the closed-form, non-probabilistic-programming equivalent of the source
 * paper's `α_t ~ N(α_{t-1}, processVariance)` prior (their literature
 * default processVariance = 2). Shares statistical strength across adjacent
 * frames: a single noisy or sparse-data frame gets pulled toward its
 * well-estimated neighbors rather than reported at face value.
 *
 * `priorValue`/`priorVariance` seed frame 0 (their `α_0 ~ N(0,2)` analogue).
 * A `variance` of exactly 0 would make that frame an unmovable anchor that
 * silently overrides the smoother's output at every OTHER frame too (via
 * backward propagation) — callers with a genuinely noiseless observation
 * must pass a small positive floor instead, never 0; this function throws
 * rather than accept one, so that failure mode can't happen silently.
 *
 * Returns one smoothed `{value, variance}` per input observation, same
 * order. Exact for a linear-Gaussian local-level model — no iterative
 * optimization, no randomness.
 */
export function randomWalkSmooth(
  observations: readonly FrameObservation[],
  processVariance: number,
  priorValue = 0,
  priorVariance = 2,
): SmoothedFrame[] {
  const n = observations.length;
  if (n === 0) throw new RangeError("randomWalkSmooth requires at least one observation");
  if (!(processVariance > 0) || !Number.isFinite(processVariance)) throw new RangeError("processVariance must be finite and > 0");
  if (!(priorVariance > 0) || !Number.isFinite(priorVariance)) throw new RangeError("priorVariance must be finite and > 0");
  if (!Number.isFinite(priorValue)) throw new RangeError("priorValue must be finite");
  for (const o of observations) {
    if (!Number.isFinite(o.value)) throw new RangeError("each observation value must be finite");
    if (!(o.variance > 0) || !Number.isFinite(o.variance)) throw new RangeError("each observation variance must be finite and > 0");
  }

  // Forward pass (Kalman filter). `predicted[t]`/`predictedVar[t]` are the
  // one-step-ahead prediction BEFORE seeing frame t's observation — kept
  // because the backward smoother needs them.
  const filtered = new Array<number>(n);
  const filteredVar = new Array<number>(n);
  const predicted = new Array<number>(n);
  const predictedVar = new Array<number>(n);

  let prevValue = priorValue;
  let prevVar = priorVariance;
  for (let t = 0; t < n; t++) {
    const predVal = prevValue;
    const predVar = prevVar + processVariance;
    predicted[t] = predVal;
    predictedVar[t] = predVar;
    const obs = observations[t]!;
    const gain = predVar / (predVar + obs.variance);
    const filtVal = predVal + gain * (obs.value - predVal);
    const filtVar = (1 - gain) * predVar;
    filtered[t] = filtVal;
    filteredVar[t] = filtVar;
    prevValue = filtVal;
    prevVar = filtVar;
  }

  // Backward pass (RTS smoother).
  const smoothed = new Array<number>(n);
  const smoothedVar = new Array<number>(n);
  smoothed[n - 1] = filtered[n - 1]!;
  smoothedVar[n - 1] = filteredVar[n - 1]!;
  for (let t = n - 2; t >= 0; t--) {
    const c = filteredVar[t]! / predictedVar[t + 1]!;
    smoothed[t] = filtered[t]! + c * (smoothed[t + 1]! - predicted[t + 1]!);
    smoothedVar[t] = filteredVar[t]! + c * c * (smoothedVar[t + 1]! - predictedVar[t + 1]!);
  }

  return observations.map((_, t) => ({ value: smoothed[t]!, variance: Math.max(0, smoothedVar[t]!) }));
}

// ---------------------------------------------------------------------------
// (iii) Structural link — θ_t = invlogit(α·x_t + β + Ha·1[home]).
// ---------------------------------------------------------------------------

export interface ThetaFeatures {
  /** Current score differential, home minus away. */
  readonly scoreDiff: number;
  /** Percent-time frame, [0,100] (see percentTimeFrame). */
  readonly frame: number;
  /** Red/yellow-card-weighted differential, home minus away (caller's own weighting). */
  readonly cardDiff: number;
  /** Pre-game strength differential, home minus away (e.g. Elo rating diff). */
  readonly eloDiff: number;
}

export interface ThetaCoefficients {
  readonly scoreDiff: number;
  readonly frame: number;
  readonly cardDiff: number;
  readonly eloDiff: number;
  readonly intercept: number;
  readonly homeAdvantage: number;
}

/**
 * `θ_t = invlogit(α·x_t + β + Ha·1[home])` — the paper's structural link
 * (§3.1), rescaled from their raw invlogit range `(0,1)` to `(0,2)` so it
 * composes as a MULTIPLIER on a side's ordinary pregame full-match rate
 * (`thetaHome/thetaAway` for `inGameWinProbability`) rather than a hard
 * ceiling of 1 goal/match. This rescale is this module's own adaptation for
 * composability with GSE's existing pregame lambda scale (`team-rates.ts`),
 * not a claim about the paper's own units. At `eta = 0` (every feature and
 * coefficient — including home advantage — exactly zero) the factor is
 * exactly 1.0: no adjustment from the baseline rate.
 *
 * This function does not fit `coefficients` from data — that is a separate,
 * data-gated increment (see module docstring). It only evaluates the link
 * given coefficients a caller already has, the same division of labor as
 * `eloWinProbability` (computes from ratings) vs `updateEloRatings` (fits
 * them).
 */
export function inGameRateFactor(features: ThetaFeatures, coefficients: ThetaCoefficients, isHome: boolean): number {
  const eta =
    coefficients.scoreDiff * features.scoreDiff +
    coefficients.frame * features.frame +
    coefficients.cardDiff * features.cardDiff +
    coefficients.eloDiff * features.eloDiff +
    coefficients.intercept +
    (isHome ? coefficients.homeAdvantage : 0);
  return 2 / (1 + Math.exp(-eta));
}

// ---------------------------------------------------------------------------
// In-game win probability — future-goals Poisson convolved with the current score.
// ---------------------------------------------------------------------------

export interface InGameState {
  /** Percent-time frame, [0,100] (see percentTimeFrame). */
  readonly frame: number;
  readonly currentHomeGoals: number;
  readonly currentAwayGoals: number;
  /**
   * Each side's FUTURE scoring rate, on the same scale as an ordinary
   * full-match pregame lambda (e.g. `team-rates.ts`'s `estimateMatchupLambdas`)
   * — this function scales it down by the fraction of match time still
   * remaining. Equivalent to the paper's own per-frame θ_t rescaled by 100
   * (their `(T-t)·θ_t` in frame-count units = `remainingFraction·thetaHere`
   * in full-match units); see the module docstring for why this scale was
   * chosen. `inGameRateFactor` composes with this as a multiplier on a
   * side's baseline pregame lambda.
   */
  readonly thetaHome: number;
  readonly thetaAway: number;
}

export interface InGameProbabilities {
  readonly home: number;
  readonly draw: number;
  readonly away: number;
  /** home + draw + away — may be slightly under 1 when maxFutureGoals truncates the tail. */
  readonly coverage: number;
  /** Fraction of the match clock still remaining, `(100-frame)/100`, in [0,1]. */
  readonly remainingFraction: number;
}

/**
 * In-game win/draw/loss probabilities: convolve each side's remaining-time
 * future-goals Poisson with the ALREADY-OBSERVED current score. At
 * `frame=0` with `currentHomeGoals=currentAwayGoals=0`, this reduces
 * EXACTLY to `poisson.ts`'s pregame `moneylineProbabilities(thetaHome,
 * thetaAway, maxFutureGoals)` — the paper's own point (§1): in-game win
 * probability is a strict generalization of the pregame model, not a
 * separate one. See the test file for the exact-equality proof.
 *
 * A non-positive `thetaHome`/`thetaAway` yields all-zero mass for that
 * side's future goals (via `poissonPmf`'s own convention — never treated as
 * "certainly no more goals," matching how the existing pregame path already
 * treats a non-positive lambda as "no opinion," not a valid deterministic
 * rate) and thus `coverage=0` for the whole result — an honest no-opinion
 * signal, not a fabricated one.
 */
export function inGameWinProbability(state: InGameState, maxFutureGoals = 8): InGameProbabilities {
  if (!(state.frame >= 0 && state.frame <= 100) || !Number.isFinite(state.frame)) {
    throw new RangeError("frame must be finite and in [0,100]");
  }
  if (!Number.isInteger(state.currentHomeGoals) || state.currentHomeGoals < 0) {
    throw new RangeError("currentHomeGoals must be a non-negative integer");
  }
  if (!Number.isInteger(state.currentAwayGoals) || state.currentAwayGoals < 0) {
    throw new RangeError("currentAwayGoals must be a non-negative integer");
  }
  if (!Number.isFinite(state.thetaHome) || !Number.isFinite(state.thetaAway)) {
    throw new RangeError("thetaHome/thetaAway must be finite");
  }
  if (maxFutureGoals < 0 || !Number.isInteger(maxFutureGoals)) {
    throw new RangeError("maxFutureGoals must be a non-negative integer");
  }

  const remainingFraction = (100 - state.frame) / 100;

  if (remainingFraction <= 0) {
    // No time left: the observed current score IS the final score.
    const diff = state.currentHomeGoals - state.currentAwayGoals;
    return {
      home: diff > 0 ? 1 : 0,
      draw: diff === 0 ? 1 : 0,
      away: diff < 0 ? 1 : 0,
      coverage: 1,
      remainingFraction: 0,
    };
  }

  const futureLambdaHome = state.thetaHome * remainingFraction;
  const futureLambdaAway = state.thetaAway * remainingFraction;

  let home = 0;
  let draw = 0;
  let away = 0;
  for (let fh = 0; fh <= maxFutureGoals; fh++) {
    const ph = poissonPmf(fh, futureLambdaHome);
    if (ph === 0) continue;
    const finalHome = state.currentHomeGoals + fh;
    for (let fa = 0; fa <= maxFutureGoals; fa++) {
      const pa = poissonPmf(fa, futureLambdaAway);
      if (pa === 0) continue;
      const finalAway = state.currentAwayGoals + fa;
      const p = ph * pa;
      if (finalHome > finalAway) home += p;
      else if (finalHome === finalAway) draw += p;
      else away += p;
    }
  }

  return { home, draw, away, coverage: home + draw + away, remainingFraction };
}
