import type { ControlCheckResult, EvidenceObject } from "../types";
import { makeEvidence } from "../evidence";

/**
 * Local shape mirroring the sibling `feat/governed-receipts` branch's
 * `SignedGovernedReceipt` (packages/governed, not merged yet — not
 * importable here). Fields kept intentionally close so the swap-over is a
 * mechanical rename, not a redesign.
 *
 * TODO(governed-receipts): swap for the real @sports/governed
 * `SignedGovernedReceipt` export once feat/governed-receipts merges.
 */
export type ReceiptRow = {
  id: string;
  decision: "ADMIT" | "REFUSE";
  policyVersion?: string;
  signature?: { kid: string; sig: string; alg: string };
  raw?: unknown;
};

/**
 * TODO(governed-receipts): swap for the real @sports/governed
 * `verifyReceiptEd25519(signed, publicKeyPem) => {ok:true}|{ok:false,reason}`
 * once feat/governed-receipts merges. Until then this is an injected seam so
 * callers (and tests) can mock verification without a real receipt store or
 * key material.
 */
export type VerifyFn = (row: ReceiptRow) => Promise<{ ok: boolean; reason?: string }>;

export type PersistEvidenceFn = (evidence: Omit<EvidenceObject, "id">) => Promise<string>;

/**
 * CTL-LOG-001: governed-agent actions are receipt-logged.
 *
 * TODO(governed-receipts): `rows` should eventually be sourced from a real
 * receipt store query (e.g. AgentReceipt table / @sports/governed reader)
 * scoped to the monitoring window, injected by the caller.
 */
export async function checkReceiptLogging(
  rows: ReceiptRow[],
  persist: PersistEvidenceFn,
): Promise<ControlCheckResult> {
  const controlId = "CTL-LOG-001";
  const ok = rows.length > 0;
  const detail = ok
    ? `${rows.length} receipt(s) logged in window`
    : "No receipts found in window";
  const evidenceId = await persist(
    makeEvidence(controlId, "governed-receipt-log", {
      count: rows.length,
      receiptIds: rows.map((r) => r.id),
    }),
  );
  return { controlId, ok, detail, evidenceIds: [evidenceId] };
}

/**
 * CTL-LOG-002 (signature half): every receipt's signature verifies.
 */
export async function checkReceiptSignatures(
  rows: ReceiptRow[],
  verify: VerifyFn,
  persist: PersistEvidenceFn,
): Promise<ControlCheckResult> {
  const controlId = "CTL-LOG-002";
  const results = await Promise.all(rows.map((row) => verify(row)));
  const failed = results.filter((r) => !r.ok).length;
  const ok = failed === 0;
  const detail = ok
    ? `${rows.length} receipt signature(s) verified`
    : `${failed} of ${rows.length} receipt signature(s) failed verification`;
  const evidenceId = await persist(
    makeEvidence(controlId, "governed-receipt-log", {
      total: rows.length,
      failed,
      failedIds: rows.filter((_, i) => !results[i]?.ok).map((r) => r.id),
    }),
  );
  return { controlId, ok, detail, evidenceIds: [evidenceId] };
}

/**
 * CTL-LOG-002 (policy-version half): every receipt records the policy
 * version that produced its decision. Vacuously true over an empty window —
 * there is nothing to flag, not evidence of compliance by itself.
 */
export async function checkPolicyVersionPresent(
  rows: ReceiptRow[],
  persist: PersistEvidenceFn,
): Promise<ControlCheckResult> {
  const controlId = "CTL-LOG-002";
  const missing = rows.filter((r) => !r.policyVersion || r.policyVersion.length === 0);
  const ok = missing.length === 0;
  const detail = ok
    ? `Policy version present on all ${rows.length} receipt(s)`
    : `${missing.length} of ${rows.length} receipt(s) missing a policy version`;
  const evidenceId = await persist(
    makeEvidence(controlId, "governed-receipt-log", {
      total: rows.length,
      missingIds: missing.map((r) => r.id),
    }),
  );
  return { controlId, ok, detail, evidenceIds: [evidenceId] };
}
