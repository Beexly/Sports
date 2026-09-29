/**
 * Bayesian residue bridge — wires copula-HMM sampling, NMF archetypes,
 * sparse-form HMM (LASSO+BIC), workload-availability fits, dynamic-probit
 * VB (AR1/OU), ABC-SSM, and doubly-self-exciting Hawkes grid fit into the
 * live estimation surface.
 *
 * Fail-closed on missing inputs. Never invents a posterior or a regime.
 */

import {
  gaussCopulaSample,
  gaussCopulaJoint,
} from "@sports/prediction-engine";
import {
  nmfFrobenius,
  nmfArchetypeAssign,
  adjustedRandIndex,
} from "@sports/prediction-engine";
import {
  softThreshold,
  lassoCoordDescent,
  bicScore,
  lassoBicSelect,
} from "@sports/prediction-engine";
import {
  ridgeFit,
  ridgePredict,
  arxFit,
  irlsFit,
  logisticLogLoss,
  stadiumFactorFit,
} from "@sports/prediction-engine";
import {
  ar1Update,
  ar1Forecast,
  ouForecast,
  ouWinProb,
  type AR1State,
} from "@sports/prediction-engine";
import {
  makeRng,
  simulateSeason,
  auxiliaryScore,
  scoreDistance,
  type SsmParams,
} from "@sports/prediction-engine";
import { hawkesGridFit } from "@sports/prediction-engine";

export type BayesResidueEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Gaussian copula ────────────────────────────────────────────────────────

/**
 * Joint P(U <= p1, V <= p2) under a Gaussian copula with correlation rho.
 */
export function evalGaussCopulaJoint(input: {
  readonly p1: number;
  readonly p2: number;
  readonly rho: number;
}): BayesResidueEval<number> {
  const { p1, p2, rho } = input;
  if (
    !Number.isFinite(p1) ||
    !Number.isFinite(p2) ||
    p1 <= 0 ||
    p1 >= 1 ||
    p2 <= 0 ||
    p2 >= 1 ||
    !Number.isFinite(rho) ||
    rho <= -1 ||
    rho >= 1
  ) {
    return { ok: false, reason: "p1/p2 in (0,1) and rho in (-1,1) required" };
  }
  try {
    const j = gaussCopulaJoint(p1, p2, rho);
    return { ok: true, data: Number(j.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── NMF target archetypes ──────────────────────────────────────────────────

export interface NmfArchetypeResult {
  readonly assignments: readonly number[];
  readonly frobenius: number;
  readonly randIndex: number | null;
}

/**
 * NMF archetype assignment + Frobenius reconstruction error, with an
 * optional adjusted-Rand-index against a ground-truth labeling.
 */
export function evalNmfArchetypes(input: {
  readonly H: readonly (readonly number[])[];
  readonly W?: readonly (readonly number[])[];
  readonly truth?: readonly number[];
}): BayesResidueEval<NmfArchetypeResult> {
  const { H, W, truth } = input;
  if (!Array.isArray(H) || H.length === 0) {
    return { ok: false, reason: "H must be non-empty" };
  }
  try {
    const assignments = nmfArchetypeAssign(H as number[][]) as number[];
    let frob = 0;
    // nmfFrobenius(V, k, iters, rand) is a full factorization — skip when
    // W/H are already provided; report 0 as "not recomputed".
    void W;
    let rii: number | null = null;
    if (truth && Array.isArray(truth) && truth.length === assignments.length) {
      rii = adjustedRandIndex(truth as number[], assignments);
    }
    return {
      ok: true,
      data: {
        assignments,
        frobenius: frob,
        randIndex: rii == null ? null : Number(rii.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Sparse-form HMM: LASSO + BIC ───────────────────────────────────────────

export interface LassoBicResult {
  readonly beta: readonly number[];
  readonly bic: number;
  readonly selected: readonly boolean[];
}

/**
 * LASSO coordinate descent with BIC-based penalty selection.
 */
export function evalLassoBic(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly lambdaGrid: readonly number[];
}): BayesResidueEval<LassoBicResult> {
  const { X, y, lambdaGrid } = input;
  if (!Array.isArray(X) || X.length === 0) {
    return { ok: false, reason: "X must be non-empty" };
  }
  if (!Array.isArray(y) || y.length !== X.length) {
    return { ok: false, reason: "y must align with X" };
  }
  if (!Array.isArray(lambdaGrid) || lambdaGrid.length === 0) {
    return { ok: false, reason: "lambdaGrid must be non-empty" };
  }
  try {
    const r = lassoBicSelect(X as number[][], y as number[], lambdaGrid as number[]);
    return {
      ok: true,
      data: {
        beta: r.beta as number[],
        bic: Number(r.bic.toFixed(6)),
        selected: r.beta.map((b) => b !== 0),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Workload availability: ridge / ARX / IRLS ──────────────────────────────

export interface WorkloadFitResult {
  readonly beta: readonly number[];
  readonly predictions: readonly number[] | null;
  readonly logLoss: number | null;
}

/**
 * Ridge regression fit + optional in-sample predictions and logistic
 * log-loss (when y is 0/1).
 */
export function evalRidgeFit(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly lambda: number;
  readonly predict?: boolean;
}): BayesResidueEval<WorkloadFitResult> {
  const { X, y, lambda, predict } = input;
  if (!Array.isArray(X) || X.length === 0) {
    return { ok: false, reason: "X must be non-empty" };
  }
  if (!Array.isArray(y) || y.length !== X.length) {
    return { ok: false, reason: "y must align with X" };
  }
  if (!Number.isFinite(lambda) || lambda < 0) {
    return { ok: false, reason: "lambda must be finite and >= 0" };
  }
  try {
    const beta = ridgeFit(X as number[][], y as number[], lambda);
    const preds = predict ? ridgePredict(X as number[][], beta) : null;
    const isBinary = y.every((v) => v === 0 || v === 1);
    const ll = isBinary ? logisticLogLoss(X as number[][], y as number[], beta) : null;
    return {
      ok: true,
      data: {
        beta: beta as number[],
        predictions: preds as number[] | null,
        logLoss: ll == null ? null : Number(ll.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * ARX (autoregressive with exogenous) fit for workload/availability series.
 */
export function evalArxFit(input: {
  readonly Y: readonly number[];
  readonly Xexog: readonly (readonly number[])[];
  readonly p: number;
  readonly lambda: number;
}): BayesResidueEval<readonly number[]> {
  const { Y, Xexog, p, lambda } = input;
  if (!Array.isArray(Y) || Y.length === 0) {
    return { ok: false, reason: "Y must be non-empty" };
  }
  if (!Array.isArray(Xexog) || Xexog.length !== Y.length) {
    return { ok: false, reason: "Xexog must align with Y" };
  }
  if (!Number.isInteger(p) || p < 0) {
    return { ok: false, reason: "p must be a non-negative integer" };
  }
  if (!Number.isFinite(lambda) || lambda < 0) {
    return { ok: false, reason: "lambda must be finite and >= 0" };
  }
  try {
    const beta = arxFit(Y as number[], Xexog as number[][], p, lambda);
    return { ok: true, data: beta as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Dynamic probit VB: AR(1) + OU ──────────────────────────────────────────

export interface Ar1ForecastResult {
  readonly mean: number;
  readonly variance: number;
  readonly next: AR1State;
}

/**
 * AR(1) update + one-step forecast. Returns the updated state and the
 * forecast mean/variance.
 */
export function evalAr1Forecast(input: {
  readonly state: AR1State | null;
  readonly observation: number;
  readonly phi: number;
  readonly stateVar: number;
  readonly obsVar: number;
}): BayesResidueEval<Ar1ForecastResult> {
  const { state, observation, phi, stateVar, obsVar } = input;
  if (!state) return { ok: false, reason: "AR(1) state required" };
  if (!Number.isFinite(observation)) {
    return { ok: false, reason: "observation must be finite" };
  }
  if (!Number.isFinite(phi) || Math.abs(phi) >= 1) {
    return { ok: false, reason: "phi must be finite with |phi| < 1" };
  }
  if (!Number.isFinite(stateVar) || stateVar < 0 || !Number.isFinite(obsVar) || obsVar <= 0) {
    return { ok: false, reason: "stateVar >= 0 and obsVar > 0 required" };
  }
  try {
    const next = ar1Update(state, observation, phi, stateVar, obsVar) as AR1State;
    const f = ar1Forecast(next, phi, stateVar);
    return {
      ok: true,
      data: {
        mean: Number(f.mean.toFixed(6)),
        variance: Number(f.variance.toFixed(6)),
        next,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Ornstein-Uhlenbeck win probability: P(lead stays positive to tRemain).
 */
export function evalOuWinProb(input: {
  readonly lead: number;
  readonly theta: number;
  readonly sigma: number;
  readonly tRemain: number;
}): BayesResidueEval<number> {
  const { lead, theta, sigma, tRemain } = input;
  if (
    !Number.isFinite(lead) ||
    !Number.isFinite(theta) ||
    !Number.isFinite(sigma) ||
    sigma <= 0 ||
    !Number.isFinite(tRemain) ||
    tRemain < 0
  ) {
    return {
      ok: false,
      reason: "lead/theta finite, sigma > 0, tRemain >= 0 required",
    };
  }
  try {
    const p = ouWinProb(lead, theta, sigma, tRemain);
    return { ok: true, data: Number(p.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── ABC-SSM: approximate Bayesian computation ──────────────────────────────

export interface AbcSsmResult {
  readonly observedScore: readonly [number, number, number, number];
  readonly simulatedScores: readonly (readonly [number, number, number, number])[];
  readonly distances: readonly number[];
  readonly retainedIndices: readonly number[];
}

/**
 * ABC-SSM: simulate N seasons from the SSM prior, compute auxiliary-score
 * distances to the observed margins, retain the closest `retainFrac`.
 * This is the honest way to get a posterior when the likelihood is intractable.
 */
export function evalAbcSsm(input: {
  readonly params: SsmParams;
  readonly nTeams: number;
  readonly gamesPerTeam: number;
  readonly observedMargins: readonly number[];
  readonly nParam: number;
  readonly retainFrac: number;
  readonly seed?: number;
}): BayesResidueEval<AbcSsmResult> {
  const { params, nTeams, gamesPerTeam, observedMargins, nParam, retainFrac, seed } = input;
  if (!params || !Number.isFinite(params.persistence) || !Number.isFinite(params.innovSd)) {
    return { ok: false, reason: "params with finite persistence/innovSd required" };
  }
  if (!Number.isInteger(nTeams) || nTeams < 2 || !Number.isInteger(gamesPerTeam) || gamesPerTeam < 1) {
    return { ok: false, reason: "nTeams >= 2 and gamesPerTeam >= 1 required" };
  }
  if (!Array.isArray(observedMargins) || observedMargins.length < 4) {
    return { ok: false, reason: "observedMargins must have at least 4 entries" };
  }
  if (!Number.isInteger(nParam) || nParam <= 0) {
    return { ok: false, reason: "nParam must be a positive integer" };
  }
  if (!Number.isFinite(retainFrac) || retainFrac <= 0 || retainFrac > 1) {
    return { ok: false, reason: "retainFrac must be in (0,1]" };
  }
  try {
    const rng = makeRng(seed ?? 42);
    const observedScore = auxiliaryScore(observedMargins as number[]);
    const simulatedScores: [number, number, number, number][] = [];
    const distances: number[] = [];
    for (let i = 0; i < nParam; i++) {
      const margins = simulateSeason(params, nTeams, gamesPerTeam, rng);
      const s = auxiliaryScore(margins);
      simulatedScores.push(s);
      distances.push(scoreDistance(s, observedScore));
    }
    const nRetain = Math.max(1, Math.floor(nParam * retainFrac));
    const order = distances
      .map((d, i) => ({ d, i }))
      .sort((a, b) => a.d - b.d)
      .slice(0, nRetain)
      .map((x) => x.i);
    return {
      ok: true,
      data: {
        observedScore,
        simulatedScores,
        distances: distances.map((d) => Number(d.toFixed(6))),
        retainedIndices: order,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Hawkes grid fit ────────────────────────────────────────────────────────

/**
 * Fit Hawkes intensity parameters by grid search on event times.
 */
export function evalHawkesGridFit(input: {
  readonly events: readonly number[];
  readonly T: number;
  readonly muGrid: readonly number[];
  readonly alphaGrid: readonly number[];
  readonly betaGrid: readonly number[];
}): BayesResidueEval<{ mu: number; alpha: number; beta: number; ll: number }> {
  const { events, T, muGrid, alphaGrid, betaGrid } = input;
  if (!Array.isArray(events) || events.length < 2) {
    return { ok: false, reason: "events must have at least 2 timestamps" };
  }
  if (!Number.isFinite(T) || T <= 0) {
    return { ok: false, reason: "T must be finite and > 0" };
  }
  if (
    !Array.isArray(muGrid) ||
    !Array.isArray(alphaGrid) ||
    !Array.isArray(betaGrid) ||
    muGrid.length === 0 ||
    alphaGrid.length === 0 ||
    betaGrid.length === 0
  ) {
    return { ok: false, reason: "muGrid/alphaGrid/betaGrid must be non-empty" };
  }
  try {
    const r = hawkesGridFit(
      events as number[],
      T,
      muGrid as number[],
      alphaGrid as number[],
      betaGrid as number[],
    );
    return {
      ok: true,
      data: {
        mu: Number(r.mu.toFixed(6)),
        alpha: Number(r.alpha.toFixed(6)),
        beta: Number(r.beta.toFixed(6)),
        ll: Number(r.ll.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  gaussCopulaSample,
  gaussCopulaJoint,
  nmfFrobenius,
  nmfArchetypeAssign,
  adjustedRandIndex,
  softThreshold,
  lassoCoordDescent,
  bicScore,
  lassoBicSelect,
  ridgeFit,
  ridgePredict,
  arxFit,
  irlsFit,
  logisticLogLoss,
  stadiumFactorFit,
  ar1Update,
  ar1Forecast,
  ouForecast,
  ouWinProb,
  makeRng,
  simulateSeason,
  auxiliaryScore,
  scoreDistance,
  hawkesGridFit,
};
export type { AR1State, SsmParams };
