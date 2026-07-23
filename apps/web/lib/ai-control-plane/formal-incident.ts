/**
 * Versioned envelope writers — FormalIncident + SrqcVersion (exactly-once
 * runtime handoff 2026-07-22, on top of Track A + Track B on the SAME branch
 * by owner authorization).
 *
 * These build on the SAME minimal `ControlSqlClient` seam control-store.ts
 * already defines, in the SAME raw-parameterized-SQL, fail-closed style as
 * event-ledger.ts — no new database client, no ORM layer.
 *
 * POSTURE (do not let this drift): DETECTION-ONLY. Writing a `FormalIncident`
 * row records that Track B's projection WITNESSED an abstract CTI the Formal
 * Foundry's proofs forbid. It changes no control-plane decision;
 * `admitUnderSRQC` (srqc-projection.ts) remains always-ADMIT, and there is no
 * ENFORCE path here. `SrqcVersion` activation is a HUMAN decision made via an
 * admin script (scripts/activate-srqc-version.mjs) — never CI/cron.
 *
 * EXACTLY-ONCE: de-duplication is NOT this module's job. `recordFormalIncident`
 * is a plain append that the CALLER gates on Track B's existing
 * `processed_event` exactly-once mark (sink `FORMAL_RECEIPT_VIOLATION_SINK`) —
 * see formal-receipt-job.ts, where the incident insert is co-located with the
 * `markProcessed(...) === "marked"` branch so an incident is written at most
 * once per witnessEventId. As a belt-and-suspenders SECOND layer, the row's
 * own `id` is derived deterministically from `${eventIds[0]}:${violationKind}`
 * and inserted `ON CONFLICT (id) DO NOTHING`, so even a double-call with the
 * same witness can never write two rows. This module deliberately adds NO
 * independent dedup mechanism beyond that idempotent id.
 */

import type { ControlSqlClient } from "./control-store";

/** The two abstract CTI classes Track B can witness (see srqc-projection.ts). */
export type FormalIncidentKind = "GE2_PENDING" | "REJECTED_FP_UNBOUND";

export interface RecordFormalIncidentInput {
  readonly violationKind: FormalIncidentKind;
  /** The projected abstract-state fields this incident captures. */
  readonly abstractState: Readonly<Record<string, unknown>>;
  /** The witnessEventId(s) this incident is gated on — first element also
   *  seeds the deterministic, idempotent row id. Must be non-empty. */
  readonly eventIds: readonly string[];
  /** The SrqcVersion.version that was active when this was recorded, or null. */
  readonly srqcVersion?: number | null;
}

/**
 * Append one `formal_incident` row. The row `id` is derived deterministically
 * from `${eventIds[0]}:${violationKind}` and inserted `ON CONFLICT DO NOTHING`,
 * so a repeat call with the same witness is a pure no-op — the SECOND layer of
 * the exactly-once story (the FIRST being the caller's `processed_event` gate).
 * The insert selects `id` in a subquery only to keep this a single statement;
 * the deterministic id is what makes it idempotent.
 */
export async function recordFormalIncident(
  sql: ControlSqlClient,
  input: RecordFormalIncidentInput,
): Promise<void> {
  const firstEventId = input.eventIds[0];
  if (firstEventId === undefined) {
    throw new Error(
      "recordFormalIncident requires at least one eventId — the witness event " +
        "the incident is gated on and whose id seeds the idempotent row id.",
    );
  }
  const id = `${firstEventId}:${input.violationKind}`;
  await sql.query(
    `INSERT INTO "formal_incident"
       ("id", "violationKind", "abstractState", "eventIds", "srqcVersion", "status")
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, 'open')
     ON CONFLICT ("id") DO NOTHING`,
    [
      id,
      input.violationKind,
      JSON.stringify(input.abstractState),
      JSON.stringify(input.eventIds),
      input.srqcVersion ?? null,
    ],
  );
}

// ─── SrqcVersion register ───────────────────────────────────────────────────

export interface ActiveSrqcVersion {
  readonly version: number;
  readonly indInvHash: string;
}

/**
 * The currently-active certificate version, or null when none is active.
 * At most one row is ever `status='active'` (enforced by the activation
 * script's supersede-then-activate flow); `LIMIT 1` is defensive.
 */
export async function getActiveSrqcVersion(
  sql: ControlSqlClient,
): Promise<ActiveSrqcVersion | null> {
  const rows = await sql.query<{ version: number; indInvHash: string }>(
    `SELECT "version", "indInvHash"
       FROM "srqc_version"
      WHERE "status" = 'active'
      ORDER BY "version" DESC
      LIMIT 1`,
    [],
  );
  const row = rows[0];
  return row === undefined
    ? null
    : { version: row.version, indInvHash: row.indInvHash };
}

export interface RecordSrqcVersionCandidateInput {
  readonly version: number;
  readonly indInvHash: string;
  readonly refinementReceiptHash?: string | null;
  readonly notes?: string | null;
}

/**
 * Insert a `candidate` SrqcVersion row (idempotent on `version`). Used by the
 * admin activation script before it promotes the version to `active`.
 */
export async function recordSrqcVersionCandidate(
  sql: ControlSqlClient,
  input: RecordSrqcVersionCandidateInput,
): Promise<void> {
  await sql.query(
    `INSERT INTO "srqc_version"
       ("version", "indInvHash", "refinementReceiptHash", "status")
     VALUES ($1, $2, $3, 'candidate')
     ON CONFLICT ("version") DO NOTHING`,
    [input.version, input.indInvHash, input.refinementReceiptHash ?? null],
  );
}

/**
 * Promote `version` to `active`: supersede whatever is currently active, then
 * set the target active with `activatedAt = now()`.
 *
 * This is a SCRIPT-ONLY admin operation (scripts/activate-srqc-version.mjs),
 * run by a human, never a concurrent hot path — so it does not need to be a
 * single atomic statement. It is nonetheless expressed as ONE CTE statement
 * here (supersede-then-activate in a single round-trip) because the CTE form
 * is both cheaper and free of an intermediate window in which zero versions
 * are active.
 */
export async function activateSrqcVersion(
  sql: ControlSqlClient,
  version: number,
): Promise<void> {
  await sql.query(
    `WITH superseded AS (
       UPDATE "srqc_version"
          SET "status" = 'superseded'
        WHERE "status" = 'active' AND "version" <> $1
       RETURNING "version"
     )
     UPDATE "srqc_version"
        SET "status" = 'active', "activatedAt" = now()
      WHERE "version" = $1`,
    [version],
  );
}
