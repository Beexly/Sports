import { FORBIDDEN_WITHOUT_OWNER_APPROVAL, type AgentTask, type ForbiddenOwnerAction } from "./agent-task-types";

export function isForbiddenWithoutOwnerApproval(action: string): action is ForbiddenOwnerAction {
  return FORBIDDEN_WITHOUT_OWNER_APPROVAL.includes(action as ForbiddenOwnerAction);
}

export function canCompleteTaskAutomatically(task: AgentTask): boolean {
  if (task.ownerApprovalRequired || task.claudeReviewRequired) return false;
  if (task.status.startsWith("BLOCKED") || task.status === "NEEDS_OWNER_APPROVAL" || task.status === "NEEDS_CLAUDE_REVIEW") return false;
  return task.safeActionType !== "REVIEW";
}
