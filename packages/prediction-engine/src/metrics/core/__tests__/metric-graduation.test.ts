import { describe, expect, it } from "vitest";
import { evaluateMetricGraduation } from "../metric-graduation.js";
import {
  requireMetricAsset,
  type GseMetricAsset,
  type SourceRightsEnvelope,
} from "../metric-asset.js";

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

describe("evaluateMetricGraduation", () => {
  it("returns BLOCKED_SOURCE_RIGHTS when the envelope is missing", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({ sourceRights: [] }),
      requestedExposure: "API_FULL",
    });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.approvedExposure).toBe("NONE");
    expect(decision.reasons).toEqual(["missing source-rights envelope"]);
  });

  it("returns BLOCKED_SOURCE_RIGHTS when any source forbids modeling", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        sourceRights: [{ ...cleanSourceRight, mayUseForModeling: false }],
      }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.approvedExposure).toBe("NONE");
    expect(decision.reasons).toEqual(["fixture-cleared-derived-source blocks modeling"]);
  });

  it("returns BLOCKED_SOURCE_RIGHTS for API routes when a source forbids derived exposure", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        sourceRights: [{ ...cleanSourceRight, mayExposeDerived: false }],
      }),
      requestedExposure: "API_LIMITED",
    });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.reasons).toEqual([
      "fixture-cleared-derived-source blocks derived API exposure",
    ]);
  });

  it("does not treat missing derived-exposure rights as a content-aggregate source block", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        sourceRights: [{ ...cleanSourceRight, mayExposeDerived: false }],
      }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(decision.status).toBe("APPROVED_FOR_CONTENT");
    expect(decision.approvedExposure).toBe("CONTENT_AGGREGATE");
  });

  it("collects modeling and derived-API source blocks together", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        sourceRights: [
          { ...cleanSourceRight, mayUseForModeling: false, sourceId: "blocked-modeling" },
          { ...cleanSourceRight, mayExposeDerived: false, sourceId: "blocked-derived" },
        ],
      }),
      requestedExposure: "API_FULL",
    });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.reasons).toEqual([
      "blocked-modeling blocks modeling",
      "blocked-derived blocks derived API exposure",
    ]);
  });

  it("returns BLOCKED_SAMPLE when sampleSize is below the requested minimum", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: { ...readyAsset().validationReport, sampleSize: 20 },
      }),
      minimumSampleSize: 100,
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(decision.status).toBe("BLOCKED_SAMPLE");
    expect(decision.approvedExposure).toBe("NONE");
    expect(decision.reasons).toEqual(["sample_size 20 is below minimum 100"]);
  });

  it("uses the asset validation minimum when minimumSampleSize is omitted", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: {
          ...readyAsset().validationReport,
          minimumSampleSize: 400,
          sampleSize: 399,
        },
      }),
      requestedExposure: "INTERNAL",
    });

    expect(decision.status).toBe("BLOCKED_SAMPLE");
    expect(decision.reasons).toEqual(["sample_size 399 is below minimum 400"]);
  });

  it("does not sample-block when sampleSize equals the minimum", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: {
          ...readyAsset().validationReport,
          minimumSampleSize: 100,
          sampleSize: 100,
        },
      }),
      requestedExposure: "INTERNAL",
    });

    expect(decision.status).toBe("REVIEW_READY");
  });

  it("returns BLOCKED_MODEL_CARD unless the model card is READY", () => {
    const missing = evaluateMetricGraduation({
      asset: readyAsset({ modelCard: { ...readyAsset().modelCard, status: "MISSING" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const draft = evaluateMetricGraduation({
      asset: readyAsset({ modelCard: { ...readyAsset().modelCard, status: "DRAFT" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(missing.status).toBe("BLOCKED_MODEL_CARD");
    expect(missing.reasons).toEqual(["model_card_status MISSING is not READY"]);
    expect(draft.status).toBe("BLOCKED_MODEL_CARD");
    expect(draft.reasons).toEqual(["model_card_status DRAFT is not READY"]);
    expect(missing.approvedExposure).toBe("NONE");
  });

  it("returns BLOCKED_VALIDATION unless the validation report is PASS", () => {
    const failed = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: { ...readyAsset().validationReport, status: "FAIL" },
      }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const missing = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: { ...readyAsset().validationReport, status: "MISSING" },
      }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const insufficient = evaluateMetricGraduation({
      asset: readyAsset({
        validationReport: { ...readyAsset().validationReport, status: "INSUFFICIENT" },
      }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(failed.status).toBe("BLOCKED_VALIDATION");
    expect(failed.reasons).toEqual(["validation_status FAIL is not PASS"]);
    expect(missing.status).toBe("BLOCKED_VALIDATION");
    expect(insufficient.status).toBe("BLOCKED_VALIDATION");
    expect(failed.approvedExposure).toBe("NONE");
  });

  it("returns BLOCKED_DRIFT for MISSING or SEVERE drift, but not STABLE or WATCH", () => {
    const missing = evaluateMetricGraduation({
      asset: readyAsset({ driftCard: { ...readyAsset().driftCard, status: "MISSING" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const severe = evaluateMetricGraduation({
      asset: readyAsset({ driftCard: { ...readyAsset().driftCard, status: "SEVERE" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const watch = evaluateMetricGraduation({
      asset: readyAsset({ driftCard: { ...readyAsset().driftCard, status: "WATCH" } }),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(missing.status).toBe("BLOCKED_DRIFT");
    expect(missing.reasons).toEqual(["drift_status MISSING blocks graduation"]);
    expect(severe.status).toBe("BLOCKED_DRIFT");
    expect(severe.reasons).toEqual(["drift_status SEVERE blocks graduation"]);
    expect(watch.status).toBe("APPROVED_FOR_CONTENT");
    expect(missing.approvedExposure).toBe("NONE");
  });

  it("blocks SHADOW metrics from API routes as BLOCKED_VALIDATION after earlier gates pass", () => {
    const shadowAsset = readyAsset({
      birthCertificate: { ...readyAsset().birthCertificate, status: "SHADOW" },
    });

    const limited = evaluateMetricGraduation({
      asset: shadowAsset,
      requestedExposure: "API_LIMITED",
    });
    const full = evaluateMetricGraduation({
      asset: shadowAsset,
      requestedExposure: "API_FULL",
    });
    const content = evaluateMetricGraduation({
      asset: shadowAsset,
      requestedExposure: "CONTENT_AGGREGATE",
    });
    const internal = evaluateMetricGraduation({
      asset: shadowAsset,
      requestedExposure: "INTERNAL",
    });

    expect(limited.status).toBe("BLOCKED_VALIDATION");
    expect(limited.reasons).toEqual(["SHADOW metrics cannot be exposed through API routes"]);
    expect(limited.approvedExposure).toBe("NONE");
    expect(full.status).toBe("BLOCKED_VALIDATION");
    expect(full.reasons).toEqual(["SHADOW metrics cannot be exposed through API routes"]);
    expect(content.status).toBe("APPROVED_FOR_CONTENT");
    expect(internal.status).toBe("REVIEW_READY");
  });

  it("returns REVIEW_READY for internal review exposures once all gates pass", () => {
    const internal = evaluateMetricGraduation({
      asset: readyAsset(),
      requestedExposure: "INTERNAL",
    });
    const none = evaluateMetricGraduation({
      asset: readyAsset(),
      requestedExposure: "NONE",
    });

    expect(internal).toEqual({
      approvedExposure: "INTERNAL",
      reasons: ["internal review gates passed"],
      status: "REVIEW_READY",
    });
    expect(none).toEqual({
      approvedExposure: "NONE",
      reasons: ["internal review gates passed"],
      status: "REVIEW_READY",
    });
  });

  it("returns APPROVED_FOR_CONTENT for CONTENT_AGGREGATE once all gates pass", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset(),
      requestedExposure: "CONTENT_AGGREGATE",
    });

    expect(decision).toEqual({
      approvedExposure: "CONTENT_AGGREGATE",
      reasons: ["content aggregate graduation gates passed"],
      status: "APPROVED_FOR_CONTENT",
    });
  });

  it("returns APPROVED_FOR_API for API_FULL and API_LIMITED once all gates pass", () => {
    const full = evaluateMetricGraduation({
      asset: readyAsset(),
      requestedExposure: "API_FULL",
    });
    const limited = evaluateMetricGraduation({
      asset: readyAsset(),
      requestedExposure: "API_LIMITED",
    });

    expect(full).toEqual({
      approvedExposure: "API_FULL",
      reasons: ["all API graduation gates passed"],
      status: "APPROVED_FOR_API",
    });
    expect(limited).toEqual({
      approvedExposure: "API_LIMITED",
      reasons: ["all API graduation gates passed"],
      status: "APPROVED_FOR_API",
    });
  });

  it("fails closed on source rights before later sample, card, validation, or drift reasons", () => {
    const decision = evaluateMetricGraduation({
      asset: readyAsset({
        driftCard: { ...readyAsset().driftCard, status: "SEVERE" },
        modelCard: { ...readyAsset().modelCard, status: "MISSING" },
        sourceRights: [],
        validationReport: {
          ...readyAsset().validationReport,
          sampleSize: 1,
          status: "FAIL",
        },
      }),
      requestedExposure: "API_FULL",
    });

    expect(decision.status).toBe("BLOCKED_SOURCE_RIGHTS");
    expect(decision.reasons).toEqual(["missing source-rights envelope"]);
  });
});
