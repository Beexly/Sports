import { AGENT_TASK_SEED } from "@/lib/tasks/agent-task-seed";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import type { WorkflowEvent } from "./workflow-events";
import type { WorkflowDefinition } from "./workflow-registry";

export function tasksForWorkflowEvent(workflow: WorkflowDefinition, event: WorkflowEvent): readonly AgentTask[] {
  if (event.kind === "STALE_DATA") return AGENT_TASK_SEED.filter((task) => task.id === "stale-ingestion-alert");
  if (event.kind === "PROTECTED_SOURCE") return AGENT_TASK_SEED.filter((task) => task.id === "score-source-rights-review");
  if (workflow.id === "claude-handoff") return AGENT_TASK_SEED.filter((task) => task.claudeReviewRequired).slice(0, 1);
  if (workflow.id === "historical-intelligence") return AGENT_TASK_SEED.filter((task) => task.id === "historical-feature-registry" || task.id === "stat-coverage-auditor");
  if (workflow.id === "calibration") return AGENT_TASK_SEED.filter((task) => task.id === "canonical-25-pick-threshold");
  return [];
}
