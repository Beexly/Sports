/**
 * Tests for signal-processing utilities.
 * Covers: SMA, EMA, WMA, Kalman, convolve, crossCorrelation,
 * autocorrelation, linearTrend, detrend, detectChangePoints,
 * findPeaks, gaussianSmooth, medianFilter, savitzkyGolay,
 * dftMagnitudes, dominantFrequency, rollingStdDev, rollingZScore, ewma.
 */

import { describe, it, expect } from "vitest";
import {
  simpleMovingAverage,
  exponentialMovingAverage,
  weightedMovingAverage,
  kalmansmoother,
  convolve,
  crossCorrelation,
  autocorrelation,
  linearTrend,
  detrend,
  detectChangePoints,
  findPeaks,
  gaussianSmooth,
  medianFilter,
  savitzkyGolay,
  dftMagnitudes,
  dominantFrequency,
  rollingStdDev,
  rollingZScore,
  ewma,
} from "@/lib/math/signal-processing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const closeToArr = (arr: number[], expected: number[], tol = 1e-6) => {
  expect(arr).toHaveLength(expected.length);
  arr.forEach((v, i) => {
    if (isNaN(expected[i]!)) {
      expect(isNaN(v)).toBe(true);
    } else {
      expect(v).toBeCloseTo(expected[i]!, 5);
    }
  });
};

// ─── simpleMovingAverage ──────────────────────────────────────────────────────

describe("simpleMovingAverage", () => {
  it("basic window=3", () => {
    const result = simpleMovingAverage([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(result[2]).toBeCloseTo(2, 5);
    expect(result[3]).toBeCloseTo(3, 5);
    expect(result[4]).toBeCloseTo(4, 5);
  });

  it("NaN prefix has length window-1", () => {
    const result = simpleMovingAverage([10, 20, 30, 40, 50], 4);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(true);
    expect(result[3]).toBeCloseTo(25, 5);
  });

  it("window=1 returns original values", () => {
    const values = [3, 1, 4, 1, 5, 9];
    const result = simpleMovingAverage(values, 1);
    closeToArr(result, values);
  });

  it("short array (length < window) all NaN", () => {
    const result = simpleMovingAverage([1, 2], 5);
    expect(result.every(isNaN)).toBe(true);
  });

  it("returns same length as input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    expect(simpleMovingAverage(input, 3)).toHaveLength(input.length);
  });

  it("window equals array length returns single value at end", () => {
    const result = simpleMovingAverage([2, 4, 6], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(result[2]).toBeCloseTo(4, 5);
  });
});

// ─── exponentialMovingAverage ─────────────────────────────────────────────────

describe("exponentialMovingAverage", () => {
  it("alpha=1 is identity (equals input)", () => {
    const values = [5, 3, 8, 2, 7];
    closeToArr(exponentialMovingAverage(values, 1), values);
  });

  it("alpha=0.5 recursion check", () => {
    const values = [4, 8, 12];
    const result = exponentialMovingAverage(values, 0.5);
    expect(result[0]).toBeCloseTo(4, 5);
    expect(result[1]).toBeCloseTo(0.5 * 8 + 0.5 * 4, 5); // 6
    expect(result[2]).toBeCloseTo(0.5 * 12 + 0.5 * 6, 5); // 9
  });

  it("alpha close to 0 gives nearly constant output (slow decay)", () => {
    const values = [10, 20, 30, 40, 50];
    const result = exponentialMovingAverage(values, 0.01);
    // Should stay very close to the first value
    expect(result[0]).toBeCloseTo(10, 5);
    expect(result[result.length - 1]!).toBeLessThan(15);
  });

  it("empty input returns empty", () => {
    expect(exponentialMovingAverage([], 0.5)).toEqual([]);
  });

  it("single element", () => {
    expect(exponentialMovingAverage([42], 0.5)).toEqual([42]);
  });
});

// ─── weightedMovingAverage ────────────────────────────────────────────────────

describe("weightedMovingAverage", () => {
  it("basic weights [1,2,3] on [1,2,3,4,5]", () => {
    const result = weightedMovingAverage([1, 2, 3, 4, 5], [1, 2, 3]);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    // i=2: (1*1 + 2*2 + 3*3)/(1+2+3) = 14/6
    expect(result[2]).toBeCloseTo(14 / 6, 5);
    // i=3: (1*2 + 2*3 + 3*4)/6 = 20/6
    expect(result[3]).toBeCloseTo(20 / 6, 5);
  });

  it("uniform weights equal to SMA", () => {
    const values = [1, 2, 3, 4, 5];
    const wma = weightedMovingAverage(values, [1, 1, 1]);
    const sma = simpleMovingAverage(values, 3);
    for (let i = 2; i < values.length; i++) {
      expect(wma[i]).toBeCloseTo(sma[i]!, 5);
    }
  });

  it("single weight [1] returns original", () => {
    const values = [7, 3, 5, 1];
    closeToArr(weightedMovingAverage(values, [1]), values);
  });

  it("zero total weight returns all NaN", () => {
    const result = weightedMovingAverage([1, 2, 3], [0, 0, 0]);
    expect(result.every(isNaN)).toBe(true);
  });
});

// ─── kalmansmoother ───────────────────────────────────────────────────────────

describe("kalmansmoother", () => {
  it("returns same length as input", () => {
    const values = [1, 2, 3, 4, 5];
    expect(kalmansmoother(values)).toHaveLength(values.length);
  });

  it("first value equals input[0]", () => {
    const values = [10, 20, 15, 25];
    expect(kalmansmoother(values)[0]).toBeCloseTo(10, 5);
  });

  it("smoother than raw for noisy signal", () => {
    const noisy = [0, 10, 0, 10, 0, 10, 0, 10, 0, 10];
    const smoothed = kalmansmoother(noisy, 1e-3, 1e-1);
    // Smoothed version should have lower std dev
    const rawVariance = noisy.reduce((s, v) => s + (v - 5) ** 2, 0) / noisy.length;
    const smoothedMean = smoothed.reduce((s, v) => s + v, 0) / smoothed.length;
    const smoothedVariance = smoothed.reduce((s, v) => s + (v - smoothedMean) ** 2, 0) / smoothed.length;
    expect(smoothedVariance).toBeLessThan(rawVariance);
  });

  it("empty input returns empty", () => {
    expect(kalmansmoother([])).toEqual([]);
  });

  it("constant signal stays constant", () => {
    const values = [5, 5, 5, 5, 5];
    const result = kalmansmoother(values);
    result.forEach((v) => expect(v).toBeCloseTo(5, 3));
  });
});

// ─── convolve ─────────────────────────────────────────────────────────────────

describe("convolve", () => {
  it("identity kernel [1] returns same signal", () => {
    const signal = [1, 2, 3, 4, 5];
    closeToArr(convolve(signal, [1]), signal);
  });

  it("[1,1] kernel gives cumulative sum shifted", () => {
    // convolve([1,2,3],[1,1]) = [1, 3, 5, 3] (full)
    const result = convolve([1, 2, 3], [1, 1]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(3, 5);
    expect(result[2]).toBeCloseTo(5, 5);
    expect(result[3]).toBeCloseTo(3, 5);
  });

  it("output length is signal.length + kernel.length - 1", () => {
    const signal = [1, 2, 3, 4, 5];
    const kernel = [1, 0, -1];
    expect(convolve(signal, kernel)).toHaveLength(7);
  });

  it("[0.5, 0.5] averages adjacent pairs", () => {
    const result = convolve([2, 4, 6], [0.5, 0.5]);
    expect(result[1]).toBeCloseTo(3, 5);
    expect(result[2]).toBeCloseTo(5, 5);
  });

  it("single element signal and kernel", () => {
    const result = convolve([3], [4]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(12, 5);
  });
});

// ─── crossCorrelation ─────────────────────────────────────────────────────────

describe("crossCorrelation", () => {
  it("identical series at lag=0 should be 1.0", () => {
    const a = [1, 2, 3, 4, 5];
    const results = crossCorrelation(a, a);
    const lag0 = results.find((r) => r.lag === 0);
    expect(lag0).toBeDefined();
    expect(lag0!.correlation).toBeCloseTo(1.0, 5);
  });

  it("returns 2*maxLag+1 entries", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    const results = crossCorrelation(a, b, 2);
    expect(results).toHaveLength(5);
  });

  it("lags go from -maxLag to +maxLag", () => {
    const a = [1, 2, 3];
    const results = crossCorrelation(a, a, 2);
    const lags = results.map((r) => r.lag);
    expect(lags).toEqual([-2, -1, 0, 1, 2]);
  });

  it("anti-correlated at lag=0 gives -1", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    const results = crossCorrelation(a, b, 0);
    expect(results[0]!.correlation).toBeCloseTo(-1.0, 5);
  });
});

// ─── autocorrelation ──────────────────────────────────────────────────────────

describe("autocorrelation", () => {
  it("lag=0 is always 1.0", () => {
    const values = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    const results = autocorrelation(values);
    const lag0 = results.find((r) => r.lag === 0);
    expect(lag0!.correlation).toBeCloseTo(1.0, 10);
  });

  it("returns 2*maxLag+1 entries", () => {
    const values = [1, 2, 3, 4, 5];
    const results = autocorrelation(values, 3);
    expect(results).toHaveLength(7);
  });

  it("constant series at all lags (correlation trivially 0 for lag!=0 when all same)", () => {
    // All same value — std = 0 so correlation = 0 for non-zero lags
    const values = [3, 3, 3, 3, 3];
    const results = autocorrelation(values, 2);
    const lag0 = results.find((r) => r.lag === 0);
    expect(lag0!.correlation).toBeCloseTo(1.0, 10);
  });
});

// ─── linearTrend ──────────────────────────────────────────────────────────────

describe("linearTrend", () => {
  it("flat series has slope ≈ 0", () => {
    const { slope, direction } = linearTrend([5, 5, 5, 5, 5]);
    expect(Math.abs(slope)).toBeLessThan(1e-10);
    expect(direction).toBe("flat");
  });

  it("increasing series has slope > 0 and direction 'up'", () => {
    const { slope, direction } = linearTrend([1, 2, 3, 4, 5]);
    expect(slope).toBeGreaterThan(0);
    expect(direction).toBe("up");
  });

  it("decreasing series has slope < 0 and direction 'down'", () => {
    const { slope, direction } = linearTrend([5, 4, 3, 2, 1]);
    expect(slope).toBeLessThan(0);
    expect(direction).toBe("down");
  });

  it("perfect line has r² = 1", () => {
    const { r2 } = linearTrend([2, 4, 6, 8, 10]);
    expect(r2).toBeCloseTo(1.0, 5);
  });

  it("slope is correct for y=2x+1", () => {
    const values = [1, 3, 5, 7, 9]; // 2*i+1
    const { slope, intercept } = linearTrend(values);
    expect(slope).toBeCloseTo(2, 5);
    expect(intercept).toBeCloseTo(1, 5);
  });

  it("single element returns slope 0", () => {
    const { slope } = linearTrend([42]);
    expect(slope).toBeCloseTo(0, 10);
  });
});

// ─── detrend ──────────────────────────────────────────────────────────────────

describe("detrend", () => {
  it("detrended perfectly linear series is all ~0s", () => {
    const values = [1, 3, 5, 7, 9];
    const result = detrend(values);
    result.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-8));
  });

  it("returns same length as input", () => {
    const values = [3, 1, 4, 1, 5];
    expect(detrend(values)).toHaveLength(values.length);
  });

  it("detrending constant series leaves all values same", () => {
    const values = [7, 7, 7, 7, 7];
    const result = detrend(values);
    result.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-8));
  });
});

// ─── detectChangePoints ───────────────────────────────────────────────────────

describe("detectChangePoints", () => {
  it("constant series has no change points", () => {
    const result = detectChangePoints([5, 5, 5, 5, 5]);
    expect(result).toHaveLength(0);
  });

  it("detects a large jump", () => {
    const values = [1, 1, 1, 1, 100, 1, 1, 1];
    const points = detectChangePoints(values, 2.0);
    expect(points).toContain(4);
    expect(points).toContain(5);
  });

  it("returns empty for length < 2", () => {
    expect(detectChangePoints([42])).toHaveLength(0);
    expect(detectChangePoints([])).toHaveLength(0);
  });

  it("higher threshold misses small changes", () => {
    const values = [0, 1, 0, 1, 0, 1];
    const lenient = detectChangePoints(values, 10);
    expect(lenient).toHaveLength(0);
  });

  it("lower threshold catches more changes", () => {
    const values = [0, 2, 0, 2, 0, 2];
    const strict = detectChangePoints(values, 0.5);
    expect(strict.length).toBeGreaterThan(0);
  });
});

// ─── findPeaks ────────────────────────────────────────────────────────────────

describe("findPeaks", () => {
  it("[1,3,1,3,1] has peaks at indices 1 and 3", () => {
    const { peaks } = findPeaks([1, 3, 1, 3, 1]);
    expect(peaks).toContain(1);
    expect(peaks).toContain(3);
  });

  it("[1,3,1,3,1] has valley at index 2", () => {
    const { valleys } = findPeaks([1, 3, 1, 3, 1]);
    expect(valleys).toContain(2);
  });

  it("edges (index 0 and n-1) are never peaks or valleys", () => {
    const { peaks, valleys } = findPeaks([5, 3, 4, 2, 6]);
    expect(peaks).not.toContain(0);
    expect(peaks).not.toContain(4);
    expect(valleys).not.toContain(0);
    expect(valleys).not.toContain(4);
  });

  it("monotonic series has no peaks or valleys", () => {
    const { peaks, valleys } = findPeaks([1, 2, 3, 4, 5]);
    expect(peaks).toHaveLength(0);
    expect(valleys).toHaveLength(0);
  });

  it("minProminence filters low-prominence peaks", () => {
    const values = [0, 1, 0, 10, 0, 1, 0];
    const { peaks: allPeaks } = findPeaks(values);
    const { peaks: prominentPeaks } = findPeaks(values, 5);
    expect(allPeaks.length).toBeGreaterThan(prominentPeaks.length);
    expect(prominentPeaks).toContain(3); // the big peak
    expect(prominentPeaks).not.toContain(1); // the small peak
  });

  it("short array of length 2 has no peaks or valleys", () => {
    const { peaks, valleys } = findPeaks([1, 2]);
    expect(peaks).toHaveLength(0);
    expect(valleys).toHaveLength(0);
  });
});

// ─── gaussianSmooth ───────────────────────────────────────────────────────────

describe("gaussianSmooth", () => {
  it("sigma=0.01 ≈ identity (tiny kernel)", () => {
    const values = [1, 2, 3, 4, 5];
    const result = gaussianSmooth(values, 0.01);
    result.forEach((v, i) => expect(v).toBeCloseTo(values[i]!, 1));
  });

  it("returns same length as input", () => {
    const values = [1, 2, 3, 4, 5, 6, 7];
    expect(gaussianSmooth(values, 1.0)).toHaveLength(values.length);
  });

  it("large sigma smooths toward constant", () => {
    const values = [1, 9, 1, 9, 1, 9, 1];
    const smoothed = gaussianSmooth(values, 5);
    // Variance should decrease
    const rawMean = values.reduce((s, v) => s + v, 0) / values.length;
    const rawVar = values.reduce((s, v) => s + (v - rawMean) ** 2, 0) / values.length;
    const smMean = smoothed.reduce((s, v) => s + v, 0) / smoothed.length;
    const smVar = smoothed.reduce((s, v) => s + (v - smMean) ** 2, 0) / smoothed.length;
    expect(smVar).toBeLessThan(rawVar);
  });

  it("constant input stays constant", () => {
    const values = [5, 5, 5, 5, 5];
    const result = gaussianSmooth(values, 1.0);
    result.forEach((v) => expect(v).toBeCloseTo(5, 5));
  });

  it("empty input returns empty", () => {
    expect(gaussianSmooth([], 1.0)).toEqual([]);
  });
});

// ─── medianFilter ─────────────────────────────────────────────────────────────

describe("medianFilter", () => {
  it("window=3 removes spike", () => {
    const values = [1, 100, 2, 3, 4];
    const result = medianFilter(values, 3);
    // Position 1: median of [1,100,2] = 2
    expect(result[1]).toBeCloseTo(2, 5);
  });

  it("returns same length as input", () => {
    const values = [1, 2, 3, 4, 5];
    expect(medianFilter(values, 3)).toHaveLength(values.length);
  });

  it("window=1 returns original", () => {
    const values = [3, 1, 4, 1, 5];
    closeToArr(medianFilter(values, 1), values);
  });

  it("constant input stays constant", () => {
    const values = [7, 7, 7, 7, 7];
    const result = medianFilter(values, 3);
    result.forEach((v) => expect(v).toBeCloseTo(7, 5));
  });

  it("window=5 on 7 elements", () => {
    const values = [1, 2, 3, 4, 5, 6, 7];
    const result = medianFilter(values, 5);
    expect(result).toHaveLength(7);
    // i=2, half=2: indices clamped [0,1,2,3,4] => [1,2,3,4,5], median = 3
    expect(result[2]).toBeCloseTo(3, 5);
  });
});

// ─── savitzkyGolay ────────────────────────────────────────────────────────────

describe("savitzkyGolay", () => {
  it("returns same length as input", () => {
    const values = [1, 4, 9, 16, 25, 16, 9, 4, 1];
    expect(savitzkyGolay(values, 5, 2)).toHaveLength(values.length);
  });

  it("smooths a noisy signal", () => {
    // SG polyOrder=1 (linear) on a signal with a single spike should reduce it
    // Use a smooth ramp with a single large noise spike in the center
    const base = [0, 2, 4, 6, 8, 10, 8, 6, 4, 2, 0];
    const noisy = base.map((v, i) => (i === 5 ? v + 20 : v));
    const smoothed = savitzkyGolay(noisy, 5, 1);
    // The spike at center should be reduced after smoothing
    expect(smoothed[5]!).toBeLessThan(noisy[5]!);
  });

  it("constant signal stays constant (polyOrder=1)", () => {
    const values = [5, 5, 5, 5, 5, 5, 5];
    const result = savitzkyGolay(values, 5, 1);
    result.forEach((v) => expect(v).toBeCloseTo(5, 3));
  });

  it("empty input returns empty", () => {
    expect(savitzkyGolay([], 5, 2)).toEqual([]);
  });

  it("polyOrder=2 preserves quadratic trend", () => {
    // y = x^2 should be nearly preserved
    const values = [0, 1, 4, 9, 16, 25, 36];
    const result = savitzkyGolay(values, 5, 2);
    // Interior points should be close to original
    expect(result[3]).toBeCloseTo(9, 0);
  });
});

// ─── dftMagnitudes ────────────────────────────────────────────────────────────

describe("dftMagnitudes", () => {
  it("returns same length as input", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(dftMagnitudes(values)).toHaveLength(values.length);
  });

  it("DC component (all same value) has max power at k=0", () => {
    const values = [5, 5, 5, 5, 5, 5, 5, 5];
    const mags = dftMagnitudes(values);
    const maxIdx = mags.reduce((maxI, v, i, arr) => (v > arr[maxI]! ? i : maxI), 0);
    expect(maxIdx).toBe(0);
  });

  it("all magnitudes are non-negative", () => {
    const values = [1, -2, 3, -4, 5];
    dftMagnitudes(values).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("DC magnitude for constant array equals N * value", () => {
    const values = [3, 3, 3, 3];
    const mags = dftMagnitudes(values);
    expect(mags[0]).toBeCloseTo(12, 5);
  });

  it("zero input gives all-zero magnitudes", () => {
    const values = [0, 0, 0, 0, 0, 0];
    dftMagnitudes(values).forEach((v) => expect(v).toBeCloseTo(0, 5));
  });
});

// ─── dominantFrequency ────────────────────────────────────────────────────────

describe("dominantFrequency", () => {
  it("sine wave with period 10 in 30 samples gives period ≈ 10", () => {
    const N = 30;
    const period = 10;
    const values: number[] = [];
    for (let i = 0; i < N; i++) {
      values.push(Math.sin((2 * Math.PI * i) / period));
    }
    const { period: detectedPeriod } = dominantFrequency(values);
    expect(detectedPeriod).toBeCloseTo(period, 0);
  });

  it("returns frequency in [1/N, 1)", () => {
    const values: number[] = [];
    for (let i = 0; i < 20; i++) values.push(Math.sin((2 * Math.PI * i) / 5));
    const { frequency } = dominantFrequency(values);
    expect(frequency).toBeGreaterThan(0);
    expect(frequency).toBeLessThan(1);
  });

  it("magnitude is positive for non-trivial signal", () => {
    const values: number[] = [];
    for (let i = 0; i < 16; i++) values.push(Math.cos((2 * Math.PI * i) / 4));
    const { magnitude } = dominantFrequency(values);
    expect(magnitude).toBeGreaterThan(0);
  });

  it("period = N / frequency", () => {
    const N = 20;
    const values: number[] = [];
    for (let i = 0; i < N; i++) values.push(Math.sin((2 * Math.PI * i) / 4));
    const { frequency, period } = dominantFrequency(values);
    expect(period).toBeCloseTo(1 / frequency, 5);
  });
});

// ─── rollingStdDev ────────────────────────────────────────────────────────────

describe("rollingStdDev", () => {
  it("first window-1 entries are NaN", () => {
    const result = rollingStdDev([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(false);
  });

  it("window=1 is all zeros (single element std dev is 0)", () => {
    const result = rollingStdDev([1, 2, 3, 4, 5], 1);
    result.forEach((v) => expect(v).toBeCloseTo(0, 10));
  });

  it("returns same length as input", () => {
    expect(rollingStdDev([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("constant series has zero std dev after warm-up", () => {
    const result = rollingStdDev([7, 7, 7, 7, 7], 3);
    for (let i = 2; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 10);
    }
  });

  it("known std dev value", () => {
    // std([1,2,3]) = sqrt(2/3) ≈ 0.8165
    const result = rollingStdDev([1, 2, 3, 4, 5], 3);
    expect(result[2]).toBeCloseTo(Math.sqrt(2 / 3), 5);
  });
});

// ─── rollingZScore ────────────────────────────────────────────────────────────

describe("rollingZScore", () => {
  it("constant series returns all 0s after warm-up", () => {
    const result = rollingZScore([5, 5, 5, 5, 5], 3);
    for (let i = 2; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 10);
    }
  });

  it("returns same length as input", () => {
    expect(rollingZScore([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("first window-1 entries are NaN", () => {
    const result = rollingZScore([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
  });

  it("last element of increasing series has positive z-score", () => {
    const result = rollingZScore([1, 2, 3, 4, 5], 3);
    expect(result[4]).toBeGreaterThan(0);
  });

  it("z-score is 0 when stddev is 0", () => {
    const result = rollingZScore([1, 1, 1, 10], 3);
    expect(result[2]).toBeCloseTo(0, 10);
  });
});

// ─── ewma ────────────────────────────────────────────────────────────────────

describe("ewma", () => {
  it("half-life=1 gives alpha≈1-exp(-ln2) ≈ 0.5, check recursion", () => {
    const alpha = 1 - Math.exp(-Math.LN2 / 1);
    const values = [4, 8, 12];
    const result = ewma(values, 1);
    expect(result[0]).toBeCloseTo(4, 5);
    expect(result[1]).toBeCloseTo(alpha * 8 + (1 - alpha) * 4, 5);
    expect(result[2]).toBeCloseTo(alpha * 12 + (1 - alpha) * result[1]!, 5);
  });

  it("returns same length as input", () => {
    expect(ewma([1, 2, 3, 4, 5], 2)).toHaveLength(5);
  });

  it("first element always equals input[0]", () => {
    expect(ewma([42, 1, 2], 3)[0]).toBeCloseTo(42, 5);
  });

  it("larger half-life means slower decay", () => {
    const values = [10, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const fast = ewma(values, 1);
    const slow = ewma(values, 10);
    // After many steps, slow should still be higher than fast (decays slower)
    expect(slow[9]!).toBeGreaterThan(fast[9]!);
  });

  it("empty input returns empty", () => {
    expect(ewma([], 2)).toEqual([]);
  });
});
