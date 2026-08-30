import { db } from "@sports/db";
import type { SignedGovernedReceipt } from "@sports/governed";

/** Persist a signed receipt to the `agent_receipt` table (idempotent on receiptId). */
export async function persistGovernedReceipt(
  r: SignedGovernedReceipt,
): Promise<{ controlEventId?: string }> {
  await db.agentReceipt.upsert({
    where: { receiptId: r.receiptId },
    create: {
      receiptId: r.receiptId,
      raw: r,
      decision: r.decision,
      kid: r.signature.kid,
      at: new Date(r.at),
      agentId: r.action.agentId,
      tool: r.action.tool,
      argsDigest: r.action.argsDigest,
      reasons: r.reasons,
    },
    update: {},
  });
  return { controlEventId: r.controlEventId };
}
