/**
 * Rush attempts volume given a position-group, not yards and not calendar games.
 *
 * Rush YARDS | attempts lives in props-hb-rush (#530) — that module conditions on
 * a known attempt total and asks "how many yards?". This module asks the prior
 * question: "how many attempts will the back see next game?" It is a pure
 * volume edge (count of attempts), distinct from every other passing/rushing
 * horse in the stable.
 *
 * The book posts a two-way over/under on rush attempts (e.g. "OVER 14.5 -110").
 * That line is a count, so the Gamma-Poisson / Negative-Binomial posterior-
 * predictive from props-hb is the exact conjugate model — same as receptions
 * (#519) and TDs (#531). No yardage scaling, no φ invented.
 *
 *   1. Group prior: alpha/beta fit from position-group (games, attempts).
 *      A back with 5 games and 60 attempts and another with 16 games and 210
 *      attempts shrink toward the group mean attempts-per-game.
 *   2. Player posterior: conjugate update of own (gameCount, attemptTotal).
 *   3. P(attempts > line) = 1 − I_p(r, floor(line)+1), the NB survival at
 *      one future game.
 *
 * Healthy scratch (0 games observed this window) ⇒ posterior = prior (full
 * shrinkage). Zero-attempt games are valid here (a back who played but was
 * never handed the ball is a real 0-attempt observation), so we do NOT drop
 * them — unlike yards/attempts rate fits, attempts volume IS the rate.
 *
 * Independent p only. Do not add an Odds market. Do not ingest the book's
 * attempt line into the prior. Pure, deterministic, no I/O. priced: false.
 */

import { fitGroupPrior, posteriorRate, probOver, type GammaPosterior, type GammaPrior } from "./props-hb.js";

export const RUSH_ATTEMPTS_HB_METHOD_TAG = "props_hb_rush_attempts_v1" as const;

/** A player's accumulated (games, attempts) — games = # of games played. */
export interface RushAttemptsSample {
  readonly games: number;
  readonly attempts: number;
}

function assertSample(s: RushAttemptsSample): void {
  if (!Number.isFinite(s.games) || !Number.isFinite(s.attempts)) {
    throw new RangeError(`rush-attempts sample must be finite (got games=${s.games}, attempts=${s.attempts})`);
  }
  if (s.games < 0) {
    throw new RangeError(`rush-attempts games must be ≥ 0 (got ${s.games})`);
  }
  if (s.attempts < 0) {
    throw new RangeError(`rush-attempts attempts must be ≥ 0 (got ${s.attempts})`);
  }
}

/**
 * Empirical-Bayes Gamma prior on per-game rush-attempt rate from the
 * position-group (games, attempts) pairs. Zero-attempt games are VALID
 * samples here (they are a real 0-attempt game, not a rate of 0/0) —
 * the rate is attempts PER game, so games stays the denominator.
 */
export function fitRushAttemptsPrior(samples: readonly RushAttemptsSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) {
    assertSample(s);
    if (s.games <= 0) {
      throw new RangeError(`rush-attempts sample must have games > 0 (got games=${s.games})`);
    }
  }
  const rates = samples.map((s) => ({ games: s.games, total: s.attempts }));
  return fitGroupPrior(rates);
}

/**
 * Conjugate posterior update for one player's per-game attempt rate,
 * combining the group prior with their own (games, attempts).
 * games=0 is valid: posterior collapses to the prior (full shrinkage).
 */
export function posteriorRushAttempts(prior: GammaPrior, player: RushAttemptsSample): GammaPosterior {
  assertSample(player);
  return posteriorRate(prior, player.attempts, player.games);
}

/**
 * P(rush attempts > line | posterior) for one future game.
 *
 * Delegates to the NB posterior-predictive survival in probOver (props-hb).
 * A line of 0.5 means P(≥1 attempt) = 1 − P(attempts=0) via the NB CDF.
 *
 * `playerGames` generalizes to a window of upcoming games sharing one rate
 * (defaults to 1 = next single game, the handoff's ask). Must be > 0.
 */
export function probOverRushAttempts(
  posterior: GammaPosterior,
  line: number,
  playerGames: number = 1,
): number {
  return probOver(posterior, line, playerGames);
}
