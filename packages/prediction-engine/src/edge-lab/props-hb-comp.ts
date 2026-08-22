/**
 * Completions given attempts, not calendar games.
 *
 * Catch | targets (#519) is the WR analog. Books post completions O/U as a
 * two-way. Passing games into a completion-rate model treats a healthy
 * scratch (0 attempts) as a 0% passer. It is zero opportunity.
 *
 * Same closed-form as catch: attempts T ~ NB (existing pass-volume path),
 * completions | T=n ~ Beta-Binomial. P(C=0 | T=0) is the ZIP hurdle.
 *
 * Distinct from pass yards | attempts (#542): yards are unbounded Gamma-
 * Poisson; completions are bounded by attempts. Do not add an Odds market.
 * Independent p. Pure, deterministic, no I/O. priced:false.
 */

import {
  betaBinomialProbOver,
  fitCatchPrior,
  posteriorCatch,
  probOverReceptions,
  scoreReceptionsOver,
  type BetaPosterior,
  type BetaPrior,
  type CatchSample,
} from "./props-hb-catch.js";
import type { GammaPrior, GammaPosterior } from "./props-hb.js";

export const COMP_HB_METHOD_TAG = "props_hb_comp_v1" as const;

export type CompSample = {
  readonly attempts: number;
  readonly completions: number;
};

function toCatch(s: CompSample): CatchSample {
  return { targets: s.attempts, receptions: s.completions };
}

/** Empirical-Bayes Beta on completion rate. Attempts=0 is not a 0% passer. */
export function fitCompletionPrior(samples: readonly CompSample[]): BetaPrior | null {
  return fitCatchPrior(samples.map(toCatch));
}

export function posteriorCompletion(prior: BetaPrior, completions: number, attempts: number): BetaPosterior {
  return posteriorCatch(prior, completions, attempts);
}

/** P(completions > line | attempts = n). n=0 and line>=0 → 0. */
export function betaBinomialProbOverCompletions(post: BetaPosterior, line: number, n: number): number {
  return betaBinomialProbOver(post, line, n);
}

/** Mix Beta-Binomial completions over next-game attempts T ~ NB. ZIP is P(T=0). */
export function probOverCompletions(
  compPost: BetaPosterior,
  attemptPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  return probOverReceptions(compPost, attemptPost, line, games);
}

/**
 * Conjugate updates then mix. Completion history is attempts>0 only.
 * `attemptGames` / `attemptTotal` include zero-attempt games so P(T=0) is the hurdle.
 */
export function scoreCompletionsOver(args: {
  readonly compPrior: BetaPrior;
  readonly attemptPrior: GammaPrior;
  readonly compHistory: readonly CompSample[];
  readonly attemptGames: number;
  readonly attemptTotal: number;
  readonly line: number;
}): number {
  return scoreReceptionsOver({
    catchPrior: args.compPrior,
    targetPrior: args.attemptPrior,
    catchHistory: args.compHistory.map(toCatch),
    targetGames: args.attemptGames,
    targetTotal: args.attemptTotal,
    line: args.line,
  });
}
