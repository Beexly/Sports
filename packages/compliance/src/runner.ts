import type { CcmRunResult, ControlCheckResult } from "./types";
import { makeEvidence } from "./evidence";
import {
  checkReceiptLogging,
  checkReceiptSignatures,
  checkPolicyVersionPresent,
  type ReceiptRow,
  type VerifyFn,
  type PersistEvidenceFn,
} from "./checks/receipts-check";
import { checkProdDeployChangeMgmt, type DeployEvent } from "./checks/deploy-check";
import { checkMfaCoverage, type AccessSnapshotRow } from "./checks/access-check";

export type OpenExceptionFn = (controlId: string, detail: string) => Promise<void>;
export type SaveRunFn = (run: CcmRunResult) => Promise<void>;

export type CcmDeps = {
  receiptRows: ReceiptRow[];
  verifyReceiptSignature: VerifyFn;
  deployEvents: DeployEvent[];
  accessRows: AccessSnapshotRow[];
  persistEvidence: PersistEvidenceFn;
  saveRun: SaveRunFn;
  openException: OpenExceptionFn;
};

/**
 * runCcm — executes the full CCM check suite once, always records a
 * CTL-MON-001 "run completed" evidence+result (the run itself is the
 * evidence continuous monitoring is happening), opens an exception for
 * every failing check, persists the aggregated run, and returns it.
 *
 * This function MONITORS receipts/deploys/access after the fact — it never
 * gates or blocks anything, and it does not touch SRQC/admitUnderSRQC.
 */
export async function runCcm(deps: CcmDeps): Promise<CcmRunResult> {
  const results: ControlCheckResult[] = [];

  results.push(await checkReceiptLogging(deps.receiptRows, deps.persistEvidence));
  results.push(
    await checkReceiptSignatures(deps.receiptRows, deps.verifyReceiptSignature, deps.persistEvidence),
  );
  results.push(await checkPolicyVersionPresent(deps.receiptRows, deps.persistEvidence));
  results.push(await checkProdDeployChangeMgmt(deps.deployEvents, deps.persistEvidence));
  results.push(await checkMfaCoverage(deps.accessRows, deps.persistEvidence));

  const at = new Date().toISOString();
  const monEvidenceId = await deps.persistEvidence(
    makeEvidence("CTL-MON-001", "ccm-run-history", { at, checksRun: results.length }),
  );
  results.push({
    controlId: "CTL-MON-001",
    ok: true,
    detail: "CCM run completed",
    evidenceIds: [monEvidenceId],
  });

  for (const result of results) {
    if (!result.ok) {
      await deps.openException(result.controlId, result.detail);
    }
  }

  const ok = results.every((r) => r.ok);
  const run: CcmRunResult = { at, ok, results };
  await deps.saveRun(run);
  return run;
}
