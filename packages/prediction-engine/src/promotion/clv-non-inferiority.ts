/**
 * Leg 2 — CLV non-inferiority (contract §3), over the SAME `welchCompare`
 * used by nflverse trend reports (packages/prediction-engine/src/trend-discovery.ts).
 *
 * H0: mu_K <= mu_C - epsilon   (challenger materially worse than champion)
 * H1: mu_K >  mu_C - epsilon   (challenger is within the non-inferiority margin)
 *
 * `welchCompare(a, b)` returns a TWO-SIDED p-value for `mean(a) - mean(b)`.
 * We want a ONE-SIDED test of `mean(challenger) - mean(champion) + epsilon > 0`.
 * Shifting the champion sample by a constant (-epsilon) shifts its mean by
 * exactly that constant without touching its variance, so
 * `welchCompare(challenger, champion.map(v => v - epsilon))` yields a z whose
 * numerator is exactly `mean(challenger) - mean(champion) + epsilon` — the
 * non-inferiority statistic — with the correct (unshifted) Welch standard
 * error. This is the "reuse welchCompare, derive the one-sided p" fix for
 * the skeleton's dropped-alpha defect: no hardcoded z-critical value, no
 * alpha silently discarded — the caller's (possibly Bonferroni-adjusted)
 * alphaAdj is compared directly against a real one-sided p-value.
 */

import { welchCompare } from "../trend-discovery.js";
import { zCritOneSided } from "./normal-quantile.js";

export type ClvNonInferiorityOptions = {
  /** Non-inferiority margin as a decimal fraction (contract default: 0.0005 = 5 bps). */
  readonly epsilon: number;
  /** Bonferroni-adjusted alpha (alpha / concurrentChallengers). */
  readonly alphaAdj: number;
  /** Minimum graded CLV rows required on EACH side (contract default: 100). */
  readonly minN: number;
};

export type ClvNonInferiorityResult = {
  readonly nChampion: number;
  readonly nChallenger: number;
  readonly meanChampion: number;
  readonly meanChallenger: number;
  readonly z: number;
  readonly oneSidedP: number;
  readonly zCrit: number;
  readonly epsilon: number;
  readonly alphaAdj: number;
  readonly minN: number;
  readonly pass: boolean;
  readonly reason?: string;
};

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample variance (ddof = 1); 0 when n < 2. */
function sampleVariance(xs: readonly number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (xs.length - 1);
}

export function welchOneSidedNonInferiority(
  challengerClv: readonly number[],
  championClv: readonly number[],
  options: ClvNonInferiorityOptions,
): ClvNonInferiorityResult {
  const nChallenger = challengerClv.length;
  const nChampion = championClv.length;
  const meanChallenger = mean(challengerClv);
  const meanChampion = mean(championClv);
  const zCrit = zCritOneSided(options.alphaAdj);

  if (nChallenger < options.minN || nChampion < options.minN) {
    return {
      nChampion,
      nChallenger,
      meanChampion,
      meanChallenger,
      z: NaN,
      oneSidedP: 1,
      zCrit,
      epsilon: options.epsilon,
      alphaAdj: options.alphaAdj,
      minN: options.minN,
      pass: false,
      reason:
        `insufficient graded CLV rows (need >= ${options.minN} per side, got ` +
        `champion=${nChampion}, challenger=${nChallenger})`,
    };
  }

  // Degenerate zero-variance case: when BOTH samples are constant, the
  // Welch standard error is 0 and welchCompare returns the neutral
  // {z: 0, pValue: 1}, which would fail the leg even when the observed
  // constant means differ decisively. With >= minN identical values per
  // side there is no sampling-noise model left to test — the evidence is
  // deterministic (common with flat or heavily-rounded CLV grades), so
  // decide by direct comparison of the non-inferiority statistic instead
  // of reporting "no evidence".
  const varChallenger = sampleVariance(challengerClv, meanChallenger);
  const varChampion = sampleVariance(championClv, meanChampion);
  // "Zero" up to float summation residue: a sample of identical stored CLV
  // values can yield a variance around 1e-36 rather than exactly 0 (mean
  // round-off), while any REAL spread in graded CLV (values differing by
  // even 1e-7 across >= minN rows) produces variance many orders above this
  // threshold. 1e-24 cleanly separates the two regimes.
  const ZERO_VARIANCE = 1e-24;
  if (varChallenger <= ZERO_VARIANCE && varChampion <= ZERO_VARIANCE) {
    const statistic = meanChallenger - meanChampion + options.epsilon;
    const degeneratePass = statistic > 0;
    return {
      nChampion,
      nChallenger,
      meanChampion,
      meanChallenger,
      z: degeneratePass ? Infinity : -Infinity,
      oneSidedP: degeneratePass ? 0 : 1,
      zCrit,
      epsilon: options.epsilon,
      alphaAdj: options.alphaAdj,
      minN: options.minN,
      pass: degeneratePass,
      reason: degeneratePass
        ? undefined
        : `zero-variance samples with mean(challenger) - mean(champion) + epsilon = ${statistic.toFixed(6)} <= 0 ` +
          "(deterministic inferiority beyond the margin)",
    };
  }

  const shiftedChampion = championClv.map((v) => v - options.epsilon);
  const { z, pValue } = welchCompare(challengerClv, shiftedChampion);

  // welchCompare's pValue is two-sided; the non-inferiority alternative is
  // one-sided in the direction z > 0.
  const oneSidedP = z > 0 ? pValue / 2 : 1 - pValue / 2;
  const pass = oneSidedP < options.alphaAdj;

  return {
    nChampion,
    nChallenger,
    meanChampion,
    meanChallenger,
    z,
    oneSidedP,
    zCrit,
    epsilon: options.epsilon,
    alphaAdj: options.alphaAdj,
    minN: options.minN,
    pass,
    reason: pass ? undefined : `one-sided p=${oneSidedP.toFixed(6)} >= alphaAdj=${options.alphaAdj}`,
  };
}
