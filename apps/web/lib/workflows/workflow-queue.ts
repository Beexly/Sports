import { getWorkflow } from "./workflow-registry";

export function enqueueSafeWorkflow(workflowId: string, redisAvailable = false) {
  const workflow = getWorkflow(workflowId);
  if (!workflow) return { state: "BLOCKED", owner: "jarvis", reason: "unknown-workflow" } as const;
  if (workflow.ownerApprovalRules.length > 0) return { state: "PAUSED_OWNER_APPROVAL", owner: "owner", reason: "owner-approval-required" } as const;
  if (!redisAvailable) return { state: "MANUAL_NO_REDIS", owner: "chain", reason: "redis-not-configured" } as const;
  return { state: "ENQUEUED", owner: "chain", reason: "safe-internal-workflow" } as const;
}
