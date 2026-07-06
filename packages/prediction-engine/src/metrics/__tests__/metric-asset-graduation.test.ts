import { describe, expect, it } from "vitest";
import {
  GSE_METRIC_ASSETS,
  evaluateMetricGraduation,
  requireMetricAsset,
  type GseMetricAsset,
  type SourceRightsEnvelope,
} from "../core/index.js";

const cleanSourceRight: SourceRightsEnvelope = {
  attributionRequired: "fixture-source",
  mayExposeDerived: true,
  mayExposeRaw: false,
  mayUseForModeling: true,
  mayValidateAgainst: true,
  notes: ["Synthetic test rights envelope."],
  sourceId: "fixture-cleared-derived-source",
};

function readyAsset(overrides: Partial<GseMetricAsset> = {}): GseMetricAsset {
  const base = requireMetricAsset("market-gravity-index");
  return {
    ...base,
    birthCertificate: { ...base.birthCertificate, status: "APPROVED" },
    driftCard: {
      evidenceRefs: ["fixture-drift-card"],
      notes: ["Stable in synthetic fixture."],
      status: "STABLE",
    },
    modelCard: {
      evidenceRefs: ["fixture-model-card"],
      limitations: ["Synthetic fixture only."],
      status: "READY",
      summary: "Fixture-ready model card.",
    },
    sourceRights: [cleanSourceRight],
    validationReport: {
      evidenceRefs: ["fixture-validation-report"],
      measures: [{ name: "bucket_lift", passed: true, threshold: 0, value: 0.12 }],
      minimumSampleSize: 100,
      sampleSize: 250,
      status: "PASS",
    },
    ...overrides,
  };
}

describe("GSE metric assets and graduation", () => {
  it("wraps every Slice 1 metric in a truthful shadow asset card", () => {
    const ids = GSE_METRIC_ASSETS.map((asset) => asset.metricId);

    expect(ids).toEqual([
      "data-reliability-index",
      "market-gravity-index",
      "stale-line-risk-score",
      "expected-completion-gse",
      "qb-burden-index",
      "receiver-difficulty-index",
      "expected-yac-gse",
      "yac-creation-gse",
      "rush-environment-index",
      "expected-rush-yards-gse",
      "rush-over-expected-gse",
      "gse-signal-score",
    ]);
    for (const asset of GSE_METRIC_ASSETS) {
      expect(asset.birthCertificate.status).toBe("SHADOW");
      expect(asset.apiExposure).toBe("INTERNAL");
      expect(asset.licensingStatus).toBe("NOT_READY");
      expect(asset.modelCard.status).toBe("MISSING");
      expect(asset.validationReport.status).toBe("MISSING");
      expect(asset.driftCard.status).toBe("MISSING");
    }
  });

  it("blocks API exposure when a source forbids derived exposure", () => {
    const asset = readyAsset({
      sourceRights: [{ ...cleanSourceRight, mayExposeDerived: false }],
    });

    const decision = evaluateMetricGraduation({ asset, requestedExposure: "API_FULL" });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.reasons[0]).toContain("blocks derived API exposure");
  });

  it("blocks all graduation when modeling rights are missing", () => {
    const asset = readyAsset({
      sourceRights: [{ ...cleanSourceRight, mayUseForModeling: false }],
    });

    const decision = evaluateMetricGraduation({ asset, requestedExposure: "CONTENT_AGGREGATE" });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.reasons[0]).toContain("blocks modeling");
  });

  it("blocks low sample, missing model card, failed validation, and severe drift", () => {
    const lowSample = evaluateMetricGraduation({
      asset: readyAsset({ validationReport: { ...readyAsset().validationReport, sampleSize: 20 } }),
      minimumSampleSize: 100,
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const missingModel = evaluateMetricGraduation({
      asset: readyAsset({ modelCard: { ...readyAsset().modelCard, status: "MISSING" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const failedValidation = evaluateMetricGraduation({
      asset: readyAsset({ validationReport: { ...readyAsset().validationReport, status: "FAIL" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const severeDrift = evaluateMetricGraduation({
      asset: readyAsset({ driftCard: { ...readyAsset().driftCard, status: "SEVERE" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(lowSample.status).toBe("BLOCKED_SAMPLE");
    expect(missingModel.status).toBe("BLOCKED_MODEL_CARD");
    expect(failedValidation.status).toBe("BLOCKED_VALIDATION");
    expect(severeDrift.status).toBe("BLOCKED_DRIFT");
  });

  it("allows content aggregate review for shadow metrics but blocks API exposure", () => {
    const shadowAsset = readyAsset({
      birthCertificate: { ...readyAsset().birthCertificate, status: "SHADOW" },
    });

    const content = evaluateMetricGraduation({ asset: shadowAsset, requestedExposure: "CONTENT_AGGREGATE" });
    const api = evaluateMetricGraduation({ asset: shadowAsset, requestedExposure: "API_LIMITED" });

    expect(content.status).toBe("APPROVED_FOR_CONTENT");
    expect(api.status).toBe("BLOCKED_VALIDATION");
    expect(api.reasons[0]).toContain("SHADOW metrics cannot be exposed");
  });

  it("approves API only after all graduation gates pass on an approved metric", () => {
    const decision = evaluateMetricGraduation({ asset: readyAsset(), requestedExposure: "API_FULL" });

    expect(decision.status).toBe("APPROVED_FOR_API");
    expect(decision.approvedExposure).toBe("API_FULL");
  });
});
