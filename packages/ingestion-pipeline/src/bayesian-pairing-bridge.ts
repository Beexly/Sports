/**
 * Bayesian pairing bridge — wires Bradley-Terry team worths, ordinal
 * structure selection, and bivariate Poisson / Dixon-Coles into the live
 * rating + score-model surface.
 *
 * This is the "who is actually better, and how do scores correlate" layer:
 * dependent-comparison Bradley-Terry with sandwich SEs, proportional-odds
 * vs non-proportional-odds structure selection on held-out log-loss, and
 * the bivariate Poisson with Dixon-Coles low-score correction.
 *
 * Fail-closed on missing inputs. Never invents a worth or a pmf.
 */

import {
  fitBradleyTerry,
  naiveSEs,
  sandwichSEs,
  type Comparison,
} from "@sports/prediction-engine";
import {
  fitCumulativeLogit,
  fitNonPO,
  predictProbs,
  heldOutLogLoss,
  selectStructure,
  checkStochasticOrdering,
  type OrdinalFit,
  type StructureChoice,
} from "@sports/prediction-engine";
import {
  bivPoissonPmf,
  bivPoissonSample,
  dixonColesTau,
} from "@sports/prediction-engine";

export type PairingEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Bradley-Terry ──────────────────────────────────────────────────────────

export interface BradleyTerryResult {
  readonly worths: readonly number[];
  readonly naiveSEs: readonly number[];
  readonly sandwichSEs: readonly number[];
}

/**
 * Fit team worths from dependent comparisons. Returns worths plus both
 * naive and sandwich standard errors (the sandwich is the honest one when
 * comparisons are dependent).
 */
export function evalBradleyTerry(input: {
  readonly comps: readonly { readonly winner: number; readonly loser: number }[];
  readonly nTeams: number;
  readonly iters?: number;
  readonly lr?: number;
}): PairingEval<BradleyTerryResult> {
  const { comps, nTeams, iters, lr } = input;
  if (!Array.isArray(comps) || comps.length === 0) {
    return { ok: false, reason: "comps must be non-empty" };
  }
  if (!Number.isInteger(nTeams) || nTeams < 2) {
    return { ok: false, reason: "nTeams must be an integer >= 2" };
  }
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i]!;
    if (
      !Number.isInteger(c.winner) ||
      !Number.isInteger(c.loser) ||
      c.winner < 0 ||
      c.loser < 0 ||
      c.winner >= nTeams ||
      c.loser >= nTeams ||
      c.winner === c.loser
    ) {
      return {
        ok: false,
        reason: `comparison ${i}: winner/loser must be distinct valid team indices — not imputed`,
      };
    }
  }
  try {
    const worths = fitBradleyTerry(comps as Comparison[], nTeams, iters, lr);
    const naive = naiveSEs(comps as Comparison[], worths, nTeams);
    const sandwich = sandwichSEs(comps as Comparison[], worths, nTeams);
    return {
      ok: true,
      data: {
        worths: worths as number[],
        naiveSEs: naive as number[],
        sandwichSEs: sandwich as number[],
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Ordinal structure selection ─────────────────────────────────────────────

export interface OrdinalStructureResult {
  readonly choice: StructureChoice;
  readonly poLogLoss: number;
  readonly nonPoLogLoss: number;
  readonly stochasticOrderingOk: boolean;
}

/**
 * Fit both proportional-odds and non-proportional-odds cumulative logits
 * and select on held-out log-loss. Positive paired diff favors nonPO.
 */
export function evalOrdinalStructure(input: {
  readonly trainX: readonly (readonly number[])[];
  readonly trainY: readonly number[];
  readonly testX: readonly (readonly number[])[];
  readonly testY: readonly number[];
  readonly nClasses: number;
}): PairingEval<OrdinalStructureResult> {
  const { trainX, trainY, testX, testY, nClasses } = input;
  if (
    !Array.isArray(trainX) ||
    !Array.isArray(trainY) ||
    !Array.isArray(testX) ||
    !Array.isArray(testY) ||
    trainX.length === 0 ||
    trainX.length !== trainY.length ||
    testX.length === 0 ||
    testX.length !== testY.length
  ) {
    return {
      ok: false,
      reason: "train/test X and y must be non-empty and aligned",
    };
  }
  if (!Number.isInteger(nClasses) || nClasses < 2) {
    return { ok: false, reason: "nClasses must be an integer >= 2" };
  }
  for (let i = 0; i < trainY.length; i++) {
    const y = trainY[i];
    if (!Number.isInteger(y) || y! < 0 || y! >= nClasses) {
      return {
        ok: false,
        reason: `trainY[${i}] must be an integer in [0, nClasses) — not imputed`,
      };
    }
  }
  for (let i = 0; i < testY.length; i++) {
    const y = testY[i];
    if (!Number.isInteger(y) || y! < 0 || y! >= nClasses) {
      return {
        ok: false,
        reason: `testY[${i}] must be an integer in [0, nClasses) — not imputed`,
      };
    }
  }
  try {
    const choice = selectStructure(
      trainX as number[][],
      trainY as number[],
      testX as number[][],
      testY as number[],
      nClasses,
    );
    const po = fitCumulativeLogit(trainX as number[][], trainY as number[], nClasses);
    const nonPo = fitNonPO(trainX as number[][], trainY as number[], nClasses);
    const poLl = heldOutLogLoss(po, testX as number[][], testY as number[]);
    const nonPoLl = heldOutLogLoss(nonPo, testX as number[][], testY as number[]);
    const grid = testX as number[][];
    const stochasticOrderingOk = checkStochasticOrdering(po, grid);
    return {
      ok: true,
      data: {
        choice,
        poLogLoss: Number(poLl.toFixed(6)),
        nonPoLogLoss: Number(nonPoLl.toFixed(6)),
        stochasticOrderingOk,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Predict class probabilities under a fitted ordinal model.
 */
export function evalOrdinalPredict(input: {
  readonly fit: OrdinalFit | null;
  readonly x: readonly number[];
}): PairingEval<readonly number[]> {
  const { fit, x } = input;
  if (!fit) return { ok: false, reason: "fitted ordinal model required" };
  if (!Array.isArray(x) || x.length === 0) {
    return { ok: false, reason: "x must be non-empty" };
  }
  try {
    const probs = predictProbs(fit, x as number[]);
    const sum = probs.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(sum) || Math.abs(sum - 1) > 0.05) {
      return { ok: false, reason: "predictProbs returned a non-proper distribution" };
    }
    return { ok: true, data: probs as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Bivariate Poisson + Dixon-Coles ────────────────────────────────────────

export interface BivPoissonResult {
  readonly pmf: number;
  readonly tau: number;
}

/**
 * Joint P(X=x, Y=y) under a bivariate Poisson with shared component l3,
 * optionally corrected by the Dixon-Coles low-score tau.
 */
export function evalBivPoisson(input: {
  readonly x: number;
  readonly y: number;
  readonly l1: number;
  readonly l2: number;
  readonly l3: number;
  readonly rho?: number;
}): PairingEval<BivPoissonResult> {
  const { x, y, l1, l2, l3, rho } = input;
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    !Number.isFinite(l1) ||
    !Number.isFinite(l2) ||
    !Number.isFinite(l3) ||
    l1 < 0 ||
    l2 < 0 ||
    l3 < 0
  ) {
    return {
      ok: false,
      reason: "x/y non-negative integers and l1/l2/l3 finite >= 0 required",
    };
  }
  try {
    const pmf = bivPoissonPmf(x, y, l1, l2, l3);
    const tau = rho == null ? 1 : dixonColesTau(x, y, l1, l2, rho);
    return {
      ok: true,
      data: {
        pmf: Number(pmf.toFixed(8)),
        tau: Number(tau.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Dixon-Coles tau correction for low-scoring outcomes.
 */
export function evalDixonColesTau(input: {
  readonly x: number;
  readonly y: number;
  readonly lx: number;
  readonly ly: number;
  readonly rho: number;
}): PairingEval<number> {
  const { x, y, lx, ly, rho } = input;
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    !Number.isFinite(lx) ||
    !Number.isFinite(ly) ||
    lx < 0 ||
    ly < 0 ||
    !Number.isFinite(rho) ||
    rho <= -1 ||
    rho >= 1
  ) {
    return {
      ok: false,
      reason: "x/y non-negative integers, lx/ly finite >= 0, rho in (-1,1) required",
    };
  }
  try {
    const tau = dixonColesTau(x, y, lx, ly, rho);
    return { ok: true, data: Number(tau.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sample from a bivariate Poisson. Seeded via the module's own sampler.
 */
export function evalBivPoissonSample(input: {
  readonly l1: number;
  readonly l2: number;
  readonly l3: number;
  readonly n: number;
  readonly seed?: number;
}): PairingEval<readonly [number, number][]> {
  const { l1, l2, l3, n, seed } = input;
  if (
    !Number.isFinite(l1) ||
    !Number.isFinite(l2) ||
    !Number.isFinite(l3) ||
    l1 < 0 ||
    l2 < 0 ||
    l3 < 0 ||
    !Number.isInteger(n) ||
    n <= 0
  ) {
    return {
      ok: false,
      reason: "l1/l2/l3 finite >= 0 and n a positive integer required",
    };
  }
  try {
    const samples = bivPoissonSample(l1, l2, l3, n, seed);
    return { ok: true, data: samples as [number, number][] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  fitBradleyTerry,
  naiveSEs,
  sandwichSEs,
  fitCumulativeLogit,
  fitNonPO,
  predictProbs,
  heldOutLogLoss,
  selectStructure,
  checkStochasticOrdering,
  bivPoissonPmf,
  bivPoissonSample,
  dixonColesTau,
};
export type { Comparison, OrdinalFit, StructureChoice };
