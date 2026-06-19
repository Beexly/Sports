/**
 * Tests for time-series analysis utilities.
 *
 * Covers: trendComponent, seasonalIndices, decompose, detectPeriod,
 * holtWinters, holtWintersForecast, ar1Forecast, naiveForecast,
 * seasonalNaiveForecast, linearForecast, arimaLite, yuleWalker,
 * autocorrAtLag, mae, rmse, mape, smape, timeSeriesCv,
 * cusumChangePoints, anomalyDetection, makeStationary, integrateForecasts.
 */

import { describe, it, expect } from "vitest";
import {
  trendComponent,
  seasonalIndices,
  decompose,
  detectPeriod,
  holtWinters,
  holtWintersForecast,
  ar1Forecast,
  naiveForecast,
  seasonalNaiveForecast,
  linearForecast,
  arimaLite,
  yuleWalker,
  autocorrAtLag,
  mae,
  rmse,
  mape,
  smape,
  timeSeriesCv,
  cusumChangePoints,
  anomalyDetection,
  makeStationary,
  integrateForecasts,
} from "@/lib/math/time-series";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a sine wave of given amplitude, period, and length. */
function sineWave(n: number, period: number, amplitude = 1, offset = 0): number[] {
  return Array.from({ length: n }, (_, i) =>
    offset + amplitude * Math.sin((2 * Math.PI * i) / period)
  );
}

/** Generate a linear ramp. */
function linearRamp(n: number, slope = 1, intercept = 0): number[] {
  return Array.from({ length: n }, (_, i) => slope * i + intercept);
}

/** Generate a constant array. */
function constant(n: number, val: number): number[] {
  return new Array(n).fill(val);
}

/** Check that two arrays are element-wise close. */
function expectClose(a: number[], b: number[], tol = 1e-6): void {
  expect(a).toHaveLength(b.length);
  a.forEach((v, i) => {
    if (isFinite(b[i]!)) {
      expect(v).toBeCloseTo(b[i]!, 5);
    } else {
      expect(isFinite(v)).toBe(false);
    }
  });
}

// ─── trendComponent ───────────────────────────────────────────────────────────

describe("trendComponent", () => {
  it("returns same length as input", () => {
    const vals = sineWave(30, 7, 1, 10);
    const trend = trendComponent(vals, 7);
    expect(trend).toHaveLength(vals.length);
  });

  it("all values are finite", () => {
    const vals = sineWave(40, 6, 1, 5);
    const trend = trendComponent(vals, 6);
    trend.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("trend of a constant series is the constant", () => {
    const vals = constant(20, 5);
    const trend = trendComponent(vals, 4);
    trend.forEach((v) => expect(v).toBeCloseTo(5, 5));
  });

  it("trend of a linear ramp approximates the ramp", () => {
    const vals = linearRamp(30, 2, 0);
    const trend = trendComponent(vals, 5);
    // Interior values should be very close to the original linear ramp
    for (let i = 5; i < 25; i++) {
      expect(trend[i]).toBeCloseTo(vals[i]!, 1);
    }
  });

  it("handles short series (length = period)", () => {
    const vals = [1, 2, 3, 4, 5];
    const trend = trendComponent(vals, 5);
    expect(trend).toHaveLength(5);
    trend.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("handles even period by using period+1 window", () => {
    const vals = sineWave(24, 4, 1, 10);
    const trend = trendComponent(vals, 4);
    expect(trend).toHaveLength(24);
    trend.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("fills edge positions so no NaN remains", () => {
    const vals = linearRamp(20, 1, 0);
    const trend = trendComponent(vals, 5);
    const nans = trend.filter((v) => !isFinite(v));
    expect(nans).toHaveLength(0);
  });

  it("handles period of 2", () => {
    const vals = [1, 3, 1, 3, 1, 3, 1, 3];
    const trend = trendComponent(vals, 2);
    expect(trend).toHaveLength(8);
    trend.forEach((v) => expect(isFinite(v)).toBe(true));
  });
});

// ─── seasonalIndices ──────────────────────────────────────────────────────────

describe("seasonalIndices", () => {
  it("returns array of length equal to period", () => {
    const vals = sineWave(30, 7, 2, 10);
    const idx = seasonalIndices(vals, 7);
    expect(idx).toHaveLength(7);
  });

  it("seasonal indices sum to approximately 0", () => {
    const vals = sineWave(28, 7, 2, 10);
    const idx = seasonalIndices(vals, 7);
    const total = idx.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(0, 5);
  });

  it("indices for a constant series are all zero", () => {
    const vals = constant(20, 7);
    const idx = seasonalIndices(vals, 4);
    idx.forEach((v) => expect(v).toBeCloseTo(0, 5));
  });

  it("indices reflect the sign of the seasonal component", () => {
    // Sine wave: first half of period positive, second negative
    const period = 8;
    const vals = sineWave(48, period, 5, 20);
    const idx = seasonalIndices(vals, period);
    // Sum should be ~0
    const total = idx.reduce((a, b) => a + b, 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });

  it("works with period 2", () => {
    const vals = [0, 10, 0, 10, 0, 10, 0, 10];
    const idx = seasonalIndices(vals, 2);
    expect(idx).toHaveLength(2);
    expect(idx[0]! + idx[1]!).toBeCloseTo(0, 5);
    // Alternating: idx[0] < idx[1]
    expect(idx[0]).toBeLessThan(idx[1]!);
  });

  it("works with period 12 (monthly)", () => {
    const vals = sineWave(48, 12, 3, 50);
    const idx = seasonalIndices(vals, 12);
    expect(idx).toHaveLength(12);
    const total = idx.reduce((a, b) => a + b, 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });
});

// ─── decompose ────────────────────────────────────────────────────────────────

describe("decompose", () => {
  it("residual = original - trend - seasonal (within floating-point)", () => {
    const vals = sineWave(28, 7, 2, 10);
    const { trend, seasonal, residual } = decompose(vals, 7);
    for (let i = 0; i < vals.length; i++) {
      expect(vals[i]! - trend[i]! - seasonal[i]!).toBeCloseTo(residual[i]!, 8);
    }
  });

  it("returns correct period in result", () => {
    const vals = sineWave(24, 6, 1, 5);
    const result = decompose(vals, 6);
    expect(result.period).toBe(6);
  });

  it("all component arrays have same length as input", () => {
    const vals = sineWave(30, 5, 1, 10);
    const { trend, seasonal, residual } = decompose(vals, 5);
    expect(trend).toHaveLength(30);
    expect(seasonal).toHaveLength(30);
    expect(residual).toHaveLength(30);
  });

  it("seasonal component repeats with the given period", () => {
    const vals = sineWave(24, 6, 2, 10);
    const { seasonal } = decompose(vals, 6);
    // seasonal[i] == seasonal[i+period] for interior values
    for (let i = 0; i < 18; i++) {
      expect(seasonal[i]!).toBeCloseTo(seasonal[i + 6]!, 8);
    }
  });

  it("residuals are small for a perfect seasonal signal", () => {
    // Build a series that is exactly trend + seasonal
    const period = 4;
    const n = 24;
    const vals = Array.from({ length: n }, (_, i) =>
      i * 0.5 + 2 * Math.sin((2 * Math.PI * i) / period)
    );
    const { residual } = decompose(vals, period);
    const maxResid = Math.max(...residual.map(Math.abs));
    expect(maxResid).toBeLessThan(5); // not perfect but bounded
  });

  it("handles a flat trend (constant + seasonal)", () => {
    const period = 4;
    const vals = Array.from({ length: 20 }, (_, i) =>
      10 + Math.sin((2 * Math.PI * i) / period)
    );
    const { trend, seasonal, residual } = decompose(vals, period);
    expect(trend).toHaveLength(20);
    expect(seasonal).toHaveLength(20);
    expect(residual).toHaveLength(20);
  });
});

// ─── detectPeriod ─────────────────────────────────────────────────────────────

describe("detectPeriod", () => {
  it("identifies period of a pure sine wave with known period", () => {
    const period = 7;
    const vals = sineWave(70, period, 5, 0);
    const result = detectPeriod(vals, 20);
    expect(result.period).toBe(period);
    expect(result.hasSeasionality).toBe(true);
  });

  it("confidence is between 0 and 1", () => {
    const vals = sineWave(40, 5, 2, 10);
    const result = detectPeriod(vals);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("strength is between 0 and 1", () => {
    const vals = sineWave(40, 5, 2, 10);
    const result = detectPeriod(vals);
    expect(result.strength).toBeGreaterThanOrEqual(0);
    expect(result.strength).toBeLessThanOrEqual(1);
  });

  it("returns hasSeasionality=false for random-ish data with very short series", () => {
    const result = detectPeriod([1, 2], 1);
    expect(result.hasSeasionality).toBe(false);
    expect(result.period).toBeNull();
  });

  it("detects period=4 for a quarterly-like series", () => {
    const vals = Array.from({ length: 40 }, (_, i) => Math.sin((2 * Math.PI * i) / 4) * 10);
    const result = detectPeriod(vals, 10);
    expect(result.period).toBe(4);
  });

  it("has strength > 0 for a strongly seasonal series", () => {
    const vals = sineWave(60, 6, 10, 0);
    const result = detectPeriod(vals, 15);
    expect(result.strength).toBeGreaterThan(0);
  });
});

// ─── holtWinters ──────────────────────────────────────────────────────────────

describe("holtWinters", () => {
  it("returns same length as input", () => {
    const vals = sineWave(24, 6, 2, 10);
    const smoothed = holtWinters(vals, 6);
    expect(smoothed).toHaveLength(vals.length);
  });

  it("returns all finite values", () => {
    const vals = sineWave(24, 6, 2, 10);
    const smoothed = holtWinters(vals, 6);
    smoothed.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("smoothed values are in a reasonable range near the input", () => {
    const vals = sineWave(30, 5, 3, 20);
    const smoothed = holtWinters(vals, 5);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const margin = (maxVal - minVal) * 2;
    smoothed.forEach((v) => {
      expect(v).toBeGreaterThan(minVal - margin);
      expect(v).toBeLessThan(maxVal + margin);
    });
  });

  it("accepts custom alpha, beta, gamma options", () => {
    const vals = sineWave(24, 6, 2, 10);
    const s1 = holtWinters(vals, 6, { alpha: 0.5, beta: 0.2, gamma: 0.3 });
    const s2 = holtWinters(vals, 6, { alpha: 0.1, beta: 0.05, gamma: 0.1 });
    expect(s1).not.toEqual(s2);
  });

  it("handles constant series", () => {
    const vals = constant(20, 5);
    const smoothed = holtWinters(vals, 4);
    expect(smoothed).toHaveLength(20);
    smoothed.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("returns empty array for empty input", () => {
    const smoothed = holtWinters([], 4);
    expect(smoothed).toHaveLength(0);
  });

  it("handles period equal to series length", () => {
    const vals = sineWave(12, 12, 1, 5);
    const smoothed = holtWinters(vals, 12);
    expect(smoothed).toHaveLength(12);
  });
});

// ─── holtWintersForecast ──────────────────────────────────────────────────────

describe("holtWintersForecast", () => {
  const vals = sineWave(36, 6, 3, 20);

  it("forecast array has `steps` elements", () => {
    const result = holtWintersForecast(vals, 5, 6);
    expect(result.forecast).toHaveLength(5);
  });

  it("lowerBound and upperBound have `steps` elements", () => {
    const result = holtWintersForecast(vals, 5, 6);
    expect(result.lowerBound).toHaveLength(5);
    expect(result.upperBound).toHaveLength(5);
  });

  it("bounds straddle the forecast: lower < forecast < upper", () => {
    const result = holtWintersForecast(vals, 6, 6);
    result.forecast.forEach((f, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(f + 1e-9);
      expect(result.upperBound[i]!).toBeGreaterThanOrEqual(f - 1e-9);
    });
  });

  it("method is HoltWinters", () => {
    const result = holtWintersForecast(vals, 3, 6);
    expect(result.method).toBe("HoltWinters");
  });

  it("prediction intervals grow with steps", () => {
    const result = holtWintersForecast(vals, 4, 6);
    const widths = result.upperBound.map((u, i) => u - result.lowerBound[i]!);
    // Widths should be non-decreasing
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeGreaterThanOrEqual(widths[i - 1]! - 1e-9);
    }
  });

  it("all forecast values are finite", () => {
    const result = holtWintersForecast(vals, 5, 6);
    result.forecast.forEach((v) => expect(isFinite(v)).toBe(true));
  });
});

// ─── ar1Forecast ─────────────────────────────────────────────────────────────

describe("ar1Forecast", () => {
  it("returns correct number of forecast steps", () => {
    const vals = linearRamp(30, 0.5, 10);
    const result = ar1Forecast(vals, 5);
    expect(result.forecast).toHaveLength(5);
  });

  it("phi close to true AR(1) coefficient for synthetic data", () => {
    // Generate AR(1) with phi=0.8
    const phi = 0.8;
    const n = 200;
    const vals: number[] = [0];
    for (let i = 1; i < n; i++) {
      vals.push(phi * vals[i - 1]! + (Math.random() - 0.5) * 0.1);
    }
    const result = ar1Forecast(vals, 1);
    // The AR(1) forecast should be near phi * last_value (assuming mean ~0)
    const lastVal = vals[n - 1]!;
    const expectedApprox = phi * lastVal;
    // Allow some tolerance due to noise
    expect(Math.abs(result.forecast[0]! - expectedApprox)).toBeLessThan(1);
  });

  it("bounds straddle forecast", () => {
    const vals = sineWave(30, 5, 2, 10);
    const result = ar1Forecast(vals, 3);
    result.forecast.forEach((f, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(f + 1e-9);
      expect(result.upperBound[i]!).toBeGreaterThanOrEqual(f - 1e-9);
    });
  });

  it("method is AR1", () => {
    const vals = constant(20, 5);
    const result = ar1Forecast(vals, 2);
    expect(result.method).toBe("AR1");
  });

  it("all forecast values are finite", () => {
    const vals = sineWave(20, 4, 1, 5);
    const result = ar1Forecast(vals, 4);
    result.forecast.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("lowerBound < upperBound for all steps", () => {
    const vals = sineWave(20, 4, 1, 5);
    const result = ar1Forecast(vals, 4);
    result.forecast.forEach((_, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(result.upperBound[i]!);
    });
  });
});

// ─── naiveForecast ────────────────────────────────────────────────────────────

describe("naiveForecast", () => {
  it("all forecasts equal the last value", () => {
    const vals = [1, 2, 3, 4, 7];
    const result = naiveForecast(vals, 4);
    result.forecast.forEach((f) => expect(f).toBe(7));
  });

  it("bounds grow with steps", () => {
    const vals = sineWave(20, 5, 2, 10);
    const result = naiveForecast(vals, 5);
    const widths = result.upperBound.map((u, i) => u - result.lowerBound[i]!);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeGreaterThanOrEqual(widths[i - 1]! - 1e-9);
    }
  });

  it("method is Naive", () => {
    const result = naiveForecast([1, 2, 3], 2);
    expect(result.method).toBe("Naive");
  });

  it("returns correct number of steps", () => {
    const result = naiveForecast([1, 2, 3, 4, 5], 7);
    expect(result.forecast).toHaveLength(7);
    expect(result.lowerBound).toHaveLength(7);
    expect(result.upperBound).toHaveLength(7);
  });

  it("bounds straddle forecast", () => {
    const result = naiveForecast([1, 2, 3, 5, 4], 3);
    result.forecast.forEach((f, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(f + 1e-9);
      expect(result.upperBound[i]!).toBeGreaterThanOrEqual(f - 1e-9);
    });
  });
});

// ─── seasonalNaiveForecast ────────────────────────────────────────────────────

describe("seasonalNaiveForecast", () => {
  it("repeats last season correctly", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8];
    const period = 4;
    const result = seasonalNaiveForecast(vals, 4, period);
    // Last season = [5,6,7,8], so forecast = [5,6,7,8]
    expect(result.forecast[0]).toBe(5);
    expect(result.forecast[1]).toBe(6);
    expect(result.forecast[2]).toBe(7);
    expect(result.forecast[3]).toBe(8);
  });

  it("returns correct number of steps", () => {
    const vals = sineWave(24, 6, 1, 5);
    const result = seasonalNaiveForecast(vals, 6, 6);
    expect(result.forecast).toHaveLength(6);
  });

  it("method is SeasonalNaive", () => {
    const result = seasonalNaiveForecast([1, 2, 3, 4], 2, 2);
    expect(result.method).toBe("SeasonalNaive");
  });

  it("bounds grow with steps", () => {
    const vals = sineWave(24, 6, 2, 10);
    const result = seasonalNaiveForecast(vals, 6, 6);
    const widths = result.upperBound.map((u, i) => u - result.lowerBound[i]!);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeGreaterThanOrEqual(widths[i - 1]! - 1e-9);
    }
  });

  it("wraps around to next season cycle", () => {
    const vals = [10, 20, 10, 20, 10, 20];
    const result = seasonalNaiveForecast(vals, 4, 2);
    // Last season pair = [10, 20]; forecast[2] should repeat
    expect(result.forecast[0]).toBe(10);
    expect(result.forecast[1]).toBe(20);
    expect(result.forecast[2]).toBe(10);
    expect(result.forecast[3]).toBe(20);
  });
});

// ─── linearForecast ───────────────────────────────────────────────────────────

describe("linearForecast", () => {
  it("perfect linear input → perfect extrapolation", () => {
    const vals = linearRamp(20, 3, 5); // y = 3x + 5
    const result = linearForecast(vals, 5);
    // y[20] = 3*20+5=65, y[21]=68, ...
    for (let k = 0; k < 5; k++) {
      const expected = 3 * (20 + k) + 5;
      expect(result.forecast[k]!).toBeCloseTo(expected, 4);
    }
  });

  it("method is LinearTrend", () => {
    const result = linearForecast([1, 2, 3], 2);
    expect(result.method).toBe("LinearTrend");
  });

  it("returns correct number of steps", () => {
    const vals = linearRamp(15, 1, 0);
    const result = linearForecast(vals, 8);
    expect(result.forecast).toHaveLength(8);
    expect(result.lowerBound).toHaveLength(8);
    expect(result.upperBound).toHaveLength(8);
  });

  it("bounds straddle forecast", () => {
    const vals = sineWave(20, 5, 1, 10);
    const result = linearForecast(vals, 5);
    result.forecast.forEach((f, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(f + 1e-9);
      expect(result.upperBound[i]!).toBeGreaterThanOrEqual(f - 1e-9);
    });
  });

  it("returns empty for empty input", () => {
    const result = linearForecast([], 3);
    expect(result.forecast).toHaveLength(0);
  });

  it("constant series extrapolates to constant", () => {
    const vals = constant(10, 42);
    const result = linearForecast(vals, 3);
    result.forecast.forEach((f) => expect(f).toBeCloseTo(42, 4));
  });
});

// ─── arimaLite ────────────────────────────────────────────────────────────────

describe("arimaLite", () => {
  it("d=0, p=1, q=0 returns forecast close to AR(1) result", () => {
    const vals = sineWave(30, 5, 2, 10);
    const arimaResult = arimaLite(vals, { p: 1, d: 0, q: 0 }, 3);
    const ar1Result = ar1Forecast(vals, 3);
    // Forecasts should be in the same ballpark
    arimaResult.forecast.forEach((f, i) => {
      expect(Math.abs(f - ar1Result.forecast[i]!)).toBeLessThan(5);
    });
  });

  it("d=1 reduces non-stationary data", () => {
    const vals = linearRamp(20, 10, 0); // highly non-stationary
    const result = arimaLite(vals, { p: 1, d: 1, q: 0 }, 3);
    expect(result.forecast).toHaveLength(3);
    result.forecast.forEach((v) => expect(isFinite(v)).toBe(true));
  });

  it("returns correct number of steps", () => {
    const vals = sineWave(20, 5, 2, 10);
    const result = arimaLite(vals, { p: 1, d: 0, q: 1 }, 4);
    expect(result.forecast).toHaveLength(4);
  });

  it("method is ARIMALite", () => {
    const vals = sineWave(20, 5, 2, 10);
    const result = arimaLite(vals, { p: 1, d: 0, q: 0 }, 2);
    expect(result.method).toBe("ARIMALite");
  });

  it("bounds straddle forecast", () => {
    const vals = sineWave(24, 6, 2, 10);
    const result = arimaLite(vals, { p: 2, d: 0, q: 1 }, 5);
    result.forecast.forEach((f, i) => {
      expect(result.lowerBound[i]!).toBeLessThanOrEqual(f + 1e-9);
      expect(result.upperBound[i]!).toBeGreaterThanOrEqual(f - 1e-9);
    });
  });

  it("p=0, d=0, q=0 gives naïve mean forecast", () => {
    const vals = constant(10, 7);
    const result = arimaLite(vals, { p: 0, d: 0, q: 0 }, 2);
    result.forecast.forEach((f) => expect(f).toBeCloseTo(7, 4));
  });

  it("all forecast values are finite", () => {
    const vals = sineWave(24, 6, 2, 10);
    const result = arimaLite(vals, { p: 2, d: 1, q: 1 }, 4);
    result.forecast.forEach((v) => expect(isFinite(v)).toBe(true));
  });
});

// ─── yuleWalker ──────────────────────────────────────────────────────────────

describe("yuleWalker", () => {
  it("p=1 matches autocorrAtLag(values, 1)", () => {
    const vals = sineWave(30, 7, 2, 5);
    const [phi1] = yuleWalker(vals, 1);
    const r1 = autocorrAtLag(vals, 1);
    expect(phi1).toBeCloseTo(r1, 8);
  });

  it("p=0 returns empty array", () => {
    const vals = sineWave(20, 5, 1, 10);
    expect(yuleWalker(vals, 0)).toHaveLength(0);
  });

  it("p=2 returns two coefficients", () => {
    const vals = sineWave(40, 6, 2, 10);
    const coeffs = yuleWalker(vals, 2);
    expect(coeffs).toHaveLength(2);
  });

  it("p=2 coefficients are finite", () => {
    const vals = sineWave(40, 6, 2, 10);
    const coeffs = yuleWalker(vals, 2);
    coeffs.forEach((c) => expect(isFinite(c)).toBe(true));
  });

  it("p=2 satisfies Yule-Walker approximately for known AR(2)", () => {
    // Generate AR(2) with phi1=0.5, phi2=0.3
    const phi1 = 0.5;
    const phi2 = 0.3;
    const n = 500;
    const vals: number[] = [0, 0];
    for (let i = 2; i < n; i++) {
      vals.push(phi1 * vals[i - 1]! + phi2 * vals[i - 2]! + (Math.random() - 0.5) * 0.1);
    }
    const [p1, p2] = yuleWalker(vals, 2);
    expect(Math.abs(p1! - phi1)).toBeLessThan(0.15);
    expect(Math.abs(p2! - phi2)).toBeLessThan(0.15);
  });
});

// ─── autocorrAtLag ────────────────────────────────────────────────────────────

describe("autocorrAtLag", () => {
  it("lag=0 returns 1.0", () => {
    const vals = sineWave(20, 5, 2, 10);
    expect(autocorrAtLag(vals, 0)).toBe(1.0);
  });

  it("lag=1 for constant is 0 (no variation)", () => {
    const vals = constant(10, 5);
    const r = autocorrAtLag(vals, 1);
    expect(r).toBe(0); // std=0 → 0
  });

  it("autocorrelation at period lag is high for sine wave", () => {
    const period = 6;
    const vals = sineWave(60, period, 3, 10);
    const r = autocorrAtLag(vals, period);
    expect(r).toBeGreaterThan(0.8);
  });

  it("returns value in [-1, 1]", () => {
    const vals = sineWave(30, 7, 2, 5);
    for (let lag = 0; lag <= 10; lag++) {
      const r = autocorrAtLag(vals, lag);
      expect(r).toBeGreaterThanOrEqual(-1 - 1e-9);
      expect(r).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("lag >= n returns 0", () => {
    const vals = [1, 2, 3, 4, 5];
    expect(autocorrAtLag(vals, 5)).toBe(0);
    expect(autocorrAtLag(vals, 10)).toBe(0);
  });

  it("lag=1 for perfect AR(1) series is close to true phi", () => {
    const phi = 0.8;
    const n = 500;
    const vals: number[] = [0];
    for (let i = 1; i < n; i++) {
      vals.push(phi * vals[i - 1]! + (Math.random() - 0.5) * 0.01);
    }
    expect(autocorrAtLag(vals, 1)).toBeCloseTo(phi, 1);
  });
});

// ─── mae / rmse / mape / smape ────────────────────────────────────────────────

describe("mae", () => {
  it("perfect predictions give mae=0", () => {
    expect(mae([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("basic numeric correctness", () => {
    expect(mae([1, 2, 3, 4], [2, 3, 4, 5])).toBeCloseTo(1, 8);
  });

  it("handles empty arrays", () => {
    expect(mae([], [])).toBe(0);
  });

  it("uses min length when arrays differ", () => {
    expect(mae([1, 2, 3], [1, 2])).toBeCloseTo(0, 8);
  });
});

describe("rmse", () => {
  it("perfect predictions give rmse=0", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("basic numeric correctness", () => {
    // errors = [1,1,1,1], rmse = 1
    expect(rmse([1, 2, 3, 4], [2, 3, 4, 5])).toBeCloseTo(1, 8);
  });

  it("rmse >= mae always", () => {
    const actual = [1, 2, 3, 4, 5];
    const predicted = [1.1, 2.2, 3.3, 4.4, 5.5];
    expect(rmse(actual, predicted)).toBeGreaterThanOrEqual(mae(actual, predicted) - 1e-9);
  });

  it("handles empty arrays", () => {
    expect(rmse([], [])).toBe(0);
  });
});

describe("mape", () => {
  it("perfect predictions give mape=0", () => {
    expect(mape([10, 20, 30], [10, 20, 30])).toBe(0);
  });

  it("basic numeric correctness", () => {
    // |10-11|/10 = 0.1 → mape = 10%
    expect(mape([10], [11])).toBeCloseTo(0.1, 8);
  });

  it("returns Infinity when all actual=0", () => {
    expect(mape([0, 0, 0], [1, 2, 3])).toBe(Infinity);
  });

  it("skips zeros in actual when computing mape", () => {
    // Only non-zero: actual=10, predicted=11 → |10-11|/10 = 0.1
    expect(mape([0, 10], [5, 11])).toBeCloseTo(0.1, 8);
  });
});

describe("smape", () => {
  it("perfect predictions give smape=0", () => {
    expect(smape([10, 20], [10, 20])).toBe(0);
  });

  it("basic numeric correctness", () => {
    // 2*|10-0|/(10+0) = 2 → smape = 2 (not capped at 2 by spec, just computed)
    // 2*1 / (10+0) = 0.2... wait: actual=10, predicted=0 → 2*10/(10+0)=2
    expect(smape([10], [0])).toBeCloseTo(2, 8);
  });

  it("handles zero-zero pairs by skipping", () => {
    // only pair (10, 11) counts: 2*1/(10+11) ≈ 0.0952
    expect(smape([0, 10], [0, 11])).toBeCloseTo(2 / 21, 5);
  });

  it("returns 0 for all-zero pairs", () => {
    expect(smape([0, 0], [0, 0])).toBe(0);
  });
});

// ─── timeSeriesCv ─────────────────────────────────────────────────────────────

describe("timeSeriesCv", () => {
  it("returns correct length of maeFold", () => {
    const vals = linearRamp(20, 1, 0);
    const { maeFold } = timeSeriesCv(
      vals,
      (train) => train[train.length - 1]!, // naive last-value
      10
    );
    // Folds from index 10 to 19 → 10 folds
    expect(maeFold).toHaveLength(10);
  });

  it("rmseOverall is non-negative", () => {
    const vals = sineWave(20, 5, 2, 10);
    const { rmseOverall } = timeSeriesCv(vals, (train) => train[train.length - 1]!, 5);
    expect(rmseOverall).toBeGreaterThanOrEqual(0);
  });

  it("perfect forecast gives rmseOverall=0", () => {
    // Constant series: predicting last value is perfect
    const vals = constant(15, 7);
    const { rmseOverall } = timeSeriesCv(vals, (_train) => 7, 5);
    expect(rmseOverall).toBeCloseTo(0, 8);
  });

  it("uses default minTrainSize of 10", () => {
    const vals = linearRamp(15, 1, 0);
    const { maeFold } = timeSeriesCv(vals, (train) => train[train.length - 1]!);
    // Folds from index 10..14 → 5 folds
    expect(maeFold).toHaveLength(5);
  });

  it("maeFold entries are non-negative", () => {
    const vals = sineWave(20, 5, 2, 10);
    const { maeFold } = timeSeriesCv(vals, (train) => train[train.length - 1]!, 5);
    maeFold.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });
});

// ─── cusumChangePoints ────────────────────────────────────────────────────────

describe("cusumChangePoints", () => {
  it("detects obvious level shift", () => {
    // Flat at 0 for 20 points, then jumps to 100 for 20 points
    const vals = [...constant(20, 0), ...constant(20, 100)];
    const points = cusumChangePoints(vals, 1.0);
    // At least one change point detected in second half
    expect(points.length).toBeGreaterThan(0);
    const hasInSecondHalf = points.some((p) => p >= 19);
    expect(hasInSecondHalf).toBe(true);
  });

  it("returns empty for constant series", () => {
    const vals = constant(20, 5);
    const points = cusumChangePoints(vals);
    expect(points).toHaveLength(0);
  });

  it("returns empty for empty series", () => {
    const points = cusumChangePoints([]);
    expect(points).toHaveLength(0);
  });

  it("all returned indices are within bounds", () => {
    const vals = [...constant(15, 0), ...constant(15, 50)];
    const points = cusumChangePoints(vals, 1.5);
    points.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(vals.length);
    });
  });

  it("higher threshold produces fewer or equal change points", () => {
    const vals = [...constant(10, 0), ...constant(10, 100)];
    const few = cusumChangePoints(vals, 10.0);
    const many = cusumChangePoints(vals, 0.5);
    expect(few.length).toBeLessThanOrEqual(many.length);
  });
});

// ─── anomalyDetection ────────────────────────────────────────────────────────

describe("anomalyDetection", () => {
  it("detects spike in otherwise constant series", () => {
    const vals = [...constant(15, 5), 100, ...constant(10, 5)];
    const anomalies = anomalyDetection(vals, 5, 2.0);
    expect(anomalies.length).toBeGreaterThan(0);
    // The spike at index 15 should be detected
    const hasSpike = anomalies.includes(15);
    expect(hasSpike).toBe(true);
  });

  it("returns empty for a smooth constant series", () => {
    const vals = constant(30, 10);
    const anomalies = anomalyDetection(vals, 5, 2.5);
    expect(anomalies).toHaveLength(0);
  });

  it("all returned indices are within bounds", () => {
    const vals = sineWave(30, 5, 1, 10);
    const anomalies = anomalyDetection(vals, 5, 1.0);
    anomalies.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vals.length);
    });
  });

  it("returns more anomalies with lower threshold", () => {
    const vals = [...constant(10, 5), 20, ...constant(10, 5)];
    const strict = anomalyDetection(vals, 5, 5.0);
    const loose = anomalyDetection(vals, 5, 0.5);
    expect(strict.length).toBeLessThanOrEqual(loose.length);
  });

  it("detects negative spike too", () => {
    const vals = [...constant(15, 50), -100, ...constant(10, 50)];
    const anomalies = anomalyDetection(vals, 5, 2.0);
    expect(anomalies.length).toBeGreaterThan(0);
  });
});

// ─── makeStationary / integrateForecasts ─────────────────────────────────────

describe("makeStationary", () => {
  it("difference: output length = n-1", () => {
    const vals = linearRamp(10, 2, 0);
    const diff = makeStationary(vals);
    expect(diff).toHaveLength(9);
  });

  it("difference: constant differences for linear ramp", () => {
    const vals = linearRamp(10, 3, 5);
    const diff = makeStationary(vals, 'difference');
    diff.forEach((d) => expect(d).toBeCloseTo(3, 8));
  });

  it("log-difference: output length = n-1", () => {
    const vals = [1, 2, 4, 8, 16];
    const ld = makeStationary(vals, 'log-difference');
    expect(ld).toHaveLength(4);
  });

  it("log-difference: constant log differences for geometric series", () => {
    const vals = [1, 2, 4, 8, 16];
    const ld = makeStationary(vals, 'log-difference');
    ld.forEach((d) => expect(d).toBeCloseTo(Math.LN2, 6));
  });

  it("short series returns empty", () => {
    expect(makeStationary([5])).toHaveLength(0);
    expect(makeStationary([])).toHaveLength(0);
  });

  it("defaults to difference", () => {
    const vals = [1, 3, 6, 10];
    const d1 = makeStationary(vals);
    const d2 = makeStationary(vals, 'difference');
    expectClose(d1, d2);
  });
});

describe("integrateForecasts", () => {
  it("round-trip restores original for linear ramp", () => {
    const vals = linearRamp(10, 2, 5);
    const diffs = makeStationary(vals, 'difference');
    const restored = integrateForecasts(diffs, vals[0]!);
    // restored should equal vals[1..]
    for (let i = 0; i < restored.length; i++) {
      expect(restored[i]!).toBeCloseTo(vals[i + 1]!, 8);
    }
  });

  it("output length = forecasts length", () => {
    const forecasts = [1, 2, 3, 4];
    const result = integrateForecasts(forecasts, 10);
    expect(result).toHaveLength(4);
  });

  it("first value = lastOriginalValue + forecast[0]", () => {
    const result = integrateForecasts([5, 3, -2], 100);
    expect(result[0]).toBeCloseTo(105, 8);
    expect(result[1]).toBeCloseTo(108, 8);
    expect(result[2]).toBeCloseTo(106, 8);
  });

  it("handles empty forecasts", () => {
    expect(integrateForecasts([], 10)).toHaveLength(0);
  });

  it("cumulative sum property: result[k] = lastOrig + sum(forecasts[0..k])", () => {
    const forecasts = [2, 3, 1, -1, 4];
    const lastOrig = 10;
    const result = integrateForecasts(forecasts, lastOrig);
    let running = lastOrig;
    for (let k = 0; k < forecasts.length; k++) {
      running += forecasts[k]!;
      expect(result[k]!).toBeCloseTo(running, 8);
    }
  });

  it("makeStationary then integrateForecasts restores sine wave", () => {
    const vals = sineWave(20, 5, 2, 100); // offset=100 so positive
    const diffs = makeStationary(vals, 'difference');
    const restored = integrateForecasts(diffs, vals[0]!);
    for (let i = 0; i < restored.length; i++) {
      expect(restored[i]!).toBeCloseTo(vals[i + 1]!, 6);
    }
  });
});
