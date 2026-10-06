import { describe, expect, it } from "vitest";
import {
  fitLogisticScale,
  maturityCoverageGate,
  noiseCorrectionVariance,
  predictionScaleWp,
  ratingMaturity,
} from "./elo-scales-2604.js";

describe("elo scales", () => {
  it("maturity grows with games played", () => {
    const base = { rankingRating: 1500, logisticScale: 0.006, gamesPlayed: 10, k: 20 };
    expect(ratingMaturity({ ...base, gamesPlayed: 100 })).toBeGreaterThan(ratingMaturity(base));
    expect(ratingMaturity(base)).toBeCloseTo((4 * 0.006 * 10) / 20, 9);
  });

  it("noise correction is sK/2", () => {
    expect(noiseCorrectionVariance(0.006, 20)).toBeCloseTo(0.06, 9);
    expect(Number.isNaN(noiseCorrectionVariance(-1, 20))).toBe(true);
  });

  it("prediction-scale WP is a proper probability", () => {
    expect(predictionScaleWp(0, 0.006)).toBeCloseTo(0.5, 9);
    expect(predictionScaleWp(200, 0.006)).toBeGreaterThan(0.5);
    expect(predictionScaleWp(-200, 0.006)).toBeLessThan(0.5);
  });

  it("fitLogisticScale recovers the generating scale", () => {
    const diffs: number[] = [];
    const outcomes: number[] = [];
    const sTrue = 0.008;
    for (let i = 0; i < 400; i++) {
      const d = (i % 40) * 10 - 200;
      const p = 1 / (1 + Math.exp(-sTrue * d));
      const u = (i * 0.61803398875) % 1;
      diffs.push(d);
      outcomes.push(u < p ? 1 : 0);
    }
    const fit = fitLogisticScale(diffs, outcomes);
    expect(fit.logisticScale).toBeGreaterThan(0);
    expect(Math.abs(fit.logisticScale - sTrue) / sTrue).toBeLessThan(0.25);
  });

  it("maturity coverage gate detects worse low-maturity coverage", () => {
    const teams: Array<{ tau: number; intervalCovered: boolean }> = [];
    for (let i = 0; i < 200; i++) {
      const low = i < 100;
      teams.push({
        tau: low ? 1 : 10,
        intervalCovered: (i * 0.61803398875) % 1 < (low ? 0.55 : 0.72),
      });
    }
    const g = maturityCoverageGate(teams);
    expect(g.lowMaturityCover).toBeLessThan(g.highMaturityCover);
    expect(g.lowCoversLess).toBe(true);
  });

  it("handles empty and malformed input", () => {
    expect(Number.isNaN(fitLogisticScale([], []).logisticScale)).toBe(true);
    expect(Number.isNaN(predictionScaleWp(100, -1))).toBe(true);
    expect(ratingMaturity({ rankingRating: 1500, logisticScale: 0.006, gamesPlayed: 5, k: 0 })).toBe(0);
    const g = maturityCoverageGate([]);
    expect(g.lowCoversLess).toBe(false);
  });
});
