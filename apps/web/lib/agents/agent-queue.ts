import { routeAgentTask } from "@/lib/tasks/agent-task-router";
import type { AgentTask } from "@/lib/tasks/agent-task-types";

export type AgentQueueState = "ENQUEUED" | "PAUSED_OWNER_APPROVAL" | "PAUSED_CLAUDE_REVIEW" | "BLOCKED" | "MANUAL_NO_REDIS";

export function enqueueSafeAgentTask(task: AgentTask, redisAvailable = false): { readonly state: AgentQueueState; readonly owner: string; readonly reason: string } {
  const route = routeAgentTask(task);
  if (!route.accepted) return { state: "BLOCKED", owner: "jarvis", reason: route.reason };
  if (task.ownerApprovalRequired) return { state: "PAUSED_OWNER_APPROVAL", owner: "owner", reason: "owner-approval-required" };
  if (task.claudeReviewRequired) return { state: "PAUSED_CLAUDE_REVIEW", owner: "claude", reason: "claude-review-required" };
  if (!redisAvailable) return { state: "MANUAL_NO_REDIS", owner: "chain", reason: "redis-not-configured" };
  return { state: "ENQUEUED", owner: "chain", reason: "safe-internal-task" };
}
