import { routeAgentTask } from "@/lib/tasks/agent-task-router";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import { getWorkflow, type WorkflowDefinition } from "./workflow-registry";
import type { WorkflowEvent } from "./workflow-events";

export interface WorkflowRunPlan {
  readonly workflow: WorkflowDefinition;
  readonly events: readonly WorkflowEvent[];
  readonly routedTasks: readonly ReturnType<typeof routeAgentTask>[];
  readonly canRunSafely: boolean;
  readonly blockedReason: string | null;
}

export function planWorkflowRun(workflowId: string, events: readonly WorkflowEvent[], tasks: readonly AgentTask[]): WorkflowRunPlan | null {
  const workflow = getWorkflow(workflowId);
  if (!workflow) return null;
  const protectedSourceEvent = events.find((event) => event.kind === "PROTECTED_SOURCE");
  const unsettledSeasonEvent = events.find((event) => event.kind === "UNSETTLED_SEASON");
  const blockedReason = protectedSourceEvent?.message ?? unsettledSeasonEvent?.message ?? null;
  return {
    workflow,
    events,
    routedTasks: tasks.filter((task) => task.workflowId === workflowId).map(routeAgentTask),
    canRunSafely: blockedReason === null,
    blockedReason,
  };
}
