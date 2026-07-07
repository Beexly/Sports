import { describe, expect, it } from "vitest";
import type { MetricSourcePolicy } from "../core/validation.js";
import { portfolioFitScore, type PortfolioFitScoreInput } from "../decision/portfolio-fit-score.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "derived-board-state",
  sourceId: "fixture-derived-portfolio-state",
  status: "approved",
};

const cleanInput: PortfolioFitScoreInput = {
  bankrollFit: 88,
  calibrationDebt: 8,
  correlationRisk: 12,
  driftPressure: 10,
  duplicateThesisRisk: 10,
  edgeQualityScore: 82,
  liquidityFit: 84,
  marketTypeExposurePercent: 18,
  noBetPressure: 9,
  playableWindowScore: 82,
  playerExposurePercent: 14,
  slateExposurePercent: 22,
  sourcePolicy: [approvedSource],
  teamExposurePercent: 18,
};

describe("portfolioFitScore", () => {
  it("rewards diversified, playable, liquid portfolio candidates without emitting probability", () => {
    const result = portfolioFitScore(cleanInput);

    expect(result.metricId).toBe("portfolio-fit-score");
    expect(result.status).toBe("SHADOW");
    expect(result.probability).toBeNull();
    expect(result.confidenceMeaning).toBe("PORTFOLIO_COMPOSITION_QUALITY_NOT_WIN_PROBABILITY_OR_STAKE_ADVICE");
    expect(result.portfolioActionAllowed).toBe(true);
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.band).toBe("FIT");
    expect(result.score).toBeGreaterThan(66);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("decreases when concentration, correlation, or duplicate thesis pressure rises", () => {
    const clean = portfolioFitScore(cleanInput);
    const concentrated = portfolioFitScore({ ...cleanInput, slateExposurePercent: 78 });
    const correlated = portfolioFitScore({ ...cleanInput, correlationRisk: 72 });
    const duplicated = portfolioFitScore({ ...cleanInput, duplicateThesisRisk: 78 });
    const combined = portfolioFitScore({
      ...cleanInput,
      correlationRisk: 72,
      duplicateThesisRisk: 78,
      playerExposurePercent: 74,
    });

    expect(concentrated.score).toBeLessThan(clean.score);
    expect(correlated.score).toBeLessThan(clean.score);
    expect(duplicated.score).toBeLessThan(clean.score);
    expect(combined.score).toBeLessThan(concentrated.score);
    expect(combined.drivers.map((driver) => driver.name)).toContain("concentration_risk");
  });

  it("blocks high edge candidates when refusal pressure or source rights fail", () => {
    const highEdge = portfolioFitScore({
      ...cleanInput,
      edgeQualityScore: 99,
      noBetPressure: 90,
      playableWindowScore: 95,
    });
    const staleDebt = portfolioFitScore({
      ...cleanInput,
      calibrationDebt: 86,
      driftPressure: 82,
      edgeQualityScore: 99,
    });
    const blockedSource = portfolioFitScore({
      ...cleanInput,
      edgeQualityScore: 99,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });

    expect(highEdge.portfolioActionAllowed).toBe(false);
    expect(highEdge.band).toBe("BLOCKED");
    expect(highEdge.score).toBeLessThanOrEqual(24);
    expect(staleDebt.portfolioActionAllowed).toBe(false);
    expect(staleDebt.blockReasons.join(" ")).toContain("Drift pressure");
    expect(blockedSource.sourcePosture).toBe("BLOCKED");
    expect(blockedSource.portfolioActionAllowed).toBe(false);
  });

  it("blocks closed playable windows and extreme exposure", () => {
    const closedWindow = portfolioFitScore({ ...cleanInput, playableWindowScore: 20 });
    const overexposed = portfolioFitScore({ ...cleanInput, teamExposurePercent: 94 });

    expect(closedWindow.portfolioActionAllowed).toBe(false);
    expect(closedWindow.blockReasons.join(" ")).toContain("Playable window");
    expect(overexposed.portfolioActionAllowed).toBe(false);
    expect(overexposed.blockReasons.join(" ")).toContain("too concentrated");
    expect(overexposed.uncertaintyBand).toBe("HIGH");
  });

  it("keeps portfolio fit separate from confidence and stake advice", () => {
    const result = portfolioFitScore({
      ...cleanInput,
      correlationRisk: 48,
      duplicateThesisRisk: 42,
      liquidityFit: 56,
    });

    expect(result.confidenceScore).not.toBeCloseTo(result.score, 2);
    expect(result.birthCertificate.metricId).toBe("portfolio-fit-score");
    expect(result.probability).toBeNull();
  });

  it("classifies a max-support, low-pressure portfolio as PRIME", () => {
    const result = portfolioFitScore({
      ...cleanInput,
      bankrollFit: 100,
      correlationRisk: 0,
      duplicateThesisRisk: 0,
      edgeQualityScore: 100,
      liquidityFit: 100,
      marketTypeExposurePercent: 5,
      playableWindowScore: 100,
      playerExposurePercent: 5,
      slateExposurePercent: 5,
      teamExposurePercent: 5,
    });

    expect(result.band).toBe("PRIME");
    expect(result.score).toBeGreaterThanOrEqual(82);
    expect(result.portfolioActionAllowed).toBe(true);
  });

  it("classifies high-pressure but unblocked portfolios as POOR while still allowing action", () => {
    const result = portfolioFitScore({
      ...cleanInput,
      bankrollFit: 30,
      calibrationDebt: 75,
      correlationRisk: 79,
      driftPressure: 75,
      duplicateThesisRisk: 79,
      edgeQualityScore: 40,
      liquidityFit: 30,
      marketTypeExposurePercent: 80,
      noBetPressure: 80,
      playableWindowScore: 40,
      playerExposurePercent: 80,
      slateExposurePercent: 80,
      teamExposurePercent: 80,
    });

    expect(result.band).toBe("POOR");
    expect(result.score).toBeLessThan(48);
    expect(result.portfolioActionAllowed).toBe(true);
    expect(result.blockReasons).toHaveLength(0);
  });

  it("reports the no-bet-pressure hard-block reason in isolation", () => {
    const result = portfolioFitScore({ ...cleanInput, noBetPressure: 90 });

    expect(result.portfolioActionAllowed).toBe(false);
    expect(result.band).toBe("BLOCKED");
    expect(result.blockReasons.join(" ")).toContain("No-bet pressure");
    expect(result.blockReasons.join(" ")).not.toContain("Calibration debt");
  });

  it("reports the calibration-debt hard-block reason in isolation", () => {
    const result = portfolioFitScore({ ...cleanInput, calibrationDebt: 85 });

    expect(result.portfolioActionAllowed).toBe(false);
    expect(result.band).toBe("BLOCKED");
    expect(result.blockReasons.join(" ")).toContain("Calibration debt");
    expect(result.blockReasons.join(" ")).not.toContain("Drift pressure");
  });
});
