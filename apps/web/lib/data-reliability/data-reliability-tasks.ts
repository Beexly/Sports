import { AGENT_TASK_SEED } from "@/lib/tasks/agent-task-seed";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import type { SourceFreshnessStatus } from "./stale-data-detector";

export function freshnessStatusToTask(status: SourceFreshnessStatus): AgentTask | null {
  if (status.status === "FRESH") return null;
  const base = AGENT_TASK_SEED.find((task) => task.id === "stale-ingestion-alert")!;
  return { ...base, id: `stale:${status.sourceId}`, title: `${status.sourceId} ingestion ${status.status.toLowerCase()}`, risk: status.critical ? "CRITICAL" : "HIGH", priority: status.critical ? "P0" : "P1", assignedAgent: "tal", blockedReason: status.status === "UNKNOWN" ? "Unknown ingestion state is not healthy." : base.blockedReason, sourceEvidence: [`source:${status.sourceId}`, `ageHours:${status.ageHours ?? "unknown"}`], updatedAt: status.sourceId };
}

export function sourceRightsBlockTask(sourceId: string): AgentTask {
  const base = AGENT_TASK_SEED.find((task) => task.id === "score-source-rights-review")!;
  return { ...base, id: `rights:${sourceId}`, assignedAgent: "tal", title: `${sourceId} source-rights review`, blockedReason: "Source-rights block is separate from freshness." };
}
