import { describe, expect, it } from "vitest";
import {
  buildMetricResidualRollup,
  generateAllShadowMetricEvidenceFixtureCards,
  generateMetricDriftCard,
  generateMetricModelCard,
  requireMetricAsset,
  SHADOW_METRIC_EVIDENCE_FIXTURES,
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

  it("generates draft-first cards for new shadow market, passing, role, and decision metrics", () => {
    const cards = generateAllShadowMetricEvidenceFixtureCards();

    expect(cards.map((card) => card.metricId)).toEqual([
      "stale-line-risk-score",
      "qb-burden-index",
      "role-volatility-index",
      "calibration-integrity-grade",
      "drift-pressure-index",
      "conformal-uncertainty-width",
      "no-bet-pressure",
      "playable-window-score",
      "portfolio-fit-score",
      "market-mirage-score",
    ]);

    for (const card of cards) {
      expect(card.lifecycleStatus).toBe("SHADOW");
      expect(card.apiExposure).toBe("INTERNAL");
      expect(card.licensingStatus).toBe("NOT_READY");
      expect(card.publicApiAllowed).toBe(false);
      expect(card.modelCard.status).toBe("DRAFT");
      expect(card.modelCard.summary).toContain("Metric lifecycle is SHADOW");
      expect(card.modelCard.summary).toContain("generated evidence does not change lifecycle or exposure");
      expect(card.modelCard.limitations).toContain(
        "Generated card does not approve public content, API exposure, licensing, betting use, or production promotion.",
      );
      expect(card.driftCard.status).not.toBe("MISSING");
      expect(card.driftCard.evidenceRefs.length).toBeGreaterThan(0);
      expect(card.driftCard.notes[0]).toContain("does not promote metric lifecycle or exposure");
    }
  });

  it("carries fixture caveats into model-card limitations", () => {
    const cards = generateAllShadowMetricEvidenceFixtureCards();

    for (const fixture of SHADOW_METRIC_EVIDENCE_FIXTURES) {
      const card = cards.find((candidate) => candidate.metricId === fixture.metricId);
      if (!card) throw new Error(`Missing generated card for ${fixture.metricId}`);
      expect(card.modelCard.limitations).toContain(fixture.caveat);
      expect(card.modelCard.evidenceRefs).toContain(fixture.validationReport.evidenceRefs[0]);
      expect(card.modelCard.evidenceRefs).toContain(fixture.evidenceRefs[0]);
    }
  });

  it("keeps role, calibration, decision, portfolio, and market fixtures in drift review", () => {
    const cards = generateAllShadowMetricEvidenceFixtureCards();
    const rvi = cardFor(cards, "role-volatility-index");
    const cig = cardFor(cards, "calibration-integrity-grade");
    const dpi = cardFor(cards, "drift-pressure-index");
    const cuw = cardFor(cards, "conformal-uncertainty-width");
    const nbp = cardFor(cards, "no-bet-pressure");
    const pws = cardFor(cards, "playable-window-score");
    const pfs = cardFor(cards, "portfolio-fit-score");
    const mms = cardFor(cards, "market-mirage-score");

    expect(rvi.driftCard.status).toBe("WATCH");
    expect(rvi.driftCard.notes).toContain("role_stability_psi: value 0.21 -> WATCH.");
    expect(cig.driftCard.status).toBe("WATCH");
    expect(cig.driftCard.notes).toContain("calibration_integrity_ece_delta: value 0.07 -> WATCH.");
    expect(dpi.driftCard.status).toBe("WATCH");
    expect(dpi.driftCard.notes).toContain("drift_pressure_composite_delta: value 0.16 -> WATCH.");
    expect(cuw.driftCard.status).toBe("WATCH");
    expect(cuw.driftCard.notes).toContain("conformal_width_coverage_gap_delta: value 0.13 -> WATCH.");
    expect(nbp.driftCard.status).toBe("WATCH");
    expect(nbp.driftCard.notes).toContain("no_bet_hard_pass_rate_delta: value 0.17 -> WATCH.");
    expect(pws.driftCard.status).toBe("SEVERE");
    expect(pws.driftCard.notes).toContain("decision_window_block_rate_delta: value 0.31 -> SEVERE.");
    expect(pfs.driftCard.status).toBe("STABLE");
    expect(pfs.driftCard.notes).toContain("portfolio_concentration_risk_delta: value 0.11 -> STABLE.");
    expect(mms.driftCard.status).toBe("WATCH");
    expect(mms.driftCard.notes).toContain("market_mirage_watch_rate_delta: value 0.19 -> WATCH.");
  });
});

function cardFor(
  cards: ReturnType<typeof generateAllShadowMetricEvidenceFixtureCards>,
  metricId:
    | "role-volatility-index"
    | "calibration-integrity-grade"
    | "drift-pressure-index"
    | "conformal-uncertainty-width"
    | "no-bet-pressure"
    | "playable-window-score"
    | "portfolio-fit-score"
    | "market-mirage-score",
) {
  const card = cards.find((candidate) => candidate.metricId === metricId);
  if (!card) throw new Error(`Missing generated card for ${metricId}`);
  return card;
}
