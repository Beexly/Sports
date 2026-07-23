/**
 * LSRQC KERNEL v1 — ON-POLICY proposal emitter (closed self-refinement loop,
 * on top of the CTI-candidate miner + the versioned SrqcVersion envelope).
 *
 * WHAT THIS IS. `emitProposalsFromOpenCtis` turns open `cti_candidate` rows
 * (each a proof-forbidden abstract transition `{before, action, after}` mined
 * one step from an IndInv violation) into `ind_inv_proposal` rows — HINDSIGHT
 * SKILLS proposing to STRENGTHEN the currently-active certificate so it forbids
 * that `(before, action)` pair.
 *
 * ON-POLICY GATE (do not remove). A proposal is a strengthening of the CURRENT
 * certificate, so it can only be minted against a LIVE active baseline. If
 * `getActiveSrqcVersion` returns null, this emits ZERO proposals and returns 0
 * — there is no baseline to strengthen. `activeVersionAtMint` stamps which
 * baseline each proposal was minted against.
 *
 * POSTURE (do not let this drift): PROPOSAL / RANKING INPUT ONLY. This writes
 * ONLY `ind_inv_proposal` rows. It NEVER edits a `.tla` file, NEVER calls
 * `activateSrqcVersion`, and changes NO control-plane decision. Only the
 * explicit human/script `acceptProposalAndActivate` flow flips a version.
 *
 * IDEMPOTENCY. Each proposal carries a `sourceWindowHash` = sha256 over
 * canonical(before)|action|canonical(after), and the table has a UNIQUE
 * (sourceWindowHash, activeVersionAtMint). The INSERT is `ON CONFLICT DO
 * NOTHING RETURNING id`, and only rows actually inserted are counted — so a
 * re-run against the same open candidates and the same active baseline mints
 * zero new proposals.
 */

import { createHash } from "node:crypto";

import type { ControlSqlClient } from "./control-store";
import { getActiveSrqcVersion } from "./formal-incident";

/** The skill class of a CTI-derived forbid — a strengthening of the IndInv. */
const STRENGTHEN_SKILL_KIND = "strengthen" as const;

interface OpenCtiRow {
  readonly id: string;
  readonly before: unknown;
  readonly action: string;
  readonly after: unknown;
}

/**
 * Fixed-field canonical serialization of a projected abstract state — the SAME
 * idea cti-miner.ts uses so the derived window hash is stable across runs and
 * independent of JSONB key order. Reads defensively from an unknown JSONB
 * value (the row came back from Postgres).
 */
function canonicalState(value: unknown): string {
  const s = (value ?? {}) as Record<string, unknown>;
  return JSON.stringify([
    s["invocationId"] ?? null,
    s["claimPhase"] ?? null,
    s["exposurePhase"] ?? null,
    s["pendingCountClass"] ?? null,
    s["fingerprintBound"] ?? null,
    s["hasRejectedFp"] ?? null,
  ]);
}

/** sha256 over canonical(before)|action|canonical(after) — reuses the
 *  cti-miner canonicalization idea so the same forbidden transition always
 *  hashes to the same window key. */
function sourceWindowHash(row: OpenCtiRow): string {
  return createHash("sha256")
    .update(canonicalState(row.before))
    .update("|")
    .update(row.action)
    .update("|")
    .update(canonicalState(row.after))
    .digest("hex");
}

/**
 * Emit one ON-POLICY `ind_inv_proposal` per open `cti_candidate`, minted
 * against the active certificate baseline. Returns the number of NEW proposals
 * inserted (idempotent — a re-run mints zero). Returns 0 with no writes when no
 * certificate is active (the on-policy gate).
 */
export async function emitProposalsFromOpenCtis(
  sql: ControlSqlClient,
): Promise<number> {
  const active = await getActiveSrqcVersion(sql);
  if (active === null) {
    // On-policy gate: a proposal is a strengthening of the CURRENT certificate;
    // with no active baseline there is nothing to strengthen. Skip, do not mint.
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        kind: "srqc_proposal_skip",
        reason: "no_active_srqc_version",
        at: new Date().toISOString(),
      }),
    );
    return 0;
  }

  const openCandidates = await sql.query<OpenCtiRow>(
    `SELECT "id", "before", "action", "after"
       FROM "cti_candidate"
      WHERE "status" = 'open'
      ORDER BY "createdAt" ASC`,
    [],
  );

  let inserted = 0;
  for (const candidate of openCandidates) {
    const windowHash = sourceWindowHash(candidate);
    const predicateText =
      `Strengthen IndInv v${active.version}: forbid abstract action ` +
      `${candidate.action} out of state ${JSON.stringify(candidate.before)} — ` +
      `it reaches forbidden successor ${JSON.stringify(candidate.after)}.`;

    const rows = await sql.query<{ id: string }>(
      `INSERT INTO "ind_inv_proposal"
         ("id", "ctiCandidateIds", "proposedPredicateText", "skillKind",
          "sourceWindowHash", "activeVersionAtMint", "status")
       VALUES (gen_random_uuid()::text, $1::jsonb, $2, $3, $4, $5, 'open')
       ON CONFLICT ("sourceWindowHash", "activeVersionAtMint") DO NOTHING
       RETURNING "id"`,
      [
        JSON.stringify([candidate.id]),
        predicateText,
        STRENGTHEN_SKILL_KIND,
        windowHash,
        active.version,
      ],
    );
    if (rows.length > 0) inserted += 1;
  }

  return inserted;
}
