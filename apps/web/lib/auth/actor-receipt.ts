/**
 * Immutable actor receipts — the persisted half of the TrustedActor audit
 * contract (directive 4.3 decision: receipt path, documented in ./actor.ts).
 *
 * WHAT A RECEIPT IS
 * -----------------
 * One append-only `actor_receipts` row capturing EVERY field of the
 * TrustedActor that authorized an audited write: actor type, stable subject
 * id, auth method, authority scope, tenant/project, request/run correlation
 * ids, observedAt, email snapshot, policy version, and — for SERVICE/SYSTEM
 * actors — the resolved operation and credential-verification method. Audit
 * rows (moderation actions/appeals/reports, agent handoffs, subagent runs)
 * store the receipt id; the receipt is the complete, immutable record.
 *
 * WRITE-ORDERING RULE
 * -------------------
 * The receipt is persisted BEFORE the audit row it vouches for. If the audit
 * write then fails, an orphan receipt may remain — that is harmless (it is an
 * immutable statement that an actor was resolved) and deliberately preferred
 * over the reverse failure mode, where an audit row would reference a receipt
 * that never got written. An audit row therefore never carries a dangling
 * receipt id.
 *
 * FAILURE MODE
 * ------------
 * Receipt persistence failing is an audit-store failure: the caller MUST fail
 * the audited write (throw), never proceed without the receipt. This module
 * throws the typed ActorReceiptUnavailableError; call sites wrap it in their
 * own *StoreUnavailableError taxonomy.
 *
 * Receipts are never updated or deleted by application code. There is no
 * update/delete API here on purpose.
 */
import { db } from "@sports/db";
import type { TrustedActor } from "./actor";

export class ActorReceiptUnavailableError extends Error {
  readonly code = "ACTOR_RECEIPT_UNAVAILABLE" as const;
  constructor(cause?: unknown) {
    super(
      "Actor receipt store is unavailable. " +
        (cause instanceof Error ? cause.message : String(cause ?? "No database connection."))
    );
    this.name = "ActorReceiptUnavailableError";
    if (cause instanceof Error && cause.stack) {
      this.stack = this.stack + "\nCaused by: " + cause.stack;
    }
  }
}

/** The full persisted audit contract. Keys mirror the ActorReceipt model. */
export interface ActorReceiptRecord {
  readonly actorType: string;
  readonly subjectId: string;
  readonly authMethod: string;
  readonly authorityScope: string;
  readonly tenant: string | null;
  readonly project: string | null;
  readonly requestId: string | null;
  readonly runId: string | null;
  readonly observedAt: Date;
  readonly emailSnapshot: string | null;
  readonly policyVersion: string;
  readonly operation: string | null;
  readonly credentialMethod: string | null;
}

/**
 * Maps a TrustedActor to its complete receipt record. Completeness is
 * enforced by test (audit-receipt completeness test): every enumerable field
 * on a minted actor must appear in this record.
 */
export function toActorReceiptRecord(actor: TrustedActor): ActorReceiptRecord {
  return {
    actorType: actor.actorType,
    subjectId: actor.subjectId,
    authMethod: actor.authMethod,
    authorityScope: actor.authorityScope,
    tenant: actor.tenant,
    project: actor.project,
    requestId: actor.requestId,
    runId: actor.runId,
    observedAt: actor.observedAt,
    emailSnapshot: actor.emailSnapshot,
    policyVersion: actor.policyVersion,
    operation: actor.actorType === "HUMAN" ? null : actor.operation,
    credentialMethod: actor.actorType === "HUMAN" ? null : actor.credentialMethod,
  };
}

/**
 * Persists the immutable receipt for `actor` and returns its id, to be stored
 * on the audit row. Throws ActorReceiptUnavailableError on any store failure —
 * the caller must abort the audited write (fail closed).
 */
export async function persistActorReceipt(actor: TrustedActor): Promise<string> {
  try {
    const row = await db.actorReceipt.create({ data: toActorReceiptRecord(actor) });
    return row.id;
  } catch (err) {
    throw new ActorReceiptUnavailableError(err);
  }
}
