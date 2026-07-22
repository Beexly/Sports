/**
 * Checkout-attempt repair job (directive 5.3 / 5.6).
 *
 * The durable reconciliation pathway for every attempt whose truth the
 * request/response cycle could not establish:
 *
 *   REQUEST_IN_FLIGHT (stale)  the process crashed (or the DB bind failed)
 *                              between claiming the attempt and recording the
 *                              Stripe outcome — a session may exist unbound;
 *   AMBIGUOUS                  the Stripe call ended in an unknown network
 *                              outcome — a session may or may not exist;
 *   SESSION_CREATED (past TTL) the checkout.session.expired webhook may have
 *                              been missed — completion/expiry drift.
 *
 * For each unresolved attempt the job queries Stripe BY THE ATTEMPT'S OWN
 * IDEMPOTENT METADATA (the attempt id stamped into every session at creation)
 * and converges the row:
 *
 *   session found, complete → COMPLETED (+ subscription id)
 *   session found, open     → SESSION_CREATED (bind repaired)
 *   session found, expired  → EXPIRED, active key released
 *   session provably absent → FAILED (proof: the customer's full session list
 *                             since the attempt was created contains no
 *                             session for this attempt), active key released —
 *                             ONLY now may a fresh generation mint a new key
 *   cannot prove anything   → left untouched for the next run (fail closed)
 *
 * The job is a callable server-side function with injected dependencies —
 * deliberately NOT wired to a cron here (directive: wiring optional/dormant).
 * `runCheckoutAttemptRepair()` is the production entrypoint an operator/cron
 * can invoke; it must never run with live-mode keys outside production.
 */

import type { CheckoutAttemptRecord, CheckoutAttemptStatus } from "@/lib/billing/checkout-attempt";

/** Structural slice of the Prisma client the repair job needs. */
export interface CheckoutAttemptRepairDb {
  checkoutAttempt: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
}

/** A Stripe Checkout Session as the repair job sees it. */
export interface RepairSessionView {
  id: string;
  /** Stripe session status: "open" | "complete" | "expired". */
  status: string;
  /** metadata.checkoutAttemptId stamped at creation, if present. */
  metadataAttemptId: string | null;
  subscriptionId: string | null;
}

/**
 * Stripe lookup dependency. `listSessionsByCustomerSince` MUST return the
 * COMPLETE list of the customer's checkout sessions created at/after `since`
 * (the adapter paginates to exhaustion) — completeness is what turns
 * "not found" into PROOF of absence. `retrieveSession` returns null only for
 * a definitive not-found; transport errors must throw.
 */
export interface CheckoutSessionLookup {
  listSessionsByCustomerSince(customerId: string, since: Date): Promise<RepairSessionView[]>;
  retrieveSession(sessionId: string): Promise<RepairSessionView | null>;
}

export interface CheckoutAttemptRepairReport {
  scanned: number;
  completed: number;
  rebound: number;
  expired: number;
  provenAbsent: number;
  unresolved: number;
  errors: number;
}

/** Attempts younger than this are left alone — the owning request may still be running. */
export const REPAIR_MIN_AGE_MS = 10 * 60 * 1000;

const UNRESOLVED_STATUSES: readonly CheckoutAttemptStatus[] = [
  "REQUEST_IN_FLIGHT",
  "AMBIGUOUS",
];

type RepairRow = CheckoutAttemptRecord & { createdAt: Date; updatedAt: Date };

/**
 * One repair pass. Never throws for a single attempt's failure — errors are
 * counted and the attempt stays unresolved for the next pass (durable retry,
 * not best-effort).
 */
export async function repairUnresolvedCheckoutAttempts(
  deps: { db: CheckoutAttemptRepairDb; stripeSessions: CheckoutSessionLookup },
  opts: { now?: Date; minAgeMs?: number; batchLimit?: number } = {},
): Promise<CheckoutAttemptRepairReport> {
  const now = opts.now ?? new Date();
  const minAgeMs = opts.minAgeMs ?? REPAIR_MIN_AGE_MS;
  const batchLimit = opts.batchLimit ?? 50;
  const staleBefore = new Date(now.getTime() - minAgeMs);

  const report: CheckoutAttemptRepairReport = {
    scanned: 0,
    completed: 0,
    rebound: 0,
    expired: 0,
    provenAbsent: 0,
    unresolved: 0,
    errors: 0,
  };

  const [unresolvedRaw, driftedRaw] = await Promise.all([
    // Crashed/ambiguous attempts, old enough that no request still owns them.
    deps.db.checkoutAttempt.findMany({
      where: { status: { in: [...UNRESOLVED_STATUSES] }, updatedAt: { lt: staleBefore } },
      orderBy: { updatedAt: "asc" },
      take: batchLimit,
    }),
    // Sessions past the attempt TTL whose expiry webhook may have been missed.
    deps.db.checkoutAttempt.findMany({
      where: { status: "SESSION_CREATED", expiresAt: { lt: now } },
      orderBy: { expiresAt: "asc" },
      take: batchLimit,
    }),
  ]);

  for (const raw of [...unresolvedRaw, ...driftedRaw]) {
    const attempt = raw as RepairRow;
    report.scanned += 1;
    try {
      await repairOneAttempt(deps, attempt, now, report);
    } catch (err) {
      report.errors += 1;
      const message = err instanceof Error ? err.message : "unknown";
      // eslint-disable-next-line no-console
      console.error(
        `[checkout-repair] attempt ${attempt.id} left unresolved (will retry next pass): ${message}`,
      );
    }
  }

  if (report.unresolved > 0) {
    // Owner queue signal (directive 5.3): unresolved ambiguity must be
    // surfaced, never silently aged out.
    // eslint-disable-next-line no-console
    console.warn(
      `[checkout-repair] ${report.unresolved} attempt(s) remain unresolved after this pass`,
    );
  }
  return report;
}

async function repairOneAttempt(
  deps: { db: CheckoutAttemptRepairDb; stripeSessions: CheckoutSessionLookup },
  attempt: RepairRow,
  now: Date,
  report: CheckoutAttemptRepairReport,
): Promise<void> {
  // Fast path: the attempt already knows its session id (bind succeeded, the
  // expiry/completion webhook was missed) — ask Stripe about that session.
  if (attempt.stripeSessionId) {
    const session = await deps.stripeSessions.retrieveSession(attempt.stripeSessionId);
    if (session) {
      await convergeOnSession(deps.db, attempt, session, report);
      return;
    }
    // Definitive not-found for a bound session id: fall through to the
    // metadata search (the id may have been bound from a partial write).
  }

  if (!attempt.customerId) {
    // No customer to search under. Once the idempotency window has lapsed the
    // original response can never be replayed and any session would have
    // expired — close the generation, releasing the intent for a fresh key.
    if (new Date(attempt.expiresAt).getTime() <= now.getTime()) {
      await deps.db.checkoutAttempt.updateMany({
        where: { id: attempt.id, status: { in: [...UNRESOLVED_STATUSES, "SESSION_CREATED"] } },
        data: {
          status: "EXPIRED",
          activeClientIntentId: null,
          lastErrorKind: "repair_expired_unresolvable",
        },
      });
      report.expired += 1;
    } else {
      report.unresolved += 1;
    }
    return;
  }

  // Search the customer's COMPLETE session list since just before the attempt
  // was created for our idempotent metadata stamp.
  const searchSince = new Date(new Date(attempt.createdAt).getTime() - 60 * 60 * 1000);
  const sessions = await deps.stripeSessions.listSessionsByCustomerSince(
    attempt.customerId,
    searchSince,
  );
  const match = sessions.find((s) => s.metadataAttemptId === attempt.id);

  if (match) {
    await convergeOnSession(deps.db, attempt, match, report);
    return;
  }

  // PROVEN ABSENT: the complete list carries no session for this attempt —
  // the ambiguous request never committed. Only now is releasing the intent
  // (→ fresh attempt, fresh key on the next request) safe.
  await deps.db.checkoutAttempt.updateMany({
    where: { id: attempt.id, status: { in: [...UNRESOLVED_STATUSES] } },
    data: {
      status: "FAILED",
      activeClientIntentId: null,
      lastErrorKind: "repair_proven_absent",
    },
  });
  report.provenAbsent += 1;
}

async function convergeOnSession(
  db: CheckoutAttemptRepairDb,
  attempt: RepairRow,
  session: RepairSessionView,
  report: CheckoutAttemptRepairReport,
): Promise<void> {
  const nonTerminal = [...UNRESOLVED_STATUSES, "SESSION_CREATED"];
  if (session.status === "complete") {
    await db.checkoutAttempt.updateMany({
      where: { id: attempt.id, status: { in: nonTerminal } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        stripeSessionId: session.id,
        ...(session.subscriptionId ? { stripeSubscriptionId: session.subscriptionId } : {}),
        lastErrorKind: null,
      },
    });
    report.completed += 1;
    return;
  }
  if (session.status === "expired") {
    await db.checkoutAttempt.updateMany({
      where: { id: attempt.id, status: { in: nonTerminal } },
      data: {
        status: "EXPIRED",
        activeClientIntentId: null,
        stripeSessionId: session.id,
        lastErrorKind: "session_expired",
      },
    });
    report.expired += 1;
    return;
  }
  // "open": the session exists and is still payable — repair the bind.
  await db.checkoutAttempt.updateMany({
    where: { id: attempt.id, status: { in: [...UNRESOLVED_STATUSES] } },
    data: {
      status: "SESSION_CREATED",
      stripeSessionId: session.id,
      lastErrorKind: null,
    },
  });
  report.rebound += 1;
}
