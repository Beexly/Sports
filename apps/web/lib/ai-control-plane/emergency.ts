/**
 * Emergency authority: durable owner-decision receipts (directive §8.6).
 *
 * `EMERGENCY_RELIABILITY` can no longer be conjured from environment
 * variables alone. Environment configuration may only REFERENCE an approved
 * override by id (`EMERGENCY_OVERRIDE_ID`); the override itself is an
 * `EmergencyOverrideReceipt` — a durable record of an explicit OWNER decision
 * carrying the approving TrustedActor, reason, scope, spend ceiling,
 * expiration, and a revocation flag — served by a sealed
 * `EmergencyReceiptStore`.
 *
 * FAIL CLOSED on every degraded path: receipt missing, store unavailable,
 * expired, revoked, or scoped to different task classes → the emergency mode
 * is refused (typed error), never silently downgraded into cash authority.
 *
 * The production receipt store in this PR is `failClosedReceiptStore` — it
 * returns null for every id, meaning EMERGENCY_RELIABILITY is UNREACHABLE in
 * production until a durable (DB-backed, Founder-OS-visible) store lands in a
 * later PR. That is the intended safe order: the authority check exists
 * before the authority can ever be granted.
 */

import type { TrustedActor } from "@/lib/auth/actor";
import type { RegisteredAiTaskClass } from "./contracts";
import { ConfigurationError, PolicyBlocked } from "./errors";

/**
 * A durable record of one explicit owner decision approving a time-boxed
 * emergency escalation. Created ONLY through an owner decision flow (Founder
 * OS); never synthesized from env vars, requests, or defaults.
 */
export interface EmergencyOverrideReceipt {
  /** One-time override id the environment may reference. */
  readonly id: string;
  /** The owner (HUMAN TrustedActor) who approved the escalation. */
  readonly approvedByActor: TrustedActor;
  /** Non-empty reason code / rationale for the audit trail. */
  readonly reason: string;
  /** The task classes this override covers. NO wildcard — explicit list. */
  readonly scope: {
    readonly taskClasses: readonly RegisteredAiTaskClass[];
  };
  /** Absolute spend ceiling while the override is active (USD). */
  readonly maxSpendUsd: number;
  /** Hard expiry; the override is invalid at and after this instant. */
  readonly expiresAt: Date;
  /** Owner revocation: once true, the override is dead regardless of expiry. */
  readonly revoked: boolean;
}

/**
 * Sealed lookup interface for durable receipts. Implementations are wired by
 * the sealed executor dependencies (internal.ts for tests; a DB-backed store
 * in a later PR for production). Resolving to null = no such receipt.
 */
export interface EmergencyReceiptStore {
  getReceipt(id: string): Promise<EmergencyOverrideReceipt | null>;
}

/**
 * The production default until a durable store lands: every lookup misses, so
 * emergency authority is structurally unreachable (fail closed), while the
 * verification path below is fully implemented and tested.
 */
export const failClosedReceiptStore: EmergencyReceiptStore = {
  async getReceipt(): Promise<null> {
    return null;
  },
};

export interface VerifyEmergencyOverrideInput {
  readonly store: EmergencyReceiptStore;
  /** The override id the ENVIRONMENT referenced (never creates authority). */
  readonly overrideId: string;
  /** The task class requesting to run under the emergency mode. */
  readonly taskClass: RegisteredAiTaskClass;
  /** Injected clock — deterministic verification. */
  readonly now: Date;
}

/**
 * Verifies that a referenced emergency override actually authorizes running
 * `taskClass` right now. Fail-closed error taxonomy:
 *
 *   - missing/empty id, unknown id, store failure → `ConfigurationError`
 *     (the environment references a decision that cannot be proven);
 *   - revoked or expired → `ConfigurationError` (the decision no longer
 *     stands);
 *   - live receipt whose scope excludes `taskClass` → `PolicyBlocked`
 *     (a real decision exists but does not cover this task).
 *
 * Returns the receipt so the executor can clamp spend to `maxSpendUsd`.
 */
export async function verifyEmergencyOverride(
  input: VerifyEmergencyOverrideInput,
): Promise<EmergencyOverrideReceipt> {
  const { store, overrideId, taskClass, now } = input;

  const id = overrideId.trim();
  if (id === "") {
    throw new ConfigurationError(
      "EMERGENCY_RELIABILITY requires EMERGENCY_OVERRIDE_ID to reference a " +
        "durable owner-decision receipt; env vars may only reference an " +
        "override, never create one (§8.6).",
    );
  }

  let receipt: EmergencyOverrideReceipt | null;
  try {
    receipt = await store.getReceipt(id);
  } catch (cause) {
    throw new ConfigurationError(
      `Emergency receipt store failed while verifying override "${id}"; ` +
        "failing closed — emergency authority cannot be granted without a " +
        "verifiable owner decision.",
      { cause },
    );
  }

  if (receipt === null) {
    throw new ConfigurationError(
      `EMERGENCY_OVERRIDE_ID references "${id}" but no such owner-decision ` +
        "receipt exists; failing closed.",
    );
  }
  if (receipt.revoked) {
    throw new ConfigurationError(
      `Emergency override "${id}" has been revoked by the owner; failing closed.`,
    );
  }
  if (receipt.expiresAt.getTime() <= now.getTime()) {
    throw new ConfigurationError(
      `Emergency override "${id}" expired at ${receipt.expiresAt.toISOString()}; ` +
        "failing closed.",
    );
  }
  if (!receipt.scope.taskClasses.includes(taskClass)) {
    throw new PolicyBlocked(
      `Emergency override "${id}" does not cover task class "${taskClass}" ` +
        `(scope: [${receipt.scope.taskClasses.join(", ")}]); failing closed.`,
    );
  }

  if (
    typeof receipt.reason !== "string" ||
    receipt.reason.trim() === "" ||
    !Number.isFinite(receipt.maxSpendUsd) ||
    receipt.maxSpendUsd < 0
  ) {
    throw new ConfigurationError(
      `Emergency override "${id}" is structurally malformed (empty reason or ` +
        "invalid maxSpendUsd); failing closed.",
    );
  }

  return receipt;
}
