import { getAgent } from "@/lib/agents/agent-registry";
import { canAgentDraft, canAgentExecute } from "@/lib/agents/agent-status";
import { AGENT_TASK_SEED } from "./agent-task-seed";
import type { AgentTask } from "./agent-task-types";

export interface RouteTaskResult {
  readonly task: AgentTask;
  readonly accepted: boolean;
  readonly reason: string;
  readonly escalatedTo: readonly string[];
}

export function listSeedAgentTasks(): readonly AgentTask[] {
  return AGENT_TASK_SEED;
}

export function routeAgentTask(task: AgentTask): RouteTaskResult {
  const assignedAgent = getAgent(task.assignedAgent);
  if (!assignedAgent) return { task, accepted: false, reason: "UNKNOWN_AGENT", escalatedTo: ["jarvis", "owner"] };
  if (task.status.startsWith("BLOCKED")) return { task, accepted: false, reason: task.status, escalatedTo: assignedAgent.escalatesTo };
  if (task.safeActionType === "DRAFT" && canAgentDraft(assignedAgent.status)) return { task, accepted: true, reason: "DRAFT_ACCEPTED", escalatedTo: [] };
  if (!canAgentExecute(assignedAgent.status)) return { task, accepted: false, reason: `${assignedAgent.status}_CANNOT_EXECUTE`, escalatedTo: assignedAgent.escalatesTo };
  if (task.ownerApprovalRequired) return { task, accepted: false, reason: "OWNER_APPROVAL_REQUIRED", escalatedTo: ["owner"] };
  return { task, accepted: true, reason: "ACCEPTED", escalatedTo: [] };
}

export function upsertAgentTask(queue: readonly AgentTask[], incoming: AgentTask): readonly AgentTask[] {
  const existing = queue.find((task) => task.id === incoming.id);
  if (!existing) return [...queue, incoming];
  return queue.map((task) => task.id === incoming.id ? { ...incoming, createdAt: task.createdAt } : task);
}

export function routeSeedAgentTasks(): readonly RouteTaskResult[] {
  return AGENT_TASK_SEED.map(routeAgentTask);
}
