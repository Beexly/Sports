import { describe, it, expect } from "vitest";
import {
  pearsonCorrelation,
  diversityStatistic,
  herdingFlag,
  geometricMeanAggregate,
  couplingScore,
} from "@/lib/calibration/ensemble-independence";

// ============================================================
// arXiv 1204.3463 — ensemble independence audit. Additive only.
// ============================================================

describe("ensemble independence — 1204.3463", () => {
  it("pearsonCorrelation is 1 for perfectly correlated vectors", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it("pearsonCorrelation handles degenerate input", () => {
    expect(pearsonCorrelation([], [])).toBe(0);
    expect(pearsonCorrelation([1, 2], [1])).toBe(0);
    expect(pearsonCorrelation([3, 3, 3], [3, 3, 3])).toBe(1);
    expect(pearsonCorrelation([3, 3, 3], [1, 2, 3])).toBe(0);
  });

  it("diversityStatistic is ~0 when components herd exactly", () => {
    const f = [0.6, 0.7, 0.55, 0.8];
    expect(diversityStatistic([f, [...f], [...f]])).toBeCloseTo(0, 10);
  });

  it("diversityStatistic is ~1 for uncorrelated components", () => {
    const a = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6];
    const b = [0.5, 0.5, 0.9, 0.1, 0.5, 0.5, 0.1, 0.9];
    const d = diversityStatistic([a, b]);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThanOrEqual(2);
  });

  it("diversityStatistic handles degenerate input", () => {
    expect(diversityStatistic([])).toBe(1);
    expect(diversityStatistic([[0.5]])).toBe(1);
  });

  it("herdingFlag fires only on collapse-without-error-improvement", () => {
    expect(herdingFlag(0.05, 0.5, 0.2, 0.2)).toBe(true); // collapsed, error flat
    expect(herdingFlag(0.05, 0.5, 0.1, 0.2)).toBe(false); // collapsed but error fell
    expect(herdingFlag(0.5, 0.5, 0.2, 0.2)).toBe(false); // no collapse
  });

  it("geometricMeanAggregate matches the closed form", () => {
    expect(geometricMeanAggregate([4, 9])).toBeCloseTo(6, 10);
    expect(geometricMeanAggregate([5, 5, 5])).toBeCloseTo(5, 10);
  });

  it("geometricMeanAggregate rejects non-positive / empty input", () => {
    expect(geometricMeanAggregate([])).toBeNaN();
    expect(geometricMeanAggregate([4, 0])).toBeNaN();
    expect(geometricMeanAggregate([4, -2])).toBeNaN();
  });

  it("couplingScore counts shared input channels", () => {
    expect(
      couplingScore({
        elo: ["market-lines", "nflverse"],
        market: ["market-lines"],
        weather: ["weather-feeds"],
      }),
    ).toBeCloseTo(1 / 3, 10);
    expect(couplingScore({})).toBe(0);
    expect(couplingScore({ a: ["x"] })).toBe(0);
  });
});
