import type { AgentTaskRisk, AgentTaskPriority } from "./agent-task-types";

export function priorityForRisk(risk: AgentTaskRisk): AgentTaskPriority {
  if (risk === "CRITICAL") return "P0";
  if (risk === "HIGH") return "P1";
  if (risk === "MEDIUM") return "P2";
  return "P3";
}
