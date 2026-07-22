/**
 * ObservabilitySink + durable recovery queue (directive §9.1/§9.7) — the
 * NON-BLOCKING half of the old "ledger".
 *
 * §9.1 split: everything here is secondary telemetry. NO method throws, NO
 * method blocks execution, and NOTHING here may ever cause a successful paid
 * provider call to be retried. This is the exact opposite of
 * `AuthoritativeControlStore` (control-store.ts), which fails closed BEFORE
 * dispatch.
 *
 * §9.7 durable drain-later path: when a post-success authoritative write
 * cannot land (store down or fenced), the pipeline enqueues a row in the
 * minimal table-backed recovery queue `ai_telemetry_recovery` (same hardened
 * outbox semantics as the settlement work: lease-fenced claim, attempt caps,
 * delivered/abandoned terminal states — never silent drop). Enqueueing is
 * itself best-effort: if even the queue is down, we log, stay DEGRADED
 * in-memory, and STILL return the provider result.
 */

import type { ControlSqlClient } from "./control-store";

export type RecoveryKind = "FINALIZE_SUCCESS" | "ATTEMPT_TELEMETRY";

export interface RecoveryEnqueueInput {
  readonly id: string;
  readonly invocationId: string;
  readonly kind: RecoveryKind;
  /** JSON-serializable payload replayed by the drainer. */
  readonly payload: unknown;
}

export interface RecoveryQueueRow {
  readonly id: string;
  readonly invocationId: string;
  readonly kind: string;
  readonly payload: unknown;
  readonly attempts: number;
}

/** Structured logger seam (defaults to console.warn). */
export type ObservabilityLogger = (message: string, error: unknown) => void;

const defaultLogger: ObservabilityLogger = (message, error) => {
  // eslint-disable-next-line no-console
  console.warn(`[ai-control-plane:observability] ${message}`, error);
};

/**
 * Non-throwing observability boundary. `sql` may be null (no queue configured)
 * — every operation then degrades in-memory and logs.
 */
export class ObservabilitySink {
  private readonly sql: ControlSqlClient | null;
  private readonly log: ObservabilityLogger;
  private degraded = false;

  constructor(sql: ControlSqlClient | null, logger: ObservabilityLogger = defaultLogger) {
    this.sql = sql;
    this.log = logger;
  }

  /** True if ANY observability operation has failed this invocation. */
  isDegraded(): boolean {
    return this.degraded;
  }

  /** Explicitly mark telemetry degraded (e.g. a fenced/failed finalize). */
  markDegraded(message: string, error: unknown): void {
    this.degraded = true;
    this.log(message, error);
  }

  /**
   * §9.7: enqueue a durable recovery entry. NEVER throws; a queue failure
   * logs, flips DEGRADED, and returns false.
   */
  async enqueueRecovery(input: RecoveryEnqueueInput): Promise<boolean> {
    if (this.sql === null) {
      this.markDegraded(
        `recovery enqueue skipped (no queue store): ${input.kind} for ${input.invocationId}`,
        null,
      );
      return false;
    }
    try {
      await this.sql.query(
        `INSERT INTO "ai_telemetry_recovery"
           ("id", "invocationId", "kind", "payload")
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT ("id") DO NOTHING`,
        [input.id, input.invocationId, input.kind, JSON.stringify(input.payload ?? null)],
      );
      return true;
    } catch (error) {
      this.markDegraded(
        `recovery enqueue failed: ${input.kind} for ${input.invocationId}`,
        error,
      );
      return false;
    }
  }
}

// ─── Drain-side helpers (lease-fenced, attempt-capped — §9.7) ─────────────────

/**
 * Claim a batch of undelivered, unleased (or lease-expired), non-abandoned
 * recovery entries with a fencing lease. Atomic single UPDATE; two drainers
 * can never claim the same row for overlapping leases.
 */
export async function claimRecoveryBatch(
  sql: ControlSqlClient,
  args: {
    readonly drainerToken: string;
    readonly now: Date;
    readonly leaseMs: number;
    readonly limit: number;
  },
): Promise<RecoveryQueueRow[]> {
  const leaseUntil = new Date(args.now.getTime() + args.leaseMs);
  return sql.query<RecoveryQueueRow>(
    `UPDATE "ai_telemetry_recovery"
        SET "leaseOwner" = $1, "leaseExpiresAt" = $2,
            "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "ai_telemetry_recovery"
         WHERE "deliveredAt" IS NULL
           AND "abandonedAt" IS NULL
           AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= $3)
           AND "attempts" < "maxAttempts"
         ORDER BY "createdAt" ASC
         LIMIT $4
      )
      RETURNING "id", "invocationId", "kind", "payload", "attempts"`,
    [args.drainerToken, leaseUntil, args.now, args.limit],
  );
}

/** Mark a claimed entry delivered — fenced on the drainer token. */
export async function markRecoveryDelivered(
  sql: ControlSqlClient,
  args: { readonly id: string; readonly drainerToken: string; readonly now: Date },
): Promise<boolean> {
  const rows = await sql.query<{ id: string }>(
    `UPDATE "ai_telemetry_recovery"
        SET "deliveredAt" = $1, "leaseOwner" = NULL, "leaseExpiresAt" = NULL
      WHERE "id" = $2 AND "leaseOwner" = $3 AND "deliveredAt" IS NULL
      RETURNING "id"`,
    [args.now, args.id, args.drainerToken],
  );
  return rows.length > 0;
}

/**
 * Abandon an entry that hit its attempt cap — an EXPLICIT terminal state
 * (never silent drop), visible to the owner queue.
 */
export async function abandonExhaustedRecovery(
  sql: ControlSqlClient,
  args: { readonly now: Date },
): Promise<number> {
  const rows = await sql.query<{ id: string }>(
    `UPDATE "ai_telemetry_recovery"
        SET "abandonedAt" = $1, "leaseOwner" = NULL, "leaseExpiresAt" = NULL
      WHERE "deliveredAt" IS NULL AND "abandonedAt" IS NULL
        AND "attempts" >= "maxAttempts"
        AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= $1)
      RETURNING "id"`,
    [args.now],
  );
  return rows.length;
}
