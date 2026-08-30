export const AGENT_STATUSES = ["REAL", "PARTIAL", "DRAFT_ONLY", "MANUAL", "DESIGNED", "NOT_WIRED", "DEMO_ONLY", "BLOCKED_BY_RIGHTS", "BLOCKED_BY_DATA", "BLOCKED_BY_INFRA", "NEEDS_OWNER_APPROVAL", "NEEDS_CLAUDE_REVIEW"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export function canAgentExecute(status: AgentStatus): boolean {
  return status === "REAL" || status === "PARTIAL";
}

export function canAgentDraft(status: AgentStatus): boolean {
  return status === "REAL" || status === "PARTIAL" || status === "DRAFT_ONLY";
}
