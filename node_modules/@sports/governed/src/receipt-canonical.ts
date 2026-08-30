import type { GovernedReceipt } from "./receipt-types";

/**
 * The exact byte sequence that gets signed. Deterministic field order at
 * every level (including `budget`, whose keys are listed explicitly below —
 * receipts round-trip through JSONB storage, which does not preserve
 * insertion order, so re-serializing a caller-supplied `budget` object
 * as-is could change the signed byte sequence and break verification on
 * read-back).
 *
 * `receiptUrl` and `controlEventId` are deliberately EXCLUDED — both are
 * assigned AFTER signing (a receipt lookup URL, and a persistence-layer id
 * a persister may or may not stamp on), so including either would make the
 * signature depend on values that don't exist yet at sign time, or change
 * depending on which persister recorded the receipt.
 */
export function canonicalReceiptPayload(
  r: Omit<GovernedReceipt, "receiptUrl" | "controlEventId">,
): string {
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
    budget: r.budget
      ? {
          heldCents: r.budget.heldCents ?? null,
          remainingCents: r.budget.remainingCents ?? null,
          unit: r.budget.unit ?? null,
        }
      : null,
  });
}
