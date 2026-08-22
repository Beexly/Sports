/**
 * Passing yards given attempts, not calendar games.
 *
 * A 12-attempt checkdown game and a 48-attempt gunslinger game are not the
 * same Poisson exposure. Passing `games` into Gamma-Poisson for passing
 * yards treats a week where the QB was benched early (0 attempts) as "low
 * talent." Same exposure bug #519 fixed for receptions and #530 fixed for
 * rushing; this module closes it for passing yards specifically.
 *
 * Passing YARDS are unbounded and continuous (not integer counts), and the
 * exposure is ATTEMPTS (not games): each attempt is a Bernoulli trial that
 * can yield 0+ yards. The composite model is:
 *
 *   1. Next-game attempts T ~ NB from the Gamma-Poisson posterior on the
 *      QB's per-game attempt rate (props-hb). T=0 ⇒ yards=0 (ZIP hurdle:
 *      no dropbacks, no passing yards).
 *   2. Yards | T=k ~ Gamma-Poisson posterior on (yards, attempts) for the
 *      QB's yards-per-attempt rate. Each "attempt" is one Poisson trial
 *      that produces a nonnegative integer yardage; scaling the Gamma rate
 *      posterior by `attempts` yields the NB posterior-predictive, exactly
 *      as props-hb.probOver does for a count line.
 *   3. P(yards > line) = Σ_k P(T=k) P(Y > line | k).
 *
 * Yards-per-attempt is continuous-valued (yards / attempts), but the
 * per-attempt yardage count itself is integer-valued (sack yards can be
 * negative or 0, but we model net passing yards ≥ 0 per the sample guard).
 * Using the Gamma-Poisson conjugate family on (yards, attempts) treats
 * each attempt as one observation unit — the standard rate-model exposure,
 * not a calendar-game exposure.
 *
 * Independent p only. Do not put the book's passing-yards line into the
 * prior. Do not add an Odds market — this module does not ingest.
 *
 * Pure, deterministic, no I/O.
 */

import { fitGroupPrior, posteriorRate, probOver, type GammaPosterior, type GammaPrior } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const PASS_YARDS_HB_METHOD_TAG = "props_hb_pass_yards_v1" as const;

/** Cap the attempt sum in the next-game NB mixture (QB max ~70 attempts). */
const ATT_K_MAX = 80;
/** Break the NB mixture once the tail mass is negligible. */
const TAIL = 1e-12;

/** One (attempts, yards) pair — the sufficient statistic for a Gamma-Poisson
 *  yards-per-attempt rate. `attempts` must be > 0 (zero-attempt games are the
 *  ZIP hurdle, not a valid rate observation). `yards` must be >= 0. */
export interface PassYardsSample {
  readonly attempts: number;
  readonly yards: number;
}

function assertSample(s: PassYardsSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.yards)) {
    throw new RangeError(`pass-yards sample must be finite (got att=${s.attempts}, yards=${s.yards})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`pass attempts must be > 0 (got ${s.attempts})`);
  }
  if (s.yards < 0) {
    throw new RangeError(`pass yards must be ≥ 0 (got ${s.yards})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on yards-per-attempt from (yards, attempts).
 * Zero-attempt games are not valid samples — drop them; they are the ZIP
 * hurdle (P(T=0)), not a 0-yards-per-attempt rate.
 */
export function fitPassYardsPerAttemptPrior(samples: readonly PassYardsSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  // Each attempt is one observation unit; total = yards, games = attempts.
  // This is the standard rate-model exposure, NOT calendar games.
  const rates: ReadonlyArray<{ games: number; total: number }> = samples.map((s) => ({
    games: s.attempts,
    total: s.yards,
  }));
  return fitGroupPrior(rates);
}

/**
 * Conjugate Gamma-Poisson posterior update on yards-per-attempt for one QB,
 * using their own (yards, attempts). attempts = 0 is rejected here — the
 * zero-attempt case is handled by the ZIP hurdle in probOverPassYards.
 */
export function posteriorPassYardsPerAttempt(prior: GammaPrior, player: PassYardsSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.yards, player.attempts);
}

// ── NB posterior-predictive helpers ──────────────────────────────────────────

/**
 * CDF of the Negative-Binomial posterior-predictive for a Gamma-Poisson rate:
 * P(T ≤ k | posterior), where T ~ NB(alpha, beta/(beta + exposure)).
 * Uses the regularized incomplete beta identity (same as props-hb's NB CDF).
 */
function nbCdf(post: GammaPosterior, exposure: number, k: number): number {
  if (k < 0) return 0;
  const r = post.alpha;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(p, r, Math.floor(k) + 1)));
}

/**
 * PMF of the NB posterior-predictive at integer k.
 */
function nbPmf(post: GammaPosterior, exposure: number, k: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  const at = nbCdf(post, exposure, k);
  const prev = k === 0 ? 0 : nbCdf(post, exposure, k - 1);
  return Math.max(0, at - prev);
}

/**
 * P(yards > line | T = attempts) for the next game.
 *
 * Mixes over the Gamma-Poisson posterior-predictive: given `attempts` dropbacks,
 * yards ~ NB(alpha, beta/(beta + attempts)) from the yards-per-attempt Gamma
 * posterior. `attempts = 0` ⇒ yards = 0 (ZIP hurdle): returns 0 for any
 * non-negative line, 1 for a negative line.
 */
export function probOverPassYardsGivenAttempts(
  yardPost: GammaPosterior,
  attempts: number,
  line: number,
): number {
  if (!Number.isFinite(attempts) || attempts < 0) {
    throw new RangeError(`probOverPassYardsGivenAttempts: attempts must be finite and ≥ 0 (got ${attempts})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverPassYardsGivenAttempts: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (attempts === 0) return 0;
  // probOver takes (posterior, line, games) where games is the exposure.
  // Here one "game" of yardage is `attempts` Poisson trials, so exposure = attempts.
  return probOver(yardPost, line, attempts);
}

/**
 * P(passing yards > line) for the next game — the full two-part model.
 *
 * Mixes the yards survival over next-game attempts T ~ NB(attPost, exposure=1):
 *   P(Y > line) = Σ_k P(T=k) P(Y > line | T=k)
 *
 * The ZIP hurdle is P(T=0): no dropbacks, no passing yards. Once T > 0, yards
 * come from the Gamma-Poisson posterior predictive on (yards, attempts).
 *
 * `attPost` is the QB's posterior on per-game attempt rate (from props-hb on
 * games, not this module). `yardPost` is the yards-per-attempt posterior
 * (from this module's fitPosteriorPassYardsPerAttempt).
 */
export function probOverPassYards(
  yardPost: GammaPosterior,
  attPost: GammaPosterior,
  line: number,
): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverPassYards: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;

  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= ATT_K_MAX; k++) {
    const pT = nbPmf(attPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue; // ZIP hurdle: P(yards>line | attempts=0) = 0 for line ≥ 0
    acc += pT * probOverPassYardsGivenAttempts(yardPost, k, line);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
