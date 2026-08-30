import { describe, expect, it } from "vitest";
import {
  evaluateCalibrationEligibility,
  DEFAULT_CALIBRATION_FLOORS,
} from "@/lib/ops/calibration-eligibility";
import { resolveCalibrationPublishPolicy } from "@/lib/ops/calibration-publish-policy";

const goodMetrics = {
  n: 500,
  brier: 0.18,
  ece: 0.03,
  mce: 0.08,
  murphy: { reliability: 0.02, resolution: 0.05, uncertainty: 0.21 },
  modelVersion: "v1-live",
  dateRange: "2026-01-01…2026-08-01",
  generatedAt: "2026-08-09T12:00:00.000Z",
};

describe("evaluateCalibrationEligibility", () => {
  it("RED when no metrics", () => {
    const r = evaluateCalibrationEligibility({
      metrics: null,
      canonicalSettled: 1000,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 0,
      streakRequired: 3,
    });
    expect(r.status).toBe("RED");
    expect(r.runMeetsFloors).toBe(false);
    expect(r.consecutiveGreen).toBe(0);
  });

  it("excludes weak Brier / ECE / Murphy", () => {
    const r = evaluateCalibrationEligibility({
      metrics: { ...goodMetrics, brier: 0.30, ece: 0.10, murphy: { reliability: 0.12, resolution: 0.01, uncertainty: 0.2 } },
      canonicalSettled: 1000,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 2,
      streakRequired: 3,
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.consecutiveGreen).toBe(0);
    expect(r.reasons.some((x) => x.includes("Brier"))).toBe(true);
  });

  it("run meets floors but RED until streak K", () => {
    const r = evaluateCalibrationEligibility({
      metrics: goodMetrics,
      canonicalSettled: 1017,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 1,
      streakRequired: 3,
    });
    expect(r.runMeetsFloors).toBe(true);
    expect(r.consecutiveGreen).toBe(2);
    expect(r.status).toBe("RED");
    expect(r.reasons.some((x) => x.includes("Streak"))).toBe(true);
  });

  it("GREEN after K consecutive", () => {
    const r = evaluateCalibrationEligibility({
      metrics: goodMetrics,
      canonicalSettled: 1017,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 2,
      streakRequired: 3,
    });
    expect(r.status).toBe("GREEN");
    expect(r.consecutiveGreen).toBe(3);
    expect(r.floors.brier).toBe(DEFAULT_CALIBRATION_FLOORS.brier);
  });

  it("never treats small n as GREEN", () => {
    const r = evaluateCalibrationEligibility({
      metrics: { ...goodMetrics, n: 40 },
      canonicalSettled: 1017,
      minSettledForLearning: 100,
      settlementHealthy: true,
      consecutiveGreenPrior: 10,
      streakRequired: 1,
    });
    expect(r.status).toBe("RED");
    expect(r.reasons.some((x) => x.includes("Map n"))).toBe(true);
  });
});

describe("resolveCalibrationPublishPolicy", () => {
  it("auto-publish does not fire when auto false", () => {
    const r = resolveCalibrationPublishPolicy({
      env: {},
      eligibilityStatus: "GREEN",
      durablePublished: null,
    });
    expect(r.published).toBe(false);
    expect(r.canExposePerformanceStats).toBe(false);
    expect(r.shouldPersistPublished).toBe(false);
  });

  it("auto-publish when GREEN and AUTO true", () => {
    const r = resolveCalibrationPublishPolicy({
      env: { CALIBRATION_AUTO_PUBLISH: "true" },
      eligibilityStatus: "GREEN",
      durablePublished: null,
    });
    expect(r.published).toBe(true);
    expect(r.source).toBe("auto");
    expect(r.canExposePerformanceStats).toBe(true);
    expect(r.shouldPersistPublished).toBe(true);
  });

  it("unpublish on RED when auto on", () => {
    const r = resolveCalibrationPublishPolicy({
      env: { CALIBRATION_AUTO_PUBLISH: "true" },
      eligibilityStatus: "RED",
      durablePublished: true,
    });
    expect(r.published).toBe(false);
    expect(r.canExposePerformanceStats).toBe(false);
    expect(r.shouldPersistUnpublished).toBe(true);
  });

  it("env published still forces performance dark when RED", () => {
    const r = resolveCalibrationPublishPolicy({
      env: { CALIBRATION_PUBLISHED: "true", CALIBRATION_AUTO_PUBLISH: "false" },
      eligibilityStatus: "RED",
      durablePublished: null,
    });
    expect(r.canExposePerformanceStats).toBe(false);
  });

  it("env published + GREEN opens performance", () => {
    const r = resolveCalibrationPublishPolicy({
      env: { CALIBRATION_PUBLISHED: "true" },
      eligibilityStatus: "GREEN",
      durablePublished: null,
    });
    expect(r.published).toBe(true);
    expect(r.source).toBe("env");
    expect(r.canExposePerformanceStats).toBe(true);
  });
});

describe("publishedEffective matrix", () => {
  const K = 3;
  it.each([
    {
      name: "auto off RED",
      env: {},
      status: "RED" as const,
      streak: 0,
      durable: null as boolean | null,
      published: false,
      expose: false,
    },
    {
      name: "auto off GREEN streak met",
      env: {},
      status: "GREEN" as const,
      streak: 3,
      durable: null,
      published: false,
      expose: false,
    },
    {
      name: "auto on RED",
      env: { CALIBRATION_AUTO_PUBLISH: "true" },
      status: "RED" as const,
      streak: 0,
      durable: true,
      published: false,
      expose: false,
    },
    {
      name: "auto on GREEN streak short",
      env: { CALIBRATION_AUTO_PUBLISH: "true" },
      status: "RED" as const, // status RED while floors met mid-streak
      streak: 2,
      durable: null,
      published: false,
      expose: false,
    },
    {
      name: "auto on GREEN streak met",
      env: { CALIBRATION_AUTO_PUBLISH: "true" },
      status: "GREEN" as const,
      streak: 3,
      durable: null,
      published: true,
      expose: true,
    },
    {
      name: "env published RED",
      env: { CALIBRATION_PUBLISHED: "true" },
      status: "RED" as const,
      streak: 0,
      durable: null,
      published: false,
      expose: false,
    },
    {
      name: "env published GREEN",
      env: { CALIBRATION_PUBLISHED: "true" },
      status: "GREEN" as const,
      streak: 3,
      durable: null,
      published: true,
      expose: true,
    },
  ])("$name", ({ env, status, streak, durable, published, expose }) => {
    const r = resolveCalibrationPublishPolicy({
      env,
      eligibilityStatus: status,
      consecutiveGreen: streak,
      streakRequired: K,
      durablePublished: durable,
    });
    expect(r.publishedEffective).toBe(published);
    expect(r.canExposePerformanceStats).toBe(expose);
    expect(r.autoPublish).toBe(env.CALIBRATION_AUTO_PUBLISH === "true");
  });
});
