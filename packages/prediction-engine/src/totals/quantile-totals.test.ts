import { describe, expect, it } from "vitest";
import {
  fitQuantileRegression,
  fitTotalsQuantiles,
  meanPinballLoss,
  pinballLoss,
  predictTotalQuantile,
  quantileCoverage,
  type TotalsGame,
} from "./quantile-totals";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Totals with a weather-band effect on the log scale. */
function simmed(seed = 4, n = 500): TotalsGame[] {
  const rand = mulberry32(seed);
  const games: TotalsGame[] = [];
  for (let i = 0; i < n; i++) {
    const badWeather = rand() < 0.4 ? 1 : 0;
    const logTotal = Math.log(45) - 0.25 * badWeather + (rand() + rand() + rand() - 1.5) * 0.12;
    games.push({ total: Math.exp(logTotal), features: [badWeather] });
  }
  return games;
}

describe("quantile-totals", () => {
  it("pinball loss is minimized at the true quantile", () => {
    const ys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const at = (q: number): number =>
      ys.reduce((a, y) => a + pinballLoss(y, q, 0.5), 0) / ys.length;
    expect(at(5.5)).toBeLessThan(at(3));
    expect(at(5.5)).toBeLessThan(at(8));
    expect(() => pinballLoss(1, 2, 0)).toThrow();
    expect(() => pinballLoss(1, 2, 1)).toThrow();
  });

  it("fitQuantileRegression recovers conditional quantiles", () => {
    const rand = mulberry32(6);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 600; i++) {
      const x = rand() * 2 - 1;
      X.push([x]);
      y.push(2 + 3 * x + (rand() * 2 - 1)); // uniform noise in [-1, 1]
    }
    const b50 = fitQuantileRegression(X, y, 0.5, { iters: 1500 })!;
    const b90 = fitQuantileRegression(X, y, 0.9, { iters: 1500 })!;
    // Median line ~= 2 + 3x.
    expect(b50[0]).toBeCloseTo(2, 0);
    expect(b50[1]).toBeCloseTo(3, 0);
    // 90th percentile of U[-1,1] noise is 0.8 above the median line.
    expect((b90[0] ?? 0) - (b50[0] ?? 0)).toBeCloseTo(0.8, 0);
    expect(fitQuantileRegression([], [], 0.5)).toBeNull();
    expect(() => fitQuantileRegression([[1], [1, 2]], [1, 2], 0.5)).toThrow();
  });

  it("totals model attains nominal coverage and beats the median-only baseline", () => {
    const games = simmed();
    const model = fitTotalsQuantiles(games)!;
    expect(model).not.toBeNull();
    for (const tau of [0.1, 0.5, 0.9]) {
      const cov = quantileCoverage(model, games, tau);
      expect(cov).toBeGreaterThan(tau - 0.12);
      expect(cov).toBeLessThan(tau + 0.12);
    }
    // Monotone quantiles on the training distribution.
    const qs = [0.1, 0.25, 0.5, 0.75, 0.9].map((t) =>
      predictTotalQuantile(model, [0], t),
    );
    for (let i = 1; i < qs.length; i++) expect(qs[i] ?? 0).toBeGreaterThan(qs[i - 1] ?? 0);
    // Pinball at 0.9 beats a constant-median forecast.
    const med = [...games.map((g) => g.total)].sort((a, b) => a - b)[250] ?? 0;
    const actuals = games.map((g) => g.total);
    const modelQ = games.map((g) => predictTotalQuantile(model, g.features, 0.9));
    expect(meanPinballLoss(actuals, modelQ, 0.9)).toBeLessThan(
      meanPinballLoss(actuals, actuals.map(() => med), 0.9),
    );
    expect(() => predictTotalQuantile(model, [0], 0.33)).toThrow();
  });

  it("degenerate input is handled", () => {
    expect(fitTotalsQuantiles([])).toBeNull();
    expect(() => fitTotalsQuantiles([{ total: -5, features: [0] }])).toThrow();
    expect(() => meanPinballLoss([1], [1, 2], 0.5)).toThrow();
    expect(() => meanPinballLoss([], [], 0.5)).toThrow();
    expect(() => quantileCoverage(fitTotalsQuantiles(simmed(9, 50))!, [], 0.5)).toThrow();
  });
});
