import type { ControlCheckResult } from "../types";
import { makeEvidence } from "../evidence";
import type { PersistEvidenceFn } from "./receipts-check";

export type DeployEvent = {
  id: string;
  env: "production" | "staging" | "preview" | string;
  prNumber?: number;
  requiredChecksOk?: boolean;
  deployedAt: string;
};

/**
 * CTL-CHG-001: production deploys go through change management — every
 * production deploy must reference a PR and have required CI checks pass.
 * Non-production deploys are informational and never fail this control.
 */
export async function checkProdDeployChangeMgmt(
  events: DeployEvent[],
  persist: PersistEvidenceFn,
): Promise<ControlCheckResult> {
  const controlId = "CTL-CHG-001";
  const prodEvents = events.filter((e) => e.env === "production");
  const flagged = prodEvents.filter(
    (e) => !e.prNumber || e.requiredChecksOk === false,
  );
  const ok = flagged.length === 0;
  const detail = ok
    ? `${prodEvents.length} production deploy(s) all had a PR and passing checks`
    : `${flagged.length} of ${prodEvents.length} production deploy(s) missing a PR or failed required checks`;
  const evidenceId = await persist(
    makeEvidence(controlId, "deploy-log", {
      totalProd: prodEvents.length,
      flaggedIds: flagged.map((e) => e.id),
    }),
  );
  return { controlId, ok, detail, evidenceIds: [evidenceId] };
}
