import { createPrismaAgentTaskStore, type AgentTaskStore } from "@/lib/tasks/agent-task-store";
import { persistRoutedTask } from "@/lib/tasks/agent-task-runtime";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import type { WorkflowEvent } from "./workflow-events";
import { createMemoryWorkflowEventStore, type WorkflowEventStore } from "./workflow-event-store";
import { getWorkflow } from "./workflow-registry";
import { planWorkflowRun } from "./workflow-runner";
import { tasksForWorkflowEvent } from "./workflow-task-bridge";

export type WorkflowRuntimeStatus = "COMPLETED" | "BLOCKED" | "NEEDS_OWNER_APPROVAL" | "NEEDS_CLAUDE_REVIEW";

export interface WorkflowRuntimeResult {
  readonly workflowRunId: string;
  readonly workflowId: string;
  readonly owningAgent: string;
  readonly participatingAgents: readonly string[];
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly status: WorkflowRuntimeStatus;
  readonly stagesRun: readonly string[];
  readonly eventsCreated: readonly WorkflowEvent[];
  readonly tasksCreated: readonly AgentTask[];
  readonly blockers: readonly string[];
  readonly ownerApprovalRequired: boolean;
  readonly claudeReviewRequired: boolean;
  readonly outputArtifacts: readonly string[];
}

export async function runSafeWorkflowRuntime(input: { workflowId: string; events?: readonly WorkflowEvent[]; eventStore?: WorkflowEventStore; taskStore?: AgentTaskStore; now?: string }): Promise<WorkflowRuntimeResult | null> {
  const workflow = getWorkflow(input.workflowId);
  if (!workflow) return null;
  const now = input.now ?? new Date().toISOString();
  const eventStore = input.eventStore ?? createMemoryWorkflowEventStore();
  const taskStore = input.taskStore ?? createPrismaAgentTaskStore();
  const seedEvents = input.events ?? [{ workflowId: workflow.id, kind: "NORMAL", message: `${workflow.name} observed`, createdAt: now } satisfies WorkflowEvent];
  const createdEvents: WorkflowEvent[] = [];
  const createdTasks: AgentTask[] = [];
  const routingBlockers: string[] = [];
  for (const event of seedEvents) {
    createdEvents.push(await eventStore.append(event));
    for (const task of tasksForWorkflowEvent(workflow, event)) {
      const result = await persistRoutedTask(taskStore, task);
      createdTasks.push(result.task);
      // A rejected route (NOT_WIRED / blocked agent) means the run cannot execute
      // that work — surface it as a blocker, never let it pass silently.
      if (!result.accepted) routingBlockers.push(`${task.id}: ${result.reason}`);
    }
  }
  const plan = planWorkflowRun(workflow.id, createdEvents, createdTasks);
  const blockers = [...(plan?.blockedReason ? [plan.blockedReason] : []), ...routingBlockers];
  const ownerApprovalRequired = workflow.ownerApprovalRules.length > 0 || createdTasks.some((task) => task.ownerApprovalRequired);
  const claudeReviewRequired = workflow.claudeReviewRules.length > 0 || createdTasks.some((task) => task.claudeReviewRequired);
  const status: WorkflowRuntimeStatus =
    blockers.length > 0 ? "BLOCKED" : ownerApprovalRequired ? "NEEDS_OWNER_APPROVAL" : claudeReviewRequired ? "NEEDS_CLAUDE_REVIEW" : "COMPLETED";
  return {
    workflowRunId: `${workflow.id}:${now}`,
    workflowId: workflow.id,
    owningAgent: workflow.owningAgent,
    participatingAgents: workflow.participatingAgents,
    startedAt: now,
    // Only a truly COMPLETED run gets a completion timestamp — pending approval/
    // review and blocked runs stay open (completedAt null).
    completedAt: status === "COMPLETED" ? now : null,
    status,
    stagesRun: blockers.length > 0 ? workflow.stages.slice(0, 1) : workflow.stages,
    eventsCreated: createdEvents,
    tasksCreated: createdTasks,
    blockers,
    ownerApprovalRequired,
    claudeReviewRequired,
    outputArtifacts: workflow.outputArtifacts,
  };
}

export function isForbiddenWorkflowAction(action: string): boolean {
  return ["PUBLISH", "SEND_EXTERNAL", "SPEND_MONEY", "DEPLOY", "ENABLE_PUBLIC_PICKS", "CHANGE_MODEL_WEIGHT", "SCRAPE_PROTECTED_SOURCE", "ENABLE_BROWSER_CONTROL", "ENABLE_VOICE_CONTROL", "ENABLE_EXTERNAL_TOOL"].includes(action);
}
