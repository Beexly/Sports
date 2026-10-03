/**
 * Sacks given dropbacks, not calendar games.
 *
 * A dropback is an attempt or a sack. Sacks cannot exceed dropbacks, so this
 * is bounded Beta-Binomial (the catch analog), not unbounded Poisson (which
 * can predict sacks > dropbacks). A healthy scratch (0 dropbacks) is zero
 * opportunity, not a 0% sacked passer.
 *
 * Distinct from pass yards | attempts (#542), completions | attempts, and
 * INTs | attempts. Independent p. Pure, no I/O. priced:false. No Odds market.
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

export const SACK_HB_METHOD_TAG = "props_hb_sacks_v1" as const;

export type SackSample = {
  readonly dropbacks: number;
  readonly sacks: number;
};

function toCatch(s: SackSample): CatchSample {
  return { targets: s.dropbacks, receptions: s.sacks };
}

export function fitSackPrior(samples: readonly SackSample[]): BetaPrior | null {
  return fitCatchPrior(samples.map(toCatch));
}

export function posteriorSack(prior: BetaPrior, sacks: number, dropbacks: number): BetaPosterior {
  return posteriorCatch(prior, sacks, dropbacks);
}

export function betaBinomialProbOverSacks(post: BetaPosterior, line: number, n: number): number {
  return betaBinomialProbOver(post, line, n);
}

export function probOverSacks(
  sackPost: BetaPosterior,
  dropbackPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  return probOverReceptions(sackPost, dropbackPost, line, games);
}

export function scoreSacksOver(args: {
  readonly sackPrior: BetaPrior;
  readonly dropbackPrior: GammaPrior;
  readonly sackHistory: readonly SackSample[];
  readonly dropbackGames: number;
  readonly dropbackTotal: number;
  readonly line: number;
}): number {
  return scoreReceptionsOver({
    catchPrior: args.sackPrior,
    targetPrior: args.dropbackPrior,
    catchHistory: args.sackHistory.map(toCatch),
    targetGames: args.dropbackGames,
    targetTotal: args.dropbackTotal,
    line: args.line,
  });
}
