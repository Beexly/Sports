/**
 * Defensive snap share given position-group opportunity, not calendar games.
 *
 * H1 Edge #4 — Defensive snap share %.
 * Books and market-makers treat defensive snap count as a raw volume prop —
 * but snap share (%) is the leak-safe, role-revealing signal. A LB who jumps
 * from 62% to 82% of defensive snaps is getting more opportunities, and his
 * pressure / tackle / PD volume rides that share. The share itself is rarely
 * posted as an explicit prop line — it is priced implicitly via the volume
 * props, creating a calibration gap we can exploit.
 *
 * Model: snap_count | games ~ Gamma-Poisson (negligible zero-inflation for
 * active roster players; healthy scratches are excluded upstream). The prior
 * shrinks toward the position-group mean snap count, and we answer P(snaps >
 * line) via the NB posterior-predictive survival (props-hb.probOver).
 *
 * The share comes from the covariate bus (pfr_advstats variant=def → def_snaps,
 * or player_stats_week def_snaps). It carries its grain + provenance.
 *
 * Independent p. Pure. No I/O. priced:false. No Odds market.
 */
import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  type GammaPrior,
  type GammaPosterior,
  type RateSample,
} from "./props-hb.js";

export const DEF_SNAP_SHARE_HB_METHOD_TAG = "props_hb_def_snap_share_v1" as const;

export type DefSnapShareSample = {
  readonly games: number;
  readonly snaps: number;
};

/** Empirical-Bayes Gamma prior on per-game snap count. 0-game players excluded. */
export function fitDefSnapSharePrior(samples: readonly DefSnapShareSample[]): GammaPrior | null {
  const rates = samples.filter((s) => s.games > 0).map((s): RateSample => ({ games: s.games, total: s.snaps }));
  return fitGroupPrior(rates);
}

export function posteriorDefSnapShare(prior: GammaPrior, games: number, snaps: number): GammaPosterior {
  return posteriorRate(prior, snaps, games);
}

/** P(snaps > line) for the next game — NB posterior-predictive survival. */
export function probOverDefSnapShare(post: GammaPosterior, line: number): number {
  return probOver(post, line, 1);
}

export { probOver as probOverDefSnapShareInternal };
