import { getWorkflow } from "./workflow-registry";
import { workflowRequiresOwnerApproval } from "./workflow-gates";

export function enqueueSafeWorkflow(workflowId: string, redisAvailable = false) {
  const workflow = getWorkflow(workflowId);
  if (!workflow) return { state: "BLOCKED", owner: "jarvis", reason: "unknown-workflow" } as const;
  // Honor the OWNER-APPROVAL GATE, not just explicit rules — the registry adds the
  // `owner-approval` gate to every workflow, so none may auto-enqueue past it.
  if (workflowRequiresOwnerApproval(workflow)) return { state: "PAUSED_OWNER_APPROVAL", owner: "owner", reason: "owner-approval-required" } as const;
  if (workflow.claudeReviewRules.length > 0) return { state: "PAUSED_CLAUDE_REVIEW", owner: "claude", reason: "claude-review-required" } as const;
  if (!redisAvailable) return { state: "MANUAL_NO_REDIS", owner: "chain", reason: "redis-not-configured" } as const;
  return { state: "ENQUEUED", owner: "chain", reason: "safe-internal-workflow" } as const;
}
