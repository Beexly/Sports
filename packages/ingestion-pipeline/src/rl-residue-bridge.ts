/**
 * RL residue bridge — wires C51 optimal stopping, Sinkhorn DRL staking,
 * CFCQL counterfactual penalties, and thin-regime retrieval into the live
 * sizing + regime surface.
 *
 * This is the "stop at the right moment, price risk, penalize deviation,
 * and borrow from thin regimes" layer.
 *
 * Fail-closed on missing inputs. Never invents a value or a regime.
 */

import {
  stoppingBackwardInduction,
  c51Project,
  clvRegret,
} from "@sports/prediction-engine";
import {
  wasserstein1d,
  entropicTransportCost,
  scalarizeReturn,
  riskPriceUpdate,
} from "@sports/prediction-engine";
import {
  counterfactualPenalty,
  cfcqlAgentLoss,
  lambdaPerAgent,
  lowerBoundHolds,
} from "@sports/prediction-engine";
import {
  regimeKey,
  regimeHistogram,
  fitPowerLaw,
  thinRegimes,
  retrieveNeighbors,
  buildRbCqlBatch,
  type SlateState,
  type PowerLawFit,
  type Transition,
  type WeightedBatch,
} from "@sports/prediction-engine";

export type RlResidueEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── C51 optimal stopping ───────────────────────────────────────────────────

export interface StoppingResult {
  readonly value: readonly number[];
  readonly stopAt: readonly boolean[];
  readonly clvRegret: number;
}

/**
 * Backward induction for the optimal stopping problem: stop when the
 * immediate reward exceeds the discounted wait value. clvRegret is the
 * gap between the best line and the taken line.
 */
export function evalOptimalStopping(input: {
  readonly immediateReward: readonly number[];
  readonly waitValue: readonly number[];
  readonly discount: number;
  readonly bestLine?: number;
  readonly takenLine?: number;
}): RlResidueEval<StoppingResult> {
  const { immediateReward, waitValue, discount, bestLine, takenLine } = input;
  if (
    !Array.isArray(immediateReward) ||
    !Array.isArray(waitValue) ||
    immediateReward.length === 0 ||
    immediateReward.length !== waitValue.length
  ) {
    return { ok: false, reason: "immediateReward/waitValue must be non-empty and aligned" };
  }
  if (!Number.isFinite(discount) || discount <= 0 || discount > 1) {
    return { ok: false, reason: "discount must be finite in (0,1]" };
  }
  for (let i = 0; i < immediateReward.length; i++) {
    if (!Number.isFinite(immediateReward[i]) || !Number.isFinite(waitValue[i])) {
      return {
        ok: false,
        reason: `row ${i}: reward/wait must be finite — not imputed`,
      };
    }
  }
  try {
    const r = stoppingBackwardInduction(
      immediateReward as number[],
      waitValue as number[],
      discount,
    );
    const regret =
      bestLine != null && takenLine != null && Number.isFinite(bestLine) && Number.isFinite(takenLine)
        ? clvRegret(bestLine, takenLine)
        : 0;
    return {
      ok: true,
      data: {
        value: r.value as number[],
        stopAt: r.stopAt as boolean[],
        clvRegret: Number(regret.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * C51 distributional projection: project the Bellman target onto a fixed
 * categorical support. Returns a proper probability vector.
 */
export function evalC51Project(input: {
  readonly support: readonly number[];
  readonly probs: readonly number[];
  readonly r: number;
  readonly gamma: number;
}): RlResidueEval<readonly number[]> {
  const { support, probs, r, gamma } = input;
  if (
    !Array.isArray(support) ||
    !Array.isArray(probs) ||
    support.length < 2 ||
    support.length !== probs.length
  ) {
    return { ok: false, reason: "support/probs must be aligned with length >= 2" };
  }
  if (!Number.isFinite(r) || !Number.isFinite(gamma) || gamma <= 0 || gamma > 1) {
    return { ok: false, reason: "r finite and gamma in (0,1] required" };
  }
  for (let i = 0; i < support.length; i++) {
    if (!Number.isFinite(support[i]) || !Number.isFinite(probs[i]) || probs[i]! < 0) {
      return {
        ok: false,
        reason: `row ${i}: support finite and probs >= 0 — not imputed`,
      };
    }
  }
  try {
    const projected = c51Project(support as number[], probs as number[], r, gamma);
    return { ok: true, data: projected as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Sinkhorn DRL staking ───────────────────────────────────────────────────

export interface SinkhornResult {
  readonly wasserstein: number;
  readonly transportCost: number;
  readonly scalarized: number;
}

/**
 * Wasserstein-1 distance + entropic transport cost + scalarized return.
 * The scalarized return prices risk and CLV explicitly.
 */
export function evalSinkhornStaking(input: {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly eps: number;
  readonly sample: readonly [number, number, number];
  readonly riskPrice: number;
  readonly clvWeight: number;
}): RlResidueEval<SinkhornResult> {
  const { xs, ys, eps, sample, riskPrice, clvWeight } = input;
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length === 0 || ys.length === 0) {
    return { ok: false, reason: "xs/ys must be non-empty" };
  }
  if (!Number.isFinite(eps) || eps <= 0) {
    return { ok: false, reason: "eps must be finite and > 0" };
  }
  if (!Array.isArray(sample) || sample.length !== 3) {
    return { ok: false, reason: "sample must be a [return, risk, clv] triple" };
  }
  if (!Number.isFinite(riskPrice) || !Number.isFinite(clvWeight)) {
    return { ok: false, reason: "riskPrice and clvWeight must be finite" };
  }
  try {
    const w = wasserstein1d(xs as number[], ys as number[]);
    const t = entropicTransportCost(xs as number[], ys as number[], eps);
    const s = scalarizeReturn(
      [sample[0]!, sample[1]!, sample[2]!],
      riskPrice,
      clvWeight,
    );
    return {
      ok: true,
      data: {
        wasserstein: Number(w.toFixed(6)),
        transportCost: Number(t.toFixed(6)),
        scalarized: Number(s.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Contextual risk-price bandit update: exponential weights over a price grid.
 */
export function evalRiskPriceUpdate(input: {
  readonly weights: readonly number[];
  readonly priceGrid: readonly number[];
  readonly realizedSharpes: readonly (readonly number[])[];
  readonly eta: number;
}): RlResidueEval<readonly number[]> {
  const { weights, priceGrid, realizedSharpes, eta } = input;
  if (
    !Array.isArray(weights) ||
    !Array.isArray(priceGrid) ||
    !Array.isArray(realizedSharpes) ||
    weights.length === 0 ||
    weights.length !== priceGrid.length
  ) {
    return { ok: false, reason: "weights/priceGrid must be non-empty and aligned" };
  }
  if (!Number.isFinite(eta) || eta <= 0) {
    return { ok: false, reason: "eta must be finite and > 0" };
  }
  try {
    const updated = riskPriceUpdate(
      weights as number[],
      priceGrid as number[],
      realizedSharpes as number[][],
      eta,
    );
    return { ok: true, data: updated as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── CFCQL counterfactual penalty ───────────────────────────────────────────

export interface CfcqlResult {
  readonly penalty: number;
  readonly agentLoss: number;
  readonly lambda: number;
  readonly lowerBoundHolds: boolean;
}

/**
 * Counterfactual CQL: penalize Q-deviation from the historical Q, scale
 * lambda by 1/nBets, and verify the lower bound holds.
 */
export function evalCfcql(input: {
  readonly qDeviate: number;
  readonly qHistorical: number;
  readonly tdError: number;
  readonly nBets: number;
  readonly baseLambda: number;
  readonly historicalReturn: number;
}): RlResidueEval<CfcqlResult> {
  const { qDeviate, qHistorical, tdError, nBets, baseLambda, historicalReturn } = input;
  if (
    !Number.isFinite(qDeviate) ||
    !Number.isFinite(qHistorical) ||
    !Number.isFinite(tdError) ||
    !Number.isFinite(nBets) ||
    nBets < 1 ||
    !Number.isFinite(baseLambda) ||
    baseLambda < 0 ||
    !Number.isFinite(historicalReturn)
  ) {
    return {
      ok: false,
      reason: "qDeviate/qHistorical/tdError finite, nBets >= 1, baseLambda >= 0 required",
    };
  }
  try {
    const lambda = lambdaPerAgent(nBets, baseLambda);
    const penalty = counterfactualPenalty(qDeviate, qHistorical, lambda);
    const agentLoss = cfcqlAgentLoss(tdError, qDeviate, qHistorical, lambda);
    const holds = lowerBoundHolds(agentLoss, historicalReturn);
    return {
      ok: true,
      data: {
        penalty: Number(penalty.toFixed(6)),
        agentLoss: Number(agentLoss.toFixed(6)),
        lambda: Number(lambda.toFixed(6)),
        lowerBoundHolds: holds,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Thin-regime retrieval ──────────────────────────────────────────────────

export interface ThinRegimeResult {
  readonly powerLaw: PowerLawFit;
  readonly thinRegimes: readonly string[];
  readonly neighbors: readonly Transition[];
  readonly batch: WeightedBatch;
}

/**
 * Thin-regime retrieval: detect power-law regime sizes, flag thin regimes,
 * retrieve neighbors for them, and build the upweighted CQL batch.
 */
export function evalThinRegimeRetrieval(input: {
  readonly counts: readonly number[];
  readonly minSamples?: number;
  readonly query: readonly number[];
  readonly auxPool: readonly {
    readonly s: readonly number[];
    readonly [k: string]: unknown;
  }[];
  readonly k?: number;
  readonly main: readonly { readonly s: readonly number[] }[];
  readonly upweight?: number;
}): RlResidueEval<ThinRegimeResult> {
  const { counts, minSamples, query, auxPool, k, main, upweight } = input;
  if (!Array.isArray(counts) || counts.length === 0) {
    return { ok: false, reason: "counts must be non-empty" };
  }
  if (!Array.isArray(query) || query.length === 0) {
    return { ok: false, reason: "query must be non-empty" };
  }
  if (!Array.isArray(auxPool) || auxPool.length === 0) {
    return { ok: false, reason: "auxPool must be non-empty" };
  }
  if (!Array.isArray(main) || main.length === 0) {
    return { ok: false, reason: "main batch must be non-empty" };
  }
  try {
    const powerLaw = fitPowerLaw(counts as number[]);
    // Build histogram from counts keyed by index
    const hist = new Map<string, number>();
    counts.forEach((c, i) => hist.set(`r${i}`, c));
    const thin = thinRegimes(hist, minSamples ?? 30);
    const neighbors = retrieveNeighbors(
      query as number[],
      auxPool as never,
      k ?? 8,
    );
    const batch = buildRbCqlBatch(
      main as never,
      neighbors as never,
      upweight ?? 2,
    );
    return {
      ok: true,
      data: {
        powerLaw,
        thinRegimes: [...thin],
        neighbors: neighbors as Transition[],
        batch: batch as WeightedBatch,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Regime key: bin the feature vector into a stable string key.
 */
export function evalRegimeKey(input: {
  readonly features: readonly number[];
  readonly bins: readonly number[];
}): RlResidueEval<string> {
  const { features, bins } = input;
  if (
    !Array.isArray(features) ||
    !Array.isArray(bins) ||
    features.length === 0 ||
    features.length !== bins.length
  ) {
    return { ok: false, reason: "features/bins must be non-empty and aligned" };
  }
  try {
    const key = regimeKey(features as number[], bins as number[]);
    return { ok: true, data: key };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  stoppingBackwardInduction,
  c51Project,
  clvRegret,
  wasserstein1d,
  entropicTransportCost,
  scalarizeReturn,
  riskPriceUpdate,
  counterfactualPenalty,
  cfcqlAgentLoss,
  lambdaPerAgent,
  lowerBoundHolds,
  regimeKey,
  regimeHistogram,
  fitPowerLaw,
  thinRegimes,
  retrieveNeighbors,
  buildRbCqlBatch,
};
export type { SlateState, PowerLawFit, Transition, WeightedBatch };
