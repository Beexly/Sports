/**
 * Settlement outbox worker — hardened per directive section 6 (PR #161).
 *
 * TWO-LAYER MODEL (6.4): the durable PickSettlementEvent appended by
 * settlement is EXPANDED into one PickSettlementDelivery row per
 * follower x channel x destination. The parent event is complete only when
 * EVERY child delivery reached a terminal state — a partial failure never
 * closes the event, and a delivered recipient is NEVER resent because a
 * different recipient failed. (The pre-hardening worker marked the whole
 * event DELIVERED even when every real channel send failed inside the
 * never-throwing notify fan-out — failures were permanently closed.)
 *
 * DELIVERY STATE MACHINE (states on PickSettlementDelivery):
 *   PENDING → CLAIMED → DELIVERED
 *                     → RETRYABLE_FAILED (backoff+jitter, re-claimable;
 *                       includes channel-unconfigured — an infra condition,
 *                       never a policy terminal, per 6.9)
 *                     → PERMANENT_FAILED (e.g. expired push subscription —
 *                       which is also REMOVED per 6.9)
 *                     → DEAD_LETTER (attempt cap reached — escalated as a
 *                       durable OutboxDeadLetterReceipt owner work item)
 *   PENDING → SUPPRESSED | NO_RECIPIENT at expansion (honest POLICY
 *   terminals: tier-ineligible / alerts disabled / nothing to send to), or
 *   SUPPRESSED (payload_expired) when the maximum payload age passes. An
 *   entitlements lookup FAILURE is neither: expansion defers (event stays
 *   PENDING and retries) — an infra exception never becomes SUPPRESSED.
 *
 * LEASE FENCING (6.5): every claim writes a fresh leaseToken/leaseOwner/
 *   leaseExpiresAt and bumps claimVersion; every result write is scoped to
 *   (id, leaseToken, status: CLAIMED) so a stale worker can never overwrite
 *   a newer claimant's result. A stale claim AT the attempt cap goes to
 *   DEAD_LETTER — never back to PENDING — so the cap is a true invariant.
 *
 * EVENT-TIME FACTS (6.6): the event payload (selection, pick type, teams,
 *   result, sport, settled time, schema version) is frozen onto the event
 *   at expansion, and the recipient set is materialized at expansion (the
 *   settlement-time follower set within scheduler granularity): a user who
 *   follows AFTER settlement never receives the historical alert, and a
 *   user who unfollows after the event keeps the delivery that was already
 *   owed. Destination ADDRESSES are re-resolved at send time (no raw email
 *   on the row — destinationId is a hash), fail-closed when gone.
 *
 * IDEMPOTENCY: each delivery carries a per-channel idempotencyKey
 *   (eventId:userId:channel:destinationId, unique) — expansion retries and
 *   races dedupe via createMany(skipDuplicates), and DELIVERED rows are
 *   never re-claimable.
 */

import { randomUUID, createHash } from "node:crypto";
import { getUserEntitlements } from "@/lib/entitlements";
import { absoluteUrl } from "@/lib/seo/site-url";
import { isWatchlistAlertsEnabled } from "@/lib/watchlist/alert-dispatch";
import {
  isWebPushConfigured,
  sendWebPushAlert,
  type WebPushSendResult,
} from "@/lib/watchlist/channels/web-push-channel";
import {
  isEmailConfigured,
  sendAlertEmail,
  type EmailSendResult,
} from "@/lib/watchlist/channels/email-channel";

export const OUTBOX_MAX_ATTEMPTS = 5;
export const DELIVERY_LEASE_MINUTES = 5;
export const OUTBOX_BATCH_SIZE = 25;
export const DELIVERY_BATCH_SIZE = 50;
/** Frozen-payload schema: v2 adds contentVersion/locale/deepLinkPath and
 *  the pick receipt (6.6/6.9). v1 rows remain deliverable (reader is
 *  tolerant of the missing fields). */
export const EVENT_PAYLOAD_SCHEMA_VERSION = 2;
/** Message content version stamped into the frozen payload (6.9). */
export const MESSAGE_CONTENT_VERSION = 1;
/** Default message locale — single-locale product today, carried explicitly
 *  so a future localization pass has an honest field to branch on (6.9). */
export const MESSAGE_LOCALE = "en-US";
/** Maximum payload age (6.5): a settlement alert older than this is stale
 *  news — it is SUPPRESSED (policy terminal, code payload_expired) rather
 *  than delivered arbitrarily late. */
export const OUTBOX_MAX_PAYLOAD_AGE_HOURS = 24;
export const OUTBOX_MAX_PAYLOAD_AGE_MS = OUTBOX_MAX_PAYLOAD_AGE_HOURS * 60 * 60 * 1000;
/** Fairness window (6.5): due deliveries are fetched over a wider window and
 *  round-robined across events so one huge event cannot starve later ones. */
export const DELIVERY_FETCH_WINDOW = DELIVERY_BATCH_SIZE * 4;

/** Base backoff minute-steps; capped at 60 minutes, plus 0–30s jitter. */
export function computeNextAttemptAt(
  attemptCount: number,
  now: Date,
  random: () => number = Math.random,
): Date {
  const backoffMinutes = Math.min(60, 2 ** Math.max(0, attemptCount - 1));
  const jitterMs = Math.floor(random() * 30_000);
  return new Date(now.getTime() + backoffMinutes * 60_000 + jitterMs);
}

export const TERMINAL_DELIVERY_STATUSES = [
  "DELIVERED",
  "SUPPRESSED",
  "NO_RECIPIENT",
  "PERMANENT_FAILED",
  "DEAD_LETTER",
] as const;

const NON_TERMINAL_DELIVERY_STATUSES = ["PENDING", "CLAIMED", "RETRYABLE_FAILED"];

/** Model/pick receipt frozen into the payload (6.6): what the pick WAS at
 *  event time, so later pick mutations can never rewrite the announcement. */
export interface FrozenPickReceipt {
  readonly modelVersion: string | null;
  readonly tier: string | null;
  readonly confidence: number | null;
  readonly line: number | null;
  readonly clvLockLine: number | null;
  readonly clvLockPrice: number | null;
}

/** Immutable event-time payload frozen at expansion (6.6).
 *  v2 (EVENT_PAYLOAD_SCHEMA_VERSION) adds contentVersion, locale,
 *  deepLinkPath and pickReceipt; v1 rows lack them and stay deliverable. */
export interface FrozenEventPayload {
  readonly schemaVersion: number;
  readonly pickId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly settledAt: string;
  readonly sportKey: string;
  readonly homeTeam: { readonly id: string | null; readonly name: string };
  readonly awayTeam: { readonly id: string | null; readonly name: string };
  /** v2+ (6.9): message content version. */
  readonly contentVersion?: number;
  /** v2+ (6.9): BCP-47 locale the message content targets. */
  readonly locale?: string;
  /** v2+ (6.9): root-relative deep link frozen at expansion; the absolute
   *  URL is resolved at send time from the canonical site host (config,
   *  not a business fact). */
  readonly deepLinkPath?: string;
  /** v2+ (6.6): model/pick receipt. */
  readonly pickReceipt?: FrozenPickReceipt;
}

export interface OutboxEventRow {
  readonly id: string;
  readonly pickId: string;
  readonly gameId: string;
  readonly result: string;
  readonly settledAt: Date;
  readonly status: string;
  readonly payload: unknown;
}

export interface DeliveryRow {
  readonly id: string;
  readonly eventId: string;
  readonly userId: string;
  readonly channel: string;
  readonly destinationId: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly claimVersion: number;
  readonly attemptHistory: unknown;
}

/** Minimal Prisma-delegate-shaped surface — same defensive-cast doctrine as
 *  the rest of apps/web/lib. */
export interface SettlementOutboxDb {
  pickSettlementEvent: {
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<OutboxEventRow[]>;
  };
  pickSettlementDelivery: {
    createMany(args: {
      data: Array<Record<string, unknown>>;
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
    }): Promise<DeliveryRow[]>;
  };
  pick: {
    findUnique(args: {
      where: { id: string };
      select: Record<string, unknown>;
    }): Promise<{
      id: string;
      pickType: string;
      selection: string;
      modelVersion?: string | null;
      tier?: string | null;
      confidence?: number | null;
      line?: number | null;
      clvLockLine?: number | null;
      clvLockPrice?: number | null;
      game: {
        id: string;
        homeTeamId: string | null;
        awayTeamId: string | null;
        homeTeamName: string;
        awayTeamName: string;
        sport: { key: string } | null;
      } | null;
    } | null>;
  };
  watchlist: {
    findMany(args: {
      where: Record<string, unknown>;
    }): Promise<Array<{ id: string; userId: string; entityType: string; entityId: string }>>;
  };
  user: {
    findMany(args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    }): Promise<Array<{ id: string; email: string | null; emailVerified: Date | null }>>;
  };
  pushSubscription: {
    findMany(args: {
      where: Record<string, unknown>;
    }): Promise<Array<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string }>>;
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  };
  /** Durable owner-queue receipt appended when a delivery dead-letters
   *  (6.5) — the outbox analogue of OwnerDecisionRequest. Idempotent via
   *  the unique deliveryId + skipDuplicates. */
  outboxDeadLetterReceipt: {
    createMany(args: {
      data: Array<Record<string, unknown>>;
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
  };
}

/** Injectable side-effect seam — production defaults are the real channel
 *  modules; tests pass fakes. */
export interface OutboxDeps {
  /** MUST THROW on infrastructure failure (6.9): an entitlements lookup
   *  that cannot be answered is NOT a policy verdict. Expansion defers
   *  (event stays PENDING, retried next drain) instead of writing terminal
   *  SUPPRESSED rows for users who may be fully entitled. */
  readonly getEntitlements: (userId: string) => Promise<{ canGetAlerts: boolean }>;
  readonly sendPush: (
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: { title: string; body: string },
  ) => Promise<WebPushSendResult>;
  readonly sendEmail: (to: string, subject: string, body: string) => Promise<EmailSendResult>;
  readonly pushConfigured: () => boolean;
  readonly emailConfigured: () => boolean;
  readonly alertsEnabled: () => boolean;
  readonly leaseOwner: string;
  readonly random: () => number;
}

export function defaultOutboxDeps(): OutboxDeps {
  return {
    // NO .catch(() => null) here: swallowing an entitlements failure into a
    // policy answer turned a DB blip into permanent SUPPRESSED delivery loss
    // (spec 6.9: never return a policy terminal for an infra exception).
    getEntitlements: (userId) =>
      getUserEntitlements(userId).then((e) => ({ canGetAlerts: e.canGetAlerts })),
    sendPush: (subscription, payload) => sendWebPushAlert(subscription, payload),
    sendEmail: (to, subject, body) => sendAlertEmail(to, subject, body),
    pushConfigured: () => isWebPushConfigured(),
    emailConfigured: () => isEmailConfigured(),
    alertsEnabled: () => isWatchlistAlertsEnabled(),
    leaseOwner: `worker:${process.pid}:${randomUUID().slice(0, 8)}`,
    random: Math.random,
  };
}

export interface LatencyPercentiles {
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
}

/** Nearest-rank percentile over the sample; null on an empty sample —
 *  never a fabricated zero (6.8). */
export function latencyPercentiles(samples: readonly number[]): LatencyPercentiles {
  if (samples.length === 0) return { p50: null, p95: null, p99: null };
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] as number;
  return { p50: rank(50), p95: rank(95), p99: rank(99) };
}

export interface OutboxDrainSummary {
  expandedEvents: number;
  deliveriesMaterialized: number;
  reclaimedStale: number;
  deadLetteredStale: number;
  claimed: number;
  delivered: number;
  retryableFailed: number;
  permanentFailed: number;
  deadLettered: number;
  suppressed: number;
  noRecipient: number;
  /** Deliveries suppressed because the payload exceeded the maximum age
   *  (6.5) — already included in `suppressed`. */
  expiredPayload: number;
  skippedRace: number;
  lostLease: number;
  /** Events completed with every child terminal (both flavors). */
  completedEvents: number;
  /** Subset of completedEvents whose children include PERMANENT_FAILED /
   *  DEAD_LETTER — the parent honestly says COMPLETED_WITH_FAILURES, never
   *  DELIVERED (6.4). */
  completedWithFailures: number;
  /** Dead-letter owner-queue receipts appended this pass (6.5). */
  deadLetterReceipts: number;
  /** Event-settledAt → delivery latency for deliveries DELIVERED in this
   *  pass (6.8). */
  latency: LatencyPercentiles;
  /** Drain-level failures — NEVER swallowed into a green summary (6.7). */
  errors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Batch fairness (6.5): round-robin the due deliveries across their parent
 * events (events ordered by their earliest due row, rows within an event
 * keeping their fetched order) and take up to `limit`. A single event with
 * hundreds of recipients can no longer starve later events out of a pass.
 * Pure and deterministic — unit-tested directly.
 */
export function selectFairDeliveryBatch<T extends { readonly eventId: string }>(
  rows: readonly T[],
  limit: number,
): T[] {
  if (rows.length <= limit) return [...rows];
  const byEvent = new Map<string, T[]>();
  for (const row of rows) {
    const list = byEvent.get(row.eventId);
    if (list) list.push(row);
    else byEvent.set(row.eventId, [row]);
  }
  const queues = [...byEvent.values()];
  const selected: T[] = [];
  let index = 0;
  while (selected.length < limit) {
    let progressed = false;
    for (const queue of queues) {
      if (index < queue.length) {
        const row = queue[index];
        if (row !== undefined) {
          selected.push(row);
          progressed = true;
          if (selected.length >= limit) break;
        }
      }
    }
    if (!progressed) break;
    index++;
  }
  return selected;
}

function isFrozenPayload(value: unknown): value is FrozenEventPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    "selection" in value &&
    "result" in value
  );
}

/**
 * One drain pass:
 *   1. stale-lease recovery (cap-aware: at max attempts → DEAD_LETTER),
 *   2. expansion of PENDING events into per-recipient delivery rows,
 *   3. claim + send + token-scoped result for due deliveries,
 *   4. parent-event completion sweep (all children terminal).
 * Never throws; drain-level failures are returned in `errors` so the cron
 * can report degraded health honestly (6.7).
 */
export async function drainSettlementOutbox(
  dbArg: unknown,
  depsArg?: Partial<OutboxDeps>,
  now: Date = new Date(),
): Promise<OutboxDrainSummary> {
  const db = dbArg as SettlementOutboxDb;
  const deps: OutboxDeps = { ...defaultOutboxDeps(), ...depsArg };
  const summary: OutboxDrainSummary = {
    expandedEvents: 0,
    deliveriesMaterialized: 0,
    reclaimedStale: 0,
    deadLetteredStale: 0,
    claimed: 0,
    delivered: 0,
    retryableFailed: 0,
    permanentFailed: 0,
    deadLettered: 0,
    suppressed: 0,
    noRecipient: 0,
    expiredPayload: 0,
    skippedRace: 0,
    lostLease: 0,
    completedEvents: 0,
    completedWithFailures: 0,
    deadLetterReceipts: 0,
    latency: { p50: null, p95: null, p99: null },
    errors: [],
  };
  const latencySamples: number[] = [];

  // ── 1. Stale-lease recovery (6.5) ───────────────────────────────────────
  try {
    const stale = await db.pickSettlementDelivery.findMany({
      where: { status: "CLAIMED", leaseExpiresAt: { lt: now } },
      take: DELIVERY_BATCH_SIZE,
    });
    for (const row of stale) {
      const atCap = row.attemptCount >= OUTBOX_MAX_ATTEMPTS;
      const recovered = await db.pickSettlementDelivery.updateMany({
        // claimVersion-scoped: never clobber a row a newer worker re-claimed
        // between our read and this write.
        where: {
          id: row.id,
          status: "CLAIMED",
          claimVersion: row.claimVersion,
          leaseExpiresAt: { lt: now },
        },
        data: atCap
          ? {
              status: "DEAD_LETTER",
              leaseToken: null,
              leaseOwner: null,
              leaseExpiresAt: null,
              lastErrorCode: "stale_claim_at_attempt_cap",
              lastErrorClass: "infrastructure",
            }
          : {
              status: "RETRYABLE_FAILED",
              leaseToken: null,
              leaseOwner: null,
              leaseExpiresAt: null,
              nextAttemptAt: computeNextAttemptAt(row.attemptCount, now, deps.random),
              lastErrorCode: "stale_claim",
              lastErrorClass: "infrastructure",
            },
      });
      if (recovered.count === 1) {
        if (atCap) {
          summary.deadLetteredStale++;
          await appendDeadLetterReceipt(db, summary, row, {
            errorCode: "stale_claim_at_attempt_cap",
            errorClass: "infrastructure",
            attemptCount: row.attemptCount,
          });
        } else {
          summary.reclaimedStale++;
        }
      }
    }
  } catch (err) {
    summary.errors.push(`stale-recovery: ${errorMessage(err)}`);
  }

  // ── 2. Expansion (6.4/6.6) ──────────────────────────────────────────────
  try {
    const pendingEvents = await db.pickSettlementEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: OUTBOX_BATCH_SIZE,
    });
    for (const event of pendingEvents) {
      try {
        const created = await expandEvent(db, deps, event, now);
        if (created !== null) {
          summary.expandedEvents++;
          summary.deliveriesMaterialized += created.materialized;
          summary.suppressed += created.suppressed;
          summary.noRecipient += created.noRecipient;
        }
      } catch (err) {
        summary.errors.push(`expand ${event.id}: ${errorMessage(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`expansion-query: ${errorMessage(err)}`);
  }

  // ── 3. Delivery (6.5/6.9) ───────────────────────────────────────────────
  try {
    // Fetch a wider window, then round-robin across events (batch fairness,
    // 6.5): strict createdAt-asc take-N let one large event starve everything
    // behind it within a pass.
    const dueWindow = await db.pickSettlementDelivery.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "RETRYABLE_FAILED", nextAttemptAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: DELIVERY_FETCH_WINDOW,
    });
    const due = selectFairDeliveryBatch(dueWindow, DELIVERY_BATCH_SIZE);

    // Batch the event payload lookups (6.9 — no per-row N+1 on events).
    const eventIds = [...new Set(due.map((d) => d.eventId))];
    const events =
      eventIds.length === 0
        ? []
        : await db.pickSettlementEvent.findMany({ where: { id: { in: eventIds } } });
    const eventById = new Map(events.map((e) => [e.id, e]));

    for (const candidate of due) {
      // Maximum payload age (6.5): a settlement alert this stale is no
      // longer owed — suppress it honestly (policy terminal) instead of
      // delivering arbitrarily late. Status+version-scoped so a concurrent
      // claimant is never clobbered.
      const candidateEvent = eventById.get(candidate.eventId);
      if (
        candidateEvent &&
        now.getTime() - candidateEvent.settledAt.getTime() > OUTBOX_MAX_PAYLOAD_AGE_MS
      ) {
        const expired = await db.pickSettlementDelivery.updateMany({
          where: {
            id: candidate.id,
            status: candidate.status,
            claimVersion: candidate.claimVersion,
          },
          data: {
            status: "SUPPRESSED",
            nextAttemptAt: null,
            lastErrorCode: "payload_expired",
            lastErrorClass: "policy",
          },
        });
        if (expired.count === 1) {
          summary.suppressed++;
          summary.expiredPayload++;
        } else {
          summary.skippedRace++;
        }
        continue;
      }

      const leaseToken = randomUUID();
      // Snapshot BEFORE the claim increments it (the claim's increment is
      // atomic in the database; this local copy is only for cap math).
      const attemptNumber = candidate.attemptCount + 1;
      const priorHistory = Array.isArray(candidate.attemptHistory)
        ? (candidate.attemptHistory as unknown[])
        : [];
      const claim = await db.pickSettlementDelivery.updateMany({
        where: { id: candidate.id, status: candidate.status, claimVersion: candidate.claimVersion },
        data: {
          status: "CLAIMED",
          leaseToken,
          leaseOwner: deps.leaseOwner,
          leaseExpiresAt: new Date(now.getTime() + DELIVERY_LEASE_MINUTES * 60_000),
          attemptCount: { increment: 1 },
          claimVersion: { increment: 1 },
        },
      });
      if (claim.count === 0) {
        summary.skippedRace++;
        continue;
      }
      summary.claimed++;

      let finalStatus: string;
      let errorCode: string | null = null;
      let errorClass: string | null = null;
      try {
        const event = eventById.get(candidate.eventId);
        const outcome = await deliverOne(db, deps, candidate, event ?? null);
        finalStatus = outcome.status;
        errorCode = outcome.errorCode ?? null;
        errorClass = outcome.errorClass ?? null;
      } catch (err) {
        finalStatus = "RETRYABLE_FAILED";
        errorCode = "delivery_exception";
        errorClass = "infrastructure";
        summary.errors.push(`deliver ${candidate.id}: ${errorMessage(err)}`);
      }

      // Cap enforcement: a retryable failure at the cap dead-letters (6.5).
      if (finalStatus === "RETRYABLE_FAILED" && attemptNumber >= OUTBOX_MAX_ATTEMPTS) {
        finalStatus = "DEAD_LETTER";
        errorCode = errorCode ?? "attempt_cap_reached";
      }

      const deliveredAt = finalStatus === "DELIVERED" ? new Date() : null;
      const event = eventById.get(candidate.eventId);
      const latencyMs =
        deliveredAt && event ? Math.max(0, deliveredAt.getTime() - event.settledAt.getTime()) : null;

      const historyEntry = {
        attempt: attemptNumber,
        at: now.toISOString(),
        status: finalStatus,
        ...(errorCode ? { errorCode } : {}),
      };

      // TOKEN-SCOPED result write (6.5): only the holder of the lease can
      // record the outcome; a stale worker's write matches zero rows.
      const recorded = await db.pickSettlementDelivery.updateMany({
        where: { id: candidate.id, leaseToken, status: "CLAIMED" },
        data: {
          status: finalStatus,
          leaseToken: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: errorCode,
          lastErrorClass: errorClass,
          attemptHistory: [...priorHistory, historyEntry],
          ...(finalStatus === "RETRYABLE_FAILED"
            ? { nextAttemptAt: computeNextAttemptAt(attemptNumber, now, deps.random) }
            : { nextAttemptAt: null }),
          ...(deliveredAt ? { deliveredAt } : {}),
          ...(latencyMs !== null ? { latencyMs } : {}),
        },
      });
      if (recorded.count === 0) {
        summary.lostLease++;
        continue;
      }

      // Durable owner-queue escalation at dead letter (6.5).
      if (finalStatus === "DEAD_LETTER") {
        await appendDeadLetterReceipt(db, summary, candidate, {
          errorCode: errorCode ?? "attempt_cap_reached",
          errorClass: errorClass ?? "infrastructure",
          attemptCount: attemptNumber,
        });
      }

      switch (finalStatus) {
        case "DELIVERED":
          summary.delivered++;
          if (latencyMs !== null) latencySamples.push(latencyMs);
          break;
        case "RETRYABLE_FAILED":
          summary.retryableFailed++;
          break;
        case "PERMANENT_FAILED":
          summary.permanentFailed++;
          break;
        case "DEAD_LETTER":
          summary.deadLettered++;
          break;
        case "SUPPRESSED":
          summary.suppressed++;
          break;
        case "NO_RECIPIENT":
          summary.noRecipient++;
          break;
      }
    }
  } catch (err) {
    summary.errors.push(`delivery-pass: ${errorMessage(err)}`);
  }

  // ── 4. Parent completion sweep (6.4) ────────────────────────────────────
  // The parent's terminal status is HONEST: DELIVERED only when no child
  // failed terminally; COMPLETED_WITH_FAILURES when any child ended
  // PERMANENT_FAILED / DEAD_LETTER (a parent must never assert a delivery
  // that did not happen — the per-child truth still lives on the children).
  try {
    const expanded = await db.pickSettlementEvent.findMany({
      where: { status: "EXPANDED" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    for (const event of expanded) {
      const open = await db.pickSettlementDelivery.findMany({
        where: { eventId: event.id, status: { in: NON_TERMINAL_DELIVERY_STATUSES } },
        take: 1,
      });
      if (open.length > 0) continue;
      const failedChildren = await db.pickSettlementDelivery.findMany({
        where: { eventId: event.id, status: { in: ["PERMANENT_FAILED", "DEAD_LETTER"] } },
        take: 1,
      });
      const deliveredChildren = await db.pickSettlementDelivery.findMany({
        where: { eventId: event.id, status: "DELIVERED" },
        take: 1,
      });
      const anyFailed = failedChildren.length > 0;
      const anyDelivered = deliveredChildren.length > 0;
      const completedAt = new Date();
      const completed = await db.pickSettlementEvent.updateMany({
        where: { id: event.id, status: "EXPANDED" },
        data: {
          status: anyFailed ? "COMPLETED_WITH_FAILURES" : "DELIVERED",
          completedAt,
          // deliveredAt asserts a real delivery happened — set it only when
          // at least one child was actually DELIVERED, or when the event
          // closed clean with nothing failed.
          ...(anyDelivered || !anyFailed ? { deliveredAt: completedAt } : {}),
        },
      });
      if (completed.count === 1) {
        summary.completedEvents++;
        if (anyFailed) summary.completedWithFailures++;
      }
    }
  } catch (err) {
    summary.errors.push(`completion-sweep: ${errorMessage(err)}`);
  }

  summary.latency = latencyPercentiles(latencySamples);
  return summary;
}

/** Appends the durable dead-letter owner receipt (6.5). Idempotent (unique
 *  deliveryId + skipDuplicates); a receipt-write failure is surfaced in the
 *  drain errors, never allowed to break the pass. */
async function appendDeadLetterReceipt(
  db: SettlementOutboxDb,
  summary: OutboxDrainSummary,
  delivery: Pick<DeliveryRow, "id" | "eventId" | "userId" | "channel">,
  reason: { errorCode: string; errorClass: string; attemptCount: number },
): Promise<void> {
  try {
    const created = await db.outboxDeadLetterReceipt.createMany({
      data: [
        {
          deliveryId: delivery.id,
          eventId: delivery.eventId,
          userId: delivery.userId,
          channel: delivery.channel,
          reason,
        },
      ],
      skipDuplicates: true,
    });
    summary.deadLetterReceipts += created.count;
  } catch (err) {
    summary.errors.push(`dead-letter-receipt ${delivery.id}: ${errorMessage(err)}`);
  }
}

interface ExpansionResult {
  materialized: number;
  suppressed: number;
  noRecipient: number;
}

/** Expands one PENDING event: freeze the payload, materialize the
 *  settlement-time recipient set into delivery rows (idempotent via the
 *  unique idempotencyKey + skipDuplicates), and move the event to EXPANDED
 *  (or straight to DELIVERED for non-decisive/no-recipient events). */
async function expandEvent(
  db: SettlementOutboxDb,
  deps: OutboxDeps,
  event: OutboxEventRow,
  now: Date,
): Promise<ExpansionResult | null> {
  // VOID settlements are receipts, not alerts (GRADED-only doctrine).
  if (event.result !== "WIN" && event.result !== "LOSS" && event.result !== "PUSH") {
    const closed = await db.pickSettlementEvent.updateMany({
      where: { id: event.id, status: "PENDING" },
      data: {
        status: "DELIVERED",
        completedAt: now,
        deliveredAt: now,
        recipientsMaterializedAt: now,
        channelOutcomes: { skipped: "non_decisive_result", result: event.result },
      },
    });
    return closed.count === 1 ? { materialized: 0, suppressed: 0, noRecipient: 0 } : null;
  }

  const pick = await db.pick.findUnique({
    where: { id: event.pickId },
    select: {
      id: true,
      pickType: true,
      selection: true,
      modelVersion: true,
      tier: true,
      confidence: true,
      line: true,
      clvLockLine: true,
      clvLockPrice: true,
      game: {
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          homeTeamName: true,
          awayTeamName: true,
          sport: { select: { key: true } },
        },
      },
    },
  });
  if (!pick || !pick.game) {
    throw new Error(`pick ${event.pickId} (or its game) no longer exists`);
  }

  const payload: FrozenEventPayload = {
    schemaVersion: EVENT_PAYLOAD_SCHEMA_VERSION,
    pickId: event.pickId,
    pickType: pick.pickType,
    selection: pick.selection,
    result: event.result as "WIN" | "LOSS" | "PUSH",
    settledAt: event.settledAt.toISOString(),
    sportKey: pick.game.sport?.key ?? "unknown",
    homeTeam: { id: pick.game.homeTeamId, name: pick.game.homeTeamName },
    awayTeam: { id: pick.game.awayTeamId, name: pick.game.awayTeamName },
    contentVersion: MESSAGE_CONTENT_VERSION,
    locale: MESSAGE_LOCALE,
    // Root-relative deep link frozen at expansion (6.9); the host is
    // resolved at send time from the canonical site URL.
    deepLinkPath: `/picks?gameId=${encodeURIComponent(pick.game.id)}`,
    // Model/pick receipt (6.6): what the pick WAS when the event froze.
    pickReceipt: {
      modelVersion: pick.modelVersion ?? null,
      tier: pick.tier ?? null,
      confidence: pick.confidence ?? null,
      line: pick.line ?? null,
      clvLockLine: pick.clvLockLine ?? null,
      clvLockPrice: pick.clvLockPrice ?? null,
    },
  };

  const teamIds = [pick.game.homeTeamId, pick.game.awayTeamId].filter(
    (id): id is string => id !== null,
  );
  const followers =
    teamIds.length === 0
      ? []
      : await db.watchlist.findMany({
          where: { entityType: "TEAM", entityId: { in: teamIds } },
        });

  // Batched recipient resolution (6.9 — one user query, one subscription
  // query for the whole event, entitlements resolved concurrently).
  const userIds = [...new Set(followers.map((f) => f.userId))];
  const users =
    userIds.length === 0
      ? []
      : await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, emailVerified: true },
        });
  const userById = new Map(users.map((u) => [u.id, u]));
  const subscriptions =
    userIds.length === 0
      ? []
      : await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const subsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const list = subsByUser.get(sub.userId) ?? [];
    list.push(sub);
    subsByUser.set(sub.userId, list);
  }
  // Entitlements resolved concurrently, with infrastructure failures kept
  // SEPARATE from policy answers (6.9): a user whose lookup FAILED gets no
  // rows at all this pass — never a terminal SUPPRESSED — and the event
  // stays PENDING (expansion deferred + retried) until every recipient's
  // eligibility is actually known. Resolved users' rows are still
  // materialized now (idempotent), so one broken lookup cannot delay the
  // rest.
  const entitlementsByUser = new Map<string, { canGetAlerts: boolean }>();
  const entitlementFailures: string[] = [];
  await Promise.all(
    userIds.map(async (id) => {
      try {
        entitlementsByUser.set(id, await deps.getEntitlements(id));
      } catch {
        entitlementFailures.push(id);
      }
    }),
  );

  const alertsEnabled = deps.alertsEnabled();
  const rows: Array<Record<string, unknown>> = [];
  let suppressed = 0;
  let noRecipient = 0;

  for (const userId of userIds) {
    const user = userById.get(userId);
    if (!user) continue; // stale watchlist row (user deleted) — no delivery owed
    const entitlements = entitlementsByUser.get(userId);
    if (!entitlements) continue; // lookup failed — deferred, NOT suppressed
    const eligible = alertsEnabled && entitlements.canGetAlerts;
    const suppressCode = !alertsEnabled
      ? "alerts_disabled"
      : !entitlements.canGetAlerts
        ? "tier_ineligible"
        : null;

    const mkRow = (
      channel: string,
      destinationId: string,
      status: string,
      errorCode: string | null,
    ) => ({
      eventId: event.id,
      userId,
      channel,
      destinationId,
      idempotencyKey: `${event.id}:${userId}:${channel}:${destinationId}`,
      status,
      attemptCount: 0,
      claimVersion: 0,
      ...(errorCode ? { lastErrorCode: errorCode, lastErrorClass: "policy" } : {}),
      attemptHistory: [],
    });

    // Push: one delivery per stored subscription (destination identity).
    const subs = subsByUser.get(userId) ?? [];
    if (!eligible) {
      rows.push(mkRow("push", "none", "SUPPRESSED", suppressCode));
      suppressed++;
    } else if (subs.length === 0) {
      rows.push(mkRow("push", "none", "NO_RECIPIENT", "no_push_subscriptions"));
      noRecipient++;
    } else {
      for (const sub of subs) rows.push(mkRow("push", sub.id, "PENDING", null));
    }

    // Email: one delivery to the verified address (destination = hash —
    // never a raw address on the row).
    const verifiedEmail = user.emailVerified ? user.email : null;
    if (!eligible) {
      rows.push(mkRow("email", "none", "SUPPRESSED", suppressCode));
      suppressed++;
    } else if (!verifiedEmail) {
      rows.push(mkRow("email", "none", "NO_RECIPIENT", "no_verified_email"));
      noRecipient++;
    } else {
      rows.push(mkRow("email", sha256Hex(verifiedEmail), "PENDING", null));
    }
  }

  const created =
    rows.length > 0
      ? await db.pickSettlementDelivery.createMany({ data: rows, skipDuplicates: true })
      : { count: 0 };

  // Defer expansion on any entitlements infrastructure failure (6.9): the
  // event stays PENDING and is retried next drain (already-created rows
  // dedupe via the unique idempotencyKey). Throwing here surfaces the
  // failure in the drain's errors — never a green summary.
  if (entitlementFailures.length > 0) {
    throw new Error(
      `entitlements unavailable for ${entitlementFailures.length}/${userIds.length} ` +
        "recipients — expansion deferred (event stays PENDING; no terminal " +
        "SUPPRESSED written for an infrastructure failure)",
    );
  }

  const moved = await db.pickSettlementEvent.updateMany({
    where: { id: event.id, status: "PENDING" },
    data: {
      status: "EXPANDED",
      payload: payload as unknown as Record<string, unknown>,
      recipientsMaterializedAt: now,
    },
  });
  if (moved.count === 0) return null; // a concurrent expander won — rows deduped
  return { materialized: created.count, suppressed, noRecipient };
}

interface DeliveryOutcome {
  status: "DELIVERED" | "RETRYABLE_FAILED" | "PERMANENT_FAILED" | "SUPPRESSED" | "NO_RECIPIENT";
  errorCode?: string;
  errorClass?: "retryable" | "permanent" | "infrastructure" | "policy";
}

/** Sends ONE claimed delivery through its channel, using the frozen event
 *  payload. Destination addresses are resolved fresh (fail-closed when
 *  gone); an expired push subscription is removed (6.9). */
async function deliverOne(
  db: SettlementOutboxDb,
  deps: OutboxDeps,
  delivery: DeliveryRow,
  event: OutboxEventRow | null,
): Promise<DeliveryOutcome> {
  if (!event || !isFrozenPayload(event.payload)) {
    // Expansion always freezes the payload before children exist; a missing
    // payload is an infrastructure anomaly, retried up to the cap.
    return { status: "RETRYABLE_FAILED", errorCode: "missing_event_payload", errorClass: "infrastructure" };
  }
  const payload = event.payload;
  const team =
    payload.homeTeam.id !== null ? payload.homeTeam : payload.awayTeam;
  // Deep link (6.9): the root-relative path was frozen at expansion; the
  // host is config, resolved at send time. v1 payloads fall back to /picks.
  const deepLink = absoluteUrl(payload.deepLinkPath ?? "/picks");
  const message = `${team.name}: ${payload.selection} graded ${payload.result}. ${deepLink}`;

  if (delivery.channel === "push") {
    if (!deps.pushConfigured()) {
      // A missing channel config is an INFRASTRUCTURE condition, not a
      // policy verdict: a bad deploy that drops VAPID keys must not
      // permanently kill owed deliveries. Retried up to the cap; at the
      // cap it dead-letters with an owner receipt (6.5/6.9).
      return {
        status: "RETRYABLE_FAILED",
        errorCode: "channel_not_configured",
        errorClass: "infrastructure",
      };
    }
    const subs = await db.pushSubscription.findMany({
      where: { id: delivery.destinationId, userId: delivery.userId },
    });
    const sub = subs[0];
    if (!sub) {
      return { status: "PERMANENT_FAILED", errorCode: "subscription_removed", errorClass: "permanent" };
    }
    const result = await deps.sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { title: "GalaxySportsEdge — pick graded", body: message },
    );
    if (result.sent) return { status: "DELIVERED" };
    if (result.classification === "expired") {
      // 404/410 — the push service says this subscription is gone. Remove
      // it so no future event fans out to a dead endpoint (6.9).
      try {
        await db.pushSubscription.deleteMany({ where: { id: sub.id } });
      } catch (err) {
        console.warn(
          `[settlement-outbox] could not remove expired subscription ${sub.id}: ${errorMessage(err)}`,
        );
      }
      return { status: "PERMANENT_FAILED", errorCode: "subscription_expired", errorClass: "permanent" };
    }
    if (result.classification === "permanent") {
      return {
        status: "PERMANENT_FAILED",
        errorCode: `push_rejected_${result.statusCode ?? "unknown"}`,
        errorClass: "permanent",
      };
    }
    if (result.classification === "not_configured") {
      return {
        status: "RETRYABLE_FAILED",
        errorCode: "channel_not_configured",
        errorClass: "infrastructure",
      };
    }
    return {
      status: "RETRYABLE_FAILED",
      errorCode: `push_transient_${result.statusCode ?? "network"}`,
      errorClass: "retryable",
    };
  }

  if (delivery.channel === "email") {
    if (!deps.emailConfigured()) {
      // Infrastructure, not policy — see the push branch above (6.9).
      return {
        status: "RETRYABLE_FAILED",
        errorCode: "channel_not_configured",
        errorClass: "infrastructure",
      };
    }
    const users = await db.user.findMany({
      where: { id: delivery.userId },
      select: { id: true, email: true, emailVerified: true },
    });
    const user = users[0];
    const verifiedEmail = user?.emailVerified ? user.email : null;
    if (!verifiedEmail || sha256Hex(verifiedEmail) !== delivery.destinationId) {
      // The materialized destination no longer exists (email removed,
      // unverified, or changed). Honest terminal record — never mail a
      // different address than the one the delivery was owed to.
      return { status: "PERMANENT_FAILED", errorCode: "destination_gone", errorClass: "permanent" };
    }
    const result = await deps.sendEmail(
      verifiedEmail,
      "GalaxySportsEdge — your watchlist pick graded",
      message,
    );
    if (result.sent) return { status: "DELIVERED" };
    if (result.classification === "permanent") {
      return { status: "PERMANENT_FAILED", errorCode: result.errorName ?? "email_rejected", errorClass: "permanent" };
    }
    if (result.classification === "not_configured") {
      return {
        status: "RETRYABLE_FAILED",
        errorCode: "channel_not_configured",
        errorClass: "infrastructure",
      };
    }
    return { status: "RETRYABLE_FAILED", errorCode: result.errorName ?? "email_transient", errorClass: "retryable" };
  }

  return { status: "PERMANENT_FAILED", errorCode: `unknown_channel_${delivery.channel}`, errorClass: "permanent" };
}

// ── Honest queue health (6.7) ─────────────────────────────────────────────

export interface OutboxHealth {
  readonly ok: boolean;
  readonly degraded: boolean;
  readonly reasons: string[];
  readonly queueDepth: number;
  readonly oldestPendingAgeMs: number | null;
  readonly deliveryCounts: Record<string, number>;
  readonly eventCounts: Record<string, number>;
}

const HEALTH_DELIVERY_STATUSES = [
  "PENDING",
  "CLAIMED",
  "RETRYABLE_FAILED",
  "DELIVERED",
  "SUPPRESSED",
  "NO_RECIPIENT",
  "PERMANENT_FAILED",
  "DEAD_LETTER",
];
const HEALTH_EVENT_STATUSES = ["PENDING", "EXPANDED", "DELIVERED", "COMPLETED_WITH_FAILURES", "FAILED"];

interface CountingDb {
  pickSettlementEvent: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
      take: number;
      select: Record<string, unknown>;
    }): Promise<Array<{ createdAt: Date }>>;
  };
  pickSettlementDelivery: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

/** Per-state counts, queue depth and oldest-pending age. `ok` is false when
 *  the health query itself fails or dead letters exist; `degraded` when
 *  retryable backlog or old pendings exist. Absence of evidence is never
 *  green: a thrown query returns ok:false. */
export async function getSettlementOutboxHealth(
  dbArg: unknown,
  now: Date = new Date(),
  maxPendingAgeMs: number = 6 * 60 * 60 * 1000,
): Promise<OutboxHealth> {
  const db = dbArg as CountingDb;
  const reasons: string[] = [];
  try {
    const deliveryCounts: Record<string, number> = {};
    for (const status of HEALTH_DELIVERY_STATUSES) {
      deliveryCounts[status] = await db.pickSettlementDelivery.count({ where: { status } });
    }
    const eventCounts: Record<string, number> = {};
    for (const status of HEALTH_EVENT_STATUSES) {
      eventCounts[status] = await db.pickSettlementEvent.count({ where: { status } });
    }
    const oldest = await db.pickSettlementEvent.findMany({
      where: { status: { in: ["PENDING", "EXPANDED"] } },
      orderBy: { createdAt: "asc" },
      take: 1,
      select: { createdAt: true },
    });
    const oldestPendingAgeMs = oldest[0]
      ? Math.max(0, now.getTime() - oldest[0].createdAt.getTime())
      : null;

    const queueDepth =
      (eventCounts["PENDING"] ?? 0) +
      (deliveryCounts["PENDING"] ?? 0) +
      (deliveryCounts["RETRYABLE_FAILED"] ?? 0) +
      (deliveryCounts["CLAIMED"] ?? 0);

    if ((deliveryCounts["DEAD_LETTER"] ?? 0) > 0) {
      reasons.push(`${deliveryCounts["DEAD_LETTER"]} dead-lettered deliveries need owner review`);
    }
    if (oldestPendingAgeMs !== null && oldestPendingAgeMs > maxPendingAgeMs) {
      reasons.push(`oldest unfinished event is ${Math.round(oldestPendingAgeMs / 60_000)}m old`);
    }
    if ((deliveryCounts["RETRYABLE_FAILED"] ?? 0) > 0) {
      reasons.push(`${deliveryCounts["RETRYABLE_FAILED"]} deliveries awaiting retry`);
    }

    const deadLetters = (deliveryCounts["DEAD_LETTER"] ?? 0) > 0;
    return {
      ok: !deadLetters,
      degraded: reasons.length > 0,
      reasons,
      queueDepth,
      oldestPendingAgeMs,
      deliveryCounts,
      eventCounts,
    };
  } catch (err) {
    return {
      ok: false,
      degraded: true,
      reasons: [`health query failed: ${errorMessage(err)}`],
      queueDepth: -1,
      oldestPendingAgeMs: null,
      deliveryCounts: {},
      eventCounts: {},
    };
  }
}
