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

describe("C-275 deployed-version floor", () => {
  // The floors are scored on a POOLED ECE, and pooled can sit below every
  // stratum it is built from because expectedCalibrationError weights ABSOLUTE
  // per-bin gaps — strata erring in opposite directions inside one bin cancel
  // before the absolute value is taken. Measured 0.0414 below on live data
  // (pooled 0.0524 against a weighted stratum mean of 0.0938). So a pooled pass
  // does not imply the deployed model is calibrated.
  const pooledPasses = {
    ...goodMetrics,
    ece: 0.0499, // clears the 0.05 floor
    modelVersion: "v5.2.7",
  };

  const base = {
    canonicalSettled: 500,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 2,
    streakRequired: 3,
  };

  it("RED when pooled clears the floor but the deployed version does not", () => {
    // THE REGRESSION THIS EXISTS FOR. Before C-275 this read GREEN: the gate
    // certifying calibration for a model whose own rows fail the floor.
    const report = evaluateCalibrationEligibility({
      ...base,
      metrics: pooledPasses,
      deployedVersion: { key: "v5.2.7", n: 245, ece: 0.1089 },
    });
    expect(report.status).toBe("RED");
    expect(report.reasons.some((r) => r.includes("Deployed v5.2.7") && r.includes("own rows"))).toBe(true);
    expect(report.deployedVersionChecked).toBe(true);
  });

  it("RED when the deployed version has too few of its own rows to say", () => {
    const report = evaluateCalibrationEligibility({
      ...base,
      metrics: pooledPasses,
      deployedVersion: { key: "v5.2.8", n: 12, ece: 0.01 },
    });
    expect(report.status).toBe("RED");
    expect(report.reasons.some((r) => r.includes("own settled rows"))).toBe(true);
  });

  it("RED when the deployed version's ECE is not finite", () => {
    const report = evaluateCalibrationEligibility({
      ...base,
      metrics: pooledPasses,
      deployedVersion: { key: "v5.2.8", n: 300, ece: Number.NaN },
    });
    expect(report.status).toBe("RED");
    expect(report.reasons).toContain("Deployed v5.2.8 ECE missing");
  });

  it("GREEN when the deployed version clears the floor on its own rows", () => {
    // The check must not block a model that genuinely earns the pass.
    const report = evaluateCalibrationEligibility({
      ...base,
      metrics: { ...goodMetrics, modelVersion: "v5.2.8" },
      deployedVersion: { key: "v5.2.8", n: 300, ece: 0.03 },
    });
    expect(report.status).toBe("GREEN");
    expect(report.reasons).toEqual([]);
    expect(report.deployedVersion).toEqual({ key: "v5.2.8", n: 300, ece: 0.03 });
  });

  it("omitting it preserves the pre-C-275 pooled-only behaviour exactly", () => {
    const withField = evaluateCalibrationEligibility({
      ...base,
      metrics: goodMetrics,
      deployedVersion: null,
    });
    const withoutField = evaluateCalibrationEligibility({ ...base, metrics: goodMetrics });
    expect(withoutField.status).toBe(withField.status);
    expect(withoutField.reasons).toEqual(withField.reasons);
    expect(withoutField.deployedVersionChecked).toBe(false);
    expect(withoutField.deployedVersion).toBeNull();
  });

  it("can only ADD reasons — it can never turn a RED into a GREEN", () => {
    // Structural guarantee. A failing pooled run stays failing, and every
    // reason it had is still present, whatever the deployed slice says.
    const failing = { ...goodMetrics, ece: 0.4, modelVersion: "v5.2.7" };
    const pooledOnly = evaluateCalibrationEligibility({ ...base, metrics: failing });
    const withPerfectDeployed = evaluateCalibrationEligibility({
      ...base,
      metrics: failing,
      deployedVersion: { key: "v5.2.7", n: 10_000, ece: 0.0 },
    });
    expect(withPerfectDeployed.status).toBe("RED");
    for (const reason of pooledOnly.reasons) {
      expect(withPerfectDeployed.reasons).toContain(reason);
    }
  });
});
