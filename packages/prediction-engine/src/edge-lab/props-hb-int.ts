/**
 * Interceptions given attempts, not calendar games and not INT-per-game.
 *
 * Completions | attempts is bounded Beta-Binomial. INTs are rare counts on
 * the same exposure. A healthy scratch (0 attempts) is not a 0% INT passer.
 * Books post INT 0.5 as a two-way. Do not pool INTs with fumbles or pass TDs.
 *
 * Closed-form, no MCMC, no market field:
 *   1. Attempts next game T ~ NB from the existing Gamma-Poisson pass-volume
 *      posterior. T=0 ⇒ P(INT≥1)=0 (ZIP hurdle).
 *   2. INTs | T=n ~ NB from a Gamma-Poisson fit on (ints, attempts),
 *      attempts > 0. P(X=0 | n) = (β/(β+n))^α.
 *   3. P(INT ≥ 1) = 1 − Σ_k P(T=k) P(X=0 | k).
 *
 * Distinct from pass yards | attempts (#542) and from completions | attempts.
 * If INTs look Poisson, do not invent φ — use {@link intProbZeroPoisson}.
 * Independent p. Pure, deterministic, no I/O. priced:false.
 */

import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const INT_HB_METHOD_TAG = "props_hb_int_v1" as const;

const ATTEMPT_K_MAX = 55;
const TAIL = 1e-12;

export type IntSample = {
  readonly attempts: number;
  readonly ints: number;
};

function assertSample(s: IntSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.ints)) {
    throw new RangeError(`int sample must be finite (got attempts=${s.attempts}, ints=${s.ints})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`int attempts must be > 0 (got ${s.attempts})`);
  }
  if (s.ints < 0) {
    throw new RangeError(`int ints must be ≥ 0 (got ${s.ints})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on INT-per-attempt from (ints, attempts).
 * Zero-attempt games are not valid samples. Returns null when there is no
 * extra-Poisson dispersion — use {@link intProbZeroPoisson} at the pooled mean.
 */
export function fitIntPerAttemptPrior(samples: readonly IntSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.attempts, total: s.ints }));
  return fitGroupPrior(rates);
}

export function pooledIntPerAttempt(samples: readonly IntSample[]): number | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  let attempts = 0;
  let ints = 0;
  for (const s of samples) {
    attempts += s.attempts;
    ints += s.ints;
  }
  if (attempts <= 0) return null;
  return ints / attempts;
}

/** Poisson P(X=0 | n attempts) = exp(-m·n). Honest fallback. n=0 ⇒ 1. */
export function intProbZeroPoisson(meanPerAttempt: number, exposure: number): number {
  if (!Number.isFinite(meanPerAttempt) || meanPerAttempt < 0) {
    throw new RangeError(`intProbZeroPoisson: meanPerAttempt must be finite and ≥ 0 (got ${meanPerAttempt})`);
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`intProbZeroPoisson: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-meanPerAttempt * exposure)));
}

export function posteriorIntPerAttempt(prior: GammaPrior, player: IntSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.ints, player.attempts);
}

/** P(X=0) at `exposure` attempts. Equals (β / (β + n))^α. n=0 ⇒ 1. */
export function intProbZero(post: GammaPosterior, exposure: number): number {
  if (!Number.isFinite(post.alpha) || !Number.isFinite(post.beta) || post.alpha <= 0 || post.beta <= 0) {
    throw new RangeError("intProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`intProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

/** P(INT ≥ 1 | T = attempts) = 1 − P(X=0 | n). */
export function probIntGivenAttempts(post: GammaPosterior, attempts: number): number {
  return 1 - intProbZero(post, attempts);
}

function nbCdf(post: GammaPosterior, exposure: number, k: number): number {
  if (k < 0) return 0;
  const r = post.alpha;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(p, r, Math.floor(k) + 1)));
}

function nbPmf(post: GammaPosterior, exposure: number, k: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  const at = nbCdf(post, exposure, k);
  const prev = k === 0 ? 0 : nbCdf(post, exposure, k - 1);
  return Math.max(0, at - prev);
}

/** Mix P(INT | T=k) over next-game attempts T ~ NB. ZIP hurdle is P(T=0). */
export function probInt(intPost: GammaPosterior, attemptPost: GammaPosterior): number {
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= ATTEMPT_K_MAX; k++) {
    const pT = nbPmf(attemptPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probIntGivenAttempts(intPost, k);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
