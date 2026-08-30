import { describe, expect, it } from "vitest";
import {
  boundedAbsoluteLoss,
  runEarnedWeightEnsembleBacktest,
  updateHedgeWeights,
  type EnsemblePredictionSample,
} from "../earned-weight-ensemble.js";

function sample(index: number): EnsemblePredictionSample {
  const actual = 12 + (index % 5);
  return {
    sampleId: `sample-${String(index).padStart(2, "0")}`,
    season: 2024,
    week: Math.floor(index / 4) + 1,
    actualFantasyPoints: actual,
    marketBaselineFantasyPoints: actual + 6,
    modelPredictions: {
      sharp: actual + (index % 2 === 0 ? 0.1 : -0.1),
      lag: actual + 8,
      noisy: actual + (index % 3 === 0 ? -5 : 5),
    },
  };
}

describe("boundedAbsoluteLoss", () => {
  it("caps extreme misses", () => {
    expect(boundedAbsoluteLoss(10, 14, 12)).toBe(4);
    expect(boundedAbsoluteLoss(10, 50, 12)).toBe(12);
  });
});

describe("updateHedgeWeights", () => {
  it("moves weight toward lower bounded loss", () => {
    const updated = updateHedgeWeights(
      { sharp: 0.5, lag: 0.5 },
      { sharp: 1, lag: 10 },
      { learningRate: 0.7, lossCap: 12 },
    );

    expect(updated.sharp ?? 0).toBeGreaterThan(updated.lag ?? 0);
    expect(Math.round(((updated.sharp ?? 0) + (updated.lag ?? 0)) * 10_000) / 10_000).toBe(1);
  });
});

describe("runEarnedWeightEnsembleBacktest", () => {
  it("scores sequential earned weights against equal-weight and market baselines", () => {
    const report = runEarnedWeightEnsembleBacktest(
      Array.from({ length: 48 }, (_, index) => sample(index + 1)),
      { learningRate: 1.2, lossCap: 10, minOutOfSampleSamples: 30 },
    );

    expect(report.sampleSize).toBe(48);
    expect(report.modelIds).toEqual(["lag", "noisy", "sharp"]);
    expect(report.finalWeights.sharp ?? 0).toBeGreaterThan(report.finalWeights.lag ?? 0);
    expect(report.ensembleMae).toBeLessThan(report.equalWeightMae);
    expect(report.ensembleMae).toBeLessThan(report.marketMae);
    expect(report.ensembleVsEqualWeight.sampleSize).toBe(48);
    expect(report.ensembleVsMarket.sampleSize).toBe(48);
    expect(report.promotionGate.passes).toBe(true);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
  });

  it("does not pass promotion gate on a thin out-of-sample sample", () => {
    const report = runEarnedWeightEnsembleBacktest(
      Array.from({ length: 10 }, (_, index) => sample(index + 1)),
      { learningRate: 1.2, lossCap: 10, minOutOfSampleSamples: 30 },
    );

    expect(report.sampleSize).toBe(10);
    expect(report.promotionGate.passes).toBe(false);
    expect(report.promotionGate.priced).toBe(false);
  });
});
