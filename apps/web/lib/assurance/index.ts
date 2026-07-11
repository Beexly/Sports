/**
 * AI Setup Assurance — public module surface.
 *
 * An evidence-and-coverage report, never a cosmetic grade: below the
 * coverage threshold the verdict is INCOMPLETE, and what was not inspected
 * is always listed.
 */

export type {
  AssuranceCategoryId,
  AssuranceRisk,
  AssuranceEvidence,
  AssuranceFinding,
  CategoryAssessment,
  AssuranceReport,
} from "./types";

export { CATEGORY_SPECS, COVERAGE_THRESHOLD, weightedCoverage } from "./coverage";
export { deriveFindings, inspectRegistries, type EvidenceContext } from "./findings";
export { categoryHealth, pickTopRecommendation } from "./score";
export { buildAssuranceReport, isAssuranceEnabled } from "./build-report";
