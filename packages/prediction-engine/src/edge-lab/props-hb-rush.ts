/**
 * Rushing yards given attempts, not calendar games.
 *
 * A 3-carry change-of-pace snap and an 18-carry workhorse game are not the
 * same Poisson exposure. Passing `games` into Gamma-Poisson for rushing
 * yards treats a healthy scratch as "low talent." Same exposure bug #519
 * fixed for receptions; yards are unbounded so this is NB given attempts,
 * not a Beta-Binomial.
 *
 * Closed-form two-part model, no MCMC, no market field:
 *   1. Attempts next game T ~ NB from the existing Gamma-Poisson posterior
 *      (props-hb). T=0 ⇒ yards=0 (ZIP hurdle).
 *   2. Yards | T=k ~ NB from a Gamma-Poisson fit on (yards, attempts),
 *      attempts > 0. P(Y > line | k) is props-hb.probOver at exposure k.
 *   3. P(yards > line) = Σ_k P(T=k) P(Y > line | k).
 *
 * Independent p only. Do not put the book's rushing-yards line into the
 * prior. Do not add an Odds market — this module does not ingest.
 *
 * Pure, deterministic, no I/O.
 */

import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  type GammaPosterior,
  type GammaPrior,
  type RateSample,
} from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const RUSH_HB_METHOD_TAG = "props_hb_rush_v1" as const;

const ATT_K_MAX = 40;
const TAIL = 1e-12;

export type RushSample = {
  readonly attempts: number;
  readonly yards: number;
};

function assertSample(s: RushSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.yards)) {
    throw new RangeError(`rush sample must be finite (got att=${s.attempts}, yards=${s.yards})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`rush attempts must be > 0 (got ${s.attempts})`);
  }
  if (s.yards < 0) {
    throw new RangeError(`rush yards must be ≥ 0 (got ${s.yards})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on yards-per-attempt from (yards, attempts).
 * Zero-attempt games are not valid samples — drop them; they are exposure 0.
 */
export function fitYardsPerAttemptPrior(samples: readonly RushSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.attempts, total: s.yards }));
  return fitGroupPrior(rates);
}

export function posteriorYardsPerAttempt(prior: GammaPrior, player: RushSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.yards, player.attempts);
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
 * P(yards > line | T = attempts). attempts = 0 ⇒ yards = 0.
 */
export function probOverRushYardsGivenAttempts(
  yardPost: GammaPosterior,
  attempts: number,
  line: number,
): number {
  if (!Number.isFinite(attempts) || attempts < 0) {
    throw new RangeError(`probOverRushYardsGivenAttempts: attempts must be finite and ≥ 0 (got ${attempts})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverRushYardsGivenAttempts: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (attempts === 0) return 0;
  return probOver(yardPost, line, attempts);
}

/**
 * Mix the yards survival over next-game attempts T ~ NB(attPost, 1 game).
 * ZIP hurdle is P(T=0): no carries, no yards.
 */
export function probOverRushYards(
  yardPost: GammaPosterior,
  attPost: GammaPosterior,
  line: number,
): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverRushYards: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;

  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= ATT_K_MAX; k++) {
    const pT = nbPmf(attPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probOverRushYardsGivenAttempts(yardPost, k, line);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
