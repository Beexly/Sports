/**
 * Bayesian bridge — wires hierarchical shrinkage, Dirichlet opinion pooling,
 * match-prior discipline, and EP-probit into the live estimation surface.
 *
 * This is the "shrink honestly, pool opinions, keep priors disciplined"
 * layer. Every estimator fail-closes on missing inputs and never invents
 * a posterior.
 */

import {
  partialPool,
  poolAll,
  ebTau2,
  type PooledEstimate,
} from "@sports/prediction-engine";
import {
  dirichletPredictive,
  opinionPool,
  fitPoolingWeight,
} from "@sports/prediction-engine";
import {
  blendAnalystView,
  cumulativeProbitPredict,
  rollForwardPriors,
} from "@sports/prediction-engine";
import {
  epProbitFit,
  epProbitPredict,
  type EpProbitOptions,
  type EpProbitResult,
} from "@sports/prediction-engine";

export type BayesEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Hierarchical shrinkage ─────────────────────────────────────────────────

/**
 * Partial-pool one group mean toward the prior. EB tau^2 is estimated from
 * the full group set first so the shrinkage is data-driven, not arbitrary.
 */
export function evalPartialPool(input: {
  readonly groupMeans: readonly number[];
  readonly ns: readonly number[];
  readonly sigma2: number;
}): BayesEval<readonly PooledEstimate[]> {
  const { groupMeans, ns, sigma2 } = input;
  if (
    !Array.isArray(groupMeans) ||
    !Array.isArray(ns) ||
    groupMeans.length === 0 ||
    groupMeans.length !== ns.length
  ) {
    return { ok: false, reason: "groupMeans/ns must be non-empty and aligned" };
  }
  if (!Number.isFinite(sigma2) || sigma2 <= 0) {
    return { ok: false, reason: "sigma2 must be finite and > 0" };
  }
  for (let i = 0; i < groupMeans.length; i++) {
    if (!Number.isFinite(groupMeans[i]) || !Number.isFinite(ns[i]) || ns[i]! <= 0) {
      return {
        ok: false,
        reason: `row ${i}: mean finite and n > 0 required — not imputed`,
      };
    }
  }
  try {
    const pooled = poolAll(
      groupMeans as number[],
      ns as number[],
      sigma2,
    );
    return { ok: true, data: pooled as PooledEstimate[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Estimate the between-group variance tau^2 (Empirical Bayes).
 */
export function evalEbTau2(input: {
  readonly groupMeans: readonly number[];
  readonly ns: readonly number[];
  readonly sigma2: number;
}): BayesEval<number> {
  const { groupMeans, ns, sigma2 } = input;
  if (
    !Array.isArray(groupMeans) ||
    !Array.isArray(ns) ||
    groupMeans.length === 0 ||
    groupMeans.length !== ns.length
  ) {
    return { ok: false, reason: "groupMeans/ns must be non-empty and aligned" };
  }
  if (!Number.isFinite(sigma2) || sigma2 <= 0) {
    return { ok: false, reason: "sigma2 must be finite and > 0" };
  }
  for (let i = 0; i < groupMeans.length; i++) {
    if (!Number.isFinite(groupMeans[i]) || !Number.isFinite(ns[i]) || ns[i]! <= 0) {
      return {
        ok: false,
        reason: `row ${i}: mean finite and n > 0 required — not imputed`,
      };
    }
  }
  try {
    const t2 = ebTau2(groupMeans as number[], ns as number[], sigma2);
    return { ok: true, data: Number(t2.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Dirichlet opinion pool ─────────────────────────────────────────────────

export type AtsOutcome = "cover" | "nocover" | "push";

/**
 * Pool home/away ATS distributions with weight w on home.
 * The away side is mirrored so the pool is always a proper distribution.
 */
export function evalOpinionPool(input: {
  readonly homeDist: Record<AtsOutcome, number>;
  readonly awayDist: Record<AtsOutcome, number>;
  readonly w: number;
}): BayesEval<Record<AtsOutcome, number>> {
  const { homeDist, awayDist, w } = input;
  if (!homeDist || !awayDist) {
    return { ok: false, reason: "homeDist and awayDist required" };
  }
  if (!Number.isFinite(w) || w < 0 || w > 1) {
    return { ok: false, reason: "w must be finite in [0,1]" };
  }
  try {
    const pooled = opinionPool(homeDist, awayDist, w);
    return { ok: true, data: pooled };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fit the pooling weight on settled games by log-loss grid search.
 */
export function evalFitPoolingWeight(input: {
  readonly games: ReadonlyArray<{
    readonly homeDist: Record<AtsOutcome, number>;
    readonly awayDist: Record<AtsOutcome, number>;
    readonly outcome: AtsOutcome;
  }>;
  readonly gridSteps?: number;
}): BayesEval<{ readonly w: number; readonly logLoss: number }> {
  const { games, gridSteps } = input;
  if (!Array.isArray(games) || games.length === 0) {
    return { ok: false, reason: "games must be non-empty" };
  }
  try {
    const r = fitPoolingWeight(games, gridSteps);
    return {
      ok: true,
      data: { w: Number(r.w.toFixed(6)), logLoss: Number(r.logLoss.toFixed(6)) },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Dirichlet predictive: smoothed outcome distribution from counts.
 */
export function evalDirichletPredictive(input: {
  readonly counts: Record<AtsOutcome, number>;
  readonly alpha?: number;
}): BayesEval<Record<AtsOutcome, number>> {
  const { counts, alpha } = input;
  if (!counts) return { ok: false, reason: "counts required" };
  try {
    const dist = dirichletPredictive(counts, alpha);
    return { ok: true, data: dist };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Match-prior discipline ─────────────────────────────────────────────────

/**
 * Blend an analyst view into prior counts with pseudo-sample weight.
 * The blend is explicit — the analyst view never silently overrides the prior.
 */
export function evalBlendAnalystView(input: {
  readonly priorCounts: readonly number[];
  readonly viewProbs: readonly number[];
  readonly pseudoN: number;
  readonly wM: number;
}): BayesEval<readonly number[]> {
  const { priorCounts, viewProbs, pseudoN, wM } = input;
  if (
    !Array.isArray(priorCounts) ||
    !Array.isArray(viewProbs) ||
    priorCounts.length === 0 ||
    priorCounts.length !== viewProbs.length
  ) {
    return { ok: false, reason: "priorCounts/viewProbs must be non-empty and aligned" };
  }
  if (!Number.isFinite(pseudoN) || pseudoN < 0) {
    return { ok: false, reason: "pseudoN must be finite and >= 0" };
  }
  if (!Number.isFinite(wM) || wM < 0) {
    return { ok: false, reason: "wM must be finite and >= 0" };
  }
  try {
    const blended = blendAnalystView(
      priorCounts as number[],
      viewProbs as number[],
      pseudoN,
      wM,
    );
    return { ok: true, data: blended as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Cumulative-probit predict: P(Y <= k | x).
 */
export function evalCumulativeProbit(input: {
  readonly thresholds: readonly number[];
  readonly beta: readonly number[];
  readonly x: readonly number[];
}): BayesEval<readonly number[]> {
  const { thresholds, beta, x } = input;
  if (
    !Array.isArray(thresholds) ||
    !Array.isArray(beta) ||
    !Array.isArray(x) ||
    thresholds.length === 0 ||
    x.length === 0
  ) {
    return { ok: false, reason: "thresholds/beta/x must be non-empty" };
  }
  try {
    const probs = cumulativeProbitPredict(
      thresholds as number[],
      beta as number[],
      x as number[],
    );
    return { ok: true, data: probs as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Roll priors forward one period. Priors evolve toward the league mean —
 * they are never reset. Input/output is a team → posterior-mean map.
 */
export function evalRollForwardPriors(input: {
  readonly posteriorMeans: Readonly<Record<string, number>>;
  readonly shrinkage?: number;
}): BayesEval<Readonly<Record<string, number>>> {
  const { posteriorMeans, shrinkage } = input;
  if (!posteriorMeans || Object.keys(posteriorMeans).length === 0) {
    return { ok: false, reason: "posteriorMeans must be non-empty" };
  }
  if (shrinkage !== undefined && (!Number.isFinite(shrinkage) || shrinkage < 0 || shrinkage > 1)) {
    return { ok: false, reason: "shrinkage must be finite in [0,1]" };
  }
  try {
    const rolled = rollForwardPriors(posteriorMeans, shrinkage);
    return { ok: true, data: rolled };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── EP-probit ──────────────────────────────────────────────────────────────

/**
 * Expectation-propagation probit fit. Returns posterior mean + covariance.
 */
export function evalEpProbitFit(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly opts?: EpProbitOptions;
}): BayesEval<EpProbitResult> {
  const { X, y, opts } = input;
  if (!Array.isArray(X) || X.length === 0) {
    return { ok: false, reason: "X must be non-empty" };
  }
  if (!Array.isArray(y) || y.length !== X.length) {
    return { ok: false, reason: "y must align with X" };
  }
  try {
    const result = epProbitFit(X as number[][], y as number[], opts);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * EP-probit predict: P(y=1 | x) under the fitted posterior.
 */
export function evalEpProbitPredict(input: {
  readonly fit: EpProbitResult | null;
  readonly x: readonly number[];
}): BayesEval<number> {
  const { fit, x } = input;
  if (!fit || !fit.mean || !fit.cov) {
    return { ok: false, reason: "fitted EP-probit posterior required" };
  }
  if (!Array.isArray(x) || x.length === 0) {
    return { ok: false, reason: "x must be non-empty" };
  }
  try {
    const p = epProbitPredict(fit.mean, fit.cov, x as number[]);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return { ok: false, reason: "epProbitPredict returned value outside [0,1]" };
    }
    return { ok: true, data: Number(p.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  partialPool,
  poolAll,
  ebTau2,
  dirichletPredictive,
  opinionPool,
  fitPoolingWeight,
  blendAnalystView,
  cumulativeProbitPredict,
  rollForwardPriors,
  epProbitFit,
  epProbitPredict,
};
export type { PooledEstimate, EpProbitOptions, EpProbitResult };
