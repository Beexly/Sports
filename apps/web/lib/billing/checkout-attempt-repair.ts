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
 *   session found, open     → SESSION_CREATED (bind repaired); a row that was
 *                             ALREADY correctly bound and is simply still
 *                             payable past the attempt TTL is counted
 *                             `openPastTtl` and left untouched (it converges
 *                             via the expiry webhook / the "expired" branch
 *                             once the session itself dies, ≤ 24h later)
 *   session found, expired  → EXPIRED, active key released
 *   session provably absent → FAILED (proof: the customer's full session list
 *                             since the attempt was created contains no
 *                             session for this attempt), active key released —
 *                             ONLY now may a fresh generation mint a new key.
 *                             This applies to SESSION_CREATED rows too: a
 *                             bound session id that Stripe reports
 *                             resource_missing with no metadata match is a
 *                             bogus bind, not a live session.
 *   cannot prove anything   → left untouched for the next pass (fail closed)
 *                             AND surfaced to the owner queue (durable
 *                             CockpitTask review item — directive 5.3), never
 *                             silently aged out.
 *
 * Every counter is guarded by the updateMany row count: a row that another
 * writer (webhook/request) advanced concurrently counts as `raced`, never as
 * a fake success.
 *
 * `runCheckoutAttemptRepair()` in `apps/web/lib/stripe.ts` is the production
 * entrypoint; it is invoked by the scheduled cron route
 * `/api/cron/repair-checkout-attempts` (declared in `vercel.json`).
 */

import {
  CHECKOUT_RECONCILE_MIN_AGE_MS,
  CHECKOUT_SESSION_MAX_LIFETIME_MS,
  type CheckoutAttemptRecord,
  type CheckoutAttemptStatus,
} from "@/lib/billing/checkout-attempt";

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

/**
 * Owner queue (directive 5.3): unresolved ambiguity must be surfaced as a
 * DURABLE review item, not a log line. The production implementation writes a
 * deduplicated CockpitTask (see checkout-repair-owner-queue.ts); tests inject
 * a fake.
 */
export interface CheckoutRepairOwnerQueue {
  surfaceUnresolvedAttempt(entry: {
    attemptId: string;
    status: CheckoutAttemptStatus;
    reason: string;
  }): Promise<void>;
}

export interface CheckoutAttemptRepairReport {
  scanned: number;
  completed: number;
  rebound: number;
  expired: number;
  provenAbsent: number;
  /** Correctly bound sessions still open/payable past the attempt TTL — nothing to repair yet. */
  openPastTtl: number;
  /** Rows another writer advanced between scan and update (0-row updateMany). */
  raced: number;
  unresolved: number;
  errors: number;
}

/** Attempts younger than this are left alone — the owning request may still be
 * running. Shared truth with the inline reconcile guard in checkout-attempt.ts. */
export const REPAIR_MIN_AGE_MS = CHECKOUT_RECONCILE_MIN_AGE_MS;

const UNRESOLVED_STATUSES: readonly CheckoutAttemptStatus[] = [
  "REQUEST_IN_FLIGHT",
  "AMBIGUOUS",
];

/** Full row shape the repair pathway operates on (scan timestamps included). */
export type RepairableCheckoutAttempt = CheckoutAttemptRecord & {
  createdAt: Date;
  updatedAt: Date;
};

/** What a single-attempt reconciliation proved (and did). */
export type CheckoutAttemptReconcileOutcome =
  | "completed"
  | "rebound"
  | "open_past_ttl"
  | "expired"
  | "proven_absent"
  | "raced"
  | "unresolved";

export interface CheckoutAttemptRepairDeps {
  db: CheckoutAttemptRepairDb;
  stripeSessions: CheckoutSessionLookup;
  /** Optional durable owner-queue sink for unresolved ambiguity. */
  ownerQueue?: CheckoutRepairOwnerQueue;
}

/**
 * One repair pass. Never throws for a single attempt's failure — errors are
 * counted and the attempt stays unresolved for the next pass (durable retry,
 * not best-effort). Unresolved/errored attempts are surfaced to the owner
 * queue when one is provided.
 */
export async function repairUnresolvedCheckoutAttempts(
  deps: CheckoutAttemptRepairDeps,
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
    openPastTtl: 0,
    raced: 0,
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
    const attempt = raw as RepairableCheckoutAttempt;
    report.scanned += 1;
    try {
      const outcome = await reconcileOneCheckoutAttempt(deps, attempt, now);
      switch (outcome) {
        case "completed":
          report.completed += 1;
          break;
        case "rebound":
          report.rebound += 1;
          break;
        case "open_past_ttl":
          report.openPastTtl += 1;
          break;
        case "expired":
          report.expired += 1;
          break;
        case "proven_absent":
          report.provenAbsent += 1;
          break;
        case "raced":
          report.raced += 1;
          break;
        case "unresolved":
          report.unresolved += 1;
          await surfaceToOwnerQueue(deps, attempt, "cannot_prove_outcome_yet");
          break;
      }
    } catch (err) {
      report.errors += 1;
      const message = err instanceof Error ? err.message : "unknown";
      // eslint-disable-next-line no-console
      console.error(
        `[checkout-repair] attempt ${attempt.id} left unresolved (will retry next pass): ${message}`,
      );
      await surfaceToOwnerQueue(deps, attempt, `reconcile_error: ${message}`);
    }
  }

  if (report.unresolved > 0 || report.errors > 0) {
    // Secondary operator signal; the DURABLE owner-queue record above is the
    // directive-5.3 "owner queue surfaces unresolved ambiguity" mechanism.
    // eslint-disable-next-line no-console
    console.warn(
      `[checkout-repair] ${report.unresolved} unresolved / ${report.errors} errored attempt(s) after this pass (owner queue updated)`,
    );
  }
  return report;
}

async function surfaceToOwnerQueue(
  deps: CheckoutAttemptRepairDeps,
  attempt: RepairableCheckoutAttempt,
  reason: string,
): Promise<void> {
  if (!deps.ownerQueue) return;
  try {
    await deps.ownerQueue.surfaceUnresolvedAttempt({
      attemptId: attempt.id,
      status: attempt.status,
      reason,
    });
  } catch (queueErr) {
    // The queue write must never mask or abort reconciliation itself.
    const message = queueErr instanceof Error ? queueErr.message : "unknown";
    // eslint-disable-next-line no-console
    console.error(
      `[checkout-repair] owner-queue write failed for attempt ${attempt.id}: ${message}`,
    );
  }
}

/**
 * Reconcile ONE attempt against Stripe's authoritative state. Shared by the
 * batch repair pass above and by the inline past-TTL reconciliation in
 * `getOrCreateCheckoutAttempt` (an unresolved attempt past its TTL may NEVER
 * be released on elapsed time alone — directive 5.3).
 *
 * Throws on transport errors (fail closed — the caller must not treat an
 * unproven outcome as proof of anything).
 */
export async function reconcileOneCheckoutAttempt(
  deps: { db: CheckoutAttemptRepairDb; stripeSessions: CheckoutSessionLookup },
  attempt: RepairableCheckoutAttempt,
  now: Date,
): Promise<CheckoutAttemptReconcileOutcome> {
  // Fast path: the attempt already knows its session id (bind succeeded, the
  // expiry/completion webhook was missed) — ask Stripe about that session.
  if (attempt.stripeSessionId) {
    const session = await deps.stripeSessions.retrieveSession(attempt.stripeSessionId);
    if (session) {
      return convergeOnSession(deps.db, attempt, session);
    }
    // Definitive not-found for a bound session id: fall through to the
    // metadata search (the id may have been bound from a partial write).
  }

  if (!attempt.customerId) {
    // No customer to search under — Stripe cannot be queried. Elapsed time
    // becomes proof only once EVERY session this attempt could possibly have
    // created has itself died: the last creatable session is at the attempt
    // TTL, and a Checkout Session lives at most CHECKOUT_SESSION_MAX_LIFETIME
    // after ITS creation. Before that bound the attempt stays unresolved.
    const provablyBeyondAnySession =
      new Date(attempt.expiresAt).getTime() + CHECKOUT_SESSION_MAX_LIFETIME_MS <=
      now.getTime();
    if (provablyBeyondAnySession) {
      const res = await deps.db.checkoutAttempt.updateMany({
        where: { id: attempt.id, status: { in: [...UNRESOLVED_STATUSES, "SESSION_CREATED"] } },
        data: {
          status: "EXPIRED",
          activeClientIntentId: null,
          lastErrorKind: "repair_expired_unresolvable",
        },
      });
      return res.count === 1 ? "expired" : "raced";
    }
    return "unresolved";
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
    return convergeOnSession(deps.db, attempt, match);
  }

  // PROVEN ABSENT: the complete list carries no session for this attempt —
  // the ambiguous request never committed (or the bound session id never
  // existed). Only now is releasing the intent (→ fresh attempt, fresh key on
  // the next request) safe. SESSION_CREATED is included so a bogus bind whose
  // session Stripe reports resource_missing converges instead of looping.
  const res = await deps.db.checkoutAttempt.updateMany({
    where: { id: attempt.id, status: { in: [...UNRESOLVED_STATUSES, "SESSION_CREATED"] } },
    data: {
      status: "FAILED",
      activeClientIntentId: null,
      lastErrorKind: "repair_proven_absent",
    },
  });
  return res.count === 1 ? "proven_absent" : "raced";
}

async function convergeOnSession(
  db: CheckoutAttemptRepairDb,
  attempt: RepairableCheckoutAttempt,
  session: RepairSessionView,
): Promise<CheckoutAttemptReconcileOutcome> {
  const nonTerminal = [...UNRESOLVED_STATUSES, "SESSION_CREATED"];
  if (session.status === "complete") {
    const res = await db.checkoutAttempt.updateMany({
      where: { id: attempt.id, status: { in: nonTerminal } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        stripeSessionId: session.id,
        ...(session.subscriptionId ? { stripeSubscriptionId: session.subscriptionId } : {}),
        lastErrorKind: null,
      },
    });
    return res.count === 1 ? "completed" : "raced";
  }
  if (session.status === "expired") {
    const res = await db.checkoutAttempt.updateMany({
      where: { id: attempt.id, status: { in: nonTerminal } },
      data: {
        status: "EXPIRED",
        activeClientIntentId: null,
        stripeSessionId: session.id,
        lastErrorKind: "session_expired",
      },
    });
    return res.count === 1 ? "expired" : "raced";
  }
  // "open": the session exists and is still payable.
  if (attempt.status === "SESSION_CREATED" && attempt.stripeSessionId === session.id) {
    // Already correctly bound — nothing to repair. The row is simply past its
    // attempt TTL while its session is still payable; it converges via the
    // expiry webhook or the "expired" branch within one session lifetime.
    return "open_past_ttl";
  }
  const res = await db.checkoutAttempt.updateMany({
    where: { id: attempt.id, status: { in: nonTerminal } },
    data: {
      status: "SESSION_CREATED",
      stripeSessionId: session.id,
      lastErrorKind: null,
    },
  });
  return res.count === 1 ? "rebound" : "raced";
}
