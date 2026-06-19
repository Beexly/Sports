/**
 * Tests for apps/web/lib/math/regression.ts
 * Covers: OLS, moving averages, rolling windows, trend detection,
 * error metrics, correlation, normalization, Bollinger Bands, RSI,
 * cumsum, diff, autocorrelation.
 */

import { describe, it, expect } from "vitest";
import {
  linearRegression,
  predict,
  predictPoly,
  sma,
  ema,
  wma,
  dema,
  rollingMin,
  rollingMax,
  rollingStdDev,
  detectTrend,
  rSquared,
  rmse,
  mae,
  pearsonCorrelation,
  zScore,
  normalize,
  standardize,
  bollingerBands,
  exponentialSmoothing,
  rsi,
  cumsum,
  diff,
  autocorrelation,
  type LinearModel,
  type PolynomialModel,
} from "@/lib/math/regression";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol;
const closeTol = (tol: number) => (a: number, b: number) => close(a, b, tol);

// ---------------------------------------------------------------------------
// linearRegression
// ---------------------------------------------------------------------------

describe("linearRegression", () => {
  it("perfect line y=2x yields slope≈2, intercept≈0, r2=1", () => {
    const m = linearRegression([1, 2, 3], [2, 4, 6]);
    expect(m.slope).toBeCloseTo(2, 10);
    expect(m.intercept).toBeCloseTo(0, 10);
    expect(m.r2).toBeCloseTo(1, 10);
    expect(m.n).toBe(3);
  });

  it("perfect line y=x+1 yields slope=1, intercept=1, r2=1", () => {
    const m = linearRegression([0, 1, 2, 3, 4], [1, 2, 3, 4, 5]);
    expect(m.slope).toBeCloseTo(1, 10);
    expect(m.intercept).toBeCloseTo(1, 10);
    expect(m.r2).toBeCloseTo(1, 10);
  });

  it("noisy data yields r2 < 1", () => {
    const m = linearRegression([1, 2, 3, 4, 5], [2, 3, 2, 4, 5]);
    expect(m.r2).toBeLessThan(1);
    expect(m.r2).toBeGreaterThan(0.5);
  });

  it("throws when xs and ys have different lengths", () => {
    expect(() => linearRegression([1, 2], [1])).toThrow();
  });

  it("throws when fewer than 2 points", () => {
    expect(() => linearRegression([1], [2])).toThrow();
  });

  it("throws on empty arrays", () => {
    expect(() => linearRegression([], [])).toThrow();
  });

  it("returns correct rmse for perfect fit (should be ~0)", () => {
    const m = linearRegression([1, 2, 3], [2, 4, 6]);
    expect(m.rmse).toBeCloseTo(0, 8);
  });

  it("returns correct mae for perfect fit (should be ~0)", () => {
    const m = linearRegression([1, 2, 3], [2, 4, 6]);
    expect(m.mae).toBeCloseTo(0, 8);
  });

  it("negative slope for decreasing line", () => {
    const m = linearRegression([1, 2, 3], [6, 4, 2]);
    expect(m.slope).toBeCloseTo(-2, 10);
    expect(m.r2).toBeCloseTo(1, 10);
  });

  it("horizontal line slope=0", () => {
    const m = linearRegression([1, 2, 3], [5, 5, 5]);
    expect(m.slope).toBeCloseTo(0, 10);
    expect(m.intercept).toBeCloseTo(5, 10);
  });

  it("returns n equal to input length", () => {
    const m = linearRegression([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]);
    expect(m.n).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// predict
// ---------------------------------------------------------------------------

describe("predict", () => {
  it("evaluates slope * x + intercept", () => {
    const m = linearRegression([1, 2, 3], [2, 4, 6]);
    expect(predict(m, 4)).toBeCloseTo(8, 8);
    expect(predict(m, 0)).toBeCloseTo(0, 8);
  });

  it("works for negative x", () => {
    const m = linearRegression([1, 2, 3], [2, 4, 6]);
    expect(predict(m, -1)).toBeCloseTo(-2, 8);
  });
});

// ---------------------------------------------------------------------------
// predictPoly
// ---------------------------------------------------------------------------

describe("predictPoly", () => {
  it("evaluates a0 + a1*x + a2*x^2", () => {
    const model: PolynomialModel = {
      coefficients: [1, 2, 3],
      degree: 2,
      r2: 1,
      n: 5,
    };
    // 1 + 2*2 + 3*4 = 1 + 4 + 12 = 17
    expect(predictPoly(model, 2)).toBeCloseTo(17, 10);
  });

  it("constant polynomial returns a0", () => {
    const model: PolynomialModel = {
      coefficients: [5],
      degree: 0,
      r2: 1,
      n: 5,
    };
    expect(predictPoly(model, 100)).toBeCloseTo(5, 10);
  });
});

// ---------------------------------------------------------------------------
// sma
// ---------------------------------------------------------------------------

describe("sma", () => {
  it("[1,2,3,4,5] window=3 → [2,3,4]", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([2, 3, 4]);
  });

  it("returns [] when window > data length", () => {
    expect(sma([1, 2], 5)).toEqual([]);
  });

  it("returns [] when data length < window", () => {
    expect(sma([1, 2, 3], 4)).toEqual([]);
  });

  it("window = 1 returns input unchanged", () => {
    expect(sma([5, 3, 7], 1)).toEqual([5, 3, 7]);
  });

  it("window = data.length returns single mean", () => {
    expect(sma([2, 4, 6], 3)).toEqual([4]);
  });

  it("output length = data.length - window + 1", () => {
    const result = sma([1, 2, 3, 4, 5, 6, 7], 4);
    expect(result.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// ema
// ---------------------------------------------------------------------------

describe("ema", () => {
  it("first value seeded to data[0]", () => {
    const result = ema([10, 12, 11, 13, 14], 0.5);
    expect(result[0]).toBe(10);
  });

  it("converges upward for increasing data", () => {
    const result = ema([10, 12, 11, 13, 14], 0.5);
    expect(result[result.length - 1]!).toBeGreaterThan(result[0]!);
  });

  it("same length as input", () => {
    const result = ema([1, 2, 3, 4, 5], 0.3);
    expect(result.length).toBe(5);
  });

  it("alpha=1 returns the data itself", () => {
    const data = [3, 5, 2, 8];
    const result = ema(data, 1);
    data.forEach((v, i) => expect(result[i]).toBeCloseTo(v, 10));
  });

  it("alpha=0 stays at first value", () => {
    const result = ema([10, 20, 30], 0);
    result.forEach((v) => expect(v).toBe(10));
  });

  it("throws for alpha > 1", () => {
    expect(() => ema([1, 2, 3], 1.5)).toThrow();
  });

  it("throws for alpha < 0", () => {
    expect(() => ema([1, 2, 3], -0.1)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// wma
// ---------------------------------------------------------------------------

describe("wma", () => {
  it("[1,2,3,4] window=2 → weighted values", () => {
    // window=2: weights [1,2], denom=3
    // [1,2]: (1*1 + 2*2)/3 = 5/3
    // [2,3]: (1*2 + 2*3)/3 = 8/3
    // [3,4]: (1*3 + 2*4)/3 = 11/3
    const result = wma([1, 2, 3, 4], 2);
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(5 / 3, 8);
    expect(result[1]).toBeCloseTo(8 / 3, 8);
    expect(result[2]).toBeCloseTo(11 / 3, 8);
  });

  it("returns [] when data too short", () => {
    expect(wma([1, 2], 5)).toEqual([]);
  });

  it("output length = data.length - window + 1", () => {
    expect(wma([1, 2, 3, 4, 5], 3).length).toBe(3);
  });

  it("window=1 returns input unchanged", () => {
    expect(wma([5, 3, 9], 1)).toEqual([5, 3, 9]);
  });
});

// ---------------------------------------------------------------------------
// dema
// ---------------------------------------------------------------------------

describe("dema", () => {
  it("returns same length as input", () => {
    const result = dema([1, 2, 3, 4, 5], 0.5);
    expect(result.length).toBe(5);
  });

  it("returns [] for empty input", () => {
    expect(dema([], 0.5)).toEqual([]);
  });

  it("reduces lag versus single ema on increasing data", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const e = ema(data, 0.5);
    const d = dema(data, 0.5);
    // DEMA should be closer to actual data (less lag) than EMA
    const lastReal = data[data.length - 1]!;
    expect(Math.abs(d[d.length - 1]! - lastReal)).toBeLessThan(
      Math.abs(e[e.length - 1]! - lastReal)
    );
  });
});

// ---------------------------------------------------------------------------
// rollingMin
// ---------------------------------------------------------------------------

describe("rollingMin", () => {
  it("[3,1,4,1,5] window=2 → [1,1,1,1]", () => {
    expect(rollingMin([3, 1, 4, 1, 5], 2)).toEqual([1, 1, 1, 1]);
  });

  it("returns [] when window > data length", () => {
    expect(rollingMin([1, 2], 5)).toEqual([]);
  });

  it("output length = data.length - window + 1", () => {
    expect(rollingMin([1, 2, 3, 4, 5], 3).length).toBe(3);
  });

  it("window=1 returns all values", () => {
    expect(rollingMin([5, 3, 7], 1)).toEqual([5, 3, 7]);
  });
});

// ---------------------------------------------------------------------------
// rollingMax
// ---------------------------------------------------------------------------

describe("rollingMax", () => {
  it("[3,1,4,1,5] window=2 → [3,4,4,5]", () => {
    expect(rollingMax([3, 1, 4, 1, 5], 2)).toEqual([3, 4, 4, 5]);
  });

  it("returns [] when window > data length", () => {
    expect(rollingMax([1, 2], 5)).toEqual([]);
  });

  it("output length = data.length - window + 1", () => {
    expect(rollingMax([1, 2, 3, 4, 5], 3).length).toBe(3);
  });

  it("window=1 returns all values", () => {
    expect(rollingMax([5, 3, 7], 1)).toEqual([5, 3, 7]);
  });
});

// ---------------------------------------------------------------------------
// rollingStdDev
// ---------------------------------------------------------------------------

describe("rollingStdDev", () => {
  it("[2,2,2,2] window=2 → all 0", () => {
    const result = rollingStdDev([2, 2, 2, 2], 2);
    result.forEach((v) => expect(v).toBeCloseTo(0, 10));
  });

  it("output length = data.length - window + 1", () => {
    expect(rollingStdDev([1, 2, 3, 4, 5], 3).length).toBe(3);
  });

  it("returns [] when window > data length", () => {
    expect(rollingStdDev([1, 2], 5)).toEqual([]);
  });

  it("non-zero std dev for varying data", () => {
    const result = rollingStdDev([1, 5, 1, 5], 2);
    result.forEach((v) => expect(v).toBeGreaterThan(0));
  });
});

// ---------------------------------------------------------------------------
// detectTrend
// ---------------------------------------------------------------------------

describe("detectTrend", () => {
  it("strongly increasing data → direction 'up'", () => {
    const result = detectTrend([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(result.direction).toBe("up");
    expect(result.slope).toBeGreaterThan(0);
  });

  it("strongly decreasing data → direction 'down'", () => {
    const result = detectTrend([100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
    expect(result.direction).toBe("down");
    expect(result.slope).toBeLessThan(0);
  });

  it("flat data → direction 'flat'", () => {
    const result = detectTrend([5, 5, 5, 5, 5, 5]);
    expect(result.direction).toBe("flat");
  });

  it("strength is in [0, 1]", () => {
    const result = detectTrend([1, 2, 3, 4, 5]);
    expect(result.strength).toBeGreaterThanOrEqual(0);
    expect(result.strength).toBeLessThanOrEqual(1);
  });

  it("r2 is in [0, 1] for well-behaved data", () => {
    const result = detectTrend([1, 2, 3, 4, 5]);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it("single element returns flat", () => {
    const result = detectTrend([42]);
    expect(result.direction).toBe("flat");
  });
});

// ---------------------------------------------------------------------------
// rSquared
// ---------------------------------------------------------------------------

describe("rSquared", () => {
  it("perfect predictions → r2 = 1", () => {
    expect(rSquared([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it("constant ys → returns 1 (trivial fit)", () => {
    expect(rSquared([5, 5, 5], [5, 5, 5])).toBe(1);
  });

  it("bad predictions → lower r2", () => {
    const r = rSquared([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(r).toBeLessThan(0);
  });

  it("throws on mismatched lengths", () => {
    expect(() => rSquared([1, 2], [1])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// rmse
// ---------------------------------------------------------------------------

describe("rmse", () => {
  it("[1,2] vs [1,1] → rmse = sqrt(0.5)", () => {
    // errors: [0, 1]; mse = (0+1)/2 = 0.5; rmse = sqrt(0.5)
    expect(rmse([1, 2], [1, 1])).toBeCloseTo(Math.sqrt(0.5), 10);
  });

  it("perfect predictions → rmse = 0", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
  });

  it("throws on mismatched lengths", () => {
    expect(() => rmse([1, 2], [1])).toThrow();
  });

  it("always non-negative", () => {
    expect(rmse([5, 3, 1], [1, 3, 5])).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// mae
// ---------------------------------------------------------------------------

describe("mae", () => {
  it("[1,3] vs [1,1] → mae = 1", () => {
    expect(mae([1, 3], [1, 1])).toBeCloseTo(1, 10);
  });

  it("perfect predictions → mae = 0", () => {
    expect(mae([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
  });

  it("throws on mismatched lengths", () => {
    expect(() => mae([1, 2], [1])).toThrow();
  });

  it("always non-negative", () => {
    expect(mae([5, 3, 1], [1, 3, 5])).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// pearsonCorrelation
// ---------------------------------------------------------------------------

describe("pearsonCorrelation", () => {
  it("identical arrays → correlation ≈ 1", () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 8);
  });

  it("inverse arrays → correlation ≈ -1", () => {
    expect(pearsonCorrelation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 8);
  });

  it("uncorrelated constant series → NaN", () => {
    expect(isNaN(pearsonCorrelation([1, 1, 1], [1, 2, 3]))).toBe(true);
  });

  it("throws on mismatched lengths", () => {
    expect(() => pearsonCorrelation([1, 2], [1])).toThrow();
  });

  it("result in [-1, 1] for normal data", () => {
    const r = pearsonCorrelation([1, 3, 5, 2, 4], [2, 5, 3, 4, 1]);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// zScore
// ---------------------------------------------------------------------------

describe("zScore", () => {
  it("zScore(12, 10, 2) → 1", () => {
    expect(zScore(12, 10, 2)).toBeCloseTo(1, 10);
  });

  it("zScore(8, 10, 2) → -1", () => {
    expect(zScore(8, 10, 2)).toBeCloseTo(-1, 10);
  });

  it("returns 0 if stdDev = 0", () => {
    expect(zScore(5, 3, 0)).toBe(0);
  });

  it("returns 0 for value equal to mean", () => {
    expect(zScore(5, 5, 2)).toBeCloseTo(0, 10);
  });
});

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe("normalize", () => {
  it("[0, 5, 10] → [0, 0.5, 1]", () => {
    const result = normalize([0, 5, 10]);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(0.5, 10);
    expect(result[2]).toBeCloseTo(1, 10);
  });

  it("all same values → all 0s", () => {
    const result = normalize([7, 7, 7]);
    result.forEach((v) => expect(v).toBe(0));
  });

  it("returns same-length array", () => {
    expect(normalize([1, 2, 3, 4]).length).toBe(4);
  });

  it("all output values in [0, 1]", () => {
    const result = normalize([5, 1, 3, 9, 2]);
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it("empty array returns empty array", () => {
    expect(normalize([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// standardize
// ---------------------------------------------------------------------------

describe("standardize", () => {
  it("[2, 4, 6] → mean ≈ 0", () => {
    const result = standardize([2, 4, 6]);
    const m = result.reduce((a, b) => a + b, 0) / result.length;
    expect(m).toBeCloseTo(0, 8);
  });

  it("std dev of output ≈ 1 for non-constant input", () => {
    const result = standardize([2, 4, 6]);
    const mean = result.reduce((a, b) => a + b, 0) / result.length;
    const variance =
      result.reduce((a, v) => a + (v - mean) ** 2, 0) / result.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 8);
  });

  it("constant input → all 0s", () => {
    const result = standardize([3, 3, 3]);
    result.forEach((v) => expect(v).toBe(0));
  });

  it("returns same-length array", () => {
    expect(standardize([1, 2, 3, 4]).length).toBe(4);
  });

  it("empty array returns empty array", () => {
    expect(standardize([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// bollingerBands
// ---------------------------------------------------------------------------

describe("bollingerBands", () => {
  it("output length = data.length - window + 1", () => {
    const result = bollingerBands([1, 2, 3, 4, 5], 3);
    expect(result.length).toBe(3);
  });

  it("middle equals sma", () => {
    const data = [2, 4, 6, 8, 10];
    const middles = sma(data, 3);
    const bands = bollingerBands(data, 3);
    bands.forEach((b, i) => expect(b.middle).toBeCloseTo(middles[i]!, 10));
  });

  it("upper > middle and middle > lower for non-constant data", () => {
    const data = [2, 4, 6, 8, 10, 3, 7];
    const bands = bollingerBands(data, 3);
    bands.forEach((b) => {
      expect(b.upper).toBeGreaterThanOrEqual(b.middle);
      expect(b.middle).toBeGreaterThanOrEqual(b.lower);
    });
  });

  it("upper = lower = middle for constant data", () => {
    const data = [5, 5, 5, 5, 5];
    const bands = bollingerBands(data, 3);
    bands.forEach((b) => {
      expect(b.upper).toBeCloseTo(b.middle, 8);
      expect(b.lower).toBeCloseTo(b.middle, 8);
    });
  });

  it("custom multiplier is respected", () => {
    const data = [1, 2, 3, 4, 5];
    const bands2 = bollingerBands(data, 3, 2);
    const bands4 = bollingerBands(data, 3, 4);
    bands2.forEach((b2, i) => {
      const b4 = bands4[i]!;
      expect(b4.upper).toBeGreaterThanOrEqual(b2.upper - 1e-9);
      expect(b4.lower).toBeLessThanOrEqual(b2.lower + 1e-9);
    });
  });
});

// ---------------------------------------------------------------------------
// exponentialSmoothing
// ---------------------------------------------------------------------------

describe("exponentialSmoothing", () => {
  it("same result as ema", () => {
    const data = [1, 3, 5, 7, 9];
    const alpha = 0.4;
    const e = ema(data, alpha);
    const es = exponentialSmoothing(data, alpha);
    e.forEach((v, i) => expect(es[i]).toBeCloseTo(v, 10));
  });

  it("same length as input", () => {
    expect(exponentialSmoothing([1, 2, 3], 0.5).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// rsi
// ---------------------------------------------------------------------------

describe("rsi", () => {
  it("all output values in [0, 100]", () => {
    const data = [44, 45, 48, 47, 50, 52, 49, 51, 55, 53, 57, 56, 58, 60, 59, 62, 65];
    const result = rsi(data, 14);
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it("output length = data.length - period", () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = rsi(data, 14);
    expect(result.length).toBe(6);
  });

  it("returns [] when data.length <= period", () => {
    const data = [1, 2, 3, 4, 5];
    expect(rsi(data, 5)).toEqual([]);
    expect(rsi(data, 10)).toEqual([]);
  });

  it("RSI = 100 when all changes are gains", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const result = rsi(data, 14);
    // All gains, no losses → RSI approaches 100
    result.forEach((v) => expect(v).toBeGreaterThan(90));
  });

  it("RSI = 0 when all changes are losses", () => {
    const data = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const result = rsi(data, 14);
    // All losses → RSI approaches 0
    result.forEach((v) => expect(v).toBeLessThan(10));
  });
});

// ---------------------------------------------------------------------------
// cumsum
// ---------------------------------------------------------------------------

describe("cumsum", () => {
  it("[1,2,3] → [1,3,6]", () => {
    expect(cumsum([1, 2, 3])).toEqual([1, 3, 6]);
  });

  it("empty array → empty array", () => {
    expect(cumsum([])).toEqual([]);
  });

  it("single element → same element", () => {
    expect(cumsum([7])).toEqual([7]);
  });

  it("handles negative values", () => {
    expect(cumsum([1, -1, 1, -1])).toEqual([1, 0, 1, 0]);
  });

  it("same length as input", () => {
    expect(cumsum([5, 3, 2, 1]).length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

describe("diff", () => {
  it("[1,3,6] lag=1 → [2,3]", () => {
    expect(diff([1, 3, 6])).toEqual([2, 3]);
  });

  it("[1,3,6,10] lag=2 → [5,7]", () => {
    expect(diff([1, 3, 6, 10], 2)).toEqual([5, 7]);
  });

  it("output length = data.length - lag", () => {
    expect(diff([1, 2, 3, 4, 5], 2).length).toBe(3);
  });

  it("returns [] when data too short", () => {
    expect(diff([1, 2], 3)).toEqual([]);
  });

  it("throws for lag <= 0", () => {
    expect(() => diff([1, 2, 3], 0)).toThrow();
  });

  it("default lag is 1", () => {
    expect(diff([10, 12, 15])).toEqual([2, 3]);
  });
});

// ---------------------------------------------------------------------------
// autocorrelation
// ---------------------------------------------------------------------------

describe("autocorrelation", () => {
  it("increasing series lag=1 → positive correlation", () => {
    const r = autocorrelation([1, 2, 3, 4, 5], 1);
    expect(r).toBeGreaterThan(0);
  });

  it("alternating series lag=1 → negative correlation", () => {
    const r = autocorrelation([1, -1, 1, -1, 1, -1, 1, -1], 1);
    expect(r).toBeLessThan(0);
  });

  it("result in [-1, 1]", () => {
    const r = autocorrelation([1, 3, 2, 5, 4, 6], 1);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("throws for lag <= 0", () => {
    expect(() => autocorrelation([1, 2, 3], 0)).toThrow();
  });

  it("returns NaN when data too short for lag", () => {
    expect(isNaN(autocorrelation([1, 2], 3))).toBe(true);
  });

  it("lag=2 returns a number for sufficient data", () => {
    const r = autocorrelation([1, 2, 3, 4, 5, 6, 7], 2);
    expect(typeof r).toBe("number");
    expect(isNaN(r)).toBe(false);
  });
});
