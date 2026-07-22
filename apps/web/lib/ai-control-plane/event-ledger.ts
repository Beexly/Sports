/**
 * Idempotent control-event ledger read helpers (Track A, exactly-once
 * runtime handoff 2026-07-22).
 *
 * The WRITE side lives inside control-store.ts's `finalizeSuccess` /
 * `finalizeFailure` / `recordAttemptFailure` — each folds an
 * `INSERT INTO "control_event_ledger" ... ON CONFLICT ("eventId") DO NOTHING`
 * CTE into the SAME SQL statement as the authoritative state transition it
 * records, gated on that transition having actually applied. See that
 * file's doc comments for the full argument. This module is deliberately
 * NOT another writer for those three events — duplicating the write path
 * outside the fenced statement would reopen exactly the race the CTE
 * approach closes (a caller could observe a fenced-out finalize as
 * "applied" and write a ledger row for a transition that never happened).
 *
 * What lives here:
 *  - `deriveControlEventId`: the SAME deterministic-id scheme control-store
 *    uses inline, exposed for OTHER, future writers (Track B's scheduled
 *    receipt job, or any additional emission point) so every producer in
 *    the codebase derives ids the same way.
 *  - `alreadyProcessed` / `markProcessed`: the READ-side idempotency gate
 *    any PULL-based consumer (Formal Heartbeat's future receipt export,
 *    or any other sink) checks before acting and marks after acting —
 *    Pattern D from the handoff:
 *
 *      if (await alreadyProcessed(db, eventId, sink)) return;
 *      // ... do the side effect ...
 *      await markProcessed(db, eventId, sink);
 *
 *  - `readRecentEvents`: a plain read query for consumers that poll the
 *    ledger by source/sourceId/time window (e.g. Track B's scheduled job).
 *
 * All of it is built on the SAME minimal `ControlSqlClient` seam
 * control-store.ts already defines — no new database client, no ORM layer.
 */

import { StoreUnavailable } from "./errors";
import type { ControlSqlClient } from "./control-store";

// ─── Deterministic event ids ────────────────────────────────────────────────

/**
 * The deterministic id scheme control-store.ts uses inline for its three
 * emission points. Exposed here so OTHER producers derive ids the same way
 * — never wall-clock, never a random UUID generated at the write site.
 *
 * Stability argument: `sourceId` (an invocationId or attemptId) is a cuid
 * that is never reused once assigned, and `eventType` is a fixed label for
 * a specific kind of outcome on that source row. The pair is therefore
 * permanently unique to ONE logical occurrence — a retry of the same
 * logical write derives the SAME id and collides harmlessly under
 * `ON CONFLICT DO NOTHING`.
 */
export function deriveControlEventId(input: {
  readonly sourceId: string;
  readonly eventType: string;
}): string {
  return `${input.sourceId}:${input.eventType}`;
}

// ─── Read-side idempotency gate (Pattern D) ────────────────────────────────

/**
 * True if `sink` has already recorded finishing work for `eventId`. Callers
 * MUST check this before performing a side effect and call `markProcessed`
 * after — this function alone does not prevent a race between two
 * concurrent runs of the SAME consumer; see `markProcessed`'s own
 * `ON CONFLICT DO NOTHING` for the actual mutual-exclusion guarantee under
 * concurrency. For a single-flight scheduled job (Track B's intended
 * consumer), the check-then-mark pair is sufficient.
 */
export async function alreadyProcessed(
  sql: ControlSqlClient,
  eventId: string,
  sink: string,
): Promise<boolean> {
  const rows = await sql.query<{ eventId: string }>(
    `SELECT "eventId" FROM "processed_event" WHERE "eventId" = $1 AND "sink" = $2`,
    [eventId, sink],
  );
  return rows.length > 0;
}

export type MarkProcessedResult = "marked" | "already_marked";

/**
 * Idempotently record that `sink` finished acting on `eventId`.
 * `ON CONFLICT DO NOTHING` — a second call (retry, or a race with another
 * runner of the same consumer) is a pure no-op, distinguishable via the
 * return value for callers that want to log it.
 */
export async function markProcessed(
  sql: ControlSqlClient,
  eventId: string,
  sink: string,
): Promise<MarkProcessedResult> {
  const rows = await sql.query<{ eventId: string }>(
    `INSERT INTO "processed_event" ("eventId", "sink")
     VALUES ($1, $2)
     ON CONFLICT ("eventId", "sink") DO NOTHING
     RETURNING "eventId"`,
    [eventId, sink],
  );
  return rows.length > 0 ? "marked" : "already_marked";
}

// ─── Plain reads ────────────────────────────────────────────────────────────

export interface ControlEventRow {
  readonly eventId: string;
  readonly source: string;
  readonly sourceId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly createdAt: Date;
}

/**
 * Read ledger events created in `[sinceInclusive, untilExclusive)`, oldest
 * first. Read-only — throws `StoreUnavailable` on a store problem, matching
 * control-store.ts's fail-closed convention (a caller polling this to build
 * a formal-heartbeat window should not silently treat a broken read as "no
 * events" — that would manufacture a false-clean result).
 */
export async function readRecentEvents(
  sql: ControlSqlClient,
  input: {
    readonly sinceInclusive: Date;
    readonly untilExclusive: Date;
    readonly source?: string;
  },
): Promise<readonly ControlEventRow[]> {
  const rows = input.source
    ? await sql.query<ControlEventRow>(
        `SELECT "eventId", "source", "sourceId", "eventType", "payload", "createdAt"
           FROM "control_event_ledger"
          WHERE "createdAt" >= $1 AND "createdAt" < $2 AND "source" = $3
          ORDER BY "createdAt" ASC`,
        [input.sinceInclusive, input.untilExclusive, input.source],
      )
    : await sql.query<ControlEventRow>(
        `SELECT "eventId", "source", "sourceId", "eventType", "payload", "createdAt"
           FROM "control_event_ledger"
          WHERE "createdAt" >= $1 AND "createdAt" < $2
          ORDER BY "createdAt" ASC`,
        [input.sinceInclusive, input.untilExclusive],
      );
  if (!Array.isArray(rows)) {
    throw new StoreUnavailable(
      "control_event_ledger read returned a non-array — treating the store " +
        "as unavailable (fail closed) rather than reporting a silently empty window.",
    );
  }
  return rows;
}
