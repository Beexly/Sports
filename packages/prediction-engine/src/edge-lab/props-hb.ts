/**
 * Hierarchical-Bayes player-prop specialist — empirical-Bayes Gamma-Poisson
 * partial pooling (edge-lab handoff §2 Phase 3, the FIRST edge source).
 *
 * ── Why partial pooling ──
 * Player-prop counts and yardage (receptions, attempts, TDs) arrive with
 * per-player sample sizes of roughly 5-30 games. A raw per-player rate at
 * n=5 is dominated by sampling noise, not talent/role. The fix is the
 * classic James-Stein / hierarchical-Bayes move: shrink each player's raw
 * rate toward the position-group's rate, weighted by how much evidence that
 * player has. Players with more games shrink less; players with fewer games
 * shrink more toward the group. This module implements that shrinkage in
 * closed form via the Gamma-Poisson conjugate family (empirical Bayes,
 * method-of-moments hyperparameter fit) — deterministic, no MCMC, no
 * simulation, every number traceable back to sums the caller can re-derive
 * by hand (glass-box, per the handoff's transparency mandate).
 *
 * ── The model ──
 *   rate_i        ~ Gamma(alpha, beta)              (position-group prior)
 *   X_i | rate_i  ~ Poisson(rate_i)  per game
 *
 * Conjugacy gives a closed-form posterior for a player with `total` events
 * over `games` games: rate_i | data ~ Gamma(alpha + total, beta + games).
 * The posterior-predictive distribution of a FUTURE game's count, marginalizing
 * over the posterior Gamma, is a Negative Binomial — also closed form (no
 * numeric integration): see {@link probOver}.
 *
 * ── Two target types ──
 * Receptions / attempts / TDs are genuine per-game COUNTS — the Poisson
 * assumption (conditional on rate) is the standard, defensible one for this
 * class of stat, and {@link probOver} (NB posterior-predictive survival) is
 * the right tool. Receiving/rushing YARDS are not counts — modeling them as
 * Poisson would be wrong (yards are continuous, over-dispersed relative to
 * Poisson even conditional on a "rate"). For yardage this module instead
 * treats a single game's yardage as Gamma-distributed with mean equal to the
 * posterior rate and a shape parameter the CALLER supplies (fit from the
 * position group's coefficient of variation — see {@link probOverContinuous}
 * for the exact recipe). That keeps the same posterior mean driving both
 * paths while using the distribution family appropriate to each stat type.
 *
 * ── What this module does NOT do ──
 * No prop-line pricing, no CLV claim, no market comparison. This is the
 * statistical core only: fit a group prior, shrink a player's rate toward
 * it, and answer "what's P(X > line) under this posterior." Whether that
 * probability constitutes a priced edge against a real sportsbook line is a
 * separate, market-facing question answered elsewhere once a prop-line
 * archive exists (see scripts/edge-lab/props-hb-validation.ts's header for
 * the explicit scope line on this).
 *
 * Pure, deterministic, no I/O.
 */

import { gammaLn, regularizedIncompleteBeta } from "./stats.js";

// ── types ────────────────────────────────────────────────────────────────

/** One player's accumulated (games, total-events) pair — the sufficient
 * statistic for a Poisson rate under this model. `games` must be > 0;
 * `total` must be >= 0 (need not be an integer — aggregated/derived counts
 * are accepted, though the natural inputs are integer counts). */
export interface RateSample {
  readonly games: number;
  readonly total: number;
}

/** A fitted (or supplied) Gamma hyperprior over per-game rates. */
export interface GammaPrior {
  readonly alpha: number;
  readonly beta: number;
}

/** A player's posterior Gamma over their per-game rate, after combining the
 * group prior with their own (games, total). */
export interface GammaPosterior {
  readonly mean: number;
  readonly alpha: number;
  readonly beta: number;
}

/** One row of the shrinkage transparency report (see {@link shrinkageReport}). */
export interface ShrinkageRow {
  readonly id?: string;
  readonly games: number;
  readonly total: number;
  /** total / games — the unshrunk, purely-observed rate. 0 when games = 0
   * (no observation exists; reported as 0 by convention — the posterior
   * mean at games = 0 ignores it entirely, see shrinkWeight = 1 below). */
  readonly rawRate: number;
  /** The posterior mean rate after shrinking toward the group prior. */
  readonly posteriorMean: number;
  /** Weight (in [0, 1]) placed on the PRIOR mean in the posterior mixture:
   * posteriorMean = shrinkWeight * priorMean + (1 - shrinkWeight) * rawRate.
   * shrinkWeight = beta / (beta + games): more games -> less shrinkage. */
  readonly shrinkWeight: number;
}

// ── 1. empirical-Bayes group prior (method of moments) ─────────────────────

/**
 * Numerical-degeneracy guard for {@link fitGroupPrior}'s excess-variance
 * estimator: v_between is a difference of two noisy sample statistics, so
 * near a truly homogeneous group it can land on a tiny POSITIVE value purely
 * from floating-point rounding even though the true between-player variance
 * is 0. Treating that noise floor as real dispersion would fit an alpha/beta
 * that blows up (alpha = m^2 / v_between diverges as v_between -> 0) — a
 * textbook "fake precision from a division by near-zero" bug. The guard
 * compares v_between to a small fraction of the sampling-variance scale
 * (which is always >= 0 and > 0 for any group with a nonzero mean rate) and
 * treats anything below that fraction as "no measurable between-player
 * dispersion," which is exactly the documented null-return case.
 */
const DEGENERACY_FRACTION = 1e-6;

/**
 * Empirical-Bayes method-of-moments fit of a Gamma(alpha, beta) prior over
 * per-game Poisson rates, from a group's (games, total) pairs.
 *
 * Estimator (documented per the handoff's "every number explainable" rule):
 *   m            = sum(total_i) / sum(games_i)              — pooled group mean rate
 *   rate_i       = total_i / games_i                         — each player's raw rate
 *   var(rate_i)  = mean_i[(rate_i - m)^2]                     — population variance of the
 *                                                                raw rates, centered on the
 *                                                                POOLED mean m (not the
 *                                                                unweighted mean of rate_i)
 *                                                                so the variance decomposition
 *                                                                below is self-consistent with
 *                                                                the alpha/beta moment equations,
 *                                                                which fix the prior's mean at m.
 *   samplingVar  = mean_i[rate_i / games_i]                   — the expected Poisson sampling
 *                                                                variance of rate_i given its
 *                                                                own games_i, using rate_i as
 *                                                                the plug-in estimate of the
 *                                                                unknown true rate (a player's
 *                                                                total_i ~ Poisson(games_i * rate_i),
 *                                                                so Var(rate_i) = rate_i / games_i)
 *   v_between    = max(0, var(rate_i) - samplingVar)          — the EXCESS variance across
 *                                                                players beyond what Poisson
 *                                                                sampling noise alone explains
 *                                                                — i.e. the between-player
 *                                                                talent/role dispersion
 *   alpha        = m^2 / v_between
 *   beta         = m / v_between
 *
 * (Method-of-moments check: for X ~ Gamma(alpha, beta), mean = alpha/beta = m
 * and variance = alpha/beta^2 = m/beta = v_between, so beta = m/v_between and
 * alpha = beta*m = m^2/v_between — exactly the formulas above.)
 *
 * Returns `null` when v_between degenerates to (numerically) zero — the
 * group's players are statistically indistinguishable once Poisson sampling
 * noise is accounted for. That is an HONEST finding, not a failure: callers
 * MUST fall back to the raw group mean `m` with no shrinkage machinery in
 * that case (there is no real dispersion to shrink against — see this
 * module's header: "no fake dispersion").
 *
 * Throws RangeError on invalid input (non-finite games/total, games <= 0, or
 * total < 0) rather than silently producing a garbage prior. Returns `null`
 * (not a throw) for an empty `playerRates` — zero players is "no data,"
 * distinct from "bad data."
 */
export function fitGroupPrior(playerRates: readonly RateSample[]): GammaPrior | null {
  if (playerRates.length === 0) return null;

  for (const p of playerRates) {
    if (!Number.isFinite(p.games) || !Number.isFinite(p.total)) {
      throw new RangeError(`fitGroupPrior: games and total must be finite (got games=${p.games}, total=${p.total})`);
    }
    if (p.games <= 0) {
      throw new RangeError(`fitGroupPrior: games must be > 0 (got games=${p.games})`);
    }
    if (p.total < 0) {
      throw new RangeError(`fitGroupPrior: total must be >= 0 (got total=${p.total})`);
    }
  }

  const n = playerRates.length;
  const sumGames = playerRates.reduce((s, p) => s + p.games, 0);
  const sumTotal = playerRates.reduce((s, p) => s + p.total, 0);
  const m = sumTotal / sumGames;

  const rates = playerRates.map((p) => p.total / p.games);
  const varRate = rates.reduce((s, r) => s + (r - m) * (r - m), 0) / n;
  const samplingVar = playerRates.reduce((s, p, i) => s + (rates[i] as number) / p.games, 0) / n;

  const vBetween = Math.max(0, varRate - samplingVar);
  const scale = Math.max(samplingVar, 1e-12);
  if (vBetween <= scale * DEGENERACY_FRACTION) return null;

  const alpha = (m * m) / vBetween;
  const beta = m / vBetween;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha <= 0 || beta <= 0) return null;
  return { alpha, beta };
}

// ── 2. posterior update (conjugate, closed form) ────────────────────────────

/**
 * Gamma-Poisson conjugate posterior update: alpha' = alpha + total,
 * beta' = beta + games. `mean` is the posterior mean rate (alpha' / beta'),
 * the shrunk per-game estimate the caller most often wants directly.
 *
 * Throws RangeError on an invalid prior (non-positive/non-finite alpha or
 * beta) or invalid observation (non-finite or negative playerTotal/playerGames).
 * playerGames = 0 is valid (a player with zero games observed this window:
 * the posterior degenerates to exactly the prior — full shrinkage).
 */
export function posteriorRate(prior: GammaPrior, playerTotal: number, playerGames: number): GammaPosterior {
  if (!Number.isFinite(prior.alpha) || !Number.isFinite(prior.beta) || prior.alpha <= 0 || prior.beta <= 0) {
    throw new RangeError(`posteriorRate: prior must have finite positive alpha/beta (got ${JSON.stringify(prior)})`);
  }
  if (!Number.isFinite(playerTotal) || !Number.isFinite(playerGames) || playerTotal < 0 || playerGames < 0) {
    throw new RangeError(
      `posteriorRate: playerTotal/playerGames must be finite and >= 0 (got total=${playerTotal}, games=${playerGames})`,
    );
  }
  const alpha = prior.alpha + playerTotal;
  const beta = prior.beta + playerGames;
  return { mean: alpha / beta, alpha, beta };
}

// ── 3a. posterior-predictive survival — COUNT path (receptions/attempts/TDs) ─

/**
 * Domain guard for {@link probOver}: real prop count lines never approach
 * this magnitude. Capping here protects the negative-binomial CDF call from
 * a pathological/mistaken input (e.g. a caller accidentally passing a raw
 * yardage number down the count path) rather than silently returning a
 * technically-computed-but-meaningless probability.
 */
const MAX_COUNT_LINE = 100_000;

/**
 * Posterior-predictive P(X > line) for ONE FUTURE game, where
 * X | rate ~ Poisson(rate) and rate ~ Gamma(posterior.alpha, posterior.beta)
 * (i.e. `posterior` is the player's POSTERIOR, already combining the group
 * prior with their own observed games — see {@link posteriorRate}).
 *
 * Marginalizing a Poisson over a Gamma-distributed rate gives a Negative
 * Binomial: X ~ NB(r = alpha, p = beta / (beta + games)), using the
 * parameterization P(X=k) = C(k+r-1, k) p^r (1-p)^k. `games` generalizes
 * the "one future game" case to a window of `games` upcoming games sharing
 * the same rate (sum of `games` iid Poisson(rate) draws is Poisson(games *
 * rate); scaling a Gamma(alpha, beta) rate by `games` rescales its Gamma
 * rate parameter to beta/games, which is where the p = beta/(beta+games)
 * formula comes from). Defaults to 1 (a single game), the case the handoff
 * asks for.
 *
 * The NB CDF has a closed form via the regularized incomplete beta function
 * (reusing stats.ts's already-tested implementation rather than summing the
 * PMF in a loop): P(X <= k) = I_p(r, k+1). Verified against the k=0 special
 * case (NB(1,p) is Geometric: I_p(1, k+1) = 1-(1-p)^(k+1), the textbook
 * geometric CDF) — see props-hb.test.ts for the general cross-check against
 * an independently-coded brute-force PMF sum.
 *
 * Half-point lines (the normal prop convention, e.g. "4.5 receptions") fall
 * out naturally: floor(4.5) = 4, so P(X > 4.5) = P(X >= 5) = 1 - P(X <= 4).
 *
 * Guards: `line < 0` returns 1 (X is a non-negative count, so it always
 * exceeds a negative line). `floor(line) >= MAX_COUNT_LINE` returns 0 (see
 * {@link MAX_COUNT_LINE}). Throws RangeError on a non-finite `line`, an
 * invalid `posterior` (non-finite/non-positive alpha or beta), or a
 * non-finite/non-positive `games`.
 */
export function probOver(posterior: GammaPosterior, line: number, games: number = 1): number {
  if (
    !Number.isFinite(posterior.alpha) ||
    !Number.isFinite(posterior.beta) ||
    posterior.alpha <= 0 ||
    posterior.beta <= 0
  ) {
    throw new RangeError(`probOver: posterior must have finite positive alpha/beta (got ${JSON.stringify(posterior)})`);
  }
  if (!Number.isFinite(games) || games <= 0) {
    throw new RangeError(`probOver: games must be finite and > 0 (got ${games})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOver: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;

  const k = Math.floor(line);
  if (k >= MAX_COUNT_LINE) return 0;

  const r = posterior.alpha;
  const p = posterior.beta / (posterior.beta + games);
  const cdf = regularizedIncompleteBeta(p, r, k + 1);
  return Math.max(0, Math.min(1, 1 - cdf));
}

// ── 3b. posterior-predictive survival — CONTINUOUS path (yardage) ──────────

const GAMMA_SERIES_MAX_ITERATIONS = 200;
const GAMMA_SERIES_EPS = 3e-11;
const GAMMA_CF_FPMIN = 1e-300;

/** Regularized lower incomplete gamma P(a, x) via its series expansion
 * (Numerical-Recipes `gser`), valid/fast-converging for x < a + 1. Mirrors
 * this package's betacf/betai style in stats.ts. */
function gammaSeriesP(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = gammaLn(a);
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= GAMMA_SERIES_MAX_ITERATIONS; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * GAMMA_SERIES_EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

/** Regularized upper incomplete gamma Q(a, x) via its continued-fraction
 * expansion (Numerical-Recipes `gcf`), valid/fast-converging for x >= a + 1. */
function gammaContinuedFractionQ(a: number, x: number): number {
  const gln = gammaLn(a);
  let b = x + 1 - a;
  let c = 1 / GAMMA_CF_FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= GAMMA_SERIES_MAX_ITERATIONS; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < GAMMA_CF_FPMIN) d = GAMMA_CF_FPMIN;
    c = b + an / c;
    if (Math.abs(c) < GAMMA_CF_FPMIN) c = GAMMA_CF_FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < GAMMA_SERIES_EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/**
 * Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x) — the survival
 * function of a Gamma(shape=a, rate=1) distribution at x, generalized to any
 * rate by rescaling x. Standard Numerical-Recipes `gammq`: series expansion
 * on one side of x = a+1, continued fraction on the other (same
 * "whichever side converges fastest" structure as stats.ts's betai). Exported
 * for reuse/testing; `a` must be > 0, `x` must be >= 0.
 */
export function regularizedGammaQ(a: number, x: number): number {
  if (!(a > 0)) throw new RangeError(`regularizedGammaQ: a must be > 0 (got ${a})`);
  if (!(x >= 0)) throw new RangeError(`regularizedGammaQ: x must be >= 0 (got ${x})`);
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaSeriesP(a, x);
  return gammaContinuedFractionQ(a, x);
}

/**
 * Posterior-predictive P(Y > line) for ONE FUTURE game's YARDAGE (or any
 * continuous per-game stat), modeled as Y ~ Gamma(shape, rate) with mean
 * fixed at the posterior COUNT-rate mean (`posterior.mean` — yes, the same
 * Gamma posterior {@link posteriorRate} produces; this reuses its mean as
 * the continuous target's mean, NOT its alpha/beta as the yardage
 * distribution's own shape/rate) and `shape` supplied by the caller.
 *
 * Yardage is NOT a count — modeling receiving/rushing yards as Poisson (the
 * {@link probOver} path) would be wrong; yards are continuous and
 * over-dispersed relative to Poisson even conditional on a rate. The
 * intended recipe for `shape`: fit it from the position group's coefficient
 * of variation (CV = stdev/mean of per-game yardage across the group's
 * players), since for a Gamma distribution CV = 1/sqrt(shape) => shape =
 * 1/CV^2. That fit is the CALLER's job (it needs the group's yardage sample,
 * which this module does not itself ingest) — this function only consumes
 * the resulting shape number.
 *
 * rate = shape / posterior.mean (so E[Y] = shape/rate = posterior.mean).
 * Survival is the regularized upper incomplete gamma: P(Y > line) =
 * Q(shape, rate * line) — see {@link regularizedGammaQ}.
 *
 * Guards: `line <= 0` returns 1 (Gamma support is (0, infinity); P(Y > 0) = 1
 * for a continuous distribution with no mass at 0). Throws RangeError on a
 * non-finite `line`, a non-positive/non-finite `shape`, or a non-positive
 * posterior mean.
 */
export function probOverContinuous(posterior: GammaPosterior, line: number, shape: number): number {
  if (!Number.isFinite(shape) || shape <= 0) {
    throw new RangeError(`probOverContinuous: shape must be finite and > 0 (got ${shape})`);
  }
  if (!Number.isFinite(posterior.mean) || posterior.mean <= 0) {
    throw new RangeError(`probOverContinuous: posterior.mean must be finite and > 0 (got ${posterior.mean})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverContinuous: line must be finite (got ${line})`);
  }
  if (line <= 0) return 1;

  const rate = shape / posterior.mean;
  return regularizedGammaQ(shape, rate * line);
}

// ── 4. transparency artifact ────────────────────────────────────────────────

/**
 * Per-player shrinkage report: raw rate, posterior mean, and the shrink
 * weight placed on the group prior — the glass-box artifact making every
 * published shrunk rate traceable back to "here is exactly how much of this
 * number came from the group vs. from this player's own games."
 *
 * shrinkWeight = beta / (beta + games): the weight on the PRIOR mean in the
 * identity posteriorMean = shrinkWeight * (prior.alpha/prior.beta) +
 * (1 - shrinkWeight) * rawRate (the standard conjugate-mixture decomposition
 * of a Gamma-Poisson posterior mean). shrinkWeight -> 1 as games -> 0 (full
 * shrinkage to the group); shrinkWeight -> 0 as games grows large (the
 * player's own data dominates) — monotone decreasing in games.
 */
export function shrinkageReport(
  prior: GammaPrior,
  players: readonly (RateSample & { readonly id?: string })[],
): ShrinkageRow[] {
  return players.map((p) => {
    const post = posteriorRate(prior, p.total, p.games);
    const shrinkWeight = prior.beta / (prior.beta + p.games);
    return {
      id: p.id,
      games: p.games,
      total: p.total,
      rawRate: p.games > 0 ? p.total / p.games : 0,
      posteriorMean: post.mean,
      shrinkWeight,
    };
  });
}
