/**
 * Props/DFS + metrics bridge — this layer either returns a real number produced
 * by a pure module in @sports/prediction-engine, or a fail-closed reason naming
 * exactly what was wrong with the input. It never invents a value, never
 * imputes silently, and never labels a modelled cell as a measured one.
 *
 * Wiring:
 *   - 1505-01147 local matrix completion: low-rank ALS completion of a sparse
 *     player x week/category matrix. COMPLETION IMPUTES, which is a modelling
 *     assumption rather than an observation, so the returned shape carries a
 *     per-cell `origin` flag plus separate observed/imputed counts. A modelled
 *     cell is structurally impossible to read as measured, and a row or column
 *     with no observed entry fails closed instead of being filled from the
 *     random initialisation.
 *   - 1909-12938 TS forecast: exponential-smoothing vs trailing-mean one-step
 *     forecasts, scored with a rolling-origin MAE bake-off.
 *   - 2003-01712 JOI stack metric: QB-pass-catcher joint production per shared
 *     dropback, plus the signed synergy edge. 2003-01712 is the canonical home
 *     for that block; 1912-10417 carries a byte-identical duplicate, and only
 *     one of the two is imported here so a central barrel export cannot collide.
 *   - 2004-08428 era-adjusted features: soft threshold, ISTA-Lasso, TV denoise.
 *   - 2006-07513 archetypes: NMF archetype assignment, adjusted Rand index, and
 *     the 1-D two-component Gaussian-mixture EM.
 *   - 2112-07002 E[max] duel optimizer: closed-form E[max(X, Y)] and the greedy
 *     n-entry portfolio.
 *   - metrics/core shrinkage: empirical-Bayes pulls. `shrinkProbability` clamps
 *     out-of-range inputs silently, so this bridge REJECTS them instead and the
 *     caller is told the reading was not a probability.
 *   - metrics/core residual rollup: internal-only, SHADOW-status rollups whose
 *     `confidenceScore` is evidence quality, never a win probability.
 *
 * Every engine module wired here ships `export const ENABLED = false` with an
 * unevaluated acceptance gate. That gate is the engine's, not this bridge's:
 * these functions make the computation callable and auditable, they do not
 * decide whether the result may be published.
 */

import {
  completeMatrix,
  specializationEmbedding,
  imputationRmse,
} from "@sports/prediction-engine/src/props-dfs/1505-01147v2-local-matrix-completion.js";
import {
  sesForecast,
  trailingMean,
  rollingOriginMae,
  availabilityProb,
  lineupForecastGain,
} from "@sports/prediction-engine/src/props-dfs/1909-12938v1-ts-forecast-dfs-optimizer.js";
import {
  joiPerDropback,
  synergyEdge,
  rankStackPairs,
  type PairSequence,
} from "@sports/prediction-engine/src/props-dfs/2003-01712v1-joi-stack-metric.js";
import {
  softThreshold,
  istaLasso,
  tvDenoise1d,
} from "@sports/prediction-engine/src/props-dfs/2004-08428v1-era-adjusted-features.js";
import {
  nmfFrobenius,
  nmfArchetypeAssign,
  adjustedRandIndex,
  emGaussianMixture1d,
  emMonotone,
} from "@sports/prediction-engine/src/props-dfs/2006-07513-bayesian-shot-archetypes.js";
import {
  expectedMax2,
  emaxPortfolioGreedy,
} from "@sports/prediction-engine/src/props-dfs/2112-07002-emax-duel-optimizer.js";
import {
  buildMetricResidualRollups,
  metricResidualRollupKey,
  type MetricResidualMetricId,
  type MetricResidualPlayInput,
  type MetricResidualRollup,
} from "@sports/prediction-engine/src/metrics/core/residual-rollup.js";
import type {
  MetricSourcePolicy,
  MetricUncertaintyBand,
} from "@sports/prediction-engine/src/metrics/core/validation.js";
import {
  empiricalBayesShrink,
  shrinkProbability,
  shrinkWeightedMean,
} from "@sports/prediction-engine/src/metrics/core/shrinkage.js";

export type PropsEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): PropsEval<never> {
  return { ok: false, reason };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
}

function allFinite(values: readonly number[]): boolean {
  return values.every(isFiniteNumber);
}

// ─── 1505-01147v2 local matrix completion ─────────────────────────────────────

/** Per-cell provenance. `IMPUTED` is a model output, never a measurement. */
export type MatrixCellOrigin = "OBSERVED" | "IMPUTED";

export interface MatrixCompletionCell {
  readonly value: number;
  readonly origin: MatrixCellOrigin;
}

export interface LocalMatrixCompletionResult {
  readonly rank: number;
  readonly rows: number;
  readonly cols: number;
  /** Feature names for `embedding` row triples, in order. */
  readonly embeddingFeatureNames: readonly [string, string, string];
  /** `embedding[i]` = [level, specializationAxis1, specializationAxis2]. */
  readonly embedding: readonly (readonly number[])[];
  /**
   * The embedding is computed from the COMPLETED matrix, so imputed cells feed
   * it. Stated here so no caller mistakes it for an observed-only feature.
   */
  readonly embeddingInput: "COMPLETED_MATRIX_INCLUDES_IMPUTED_CELLS";
  /** `cells[i][j].origin === "OBSERVED"` exactly where the input held a number. */
  readonly observedMask: readonly (readonly boolean[])[];
  readonly observedCount: number;
  readonly imputedCount: number;
  /** Smallest number of observed cells in any row — the identification floor. */
  readonly minObservedPerRow: number;
  readonly minObservedPerCol: number;
  readonly cells: readonly (readonly MatrixCompletionCell[])[];
}

/**
 * Complete a sparse player x week (or player x category) matrix with low-rank
 * alternating least squares, and label every cell as observed or imputed.
 *
 * Fail-closed on: non-rectangular input, non-finite observations, a matrix with
 * no observations at all, a row or column with zero observed cells (the ALS
 * leaves that factor at its random initialisation, so any number it produced
 * would be noise), and a rank outside [1, min(rows, cols)].
 */
export function evalLocalMatrixCompletion(input: {
  readonly matrix: readonly (readonly (number | null)[])[];
  readonly rank: number;
  readonly iters?: number;
  readonly seed?: number;
  readonly ridge?: number;
}): PropsEval<LocalMatrixCompletionResult> {
  const { matrix, rank, iters, seed, ridge } = input;
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return fail("matrix must be a non-empty array of rows");
  }
  const cols = matrix[0]?.length ?? 0;
  if (cols === 0) return fail("matrix rows must be non-empty");
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row) || row.length !== cols) {
      return fail(`matrix row ${i} must be a length-${cols} array (matrix must be rectangular)`);
    }
    for (let j = 0; j < cols; j++) {
      const cell = row[j];
      if (cell !== null && !isFiniteNumber(cell)) {
        return fail(`matrix[${i}][${j}] must be a finite number or null`);
      }
    }
  }
  if (!isPositiveInteger(rank) || rank > Math.min(matrix.length, cols)) {
    return fail(
      `rank must be an integer in [1, ${Math.min(matrix.length, cols)}] (= min(rows, cols))`,
    );
  }
  const effectiveIters = iters ?? 120;
  if (!isPositiveInteger(effectiveIters)) {
    return fail("iters must be a positive integer (iters=0 would return the random initialisation)");
  }
  const effectiveRidge = ridge ?? 1e-3;
  if (!isFiniteNumber(effectiveRidge) || effectiveRidge <= 0) {
    return fail("ridge must be a finite number > 0 (a zero ridge makes the ALS normal equations singular)");
  }
  const effectiveSeed = seed ?? 7;
  if (!isFiniteNumber(effectiveSeed)) return fail("seed must be a finite number");

  const observedMask: boolean[][] = [];
  const perRow: number[] = [];
  const perCol: number[] = new Array<number>(cols).fill(0);
  let observedCount = 0;
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const mask: boolean[] = [];
    let rowCount = 0;
    for (let j = 0; j < cols; j++) {
      const observed = row[j] !== null;
      mask.push(observed);
      if (observed) {
        rowCount += 1;
        perCol[j] = (perCol[j] ?? 0) + 1;
      }
    }
    if (rowCount === 0) {
      return fail(
        `matrix row ${i} has no observed cell: the ALS factor for that row stays at its random initialisation, so any completed value would be noise`,
      );
    }
    perRow.push(rowCount);
    observedCount += rowCount;
    observedMask.push(mask);
  }
  const emptyCol = perCol.findIndex((n) => n === 0);
  if (emptyCol >= 0) {
    return fail(
      `matrix column ${emptyCol} has no observed cell: it carries no information and cannot be completed`,
    );
  }
  if (observedCount <= rank) {
    return fail(
      `matrix has ${observedCount} observed cells for rank ${rank}: not enough evidence to identify the factors`,
    );
  }

  try {
    const dense: (number | null)[][] = matrix.map((row: readonly (number | null)[]) =>
      row.map((cell: number | null): number | null => (cell === null ? null : cell)),
    );
    const completed = completeMatrix(dense, rank, effectiveIters, effectiveSeed, effectiveRidge);
    if (completed.length !== matrix.length) {
      return fail("completeMatrix returned a row count that does not match the input matrix");
    }
    const cells: MatrixCompletionCell[][] = [];
    for (let i = 0; i < completed.length; i++) {
      const rowOut = completed[i];
      if (!Array.isArray(rowOut) || rowOut.length !== cols) {
        return fail(`completeMatrix returned a malformed row at index ${i}`);
      }
      const maskRow = observedMask[i] ?? [];
      const cellRow: MatrixCompletionCell[] = [];
      for (let j = 0; j < cols; j++) {
        const value = rowOut[j];
        if (!isFiniteNumber(value)) {
          return fail(
            `completion produced a non-finite value at [${i}][${j}]; the ALS solve did not converge for this input`,
          );
        }
        cellRow.push({ value, origin: maskRow[j] === true ? "OBSERVED" : "IMPUTED" });
      }
      cells.push(cellRow);
    }

    const embedding = specializationEmbedding(completed);
    if (embedding.length !== matrix.length) {
      return fail("specializationEmbedding returned a row count that does not match the input matrix");
    }
    for (const triple of embedding) {
      if (!Array.isArray(triple) || triple.length !== 3 || !allFinite(triple)) {
        return fail("specializationEmbedding produced a malformed or non-finite row");
      }
    }

    const imputedCount = matrix.length * cols - observedCount;
    return {
      ok: true,
      data: {
        cells,
        cols,
        embedding,
        embeddingFeatureNames: ["level", "specializationAxis1", "specializationAxis2"],
        embeddingInput: "COMPLETED_MATRIX_INCLUDES_IMPUTED_CELLS",
        imputedCount,
        minObservedPerCol: Math.min(...perCol),
        minObservedPerRow: Math.min(...perRow),
        observedCount,
        observedMask,
        rank,
        rows: matrix.length,
      },
    };
  } catch (e) {
    return fail(`local matrix completion threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * RMSE of a completed matrix against ground truth over a caller-supplied
 * holdout mask. The mask selects the cells that were hidden, so this is the
 * honest read of how well the model — not the copy — recovers them.
 */
export function evalImputationHoldoutRmse(input: {
  readonly completed: readonly (readonly number[])[];
  readonly truth: readonly (readonly number[])[];
  readonly mask: readonly (readonly boolean[])[];
}): PropsEval<{ readonly rmse: number; readonly holdoutCells: number }> {
  const { completed, truth, mask } = input;
  if (!Array.isArray(completed) || completed.length === 0) return fail("completed must be non-empty");
  if (!Array.isArray(truth) || truth.length !== completed.length) {
    return fail("truth must have the same row count as completed");
  }
  if (!Array.isArray(mask) || mask.length !== completed.length) {
    return fail("mask must have the same row count as completed");
  }
  const cols = completed[0]?.length ?? 0;
  if (cols === 0) return fail("completed rows must be non-empty");
  for (let i = 0; i < completed.length; i++) {
    if (completed[i]?.length !== cols) return fail("completed must be rectangular");
    if (truth[i]?.length !== cols) return fail("truth must be rectangular and the same width as completed");
    if (mask[i]?.length !== cols) return fail("mask must be rectangular and the same width as completed");
    if (!allFinite(completed[i] ?? [])) return fail(`completed row ${i} must be finite`);
    if (!allFinite(truth[i] ?? [])) return fail(`truth row ${i} must be finite`);
  }
  let holdoutCells = 0;
  for (const row of mask) {
    for (const flagged of row) {
      if (flagged) holdoutCells += 1;
    }
  }
  if (holdoutCells === 0) {
    return fail("mask selects no cells: holdout RMSE would be 0 by construction and mean nothing");
  }
  try {
    const rmse = imputationRmse(
      completed.map((row) => [...row]),
      truth.map((row) => [...row]),
      mask.map((row) => [...row]),
    );
    if (!isFiniteNumber(rmse)) return fail("imputation RMSE came back non-finite");
    if (rmse < 0) return fail(`imputation RMSE came back negative (${rmse})`);
    return { ok: true, data: { holdoutCells, rmse } };
  } catch (e) {
    return fail(`imputation rmse threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 1909-12938v1 time-series forecast ────────────────────────────────────────

export interface TsForecastBacktestResult {
  readonly n: number;
  readonly alpha: number;
  readonly trailingWindow: number;
  readonly minTrain: number;
  readonly evaluatedPoints: number;
  readonly lastObserved: number;
  readonly sesForecast: number;
  readonly trailingMeanForecast: number;
  readonly sesRollingOriginMae: number;
  readonly trailingRollingOriginMae: number;
  /** trailing MAE minus SES MAE; positive means SES forecast the series better. */
  readonly maeMargin: number;
  readonly betterForecaster: "SES" | "TRAILING_MEAN" | "TIE";
}

/**
 * One-step-ahead bake-off of exponential smoothing against a trailing mean on a
 * player's own history. Rolling-origin: every point is predicted using only
 * values that precede it, so no forecast ever sees its own outcome.
 */
export function evalTsForecastBacktest(input: {
  readonly history: readonly number[];
  readonly alpha?: number;
  readonly trailingWindow?: number;
  readonly minTrain?: number;
}): PropsEval<TsForecastBacktestResult> {
  const { history, alpha, trailingWindow, minTrain } = input;
  if (!Array.isArray(history) || history.length === 0) {
    return fail("history must be a non-empty array of finite values");
  }
  if (!allFinite(history)) return fail("history must contain only finite values");
  const effectiveAlpha = alpha ?? 0.3;
  if (!isFiniteNumber(effectiveAlpha) || effectiveAlpha <= 0 || effectiveAlpha > 1) {
    return fail("alpha must be a finite number in (0, 1]");
  }
  const effectiveWindow = trailingWindow ?? 4;
  if (!isPositiveInteger(effectiveWindow)) {
    return fail("trailingWindow must be a positive integer");
  }
  const effectiveMinTrain = minTrain ?? 3;
  if (!isPositiveInteger(effectiveMinTrain) || effectiveMinTrain < 2) {
    return fail("minTrain must be an integer >= 2 (one-step-ahead needs at least two training points)");
  }
  if (history.length < effectiveMinTrain + 2) {
    return fail(
      `history has ${history.length} points; at least ${effectiveMinTrain + 2} are needed to score ${effectiveMinTrain}+ held-out one-step forecasts`,
    );
  }
  const lastObserved = history[history.length - 1];
  if (lastObserved === undefined) return fail("history must end in a value");
  try {
    const series = [...history];
    const sesMae = rollingOriginMae(series, (hist) => sesForecast(hist, effectiveAlpha), effectiveMinTrain);
    const trailMae = rollingOriginMae(
      series,
      (hist) => trailingMean(hist, effectiveWindow),
      effectiveMinTrain,
    );
    if (!isFiniteNumber(sesMae) || !isFiniteNumber(trailMae)) {
      return fail("rolling-origin MAE came back non-finite");
    }
    const evaluatedPoints = series.length - effectiveMinTrain;
    if (evaluatedPoints <= 0) return fail("rolling-origin backtest scored zero points");
    const margin = trailMae - sesMae;
    const better: "SES" | "TRAILING_MEAN" | "TIE" =
      margin > 1e-12 ? "SES" : margin < -1e-12 ? "TRAILING_MEAN" : "TIE";
    return {
      ok: true,
      data: {
        alpha: effectiveAlpha,
        betterForecaster: better,
        evaluatedPoints,
        lastObserved,
        maeMargin: margin,
        minTrain: effectiveMinTrain,
        n: series.length,
        sesForecast: sesForecast(series, effectiveAlpha),
        sesRollingOriginMae: sesMae,
        trailingMeanForecast: trailingMean(series, effectiveWindow),
        trailingRollingOriginMae: trailMae,
        trailingWindow: effectiveWindow,
      },
    };
  } catch (e) {
    return fail(`ts forecast backtest threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Logistic availability probability from workload features.
 * `beta[0]` is the intercept and `beta[j + 1]` weights `features[j]`.
 */
export function evalAvailabilityProb(input: {
  readonly features: readonly number[];
  readonly beta: readonly number[];
}): PropsEval<{ readonly probability: number; readonly logit: number }> {
  const { features, beta } = input;
  if (!Array.isArray(features) || features.length === 0) {
    return fail("features must be a non-empty array");
  }
  if (!allFinite(features)) return fail("features must be finite");
  if (!Array.isArray(beta) || beta.length !== features.length + 1) {
    return fail(
      `beta must be features.length + 1 long (intercept + one weight per feature): expected ${features.length + 1}, got ${beta.length}`,
    );
  }
  if (!allFinite(beta)) return fail("beta must be finite");
  try {
    const probability = availabilityProb([...features], [...beta]);
    if (!isFiniteNumber(probability)) return fail("availability probability came back non-finite");
    if (probability <= 0 || probability >= 1) {
      return fail(
        `availability probability ${probability} is outside the open interval (0, 1); it is not a usable probability`,
      );
    }
    const intercept = beta[0] ?? 0;
    const logit = features.reduce((sum, f, j) => sum + f * (beta[j + 1] ?? 0), intercept);
    return { ok: true, data: { logit, probability } };
  } catch (e) {
    return fail(`availability prob threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Realized lineup-score gain of a TS-forecast slate over a trailing-average
 * slate. Fails closed when the baseline mean is ~0, because the ratio is then
 * an artefact of the epsilon guard inside the engine, not a gain.
 */
export function evalLineupForecastGain(input: {
  readonly tsScores: readonly number[];
  readonly trailingScores: readonly number[];
}): PropsEval<{ readonly gain: number; readonly meanTs: number; readonly meanTrailing: number }> {
  const { tsScores, trailingScores } = input;
  if (!Array.isArray(tsScores) || tsScores.length === 0) return fail("tsScores must be non-empty");
  if (!Array.isArray(trailingScores) || trailingScores.length === 0) {
    return fail("trailingScores must be non-empty");
  }
  if (!allFinite(tsScores)) return fail("tsScores must be finite");
  if (!allFinite(trailingScores)) return fail("trailingScores must be finite");
  const meanTs = tsScores.reduce((a, b) => a + b, 0) / tsScores.length;
  const meanTrailing = trailingScores.reduce((a, b) => a + b, 0) / trailingScores.length;
  if (Math.abs(meanTrailing) < 1e-6) {
    return fail(
      `trailing-average mean is ${meanTrailing}; the gain ratio would be an epsilon artefact, not a measured gain`,
    );
  }
  try {
    const gain = lineupForecastGain([...tsScores], [...trailingScores]);
    if (!isFiniteNumber(gain)) return fail("lineup forecast gain came back non-finite");
    return { ok: true, data: { gain, meanTs, meanTrailing } };
  } catch (e) {
    return fail(`lineup forecast gain threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 2003-01712v1 JOI stack metric ────────────────────────────────────────────

export interface RankedJoiPair {
  readonly pairId: string;
  readonly joiPerDropback: number;
  readonly dropbacksTogether: number;
  readonly jointEpa: number;
}

export interface JoiStackResult {
  readonly ranked: readonly RankedJoiPair[];
  readonly topPairId: string;
  readonly topJoiPerDropback: number;
  /** top minus bottom JOI/dropback — the spread the stack decision rests on. */
  readonly spread: number;
}

/**
 * Rank QB-pass-catcher pairs by joint EPA per shared dropback.
 *
 * A pair with zero shared dropbacks is REJECTED rather than scored 0.0: the
 * engine returns 0 for that case as a divide-by-zero guard, and a 0 that means
 * "no evidence" must never be ranked alongside a measured rate.
 */
export function evalJoiStackMetric(input: {
  readonly pairs: readonly PairSequence[];
}): PropsEval<JoiStackResult> {
  const { pairs } = input;
  if (!Array.isArray(pairs) || pairs.length === 0) return fail("pairs must be non-empty");
  const seen = new Set<string>();
  for (const pair of pairs) {
    if (!pair || typeof pair.pairId !== "string" || pair.pairId.length === 0) {
      return fail("each pair needs a non-empty pairId");
    }
    if (seen.has(pair.pairId)) return fail(`duplicate pairId "${pair.pairId}"`);
    seen.add(pair.pairId);
    if (!isFiniteNumber(pair.jointEpa)) return fail(`pair ${pair.pairId} jointEpa must be finite`);
    if (!isFiniteNumber(pair.dropbacksTogether) || !Number.isInteger(pair.dropbacksTogether)) {
      return fail(`pair ${pair.pairId} dropbacksTogether must be an integer`);
    }
    if (pair.dropbacksTogether < 1) {
      return fail(
        `pair ${pair.pairId} has ${pair.dropbacksTogether} shared dropbacks; JOI/dropback is undefined without at least one, and the engine would report 0.0 for it`,
      );
    }
  }
  try {
    const ranked = rankStackPairs(pairs.map((p) => ({ ...p })));
    const scored: RankedJoiPair[] = ranked.map((pair) => ({
      dropbacksTogether: pair.dropbacksTogether,
      joiPerDropback: joiPerDropback(pair.jointEpa, pair.dropbacksTogether),
      jointEpa: pair.jointEpa,
      pairId: pair.pairId,
    }));
    for (const row of scored) {
      if (!isFiniteNumber(row.joiPerDropback)) {
        return fail(`pair ${row.pairId} produced a non-finite JOI/dropback`);
      }
    }
    const top = scored[0];
    const bottom = scored[scored.length - 1];
    if (!top || !bottom) return fail("ranking produced no pairs");
    return {
      ok: true,
      data: {
        ranked: scored,
        spread: top.joiPerDropback - bottom.joiPerDropback,
        topJoiPerDropback: top.joiPerDropback,
        topPairId: top.pairId,
      },
    };
  } catch (e) {
    return fail(`joi stack metric threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Signed synergy edge for a co-presence pair: joint mean minus the average of
 * the two solo means, expressed in units of its own standard error.
 *
 * `se` must be strictly positive; the engine returns z = 0 when se is 0, which
 * would read as "no evidence of synergy" instead of "no evidence at all".
 */
export function evalSynergyEdge(input: {
  readonly jointMean: number;
  readonly soloMeanA: number;
  readonly soloMeanB: number;
  readonly standardError: number;
}): PropsEval<{ readonly edge: number; readonly z: number; readonly synergy: boolean }> {
  const { jointMean, soloMeanA, soloMeanB, standardError } = input;
  if (!isFiniteNumber(jointMean)) return fail("jointMean must be finite");
  if (!isFiniteNumber(soloMeanA)) return fail("soloMeanA must be finite");
  if (!isFiniteNumber(soloMeanB)) return fail("soloMeanB must be finite");
  if (!isFiniteNumber(standardError)) return fail("standardError must be finite");
  if (standardError <= 0) {
    return fail(
      `standardError must be > 0; with se = ${standardError} the engine reports z = 0, which reads as "no synergy" rather than "no evidence"`,
    );
  }
  try {
    const { edge, z } = synergyEdge(jointMean, soloMeanA, soloMeanB, standardError);
    if (!isFiniteNumber(edge) || !isFiniteNumber(z)) {
      return fail("synergy edge came back non-finite");
    }
    return { ok: true, data: { edge, synergy: edge > 0, z } };
  } catch (e) {
    return fail(`synergy edge threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 2004-08428v1 era-adjusted features ───────────────────────────────────────

/** Soft-thresholding operator, the shrinkage primitive the Lasso path is built on. */
export function evalSoftThreshold(input: {
  readonly x: number;
  readonly lambda: number;
}): PropsEval<{ readonly softThresholded: number }> {
  const { x, lambda } = input;
  if (!isFiniteNumber(x)) return fail("x must be finite");
  if (!isFiniteNumber(lambda) || lambda < 0) return fail("lambda must be a finite number >= 0");
  try {
    const softThresholded = softThreshold(x, lambda);
    if (!isFiniteNumber(softThresholded)) return fail("soft threshold came back non-finite");
    return { ok: true, data: { softThresholded } };
  } catch (e) {
    return fail(`soft threshold threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface LassoResult {
  readonly coefficients: readonly number[];
  readonly activeCount: number;
  readonly lam: number;
  readonly iters: number;
}

/**
 * Iterative soft-thresholding Lasso: min ||y - Xb||^2/2n + lam||b||_1.
 * `activeCount` counts coefficients the data kept above the threshold.
 */
export function evalIstaLasso(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly lambda: number;
  readonly iters: number;
}): PropsEval<LassoResult> {
  const { X, y, lambda, iters } = input;
  if (!Array.isArray(X) || X.length === 0) return fail("X must be a non-empty design matrix");
  const cols = X[0]?.length ?? 0;
  if (cols === 0) return fail("X rows must be non-empty (at least one feature)");
  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    if (!Array.isArray(row) || row.length !== cols) {
      return fail(`X row ${i} must be a length-${cols} array (design must be rectangular)`);
    }
    if (!allFinite(row)) return fail(`X row ${i} must be finite`);
  }
  if (!Array.isArray(y) || y.length !== X.length) {
    return fail(`y must have one entry per X row (expected ${X.length}, got ${y.length})`);
  }
  if (!allFinite(y)) return fail("y must be finite");
  if (!isFiniteNumber(lambda) || lambda < 0) return fail("lambda must be a finite number >= 0");
  if (!isPositiveInteger(iters)) return fail("iters must be a positive integer");
  try {
    const coefficients = istaLasso(
      X.map((row) => [...row]),
      [...y],
      lambda,
      iters,
    );
    if (coefficients.length !== cols) {
      return fail(`istaLasso returned ${coefficients.length} coefficients for ${cols} features`);
    }
    if (!allFinite(coefficients)) {
      return fail("istaLasso produced non-finite coefficients; the prox-gradient path did not converge");
    }
    return {
      ok: true,
      data: {
        activeCount: coefficients.filter((c) => c !== 0).length,
        coefficients,
        iters,
        lam: lambda,
      },
    };
  } catch (e) {
    return fail(`ista lasso threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Total-variation denoise of a 1-D series (L1 trend). Returns a real number per
 * input point; the assertion is that total variation never rises.
 */
export function evalTvDenoise1d(input: {
  readonly y: readonly number[];
  readonly lambda: number;
}): PropsEval<{
  readonly denoised: readonly number[];
  readonly totalVariationIn: number;
  readonly totalVariationOut: number;
  readonly maxAbsShift: number;
}> {
  const { y, lambda } = input;
  if (!Array.isArray(y) || y.length === 0) return fail("y must be a non-empty array of finite values");
  if (!allFinite(y)) return fail("y must contain only finite values");
  if (!isFiniteNumber(lambda) || lambda < 0) return fail("lambda must be a finite number >= 0");
  const totalVariation = (series: readonly number[]): number => {
    let tv = 0;
    for (let i = 1; i < series.length; i++) {
      tv += Math.abs((series[i] ?? 0) - (series[i - 1] ?? 0));
    }
    return tv;
  };
  try {
    const denoised = tvDenoise1d([...y], lambda);
    if (denoised.length !== y.length) {
      return fail(`tvDenoise1d returned ${denoised.length} points for ${y.length} inputs`);
    }
    if (!allFinite(denoised)) return fail("tvDenoise1d produced non-finite output");
    let maxAbsShift = 0;
    for (let i = 0; i < denoised.length; i++) {
      maxAbsShift = Math.max(maxAbsShift, Math.abs((denoised[i] ?? 0) - (y[i] ?? 0)));
    }
    return {
      ok: true,
      data: {
        denoised,
        maxAbsShift,
        totalVariationIn: totalVariation(y),
        totalVariationOut: totalVariation(denoised),
      },
    };
  } catch (e) {
    return fail(`tv denoise threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 2006-07513 archetypes ────────────────────────────────────────────────────

export interface NmfArchetypeResult {
  readonly k: number;
  readonly W: readonly (readonly number[])[];
  readonly H: readonly (readonly number[])[];
  readonly archetypeAssignments: readonly number[];
  readonly errorTrace: readonly number[];
  readonly finalError: number;
  /** True when every sampled reconstruction error is >= the one before it. */
  readonly errorMonotoneDecreasing: boolean;
}

/**
 * Non-negative matrix factorisation (Frobenius) plus per-sample archetype
 * assignment. `rand` is a caller-supplied deterministic RNG so the same seed
 * reproduces the same factors.
 *
 * Requires V >= 0: multiplicative updates are undefined on negative entries.
 */
export function evalNmfArchetypes(input: {
  readonly V: readonly (readonly number[])[];
  readonly k: number;
  readonly iters: number;
  readonly rand: () => number;
}): PropsEval<NmfArchetypeResult> {
  const { V, k, iters, rand } = input;
  if (!Array.isArray(V) || V.length === 0) return fail("V must be a non-empty matrix");
  const cols = V[0]?.length ?? 0;
  if (cols === 0) return fail("V rows must be non-empty");
  for (let i = 0; i < V.length; i++) {
    const row = V[i];
    if (!Array.isArray(row) || row.length !== cols) {
      return fail(`V row ${i} must be a length-${cols} array (V must be rectangular)`);
    }
    if (!allFinite(row)) return fail(`V row ${i} must be finite`);
    for (const cell of row) {
      if ((cell ?? 0) < 0) {
        return fail(
          `V row ${i} contains a negative entry; NMF multiplicative updates require V >= 0`,
        );
      }
    }
  }
  if (!isPositiveInteger(k) || k > Math.min(V.length, cols)) {
    return fail(`k must be an integer in [1, ${Math.min(V.length, cols)}] (= min(rows, cols))`);
  }
  if (!isPositiveInteger(iters)) return fail("iters must be a positive integer");
  if (typeof rand !== "function") return fail("rand must be a deterministic () => number in [0, 1)");
  try {
    const { W, H, err } = nmfFrobenius(
      V.map((row) => [...row]),
      k,
      iters,
      rand,
    );
    if (W.length !== V.length) return fail("nmfFrobenius returned a malformed W");
    if (H.length !== k) return fail("nmfFrobenius returned a malformed H");
    for (const row of W) {
      if (row.length !== k || !allFinite(row)) return fail("nmfFrobenius produced a malformed W row");
    }
    for (const row of H) {
      if (row.length !== cols || !allFinite(row)) return fail("nmfFrobenius produced a malformed H row");
    }
    for (const value of err) {
      if (!isFiniteNumber(value)) return fail("nmfFrobenius error trace contains a non-finite value");
    }
    const assignments = nmfArchetypeAssign(H);
    if (assignments.length !== cols) {
      return fail("nmfArchetypeAssign returned a length that does not match the sample count");
    }
    for (const a of assignments) {
      if (!isFiniteNumber(a) || a < 0 || a > k - 1) {
        return fail(`nmfArchetypeAssign produced an out-of-range archetype index ${a}`);
      }
    }
    const monotone = err.every((v, i) => i === 0 || v <= (err[i - 1] ?? 0) + 1e-9);
    const last = err[err.length - 1];
    return {
      ok: true,
      data: {
        H,
        W,
        archetypeAssignments: assignments,
        errorMonotoneDecreasing: monotone,
        errorTrace: err,
        finalError: last ?? 0,
        k,
      },
    };
  } catch (e) {
    return fail(`nmf archetypes threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface GaussianMixtureResult {
  readonly pi: number;
  readonly mu1: number;
  readonly mu2: number;
  readonly s1: number;
  readonly s2: number;
  /** |mu1 - mu2|; the two components collapsed if this is ~0. */
  readonly separation: number;
  readonly logLikelihoodFirst: number;
  readonly logLikelihoodLast: number;
  readonly logLikelihoodMonotone: boolean;
}

/**
 * Two-component 1-D Gaussian mixture by EM.
 *
 * A zero-spread sample is REJECTED: the mixture is then unidentifiable (both
 * components sit on the same point) and any reported separation would be an
 * artefact of the variance floor, not a finding.
 */
export function evalGaussianMixture1d(input: {
  readonly x: readonly number[];
  readonly iters: number;
}): PropsEval<GaussianMixtureResult> {
  const { x, iters } = input;
  if (!Array.isArray(x) || x.length < 4) {
    return fail("x must be an array of at least 4 finite values to identify a two-component mixture");
  }
  if (!allFinite(x)) return fail("x must contain only finite values");
  if (!isPositiveInteger(iters)) return fail("iters must be a positive integer");
  const min = Math.min(...x);
  const max = Math.max(...x);
  if (max - min <= 0) {
    return fail(
      "x has zero spread: a two-component mixture is not identifiable on a constant sample, and the engine's variance floor would invent a separation",
    );
  }
  try {
    const mixture = emGaussianMixture1d([...x], iters);
    for (const value of [mixture.pi, mixture.mu1, mixture.mu2, mixture.s1, mixture.s2]) {
      if (!isFiniteNumber(value)) return fail("gaussian mixture produced a non-finite parameter");
    }
    if (mixture.pi <= 0 || mixture.pi >= 1) {
      return fail(
        `mixture weight pi = ${mixture.pi} is outside (0, 1); one component collapsed onto the sample`,
      );
    }
    if (mixture.s1 <= 0 || mixture.s2 <= 0) {
      return fail("a component variance hit the 1e-6 floor; the mixture has effectively collapsed");
    }
    if (mixture.ll.length === 0) return fail("EM produced no log-likelihood samples");
    for (const value of mixture.ll) {
      if (!isFiniteNumber(value)) return fail("EM log-likelihood trace contains a non-finite value");
    }
    const first = mixture.ll[0];
    const last = mixture.ll[mixture.ll.length - 1];
    if (first === undefined || last === undefined) return fail("EM log-likelihood trace is empty");
    return {
      ok: true,
      data: {
        logLikelihoodFirst: first,
        logLikelihoodLast: last,
        logLikelihoodMonotone: emMonotone(mixture.ll),
        mu1: mixture.mu1,
        mu2: mixture.mu2,
        pi: mixture.pi,
        s1: mixture.s1,
        s2: mixture.s2,
        separation: Math.abs(mixture.mu1 - mixture.mu2),
      },
    };
  } catch (e) {
    return fail(`gaussian mixture threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Adjusted Rand index between two clusterings — the honest read on whether two
 * archetype assignments agree. Needs at least 2 points: the expected-index term
 * divides by C(n, 2), which is 0 at n = 1.
 */
export function evalAdjustedRandIndex(input: {
  readonly a: readonly number[];
  readonly b: readonly number[];
}): PropsEval<{ readonly adjustedRand: number }> {
  const { a, b } = input;
  if (!Array.isArray(a) || !Array.isArray(b)) return fail("a and b must be arrays");
  if (a.length !== b.length) return fail(`a and b must be the same length (${a.length} vs ${b.length})`);
  if (a.length < 2) return fail("a and b need at least 2 points for the adjusted Rand index to be defined");
  const badLabels = (labels: readonly number[], name: string): string | null => {
    for (const label of labels) {
      if (!isFiniteNumber(label) || !Number.isInteger(label) || label < 0) {
        return `${name} must contain non-negative integers; got ${String(label)}`;
      }
    }
    return null;
  };
  const badA = badLabels(a, "a");
  if (badA) return fail(badA);
  const badB = badLabels(b, "b");
  if (badB) return fail(badB);
  try {
    const adjustedRand = adjustedRandIndex([...a], [...b]);
    if (!isFiniteNumber(adjustedRand)) return fail("adjusted Rand index came back non-finite");
    return { ok: true, data: { adjustedRand } };
  } catch (e) {
    return fail(`adjusted rand index threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── 2112-07002 E[max] duel optimizer ─────────────────────────────────────────

/**
 * Closed-form E[max(X, Y)] for a bivariate Gaussian pair (2-entry Showdown duel).
 * `s1`/`s2` are standard deviations and `rho` the correlation; the result must
 * be at least max(mu1, mu2), which is checked before it is returned.
 */
export function evalExpectedMax2(input: {
  readonly mu1: number;
  readonly mu2: number;
  readonly s1: number;
  readonly s2: number;
  readonly rho: number;
}): PropsEval<{ readonly expectedMax: number }> {
  const { mu1, mu2, s1, s2, rho } = input;
  if (!isFiniteNumber(mu1)) return fail("mu1 must be finite");
  if (!isFiniteNumber(mu2)) return fail("mu2 must be finite");
  if (!isFiniteNumber(s1) || s1 <= 0) return fail("s1 must be a finite standard deviation > 0");
  if (!isFiniteNumber(s2) || s2 <= 0) return fail("s2 must be a finite standard deviation > 0");
  if (!isFiniteNumber(rho) || rho < -1 || rho > 1) return fail("rho must be a correlation in [-1, 1]");
  try {
    const expectedMax = expectedMax2(mu1, mu2, s1, s2, rho);
    if (!isFiniteNumber(expectedMax)) return fail("expectedMax2 came back non-finite");
    const floor = Math.max(mu1, mu2);
    if (expectedMax < floor - 1e-6) {
      return fail(
        `expectedMax ${expectedMax} is below max(mu1, mu2) = ${floor}, which no expectation of a max can be`,
      );
    }
    return { ok: true, data: { expectedMax } };
  } catch (e) {
    return fail(`expectedMax2 threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface EmaxPortfolioResult {
  readonly k: number;
  readonly chosen: readonly number[];
  readonly chosenIds: readonly string[];
  /** Sum of the chosen entries' mean scores — the greedy objective's basis. */
  readonly chosenMeanTotal: number;
  /** Mean of the chosen entries' mean scores. */
  readonly chosenMeanAverage: number;
}

/**
 * Greedy sequential E[max] portfolio selection. `rhos` is the full n x n
 * correlation matrix; the engine reads rhos[i][j] for each candidate against
 * each already-chosen entry, so a missing cell would be a silent zero.
 */
export function evalEmaxPortfolioGreedy(input: {
  readonly ids: readonly string[];
  readonly mus: readonly number[];
  readonly sigmas: readonly number[];
  readonly rhos: readonly (readonly number[])[];
  readonly k: number;
}): PropsEval<EmaxPortfolioResult> {
  const { ids, mus, sigmas, rhos, k } = input;
  if (!Array.isArray(mus) || mus.length === 0) return fail("mus must be non-empty");
  if (!Array.isArray(sigmas) || sigmas.length !== mus.length) {
    return fail(`sigmas must be the same length as mus (expected ${mus.length}, got ${sigmas.length})`);
  }
  if (!allFinite(mus)) return fail("mus must be finite");
  for (let i = 0; i < sigmas.length; i++) {
    const sigma = sigmas[i];
    if (!isFiniteNumber(sigma) || sigma <= 0) {
      return fail(`sigmas[${i}] must be a finite standard deviation > 0`);
    }
  }
  const n = mus.length;
  if (!Array.isArray(rhos) || rhos.length !== n) {
    return fail(`rhos must be an n x n matrix (expected ${n} rows, got ${rhos.length})`);
  }
  for (let i = 0; i < n; i++) {
    const row = rhos[i];
    if (!Array.isArray(row) || row.length !== n) {
      return fail(`rhos row ${i} must have ${n} entries (rhos must be square)`);
    }
    for (let j = 0; j < n; j++) {
      const value = row[j];
      if (!isFiniteNumber(value) || value < -1 || value > 1) {
        return fail(`rhos[${i}][${j}] must be a correlation in [-1, 1]`);
      }
    }
  }
  if (!Array.isArray(ids) || ids.length !== n) {
    return fail(`ids must have one label per entry (expected ${n}, got ${ids.length})`);
  }
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) return fail("every id must be a non-empty string");
  }
  if (!isPositiveInteger(k) || k > n) {
    return fail(`k must be an integer in [1, ${n}]`);
  }
  try {
    const chosen = emaxPortfolioGreedy(
      [...mus],
      [...sigmas],
      rhos.map((row) => [...row]),
      k,
    );
    if (chosen.length !== k) return fail(`emaxPortfolioGreedy returned ${chosen.length} entries for k = ${k}`);
    const seen = new Set<number>();
    for (const index of chosen) {
      if (!isFiniteNumber(index) || !Number.isInteger(index) || index < 0 || index >= n) {
        return fail(`emaxPortfolioGreedy returned an out-of-range index ${index}`);
      }
      if (seen.has(index)) return fail(`emaxPortfolioGreedy selected index ${index} twice`);
      seen.add(index);
    }
    const chosenMeanTotal = chosen.reduce((sum, i) => sum + (mus[i] ?? 0), 0);
    return {
      ok: true,
      data: {
        chosen,
        chosenIds: chosen.map((i) => ids[i] ?? ""),
        chosenMeanAverage: chosenMeanTotal / chosen.length,
        chosenMeanTotal,
        k,
      },
    };
  } catch (e) {
    return fail(`emax portfolio greedy threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── metrics/core: metric residual rollup ─────────────────────────────────────

const RESIDUAL_METRIC_IDS: readonly MetricResidualMetricId[] = [
  "yac-creation-gse",
  "rush-over-expected-gse",
];

export interface MetricResidualRollupsResult {
  readonly rollups: readonly MetricResidualRollup[];
  readonly keys: readonly string[];
  /** True only when EVERY rollup cleared its own source-policy gate. */
  readonly allAllowedForModeling: boolean;
  /** Always false here: the rollup's confidence is evidence quality, not P(win). */
  readonly confidenceIsProbability: false;
  readonly status: "SHADOW";
  readonly exposure: "INTERNAL";
}

function validateSourcePolicy(policy: unknown, where: string): string | null {
  if (!policy || typeof policy !== "object") return `${where}.sourcePolicy entries must be objects`;
  const p = policy as Partial<MetricSourcePolicy>;
  if (typeof p.sourceId !== "string" || p.sourceId.length === 0) {
    return `${where}.sourcePolicy[].sourceId must be a non-empty string`;
  }
  if (typeof p.status !== "string") {
    return `${where}.sourcePolicy[${p.sourceId}].status must be a source status string`;
  }
  if (typeof p.allowedForModeling !== "boolean") {
    return `${where}.sourcePolicy[${p.sourceId}].allowedForModeling must be a boolean`;
  }
  return null;
}

/** Recomputes the engine's own grouping key from the validated input rows. */
function rollupKeysFor(rows: readonly MetricResidualPlayInput[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of rows) {
    const key = metricResidualRollupKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys.sort();
}

/**
 * Group per-play metric residuals into player-season rollups.
 *
 * Every rollup is INTERNAL and SHADOW status, and its `confidenceScore` means
 * evidence quality, never outcome certainty. The bridge surfaces the source
 * policy gate separately (`allowedForModeling`) so a blocked rollup can never be
 * mistaken for a usable one.
 */
export function evalMetricResidualRollups(input: {
  readonly rows: readonly MetricResidualPlayInput[];
}): PropsEval<MetricResidualRollupsResult> {
  const { rows } = input;
  if (!Array.isArray(rows) || rows.length === 0) {
    return fail("rows must be a non-empty array of metric residual play inputs");
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") return fail(`rows[${i}] must be an object`);
    if (!RESIDUAL_METRIC_IDS.includes(row.metricId)) {
      return fail(
        `rows[${i}].metricId must be one of ${RESIDUAL_METRIC_IDS.join(" | ")}; got "${String(row.metricId)}"`,
      );
    }
    if (typeof row.playerId !== "string" || row.playerId.length === 0) {
      return fail(`rows[${i}].playerId must be a non-empty string`);
    }
    if (!isFiniteNumber(row.season) || !Number.isInteger(row.season)) {
      return fail(`rows[${i}].season must be an integer`);
    }
    if (!isFiniteNumber(row.actualValue)) return fail(`rows[${i}].actualValue must be finite`);
    if (!isFiniteNumber(row.expectedValue)) return fail(`rows[${i}].expectedValue must be finite`);
    if (row.residualValue !== undefined && !isFiniteNumber(row.residualValue)) {
      return fail(`rows[${i}].residualValue must be finite when supplied`);
    }
    if (row.creationIndex !== undefined && !isFiniteNumber(row.creationIndex)) {
      return fail(`rows[${i}].creationIndex must be finite when supplied`);
    }
    if (row.confidenceScore !== undefined && !isFiniteNumber(row.confidenceScore)) {
      return fail(`rows[${i}].confidenceScore must be finite when supplied`);
    }
    if (
      row.uncertaintyBand !== undefined &&
      row.uncertaintyBand !== "LOW" &&
      row.uncertaintyBand !== "MEDIUM" &&
      row.uncertaintyBand !== "HIGH"
    ) {
      return fail(`rows[${i}].uncertaintyBand must be LOW, MEDIUM or HIGH`);
    }
    if (!Array.isArray(row.sourcePolicy) || row.sourcePolicy.length === 0) {
      return fail(
        `rows[${i}].sourcePolicy must be non-empty; a metric with no source policy fails closed downstream`,
      );
    }
    for (const policy of row.sourcePolicy) {
      const problem = validateSourcePolicy(policy, `rows[${i}]`);
      if (problem) return fail(problem);
    }
  }
  try {
    const rollups = buildMetricResidualRollups(rows);
    if (rollups.length === 0) return fail("no rollups were produced from the supplied rows");
    for (const rollup of rollups) {
      if (rollup.sampleSize < 1) return fail("a rollup reported a sample size below 1");
      for (const value of [
        rollup.actualTotal,
        rollup.expectedTotal,
        rollup.residualTotal,
        rollup.residualPerPlay,
        rollup.creationIndexMean,
        rollup.confidenceScore,
      ]) {
        if (!isFiniteNumber(value)) return fail("a rollup reported a non-finite number");
      }
      if (rollup.confidenceScore < 0 || rollup.confidenceScore > 100) {
        return fail(
          `rollup confidenceScore ${rollup.confidenceScore} is outside [0, 100]; it is an evidence score, not a probability`,
        );
      }
    }
    const keys = rollupKeysFor(rows);
    return {
      ok: true,
      data: {
        allAllowedForModeling: rollups.every((r) => r.sourceValidation.allowed),
        confidenceIsProbability: false,
        exposure: "INTERNAL",
        keys,
        rollups,
        status: "SHADOW",
      },
    };
  } catch (e) {
    return fail(`metric residual rollup threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── metrics/core: empirical-Bayes shrinkage ──────────────────────────────────

export interface ShrinkResult {
  readonly shrunk: number;
  /** Share of the posterior weight sitting on the observation. */
  readonly weightOnObserved: number;
  readonly weightOnPrior: number;
  readonly sampleSize: number;
  readonly priorStrength: number;
}

/**
 * Conjugate posterior-mean pull of an observation toward a prior:
 * (n·observed + n0·prior) / (n + n0).
 *
 * A zero/zero pair is REJECTED: the engine returns the bare prior there, which
 * would read as a shrunk estimate when no shrinkage evidence exists at all.
 */
export function evalEmpiricalBayesShrink(input: {
  readonly observed: number;
  readonly prior: number;
  readonly sampleSize: number;
  readonly priorStrength: number;
}): PropsEval<ShrinkResult> {
  const { observed, prior, sampleSize, priorStrength } = input;
  if (!isFiniteNumber(observed)) return fail("observed must be finite");
  if (!isFiniteNumber(prior)) return fail("prior must be finite");
  if (!isFiniteNumber(sampleSize) || sampleSize < 0) return fail("sampleSize must be a finite number >= 0");
  if (!isFiniteNumber(priorStrength) || priorStrength < 0) {
    return fail("priorStrength must be a finite number >= 0");
  }
  if (sampleSize + priorStrength <= 0) {
    return fail(
      "sampleSize and priorStrength are both 0: there is no evidence and no prior mass, so the engine would echo the prior back as if it were a shrunk estimate",
    );
  }
  const denominator = sampleSize + priorStrength;
  try {
    const shrunk = empiricalBayesShrink({ observed, prior, priorStrength, sampleSize });
    if (!isFiniteNumber(shrunk)) return fail("empiricalBayesShrink came back non-finite");
    return {
      ok: true,
      data: {
        priorStrength,
        sampleSize,
        shrunk,
        weightOnObserved: sampleSize / denominator,
        weightOnPrior: priorStrength / denominator,
      },
    };
  } catch (e) {
    return fail(`empirical bayes shrink threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Probability specialization of the shrinkage pull.
 *
 * `shrinkProbability` clamps out-of-range inputs into [0, 1] silently. This
 * bridge refuses them instead: a 1.4 "probability" is a broken reading, and
 * clamping it would launder the break into a plausible-looking 1.0.
 */
export function evalShrinkProbability(input: {
  readonly observed: number;
  readonly prior: number;
  readonly sampleSize: number;
  readonly priorStrength: number;
}): PropsEval<ShrinkResult> {
  const { observed, prior, sampleSize, priorStrength } = input;
  if (!isFiniteNumber(observed)) return fail("observed must be finite");
  if (!isFiniteNumber(prior)) return fail("prior must be finite");
  if (observed < 0 || observed > 1) {
    return fail(
      `observed must be a probability in [0, 1]; got ${observed} and shrinkProbability would silently clamp it`,
    );
  }
  if (prior < 0 || prior > 1) {
    return fail(
      `prior must be a probability in [0, 1]; got ${prior} and shrinkProbability would silently clamp it`,
    );
  }
  if (!isFiniteNumber(sampleSize) || sampleSize < 0) return fail("sampleSize must be a finite number >= 0");
  if (!isFiniteNumber(priorStrength) || priorStrength < 0) {
    return fail("priorStrength must be a finite number >= 0");
  }
  if (sampleSize + priorStrength <= 0) {
    return fail(
      "sampleSize and priorStrength are both 0: the engine would return the prior as if it were a shrunk probability",
    );
  }
  const denominator = sampleSize + priorStrength;
  try {
    const shrunk = shrinkProbability({ observed, prior, priorStrength, sampleSize });
    if (!isFiniteNumber(shrunk)) return fail("shrinkProbability came back non-finite");
    if (shrunk < 0 || shrunk > 1) {
      return fail(`shrinkProbability returned ${shrunk}, outside the probability range [0, 1]`);
    }
    return {
      ok: true,
      data: {
        priorStrength,
        sampleSize,
        shrunk,
        weightOnObserved: sampleSize / denominator,
        weightOnPrior: priorStrength / denominator,
      },
    };
  } catch (e) {
    return fail(`shrink probability threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Shrink the weighted mean of several readings toward a prior, using the total
 * entry weight as the effective sample size.
 *
 * Non-finite values and non-positive weights are REJECTED rather than passed
 * through: `shrinkWeightedMean` sums the weight over ALL entries while
 * `weightedMean` silently drops the unusable ones, so letting a non-finite
 * value through would over-trust the observation against the prior.
 */
export function evalShrinkWeightedMean(input: {
  readonly entries: readonly { readonly value: number; readonly weight: number }[];
  readonly prior: number;
  readonly priorStrength: number;
}): PropsEval<ShrinkResult> {
  const { entries, prior, priorStrength } = input;
  if (!Array.isArray(entries) || entries.length === 0) return fail("entries must be non-empty");
  let totalWeight = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== "object") return fail(`entries[${i}] must be a { value, weight } object`);
    if (!isFiniteNumber(entry.value)) {
      return fail(
        `entries[${i}].value must be finite; weightedMean drops non-finite values but shrinkWeightedMean would still count its weight, over-trusting the observation`,
      );
    }
    if (!isFiniteNumber(entry.weight)) return fail(`entries[${i}].weight must be finite`);
    if (entry.weight <= 0) {
      return fail(
        `entries[${i}].weight must be > 0; weightedMean drops non-positive weights but shrinkWeightedMean would still count nothing useful for them`,
      );
    }
    totalWeight += entry.weight;
  }
  if (!isFiniteNumber(prior)) return fail("prior must be finite");
  if (!isFiniteNumber(priorStrength) || priorStrength < 0) {
    return fail("priorStrength must be a finite number >= 0");
  }
  if (totalWeight + priorStrength <= 0) {
    return fail("entries and priorStrength carry no weight; no shrinkage would be possible");
  }
  const observed = entries.reduce((sum, e) => sum + (e.value * e.weight), 0) / totalWeight;
  try {
    const shrunk = shrinkWeightedMean(
      entries.map((e) => ({ value: e.value, weight: e.weight })),
      prior,
      priorStrength,
    );
    if (!isFiniteNumber(shrunk)) return fail("shrinkWeightedMean came back non-finite");
    return {
      ok: true,
      data: {
        priorStrength,
        sampleSize: totalWeight,
        shrunk,
        weightOnObserved: totalWeight / (totalWeight + priorStrength),
        weightOnPrior: priorStrength / (totalWeight + priorStrength),
      },
    };
  } catch (e) {
    return fail(`shrink weighted mean threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Re-exported so a caller can type an input without a second engine import.
export type {
  MetricResidualMetricId,
  MetricResidualPlayInput,
  MetricResidualRollup,
  MetricUncertaintyBand,
};
export type { PairSequence };
