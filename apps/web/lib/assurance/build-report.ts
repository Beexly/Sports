/**
 * AI Setup Assurance — report assembly.
 *
 * Deterministic from the checkout: same repo state → same report. The
 * verdict is GRADED only when weighted coverage clears the threshold;
 * otherwise INCOMPLETE, with the uninspected ground listed per category.
 */

import type { AssuranceReport, CategoryAssessment } from "./types";
import { CATEGORY_SPECS, COVERAGE_THRESHOLD, weightedCoverage } from "./coverage";
import { deriveFindings, type EvidenceContext } from "./findings";
import { categoryHealth, pickTopRecommendation } from "./score";

/** Feature flag — default OFF. */
export function isAssuranceEnabled(): boolean {
  return process.env["AI_SETUP_ASSURANCE_ENABLED"] === "true";
}

export function buildAssuranceReport(ctx: EvidenceContext): AssuranceReport {
  const findings = deriveFindings(ctx);

  const categories: CategoryAssessment[] = CATEGORY_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    weight: spec.weight,
    coverage: spec.coverage,
    health: categoryHealth(spec.id, findings),
    notInspected: spec.notInspected,
    findings: findings.filter((f) => f.category === spec.id),
  }));

  const overallCoverage = Math.round(weightedCoverage() * 100) / 100;
  const graded = overallCoverage >= COVERAGE_THRESHOLD;

  // Health weighted over the INSPECTED fraction only — uncovered ground can
  // neither help nor hurt the number; it voids the grade via the threshold.
  const inspectedWeight = categories.reduce((s, c) => s + c.weight * c.coverage, 0);
  const overallScore = graded
    ? Math.round(
        (categories.reduce((s, c) => s + c.weight * c.health * c.coverage, 0) / inspectedWeight) * 100
      ) / 100
    : null;

  return {
    builtFrom: "repository checkout (registries + file evidence); no runtime or production data",
    categories,
    overallCoverage,
    overallScore,
    verdict: graded ? "GRADED" : "INCOMPLETE",
    openFindings: findings.filter((f) => f.status === "OPEN").length,
    topRecommendation: pickTopRecommendation(findings),
  };
}
