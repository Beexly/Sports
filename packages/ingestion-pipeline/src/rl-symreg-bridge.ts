/**
 * RL + SymReg bridge — wires distributional slate RL, CQL stake policy,
 * and symbolic-regression priors into the live sizing + model-selection
 * surface.
 *
 * This is the "size under distributional risk, guard against degenerate
 * formulas" layer: CVaR-aware stake selection, CQL-conservative policies,
 * effective sample size for importance weights, and LM-prior ranking that
 * refuses degenerate expressions.
 *
 * Fail-closed on missing inputs. Never invents a distribution or a prior.
 */

import {
  distMean,
  distStd,
  cvar,
  greedyStakeIndex,
} from "@sports/prediction-engine";
import {
  iqnCvar,
  cvarGreedy,
  quantileECE,
  iqnGate,
} from "@sports/prediction-engine";
import {
  expectileOf,
  meanConsistencyGap,
  consistencyGate,
  expectileGate,
} from "@sports/prediction-engine";
import {
  cqlPenalty,
  bellmanMse,
  opeSelfNormalized,
  ess,
  doublyRobust,
  lowerBoundDiagnostic,
} from "@sports/prediction-engine";
import {
  trainPrior,
  logPrior,
  logEvidence,
  rankByPrior,
  degeneracyGuard,
  type LMPrior,
  type Candidate,
  type RankedCandidate,
} from "@sports/prediction-engine";
import { stlsqFit, openLoopBfr } from "@sports/prediction-engine";

export type RlEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Distributional slate RL ────────────────────────────────────────────────

export interface DistributionStats {
  readonly mean: number;
  readonly std: number;
  readonly cvar: number;
}

/**
 * Mean / std / CVaR of a categorical value distribution over atom support
 * [vMin, vMax]. Fail-closed on non-proper distributions.
 */
export function evalDistributionStats(input: {
  readonly probs: readonly number[];
  readonly vMin: number;
  readonly vMax: number;
  readonly alpha?: number;
}): RlEval<DistributionStats> {
  const { probs, vMin, vMax, alpha } = input;
  if (!Array.isArray(probs) || probs.length === 0) {
    return { ok: false, reason: "probs must be non-empty" };
  }
  if (!Number.isFinite(vMin) || !Number.isFinite(vMax) || vMax <= vMin) {
    return { ok: false, reason: "vMin/vMax finite with vMax > vMin required" };
  }
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p == null || !Number.isFinite(p) || p < 0) {
      return { ok: false, reason: `probs[${i}] must be finite and >= 0 — not imputed` };
    }
    sum += p;
  }
  if (Math.abs(sum - 1) > 0.05) {
    return { ok: false, reason: "probs must sum to ~1 — not a proper distribution" };
  }
  try {
    const a = probs as number[];
    return {
      ok: true,
      data: {
        mean: Number(distMean(a, vMin, vMax).toFixed(6)),
        std: Number(distStd(a, vMin, vMax).toFixed(6)),
        cvar: Number(cvar(a, vMin, vMax, alpha ?? 0.2).toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Greedy stake index over a slate of categorical distributions.
 * mode = "cvar" (risk-averse, default) or "mean".
 */
export function evalGreedyStake(input: {
  readonly distributions: readonly (readonly number[])[];
  readonly vMin: number;
  readonly vMax: number;
  readonly mode?: "cvar" | "mean";
  readonly lambda?: number;
  readonly alpha?: number;
}): RlEval<number> {
  const { distributions, vMin, vMax, mode, lambda, alpha } = input;
  if (!Array.isArray(distributions) || distributions.length === 0) {
    return { ok: false, reason: "distributions must be non-empty" };
  }
  if (!Number.isFinite(vMin) || !Number.isFinite(vMax) || vMax <= vMin) {
    return { ok: false, reason: "vMin/vMax finite with vMax > vMin required" };
  }
  try {
    const idx = greedyStakeIndex(
      distributions as number[][],
      vMin,
      vMax,
      mode ?? "cvar",
      lambda ?? 1,
      alpha ?? 0.2,
    );
    return { ok: true, data: idx };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * IQN CVaR + gate: ROI gain and quantile ECE decide ADAPT/REJECT.
 */
export function evalIqnGate(input: {
  readonly taus: readonly number[];
  readonly values: readonly number[];
  readonly alpha: number;
  readonly roiGainPp: number;
  readonly ece: number;
}): RlEval<{ readonly cvar: number; readonly verdict: string }> {
  const { taus, values, alpha, roiGainPp, ece } = input;
  if (!Array.isArray(taus) || !Array.isArray(values) || taus.length === 0 || taus.length !== values.length) {
    return { ok: false, reason: "taus/values must be non-empty and aligned" };
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "alpha must be finite in (0,1)" };
  }
  try {
    const cv = iqnCvar(taus as number[], values as number[], alpha);
    const verdict = iqnGate(roiGainPp, ece);
    return {
      ok: true,
      data: { cvar: Number(cv.toFixed(6)), verdict },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Expectile of a value set at level tau (asymmetric squared loss).
 */
export function evalExpectile(input: {
  readonly values: readonly number[];
  readonly tau: number;
}): RlEval<number> {
  const { values, tau } = input;
  if (!Array.isArray(values) || values.length === 0) {
    return { ok: false, reason: "values must be non-empty" };
  }
  if (!Number.isFinite(tau) || tau <= 0 || tau >= 1) {
    return { ok: false, reason: "tau must be finite in (0,1)" };
  }
  try {
    const e = expectileOf(values as number[], tau);
    return { ok: true, data: Number(e.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Consistency gate: does the implied mean match the MC mean within tol?
 */
export function evalConsistencyGate(input: {
  readonly impliedMean: number;
  readonly mcMean: number;
  readonly tol: number;
}): RlEval<{ readonly gap: number; readonly verdict: string }> {
  const { impliedMean, mcMean, tol } = input;
  if (
    !Number.isFinite(impliedMean) ||
    !Number.isFinite(mcMean) ||
    !Number.isFinite(tol) ||
    tol < 0
  ) {
    return { ok: false, reason: "impliedMean/mcMean finite and tol >= 0 required" };
  }
  try {
    const gap = meanConsistencyGap(impliedMean, mcMean);
    const verdict = consistencyGate(gap, tol);
    return {
      ok: true,
      data: { gap: Number(gap.toFixed(6)), verdict },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── CQL stake policy ───────────────────────────────────────────────────────

/**
 * Conservative Q-learning penalty: the gap between random-policy and
 * data-policy Q means, scaled by alpha.
 */
export function evalCqlPenalty(input: {
  readonly qData: readonly number[];
  readonly qRandom: readonly number[];
  readonly alpha: number;
}): RlEval<number> {
  const { qData, qRandom, alpha } = input;
  if (!Array.isArray(qData) || !Array.isArray(qRandom) || qData.length === 0 || qRandom.length === 0) {
    return { ok: false, reason: "qData/qRandom must be non-empty" };
  }
  if (!Number.isFinite(alpha)) {
    return { ok: false, reason: "alpha must be finite" };
  }
  try {
    const p = cqlPenalty(qData as number[], qRandom as number[], alpha);
    return { ok: true, data: Number(p.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Effective sample size of importance weights — the honest sample count
 * after weighting. Never returns a fabricated n.
 */
export function evalEss(input: { readonly weights: readonly number[] }): RlEval<number> {
  const { weights } = input;
  if (!Array.isArray(weights) || weights.length === 0) {
    return { ok: false, reason: "weights must be non-empty" };
  }
  for (let i = 0; i < weights.length; i++) {
    if (!Number.isFinite(weights[i])) {
      return { ok: false, reason: `weights[${i}] must be finite — not imputed` };
    }
  }
  try {
    return { ok: true, data: Number(ess(weights as number[]).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Doubly-robust off-policy estimate with the self-normalized importance
 * weight and a lower-bound diagnostic. `qModel` is the learned model's Q,
 * `qBehavior` the behavior policy's Q.
 */
export function evalDoublyRobust(input: {
  readonly rewards: readonly number[];
  readonly weights: readonly number[];
  readonly qModel: readonly number[];
  readonly qBehavior: readonly number[];
}): RlEval<{ readonly dr: number; readonly lb: number; readonly ess: number }> {
  const { rewards, weights, qModel, qBehavior } = input;
  if (
    !Array.isArray(rewards) ||
    !Array.isArray(weights) ||
    !Array.isArray(qModel) ||
    !Array.isArray(qBehavior) ||
    rewards.length === 0 ||
    rewards.length !== weights.length ||
    rewards.length !== qModel.length ||
    rewards.length !== qBehavior.length
  ) {
    return {
      ok: false,
      reason: "rewards/weights/qModel/qBehavior must be non-empty and aligned",
    };
  }
  try {
    const dr = doublyRobust(
      rewards as number[],
      weights as number[],
      qModel as number[],
      qBehavior as number[],
    );
    const lb = lowerBoundDiagnostic(qModel as number[], rewards as number[]);
    const e = ess(weights as number[]);
    return {
      ok: true,
      data: {
        dr: Number(dr.toFixed(6)),
        lb: Number(lb.toFixed(6)),
        ess: Number(e.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── SymReg: LM prior + degeneracy guard ────────────────────────────────────

/**
 * Rank symbolic-expression candidates by LM prior (complexity-penalized).
 * The degeneracy guard refuses a ranking whose top-K are all degenerate.
 */
export function evalRankByPrior(input: {
  readonly corpus: readonly unknown[];
  readonly candidates: readonly unknown[];
  readonly topK?: number;
}): RlEval<{
  readonly ranked: readonly RankedCandidate[];
  readonly passed: boolean;
  readonly prior: LMPrior;
}> {
  const { corpus, candidates, topK } = input;
  if (!Array.isArray(corpus) || corpus.length === 0) {
    return { ok: false, reason: "corpus must be non-empty to train the LM prior" };
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { ok: false, reason: "candidates must be non-empty" };
  }
  try {
    const prior = trainPrior(corpus as never);
    const ranked = rankByPrior(candidates as never, prior) as RankedCandidate[];
    const passed = degeneracyGuard(ranked, topK ?? 5);
    return {
      ok: true,
      data: {
        ranked,
        passed,
        prior,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * SINDy sparse-dynamics fit + open-loop BFR diagnostic.
 */
export function evalSindy(input: {
  readonly library: readonly (readonly number[])[];
  readonly derivatives: readonly number[];
  readonly threshold: number;
  readonly actual: readonly number[];
  readonly predicted: readonly number[];
}): RlEval<{ readonly bfr: number }> {
  const { library, derivatives, threshold, actual, predicted } = input;
  if (!Array.isArray(library) || library.length === 0) {
    return { ok: false, reason: "library must be non-empty" };
  }
  if (!Array.isArray(derivatives) || derivatives.length !== library.length) {
    return { ok: false, reason: "derivatives must align with library rows" };
  }
  if (!Number.isFinite(threshold) || threshold < 0) {
    return { ok: false, reason: "threshold must be finite and >= 0" };
  }
  if (!Array.isArray(actual) || !Array.isArray(predicted) || actual.length !== predicted.length || actual.length === 0) {
    return { ok: false, reason: "actual/predicted must be non-empty and aligned" };
  }
  try {
    stlsqFit(library as number[][], derivatives as number[], threshold);
    const bfr = openLoopBfr(actual as number[], predicted as number[]);
    return { ok: true, data: { bfr: Number(bfr.toFixed(6)) } };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  distMean,
  distStd,
  cvar,
  greedyStakeIndex,
  iqnCvar,
  iqnGate,
  expectileOf,
  consistencyGate,
  cqlPenalty,
  ess,
  doublyRobust,
  trainPrior,
  rankByPrior,
  degeneracyGuard,
  stlsqFit,
  openLoopBfr,
};
export type { LMPrior, Candidate, RankedCandidate };
