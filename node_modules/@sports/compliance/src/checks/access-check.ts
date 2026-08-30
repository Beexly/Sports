import type { ControlCheckResult } from "../types";
import { makeEvidence } from "../evidence";
import type { PersistEvidenceFn } from "./receipts-check";

export type AccessSnapshotRow = {
  userId: string;
  mfaEnabled: boolean;
  privileged: boolean;
};

/**
 * CTL-ACC-001: privileged access requires MFA. Stub input: a manual or API
 * snapshot of the current access state — real integration (IdP query) is
 * left to the caller (see scripts/compliance/run-ccm.ts TODOs).
 */
export async function checkMfaCoverage(
  rows: AccessSnapshotRow[],
  persist: PersistEvidenceFn,
): Promise<ControlCheckResult> {
  const controlId = "CTL-ACC-001";
  const privileged = rows.filter((r) => r.privileged);
  const noncompliant = privileged.filter((r) => !r.mfaEnabled);
  const ok = noncompliant.length === 0;
  const detail = ok
    ? `${privileged.length} privileged user(s) all have MFA enabled`
    : `${noncompliant.length} of ${privileged.length} privileged user(s) missing MFA`;
  const evidenceId = await persist(
    makeEvidence(controlId, "access-snapshot", {
      totalPrivileged: privileged.length,
      noncompliantIds: noncompliant.map((r) => r.userId),
    }),
  );
  return { controlId, ok, detail, evidenceIds: [evidenceId] };
}
