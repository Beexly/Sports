import type { AgentAction } from "@/lib/agents/agent-capabilities";
import type { AgentDepartment } from "@/lib/agents/agent-departments";

export const AGENT_TASK_STATUSES = ["NEW", "QUEUED", "IN_PROGRESS", "NEEDS_OWNER_APPROVAL", "NEEDS_CLAUDE_REVIEW", "BLOCKED_BY_DATA", "BLOCKED_BY_RIGHTS", "BLOCKED_BY_INFRA", "DRAFT_READY", "READY_FOR_REVIEW", "COMPLETED", "REJECTED", "ARCHIVED"] as const;
export type AgentTaskStatus = (typeof AGENT_TASK_STATUSES)[number];

export const SAFE_ACTION_TYPES = ["OBSERVE", "ANALYZE", "DRAFT", "VALIDATE", "ROUTE", "ESCALATE", "SUMMARIZE", "REMEMBER", "FORECAST", "TEST", "QUEUE", "REVIEW", "MEASURE", "REPORT"] as const;
export type SafeActionType = (typeof SAFE_ACTION_TYPES)[number];

export const FORBIDDEN_WITHOUT_OWNER_APPROVAL = ["PUBLISH", "SEND_EXTERNAL", "SPEND_MONEY", "DEPLOY", "CHANGE_PUBLIC_CLAIM", "CHANGE_MODEL_WEIGHT", "SCRAPE_PROTECTED_SOURCE", "ENABLE_PUBLIC_PICKS", "ENABLE_BROWSER_CONTROL", "ENABLE_VOICE_CONTROL", "ENABLE_EXTERNAL_TOOL"] as const satisfies readonly AgentAction[];
export type ForbiddenOwnerAction = (typeof FORBIDDEN_WITHOUT_OWNER_APPROVAL)[number];

export type AgentTaskPriority = "P0" | "P1" | "P2" | "P3";
export type AgentTaskRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AgentTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: AgentTaskStatus;
  readonly priority: AgentTaskPriority;
  readonly risk: AgentTaskRisk;
  readonly department: AgentDepartment;
  readonly assignedAgent: string;
  readonly spawnedBy: string;
  readonly relatedCockpitSurface: string;
  readonly workflowId: string;
  readonly sourceEvidence: readonly string[];
  readonly requiredApprovals: readonly string[];
  readonly blockedReason: string | null;
  readonly cadence: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly claudeReviewRequired: boolean;
  readonly ownerApprovalRequired: boolean;
  readonly artifactLinks: readonly string[];
  readonly nextAction: string;
  readonly safeActionType: SafeActionType;
}
