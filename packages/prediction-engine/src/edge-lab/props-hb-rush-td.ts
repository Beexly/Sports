/**
 * Rushing TDs given rush attempts, not calendar games and not ATD-given-touches.
 *
 * ATD (#531) pools rush TDs + rec TDs on (rush att + receptions). A WR with
 * 9 targets and 2 carries is a high-rec-TD, low-rush-TD player. The books
 * post rushing TDs / rush TD 0.5 as a separate two-way. Goal-line vultures
 * live here. A healthy scratch is zero opportunity, not a 0% scorer.
 *
 * Closed-form, no MCMC, no market field:
 *   1. Rush attempts next game A ~ NB from the existing Gamma-Poisson
 *      posterior (props-hb / rush path). A=0 ⇒ P(rush TD)=0 (ZIP hurdle).
 *   2. Rush TDs | A=n ~ NB from a Gamma-Poisson fit on (rushTds, rushAtt),
 *      rushAtt > 0. P(X=0 | n) = (β/(β+n))^α.
 *   3. P(rush TD ≥ 1) = 1 − Σ_k P(A=k) P(X=0 | k).
 *
 * Distinct from ATD (touches) and rec-TD (targets). Do not add rec-TD p +
 * rush-TD p to recover ATD — they are dependent. Independent p only. Do not
 * put the book's rush-TD price into the prior. Do not ingest a new Odds market.
 *
 * Pure, deterministic, no I/O.
 */

import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const RUSH_TD_HB_METHOD_TAG = "props_hb_rush_td_v1" as const;

const ATT_K_MAX = 40;
const TAIL = 1e-12;

export type RushTdSample = {
  readonly rushAtt: number;
  readonly rushTds: number;
};

function assertSample(s: RushTdSample): void {
  if (!Number.isFinite(s.rushAtt) || !Number.isFinite(s.rushTds)) {
    throw new RangeError(`rush-td sample must be finite (got rushAtt=${s.rushAtt}, rushTds=${s.rushTds})`);
  }
  if (s.rushAtt <= 0) {
    throw new RangeError(`rush-td rushAtt must be > 0 (got ${s.rushAtt})`);
  }
  if (s.rushTds < 0) {
    throw new RangeError(`rush-td rushTds must be ≥ 0 (got ${s.rushTds})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on rush-TD-per-attempt from (rushTds, rushAtt).
 * Zero-attempt games are not valid samples — drop them; they are exposure 0.
 * Returns null when there is no extra-Poisson dispersion. Use
 * {@link rushTdProbZeroPoisson} at the pooled mean rather than inventing φ.
 */
export function fitRushTdPerAttemptPrior(samples: readonly RushTdSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.rushAtt, total: s.rushTds }));
  return fitGroupPrior(rates);
}

/** Pooled rush-TD-per-attempt. Caller uses this with the Poisson fallback when the NB prior is null. */
export function pooledRushTdPerAttempt(samples: readonly RushTdSample[]): number | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  let att = 0;
  let tds = 0;
  for (const s of samples) {
    att += s.rushAtt;
    tds += s.rushTds;
  }
  if (att <= 0) return null;
  return tds / att;
}

/**
 * Poisson P(X=0 | n attempts) = exp(-m·n). Honest fallback when rush TDs show
 * no extra-Poisson variance. n=0 ⇒ 1.
 */
export function rushTdProbZeroPoisson(meanPerAttempt: number, exposure: number): number {
  if (!Number.isFinite(meanPerAttempt) || meanPerAttempt < 0) {
    throw new RangeError(`rushTdProbZeroPoisson: meanPerAttempt must be finite and ≥ 0 (got ${meanPerAttempt})`);
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`rushTdProbZeroPoisson: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-meanPerAttempt * exposure)));
}

export function posteriorRushTdPerAttempt(prior: GammaPrior, player: RushTdSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.rushTds, player.rushAtt);
}

/**
 * P(X=0) for the Gamma-Poisson posterior-predictive at `exposure` attempts.
 * Equals (β / (β + n))^α. n=0 is defined as 1 (no attempts, no rush TDs).
 */
export function rushTdProbZero(post: GammaPosterior, exposure: number): number {
  if (
    !Number.isFinite(post.alpha) ||
    !Number.isFinite(post.beta) ||
    post.alpha <= 0 ||
    post.beta <= 0
  ) {
    throw new RangeError("rushTdProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`rushTdProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

/** P(rush TD ≥ 1 | A = rushAtt) = 1 − P(X=0 | n). */
export function probRushTdGivenAttempts(post: GammaPosterior, rushAtt: number): number {
  return 1 - rushTdProbZero(post, rushAtt);
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
 * Mix P(rush TD | A=k) over next-game rush attempts A ~ NB(attPost, 1 game).
 * ZIP hurdle is P(A=0): no attempts, no rush TD.
 */
export function probRushTd(tdPost: GammaPosterior, attPost: GammaPosterior): number {
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= ATT_K_MAX; k++) {
    const pA = nbPmf(attPost, 1, k);
    if (pA <= 0) continue;
    mass += pA;
    if (k === 0) continue;
    acc += pA * probRushTdGivenAttempts(tdPost, k);
    if (k > 8 && pA < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
