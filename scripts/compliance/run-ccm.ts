#!/usr/bin/env tsx
/**
 * CCM cron entry point — `tsx scripts/compliance/run-ccm.ts`.
 *
 * Wires @sports/compliance's `runCcm` with:
 *   - REAL persistence: persistEvidence / saveRun / openException go through
 *     apps/web/lib/compliance/store.ts against the ComplianceEvidence /
 *     ComplianceCheckRun / ComplianceException Prisma tables.
 *   - REAL receipts: loadRecentReceipts + verifyReceipt read the AgentReceipt
 *     table (merged in #188) and verify signatures against the same
 *     process-local governed keyring apps/web's own receipt routes use.
 *   - STILL-STUBBED data sources: deploys and access snapshots have no real
 *     feed in this repo yet. Each stub below is explicit about what it
 *     stands in for. Wiring them up is follow-on work, not silently assumed
 *     to be done.
 */
import { runCcm, type ReceiptRow, type VerifyFn, type DeployEvent, type AccessSnapshotRow } from "@sports/compliance";
import { persistEvidence, saveRun, openException } from "../../apps/web/lib/compliance/store";
import { db } from "@sports/db";
import { verifyReceiptAgainstKeyring, type SignedGovernedReceipt } from "@sports/governed";
import { getGovernedKeyring } from "../../apps/web/lib/governed/keyring-singleton";

/** How far back to scope the receipt-logging/signature monitoring window. */
const RECEIPT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Reconstruct the SignedGovernedReceipt shape from an AgentReceipt row's
 * flattened columns + its `raw` JSON blob (the same source apps/web's own
 * `/api/receipts/[id]` route reads from).
 */
export function toSignedGovernedReceipt(row: {
  receiptId: string;
  at: Date;
  decision: string;
  tool: string;
  agentId: string;
  argsDigest: string;
  reasons: unknown;
  raw: unknown;
}): SignedGovernedReceipt {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  return {
    receiptId: row.receiptId,
    at: row.at.toISOString(),
    policyVersion: typeof raw.policyVersion === "number" ? raw.policyVersion : null,
    policyHash: typeof raw.policyHash === "string" ? raw.policyHash : null,
    action: { tool: row.tool, argsDigest: row.argsDigest, agentId: row.agentId },
    decision: row.decision as "ADMIT" | "REFUSE",
    reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
    budget: raw.budget as SignedGovernedReceipt["budget"],
    controlEventId: typeof raw.controlEventId === "string" ? raw.controlEventId : undefined,
    receiptUrl: typeof raw.receiptUrl === "string" ? raw.receiptUrl : undefined,
    signature: raw.signature as SignedGovernedReceipt["signature"],
  };
}

export async function loadRecentReceipts(): Promise<ReceiptRow[]> {
  const since = new Date(Date.now() - RECEIPT_WINDOW_MS);
  const rows = await db.agentReceipt.findMany({ where: { at: { gte: since } }, orderBy: { at: "desc" } });
  return rows.map((row) => {
    const signed = toSignedGovernedReceipt(row);
    return {
      id: row.receiptId,
      decision: signed.decision,
      policyVersion: signed.policyVersion !== null ? String(signed.policyVersion) : undefined,
      signature: signed.signature,
      raw: signed,
    };
  });
}

// Verifies against the SAME process-local keyring apps/web's
// `/api/receipts/verify` route uses (revoked kids are rejected, not just
// cryptographically-invalid ones — see verifyReceiptAgainstKeyring's doc
// comment in @sports/governed).
export const verifyReceipt: VerifyFn = async (row) => {
  const signed = row.raw as SignedGovernedReceipt | undefined;
  if (!signed || !signed.signature) {
    return { ok: false, reason: "receipt row missing signature" };
  }
  const store = await getGovernedKeyring();
  return verifyReceiptAgainstKeyring(store, signed);
};

// TODO: source from the deploy webhook log (no such table/integration
// exists in this repo yet). Returns empty — no deploys observed, not "all
// deploys compliant".
async function loadRecentDeploys(): Promise<DeployEvent[]> {
  return [];
}

// TODO: source from the IdP integration (no such integration exists in this
// repo yet). Returns empty — no privileged users observed, not "MFA fully
// covered".
async function loadAccessSnapshot(): Promise<AccessSnapshotRow[]> {
  return [];
}

async function main(): Promise<void> {
  const [receiptRows, deployEvents, accessRows] = await Promise.all([
    loadRecentReceipts(),
    loadRecentDeploys(),
    loadAccessSnapshot(),
  ]);

  const run = await runCcm({
    receiptRows,
    verifyReceiptSignature: verifyReceipt,
    deployEvents,
    accessRows,
    persistEvidence,
    saveRun,
    openException,
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(run, null, 2));
  process.exit(run.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[run-ccm] failed:", err);
    process.exit(1);
  });
}
