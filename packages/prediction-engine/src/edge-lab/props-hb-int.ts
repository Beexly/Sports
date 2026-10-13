/**
 * Interceptions | pass attempts, not calendar games.
 *
 * H2 Edge — INTs. Beta-Binomial over attempts (bounded: INT <= attempts).
 *
 * EDGE: Books price INTs as a raw count but misprice for opportunity and
 * target quality. A CB with 3 INTs on 80 targets (3.75%) is priced the
 * same as a safety with 3 INTs on 40 targets (7.5%) — but the latter is
 * the rarer, higher-skilled outcome. The rate (INT/target) is the signal;
 * the count is the market lag. PFR `def_int` with `def_targets` (or
 * `def_passes_defended`) gives the opportunity exposure.
 *
 * The market inefficiency: INTs are rare events (1.5-4% league-wide), high
 * variance, and books set static lines without per-player rate adjustment.
 * We price the over/under on INTs|attempts as a prop-building edge.
 *
 * Bounded by attempts -> Beta-Binomial, same closed-form as props-hb-sacks,
 * props-hb-pressures, props-hb-tfl. NOT the Gamma-Poisson count model.
 *
 * Distinct from PD (H1 Edge #3): INTs are interception events (yards, TDs);
 * PD is coverage quality (breakups, deflections). Independent p. Pure.
 *
 * HONESTY: INTs = PFR `def_int` (passed/def intended at the defender, CC-BY-4.0).
 * attempts = def_targets (targets faced by the defender) or def_passes_defended.
 * One INT per target at most — bounded by 1. No target = no opportunity.
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

export const INT_HB_METHOD_TAG = "props_hb_int_v1" as const;

/**
 * PFR defensive sample per player-game.
 * `attempts` = pass targets faced by the defender (opportunity).
 * `ints` = interceptions (PFR def_int, CC-BY-4.0).
 */
export type IntSample = {
  readonly attempts: number;
  readonly ints: number;
};

function toCatch(s: IntSample): CatchSample {
  return { targets: s.attempts, receptions: s.ints };
}

/**
 * Empirical-Bayes Beta prior on INT rate (ints / attempts).
 * Zero-attempt games are not valid samples — they have zero opportunity.
 * fitCatchPrior asserts targets > 0, so filter them first.
 * Also filters any sample where ints > attempts (invalid by definition).
 */
export function fitIntPrior(samples: readonly IntSample[]): BetaPrior | null {
  const valid = samples.filter(
    (s) => s.attempts > 0 && s.ints >= 0 && s.ints <= s.attempts
  );
  if (valid.length === 0) return null;
  return fitCatchPrior(valid.map(toCatch));
}

/**
 * Conjugate Beta update: ints + (attempts - ints).
 * Parameter order matches the catches/sacks/pressures pattern:
 * (prior, successes, attempts).
 */
export function intPosterior(prior: BetaPrior, ints: number, attempts: number): BetaPosterior {
  return posteriorCatch(prior, ints, attempts);
}

/** P(INTs > line | attempts = n). n=0 and line >= 0 -> 0. */
export function probOverInt(post: BetaPosterior, line: number, attempts: number): number {
  if (line < 0) return 1;
  return betaBinomialProbOver(post, line, attempts);
}

export type IntPosterior = BetaPosterior;
export type IntPrior = BetaPrior;

// ── Gamma per-attempt lane (the props-hb-bridge contract) ──────────────────
//
// The bridge's estimateIntOver prices the anytime-INT market (line 0.5) from
// a GAMMA per-attempt prior — the same closed-form family as pass TDs and
// rush TDs (props-hb-pass-td.ts / props-hb-rush-td.ts, shared core in
// props-hb.ts): P(X=0 | n) = (β/(β+n))^α, so P(≥1) falls out of the
// posterior directly. That estimator was never landed alongside the
// Beta-Binomial defensive model above, leaving the bridge importing three
// names that did not exist. It lives here, next to the Beta lane, with the
// distinction kept explicit: Beta-Binomial for the bounded defensive rate,
// Gamma-Poisson for the bridge's count-over-exposure price.
import { fitGroupPrior, posteriorRate, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";

function assertGammaSample(s: IntSample): void {
  if (!Number.isFinite(s.attempts) || !Number.isFinite(s.ints)) {
    throw new RangeError(`int sample must be finite (got attempts=${s.attempts}, ints=${s.ints})`);
  }
  if (s.attempts <= 0) {
    throw new RangeError(`int attempts must be > 0 (got ${s.attempts})`);
  }
  if (s.ints < 0) {
    throw new RangeError(`int ints must be ≥ 0 (got ${s.ints})`);
  }
}

export function fitIntPerAttemptPrior(samples: readonly IntSample[]): GammaPrior | null {
  if (samples.length === 0) return null;
  for (const s of samples) assertGammaSample(s);
  const rates: RateSample[] = samples.map((s) => ({ games: s.attempts, total: s.ints }));
  return fitGroupPrior(rates);
}

export function posteriorIntPerAttempt(prior: GammaPrior, player: IntSample): GammaPosterior {
  assertGammaSample(player);
  return posteriorRate(prior, player.ints, player.attempts);
}

export function intProbZero(post: GammaPosterior, exposure: number): number {
  if (!Number.isFinite(post.alpha) || !Number.isFinite(post.beta) || post.alpha <= 0 || post.beta <= 0) {
    throw new RangeError("intProbZero: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(exposure) || exposure < 0) {
    throw new RangeError(`intProbZero: exposure must be finite and ≥ 0 (got ${exposure})`);
  }
  if (exposure === 0) return 1;
  const p = post.beta / (post.beta + exposure);
  return Math.max(0, Math.min(1, p ** post.alpha));
}

export function probIntGivenAttempts(post: GammaPosterior, attempts: number): number {
  return 1 - intProbZero(post, attempts);
}
