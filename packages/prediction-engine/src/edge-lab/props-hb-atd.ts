/**
 * Anytime TD given touches, not calendar games.
 *
 * A healthy scratch (0 rush attempts, 0 receptions) is not a 0% scorer.
 * It is zero opportunity. Passing games into Gamma-Poisson for TDs treats
 * inactive weeks as talent. Same exposure bug #519 fixed for receptions.
 *
 * Closed-form, no MCMC, no market field:
 *   1. Touches next game T = rush attempts + receptions ~ NB from the
 *      existing Gamma-Poisson posterior (props-hb). T=0 ⇒ P(ATD)=0.
 *   2. TDs | T=n ~ NB from a Gamma-Poisson fit on (tds, touches),
 *      touches > 0. P(X=0 | n) = (β/(β+n))^α.
 *   3. P(ATD) = 1 − Σ_k P(T=k) P(X=0 | k)  =  P(X ≥ 1).
 *
 * Distinct from player_pass_tds (QB passing TDs) and from catch|targets
 * (bounded Beta-Binomial). Independent p only. Do not put the book's ATD
 * price into the prior. Do not add an Odds market — this module does not ingest.
 *
 * Pure, deterministic, no I/O.
 */

import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const ATD_HB_METHOD_TAG = "props_hb_atd_v1" as const;

const TOUCH_K_MAX = 40;
const TAIL = 1e-12;

export type TouchTdSample = {
  readonly touches: number;
  readonly tds: number;
};

function assertSample(s: TouchTdSample): void {
  if (!Number.isFinite(s.touches) || !Number.isFinite(s.tds)) {
    throw new RangeError(`atd sample must be finite (got touches=${s.touches}, tds=${s.tds})`);
  }
  if (s.touches <= 0) {
    throw new RangeError(`atd touches must be > 0 (got ${s.touches})`);
  }
  if (s.tds < 0) {
    throw new RangeError(`atd tds must be ≥ 0 (got ${s.tds})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on TD-per-touch from (tds, touches).
 * Zero-touch games are not valid samples — drop them; they are exposure 0.
 * Returns null when there is no extra-Poisson dispersion (TDs look Poisson).
 * That is honest — use {@link tdProbZeroPoisson} at the pooled mean rather
 * than inventing φ.
 */
export function fitTdPerTouchPrior(samples: readonly TouchTdSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.touches, total: s.tds }));
  return fitGroupPrior(rates);
}

/** Pooled TD-per-touch. Caller uses this with {@link tdProbZeroPoisson} when the NB prior is null. */
export function pooledTdPerTouch(samples: readonly TouchTdSample[]): number | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  let touches = 0;
  let tds = 0;
  for (const s of samples) {
    touches += s.touches;
    tds += s.tds;
  }
  if (touches <= 0) return null;
  return tds / touches;
}

/**
 * Poisson P(X=0 | n touches) = exp(-m·n). Honest fallback when TDs show
 * no extra-Poisson variance. n=0 ⇒ 1.
 */
export function tdProbZeroPoisson(meanPerTouch: number, exposure: number): number {
  if (!Number.isFinite(meanPerTouch) || meanPerTouch < 0) {
    throw new RangeError(`tdProbZeroPoisson: meanPerTouch must be finite and ≥ 0 (got ${meanPerTouch})`);
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`tdProbZeroPoisson: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-meanPerTouch * exposure)));
}

export function posteriorTdPerTouch(prior: GammaPrior, player: TouchTdSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.tds, player.touches);
}

/**
 * P(X=0) for the Gamma-Poisson posterior-predictive at `exposure` touches.
 * Equals (β / (β + n))^α. n=0 is defined as 1 (no touches, no TDs).
 */
export function tdProbZero(post: GammaPosterior, exposure: number): number {
  if (
    !Number.isFinite(post.alpha) ||
    !Number.isFinite(post.beta) ||
    post.alpha <= 0 ||
    post.beta <= 0
  ) {
    throw new RangeError("tdProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`tdProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

/** P(ATD | T = touches) = 1 − P(X=0 | n). */
export function probAnytimeTdGivenTouches(post: GammaPosterior, touches: number): number {
  return 1 - tdProbZero(post, touches);
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

/**
 * Mix P(ATD | T=k) over next-game touches T ~ NB(touchPost, 1 game).
 * ZIP hurdle is P(T=0): no touches, no ATD.
 */
export function probAnytimeTd(tdPost: GammaPosterior, touchPost: GammaPosterior): number {
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= TOUCH_K_MAX; k++) {
    const pT = nbPmf(touchPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probAnytimeTdGivenTouches(tdPost, k);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
