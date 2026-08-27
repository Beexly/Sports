/**
 * Kickoff return yards | return attempts, not calendar games.
 *
 * EDGE — Tier 1 Special Teams (#5 in H1_RESEARCH_CONSOLIDATED):
 * Books price kickoff return TDs (anytime TD market: "OVER 0.5 return TDs")
 * but do NOT price kickoff return YARDS — a structural market gap. Return
 * yards capture the continuous return-process signal (returner agility,
 * blocking unit quality, game-script aggression) that the TD market misses:
 * a player can have 5 returns for 150 yards and 0 TDs, which the TD market
 * underprices but a yards model prices honestly. Dynamic kickoff returns
 * (74.5% rate in 2025) and game-script WP asymmetry (models too conservative
 * at 70-80% WP) make this the uncovered ST edge.
 *
 * Modeled as Gamma-Poisson (Negative Binomial) over return attempts — identical
 * conjugate machinery to props-hb-rush (#530), but the exposure is kickoff
 * RETURNS (kickoff_returns), not rushing attempts, and yards are
 * kickoff_return_yards. PFR records kickoff_returns, kickoff_return_yards,
 * and kickoff_fair_catches; fair catches are NOT returns (no yards) and are
 * excluded — they are exposure 0 for the yards process.
 *
 * A 1-return 32-yard TD is not the same Poisson exposure as 4 returns for 12
 * yards. Modeling yards-per-return with return count as the exposure captures
 * that. Zero-return games are exposure 0 — drop them; P(yards > 0) = 0.
 *
 * Closed-form two-part model, no MCMC, no market field:
 *   1. Returns next game T ~ NB from the Gamma-Poisson posterior on
 *      (kickoff_returns, games). T=0 ⇒ yards=0 (ZIP hurdle).
 *   2. Yards | T=k ~ NB from a Gamma-Poisson fit on (yards, returns),
 *      returns > 0. P(Y > line | k) = probOver at exposure k.
 *   3. P(yards > line) = Σ_k P(T=k) P(Y > line | k).
 *
 * Independent p only. Do not put the book's return-TD line into the prior.
 * Do not add an Odds market — this module does not ingest.
 *
 * Pure, deterministic, no I/O. priced:false.
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

export const KICKOFF_RETURN_YARDS_METHOD_TAG = "kickoff_return_yards_v1" as const;

/**
 * Kickoff returns per game can reach ~10 in extreme cases (multiple kickoffs
 * + onside + blocked). 10 is well beyond the realistic weekly count; the tail
 * cutoff below 1e-12 mass guards truncation loss.
 */
const RET_K_MAX = 10;
const TAIL = 1e-12;

/**
 * A player's kickoff-return sample per game.
 *
 * - `attempts` = kickoff_returns (number of returns in the game). Exposure for
 *   the Gamma-Poisson yards-per-return rate. Must be > 0 (a 0-return game is
 *   exposure 0, not a 0-yard sample).
 * - `yards` = kickoff_return_yards (total yards gained on returns). Must be ≥ 0
 *   (a return can be tackled at or behind the goal line for 0 yards, but never
 *   negative in NFL scoring).
 *
 * Fair catches are intentionally NOT modeled here — they produce no return
 * yards and are not part of the return-attempts process.
 */
export type KickoffReturnSample = {
  readonly attempts: number;
  readonly yards: number;
};

/**
 * A player's accumulated (games, returns) pair — the sufficient statistic
 * for the per-game return-count rate under the Gamma-Poisson attempts model.
 * Returned games are valid here (a game played with 0 returns is a real 0,
 * not a 0/0 rate).
 */
export interface KickoffReturnAttemptsSample {
  readonly games: number;
  readonly returns: number;
}

function assertSample(s: KickoffReturnSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.yards)) {
    throw new RangeError(`kickoff sample must be finite (got att=${s.attempts}, yards=${s.yards})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`kickoff returns must be > 0 (got ${s.attempts}); drop 0-return games`);
  }
  if (s.yards < 0) {
    throw new RangeError(`kickoff return yards must be ≥ 0 (got ${s.yards})`);
  }
}

function assertAttemptsSample(s: KickoffReturnAttemptsSample): void {
  if (!Number.isFinite(s.games) || !Number.isFinite(s.returns)) {
    throw new RangeError(`kickoff attempts sample must be finite (got games=${s.games}, returns=${s.returns})`);
  }
  if (s.games < 0) {
    throw new RangeError(`kickoff attempts games must be ≥ 0 (got ${s.games})`);
  }
  if (s.returns < 0) {
    throw new RangeError(`kickoff attempts returns must be ≥ 0 (got ${s.returns})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on return-yards-per-attempt from
 * (yards, returns) pairs, returns > 0 only.
 *
 * Zero-return games are not valid samples — they are exposure 0 (no returns
 * means no yardage to model). Drop them. The rate is yards PER RETURN, so
 * returns is the games-equivalent exposure.
 */
export function fitKickoffReturnYardsPrior(samples: readonly KickoffReturnSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.attempts, total: s.yards }));
  return fitGroupPrior(rates);
}

/**
 * Empirical-Bayes Gamma prior on returns-per-game from (games, returns).
 *
 * Zero-return games are VALID samples here — they represent games where the
 * returner played but had no returns (e.g. no kickoff opportunities, all
 * fair catches, touchdown range only). The rate is returns PER GAME, so
 * games is the denominator and the 0-return observation is a real 0-rate
 * game, not a 0/0.
 */
export function fitKickoffReturnAttemptsPrior(samples: readonly KickoffReturnAttemptsSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertAttemptsSample(s);
  if (samples.some((s) => s.games <= 0)) {
    throw new RangeError("kickoff attempts sample must have games > 0");
  }
  const rates: RateSample[] = samples.map((s) => ({ games: s.games, total: s.returns }));
  return fitGroupPrior(rates);
}

/**
 * Conjugate posterior update for one player's return-yards-per-attempt rate,
 * combining the group prior with their own (returns, yards).
 * returns=0 is excluded by assertSample (drop before calling).
 */
export function posteriorKickoffReturnYards(prior: GammaPrior, player: KickoffReturnSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.yards, player.attempts);
}

/**
 * Conjugate posterior update for one player's returns-per-game rate,
 * combining the group prior with their own (games, returns).
 * games=0 is valid: posterior collapses to the prior (full shrinkage).
 */
export function posteriorKickoffReturnAttempts(prior: GammaPrior, player: KickoffReturnAttemptsSample): GammaPosterior {
  assertAttemptsSample(player);
  return posteriorRate(prior, player.returns, player.games);
}

/**
 * P(return yards > line | T = returns). returns = 0 ⇒ yards = 0.
 *
 * Delegates to the NB posterior-predictive survival in probOver (props-hb),
 * where the Gamma-Poisson compound of yards-per-return over `returns`
 * exposures gives a Negative Binomial: Y ~ NB(r=alpha, p=beta/(beta+returns)).
 */
export function probOverKickoffReturnYardsGivenReturns(
  yardPost: GammaPosterior,
  returns: number,
  line: number,
): number {
  if (!Number.isFinite(returns) || returns < 0) {
    throw new RangeError(`probOverKickoffReturnYardsGivenReturns: returns must be finite and ≥ 0 (got ${returns})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverKickoffReturnYardsGivenReturns: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (returns === 0) return 0;
  return probOver(yardPost, line, returns);
}

/**
 * Mix P(return yards > line | T=k) over next-game returns T ~ NB(retPost, 1 game).
 *
 * ZIP hurdle is P(T=0): no returns, no yards. The returns-per-game posterior
 * (retPost) is the count NB from fitKickoffReturnAttemptsPrior +
 * posteriorKickoffReturnAttempts; the yardage posterior (yardPost) is the
 * NB from fitKickoffReturnYardsPrior + posteriorKickoffReturnYards.
 */
export function probOverKickoffReturnYards(yardPost: GammaPosterior, retPost: GammaPosterior, line: number): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverKickoffReturnYards: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;

  let acc = 0;
  let mass = 0;
  for (let k = 0; k <= RET_K_MAX; k++) {
    const pT = nbPmf(retPost, 1, k);
    if (pT <= 0) continue;
    mass += pT;
    if (k === 0) continue; // ZIP hurdle: 0 returns ⇒ 0 yards
    acc += pT * probOverKickoffReturnYardsGivenReturns(yardPost, k, line);
    if (k > 3 && pT < TAIL && mass > 1 - 1e-9) break;
  }
  return Math.max(0, Math.min(1, acc));
}

/**
 * P(return attempts > line | posterior) for one future game.
 *
 * Delegates to the NB posterior-predictive survival in probOver (props-hb).
 * A line of 0.5 means P(≥1 return) = 1 − P(returns=0).
 */
export function probOverKickoffReturnAttempts(post: GammaPosterior, line: number, games: number = 1): number {
  return probOver(post, line, games);
}

// ── internal: NB CDF / PMF over the mixing distribution ──────────────────────

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
