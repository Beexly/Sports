#!/usr/bin/env tsx
/**
 * CCM cron entry point — `tsx scripts/compliance/run-ccm.ts`.
 *
 * Wires @sports/compliance's `runCcm` with:
 *   - REAL persistence: persistEvidence / saveRun / openException go through
 *     apps/web/lib/compliance/store.ts against the ComplianceEvidence /
 *     ComplianceCheckRun / ComplianceException Prisma tables.
 *   - STUBBED data sources: the real feeds these checks should read from
 *     don't exist in this repo yet. Each stub below is explicit about what
 *     it stands in for. Wiring them up is follow-on work, not silently
 *     assumed to be done.
 *
 * TODO(governed-receipts): once feat/governed-receipts merges, replace
 * loadRecentReceipts + verifyReceipt with real reads against the governed
 * receipt store (@sports/governed) instead of the empty-array / always-ok
 * stubs below.
 */
import { runCcm, type ReceiptRow, type VerifyFn, type DeployEvent, type AccessSnapshotRow } from "@sports/compliance";
import { persistEvidence, saveRun, openException } from "../../apps/web/lib/compliance/store";

// TODO(governed-receipts): source from the real AgentReceipt / governed
// receipt store, scoped to the monitoring window. No such table exists in
// this repo yet — returns empty so the CCM run is honest about having
// checked nothing, rather than fabricating passing receipts.
async function loadRecentReceipts(): Promise<ReceiptRow[]> {
  return [];
}

// TODO(governed-receipts): swap for the real
// verifyReceiptEd25519(signed, publicKeyPem) from @sports/governed once
// feat/governed-receipts merges. Stubbed ok:true so an empty receipt window
// doesn't spuriously fail this check on top of failing checkReceiptLogging.
const verifyReceipt: VerifyFn = async () => ({ ok: true });

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

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[run-ccm] failed:", err);
  process.exit(1);
});
