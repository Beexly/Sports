/**
 * TFLs (tackles for loss) given defensive snaps, not calendar games.
 *
 * A snap is an opportunity. TFLs cannot exceed snaps, so this is bounded
 * Beta-Binomial — the same closed-form as the sacks/pressures models
 * (props-hb-sacks, props-hb-pressures) but priced on a DIFFERENT y-axis.
 *
 * EDGE: Books misprice TFL as a sack prop. TFL clears on runs, screens, and
 * backside pursuit — a different statistical population from sacks (which
 * are pass-only). The volume overlap is real but the conditional
 * distributions differ, creating a calibration gap. PFR advanced defensive
 * stats publish `def_tackles_for_loss` per player-game. The market
 * inefficiency: TFL > sacks for predictive signal on run defense, but no
 * book offers a TFL O/U. We price the over/under on TFLs|snaps as a
 * prop-building edge, not a direct book line.
 *
 * Distinct from sacks|dropbacks (#542) and pressures|dropbacks (H1 Edge #1):
 * TFLs are gap-control events on any defensive snap, not QB-pressure events
 * on dropbacks. Independent p. Pure, no I/O. priced:false. No Odds market.
 *
 * HONESTY: TFLs here = PFR `def_tackles_for_loss` (yards-from-line-of-scrimmage
 * method, CC-BY-4.0). We DO NOT synthesize TFLs from PBP — PFR's manual
 * charting is the ground truth for loss attribution (PFF methodology differs;
 * PFR is CC-BY-4.0). No snap = no opportunity = no data. Fail-closed on
 * sparse samples.
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

export const TFL_HB_METHOD_TAG = "props_hb_tfl_v1" as const;

/**
 * PFR defensive sample per player-game.
 * `snaps` = defensive snaps played by the defender (opportunity).
 * `tfl` = tackles for loss (yards-from-line-of-scrimmage method, PFR).
 */
export type TflSample = {
  readonly snaps: number;
  readonly tfl: number;
};

function toCatch(s: TflSample): CatchSample {
  return { targets: s.snaps, receptions: s.tfl };
}

/**
 * Empirical-Bayes Beta on TFL rate (tfl / snaps).
 * Zero-snap games are not valid samples — they are zero opportunity, not
 * a 0% TFL defender. fitCatchPrior asserts targets > 0.
 */
export function fitTflPrior(samples: readonly TflSample[]): BetaPrior | null {
  const valid = samples.filter((s) => s.snaps > 0 && s.tfl >= 0 && s.tfl <= s.snaps);
  if (valid.length === 0) return null;
  return fitCatchPrior(valid.map(toCatch));
}

/** Conjugate Beta update: TFL + (snaps - TFL). Parameter order matches
 *  the catches/sacks/pressures pattern: (prior, successes, attempts). */
export function posteriorTfl(prior: BetaPrior, tfl: number, snaps: number): BetaPosterior {
  return posteriorCatch(prior, tfl, snaps);
}

/** P(TFL > line | snaps = n). n=0 and line>=0 → 0. */
export function betaBinomialProbOverTfl(post: BetaPosterior, line: number, n: number): number {
  return betaBinomialProbOver(post, line, n);
}

/** Mix Beta-Binomial TFLs over next-game snaps T ~ NB. ZIP is P(T=0). */
export function probOverTfl(
  tflPost: BetaPosterior,
  snapPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  return probOverReceptions(tflPost, snapPost, line, games);
}

/**
 * Conjugate updates then mix. TFL history is snaps>0 only.
 * `snapGames` / `snapTotal` include zero-snap games so P(T=0) is the hurdle.
 * Do not pass calendar games that are actually DNPs the caller already dropped.
 */
export function scoreTflOver(args: {
  readonly tflPrior: BetaPrior;
  readonly snapPrior: GammaPrior;
  readonly tflHistory: readonly TflSample[];
  readonly snapGames: number;
  readonly snapTotal: number;
  readonly line: number;
}): number {
  return scoreReceptionsOver({
    catchPrior: args.tflPrior,
    targetPrior: args.snapPrior,
    catchHistory: args.tflHistory.map(toCatch),
    targetGames: args.snapGames,
    targetTotal: args.snapTotal,
    line: args.line,
  });
}
