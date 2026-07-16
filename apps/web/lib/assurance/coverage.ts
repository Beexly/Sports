/**
 * AI Setup Assurance — category coverage.
 *
 * Coverage answers "how much of this category could the report actually
 * inspect from a repo checkout?" — honestly below 1.0 wherever runtime or
 * production evidence is required. What was NOT inspected is listed, never
 * silently skipped. Absence of telemetry is a finding, not a passing score.
 */

import type { AssuranceCategoryId } from "./types";

export interface CategorySpec {
  readonly id: AssuranceCategoryId;
  readonly label: string;
  readonly weight: number;
  /** Static, honest coverage of what a repo checkout can prove. */
  readonly coverage: number;
  readonly notInspected: readonly string[];
}

/** Weights sum to 100 (pinned by test). Coverage reflects THIS environment:
 * code and registries are fully inspectable; runtime/production behavior,
 * live usage, and outcome quality are not. */
export const CATEGORY_SPECS: readonly CategorySpec[] = [
  {
    id: "agent_governance",
    label: "Agent governance",
    weight: 15,
    coverage: 0.9,
    notInspected: ["Runtime adherence of manual operators to seat charters"],
  },
  {
    id: "skill_supply_chain",
    label: "Skill supply chain",
    weight: 15,
    coverage: 0.85,
    notInspected: ["External scanner verdicts (none adopted)", "Real skill execution history (no runner exists)"],
  },
  {
    id: "model_routing",
    label: "Model routing",
    weight: 10,
    coverage: 0.9,
    notInspected: ["Per-lane quality — requires the frozen eval suite to run"],
  },
  {
    id: "memory_integrity",
    label: "Memory integrity",
    weight: 10,
    coverage: 0.8,
    notInspected: ["Production write/read behavior (no production DB access from this environment)"],
  },
  {
    id: "tool_mcp_governance",
    label: "Tool/MCP governance",
    weight: 10,
    coverage: 0.9,
    notInspected: ["Session-level MCP connector posture (harness-managed, outside the repo)"],
  },
  {
    id: "security",
    label: "Security",
    weight: 15,
    coverage: 0.7,
    notInspected: ["Dependency CVE scan (no SBOM pipeline)", "Runtime secret handling in production env"],
  },
  {
    id: "observability_cost",
    label: "Observability & cost",
    weight: 10,
    coverage: 0.6,
    notInspected: ["Actual spend vs budgets (production data)", "Alert delivery paths"],
  },
  {
    id: "documentation_truth",
    label: "Documentation truth",
    weight: 5,
    coverage: 0.9,
    notInspected: ["Docs describing production-only behavior"],
  },
  {
    id: "utilization_dead_weight",
    label: "Utilization / dead weight",
    weight: 5,
    coverage: 0.3,
    notInspected: ["Real usage telemetry — file existence is NOT usage evidence, so this stays mostly uncovered"],
  },
  {
    id: "outcome_quality",
    label: "Outcome quality",
    weight: 5,
    coverage: 0.3,
    notInspected: ["Settled-pick calibration/CLV in production (not reachable from this environment)"],
  },
];

/** Below this weighted coverage, no grade exists — the verdict is INCOMPLETE.
 * Set above what a pure repo checkout can reach (0.7625 today): the grade
 * unlocks only when runtime/production evidence collectors raise coverage,
 * never by relaxing this number. */
export const COVERAGE_THRESHOLD = 0.8;

export function weightedCoverage(specs: readonly CategorySpec[] = CATEGORY_SPECS): number {
  const total = specs.reduce((s, c) => s + c.weight, 0);
  return specs.reduce((s, c) => s + c.weight * c.coverage, 0) / total;
}
