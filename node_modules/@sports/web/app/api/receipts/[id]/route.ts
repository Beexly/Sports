/**
 * GET /api/receipts/[id] — public receipt lookup by receiptId.
 *
 * Returns a REDACTED public view of a signed AgentReceipt row. The receipt
 * as designed has no raw secrets by construction (argsDigest is already a
 * one-way digest, not the raw args; there is no private-key material on the
 * receipt), but this route still only forwards an explicit allow-listed set
 * of fields rather than the raw DB row, so a future column added to
 * `agent_receipt` for internal bookkeeping does not leak here by default.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const receiptId = context.params.id;
  if (!receiptId || typeof receiptId !== "string") {
    return NextResponse.json({ error: "invalid receipt id" }, { status: 400 });
  }

  const row = await db.agentReceipt.findUnique({ where: { receiptId } });
  if (!row) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }

  const raw = row.raw as Record<string, unknown>;
  return NextResponse.json({
    receiptId: row.receiptId,
    at: row.at.toISOString(),
    decision: row.decision,
    tool: row.tool,
    agentId: row.agentId,
    argsDigest: row.argsDigest,
    reasons: row.reasons,
    policyVersion: raw.policyVersion ?? null,
    policyHash: raw.policyHash ?? null,
    budget: raw.budget ?? null,
    controlEventId: raw.controlEventId ?? null,
    receiptUrl: raw.receiptUrl ?? null,
    signature: raw.signature ?? null,
  });
}
