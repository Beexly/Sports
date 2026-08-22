/**
 * Catch-rate specialist: receptions | targets, not receptions | games.
 *
 * nflverse already has `targets`. A 3-target game and a 12-target game are
 * not the same Poisson exposure. Passing calendar `games` into Gamma-Poisson
 * treats a healthy scratch (0 targets, 0 catches) as "low talent." It is
 * zero opportunity.
 *
 * Closed-form two-part model, no MCMC, no market field:
 *   1. Targets next game ~ NB from the existing Gamma-Poisson posterior
 *      (props-hb). P(T=0) is the structural zero / ZIP hurdle.
 *   2. Catch rate p ~ Beta(α, β), empirical Bayes on (receptions, targets)
 *      with targets > 0. Receptions | T=n ~ Beta-Binomial(n, α, β).
 *   3. P(rec > line) = Σ_k P(T=k) P(BB > line | n=k).
 *
 * Independent p only. Do not put spread/implied total from the book here.
 * Team pass volume as an offset belongs in the TARGETS model the caller
 * already fits, not as a market covariate.
 *
 * Pure, deterministic, no I/O.
 */

import { posteriorRate, type GammaPosterior, type GammaPrior } from "./props-hb.js";
import { gammaLn, regularizedIncompleteBeta } from "./stats.js";

export const CATCH_HB_METHOD_TAG = "props_hb_catch_v1" as const;

const DEGENERACY_FRACTION = 1e-6;
const TARGET_K_MAX = 40;
const TAIL = 1e-12;

export interface CatchSample {
  readonly targets: number;
  readonly receptions: number;
}

export interface BetaPrior {
  readonly alpha: number;
  readonly beta: number;
}

export interface BetaPosterior {
  readonly alpha: number;
  readonly beta: number;
  readonly mean: number;
}

function logBeta(a: number, b: number): number {
  return gammaLn(a) + gammaLn(b) - gammaLn(a + b);
}

function assertCatchSample(s: CatchSample): void {
  if (!Number.isFinite(s.targets) || !Number.isFinite(s.receptions)) {
    throw new RangeError(`catch sample must be finite (got targets=${s.targets}, receptions=${s.receptions})`);
  }
  if (s.targets <= 0) {
    throw new RangeError(`catch sample targets must be > 0 (got ${s.targets})`);
  }
  if (s.receptions < 0 || s.receptions > s.targets) {
    throw new RangeError(
      `receptions must be in [0, targets] (got receptions=${s.receptions}, targets=${s.targets})`,
    );
  }
}

/**
 * Empirical-Bayes Beta prior on catch rate from (receptions, targets).
 * Zero-target games are not valid CatchSamples — drop them; they are
 * exposure 0, not a 0% catcher.
 */
export function fitCatchPrior(samples: readonly CatchSample[]): BetaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertCatchSample(s);

  let sumT = 0;
  let sumR = 0;
  for (const s of samples) {
    sumT += s.targets;
    sumR += s.receptions;
  }
  const m = sumR / sumT;
  if (!(m > 0) || !(m < 1)) return null;

  const n = samples.length;
  const rates = samples.map((s) => s.receptions / s.targets);
  const varRate = rates.reduce((acc, r) => acc + (r - m) * (r - m), 0) / n;
  const samplingVar = samples.reduce((acc, s) => acc + (m * (1 - m)) / s.targets, 0) / n;
  const vBetween = Math.max(0, varRate - samplingVar);
  const scale = Math.max(samplingVar, 1e-12);
  if (vBetween <= scale * DEGENERACY_FRACTION) return null;

  const concentration = (m * (1 - m)) / vBetween - 1;
  if (!(concentration > 0)) return null;
  const alpha = m * concentration;
  const beta = (1 - m) * concentration;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha <= 0 || beta <= 0) return null;
  return { alpha, beta };
}

/** Conjugate Beta update. `targets=0` leaves the prior unchanged. */
export function posteriorCatch(prior: BetaPrior, receptions: number, targets: number): BetaPosterior {
  if (!Number.isFinite(prior.alpha) || !Number.isFinite(prior.beta) || prior.alpha <= 0 || prior.beta <= 0) {
    throw new RangeError(`posteriorCatch: prior must have finite positive alpha/beta`);
  }
  if (!Number.isFinite(receptions) || !Number.isFinite(targets) || receptions < 0 || targets < 0) {
    throw new RangeError(`posteriorCatch: receptions/targets must be finite and >= 0`);
  }
  if (receptions > targets) {
    throw new RangeError(`posteriorCatch: receptions cannot exceed targets`);
  }
  const alpha = prior.alpha + receptions;
  const beta = prior.beta + (targets - receptions);
  return { alpha, beta, mean: alpha / (alpha + beta) };
}

function betaBinomialPmf(k: number, n: number, a: number, b: number): number {
  if (k < 0 || k > n) return 0;
  const log =
    gammaLn(n + 1) -
    gammaLn(k + 1) -
    gammaLn(n - k + 1) +
    logBeta(a + k, b + n - k) -
    logBeta(a, b);
  if (!Number.isFinite(log)) return 0;
  return Math.exp(log);
}

/** P(receptions > line | targets = n). n=0 and line>=0 → 0. */
export function betaBinomialProbOver(post: BetaPosterior, line: number, n: number): number {
  if (!Number.isFinite(post.alpha) || !Number.isFinite(post.beta) || post.alpha <= 0 || post.beta <= 0) {
    throw new RangeError("betaBinomialProbOver: invalid posterior");
  }
  if (!Number.isFinite(line)) throw new RangeError("betaBinomialProbOver: line must be finite");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("betaBinomialProbOver: n must be an integer >= 0");
  if (line < 0) return 1;
  if (n === 0) return 0;
  const kMax = Math.floor(line);
  if (kMax >= n) return 0;
  let cdf = 0;
  for (let k = 0; k <= kMax; k++) cdf += betaBinomialPmf(k, n, post.alpha, post.beta);
  return Math.max(0, Math.min(1, 1 - cdf));
}

function nbCdf(k: number, post: GammaPosterior, games: number): number {
  if (k < 0) return 0;
  const r = post.alpha;
  const p = post.beta / (post.beta + games);
  return regularizedIncompleteBeta(p, r, k + 1);
}

function nbPmf(k: number, post: GammaPosterior, games: number): number {
  if (k < 0) return 0;
  return Math.max(0, nbCdf(k, post, games) - nbCdf(k - 1, post, games));
}

/**
 * P(receptions > line) next game: mix Beta-Binomial catch over the
 * Negative-Binomial target posterior. P(T=0) is the hurdle / ZIP mass.
 */
export function probOverReceptions(
  catchPost: BetaPosterior,
  targetPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  if (!Number.isFinite(games) || games <= 0) {
    throw new RangeError(`probOverReceptions: games must be finite and > 0 (got ${games})`);
  }
  if (line < 0) return 1;
  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= TARGET_K_MAX; k++) {
    const pk = nbPmf(k, targetPost, games);
    mass += pk;
    acc += pk * betaBinomialProbOver(catchPost, line, k);
    if (1 - mass < TAIL && k >= Math.floor(line) + 2) break;
  }
  return Math.max(0, Math.min(1, acc));
}

/**
 * Conjugate updates then mix. Catch history is targets>0 only.
 * `targetGames` / `targetTotal` include zero-target games so P(T=0)
 * is the hurdle. Do not pass calendar games that are actually DNPs
 * the caller already dropped.
 */
export function scoreReceptionsOver(args: {
  readonly catchPrior: BetaPrior;
  readonly targetPrior: GammaPrior;
  readonly catchHistory: readonly CatchSample[];
  readonly targetGames: number;
  readonly targetTotal: number;
  readonly line: number;
}): number {
  let rec = 0;
  let targ = 0;
  for (const s of args.catchHistory) {
    assertCatchSample(s);
    rec += s.receptions;
    targ += s.targets;
  }
  const catchPost = posteriorCatch(args.catchPrior, rec, targ);
  const targetPost = posteriorRate(args.targetPrior, args.targetTotal, args.targetGames);
  return probOverReceptions(catchPost, targetPost, args.line, 1);
}
