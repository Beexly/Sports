import { routeAgentTask } from "./agent-task-router";
import type { AgentTask } from "./agent-task-types";
import type { AgentTaskStore } from "./agent-task-store";

export interface AgentTaskRuntimeResult {
  readonly task: AgentTask;
  readonly persisted: boolean;
  readonly accepted: boolean;
  readonly reason: string;
  readonly escalatedTo: readonly string[];
}

export async function persistRoutedTask(store: AgentTaskStore, task: AgentTask): Promise<AgentTaskRuntimeResult> {
  const route = routeAgentTask(task);
  const persistedTask = await store.upsert(task);
  return { task: persistedTask, persisted: true, accepted: route.accepted, reason: route.reason, escalatedTo: route.escalatedTo };
}

export function canTransitionTask(task: AgentTask, nextStatus: AgentTask["status"]): boolean {
  if (task.completedAt) return false;
  if (task.status.startsWith("BLOCKED")) return nextStatus === task.status || nextStatus === "NEEDS_OWNER_APPROVAL" || nextStatus === "NEEDS_CLAUDE_REVIEW";
  if (nextStatus === "COMPLETED" && (task.ownerApprovalRequired || task.claudeReviewRequired)) return false;
  return true;
}
