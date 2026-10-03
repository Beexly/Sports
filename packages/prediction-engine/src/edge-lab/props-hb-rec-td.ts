/**
 * Receiving TDs given targets, not calendar games and not ATD-given-touches.
 *
 * ATD (#531) pools rush TDs + rec TDs on (rush att + receptions). A goal-line
 * vulture with 18 carries and 1 target is a high-ATD, low-rec-TD player.
 * The books post receiving TDs / rec TD 0.5 as a separate two-way. Pooling
 * them into ATD (or into TDs-per-game) is the same exposure bug #519 fixed
 * for receptions: a healthy scratch is zero opportunity, not a 0% scorer.
 *
 * Closed-form, no MCMC, no market field:
 *   1. Targets next game T ~ NB from the existing Gamma-Poisson posterior
 *      (props-hb / catch path). T=0 ⇒ P(rec TD)=0 (ZIP hurdle).
 *   2. Rec TDs | T=n ~ NB from a Gamma-Poisson fit on (recTds, targets),
 *      targets > 0. P(X=0 | n) = (β/(β+n))^α.
 *   3. P(rec TD ≥ 1) = 1 − Σ_k P(T=k) P(X=0 | k).
 *
 * Distinct from ATD (touches) and from catch|targets (bounded Beta-Binomial).
 * Do not add rec TD + rush TD to recover ATD — they are dependent. Independent
 * p only. Do not put the book's rec-TD price into the prior. Do not ingest a
 * new Odds market.
 *
 * Pure, deterministic, no I/O.
 */

import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const REC_TD_HB_METHOD_TAG = "props_hb_rec_td_v1" as const;

const TARGET_K_MAX = 40;
const TAIL = 1e-12;

export type RecTdSample = {
  readonly targets: number;
  readonly recTds: number;
};

function assertSample(s: RecTdSample): void {
  if (!Number.isFinite(s.targets) || !Number.isFinite(s.recTds)) {
    throw new RangeError(`rec-td sample must be finite (got targets=${s.targets}, recTds=${s.recTds})`);
  }
  if (s.targets <= 0) {
    throw new RangeError(`rec-td targets must be > 0 (got ${s.targets})`);
  }
  if (s.recTds < 0) {
    throw new RangeError(`rec-td recTds must be ≥ 0 (got ${s.recTds})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on rec-TD-per-target from (recTds, targets).
 * Zero-target games are not valid samples — drop them; they are exposure 0.
 * Returns null when there is no extra-Poisson dispersion (TDs look Poisson).
 * Use {@link recTdProbZeroPoisson} at the pooled mean rather than inventing φ.
 */
export function fitRecTdPerTargetPrior(samples: readonly RecTdSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.targets, total: s.recTds }));
  return fitGroupPrior(rates);
}

/** Pooled rec-TD-per-target. Caller uses this with the Poisson fallback when the NB prior is null. */
export function pooledRecTdPerTarget(samples: readonly RecTdSample[]): number | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  let targets = 0;
  let recTds = 0;
  for (const s of samples) {
    targets += s.targets;
    recTds += s.recTds;
  }
  if (targets <= 0) return null;
  return recTds / targets;
}

/**
 * Poisson P(X=0 | n targets) = exp(-m·n). Honest fallback when rec TDs show
 * no extra-Poisson variance. n=0 ⇒ 1.
 */
export function recTdProbZeroPoisson(meanPerTarget: number, exposure: number): number {
  if (!Number.isFinite(meanPerTarget) || meanPerTarget < 0) {
    throw new RangeError(`recTdProbZeroPoisson: meanPerTarget must be finite and ≥ 0 (got ${meanPerTarget})`);
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`recTdProbZeroPoisson: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-meanPerTarget * exposure)));
}

export function posteriorRecTdPerTarget(prior: GammaPrior, player: RecTdSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.recTds, player.targets);
}

/**
 * P(X=0) for the Gamma-Poisson posterior-predictive at `exposure` targets.
 * Equals (β / (β + n))^α. n=0 is defined as 1 (no targets, no rec TDs).
 */
export function recTdProbZero(post: GammaPosterior, exposure: number): number {
  if (
    !Number.isFinite(post.alpha) ||
    !Number.isFinite(post.beta) ||
    post.alpha <= 0 ||
    post.beta <= 0
  ) {
    throw new RangeError("recTdProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`recTdProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

/** P(rec TD ≥ 1 | T = targets) = 1 − P(X=0 | n). */
export function probRecTdGivenTargets(post: GammaPosterior, targets: number): number {
  return 1 - recTdProbZero(post, targets);
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
 * Mix P(rec TD | T=k) over next-game targets T ~ NB(targetPost, 1 game).
 * ZIP hurdle is P(T=0): no targets, no rec TD.
 */
export function probRecTd(tdPost: GammaPosterior, targetPost: GammaPosterior): number {
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= TARGET_K_MAX; k++) {
    const pT = nbPmf(targetPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probRecTdGivenTargets(tdPost, k);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
