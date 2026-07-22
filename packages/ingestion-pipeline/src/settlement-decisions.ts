/**
 * Settlement decisions — append-only owner/system decision history over
 * settlement anomalies (hardening 6.3, PR #161).
 *
 * The pre-hardening design stored a synthetic "REVIEW_REQUESTED" row in the
 * unique-per-anomaly SettlementDecision table, consuming the only decision
 * slot before any real owner decision existed. Hardened model:
 *
 *   OwnerDecisionRequest      — ONE idempotent queue request per anomaly
 *                               (created by the promotion path in
 *                               settlement-evidence.ts).
 *   SettlementDecisionEvent[] — APPEND-ONLY history. Every event carries
 *                               the actor receipt (OWNER vs SYSTEM — a
 *                               SYSTEM event can never impersonate an
 *                               owner), the prior and next anomaly state, a
 *                               reason, and optional evidence. Events are
 *                               never mutated or deleted.
 *
 * State transitions are guarded (updateMany scoped to the prior state), so
 * a concurrent decision cannot double-apply: the loser matches zero rows
 * and appends nothing.
 */

import type { OwnerDecisionKind } from "./settlement-evidence.js";
import { OWNER_DECISION_KINDS } from "./settlement-evidence.js";

/** Anomaly state each owner decision kind lands the anomaly in. Decisions
 *  that request patience (ACKNOWLEDGED / WAIT_FOR_SOURCE) keep the anomaly
 *  in OWNER_REVIEW; terminal decisions resolve or dismiss it. */
const NEXT_STATE_BY_KIND: Record<OwnerDecisionKind, string> = {
  ACKNOWLEDGED: "OWNER_REVIEW",
  WAIT_FOR_SOURCE: "OWNER_REVIEW",
  MARK_POSTPONED: "RESOLVED",
  VOID_PICKS: "RESOLVED",
  DISMISS_ANOMALY: "DISMISSED",
  RESOLVE_SCORES_ARRIVED: "RESOLVED",
};

/** States from which an owner decision may be recorded. */
const DECIDABLE_STATES = ["OPEN", "OWNER_REVIEW"] as const;

export interface OwnerActorReceipt {
  /** The authenticated owner/admin user id — server-derived, never a
   *  caller-supplied label. */
  readonly subjectId: string;
  readonly requestId?: string;
}

interface DecisionAnomalyRow {
  readonly id: string;
  readonly state: string;
}

export interface SettlementDecisionTx {
  settlementAnomaly: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; state: true };
    }): Promise<DecisionAnomalyRow | null>;
    updateMany(args: {
      where: { id: string; state: { in: string[] } };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  settlementDecisionEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface SettlementDecisionDb {
  $transaction<T>(fn: (tx: SettlementDecisionTx) => Promise<T>): Promise<T>;
}

export type OwnerDecisionOutcome =
  | { readonly applied: true; readonly priorState: string; readonly nextState: string }
  | {
      readonly applied: false;
      readonly reason: "anomaly_not_found" | "not_decidable" | "lost_race" | "invalid_kind";
    };

/**
 * Appends one OWNER decision event and applies its state transition,
 * exactly once per race (prior-state-scoped updateMany). NEVER mutates
 * prior events. VOID_PICKS here records the DECISION receipt only — the
 * actual voiding of picks is a separate, explicitly owner-invoked
 * operation and is never performed by this module.
 */
export async function recordOwnerSettlementDecision(args: {
  readonly db: SettlementDecisionDb;
  readonly anomalyId: string;
  readonly decisionKind: OwnerDecisionKind;
  readonly actor: OwnerActorReceipt;
  readonly reason: string;
  readonly evidence?: unknown;
  readonly now?: Date;
}): Promise<OwnerDecisionOutcome> {
  if (!OWNER_DECISION_KINDS.includes(args.decisionKind)) {
    return { applied: false, reason: "invalid_kind" };
  }
  const now = args.now ?? new Date();
  const nextState = NEXT_STATE_BY_KIND[args.decisionKind];

  return args.db.$transaction(async (tx) => {
    const anomaly = await tx.settlementAnomaly.findUnique({
      where: { id: args.anomalyId },
      select: { id: true, state: true },
    });
    if (!anomaly) return { applied: false, reason: "anomaly_not_found" } as const;
    if (!(DECIDABLE_STATES as readonly string[]).includes(anomaly.state)) {
      return { applied: false, reason: "not_decidable" } as const;
    }

    const priorState = anomaly.state;
    const transition = await tx.settlementAnomaly.updateMany({
      where: { id: anomaly.id, state: { in: [priorState] } },
      data:
        nextState === priorState
          ? { lastSeenAt: now }
          : {
              state: nextState,
              lastSeenAt: now,
              resolutionActor: args.actor.subjectId,
              resolvedAt: now,
              resolutionReason: args.reason,
            },
    });
    if (transition.count === 0) return { applied: false, reason: "lost_race" } as const;

    await tx.settlementDecisionEvent.create({
      data: {
        anomalyId: anomaly.id,
        decisionKind: args.decisionKind,
        actorType: "OWNER",
        actorReceipt: {
          actorType: "OWNER",
          subjectId: args.actor.subjectId,
          ...(args.actor.requestId ? { requestId: args.actor.requestId } : {}),
          observedAt: now.toISOString(),
        },
        priorState,
        nextState,
        reason: args.reason,
        ...(args.evidence !== undefined ? { evidence: args.evidence } : {}),
      },
    });
    return { applied: true, priorState, nextState } as const;
  });
}
