import { AGENT_DEPARTMENTS } from "@/lib/agents/agent-departments";
import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";
import type { AgentDepartment } from "@/lib/agents/agent-departments";

export interface DepartmentHealth {
  readonly department: AgentDepartment;
  readonly status: "BLOCKED" | "DRAFT_ONLY" | "MANUAL" | "UNKNOWN";
  readonly notWired: number;
  readonly draftOnly: number;
  readonly manual: number;
  readonly risk: "LOW" | "MEDIUM" | "HIGH";
}

export function getJarvisDepartmentHealth(): readonly DepartmentHealth[] {
  return AGENT_DEPARTMENTS.map((department) => {
    const agents = AGENT_OS_REGISTRY.filter((agent) => agent.department === department);
    const notWired = agents.filter((agent) => agent.status === "NOT_WIRED").length;
    const draftOnly = agents.filter((agent) => agent.status === "DRAFT_ONLY").length;
    const manual = agents.filter((agent) => agent.status === "MANUAL").length;
    return { department, status: notWired > draftOnly + manual ? "BLOCKED" : manual > 0 ? "MANUAL" : draftOnly > 0 ? "DRAFT_ONLY" : "UNKNOWN", notWired, draftOnly, manual, risk: notWired > 2 ? "HIGH" : notWired > 0 ? "MEDIUM" : "LOW" };
  });
}
