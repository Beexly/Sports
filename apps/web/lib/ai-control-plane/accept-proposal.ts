/**
 * LSRQC KERNEL v1 — proposal ACCEPT → certificate activation (SCRIPT-ONLY).
 *
 * ██ ACCEPTANCE IS A HUMAN DECISION. NEVER RUN BY CI OR CRON. ██
 *
 * `acceptProposalAndActivate` is the ONE path in the whole kernel that flips an
 * SrqcVersion to active. The emit, skill-check, and admit surfaces are all
 * detection/ranking-only and NEVER activate. This function is invoked by hand
 * via scripts/accept-srqc-proposal.mjs (an operator with a DATABASE_URL they
 * chose) — there is intentionally no automated caller anywhere in the repo.
 *
 * What it does, in order:
 *   1. Load the proposal (its proposedPredicateText + skillKind).
 *   2. Compute indInvHash = sha256(proposedPredicateText | (priorIndInvHash ?? "")).
 *   3. recordSrqcVersionCandidate(newVersion, indInvHash, refinementReceiptHash).
 *   4. activateSrqcVersion(newVersion) — supersede-then-activate (single active).
 *   5. Mark the proposal accepted with acceptedSrqcVersion = newVersion.
 *
 * Activation changes NO control-plane behavior — admitUnderSRQC stays
 * always-ADMIT in SHADOW. It only advances which certificate generation a
 * subsequent FormalIncident / admit log is stamped with.
 *
 * Manual dry-run (read-only inspection of what WOULD be activated, no writes):
 *   DATABASE_URL=postgresql://... node -e "import('pg').then(async({default:pg})=>{const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();console.table((await c.query(`SELECT id,\"proposedPredicateText\",\"skillKind\",status FROM ind_inv_proposal WHERE status='open'`)).rows);await c.end();})"
 */

import { createHash } from "node:crypto";

import type { ControlSqlClient } from "./control-store";
import {
  activateSrqcVersion,
  recordSrqcVersionCandidate,
} from "./formal-incident";

export interface AcceptProposalInput {
  readonly proposalId: string;
  readonly newVersion: number;
  readonly priorIndInvHash?: string | null;
  readonly refinementReceiptHash?: string | null;
}

interface ProposalRow {
  readonly proposedPredicateText: string;
  readonly skillKind: string;
}

/**
 * Accept `proposalId` and activate `newVersion` as the new certificate
 * generation. SCRIPT-ONLY (never cron/CI). Throws if the proposal does not
 * exist.
 */
export async function acceptProposalAndActivate(
  sql: ControlSqlClient,
  input: AcceptProposalInput,
): Promise<void> {
  const rows = await sql.query<ProposalRow>(
    `SELECT "proposedPredicateText", "skillKind"
       FROM "ind_inv_proposal"
      WHERE "id" = $1`,
    [input.proposalId],
  );
  const proposal = rows[0];
  if (proposal === undefined) {
    throw new Error(
      `acceptProposalAndActivate: no ind_inv_proposal with id ${input.proposalId}`,
    );
  }

  const indInvHash = createHash("sha256")
    .update(proposal.proposedPredicateText)
    .update("|")
    .update(input.priorIndInvHash ?? "")
    .digest("hex");

  await recordSrqcVersionCandidate(sql, {
    version: input.newVersion,
    indInvHash,
    refinementReceiptHash: input.refinementReceiptHash ?? null,
    notes: `from proposal ${input.proposalId} skillKind=${proposal.skillKind}`,
  });

  await activateSrqcVersion(sql, input.newVersion);

  await sql.query(
    `UPDATE "ind_inv_proposal"
        SET "status" = 'accepted', "acceptedSrqcVersion" = $2
      WHERE "id" = $1`,
    [input.proposalId, input.newVersion],
  );
}
