/**
 * Score-model bridge — wires DSHDP-HMM regime detection, the WP blender
 * (Beta prior), and three-module score factorization (Poisson / NB / CMP /
 * INGARCH) into the live regime + score-model surface.
 *
 * This is the "detect regime shifts, shrink cell WPs toward a Beta prior,
 * and model correlated score counts" layer.
 *
 * Fail-closed on missing inputs. Never invents a regime or a pmf.
 */

import {
  hmmForwardLogLik,
  viterbi,
  hmmStationary,
  hamiltonFilter,
} from "@sports/prediction-engine";
import {
  betaUpdate,
  betaMean,
  betaVar,
  wpBlendCell,
  wpBlendLogistic,
  gammaPosteriorShrink,
} from "@sports/prediction-engine";
import {
  poissonMle,
  ingarchFilter,
  ingarchLogLik,
  cmpPmf,
  negBinPmf,
  negBinMoments,
  nestedScoreSim,
} from "@sports/prediction-engine";

export type ScoreEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── HMM regimes ────────────────────────────────────────────────────────────

export interface HmmRegimeResult {
  readonly stationary: readonly number[];
  readonly path: readonly number[];
  readonly logLik: number;
}

/**
 * HMM regime detection: stationary distribution + Viterbi path + forward
 * log-likelihood over a sequence of log-emissions.
 */
export function evalHmmRegimes(input: {
  readonly pi: readonly number[];
  readonly transition: readonly (readonly number[])[];
  readonly logEmit: readonly (readonly number[])[];
}): ScoreEval<HmmRegimeResult> {
  const { pi, transition, logEmit } = input;
  if (!Array.isArray(pi) || pi.length === 0) {
    return { ok: false, reason: "pi must be non-empty" };
  }
  if (
    !Array.isArray(transition) ||
    transition.length !== pi.length ||
    transition.some((row) => !Array.isArray(row) || row.length !== pi.length)
  ) {
    return { ok: false, reason: "transition must be a square matrix matching pi" };
  }
  if (!Array.isArray(logEmit) || logEmit.length === 0) {
    return { ok: false, reason: "logEmit must be non-empty" };
  }
  for (let t = 0; t < logEmit.length; t++) {
    const row = logEmit[t];
    if (!Array.isArray(row) || row.length !== pi.length) {
      return {
        ok: false,
        reason: `logEmit[${t}] must have length ${pi.length} — not imputed`,
      };
    }
  }
  try {
    const stationary = hmmStationary(transition as number[][]);
    const path = viterbi(pi as number[], transition as number[][], logEmit as number[][]);
    const logLik = hmmForwardLogLik(pi as number[], transition as number[][], logEmit as number[][]);
    return {
      ok: true,
      data: {
        stationary: stationary as number[],
        path: path as number[],
        logLik: Number(logLik.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Hamilton two-state regime filter: filtered probability of regime 1
 * at each observation.
 */
export function evalHamiltonFilter(input: {
  readonly ys: readonly number[];
  readonly mu: readonly [number, number];
  readonly sig: readonly [number, number];
  readonly p11: number;
  readonly p22: number;
}): ScoreEval<readonly number[]> {
  const { ys, mu, sig, p11, p22 } = input;
  if (!Array.isArray(ys) || ys.length === 0) {
    return { ok: false, reason: "ys must be non-empty" };
  }
  if (!Number.isFinite(p11) || p11 < 0 || p11 > 1 || !Number.isFinite(p22) || p22 < 0 || p22 > 1) {
    return { ok: false, reason: "p11/p22 must be finite in [0,1]" };
  }
  try {
    const filtered = hamiltonFilter(
      ys as number[],
      [mu[0], mu[1]],
      [sig[0], sig[1]],
      p11,
      p22,
    );
    return { ok: true, data: filtered as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── WP blender (Beta prior) ────────────────────────────────────────────────

export interface WpBlendResult {
  readonly cellProb: number;
  readonly blendedProb: number;
  readonly posteriorMean: number;
  readonly posteriorVar: number;
}

/**
 * Shrink a cell's win rate toward a Beta prior and blend it with the
 * pregame probability via a logistic link.
 */
export function evalWpBlend(input: {
  readonly wins: number;
  readonly trials: number;
  readonly alpha: number;
  readonly beta: number;
  readonly pregameP: number;
  readonly coef: readonly number[];
}): ScoreEval<WpBlendResult> {
  const { wins, trials, alpha, beta, pregameP, coef } = input;
  if (!Number.isFinite(wins) || !Number.isFinite(trials) || trials < 0 || wins < 0 || wins > trials) {
    return { ok: false, reason: "wins/trials must be finite with 0 <= wins <= trials" };
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || !Number.isFinite(beta) || beta <= 0) {
    return { ok: false, reason: "alpha/beta must be finite and > 0" };
  }
  if (!Number.isFinite(pregameP) || pregameP <= 0 || pregameP >= 1) {
    return { ok: false, reason: "pregameP must be finite in (0,1)" };
  }
  if (!Array.isArray(coef) || coef.length === 0) {
    return { ok: false, reason: "coef must be non-empty" };
  }
  try {
    const cellProb = wpBlendCell(wins, trials, alpha, beta);
    const blended = wpBlendLogistic(pregameP, cellProb, coef as number[]);
    const post = betaUpdate(alpha, beta, wins, trials - wins);
    return {
      ok: true,
      data: {
        cellProb: Number(cellProb.toFixed(6)),
        blendedProb: Number(blended.toFixed(6)),
        posteriorMean: Number(betaMean(post.a, post.b).toFixed(6)),
        posteriorVar: Number(betaVar(post.a, post.b).toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Gamma-Poisson posterior shrink: shrink an observed rate toward a
 * global mean under a Gamma(a0,b0) prior.
 */
export function evalGammaShrink(input: {
  readonly x: number;
  readonly n: number;
  readonly globalMean: number;
  readonly globalVar: number;
}): ScoreEval<number> {
  const { x, n, globalMean, globalVar } = input;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(n) ||
    n < 0 ||
    x < 0 ||
    !Number.isFinite(globalMean) ||
    globalMean < 0 ||
    !Number.isFinite(globalVar) ||
    globalVar <= 0
  ) {
    return {
      ok: false,
      reason: "x/n finite >= 0, globalMean >= 0, globalVar > 0 required",
    };
  }
  try {
    const shrunk = gammaPosteriorShrink(x, n, globalMean, globalVar);
    return { ok: true, data: Number(shrunk.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Three-module score factorization ───────────────────────────────────────

export interface ScoreFactorizationResult {
  readonly poissonMle: number;
  readonly negBin: { r: number; p: number };
  readonly sampleMean: number;
}

/**
 * Fit Poisson MLE and negative-binomial moments on a score-count series.
 * Returns both so the caller can see whether the data is under- or
 * over-dispersed relative to Poisson.
 */
export function evalScoreFactorization(input: {
  readonly counts: readonly number[];
}): ScoreEval<ScoreFactorizationResult> {
  const { counts } = input;
  if (!Array.isArray(counts) || counts.length < 2) {
    return { ok: false, reason: "counts must have at least 2 samples" };
  }
  for (let i = 0; i < counts.length; i++) {
    const k = counts[i];
    if (!Number.isInteger(k) || k! < 0) {
      return {
        ok: false,
        reason: `counts[${i}] must be a non-negative integer — not imputed`,
      };
    }
  }
  try {
    const mle = poissonMle(counts as number[]);
    const nb = negBinMoments(counts as number[]);
    return {
      ok: true,
      data: {
        poissonMle: Number(mle.toFixed(6)),
        negBin: { r: Number(nb.r.toFixed(6)), p: Number(nb.p.toFixed(6)) },
        sampleMean: Number(mle.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * CMP (Conway-Maxwell-Poisson) pmf for under/over-dispersed counts.
 */
export function evalCmpPmf(input: {
  readonly k: number;
  readonly lambda: number;
  readonly nu: number;
  readonly kmax?: number;
}): ScoreEval<number> {
  const { k, lambda, nu, kmax } = input;
  if (!Number.isInteger(k) || k < 0) {
    return { ok: false, reason: "k must be a non-negative integer" };
  }
  if (!Number.isFinite(lambda) || lambda <= 0 || !Number.isFinite(nu) || nu <= 0) {
    return { ok: false, reason: "lambda and nu must be finite and > 0" };
  }
  try {
    const p = cmpPmf(k, lambda, nu, kmax);
    return { ok: true, data: Number(p.toFixed(8)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Negative-binomial pmf.
 */
export function evalNegBinPmf(input: {
  readonly k: number;
  readonly r: number;
  readonly p: number;
}): ScoreEval<number> {
  const { k, r, p } = input;
  if (!Number.isInteger(k) || k < 0) {
    return { ok: false, reason: "k must be a non-negative integer" };
  }
  if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(p) || p <= 0 || p > 1) {
    return { ok: false, reason: "r > 0 and p in (0,1] required" };
  }
  try {
    const pmf = negBinPmf(k, r, p);
    return { ok: true, data: Number(pmf.toFixed(8)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  hmmForwardLogLik,
  viterbi,
  hmmStationary,
  hamiltonFilter,
  betaUpdate,
  betaMean,
  betaVar,
  wpBlendCell,
  wpBlendLogistic,
  gammaPosteriorShrink,
  poissonMle,
  ingarchFilter,
  ingarchLogLik,
  cmpPmf,
  negBinPmf,
  negBinMoments,
  nestedScoreSim,
};
