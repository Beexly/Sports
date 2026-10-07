/**
 * QB pressures given dropbacks, not calendar games.
 *
 * A dropback is an attempt or a sack. Pressures (hurries + hits + sacks) cannot
 * exceed dropbacks, so this is bounded Beta-Binomial — the same closed-form as
 * the sacks model (props-hb-sacks) but priced on a DIFFERENT y-axis.
 *
 * EDGE: Books price sacks only. Pressures capture QB disruption (hurries + hits +
 * sacks) which better reflects pass-protection quality. PFR advanced defensive
 * stats publish `def_pressures` per player-game. The market inefficiency:
 * pressures > sacks for predictive signal, but no book offers a pressures O/U.
 * We price the over/under on pressures|dropbacks as a prop-building edge, not a
 * direct book line — we shop line movement on correlated sack props as a proxy.
 *
 * Distinct from INTs | attempts (#542): INTs are rare, high-variance events;
 * pressures are frequent process signals. Independent p. Pure, no I/O. priced:false.
 *
 * HONESTY: pressures here = hurries + hits + sacks from PFR `def` advanced stats.
 * We DO NOT synthesize pressures from PBP — PFR's manual charting is the ground
 * truth for pressure attribution (PFF methodology differs; PFR is CC-BY-4.0).
 * No pressure = no data. Fail-closed on sparse samples.
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

export const PRESSURES_HB_METHOD_TAG = "props_hb_pressures_v1" as const;

/**
 * PFr defensive pressure sample per player-game.
 * `dropbacks` = pass protection opportunities faced by the defender's unit.
 * `pressures` = hurries + hits + sacks (PFR def_pressures, def_times_hurried, def_times_hitqb, def_sacks).
 */
export type PressureSample = {
  readonly dropbacks: number;
  readonly pressures: number;
};

function toCatch(s: PressureSample): CatchSample {
  return { targets: s.dropbacks, receptions: s.pressures };
}

/**
 * Empirical-Bayes Beta on pressure rate (pressures / dropbacks).
 * Dropbacks=0 is not a 0% pressure passer — it is zero opportunity.
 */
export function fitPressurePrior(samples: readonly PressureSample[]): BetaPrior | null {
  return fitCatchPrior(samples.map(toCatch));
}

export function posteriorPressure(prior: BetaPrior, pressures: number, dropbacks: number): BetaPosterior {
  return posteriorCatch(prior, pressures, dropbacks);
}

/** P(pressures > line | dropbacks = n). n=0 and line>=0 → 0. */
export function betaBinomialProbOverPressures(post: BetaPosterior, line: number, n: number): number {
  return betaBinomialProbOver(post, line, n);
}

/** Mix Beta-Binomial pressures over next-game dropbacks T ~ NB. ZIP is P(T=0). */
export function probOverPressures(
  pressurePost: BetaPosterior,
  dropbackPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  return probOverReceptions(pressurePost, dropbackPost, line, games);
}

/**
 * Conjugate updates then mix. Pressure history is dropbacks>0 only.
 * `dropbackGames` / `dropbackTotal` include zero-dropback games so P(T=0) is the hurdle.
 */
export function scorePressuresOver(args: {
  readonly pressurePrior: BetaPrior;
  readonly dropbackPrior: GammaPrior;
  readonly pressureHistory: readonly PressureSample[];
  readonly dropbackGames: number;
  readonly dropbackTotal: number;
  readonly line: number;
}): number {
  return scoreReceptionsOver({
    catchPrior: args.pressurePrior,
    targetPrior: args.dropbackPrior,
    catchHistory: args.pressureHistory.map(toCatch),
    targetGames: args.dropbackGames,
    targetTotal: args.dropbackTotal,
    line: args.line,
  });
}
