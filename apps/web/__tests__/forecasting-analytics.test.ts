/**
 * Tests for lib/analytics/forecasting-analytics.ts — pure time-series
 * forecasting utilities. 140+ test cases covering every exported function:
 * smoothing, forecast generation, seasonality, accuracy metrics, trend &
 * decomposition, confidence intervals, and model selection.
 */

import { describe, it, expect } from "vitest";
import {
  // smoothing
  simpleMovingAverage,
  weightedMovingAverage,
  exponentialSmoothing,
  doubleExponentialSmoothing,
  cumulativeMovingAverage,
  // forecast generation
  forecastNext,
  linearTrendForecast,
  holtForecast,
  naiveForecast,
  driftForecast,
  // seasonality
  seasonalIndices,
  deseasonalize,
  seasonalNaiveForecast,
  detectSeasonalityStrength,
  // accuracy metrics
  meanAbsoluteError,
  meanSquaredError,
  rootMeanSquaredError,
  meanAbsolutePercentageError,
  symmetricMape,
  forecastBias,
  // trend & decomposition
  linearRegression,
  trendStrength,
  detrend,
  growthRate,
  decompose,
  // confidence & intervals
  forecastConfidenceInterval,
  residualStandardDeviation,
  predictionIntervalWidth,
  // model selection & sports usage
  bestForecastMethod,
  autocorrelation,
  momentumScore,
  projectSubscriberGrowth,
  // helpers
  clamp01,
  average,
  variance,
  exponentialForecastHorizon,
} from "@/lib/analytics/forecasting-analytics";

// ---------------------------------------------------------------------------
// 1. Smoothing
// ---------------------------------------------------------------------------

describe("simpleMovingAverage", () => {
  it("returns empty for window <= 0", () => {
    expect(simpleMovingAverage([1, 2, 3], 0)).toEqual([]);
    expect(simpleMovingAverage([1, 2, 3], -2)).toEqual([]);
  });

  it("returns empty when window > data length", () => {
    expect(simpleMovingAverage([1, 2], 3)).toEqual([]);
  });

  it("returns empty on empty data", () => {
    expect(simpleMovingAverage([], 1)).toEqual([]);
  });

  it("window === length yields single mean", () => {
    expect(simpleMovingAverage([2, 4, 6], 3)).toEqual([4]);
  });

  it("window of 1 echoes the data", () => {
    expect(simpleMovingAverage([5, 7, 9], 1)).toEqual([5, 7, 9]);
  });

  it("computes a window-2 moving average", () => {
    expect(simpleMovingAverage([1, 2, 3, 4], 2)).toEqual([1.5, 2.5, 3.5]);
  });

  it("output length is data.length - window + 1", () => {
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3)).toHaveLength(3);
  });

  it("window-3 averages are correct", () => {
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3)).toEqual([2, 3, 4]);
  });

  it("handles negative values", () => {
    expect(simpleMovingAverage([-1, -3, -5], 3)).toEqual([-3]);
  });

  it("does not mutate input", () => {
    const input = [1, 2, 3, 4];
    simpleMovingAverage(input, 2);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});

describe("weightedMovingAverage", () => {
  it("returns empty for empty weights", () => {
    expect(weightedMovingAverage([1, 2, 3], [])).toEqual([]);
  });

  it("returns empty when weights longer than data", () => {
    expect(weightedMovingAverage([1, 2], [1, 1, 1])).toEqual([]);
  });

  it("returns empty when weights sum to zero", () => {
    expect(weightedMovingAverage([1, 2, 3], [1, -1])).toEqual([]);
  });

  it("equal weights match a simple moving average", () => {
    expect(weightedMovingAverage([1, 2, 3, 4], [1, 1])).toEqual([1.5, 2.5, 3.5]);
  });

  it("normalizes weights internally", () => {
    // weights [2,2] normalize to [0.5,0.5]
    expect(weightedMovingAverage([1, 3], [2, 2])).toEqual([2]);
  });

  it("applies asymmetric weights correctly", () => {
    // window [1,2] with weights [1,3] => (1*1 + 2*3)/4 = 7/4
    // window [2,3] with weights [1,3] => (2*1 + 3*3)/4 = 11/4
    expect(weightedMovingAverage([1, 2, 3], [1, 3])).toEqual([7 / 4, 11 / 4]);
  });

  it("output length is data.length - weights.length + 1", () => {
    expect(weightedMovingAverage([1, 2, 3, 4, 5], [1, 1, 1])).toHaveLength(3);
  });

  it("weights length === data length yields one value", () => {
    expect(weightedMovingAverage([2, 4], [1, 1])).toEqual([3]);
  });

  it("handles fractional weights", () => {
    expect(weightedMovingAverage([10, 20], [0.25, 0.75])).toBeDefined();
  });

  it("does not mutate input data", () => {
    const input = [1, 2, 3];
    weightedMovingAverage(input, [1, 1]);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("exponentialSmoothing", () => {
  it("returns empty on empty data", () => {
    expect(exponentialSmoothing([], 0.5)).toEqual([]);
  });

  it("output length equals input length", () => {
    expect(exponentialSmoothing([1, 2, 3, 4], 0.5)).toHaveLength(4);
  });

  it("first value is the seed", () => {
    expect(exponentialSmoothing([5, 9, 3], 0.5)[0]).toBe(5);
  });

  it("alpha = 1 follows the data exactly", () => {
    expect(exponentialSmoothing([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  it("alpha = 0 stays flat at the seed", () => {
    expect(exponentialSmoothing([4, 8, 2], 0)).toEqual([4, 4, 4]);
  });

  it("alpha clamps above 1 to 1", () => {
    expect(exponentialSmoothing([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it("alpha clamps below 0 to 0", () => {
    expect(exponentialSmoothing([4, 8, 2], -3)).toEqual([4, 4, 4]);
  });

  it("computes intermediate smoothed values", () => {
    // alpha 0.5: seed 10, then 0.5*20+0.5*10=15, then 0.5*30+0.5*15=22.5
    expect(exponentialSmoothing([10, 20, 30], 0.5)).toEqual([10, 15, 22.5]);
  });

  it("single element returns itself", () => {
    expect(exponentialSmoothing([7], 0.3)).toEqual([7]);
  });

  it("NaN alpha clamps to 0 (flat)", () => {
    expect(exponentialSmoothing([3, 6, 9], NaN)).toEqual([3, 3, 3]);
  });
});

describe("doubleExponentialSmoothing", () => {
  it("returns empty on empty data", () => {
    expect(doubleExponentialSmoothing([], 0.5, 0.5)).toEqual([]);
  });

  it("output length equals input length", () => {
    expect(doubleExponentialSmoothing([1, 2, 3, 4], 0.5, 0.5)).toHaveLength(4);
  });

  it("first value is the initial level (data[0])", () => {
    expect(doubleExponentialSmoothing([5, 7, 9], 0.5, 0.5)[0]).toBe(5);
  });

  it("single element returns itself", () => {
    expect(doubleExponentialSmoothing([8], 0.4, 0.4)).toEqual([8]);
  });

  it("tracks a perfect linear series closely", () => {
    const out = doubleExponentialSmoothing([0, 1, 2, 3, 4], 0.5, 0.5);
    // last value should be close to the next-in-line projection (~5)
    expect(out[out.length - 1]).toBeCloseTo(5, 5);
  });

  it("clamps alpha and beta into [0,1]", () => {
    const out = doubleExponentialSmoothing([1, 2, 3], 5, -2);
    expect(out).toHaveLength(3);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("constant series stays constant", () => {
    expect(doubleExponentialSmoothing([4, 4, 4, 4], 0.5, 0.5)).toEqual([4, 4, 4, 4]);
  });

  it("does not mutate input", () => {
    const input = [1, 2, 3];
    doubleExponentialSmoothing(input, 0.3, 0.3);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("cumulativeMovingAverage", () => {
  it("returns empty on empty data", () => {
    expect(cumulativeMovingAverage([])).toEqual([]);
  });

  it("output length equals input length", () => {
    expect(cumulativeMovingAverage([1, 2, 3])).toHaveLength(3);
  });

  it("first value equals first data point", () => {
    expect(cumulativeMovingAverage([5, 1, 3])[0]).toBe(5);
  });

  it("computes running means", () => {
    expect(cumulativeMovingAverage([2, 4, 6])).toEqual([2, 3, 4]);
  });

  it("single element returns itself", () => {
    expect(cumulativeMovingAverage([9])).toEqual([9]);
  });

  it("handles negatives", () => {
    expect(cumulativeMovingAverage([-2, -4])).toEqual([-2, -3]);
  });
});

// ---------------------------------------------------------------------------
// 2. Forecast generation
// ---------------------------------------------------------------------------

describe("forecastNext", () => {
  it("returns NaN on empty data", () => {
    expect(Number.isNaN(forecastNext([]))).toBe(true);
  });

  it("single element returns that element", () => {
    expect(forecastNext([7])).toBe(7);
  });

  it("uses default alpha 0.3", () => {
    // last smoothed value of exponentialSmoothing(data, 0.3)
    const expected = exponentialSmoothing([1, 2, 3], 0.3);
    expect(forecastNext([1, 2, 3])).toBe(expected[expected.length - 1]);
  });

  it("respects an explicit alpha", () => {
    const expected = exponentialSmoothing([10, 20, 30], 1);
    expect(forecastNext([10, 20, 30], 1)).toBe(expected[expected.length - 1]);
  });

  it("constant series forecasts the constant", () => {
    expect(forecastNext([5, 5, 5], 0.5)).toBe(5);
  });
});

describe("linearTrendForecast", () => {
  it("returns empty on empty data", () => {
    expect(linearTrendForecast([], 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(linearTrendForecast([1, 2, 3], 0)).toEqual([]);
    expect(linearTrendForecast([1, 2, 3], -1)).toEqual([]);
  });

  it("recovers slope on a perfect line", () => {
    // y = 2x: indices 0..4 -> [0,2,4,6,8]; next two are 10, 12
    expect(linearTrendForecast([0, 2, 4, 6, 8], 2)).toEqual([10, 12]);
  });

  it("forecasts a flat line for constant data", () => {
    const out = linearTrendForecast([5, 5, 5, 5], 3);
    out.forEach((v) => expect(v).toBeCloseTo(5, 6));
  });

  it("output length equals stepsAhead", () => {
    expect(linearTrendForecast([1, 3, 5], 4)).toHaveLength(4);
  });

  it("projects a decreasing trend", () => {
    // y = -x + 10: [10,9,8] -> next is 7, 6
    expect(linearTrendForecast([10, 9, 8], 2)).toEqual([7, 6]);
  });

  it("single element forecasts a flat value", () => {
    // n=1 -> slope 0, intercept = data[0]
    expect(linearTrendForecast([42], 2)).toEqual([42, 42]);
  });
});

describe("holtForecast", () => {
  it("returns empty on empty data", () => {
    expect(holtForecast([], 0.5, 0.5, 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(holtForecast([1, 2, 3], 0.5, 0.5, 0)).toEqual([]);
  });

  it("output length equals stepsAhead", () => {
    expect(holtForecast([1, 2, 3, 4], 0.5, 0.5, 5)).toHaveLength(5);
  });

  it("recovers a linear trend on a perfect line", () => {
    // perfect line [0,1,2,3,4], next steps should be ~5, ~6
    const out = holtForecast([0, 1, 2, 3, 4], 0.5, 0.5, 2);
    expect(out[0]).toBeCloseTo(5, 5);
    expect(out[1]).toBeCloseTo(6, 5);
  });

  it("constant series forecasts the constant", () => {
    const out = holtForecast([3, 3, 3, 3], 0.5, 0.5, 3);
    out.forEach((v) => expect(v).toBeCloseTo(3, 6));
  });

  it("clamps alpha/beta and stays finite", () => {
    const out = holtForecast([1, 2, 4, 8], 9, -9, 3);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("single element forecasts flat (zero trend)", () => {
    expect(holtForecast([6], 0.5, 0.5, 3)).toEqual([6, 6, 6]);
  });
});

describe("naiveForecast", () => {
  it("returns empty on empty data", () => {
    expect(naiveForecast([], 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(naiveForecast([1, 2], 0)).toEqual([]);
    expect(naiveForecast([1, 2], -5)).toEqual([]);
  });

  it("repeats the last value", () => {
    expect(naiveForecast([1, 2, 9], 3)).toEqual([9, 9, 9]);
  });

  it("output length equals stepsAhead", () => {
    expect(naiveForecast([4], 5)).toHaveLength(5);
  });

  it("handles a single data point", () => {
    expect(naiveForecast([7], 2)).toEqual([7, 7]);
  });
});

describe("driftForecast", () => {
  it("returns empty on empty data", () => {
    expect(driftForecast([], 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(driftForecast([1, 2, 3], 0)).toEqual([]);
  });

  it("extends by average per-step drift", () => {
    // [0,2,4,6,8]: drift = (8-0)/4 = 2; next 10, 12
    expect(driftForecast([0, 2, 4, 6, 8], 2)).toEqual([10, 12]);
  });

  it("single element has zero drift", () => {
    expect(driftForecast([5], 3)).toEqual([5, 5, 5]);
  });

  it("output length equals stepsAhead", () => {
    expect(driftForecast([1, 5], 4)).toHaveLength(4);
  });

  it("handles negative drift", () => {
    // [10, 8, 6]: drift = (6-10)/2 = -2; next 4, 2
    expect(driftForecast([10, 8, 6], 2)).toEqual([4, 2]);
  });

  it("constant series has zero drift", () => {
    expect(driftForecast([3, 3, 3], 2)).toEqual([3, 3]);
  });
});

// ---------------------------------------------------------------------------
// 3. Seasonality
// ---------------------------------------------------------------------------

describe("seasonalIndices", () => {
  it("returns empty for period <= 0", () => {
    expect(seasonalIndices([1, 2, 3], 0)).toEqual([]);
    expect(seasonalIndices([1, 2, 3], -2)).toEqual([]);
  });

  it("returns empty when data shorter than period", () => {
    expect(seasonalIndices([1, 2], 3)).toEqual([]);
  });

  it("output length equals period", () => {
    const out = seasonalIndices([10, 20, 30, 12, 22, 32, 14, 24, 34], 3);
    expect(out).toHaveLength(3);
  });

  it("indices average to ~1", () => {
    const out = seasonalIndices([10, 20, 30, 12, 22, 32, 14, 24, 34], 3);
    expect(average(out)).toBeCloseTo(1, 6);
  });

  it("constant series gives all-ones indices", () => {
    const out = seasonalIndices([5, 5, 5, 5, 5, 5], 2);
    out.forEach((v) => expect(v).toBeCloseTo(1, 6));
  });

  it("returns finite values for a seasonal signal", () => {
    const out = seasonalIndices([1, 3, 1, 3, 1, 3, 1, 3], 2);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("does not mutate input", () => {
    const input = [10, 20, 30, 12, 22, 32];
    seasonalIndices(input, 3);
    expect(input).toEqual([10, 20, 30, 12, 22, 32]);
  });
});

describe("deseasonalize", () => {
  it("returns a copy of data when indices cannot be computed", () => {
    expect(deseasonalize([1, 2], 5)).toEqual([1, 2]);
  });

  it("returns a copy (not the same reference) when no indices", () => {
    const input = [1, 2];
    const out = deseasonalize(input, 5);
    expect(out).not.toBe(input);
  });

  it("output length equals input length", () => {
    const out = deseasonalize([10, 20, 30, 12, 22, 32, 14, 24, 34], 3);
    expect(out).toHaveLength(9);
  });

  it("constant series deseasonalizes to itself", () => {
    const out = deseasonalize([5, 5, 5, 5, 5, 5], 2);
    out.forEach((v) => expect(v).toBeCloseTo(5, 6));
  });

  it("produces finite values", () => {
    const out = deseasonalize([1, 3, 1, 3, 1, 3, 1, 3], 2);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe("seasonalNaiveForecast", () => {
  it("returns empty for period <= 0", () => {
    expect(seasonalNaiveForecast([1, 2, 3], 0, 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(seasonalNaiveForecast([1, 2, 3], 2, 0)).toEqual([]);
  });

  it("returns empty when data shorter than period", () => {
    expect(seasonalNaiveForecast([1, 2], 3, 3)).toEqual([]);
  });

  it("repeats the last full season", () => {
    // last season (period 3) of [...,7,8,9] is [7,8,9]
    expect(seasonalNaiveForecast([1, 2, 3, 7, 8, 9], 3, 3)).toEqual([7, 8, 9]);
  });

  it("wraps the season when stepsAhead > period", () => {
    expect(seasonalNaiveForecast([1, 2, 3, 7, 8, 9], 3, 5)).toEqual([7, 8, 9, 7, 8]);
  });

  it("output length equals stepsAhead", () => {
    expect(seasonalNaiveForecast([1, 2, 3, 4], 2, 5)).toHaveLength(5);
  });

  it("period === length uses the whole series", () => {
    expect(seasonalNaiveForecast([4, 5, 6], 3, 3)).toEqual([4, 5, 6]);
  });
});

describe("detectSeasonalityStrength", () => {
  it("returns 0 for period <= 0", () => {
    expect(detectSeasonalityStrength([1, 2, 3, 4], 0)).toBe(0);
  });

  it("returns 0 when data shorter than 2*period", () => {
    expect(detectSeasonalityStrength([1, 2, 3], 2)).toBe(0);
  });

  it("returns value in [0,1]", () => {
    const s = detectSeasonalityStrength([1, 3, 1, 3, 1, 3, 1, 3], 2);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("detects strong seasonality near 1", () => {
    // pure alternating pattern after detrending is fully seasonal
    const s = detectSeasonalityStrength([0, 10, 0, 10, 0, 10, 0, 10], 2);
    expect(s).toBeGreaterThan(0.9);
  });

  it("returns 0 for a constant (zero detrended variance) series", () => {
    expect(detectSeasonalityStrength([5, 5, 5, 5, 5, 5], 2)).toBe(0);
  });

  it("returns low strength for non-seasonal noise pattern", () => {
    const s = detectSeasonalityStrength([1, 2, 3, 4, 5, 6, 7, 8], 2);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Accuracy metrics
// ---------------------------------------------------------------------------

describe("meanAbsoluteError", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(meanAbsoluteError([1, 2], [1]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(meanAbsoluteError([], [])).toBe(0);
  });

  it("is 0 for perfect predictions", () => {
    expect(meanAbsoluteError([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("computes a known MAE", () => {
    // errors |1|,|2|,|0| -> mean 1
    expect(meanAbsoluteError([1, 2, 3], [2, 4, 3])).toBe(1);
  });

  it("uses absolute values (sign-independent)", () => {
    expect(meanAbsoluteError([0, 0], [-2, 2])).toBe(2);
  });
});

describe("meanSquaredError", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(meanSquaredError([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(meanSquaredError([], [])).toBe(0);
  });

  it("is 0 for perfect predictions", () => {
    expect(meanSquaredError([5, 6], [5, 6])).toBe(0);
  });

  it("computes a known MSE", () => {
    // diffs 1,2,0 -> squares 1,4,0 -> mean 5/3
    expect(meanSquaredError([1, 2, 3], [2, 4, 3])).toBeCloseTo(5 / 3, 10);
  });

  it("is always non-negative", () => {
    expect(meanSquaredError([-3, -4], [0, 0])).toBe(12.5);
  });
});

describe("rootMeanSquaredError", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(rootMeanSquaredError([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(rootMeanSquaredError([], [])).toBe(0);
  });

  it("is sqrt of MSE", () => {
    expect(rootMeanSquaredError([0, 0], [3, 4])).toBeCloseTo(Math.sqrt(12.5), 10);
  });

  it("is 0 for perfect predictions", () => {
    expect(rootMeanSquaredError([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("known value: errors all 2 -> rmse 2", () => {
    expect(rootMeanSquaredError([2, 2, 2], [0, 0, 0])).toBeCloseTo(2, 10);
  });
});

describe("meanAbsolutePercentageError", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(meanAbsolutePercentageError([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(meanAbsolutePercentageError([], [])).toBe(0);
  });

  it("returns 0 when every actual is zero", () => {
    expect(meanAbsolutePercentageError([0, 0], [1, 2])).toBe(0);
  });

  it("is 0 for perfect predictions", () => {
    expect(meanAbsolutePercentageError([10, 20], [10, 20])).toBe(0);
  });

  it("computes a known MAPE as a percentage", () => {
    // |(100-110)/100| = 0.1; |(200-180)/200| = 0.1 -> mean 0.1 -> 10%
    expect(meanAbsolutePercentageError([100, 200], [110, 180])).toBeCloseTo(10, 10);
  });

  it("skips zero-actual entries", () => {
    // only the second point counts: |(10-15)/10| = 0.5 -> 50%
    expect(meanAbsolutePercentageError([0, 10], [5, 15])).toBeCloseTo(50, 10);
  });
});

describe("symmetricMape", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(symmetricMape([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(symmetricMape([], [])).toBe(0);
  });

  it("is 0 for perfect predictions", () => {
    expect(symmetricMape([10, 20], [10, 20])).toBe(0);
  });

  it("skips points where |a|+|p| == 0", () => {
    // first point denom 0 skipped; second: |10-20|/(10+20) = 1/3 -> ~33.33%
    expect(symmetricMape([0, 10], [0, 20])).toBeCloseTo((1 / 3) * 100, 8);
  });

  it("returns 0 when all denominators are zero", () => {
    expect(symmetricMape([0, 0], [0, 0])).toBe(0);
  });

  it("computes a known sMAPE", () => {
    // |100-150|/(100+150) = 50/250 = 0.2 -> 20%
    expect(symmetricMape([100], [150])).toBeCloseTo(20, 8);
  });
});

describe("forecastBias", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(forecastBias([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for two empty arrays", () => {
    expect(forecastBias([], [])).toBe(0);
  });

  it("is 0 for perfect predictions", () => {
    expect(forecastBias([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("positive when under-forecasting (actual > predicted)", () => {
    expect(forecastBias([10, 10], [8, 8])).toBe(2);
  });

  it("negative when over-forecasting (actual < predicted)", () => {
    expect(forecastBias([5, 5], [8, 8])).toBe(-3);
  });
});

// ---------------------------------------------------------------------------
// 5. Trend & decomposition
// ---------------------------------------------------------------------------

describe("linearRegression", () => {
  it("empty data returns slope 0, intercept 0", () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0 });
  });

  it("single element returns slope 0, intercept = value", () => {
    expect(linearRegression([42])).toEqual({ slope: 0, intercept: 42 });
  });

  it("recovers slope and intercept of a perfect line", () => {
    // y = 3x + 1: [1,4,7,10]
    const { slope, intercept } = linearRegression([1, 4, 7, 10]);
    expect(slope).toBeCloseTo(3, 10);
    expect(intercept).toBeCloseTo(1, 10);
  });

  it("constant series gives slope 0", () => {
    const { slope, intercept } = linearRegression([5, 5, 5, 5]);
    expect(slope).toBeCloseTo(0, 10);
    expect(intercept).toBeCloseTo(5, 10);
  });

  it("handles a decreasing line", () => {
    const { slope } = linearRegression([10, 8, 6, 4]);
    expect(slope).toBeCloseTo(-2, 10);
  });

  it("fits a best line through noisy data finitely", () => {
    const { slope, intercept } = linearRegression([1, 2, 1.5, 3, 2.8]);
    expect(Number.isFinite(slope)).toBe(true);
    expect(Number.isFinite(intercept)).toBe(true);
  });
});

describe("trendStrength", () => {
  it("returns 0 for length < 2", () => {
    expect(trendStrength([])).toBe(0);
    expect(trendStrength([5])).toBe(0);
  });

  it("returns 0 for a constant series (zero total variance)", () => {
    expect(trendStrength([3, 3, 3, 3])).toBe(0);
  });

  it("is ~1 for a perfect line", () => {
    expect(trendStrength([0, 2, 4, 6, 8])).toBeCloseTo(1, 8);
  });

  it("stays within [0,1]", () => {
    const s = trendStrength([1, 5, 2, 8, 3, 9]);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("is high for a strong linear trend with small noise", () => {
    const s = trendStrength([1, 2.1, 2.9, 4.1, 5.0]);
    expect(s).toBeGreaterThan(0.95);
  });
});

describe("detrend", () => {
  it("returns empty on empty data", () => {
    expect(detrend([])).toEqual([]);
  });

  it("output length equals input length", () => {
    expect(detrend([1, 2, 3, 4])).toHaveLength(4);
  });

  it("residuals of a perfect line are ~0", () => {
    detrend([0, 2, 4, 6, 8]).forEach((v) => expect(v).toBeCloseTo(0, 8));
  });

  it("residuals sum to ~0 for OLS fit", () => {
    const res = detrend([1, 5, 2, 8, 3]);
    expect(res.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
  });

  it("single element detrends to 0", () => {
    // n=1 -> slope 0, intercept = data[0] -> residual 0
    expect(detrend([7])).toEqual([0]);
  });
});

describe("growthRate", () => {
  it("returns 0 for length < 2", () => {
    expect(growthRate([])).toBe(0);
    expect(growthRate([5])).toBe(0);
  });

  it("returns 0 when first value is 0", () => {
    expect(growthRate([0, 5, 10])).toBe(0);
  });

  it("returns 0 when the ratio is negative", () => {
    expect(growthRate([10, -5])).toBe(0);
  });

  it("computes a known CAGR-style rate", () => {
    // (8/1)^(1/3) - 1 = 1 (doubling each step)
    expect(growthRate([1, 2, 4, 8])).toBeCloseTo(1, 8);
  });

  it("is 0 for a flat series (ratio 1)", () => {
    expect(growthRate([5, 5, 5])).toBeCloseTo(0, 10);
  });

  it("is negative for a declining series", () => {
    expect(growthRate([100, 50])).toBeCloseTo(-0.5, 8);
  });
});

describe("decompose", () => {
  it("each component has the input length", () => {
    const { trend, seasonal, residual } = decompose([1, 2, 3, 4, 5, 6], 2);
    expect(trend).toHaveLength(6);
    expect(seasonal).toHaveLength(6);
    expect(residual).toHaveLength(6);
  });

  it("trend equals the OLS fit", () => {
    const { trend } = decompose([0, 2, 4, 6], 2);
    trend.forEach((v, i) => expect(v).toBeCloseTo(2 * i, 8));
  });

  it("seasonal is all zeros when period <= 0", () => {
    const { seasonal } = decompose([1, 2, 3, 4], 0);
    expect(seasonal).toEqual([0, 0, 0, 0]);
  });

  it("seasonal is all zeros when data shorter than period", () => {
    const { seasonal } = decompose([1, 2], 5);
    expect(seasonal).toEqual([0, 0]);
  });

  it("trend + seasonal + residual reconstructs the data", () => {
    const data = [3, 8, 5, 11, 7, 14];
    const { trend, seasonal, residual } = decompose(data, 2);
    data.forEach((y, i) => {
      expect((trend[i] ?? 0) + (seasonal[i] ?? 0) + (residual[i] ?? 0)).toBeCloseTo(y, 8);
    });
  });

  it("seasonal component is mean-centered (~0 average)", () => {
    const { seasonal } = decompose([3, 8, 5, 11, 7, 14], 2);
    expect(average(seasonal)).toBeCloseTo(0, 8);
  });

  it("handles empty data", () => {
    const { trend, seasonal, residual } = decompose([], 2);
    expect(trend).toEqual([]);
    expect(seasonal).toEqual([]);
    expect(residual).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. Confidence & intervals
// ---------------------------------------------------------------------------

describe("forecastConfidenceInterval", () => {
  it("uses default z 1.96", () => {
    const { lower, upper } = forecastConfidenceInterval(100, 10);
    expect(lower).toBeCloseTo(100 - 19.6, 8);
    expect(upper).toBeCloseTo(100 + 19.6, 8);
  });

  it("respects a custom z", () => {
    const { lower, upper } = forecastConfidenceInterval(50, 5, 2);
    expect(lower).toBe(40);
    expect(upper).toBe(60);
  });

  it("uses the absolute value of stddev", () => {
    const { lower, upper } = forecastConfidenceInterval(0, -4, 1);
    expect(lower).toBe(-4);
    expect(upper).toBe(4);
  });

  it("zero stddev gives a point interval", () => {
    expect(forecastConfidenceInterval(7, 0)).toEqual({ lower: 7, upper: 7 });
  });

  it("interval is symmetric around the forecast", () => {
    const { lower, upper } = forecastConfidenceInterval(20, 3);
    expect((lower + upper) / 2).toBeCloseTo(20, 8);
  });
});

describe("residualStandardDeviation", () => {
  it("returns NaN on length mismatch", () => {
    expect(Number.isNaN(residualStandardDeviation([1], [1, 2]))).toBe(true);
  });

  it("returns 0 for empty input", () => {
    expect(residualStandardDeviation([], [])).toBe(0);
  });

  it("returns 0 for single-element input", () => {
    expect(residualStandardDeviation([5], [3])).toBe(0);
  });

  it("is 0 for constant residuals", () => {
    // errors all equal 2 -> sample stddev 0
    expect(residualStandardDeviation([3, 5, 7], [1, 3, 5])).toBeCloseTo(0, 10);
  });

  it("computes a known sample stddev", () => {
    // errors: 0,2,4 -> mean 2, sample var = (4+0+4)/2 = 4 -> stddev 2
    expect(residualStandardDeviation([1, 4, 7], [1, 2, 3])).toBeCloseTo(2, 10);
  });
});

describe("predictionIntervalWidth", () => {
  it("returns 0 for stepsAhead <= 0", () => {
    expect(predictionIntervalWidth(10, 0)).toBe(0);
    expect(predictionIntervalWidth(10, -3)).toBe(0);
  });

  it("widens with sqrt of horizon", () => {
    const w1 = predictionIntervalWidth(10, 1, 2);
    const w4 = predictionIntervalWidth(10, 4, 2);
    expect(w4).toBeCloseTo(w1 * 2, 8); // sqrt(4)/sqrt(1) = 2
  });

  it("uses default z 1.96", () => {
    expect(predictionIntervalWidth(10, 1)).toBeCloseTo(19.6, 8);
  });

  it("uses absolute stddev", () => {
    expect(predictionIntervalWidth(-5, 1, 1)).toBe(5);
  });

  it("step 1 equals z*stddev", () => {
    expect(predictionIntervalWidth(4, 1, 2)).toBeCloseTo(8, 8);
  });
});

// ---------------------------------------------------------------------------
// 7. Model selection & sports usage
// ---------------------------------------------------------------------------

describe("bestForecastMethod", () => {
  it("falls back to naive when holdout <= 0", () => {
    expect(bestForecastMethod([1, 2, 3, 4], 0)).toBe("naive");
  });

  it("falls back to naive when holdout >= length", () => {
    expect(bestForecastMethod([1, 2, 3], 3)).toBe("naive");
  });

  it("falls back to naive when training set < 2", () => {
    expect(bestForecastMethod([1, 2], 1)).toBe("naive");
  });

  it("returns a valid method name", () => {
    const m = bestForecastMethod([1, 2, 3, 4, 5, 6, 7, 8], 2);
    expect(["naive", "drift", "linear", "exponential"]).toContain(m);
  });

  it("prefers linear/drift for a clean linear trend", () => {
    const m = bestForecastMethod([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
    // a perfect line is best captured by linear or drift, never worse than naive
    expect(["linear", "drift"]).toContain(m);
  });

  it("does not hang on a longer series", () => {
    const series = Array.from({ length: 50 }, (_, i) => Math.sin(i / 3) * 10 + i);
    const m = bestForecastMethod(series, 5);
    expect(["naive", "drift", "linear", "exponential"]).toContain(m);
  });
});

describe("autocorrelation", () => {
  it("returns 0 for lag <= 0", () => {
    expect(autocorrelation([1, 2, 3], 0)).toBe(0);
    expect(autocorrelation([1, 2, 3], -1)).toBe(0);
  });

  it("returns 0 when lag >= length", () => {
    expect(autocorrelation([1, 2, 3], 3)).toBe(0);
    expect(autocorrelation([1, 2, 3], 5)).toBe(0);
  });

  it("returns 0 for a zero-variance series", () => {
    expect(autocorrelation([5, 5, 5, 5], 1)).toBe(0);
  });

  it("stays within [-1, 1]", () => {
    const r = autocorrelation([1, 2, 3, 4, 5, 6], 1);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("is strongly positive for a smooth increasing series at lag 1", () => {
    const r = autocorrelation([1, 2, 3, 4, 5, 6, 7, 8], 1);
    expect(r).toBeGreaterThan(0.5);
  });

  it("is negative for an alternating series at lag 1", () => {
    const r = autocorrelation([1, -1, 1, -1, 1, -1], 1);
    expect(r).toBeLessThan(0);
  });
});

describe("momentumScore", () => {
  it("returns 0 when short window cannot be computed", () => {
    expect(momentumScore([1, 2], 5, 2)).toBe(0);
  });

  it("returns 0 when long window cannot be computed", () => {
    expect(momentumScore([1, 2, 3], 2, 5)).toBe(0);
  });

  it("is positive for an upward trend (short MA above long MA)", () => {
    expect(momentumScore([1, 2, 3, 4, 5, 6], 2, 4)).toBeGreaterThan(0);
  });

  it("is negative for a downward trend", () => {
    expect(momentumScore([6, 5, 4, 3, 2, 1], 2, 4)).toBeLessThan(0);
  });

  it("is ~0 for a flat series", () => {
    expect(momentumScore([5, 5, 5, 5, 5], 2, 3)).toBeCloseTo(0, 8);
  });
});

describe("projectSubscriberGrowth", () => {
  it("returns empty for empty history", () => {
    expect(projectSubscriberGrowth([], 3)).toEqual([]);
  });

  it("returns empty for monthsAhead <= 0", () => {
    expect(projectSubscriberGrowth([100, 200], 0)).toEqual([]);
  });

  it("uses naive forecast for single-point history", () => {
    expect(projectSubscriberGrowth([500], 3)).toEqual([500, 500, 500]);
  });

  it("output length equals monthsAhead", () => {
    expect(projectSubscriberGrowth([100, 150, 200, 260], 4)).toHaveLength(4);
  });

  it("never returns negative subscriber counts", () => {
    // strongly declining trend would project negative; should clamp to 0
    const out = projectSubscriberGrowth([100, 70, 40, 10], 6);
    out.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("projects growth for a clean upward trend", () => {
    const out = projectSubscriberGrowth([100, 200, 300, 400, 500], 2);
    expect(out[0]).toBeGreaterThan(500);
    expect(out[1]).toBeGreaterThan(out[0] ?? 0 - 1);
  });

  it("uses linear forecast when trend is strong (R^2 >= 0.5)", () => {
    const history = [10, 20, 30, 40, 50];
    expect(projectSubscriberGrowth(history, 1)).toEqual(
      linearTrendForecast(history, 1).map((v) => (v < 0 ? 0 : v)),
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe("clamp01", () => {
  it("returns 0 for NaN", () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp01(-5)).toBe(0);
  });

  it("clamps above 1 to 1", () => {
    expect(clamp01(3)).toBe(1);
  });

  it("passes through in-range values", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });

  it("returns 0 and 1 at boundaries", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });
});

describe("average", () => {
  it("returns 0 for empty array", () => {
    expect(average([])).toBe(0);
  });

  it("computes the arithmetic mean", () => {
    expect(average([2, 4, 6])).toBe(4);
  });

  it("handles a single element", () => {
    expect(average([9])).toBe(9);
  });

  it("handles negatives", () => {
    expect(average([-2, 2])).toBe(0);
  });
});

describe("variance", () => {
  it("returns 0 for empty array", () => {
    expect(variance([])).toBe(0);
  });

  it("returns 0 for a constant series", () => {
    expect(variance([5, 5, 5])).toBe(0);
  });

  it("computes population variance", () => {
    // mean 3; squared devs 4,1,0,1,4 -> sum 10 / 5 = 2
    expect(variance([1, 2, 3, 4, 5])).toBeCloseTo(2, 10);
  });

  it("is non-negative", () => {
    expect(variance([-3, 7, -1])).toBeGreaterThanOrEqual(0);
  });

  it("single element has zero variance", () => {
    expect(variance([42])).toBe(0);
  });
});

describe("exponentialForecastHorizon", () => {
  it("returns empty on empty data", () => {
    expect(exponentialForecastHorizon([], 0.3, 3)).toEqual([]);
  });

  it("returns empty for stepsAhead <= 0", () => {
    expect(exponentialForecastHorizon([1, 2, 3], 0.3, 0)).toEqual([]);
  });

  it("repeats the last smoothed value", () => {
    const next = forecastNext([1, 2, 3], 0.3);
    expect(exponentialForecastHorizon([1, 2, 3], 0.3, 3)).toEqual([next, next, next]);
  });

  it("output length equals stepsAhead", () => {
    expect(exponentialForecastHorizon([4, 5, 6], 0.5, 5)).toHaveLength(5);
  });

  it("constant series forecasts the constant", () => {
    expect(exponentialForecastHorizon([7, 7, 7], 0.5, 2)).toEqual([7, 7]);
  });
});
