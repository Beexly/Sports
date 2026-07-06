import { describe, expect, it } from "vitest";
import {
  GSE_METRIC_BIRTH_CERTIFICATES,
  metricBirthCertificate,
  requireMetricBirthCertificate,
} from "../core/metric-birth-certificate.js";
import {
  GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES,
  dataReliabilityIndex,
  expectedCompletionGse,
  expectedYacGse,
  gseMarketGravityIndex,
  gseSignalScore,
  proprietaryMetricBirthCertificate,
  receiverDifficultyIndex,
  rushEnvironmentIndex,
  yacCreationGse,
} from "../../index.js";

describe("metric birth certificates", () => {
  it("requires every Slice 1 metric to have a SHADOW birth certificate", () => {
    const required = [
      "data-reliability-index",
      "market-gravity-index",
      "expected-completion-gse",
      "receiver-difficulty-index",
      "expected-yac-gse",
      "yac-creation-gse",
      "rush-environment-index",
      "gse-signal-score",
    ];

    for (const metricId of required) {
      const certificate = requireMetricBirthCertificate(metricId);
      expect(certificate.status).toBe("SHADOW");
      expect(certificate.allowedInputs.length).toBeGreaterThan(0);
      expect(certificate.forbiddenInputs.length).toBeGreaterThan(0);
      expect(certificate.protectedComponents.length).toBeGreaterThan(0);
      expect(certificate.validationMethods.length).toBeGreaterThan(0);
      expect(certificate.sourceRightsRequired.length).toBeGreaterThan(0);
    }
  });

  it("keeps the registry unique and rejects unknown metrics", () => {
    const ids = GSE_METRIC_BIRTH_CERTIFICATES.map((certificate) => certificate.metricId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(metricBirthCertificate("decorative-score")).toBeNull();
  });

  it("exposes Slice 1 metrics through the prediction-engine package boundary", () => {
    expect(GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES.length).toBe(GSE_METRIC_BIRTH_CERTIFICATES.length);
    expect(proprietaryMetricBirthCertificate("gse-signal-score")?.status).toBe("SHADOW");
    expect(typeof dataReliabilityIndex).toBe("function");
    expect(typeof gseMarketGravityIndex).toBe("function");
    expect(typeof expectedCompletionGse).toBe("function");
    expect(typeof receiverDifficultyIndex).toBe("function");
    expect(typeof expectedYacGse).toBe("function");
    expect(typeof yacCreationGse).toBe("function");
    expect(typeof rushEnvironmentIndex).toBe("function");
    expect(typeof gseSignalScore).toBe("function");
  });
});
