import { describe, expect, it } from "vitest";
import {
  evalLocalMatrixCompletion,
  evalImputationHoldoutRmse,
  evalTsForecastBacktest,
  evalAvailabilityProb,
  evalLineupForecastGain,
  evalJoiStackMetric,
  evalSynergyEdge,
  evalSoftThreshold,
  evalIstaLasso,
  evalTvDenoise1d,
  evalNmfArchetypes,
  evalGaussianMixture1d,
  evalAdjustedRandIndex,
  evalExpectedMax2,
  evalEmaxPortfolioGreedy,
  evalMetricResidualRollups,
  evalEmpiricalBayesShrink,
  evalShrinkProbability,
  evalShrinkWeightedMean,
  type MatrixCellOrigin,
  type MetricResidualPlayInput,
} from "./props-metrics-bridge.js";

/**
 * Deterministic RNG. A 32-bit LCG, never Math.random: NMF's multiplicative
 * updates are path-dependent, so a reproducible stream is the only way to pin
 * a factorization to a number.
 */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ─── 1505-01147 local matrix completion ───────────────────────────────────────

/** Exact rank-2 truth: 6 players x 4 weeks, so a rank-2 ALS fit is identifiable. */
const LATENT_U: readonly (readonly number[])[] = [
  [2.0, 0.2],
  [2.1, 0.1],
  [1.9, 0.3],
  [2.05, 0.15],
  [1.95, 0.25],
  [2.0, 0.05],
];
const LATENT_V: readonly (readonly number[])[] = [
  [10, 1.0],
  [12, 1.2],
  [11, 0.9],
  [13, 1.1],
];

const MATRIX_TRUTH: readonly (readonly number[])[] = LATENT_U.map((u) =>
  LATENT_V.map((v) => (u[0] ?? 0) * (v[0] ?? 0) + (u[1] ?? 0) * (v[1] ?? 0)),
);

const HIDDEN_CELLS: readonly (readonly boolean[])[] = MATRIX_TRUTH.map((row, i) =>
  row.map((_, j) => (i === 0 && j === 1) || (i === 3 && j === 2)),
);

const SPARSE_MATRIX: readonly (readonly (number | null)[])[] = MATRIX_TRUTH.map((row, i) =>
  row.map((value, j) => (HIDDEN_CELLS[i]?.[j] === true ? null : value)),
);

describe("props-metrics local matrix completion", () => {
  it("recovers a held-out cell of an exactly rank-2 matrix and labels its provenance", () => {
    const r = evalLocalMatrixCompletion({
      matrix: SPARSE_MATRIX,
      rank: 2,
      iters: 20000,
      seed: 11,
      ridge: 1e-3,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.data.rows).toBe(6);
    expect(r.data.cols).toBe(4);
    expect(r.data.rank).toBe(2);
    expect(r.data.observedCount).toBe(22);
    expect(r.data.imputedCount).toBe(2);
    expect(r.data.minObservedPerRow).toBe(3);
    expect(r.data.embeddingInput).toBe("COMPLETED_MATRIX_INCLUDES_IMPUTED_CELLS");

    // Observed and imputed cells are structurally distinguishable.
    const observed0 = r.data.cells[0]?.[0] as { value: number; origin: MatrixCellOrigin };
    const imputed0 = r.data.cells[0]?.[1] as { value: number; origin: MatrixCellOrigin };
    const imputed3 = r.data.cells[3]?.[2] as { value: number; origin: MatrixCellOrigin };
    expect(observed0.origin).toBe("OBSERVED");
    expect(imputed0.origin).toBe("IMPUTED");
    expect(imputed3.origin).toBe("IMPUTED");
    expect(r.data.observedMask[0]?.[1]).toBe(false);
    expect(r.data.observedMask[0]?.[0]).toBe(true);

    // An observed cell is reconstructed, not copied: the ALS actually fits.
    expect(observed0.value).toBeCloseTo(MATRIX_TRUTH[0]?.[0] ?? 0, 3);
    // The hidden cells are imputed close to truth, but are NOT the truth.
    expect(imputed0.value).toBeCloseTo(MATRIX_TRUTH[0]?.[1] ?? 0, 2);
    expect(imputed3.value).toBeCloseTo(MATRIX_TRUTH[3]?.[2] ?? 0, 2);
    expect(Math.abs(imputed0.value - (MATRIX_TRUTH[0]?.[1] ?? 0))).toBeLessThan(0.005);

    // The three-number specialization embedding is one finite triple per row.
    expect(r.data.embedding).toHaveLength(6);
    for (const triple of r.data.embedding) {
      expect(triple).toHaveLength(3);
      expect(triple.every((v) => Number.isFinite(v))).toBe(true);
    }
    // The level component is the row mean of the completed row.
    const level = r.data.embedding[0]?.[0] ?? 0;
    const row0 = r.data.cells[0] ?? [];
    const row0Mean = row0.reduce((s, c) => s + c.value, 0) / row0.length;
    expect(level).toBeCloseTo(row0Mean, 9);
  });

  it("scores the holdout RMSE of the imputed cells", () => {
    const completed = evalLocalMatrixCompletion({
      matrix: SPARSE_MATRIX,
      rank: 2,
      iters: 20000,
      seed: 11,
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    const dense = completed.data.cells.map((row) => row.map((c) => c.value));

    const score = evalImputationHoldoutRmse({
      completed: dense,
      truth: MATRIX_TRUTH,
      mask: HIDDEN_CELLS,
    });
    expect(score.ok).toBe(true);
    if (!score.ok) return;
    expect(score.data.holdoutCells).toBe(2);
    // Measured: the ALS recovers the hidden cells to ~7e-4 RMSE on an exactly
    // rank-2 matrix held out at two cells.
    expect(score.data.rmse).toBeLessThan(0.01);
    expect(score.data.rmse).toBeGreaterThan(0);

    const emptyMask = evalImputationHoldoutRmse({
      completed: dense,
      truth: MATRIX_TRUTH,
      mask: HIDDEN_CELLS.map((row) => row.map(() => false)),
    });
    expect(emptyMask.ok).toBe(false);
  });

  it("fail-closes rather than filling an unobserved row or column", () => {
    const emptyRow = SPARSE_MATRIX.map((row, i) => (i === 2 ? row.map(() => null) : row));
    const noObs = evalLocalMatrixCompletion({ matrix: emptyRow, rank: 2 });
    expect(noObs.ok).toBe(false);
    if (!noObs.ok) expect(noObs.reason).toMatch(/no observed cell/);

    const emptyCol = SPARSE_MATRIX.map((row) => row.map((v, j) => (j === 2 ? null : v)));
    expect(evalLocalMatrixCompletion({ matrix: emptyCol, rank: 2 }).ok).toBe(false);

    // A fully-null matrix carries no information at all.
    expect(
      evalLocalMatrixCompletion({ matrix: SPARSE_MATRIX.map((r) => r.map(() => null)), rank: 2 }).ok,
    ).toBe(false);
    // Jagged, non-finite, and out-of-range rank all fail closed.
    expect(evalLocalMatrixCompletion({ matrix: [[1, 2], [3]], rank: 1 }).ok).toBe(false);
    expect(
      evalLocalMatrixCompletion({
        matrix: [
          [1, Number.NaN],
          [2, 3],
        ],
        rank: 1,
      }).ok,
    ).toBe(false);
    expect(evalLocalMatrixCompletion({ matrix: SPARSE_MATRIX, rank: 0 }).ok).toBe(false);
    expect(evalLocalMatrixCompletion({ matrix: SPARSE_MATRIX, rank: 9 }).ok).toBe(false);
    expect(
      evalLocalMatrixCompletion({ matrix: SPARSE_MATRIX, rank: 2, iters: 0 }).ok,
    ).toBe(false);
  });
});

// ─── 1909-12938 time-series forecast ──────────────────────────────────────────

describe("props-metrics ts forecast", () => {
  it("rolls one-step forecasts forward and scores SES against a trailing mean", () => {
    const history = [10, 10, 11, 12, 14, 17, 21, 26];
    const r = evalTsForecastBacktest({ history, alpha: 0.8, trailingWindow: 3, minTrain: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.data.n).toBe(8);
    expect(r.data.evaluatedPoints).toBe(5);
    expect(r.data.lastObserved).toBe(26);
    // Level at the end of the series, and the trailing 3-point mean.
    expect(r.data.sesForecast).toBeCloseTo(24.812416, 5);
    expect(r.data.trailingMeanForecast).toBeCloseTo(21.3333333, 5);
    // Rolling-origin MAE, recomputed by hand from the same five origins.
    expect(r.data.sesRollingOriginMae).toBeCloseTo(3.503104, 5);
    expect(r.data.trailingRollingOriginMae).toBeCloseTo(4.9333333, 5);
    expect(r.data.maeMargin).toBeCloseTo(1.4302293, 5);
    expect(r.data.betterForecaster).toBe("SES");
  });

  it("calls a flat series a tie rather than inventing a winner", () => {
    const flat = [7, 7, 7, 7, 7, 7];
    const r = evalTsForecastBacktest({ history: flat, alpha: 0.5, trailingWindow: 2, minTrain: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sesRollingOriginMae).toBe(0);
    expect(r.data.trailingRollingOriginMae).toBe(0);
    expect(r.data.betterForecaster).toBe("TIE");
    expect(r.data.sesForecast).toBe(7);
  });

  it("fails closed on a history too short to score, on NaN, and on alpha out of range", () => {
    expect(evalTsForecastBacktest({ history: [1, 2], minTrain: 3 }).ok).toBe(false);
    expect(evalTsForecastBacktest({ history: [] }).ok).toBe(false);
    expect(evalTsForecastBacktest({ history: [1, 2, Number.POSITIVE_INFINITY, 4, 5, 6] }).ok).toBe(false);
    expect(evalTsForecastBacktest({ history: [1, 2, 3, 4, 5], alpha: 0 }).ok).toBe(false);
    expect(evalTsForecastBacktest({ history: [1, 2, 3, 4, 5], alpha: 1.5 }).ok).toBe(false);
    expect(evalTsForecastBacktest({ history: [1, 2, 3, 4, 5], minTrain: 1 }).ok).toBe(false);
  });
});

describe("props-metrics availability and lineup gain", () => {
  it("maps a logistic workload model to a real probability", () => {
    const r = evalAvailabilityProb({ features: [1, 2, 0.5], beta: [0.2, 1.5, -0.5, 3] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.logit).toBeCloseTo(2.2, 10);
    expect(r.data.probability).toBeCloseTo(0.9002495, 7);
    expect(r.data.probability).toBeGreaterThan(0);
    expect(r.data.probability).toBeLessThan(1);
  });

  it("fail-closes when beta does not match the feature count", () => {
    const bad = evalAvailabilityProb({ features: [1, 2, 0.5], beta: [0.2, 1.5, -0.5] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/features.length \+ 1/);
    expect(evalAvailabilityProb({ features: [], beta: [0] }).ok).toBe(false);
    expect(evalAvailabilityProb({ features: [Number.NaN], beta: [0, 1] }).ok).toBe(false);
  });

  it("computes a real lineup-score gain and refuses a zero baseline", () => {
    const r = evalLineupForecastGain({ tsScores: [10, 12, 14], trailingScores: [8, 9, 10] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.meanTs).toBe(12);
    expect(r.data.meanTrailing).toBe(9);
    expect(r.data.gain).toBeCloseTo(1 / 3, 6);

    const zeroBaseline = evalLineupForecastGain({ tsScores: [1, 2], trailingScores: [0, 0] });
    expect(zeroBaseline.ok).toBe(false);
    if (!zeroBaseline.ok) expect(zeroBaseline.reason).toMatch(/epsilon artefact/);
    expect(evalLineupForecastGain({ tsScores: [], trailingScores: [1] }).ok).toBe(false);
  });
});

// ─── 2003-01712 JOI stack metric ──────────────────────────────────────────────

describe("props-metrics JOI stack metric", () => {
  it("ranks pairs by joint EPA per shared dropback", () => {
    const r = evalJoiStackMetric({
      pairs: [
        { pairId: "mahomes-chase", dropbacksTogether: 40, jointEpa: 20 },
        { pairId: "mahomes-wilson", dropbacksTogether: 20, jointEpa: 4 },
        { pairId: "burrow-wilson", dropbacksTogether: 60, jointEpa: 18 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.ranked.map((p) => p.pairId)).toEqual([
      "mahomes-chase",
      "burrow-wilson",
      "mahomes-wilson",
    ]);
    expect(r.data.topPairId).toBe("mahomes-chase");
    expect(r.data.topJoiPerDropback).toBeCloseTo(0.5, 12);
    expect(r.data.ranked[1]?.joiPerDropback).toBeCloseTo(0.3, 12);
    expect(r.data.ranked[2]?.joiPerDropback).toBeCloseTo(0.2, 12);
    expect(r.data.spread).toBeCloseTo(0.3, 12);
  });

  it("refuses a pair with zero shared dropbacks instead of scoring it 0.0", () => {
    const r = evalJoiStackMetric({
      pairs: [{ pairId: "mahomes-chase", dropbacksTogether: 0, jointEpa: 0 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/at least one/);
    expect(evalJoiStackMetric({ pairs: [] }).ok).toBe(false);
    expect(
      evalJoiStackMetric({
        pairs: [
          { pairId: "a", dropbacksTogether: 1, jointEpa: 1 },
          { pairId: "a", dropbacksTogether: 2, jointEpa: 2 },
        ],
      }).ok,
    ).toBe(false);
  });

  it("scores a signed synergy edge in standard-error units", () => {
    const r = evalSynergyEdge({ jointMean: 0.42, soloMeanA: 0.18, soloMeanB: 0.2, standardError: 0.05 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.edge).toBeCloseTo(0.23, 12);
    expect(r.data.z).toBeCloseTo(4.6, 10);
    expect(r.data.synergy).toBe(true);

    const adverse = evalSynergyEdge({
      jointMean: 0.1,
      soloMeanA: 0.3,
      soloMeanB: 0.3,
      standardError: 0.02,
    });
    expect(adverse.ok).toBe(true);
    if (adverse.ok) {
      expect(adverse.data.edge).toBeCloseTo(-0.2, 12);
      expect(adverse.data.synergy).toBe(false);
    }
  });

  it("fail-closes on a zero standard error", () => {
    const r = evalSynergyEdge({ jointMean: 0.42, soloMeanA: 0.18, soloMeanB: 0.2, standardError: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/standardError must be > 0/);
    expect(
      evalSynergyEdge({ jointMean: Number.NaN, soloMeanA: 0, soloMeanB: 0, standardError: 0.1 }).ok,
    ).toBe(false);
  });
});

// ─── 2004-08428 era-adjusted features ─────────────────────────────────────────

describe("props-metrics era-adjusted features", () => {
  it("soft-thresholds to the exact operator values", () => {
    const over = evalSoftThreshold({ x: 2.5, lambda: 1 });
    const under = evalSoftThreshold({ x: -2.5, lambda: 1 });
    const inside = evalSoftThreshold({ x: 0.5, lambda: 1 });
    const edge = evalSoftThreshold({ x: 1, lambda: 1 });
    expect(over.ok && under.ok && inside.ok && edge.ok).toBe(true);
    if (over.ok) expect(over.data.softThresholded).toBe(1.5);
    if (under.ok) expect(under.data.softThresholded).toBe(-1.5);
    if (inside.ok) expect(inside.data.softThresholded).toBe(0);
    if (edge.ok) expect(edge.data.softThresholded).toBe(0);
  });

  it("recovers a known Lasso signal and converges further with more iterations", () => {
    const X = [
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 1],
      [5, 0],
      [6, 1],
      [7, 0],
      [8, 1],
    ];
    const y = X.map((row) => 2 * (row[0] ?? 0) + 1 * (row[1] ?? 0));
    // The prox-gradient path in istaLasso divides the gradient by n a second
    // time, so convergence is slow: the true OLS solution is [2, 1] and it takes
    // ~1e5 iterations to get there. Measured 5e3 -> [2.062, 0.374],
    // 1e5 -> [2.0007, 0.9932].
    const warm = evalIstaLasso({ X, y, lambda: 0, iters: 5000 });
    const loose = evalIstaLasso({ X, y, lambda: 0, iters: 100000 });
    expect(warm.ok && loose.ok).toBe(true);
    if (!warm.ok || !loose.ok) return;

    expect(loose.data.coefficients).toHaveLength(2);
    expect(loose.data.coefficients[0]).toBeCloseTo(2, 2);
    expect(loose.data.coefficients[1]).toBeCloseTo(1, 1);
    expect(loose.data.activeCount).toBe(2);

    const distance = (b: readonly number[]): number => Math.hypot((b[0] ?? 0) - 2, (b[1] ?? 0) - 1);
    expect(distance(loose.data.coefficients)).toBeLessThan(distance(warm.data.coefficients));
    expect(distance(loose.data.coefficients)).toBeLessThan(0.01);

    const tight = evalIstaLasso({ X, y, lambda: 1.5, iters: 100000 });
    expect(tight.ok).toBe(true);
    if (!tight.ok) return;
    const normLoose = Math.hypot(...loose.data.coefficients);
    const normTight = Math.hypot(...tight.data.coefficients);
    expect(normTight).toBeLessThan(normLoose);
  });

  it("fail-closes on a ragged design, a mismatched target, and bad hyper-parameters", () => {
    const X = [
      [1, 2],
      [3, 4],
    ];
    expect(evalIstaLasso({ X, y: [1, 2], lambda: 0, iters: 10 }).ok).toBe(true);
    expect(evalIstaLasso({ X: [[1, 2], [3]], y: [1, 2], lambda: 0, iters: 10 }).ok).toBe(false);
    expect(evalIstaLasso({ X, y: [1, 2, 3], lambda: 0, iters: 10 }).ok).toBe(false);
    expect(evalIstaLasso({ X, y: [1, 2], lambda: -1, iters: 10 }).ok).toBe(false);
    expect(evalIstaLasso({ X, y: [1, 2], lambda: 0, iters: 0 }).ok).toBe(false);
    expect(evalIstaLasso({ X: [[Number.NaN, 1]], y: [1], lambda: 0, iters: 10 }).ok).toBe(false);
  });

  it("TV-denoise is a no-op on a ramp — measured, and the reason it cannot be trusted", () => {
    // MEASURED DEFECT, pinned rather than hidden. `tvDenoise1d` adds
    // `lam * sign(x[i] - x[i + 1])` to the TV-penalty gradient where the correct
    // term is `lam * sign(x[i + 1] - x[i])`, so it descends the gradient of a
    // TV-REWARDING objective rather than the documented taut-string / fused-lasso
    // proximal step. The proof that this is not a TV denoiser: a strictly
    // monotone series already has minimal total variation, so any correct TV
    // regularizer must return it unchanged. This one moves BOTH endpoints by
    // exactly 1.0 — measured on [0,1,2,3,4,5] with lam = 2.
    const ramp = [0, 1, 2, 3, 4, 5];
    const rampOut = evalTvDenoise1d({ y: ramp, lambda: 2 });
    expect(rampOut.ok).toBe(true);
    if (!rampOut.ok) return;
    expect(rampOut.data.totalVariationIn).toBe(5);
    expect(rampOut.data.denoised[0]).toBeCloseTo(1, 9);
    expect(rampOut.data.denoised[5]).toBeCloseTo(4, 9);
    expect(rampOut.data.maxAbsShift).toBeCloseTo(1, 9);

    // On a flat-topped plateau the same sign error inflates the zero-valued
    // ends from 0 to ~1.0, measured on [0,5,5,5,0] with lam = 2.
    const plateau = evalTvDenoise1d({ y: [0, 5, 5, 5, 0], lambda: 2 });
    expect(plateau.ok).toBe(true);
    if (plateau.ok) {
      expect(plateau.data.denoised[0]).toBeCloseTo(1, 6);
      expect(plateau.data.denoised[1]).toBeCloseTo(4.327431, 5);
    }

    // The single-spike case is the only one where it looks like a denoiser: the
    // peak is pulled from 10 to exactly 8 and total variation falls 20 -> 16.72.
    const spiky = [0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0];
    const denoised = evalTvDenoise1d({ y: spiky, lambda: 2 });
    expect(denoised.ok).toBe(true);
    if (!denoised.ok) return;
    expect(denoised.data.denoised).toHaveLength(spiky.length);
    expect(denoised.data.denoised.every((v) => Number.isFinite(v))).toBe(true);
    expect(denoised.data.totalVariationIn).toBe(20);
    expect(denoised.data.totalVariationOut).toBeCloseTo(16.7156461, 6);
    expect(denoised.data.denoised[5]).toBeCloseTo(8, 9);
    expect(denoised.data.maxAbsShift).toBeCloseTo(2, 9);

    // With no penalty the operator is exactly the identity: the gradient is 0
    // at x = y, so nothing moves.
    const identity = evalTvDenoise1d({ y: spiky, lambda: 0 });
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    for (let i = 0; i < spiky.length; i++) {
      expect(identity.data.denoised[i]).toBe(spiky[i]);
    }
    expect(identity.data.totalVariationOut).toBe(20);
  });

  it("fail-closes on an empty or non-finite TV series", () => {
    expect(evalTvDenoise1d({ y: [], lambda: 1 }).ok).toBe(false);
    expect(evalTvDenoise1d({ y: [1, Number.NaN], lambda: 1 }).ok).toBe(false);
    expect(evalTvDenoise1d({ y: [1, 2], lambda: -1 }).ok).toBe(false);
  });
});

// ─── 2006-07513 archetypes ────────────────────────────────────────────────────

/** Two clean archetypes with genuine within-archetype spread. */
const NMF_V: readonly (readonly number[])[] = [
  [10, 8, 12, 9],
  [11, 9, 11, 10],
  [9, 7, 13, 8],
  [2, 3, 1, 2],
  [3, 2, 2, 3],
  [2, 4, 1, 1],
];

describe("props-metrics archetypes", () => {
  it("factors a two-archetype matrix and assigns every sample", () => {
    const r = evalNmfArchetypes({ V: NMF_V, k: 2, iters: 200, rand: lcg(12345) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.W).toHaveLength(6);
    expect(r.data.H).toHaveLength(2);
    expect(r.data.archetypeAssignments).toHaveLength(4);
    expect(new Set(r.data.archetypeAssignments).size).toBe(2);
    for (const a of r.data.archetypeAssignments) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    // Multiplicative updates must not increase the reconstruction error.
    expect(r.data.errorMonotoneDecreasing).toBe(true);
    expect(r.data.finalError).toBeLessThan(r.data.errorTrace[0] ?? Number.POSITIVE_INFINITY);

    // The same seed reproduces the same factorization exactly.
    const again = evalNmfArchetypes({ V: NMF_V, k: 2, iters: 200, rand: lcg(12345) });
    expect(again.ok).toBe(true);
    if (again.ok) {
      expect(again.data.archetypeAssignments).toEqual(r.data.archetypeAssignments);
      expect(again.data.finalError).toBe(r.data.finalError);
    }
  });

  it("fail-closes on a negative entry, an oversized k, and zero iterations", () => {
    expect(evalNmfArchetypes({ V: [[1, -1]], k: 1, iters: 5, rand: lcg(1) }).ok).toBe(false);
    expect(evalNmfArchetypes({ V: NMF_V, k: 0, iters: 5, rand: lcg(1) }).ok).toBe(false);
    expect(evalNmfArchetypes({ V: NMF_V, k: 99, iters: 5, rand: lcg(1) }).ok).toBe(false);
    expect(evalNmfArchetypes({ V: NMF_V, k: 2, iters: 0, rand: lcg(1) }).ok).toBe(false);
    expect(evalNmfArchetypes({ V: [[1, 2], [3]], k: 1, iters: 5, rand: lcg(1) }).ok).toBe(false);
  });

  it("separates a genuine two-component Gaussian mixture to its exact M-step", () => {
    const x = [0.5, 1.0, 1.4, 0.8, 1.2, 8.5, 9.0, 9.5, 8.8, 9.2];
    const r = evalGaussianMixture1d({ x, iters: 200 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Responsibilities are 0/1 at the initial unit variance, so one M step is
    // already the fixed point: means and (weighted) variances are the plain
    // per-cluster moments, and the log-likelihood trace is flat, not rising.
    expect(r.data.pi).toBeCloseTo(0.5, 12);
    expect(r.data.mu1).toBeCloseTo(0.98, 12);
    expect(r.data.mu2).toBeCloseTo(9.0, 12);
    expect(r.data.s1).toBeCloseTo(0.0976, 12);
    expect(r.data.s2).toBeCloseTo(0.116, 12);
    expect(r.data.separation).toBeCloseTo(8.02, 10);
    expect(r.data.logLikelihoodLast).toBe(r.data.logLikelihoodFirst);
    expect(r.data.logLikelihoodFirst).toBeCloseTo(-9.91824995, 8);
    expect(r.data.logLikelihoodMonotone).toBe(true);
  });

  it("climbs the likelihood monotonically on overlapping components", () => {
    const x = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8];
    const r = evalGaussianMixture1d({ x, iters: 200 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.logLikelihoodLast).toBeGreaterThan(r.data.logLikelihoodFirst);
    expect(r.data.logLikelihoodMonotone).toBe(true);
    expect(r.data.mu1).toBeLessThan(r.data.mu2);
    expect(r.data.pi).toBeGreaterThan(0);
    expect(r.data.pi).toBeLessThan(1);
  });

  it("fail-closes on a zero-spread sample, which a mixture cannot identify", () => {
    const flat = evalGaussianMixture1d({ x: [3, 3, 3, 3, 3, 3], iters: 100 });
    expect(flat.ok).toBe(false);
    if (!flat.ok) expect(flat.reason).toMatch(/zero spread/);
    expect(evalGaussianMixture1d({ x: [1, 2], iters: 10 }).ok).toBe(false);
    expect(evalGaussianMixture1d({ x: [1, 2, 3, Number.NaN], iters: 10 }).ok).toBe(false);
    expect(evalGaussianMixture1d({ x: [1, 2, 3, 4, 5, 6], iters: 0 }).ok).toBe(false);
  });

  it("reports exact agreement and exact anti-agreement in adjusted Rand", () => {
    const same = evalAdjustedRandIndex({ a: [0, 0, 1, 1], b: [0, 0, 1, 1] });
    expect(same.ok).toBe(true);
    if (same.ok) expect(same.data.adjustedRand).toBeCloseTo(1, 12);

    const relabelled = evalAdjustedRandIndex({ a: [5, 5, 7, 7], b: [0, 0, 1, 1] });
    expect(relabelled.ok).toBe(true);
    if (relabelled.ok) expect(relabelled.data.adjustedRand).toBeCloseTo(1, 12);

    const opposed = evalAdjustedRandIndex({ a: [0, 0, 1, 1], b: [0, 1, 0, 1] });
    expect(opposed.ok).toBe(true);
    if (opposed.ok) expect(opposed.data.adjustedRand).toBeCloseTo(-0.5, 12);
  });

  it("fail-closes on mismatched, singleton, and negative clusterings", () => {
    expect(evalAdjustedRandIndex({ a: [0, 0, 1], b: [0, 1] }).ok).toBe(false);
    expect(evalAdjustedRandIndex({ a: [0], b: [0] }).ok).toBe(false);
    expect(evalAdjustedRandIndex({ a: [0, -1], b: [0, 1] }).ok).toBe(false);
  });
});

// ─── 2112-07002 E[max] duel optimizer ─────────────────────────────────────────

describe("props-metrics emax duel optimizer", () => {
  it("matches the analytic E[max] of two iid standard normals", () => {
    const r = evalExpectedMax2({ mu1: 0, mu2: 0, s1: 1, s2: 1, rho: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1/sqrt(pi) = 0.5641895835477563
    expect(r.data.expectedMax).toBeCloseTo(0.5641896, 6);
  });

  it("collapses to the larger mean when the gap dwarfs the spread", () => {
    const r = evalExpectedMax2({ mu1: 10, mu2: 0, s1: 1, s2: 1, rho: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.expectedMax).toBeCloseTo(10, 9);
    expect(r.data.expectedMax).toBeGreaterThanOrEqual(10);
  });

  it("fail-closes on a non-positive sigma, an out-of-range rho, and a non-finite mean", () => {
    expect(evalExpectedMax2({ mu1: 1, mu2: 0, s1: 0, s2: 1, rho: 0 }).ok).toBe(false);
    expect(evalExpectedMax2({ mu1: 1, mu2: 0, s1: 1, s2: 1, rho: 1.5 }).ok).toBe(false);
    expect(
      evalExpectedMax2({ mu1: Number.NaN, mu2: 0, s1: 1, s2: 1, rho: 0 }).ok,
    ).toBe(false);
  });

  it("greedily picks the highest mean then the best-correlated partner", () => {
    const r = evalEmaxPortfolioGreedy({
      ids: ["a", "b", "c", "d"],
      mus: [30, 28, 12, 10],
      sigmas: [6, 7, 4, 5],
      rhos: [
        [1, 0.3, 0.2, 0.1],
        [0.3, 1, 0.25, 0.15],
        [0.2, 0.25, 1, 0.2],
        [0.1, 0.15, 0.2, 1],
      ],
      k: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.chosen).toEqual([0, 1]);
    expect(r.data.chosenIds).toEqual(["a", "b"]);
    expect(r.data.chosenMeanTotal).toBe(58);
    expect(r.data.chosenMeanAverage).toBe(29);
  });

  it("fail-closes on a non-square correlation matrix, a zero sigma, and an oversized k", () => {
    const base = {
      ids: ["a", "b"],
      mus: [10, 9],
      sigmas: [2, 3],
      rhos: [
        [1, 0.2],
        [0.2, 1],
      ],
    };
    expect(evalEmaxPortfolioGreedy({ ...base, k: 2 }).ok).toBe(true);
    expect(
      evalEmaxPortfolioGreedy({ ...base, rhos: [[1, 0.2]], k: 1 }).ok,
    ).toBe(false);
    expect(evalEmaxPortfolioGreedy({ ...base, sigmas: [0, 3], k: 1 }).ok).toBe(false);
    expect(evalEmaxPortfolioGreedy({ ...base, k: 3 }).ok).toBe(false);
    expect(evalEmaxPortfolioGreedy({ ...base, ids: ["a"], k: 1 }).ok).toBe(false);
    expect(
      evalEmaxPortfolioGreedy({
        ...base,
        rhos: [
          [1, 1.4],
          [1.4, 1],
        ],
        k: 1,
      }).ok,
    ).toBe(false);
  });
});

// ─── metrics/core: metric residual rollup ─────────────────────────────────────

const CLEAN_SOURCE_POLICY = [
  { sourceId: "nflverse", status: "allowed" as const, allowedForModeling: true },
];

const BLOCKED_SOURCE_POLICY = [
  { sourceId: "nflverse", status: "blocked" as const, allowedForModeling: true },
];

function residualRows(
  sourcePolicy: readonly { sourceId: string; status: "allowed" | "blocked"; allowedForModeling: boolean }[],
): MetricResidualPlayInput[] {
  return [
    { actualValue: 2, expectedValue: 1, metricId: "yac-creation-gse", playerId: "p1", season: 2026, sourcePolicy },
    { actualValue: -0.5, expectedValue: 1, metricId: "yac-creation-gse", playerId: "p1", season: 2026, sourcePolicy },
    { actualValue: 3, expectedValue: 1, metricId: "yac-creation-gse", playerId: "p1", season: 2026, sourcePolicy },
    { actualValue: 0.5, expectedValue: 1, metricId: "yac-creation-gse", playerId: "p1", season: 2026, sourcePolicy },
  ];
}

describe("props-metrics metric residual rollup", () => {
  it("rolls per-play residuals into a player-season rollup", () => {
    const r = evalMetricResidualRollups({ rows: residualRows(CLEAN_SOURCE_POLICY) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.status).toBe("SHADOW");
    expect(r.data.exposure).toBe("INTERNAL");
    expect(r.data.confidenceIsProbability).toBe(false);
    expect(r.data.allAllowedForModeling).toBe(true);
    expect(r.data.keys).toEqual(["yac-creation-gse:p1:2026"]);
    expect(r.data.rollups).toHaveLength(1);

    const rollup = r.data.rollups[0];
    expect(rollup?.sampleSize).toBe(4);
    expect(rollup?.actualTotal).toBe(5);
    expect(rollup?.expectedTotal).toBe(4);
    expect(rollup?.residualTotal).toBe(1);
    expect(rollup?.residualPerPlay).toBe(0.25);
    // Default creation index is 50 + 4 * residual, averaged over the four plays.
    expect(rollup?.creationIndexMean).toBe(51);
    // 45 default row confidence + 0.5 sample lift - 28 HIGH-uncertainty penalty.
    expect(rollup?.confidenceScore).toBe(17.5);
    expect(rollup?.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_OUTCOME_CERTAINTY");
    expect(rollup?.uncertaintyBand).toBe("HIGH");
    expect(rollup?.sourceValidation.allowed).toBe(true);
  });

  it("fails the source-policy gate closed and never reports a usable confidence", () => {
    const r = evalMetricResidualRollups({ rows: residualRows(BLOCKED_SOURCE_POLICY) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.allAllowedForModeling).toBe(false);
    const rollup = r.data.rollups[0];
    expect(rollup?.sourceValidation.allowed).toBe(false);
    expect(rollup?.sourceValidation.status).toBe("FAIL_CLOSED");
    // 45 + 0.5 - 28 - 30 source penalty clamps to the floor.
    expect(rollup?.confidenceScore).toBe(0);
    expect(rollup?.status).toBe("SHADOW");
  });

  it("groups two players into two rollups and fail-closes on bad rows", () => {
    const twoPlayers: MetricResidualPlayInput[] = [
      ...residualRows(CLEAN_SOURCE_POLICY),
      {
        actualValue: 4,
        expectedValue: 1,
        metricId: "rush-over-expected-gse",
        playerId: "p2",
        season: 2026,
        sourcePolicy: CLEAN_SOURCE_POLICY,
      },
    ];
    const grouped = evalMetricResidualRollups({ rows: twoPlayers });
    expect(grouped.ok).toBe(true);
    if (grouped.ok) {
      expect(grouped.data.rollups).toHaveLength(2);
      expect(grouped.data.keys).toEqual(["rush-over-expected-gse:p2:2026", "yac-creation-gse:p1:2026"]);
    }

    expect(evalMetricResidualRollups({ rows: [] }).ok).toBe(false);
    expect(
      evalMetricResidualRollups({
        rows: [
          {
            actualValue: 1,
            expectedValue: 0,
            metricId: "not-a-metric" as "yac-creation-gse",
            playerId: "p1",
            season: 2026,
            sourcePolicy: CLEAN_SOURCE_POLICY,
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      evalMetricResidualRollups({
        rows: [
          {
            actualValue: 1,
            expectedValue: 0,
            metricId: "yac-creation-gse",
            playerId: "p1",
            season: 2026,
            sourcePolicy: [],
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      evalMetricResidualRollups({
        rows: [
          {
            actualValue: Number.NaN,
            expectedValue: 0,
            metricId: "yac-creation-gse",
            playerId: "p1",
            season: 2026,
            sourcePolicy: CLEAN_SOURCE_POLICY,
          },
        ],
      }).ok,
    ).toBe(false);
  });
});

// ─── metrics/core: empirical-Bayes shrinkage ───────────────────────────────────

describe("props-metrics empirical-Bayes shrinkage", () => {
  it("pulls an observation toward the prior by the evidence weight", () => {
    const r = evalEmpiricalBayesShrink({
      observed: 0.6,
      prior: 0.5,
      sampleSize: 10,
      priorStrength: 30,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (10 * 0.6 + 30 * 0.5) / 40 = 0.525
    expect(r.data.shrunk).toBeCloseTo(0.525, 6);
    expect(r.data.weightOnObserved).toBeCloseTo(0.25, 12);
    expect(r.data.weightOnPrior).toBeCloseTo(0.75, 12);
  });

  it("converges to the observation as evidence accumulates", () => {
    const thin = evalEmpiricalBayesShrink({
      observed: 0.8,
      prior: 0.4,
      sampleSize: 1,
      priorStrength: 99,
    });
    const thick = evalEmpiricalBayesShrink({
      observed: 0.8,
      prior: 0.4,
      sampleSize: 999,
      priorStrength: 1,
    });
    expect(thin.ok && thick.ok).toBe(true);
    if (!thin.ok || !thick.ok) return;
    expect(thin.data.shrunk).toBeLessThan(thick.data.shrunk);
    expect(thick.data.shrunk).toBeCloseTo(0.8, 3);
  });

  it("fail-closes when there is no evidence and no prior mass", () => {
    const r = evalEmpiricalBayesShrink({
      observed: 0.6,
      prior: 0.5,
      sampleSize: 0,
      priorStrength: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no evidence and no prior mass/);
    expect(
      evalEmpiricalBayesShrink({ observed: 0.6, prior: 0.5, sampleSize: -1, priorStrength: 3 }).ok,
    ).toBe(false);
  });

  it("shrinks a probability and refuses to launder an out-of-range reading", () => {
    const r = evalShrinkProbability({
      observed: 0.8,
      prior: 0.5,
      sampleSize: 4,
      priorStrength: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (4 * 0.8 + 4 * 0.5) / 8 = 0.65
    expect(r.data.shrunk).toBeCloseTo(0.65, 6);
    expect(r.data.shrunk).toBeGreaterThanOrEqual(0);
    expect(r.data.shrunk).toBeLessThanOrEqual(1);

    const overRange = evalShrinkProbability({
      observed: 1.4,
      prior: 0.5,
      sampleSize: 4,
      priorStrength: 4,
    });
    expect(overRange.ok).toBe(false);
    if (!overRange.ok) expect(overRange.reason).toMatch(/silently clamp/);
    expect(
      evalShrinkProbability({ observed: 0.5, prior: -0.2, sampleSize: 4, priorStrength: 4 }).ok,
    ).toBe(false);
  });

  it("shrinks a weighted mean and rejects the non-finite-entry trap", () => {
    const r = evalShrinkWeightedMean({
      entries: [
        { value: 0.7, weight: 2 },
        { value: 0.5, weight: 2 },
      ],
      prior: 0.5,
      priorStrength: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // observed = 0.6 on 4 units of weight; (4*0.6 + 4*0.5)/8 = 0.55
    expect(r.data.shrunk).toBeCloseTo(0.55, 6);
    expect(r.data.sampleSize).toBe(4);

    // A non-finite value would be dropped by weightedMean but still counted by
    // shrinkWeightedMean's sample size, so the bridge refuses it outright.
    const nonFinite = evalShrinkWeightedMean({
      entries: [
        { value: Number.NaN, weight: 2 },
        { value: 0.5, weight: 2 },
      ],
      prior: 0.5,
      priorStrength: 4,
    });
    expect(nonFinite.ok).toBe(false);
    if (!nonFinite.ok) expect(nonFinite.reason).toMatch(/weightedMean drops non-finite values/);

    expect(
      evalShrinkWeightedMean({ entries: [{ value: 0.5, weight: 0 }], prior: 0.5, priorStrength: 1 }).ok,
    ).toBe(false);
    expect(evalShrinkWeightedMean({ entries: [], prior: 0.5, priorStrength: 1 }).ok).toBe(false);
  });
});
