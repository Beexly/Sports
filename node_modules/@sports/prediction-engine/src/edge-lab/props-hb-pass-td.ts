/**
 * Passing TDs given attempts, not calendar games and not ATD-given-touches.
 *
 * ATD (#531) pools rush TDs + rec TDs on touches. Rec TD (#538) is targets.
 * Rush TD (#539) is rush attempts. QB pass TDs are a separate two-way on
 * dropbacks. A healthy scratch (0 attempts) is zero opportunity, not a 0%
 * passer. Distinct from pass yards | attempts (#542) and from completions.
 *
 * Closed-form: attempts T ~ NB; pass TDs | T=n ~ NB on (passTds, attempts).
 * P(X=0 | n) = (β/(β+n))^α. ZIP hurdle is P(T=0). Poisson fallback when
 * there is no extra-Poisson φ.
 *
 * Independent p. Pure, deterministic, no I/O. priced:false. No new Odds market.
 */

import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const PASS_TD_HB_METHOD_TAG = "props_hb_pass_td_v1" as const;

const ATTEMPT_K_MAX = 55;
const TAIL = 1e-12;

export type PassTdSample = {
  readonly attempts: number;
  readonly passTds: number;
};

function assertSample(s: PassTdSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.passTds)) {
    throw new RangeError(`pass-td sample must be finite (got attempts=${s.attempts}, passTds=${s.passTds})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`pass-td attempts must be > 0 (got ${s.attempts})`);
  }
  if (s.passTds < 0) {
    throw new RangeError(`pass-td passTds must be ≥ 0 (got ${s.passTds})`);
  }
}

export function fitPassTdPerAttemptPrior(samples: readonly PassTdSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.attempts, total: s.passTds }));
  return fitGroupPrior(rates);
}

export function pooledPassTdPerAttempt(samples: readonly PassTdSample[]): number | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  let attempts = 0;
  let passTds = 0;
  for (const s of samples) {
    attempts += s.attempts;
    passTds += s.passTds;
  }
  if (attempts <= 0) return null;
  return passTds / attempts;
}

export function passTdProbZeroPoisson(meanPerAttempt: number, exposure: number): number {
  if (!Number.isFinite(meanPerAttempt) || meanPerAttempt < 0) {
    throw new RangeError(`passTdProbZeroPoisson: meanPerAttempt must be finite and ≥ 0 (got ${meanPerAttempt})`);
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`passTdProbZeroPoisson: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  return Math.max(0, Math.min(1, Math.exp(-meanPerAttempt * exposure)));
}

export function posteriorPassTdPerAttempt(prior: GammaPrior, player: PassTdSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.passTds, player.attempts);
}

export function passTdProbZero(post: GammaPosterior, exposure: number): number {
  if (!Number.isFinite(post.alpha) || !Number.isFinite(post.beta) || post.alpha <= 0 || post.beta <= 0) {
    throw new RangeError("passTdProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`passTdProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

export function probPassTdGivenAttempts(post: GammaPosterior, attempts: number): number {
  return 1 - passTdProbZero(post, attempts);
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

export function probPassTd(tdPost: GammaPosterior, attemptPost: GammaPosterior): number {
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= ATTEMPT_K_MAX; k++) {
    const pT = nbPmf(attemptPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probPassTdGivenAttempts(tdPost, k);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
