/**
 * Pass Deflections (PD) given targets, not calendar games.
 *
 * A target is an opportunity. PD cannot exceed targets, so this is bounded
 * Beta-Binomial — the same closed-form as the catches/sacks/pressures models
 * (props-hb-catch, props-hb-sacks, props-hb-pressures) but priced on a
 * DIFFERENT y-axis.
 *
 * EDGE: Books rarely price PD directly. When they do, the market prices raw
 * PD counts without adjusting for targets — a player with 8 PD on 20 targets
 * (40%) is priced the same as one with 8 PD on 80 targets (10%). The rate is
 * the signal. PD | targets ~ Beta-Binomial (bounded by targets). Higher volume
 * → lower variance. PD is a coverage skill, independent of sack/TFL markets.
 *
 * PFR `advstats_week_def` and ESPN publish per-player-game PDs and targets
 * faced (CC-BY-4.0). The market inefficiency: PD has higher volume + lower luck
 * than INTs (Gridiron Decoded calls PD "honest measure"), but no book offers a
 * PD O/U. We price the over/under on PDs|targets as a prop-building edge,
 * not a direct book line.
 *
 * Distinct from INTs|attempts (#542): INTs are rare, high-variance events; PDs
 * are frequent process signals. Independent p. Pure, no I/O. priced:false.
 * No Odds market.
 *
 * HONESTY: PDs here = PFR `def_pdef` (pass deflections, CC-BY-4.0). We DO NOT
 * synthesize PDs from PBP — PFR/ESPN manual charting is the ground truth.
 * No target = no opportunity = no data. Fail-closed on sparse samples.
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

export const PD_HB_METHOD_TAG = "props_hb_pd_v1" as const;

/**
 * Defensive sample per player-game.
 * `targets` = passes targeted at the defender (coverage opportunity).
 * `pd` = pass deflections (PD / plays defended, PFR def_pdef).
 */
export type PdSample = {
  readonly targets: number;
  readonly pd: number;
};

function toCatch(s: PdSample): CatchSample {
  return { targets: s.targets, receptions: s.pd };
}

/**
 * Empirical-Betas Beta prior on PD rate per target.
 * Zero-target games are not valid samples — they are zero opportunity, not
 * a 0% PD defender. fitCatchPrior asserts targets > 0.
 */
export function fitPdPrior(samples: readonly PdSample[]): BetaPrior | null {
  return fitCatchPrior(samples.map(toCatch));
}

/** Conjugate Beta update following the catches/sacks/pressures pattern:
 *  (prior, successes=PD, attempts=targets). */
export function posteriorPd(prior: BetaPrior, pd: number, targets: number): BetaPosterior {
  return posteriorCatch(prior, pd, targets);
}

/** P(PD > line | targets = n). n=0 and line>=0 → 0. */
export function betaBinomialProbOverPd(post: BetaPosterior, line: number, n: number): number {
  return betaBinomialProbOver(post, line, n);
}

/** Mix Beta-Binomial PDs over next-game targets T ~ NB. ZIP is P(T=0). */
export function probOverPd(
  pdPost: BetaPosterior,
  targetPost: GammaPosterior,
  line: number,
  games: number = 1,
): number {
  return probOverReceptions(pdPost, targetPost, line, games);
}

/**
 * Conjugate updates then mix. PD history is targets>0 only.
 * `targetGames` / `targetTotal` include zero-target games so P(T=0) is the
 * hurdle. Do not pass calendar games that are actually DNPs the caller
 * already dropped.
 */
export function scorePdOver(args: {
  readonly pdPrior: BetaPrior;
  readonly targetPrior: GammaPrior;
  readonly pdHistory: readonly PdSample[];
  readonly targetGames: number;
  readonly targetTotal: number;
  readonly line: number;
}): number {
  return scoreReceptionsOver({
    catchPrior: args.pdPrior,
    targetPrior: args.targetPrior,
    catchHistory: args.pdHistory.map(toCatch),
    targetGames: args.targetGames,
    targetTotal: args.targetTotal,
    line: args.line,
  });
}
