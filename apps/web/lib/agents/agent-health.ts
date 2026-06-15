import { AGENT_OS_REGISTRY } from "./agent-registry";

export function summarizeAgentHealth() {
  const notWired = AGENT_OS_REGISTRY.filter((agent) => agent.status === "NOT_WIRED").length;
  const draftOnly = AGENT_OS_REGISTRY.filter((agent) => agent.status === "DRAFT_ONLY").length;
  const manual = AGENT_OS_REGISTRY.filter((agent) => agent.status === "MANUAL").length;
  return {
    total: AGENT_OS_REGISTRY.length,
    operationalCapacity: AGENT_OS_REGISTRY.filter((agent) => agent.status === "REAL" || agent.status === "PARTIAL").length,
    draftOnly,
    manual,
    notWired,
    externalActionsAllowed: AGENT_OS_REGISTRY.filter((agent) => agent.externalActionsAllowed).length,
  };
}
