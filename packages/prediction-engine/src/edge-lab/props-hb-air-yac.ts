/**
 * Receiving yards as air-caught + YAC, not one Gamma-Poisson on total yards.
 *
 * nflverse already splits the identity: receiving_air_yards on caught balls
 * plus yards-after-catch. A 12-yard screen and a 12-yard go-route are not
 * the same process. Pooling them into one NB on (yards, games) — or even
 * (yards, receptions) — lets YAC noise rewrite aDOT talent and vice versa.
 *
 * Closed-form two-process model, no MCMC, no market field:
 *   1. Receptions next game T ~ NB from the existing Gamma-Poisson posterior
 *      (props-hb / catch path). T=0 ⇒ yards=0.
 *   2. Air | T=k ~ NB(α_air, β_air) with exposure k (receptions, not games).
 *      YAC  | T=k ~ NB(α_yac,  β_yac) independently, same exposure.
 *   3. P(Air+YAC > line | T=k) by convolution of the two NB pmfs.
 *   4. P(yards > line) = Σ_k P(T=k) P(Air+YAC > line | k).
 *
 * Independent p only. Do not put the book's receiving-yards line into the
 * prior. Do not fetch a new Odds market — this module does not ingest.
 *
 * Pure, deterministic, no I/O.
 */

import {
  fitGroupPrior,
  posteriorRate,
  type GammaPosterior,
  type GammaPrior,
  type RateSample,
} from "./props-hb.js";
import { regularizedIncompleteBeta } from "./stats.js";

export const AIR_YAC_METHOD_TAG = "props_hb_air_yac_v1" as const;

const REC_K_MAX = 40;
const YARDS_K_MAX = 250;
const TAIL = 1e-12;

export type AirYacSample = {
  readonly receptions: number;
  readonly airYards: number;
  readonly yac: number;
};

export type AirYacPriors = {
  readonly air: GammaPrior;
  readonly yac: GammaPrior;
};

export type AirYacPosteriors = {
  readonly air: GammaPosterior;
  readonly yac: GammaPosterior;
};

function assertSample(s: AirYacSample): void {
  if (!Number.isFinite(s.receptions) || !Number.isFinite(s.airYards) || !Number.isFinite(s.yac)) {
    throw new RangeError(
      `air-yac sample must be finite (got recs=${s.receptions}, air=${s.airYards}, yac=${s.yac})`,
    );
  }
  if (s.receptions <= 0) {
    throw new RangeError(`air-yac receptions must be > 0 (got ${s.receptions})`);
  }
  if (s.airYards < 0 || s.yac < 0) {
    throw new RangeError(`air and yac must be ≥ 0 (got air=${s.airYards}, yac=${s.yac})`);
  }
}

/**
 * Empirical-Bayes Gamma priors on air-per-catch and YAC-per-catch.
 * Zero-reception games are not valid samples — drop them before calling;
 * they are exposure 0, not a 0-yard receiver.
 */
export function fitAirYacPriors(samples: readonly AirYacSample[]): AirYacPriors | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);

  const airRates: RateSample[] = samples.map((s) => ({ games: s.receptions, total: s.airYards }));
  const yacRates: RateSample[] = samples.map((s) => ({ games: s.receptions, total: s.yac }));
  const air = fitGroupPrior(airRates);
  const yac = fitGroupPrior(yacRates);
  if (!air || !yac) return null;
  return { air, yac };
}

export function posteriorAirYac(
  priors: AirYacPriors,
  player: AirYacSample,
): AirYacPosteriors {
  assertSample(player);
  return {
    air: posteriorRate(priors.air, player.airYards, player.receptions),
    yac: posteriorRate(priors.yac, player.yac, player.receptions),
  };
}

/** NB cdf P(X ≤ k) for the Gamma-Poisson posterior-predictive at `exposure`. */
export function nbPredictiveCdf(post: GammaPosterior, exposure: number, k: number): number {
  if (
    !Number.isFinite(post.alpha) ||
    !Number.isFinite(post.beta) ||
    post.alpha <= 0 ||
    post.beta <= 0
  ) {
    throw new RangeError(`nbPredictiveCdf: posterior must have finite positive alpha/beta`);
  }
  if (!Number.isFinite(exposure) || exposure <= 0) {
    throw new RangeError(`nbPredictiveCdf: exposure must be finite and > 0 (got ${exposure})`);
  }
  if (!Number.isFinite(k)) {
    throw new RangeError(`nbPredictiveCdf: k must be finite (got ${k})`);
  }
  if (k < 0) return 0;
  const r = post.alpha;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(p, r, Math.floor(k) + 1)));
}

export function nbPredictivePmf(post: GammaPosterior, exposure: number, k: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  const at = nbPredictiveCdf(post, exposure, k);
  const prev = k === 0 ? 0 : nbPredictiveCdf(post, exposure, k - 1);
  return Math.max(0, at - prev);
}

/**
 * P(A + B > line) for two independent non-negative integer rvs given as pmfs
 * on 0..n-1. line may be a half-point (4.5). Empty/degenerate pmfs → 0.
 */
export function convolveSurvival(
  pmfA: readonly number[],
  pmfB: readonly number[],
  line: number,
): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`convolveSurvival: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (pmfA.length === 0 || pmfB.length === 0) return 0;

  const cap = Math.floor(line);
  let cdf = 0;
  for (let i = 0; i < pmfA.length; i++) {
    const pa = pmfA[i]!;
    if (pa <= 0) continue;
    const maxB = cap - i;
    if (maxB < 0) continue;
    let pB = 0;
    const last = Math.min(maxB, pmfB.length - 1);
    for (let j = 0; j <= last; j++) pB += pmfB[j]!;
    cdf += pa * pB;
  }
  return Math.max(0, Math.min(1, 1 - cdf));
}

function pmfVector(post: GammaPosterior, exposure: number, maxK: number): number[] {
  const out: number[] = [];
  let mass = 0;
  for (let k = 0; k <= maxK; k++) {
    const p = nbPredictivePmf(post, exposure, k);
    out.push(p);
    mass += p;
    if (k > 8 && p < TAIL && mass > 1 - 1e-9) break;
  }
  return out;
}

/**
 * P(air + yac > line | T = recs). recs is a realized catch count, not games.
 * recs = 0 ⇒ yards = 0.
 */
export function probOverYardsGivenReceptions(
  posts: AirYacPosteriors,
  recs: number,
  line: number,
): number {
  if (!Number.isFinite(recs) || recs < 0) {
    throw new RangeError(`probOverYardsGivenReceptions: recs must be finite and ≥ 0 (got ${recs})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverYardsGivenReceptions: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (recs === 0) return 0;

  const air = pmfVector(posts.air, recs, YARDS_K_MAX);
  const yac = pmfVector(posts.yac, recs, YARDS_K_MAX);
  return convolveSurvival(air, yac, line);
}

/**
 * Mix the two-process yards survival over next-game receptions T ~ NB(recPost, 1).
 * ZIP hurdle is P(T=0): no catches, no yards.
 */
export function probOverReceivingYards(
  posts: AirYacPosteriors,
  recPost: GammaPosterior,
  line: number,
): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverReceivingYards: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;

  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= REC_K_MAX; k++) {
    const pT = nbPredictivePmf(recPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue;
    acc += pT * probOverYardsGivenReceptions(posts, k, line);
    if (k > 8 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}
