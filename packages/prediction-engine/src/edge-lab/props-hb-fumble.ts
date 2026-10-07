/**
 * Fumbles | touches, not calendar games.
 *
 * H2 Edge — Fumbles. Beta-Binomial over touches (bounded: fumbles <= touches).
 *
 * EDGE: Books price fumbles as a raw count but miss the opportunity-adjusted
 * rate. A RB with 2 fumbles on 350 touches (0.57%) is priced the same as
 * a WR with 2 fumbles on 80 targets (2.5%) — but the latter is the rarer,
 * higher-risk outcome. The rate (fumbles per touch) is the signal; the
 * count is the market lag.
 *
 * Fumbles are rare events (~1% league-wide), high variance — similar to
 * INTs model. But unlike INTs (defense only), this covers BOTH offense
 * (fumbles_lost) and defense (fumbles_force + fumbles_recovered).
 *
 * Bounded by touches -> Beta-Binomial, same family as props-hb-int,
 * props-hb-pressures, props-hb-sacks.
 *
 * PFR `player_stats` and `player_stats_def` have per-player-game fumble
 * data. `off_fumbles_lost` + `def_fumbles_forced` + `def_fumbles_recovered`.
 *
 * HONESTY: fumbles here = PFR `fumbles` (loose balls, CC-BY-4.0), NOT
 * just fumbles_lost. A fumble recovery by the player's own team still
 * counts as a fumble event. No touch = no opportunity = no data.
 * Fail-closed on sparse samples.
 *
 * Pure, deterministic, no I/O. priced:false.
 */
import {
  betaBinomialProbOver,
  fitCatchPrior,
  posteriorCatch,
  type BetaPosterior,
  type BetaPrior,
  type CatchSample,
} from "./props-hb-catch.js";

export const FUMBLE_HB_METHOD_TAG = "props_hb_fumble_v1" as const;

/**
 * PFR player-game sample.
 * `touches` = offensive touches (carries + targets) + defensive
 * fumble opportunities (passes defended + snaps).
 * `fumbles` = total fumbles (loose balls, CC-BY-4.0).
 */
export type FumbleSample = {
  readonly touches: number;
  readonly fumbles: number;
};

function toCatch(s: FumbleSample): CatchSample {
  return { targets: s.touches, receptions: s.fumbles };
}

/**
 * Empirical-Bayes Beta prior on fumble rate (fumbles / touches).
 * Zero-touch games are not valid samples — zero opportunity.
 * Also filters samples where fumbles > touches (invalid).
 */
export function fitFumblePrior(samples: readonly FumbleSample[]): BetaPrior | null {
  const valid = samples.filter(
    (s) => s.touches > 0 && s.fumbles >= 0 && s.fumbles <= s.touches
  );
  if (valid.length === 0) return null;
  return fitCatchPrior(valid.map(toCatch));
}

/**
 * Conjugate Beta update: fumbles + (touches - fumbles).
 * Parameter order matches the catches/sacks/pressures pattern.
 */
export function fumblePosterior(prior: BetaPrior, fumbles: number, touches: number): BetaPosterior {
  // Zero-opportunity update is a no-op — posteriorCatch rejects beta=0.
  if (touches <= 0) {
    return { ...prior, mean: prior.alpha / (prior.alpha + prior.beta) };
  }
  return posteriorCatch(prior, fumbles, touches);
}

/** P(Fumbles > line | touches = n). n=0 and line >= 0 -> 0. */
export function probOverFumble(post: BetaPosterior, line: number, touches: number): number {
  if (line < 0) return 1;
  return betaBinomialProbOver(post, line, touches);
}

export type FumblePrior = BetaPrior;
export type FumblePosterior = BetaPosterior;
