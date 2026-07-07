import { clampScore } from "./math.js";

export type MetricLifecycleStatus = "DESIGN" | "SHADOW" | "BACKTESTING" | "REVIEW_READY" | "APPROVED" | "REJECTED";
export type MetricUncertaintyBand = "LOW" | "MEDIUM" | "HIGH";
export type MetricSourceStatus =
  | "allowed"
  | "approved"
  | "benchmark_only"
  | "manual_review"
  | "restricted"
  | "permission_required"
  | "blocked"
  | "excluded"
  | "unknown";

export interface MetricSourcePolicy {
  readonly sourceId: string;
  readonly status: MetricSourceStatus;
  readonly allowedForModeling: boolean;
  readonly attributionRequired?: string;
}

export interface MetricValidationIssue {
  readonly code: string;
  readonly severity: "WARN" | "BLOCK";
  readonly message: string;
}

export interface MetricValidationResult {
  readonly allowed: boolean;
  readonly issues: readonly MetricValidationIssue[];
  readonly status: "PASS" | "WARN" | "FAIL_CLOSED";
}

export function rightsCleanliness(status: MetricSourceStatus): number {
  if (status === "allowed" || status === "approved") return 1;
  if (status === "benchmark_only" || status === "manual_review" || status === "restricted") return 0.6;
  return 0;
}

export function sourcePoliciesAllowed(policies: readonly MetricSourcePolicy[]): boolean {
  return policies.length > 0 && policies.every((policy) => policy.allowedForModeling && rightsCleanliness(policy.status) > 0);
}

export function validateSourcePolicies(policies: readonly MetricSourcePolicy[]): MetricValidationResult {
  const issues: MetricValidationIssue[] = [];
  if (policies.length === 0) {
    issues.push({ code: "missing_source_policy", message: "Metric has no source policy.", severity: "BLOCK" });
  }
  for (const policy of policies) {
    if (!policy.allowedForModeling || rightsCleanliness(policy.status) === 0) {
      issues.push({ code: "source_policy_block", message: `Source ${policy.sourceId} does not clear for modeling.`, severity: "BLOCK" });
    }
  }
  const blocked = issues.some((issue) => issue.severity === "BLOCK");
  return { allowed: !blocked, issues, status: blocked ? "FAIL_CLOSED" : issues.length > 0 ? "WARN" : "PASS" };
}

export function uncertaintyFromEvidence(input: {
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly proxyCount?: number;
  readonly driftPressure?: number;
}): MetricUncertaintyBand {
  const sampleSize = input.sampleSize ?? 0;
  const driftPressure = clampScore(input.driftPressure ?? 0);
  const proxyCount = input.proxyCount ?? 0;
  if (!sourcePoliciesAllowed(input.sourcePolicy) || sampleSize < 50 || proxyCount > 2 || driftPressure >= 70) return "HIGH";
  if (sampleSize < 250 || proxyCount > 0 || driftPressure >= 35) return "MEDIUM";
  return "LOW";
}
