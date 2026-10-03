import type { AgentTask } from "@/lib/tasks/agent-task-types";

export interface StatCoverageGap {
  readonly statKey: string;
  readonly status: "MISSING" | "PARTIAL";
  readonly source: "nflverse" | "internal";
  readonly ownerAgent: "prism" | "ascend";
}

export function auditStatCoverage(requiredStats: readonly string[], implementedStats: readonly string[]): readonly StatCoverageGap[] {
  const implemented = new Set(implementedStats);
  return requiredStats.filter((statKey) => !implemented.has(statKey)).map((statKey) => ({ statKey, status: "MISSING", source: "nflverse", ownerAgent: statKey.includes("projection") ? "prism" : "ascend" }));
}

export function coverageGapToTask(gap: StatCoverageGap): Pick<AgentTask, "assignedAgent" | "safeActionType" | "ownerApprovalRequired" | "claudeReviewRequired" | "status"> {
  return { assignedAgent: gap.ownerAgent, safeActionType: "MEASURE", ownerApprovalRequired: false, claudeReviewRequired: true, status: "QUEUED" };
}
