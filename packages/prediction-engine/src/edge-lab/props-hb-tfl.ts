/**
 * TFL (tackles for loss) given defensive opportunities, not calendar games.
 *
 * H1 Edge #2 — TFL.
 *
 * Books misprice TFL as a sack prop. TFL clears on runs, screens, and
 * backside pursuit — a different statistical population from sacks (which
 * are pass-only). The volume overlap is real but the conditional distributions
 * differ, creating a calibration gap.
 *
 * TFL is a count of plays where the tackle for loss occurs. A defensive
 * snap is the opportunity. TFL | snaps ~ Beta-Binomial (TFL bounded by
 * snaps, but practically bounded by snaps * defensive snap share for the
 * position). We model TFL rate as a Beta-Binomial over snap exposures.
 *
 * snap is not a perfect exposure denominator (a player could be in coverage
 * and not involved in the run), but it is the leak-safe, available signal
 * from PFR advstats def (def_snaps). The covariate bind forwards the weekly
 * TFL rate as context.
 *
 * Independent p. Pure. No I/O. priced:false. No Odds market.
 */
import {
  betaBinomialProbOver,
  fitCatchPrior,
  posteriorCatch,
  type BetaPosterior,
  type BetaPrior,
  type CatchSample,
} from "./props-hb-catch.js";

export const TFL_HB_METHOD_TAG = "props_hb_tfl_v1" as const;

export type TflSample = {
  readonly snaps: number;
  readonly tfl: number;
};

function toCatch(s: TflSample): CatchSample {
  return { targets: s.snaps, receptions: s.tfl };
}

/** Empirical-Bayes Beta prior on TFL rate per defensive snap. */
export function fitTflPrior(samples: readonly TflSample[]): BetaPrior | null {
  const valid = samples.filter((s) => s.snaps > 0 && s.tfl >= 0 && s.tfl <= s.snaps);
  if (valid.length === 0) return null;
  return fitCatchPrior(valid.map(toCatch));
}

export function posteriorTfl(prior: BetaPrior, snaps: number, tfl: number): BetaPosterior {
  return posteriorCatch(prior, tfl, snaps);
}

/** P(TFL > line | snaps = k) — bounded Beta-Binomial survival. */
export function betaBinomialProbOverTfl(post: BetaPosterior, line: number, snaps: number): number {
  return betaBinomialProbOver(post, line, snaps);
}
