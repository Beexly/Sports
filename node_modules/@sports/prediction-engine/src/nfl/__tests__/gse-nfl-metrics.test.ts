import { describe, expect, it } from "vitest";
import { gseExpectedCompletion } from "../expected-completion.js";
import { gseExpectedYac } from "../expected-yac.js";
import { evaluateMetricDrift } from "../metric-drift.js";
import { GSE_NFL_METRIC_BIRTH_CERTIFICATES, metricBirthCertificate } from "../metric-birth-certificate.js";
import { validateGseMetric } from "../metric-validation.js";
import { gseQbBurden } from "../qb-burden.js";
import { gseReceiverDifficulty } from "../receiver-difficulty.js";
import { gseRoleVolatility } from "../role-volatility.js";
import { gseRushEnvironment } from "../rush-environment.js";
import type { MetricSourcePolicy } from "../metric-core.js";

const allowedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "allowed",
};

const blockedSource: MetricSourcePolicy = {
  allowedForModeling: false,
  sourceId: "unlicensed-tracking",
  status: "blocked",
};

describe("GSE NFL proprietary metrics v0", () => {
  it("keeps GSE xCOMP deterministic and directionally sane", () => {
    const easy = gseExpectedCompletion({
      airYards: 3,
      pressureProxy: 0,
      qbPrior: 0.75,
      receiverPrior: 0.7,
      sampleSize: 400,
      sourcePolicy: [allowedSource],
      yardsToGo: 3,
    });
    const hard = gseExpectedCompletion({
      airYards: 34,
      pressureProxy: 0.9,
      qbPrior: 0.75,
      receiverPrior: 0.7,
      sampleSize: 400,
      sourcePolicy: [allowedSource],
      weatherPenalty: 0.6,
      yardsToGo: 13,
    });

    expect(hard.probability).toBeLessThan(easy.probability);
    expect(hard.difficultyIndex).toBeGreaterThan(easy.difficultyIndex);
    expect(easy.probability).toBeGreaterThanOrEqual(0);
    expect(easy.probability).toBeLessThanOrEqual(1);
    expect(Object.prototype.hasOwnProperty.call(easy.drivers[0], "weight")).toBe(false);
  });

  it("increases receiver difficulty and QB burden on hard passing contexts", () => {
    const easyTarget = gseReceiverDifficulty({
      airYards: 5,
      expectedCompletionProbability: 0.78,
      sampleSize: 300,
      separationYards: 5,
      sourcePolicy: [allowedSource],
    });
    const hardTarget = gseReceiverDifficulty({
      airYards: 28,
      contestedCatchProxy: 0.9,
      expectedCompletionProbability: 0.34,
      sampleSize: 300,
      separationYards: 0.8,
      sidelineProxy: 0.8,
      sourcePolicy: [allowedSource],
    });
    const burden = gseQbBurden({
      averageYardsToGo: 11,
      completionDifficulty: hardTarget.difficultyIndex / 100,
      pressureProxy: 0.8,
      receiverSeparationDeficit: 0.85,
      sampleSize: 300,
      sourcePolicy: [allowedSource],
    });

    expect(hardTarget.difficultyIndex).toBeGreaterThan(easyTarget.difficultyIndex);
    expect(burden.burdenIndex).toBeGreaterThan(60);
    expect(burden.status).toBe("SHADOW");
  });

  it("estimates YAC and rush environment without private tracking outputs", () => {
    const yac = gseExpectedYac({
      airYards: 4,
      cushionYards: 8,
      inSpaceProxy: 0.9,
      receiverYacPrior: 0.8,
      sampleSize: 280,
      separationYards: 5,
      sourcePolicy: [allowedSource],
    });
    const poorRush = gseRushEnvironment({
      defensiveFrontStrength: 0.9,
      favorableDownDistance: 0.2,
      offensiveLineProxy: 0.25,
      positiveGameScript: 0.1,
      redZoneSpace: 0.2,
      sampleSize: 280,
      sourcePolicy: [allowedSource],
    });
    const goodRush = gseRushEnvironment({
      boxLightnessProxy: 0.8,
      defensiveFrontStrength: 0.25,
      favorableDownDistance: 0.8,
      offensiveLineProxy: 0.82,
      positiveGameScript: 0.7,
      redZoneSpace: 0.65,
      sampleSize: 280,
      sourcePolicy: [allowedSource],
      weatherRunBoost: 0.6,
    });

    expect(yac.expectedYac).toBeGreaterThan(6);
    expect(goodRush.environmentIndex).toBeGreaterThan(poorRush.environmentIndex);
    expect(goodRush.sourcePolicy).toEqual([allowedSource]);
  });

  it("raises role volatility for usage and injury shocks", () => {
    const stable = gseRoleVolatility({
      sampleGames: 8,
      snapShareDelta: 0.02,
      sourcePolicy: [allowedSource],
      targetShareDelta: 0.01,
    });
    const unstable = gseRoleVolatility({
      depthChartChange: true,
      injuryStatusChanged: true,
      sampleGames: 2,
      snapShareDelta: 0.28,
      sourcePolicy: [allowedSource],
      targetShareDelta: 0.19,
      teammateInjuryShock: true,
    });

    expect(unstable.volatilityIndex).toBeGreaterThan(stable.volatilityIndex);
    expect(unstable.uncertaintyBand).toBe("HIGH");
  });

  it("requires birth certificates and fails closed on source or validation gaps", () => {
    const certificate = metricBirthCertificate("gse-xcomp");
    const blocked = validateGseMetric({
      metricId: "gse-xcomp",
      sampleSize: 500,
      sourcePolicy: [blockedSource],
      validationMethods: certificate?.validationMethods ?? [],
    });
    const ready = validateGseMetric({
      driftStatus: "STABLE",
      metricId: "gse-xcomp",
      sampleSize: 500,
      sourcePolicy: [allowedSource],
      validationMethods: certificate?.validationMethods ?? [],
    });

    expect(certificate?.status).toBe("SHADOW");
    expect(blocked.allowed).toBe(false);
    expect(blocked.status).toBe("FAIL_CLOSED");
    expect(ready.allowed).toBe(true);
    expect(ready.status).toBe("REVIEW_READY");
    expect(GSE_NFL_METRIC_BIRTH_CERTIFICATES.every((entry) => entry.status === "SHADOW")).toBe(true);
  });

  it("flags metric drift with PSI thresholds", () => {
    const stable = evaluateMetricDrift({
      actualDistribution: [0.21, 0.29, 0.3, 0.2],
      expectedDistribution: [0.2, 0.3, 0.3, 0.2],
    });
    const alert = evaluateMetricDrift({
      actualDistribution: [0.05, 0.1, 0.25, 0.6],
      expectedDistribution: [0.25, 0.25, 0.25, 0.25],
    });

    expect(stable.status).toBe("STABLE");
    expect(alert.status).toBe("ALERT");
    expect(alert.psi).toBeGreaterThan(0.25);
  });
});
