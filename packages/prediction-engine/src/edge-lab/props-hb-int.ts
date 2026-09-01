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
 *
 * REFUSES a non-finite row rather than filtering it. There is a real
 * difference between a row that carries no opportunity and a row that carries
 * no meaning: `attempts === 0` is an honest observation (healthy scratch, no
 * targets faced) and is dropped, but a NaN/Infinity `attempts` or `ints` is
 * corrupt input — a parser miss, or a rate divided by a zero snap count. A
 * plain `s.attempts > 0 && s.ints >= 0` predicate is false for NaN, so a
 * filter SILENTLY DISCARDS a poisoned row and then fits a prior from the
 * survivors, reporting a clean result over data it quietly threw away. That is
 * imputation by omission. `fitCatchPrior` already throws RangeError on a
 * non-finite sample; pre-filtering was reaching around that guard, so the
 * check is restored here, where the row is still attributable.
 */
export function fitIntPrior(samples: readonly IntSample[]): BetaPrior | null {
  for (const s of samples) {
    if (!Number.isFinite(s.attempts) || !Number.isFinite(s.ints)) {
      throw new RangeError(
        `fitIntPrior: sample must be finite (got attempts=${s.attempts}, ints=${s.ints})`,
      );
    }
  }
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
