/**
 * Pass Deflections (PD) given games, not calendar props.
 *
 * H1 Edge #3 — PD.
 *
 * PD is an unbounded per-game count: a defender can deflect any number of
 * passes in a game — there is no fixed exposure that caps it. We model
 * PD | games ~ Gamma-Poisson (Negative-Binomial posterior-predictive), the
 * same family as props-hb-def-snap-share, NOT the Beta-Binomial two-part
 * model used by catches/sacks/pressures/TFL.
 *
 * Key distinction:
 *   - Beta-Binomial (sacks/pressures/TFL): y-axis is a *rate* bounded by a
 *     known exposure (dropbacks/snaps/targets). PD has no such ceiling.
 *   - Gamma-Poisson (PD/snap-share/rush): y-axis is a raw *count* per game,
 *     unbounded, modeled as Poisson(rate) with a Gamma prior on rate.
 *
 * EDGE: Books rarely price PD directly. When they do, the market prices raw
 * PD counts without adjusting for targets — a player with 8 PD on 20 targets
 * (40%) is priced the same as one with 8 PD on 80 targets (10%). The rate is
 * the signal. The covariate bind (props-hb-pd-bind) forwards the weekly PFR
 * `pdRate` (PD per target) as independent process context, but the *model*
 * is on raw game counts so the rate never leaks into the y-axis.
 *
 * PFR `advstats_week_def` and ESPN publish per-player-game PDs
 * (def_pdef, CC-BY-4.0). The market inefficiency: PD has higher volume +
 * lower luck than INTs (Gridiron Decoded calls PD "honest measure"), but no
 * book offers a PD O/U. We price the over/under on raw PD count over the
 * next `games` window as a prop-building edge, not a direct book line.
 *
 * Distinct from INTs|attempts (#542): INTs are rare, high-variance events;
 * PDs are frequent coverage-skill signals. Independent p. Pure. No I/O.
 * priced:false. No Odds market.
 *
 * HONESTY: PDs here = PFR `def_pdef` (CC-BY-4.0). We DO NOT synthesize PDs
 * from PBP — PFR/ESPN manual charting is the ground truth.
 *
 * Uses RateSample {games, total} from props-hb.js.
 */
import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  type GammaPrior,
  type GammaPosterior,
  type RateSample,
} from "./props-hb.js";

export const PD_HB_METHOD_TAG = "props_hb_pd_v1" as const;

/**
 * Per-player-game PD count sample.
 * `games` = number of games (opportunity window). `pd` = total pass
 * deflections across those games. A single game is games=1.
 */
export type PdSample = {
  readonly games: number;
  readonly pd: number;
};

/**
 * Empirical-Bayes Gamma prior on per-game PD rate across the position group.
 * Zero-game players (healthy scratches) are excluded — they are zero
 * opportunity, not a "zero PD" signal. Throws RangeError on invalid rows
 * (games <= 0 is filtered, not thrown, to allow mixed arrays).
 */
export function fitPdPrior(samples: readonly PdSample[]): GammaPrior | null {
  const rates = samples
    .filter((s) => s.games > 0)
    .map((s): RateSample => ({ games: s.games, total: s.pd }));
  return fitGroupPrior(rates);
}

/**
 * Conjugate Gamma-Poisson posterior: alpha' = alpha + pd, beta' = beta + games.
 * `games` is the player's observed game window; `pd` is their total deflections.
 * 0 games collapses to the prior (full shrinkage).
 */
export function posteriorPd(prior: GammaPrior, games: number, pd: number): GammaPosterior {
  return posteriorRate(prior, pd, games);
}

/**
 * Posterior-predictive P(PD > line) over the next `games` games (default 1).
 * Marginalizing Poisson(rate) over the Gamma posterior gives an
 * Negative-Binomial — the same closed-form as props-hb.probOver. PD is an
 * unbounded count, so the line is NOT bounded by any exposure.
 */
export function probOverPd(post: GammaPosterior, line: number, games: number = 1): number {
  return probOver(post, line, games);
}

/**
 * Convenience: fit the group prior, update the posterior with one player's
 * full (games, pd) history, and score P(PD > line) over the next window.
 *
 * Mirrors the scoreSacksOver / scorePressuresOver / scoreReceptionsOver
 * pattern — conjugate posterior update then probOver — but on the
 * single-distribution Gamma-Poisson path (no Beta-Binomial rate layer,
 * no NB target mixture).
 */
export function scorePdOver(args: {
  readonly pdPrior: GammaPrior;
  readonly pdHistory: readonly PdSample[];
  readonly line: number;
  readonly games: number;
}): number {
  let totalPd = 0;
  let totalGames = 0;
  for (const s of args.pdHistory) {
    if (s.games > 0) {
      totalPd += s.pd;
      totalGames += s.games;
    }
  }
  const post = posteriorPd(args.pdPrior, totalGames, totalPd);
  return probOverPd(post, args.line, args.games);
}
