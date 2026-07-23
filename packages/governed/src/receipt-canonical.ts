import type { GovernedReceipt } from "./receipt-types";

/**
 * The exact byte sequence that gets signed. Deterministic field order.
 * `receiptUrl` is deliberately EXCLUDED — it is assigned after signing (it
 * embeds the receiptId into a URL) and must never affect the signature.
 */
export function canonicalReceiptPayload(r: Omit<GovernedReceipt, "receiptUrl">): string {
  return JSON.stringify({
    receiptId: r.receiptId,
    at: r.at,
    policyVersion: r.policyVersion,
    policyHash: r.policyHash,
    action: {
      tool: r.action.tool,
      argsDigest: r.action.argsDigest,
      agentId: r.action.agentId,
      parentInvocationId: r.action.parentInvocationId ?? null,
    },
    decision: r.decision,
    reasons: [...r.reasons].sort(),
    budget: r.budget ?? null,
    controlEventId: r.controlEventId ?? null,
  });
}
