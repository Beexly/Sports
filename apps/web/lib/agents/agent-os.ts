import type { AgentAction } from "./agent-capabilities";
import type { AgentAuthorityLevel } from "./agent-authority";
import type { AgentDepartment } from "./agent-departments";
import type { AgentStatus } from "./agent-status";

export type AgentTier = "PRIMARY" | "DEPARTMENT_HEAD" | "STANDING_SUBAGENT" | "SPECIALIST";
export type AgentRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AgentOSDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly department: AgentDepartment;
  readonly role: string;
  readonly status: AgentStatus;
  readonly tier: AgentTier;
  readonly mission: string;
  readonly authorityLevel: AgentAuthorityLevel;
  readonly allowedActions: readonly AgentAction[];
  readonly forbiddenActions: readonly AgentAction[];
  readonly canSpawnSubagents: boolean;
  readonly reportsTo: readonly string[];
  readonly escalatesTo: readonly string[];
  readonly ownerApprovalRequired: boolean;
  readonly claudeReviewRequired: boolean;
  readonly externalActionsAllowed: boolean;
  readonly toolsAvailable: readonly string[];
  readonly cockpitSurfacesOwned: readonly string[];
  readonly taskTypesOwned: readonly string[];
  readonly inputSignals: readonly string[];
  readonly outputArtifacts: readonly string[];
  readonly cadence: string;
  readonly healthRules: readonly string[];
  readonly riskLevel: AgentRiskLevel;
  readonly reviewGates: readonly string[];
  readonly failureModes: readonly string[];
  readonly implementationStatus: string;
  readonly nextExecutableAction: string;
}
