/**
 * AI Setup Assurance — types.
 *
 * "Grade my AI setup" as a defensible evidence report, not a cosmetic grade:
 * every finding carries exact evidence paths; coverage is measured and shown;
 * a grade only exists when coverage clears an explicit threshold — below it
 * the report says INCOMPLETE, because a confident letter over unverified
 * ground would itself be the kind of claim this platform bans.
 */

export type AssuranceCategoryId =
  | "agent_governance"
  | "skill_supply_chain"
  | "model_routing"
  | "memory_integrity"
  | "tool_mcp_governance"
  | "security"
  | "observability_cost"
  | "documentation_truth"
  | "utilization_dead_weight"
  | "outcome_quality";

export type AssuranceRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AssuranceEvidence {
  readonly path: string;
  readonly line?: number;
  readonly observation: string;
}

export interface AssuranceFinding {
  readonly id: string;
  readonly category: AssuranceCategoryId;
  readonly title: string;
  readonly evidence: readonly AssuranceEvidence[];
  readonly whyItMatters: string;
  readonly risk: AssuranceRisk;
  /** 0–1: how sure the inspection is. Absence of telemetry lowers this. */
  readonly confidence: number;
  readonly smallestValidation: string;
  readonly smallestSafeFix: string;
  readonly ownerActionRequired: boolean;
  readonly status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "NOT_APPLICABLE";
}

export interface CategoryAssessment {
  readonly id: AssuranceCategoryId;
  readonly label: string;
  /** Weight out of 100 (fixed, documented in ASSURANCE_SCORING.md). */
  readonly weight: number;
  /** 0–1: fraction of this category we could actually inspect from the repo. */
  readonly coverage: number;
  /** 0–1: of what was inspected, how healthy. Meaningless when coverage ~0. */
  readonly health: number;
  /** What we could NOT inspect — shown, never silently skipped. */
  readonly notInspected: readonly string[];
  readonly findings: readonly AssuranceFinding[];
}

export interface AssuranceReport {
  readonly builtFrom: string;
  readonly categories: readonly CategoryAssessment[];
  /** Weighted coverage 0–1 across all categories. */
  readonly overallCoverage: number;
  /**
   * Weighted health over the INSPECTED fraction only. Null when coverage is
   * below COVERAGE_THRESHOLD — no grade exists over unverified ground.
   */
  readonly overallScore: number | null;
  readonly verdict: "INCOMPLETE" | "GRADED";
  readonly openFindings: number;
  /** Selected by risk-adjusted leverage, never by cosmetic score gain. */
  readonly topRecommendation: AssuranceFinding | null;
}
