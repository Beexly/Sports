import { describe, expect, it } from "vitest";
import {
  buildMetricResidualRollup,
  generateMetricDriftCard,
  generateMetricModelCard,
  requireMetricAsset,
  type MetricValidationReport,
} from "../core/index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

const blockedPolicy: MetricSourcePolicy = {
  allowedForModeling: false,
  sourceId: "restricted-tracking-feed",
  status: "blocked",
};

const passingValidation: MetricValidationReport = {
  evidenceRefs: ["fixture-validation-report"],
  measures: [{ name: "residual_directionality", passed: true, threshold: 0, value: 0.22 }],
  minimumSampleSize: 50,
  sampleSize: 120,
  status: "PASS",
};

function residualRollup(source = sourcePolicy, sampleSize = 80) {
  return buildMetricResidualRollup(
    Array.from({ length: sampleSize }, (_value, index) => ({
      actualValue: 9,
      confidenceScore: 80,
      creationIndex: 66,
      expectedValue: 5,
      metricId: "yac-creation-gse",
      playerId: "wr-fixture",
      season: 2026,
      sourcePolicy: [source],
      uncertaintyBand: sampleSize >= 80 ? "LOW" : "HIGH",
      playId: `play-${index}`,
    })),
  );
}

describe("metric evidence card generators", () => {
  it("generates draft model cards by default even when validation passes", () => {
    const asset = requireMetricAsset("yac-creation-gse");
    const card = generateMetricModelCard({
      asset,
      evidenceRefs: ["fixture-rollup-report"],
      residualRollups: [residualRollup()],
      validationReport: passingValidation,
    });

    expect(card.status).toBe("DRAFT");
    expect(card.summary).toContain("generated evidence does not change lifecycle or exposure");
    expect(card.limitations).toContain("Ready status is disabled by default; owner/governance approval is still required.");
    expect(card.evidenceRefs).toContain("fixture-validation-report");
    expect(card.evidenceRefs).toContain("fixture-rollup-report");
  });

  it("allows READY status only when explicitly enabled and evidence gates pass", () => {
    const card = generateMetricModelCard({
      allowReadyStatus: true,
      asset: requireMetricAsset("rush-over-expected-gse"),
      evidenceRefs: ["fixture-review-ready-report"],
      residualRollups: [residualRollup()],
      validationReport: passingValidation,
    });

    expect(card.status).toBe("READY");
  });

  it("keeps model cards draft when residual rollups fail source posture", () => {
    const card = generateMetricModelCard({
      allowReadyStatus: true,
      asset: requireMetricAsset("yac-creation-gse"),
      evidenceRefs: ["fixture-review-ready-report"],
      residualRollups: [residualRollup(blockedPolicy)],
      validationReport: passingValidation,
    });

    expect(card.status).toBe("DRAFT");
    expect(card.limitations).toContain("At least one residual rollup has fail-closed source posture.");
  });

  it("generates stable, watch, and severe drift cards from explicit checks", () => {
    const asset = requireMetricAsset("market-gravity-index");
    const stable = generateMetricDriftCard({
      asset,
      checks: [{ name: "psi", severeThreshold: 0.3, value: 0.06, watchThreshold: 0.15 }],
      evidenceRefs: ["fixture-stable-drift"],
    });
    const watch = generateMetricDriftCard({
      asset,
      checks: [{ name: "psi", severeThreshold: 0.3, value: 0.18, watchThreshold: 0.15 }],
      evidenceRefs: ["fixture-watch-drift"],
    });
    const severe = generateMetricDriftCard({
      asset,
      checks: [{ name: "psi", severeThreshold: 0.3, value: 0.33, watchThreshold: 0.15 }],
      evidenceRefs: ["fixture-severe-drift"],
    });

    expect(stable.status).toBe("STABLE");
    expect(watch.status).toBe("WATCH");
    expect(severe.status).toBe("SEVERE");
    expect(severe.driftScore).toBe(100);
  });

  it("marks high-uncertainty rollup evidence drift WATCH, not stable proof", () => {
    const card = generateMetricDriftCard({
      asset: requireMetricAsset("yac-creation-gse"),
      residualRollups: [residualRollup(sourcePolicy, 5)],
    });

    expect(card.status).toBe("WATCH");
    expect(card.notes).toContain("At least one residual rollup has high uncertainty; keep shadow review active.");
  });

  it("returns MISSING drift card when no checks or rollup risk are supplied", () => {
    const card = generateMetricDriftCard({ asset: requireMetricAsset("expected-completion-gse") });

    expect(card.status).toBe("MISSING");
    expect(card.notes).toContain("No explicit drift checks were supplied.");
  });
});
