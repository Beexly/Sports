/**
 * Agent Council Ledger Store — core write implementation.
 *
 * This module is deliberately NOT a "use server" file: every write takes an
 * already-resolved `TrustedActor` as its first argument. Keeping the actor a
 * plain function argument (rather than an RPC request field) is only safe
 * because this module is imported by trusted server code — the interactive
 * "use server" wrappers in ./ledgers.ts (which resolve a HUMAN admin actor via
 * requireAdminActor) and background/non-interactive paths (workers, cron)
 * which obtain a GOVERNED SERVICE / SYSTEM actor via resolveServiceActor()
 * (allowlisted principal + verified credential context + operation scope; the
 * raw constructors are deprecated and guard-enforced to tests). A browser RPC
 * call can never reach these functions with a forged actor, because they are
 * not part of the "use server" surface.
 *
 * AUDIT RECEIPTS (directive 4.3): every write persists an immutable
 * ActorReceipt (the full TrustedActor audit contract — see
 * @/lib/auth/actor-receipt) BEFORE the ledger row and stores its id
 * (actor_receipt_id / reviewer_receipt_id). Receipt failure aborts the write.
 *
 * SEAT IDENTITY (directive 4.4): a reviewer's "seat" is a NON-AUTHORITATIVE
 * workflow label — see reviewSubagentRunAs.
 *
 * Design rules (unchanged from the original ledgers module):
 *   - Seats are validated against AGENT_COUNCIL ids — unknown seats are rejected.
 *   - Subagent outputs are drafts: parent_review_status starts as "pending_review".
 *   - All DB errors are caught and rethrown as LedgerStoreUnavailableError.
 *   - Auth resolution happens in the caller BEFORE any sensitive validation
 *     here — an unauthorized caller never learns whether its seat/confidence
 *     input was well-formed.
 */

import { db } from "@sports/db";
import { Prisma } from "@sports/db";
import { AGENT_COUNCIL } from "./agent-council";
import { assertActorType, type TrustedActor } from "@/lib/auth/actor";
import { persistActorReceipt } from "@/lib/auth/actor-receipt";

// ─── Typed error ──────────────────────────────────────────────────────────────

export class LedgerStoreUnavailableError extends Error {
  readonly code = "LEDGER_STORE_UNAVAILABLE" as const;

  constructor(cause?: unknown) {
    super(
      "Jarvis ledger store is unavailable. " +
        (cause instanceof Error ? cause.message : String(cause ?? "No database connection."))
    );
    this.name = "LedgerStoreUnavailableError";
    if (cause instanceof Error && cause.stack) {
      this.stack = this.stack + "\nCaused by: " + cause.stack;
    }
  }
}

// ─── Seat validation ──────────────────────────────────────────────────────────

/** Set of all valid seat ids in the council registry (stable). */
const VALID_SEAT_IDS: ReadonlySet<string> = new Set(AGENT_COUNCIL.map((s) => s.id));
/** Set of all valid codenames (e.g. "JARVIS", "SCOUT"). */
const VALID_CODENAMES: ReadonlySet<string> = new Set(AGENT_COUNCIL.map((s) => s.codename));

function isValidSeat(value: string): boolean {
  return VALID_SEAT_IDS.has(value) || VALID_CODENAMES.has(value);
}

function assertValidSeat(value: string, label: string): void {
  if (!isValidSeat(value)) {
    throw new Error(`Unknown agent seat "${value}" for ${label}. Must be a valid AGENT_COUNCIL id or codename.`);
  }
}

// ─── Confidence validation ────────────────────────────────────────────────────

function assertValidConfidence(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid confidence "${value}" for ${label}. Must be a number in 0–100.`);
  }
}

// ─── DB error wrapper ─────────────────────────────────────────────────────────

function wrapDbError(err: unknown): never {
  throw new LedgerStoreUnavailableError(err);
}

/**
 * Persists the immutable ActorReceipt (directive 4.3) BEFORE the ledger row it
 * vouches for, wrapping receipt-store failure into this module's typed store
 * error. Receipt failure aborts the audited write (fail closed).
 */
async function persistReceiptOrFail(actor: TrustedActor): Promise<string> {
  try {
    return await persistActorReceipt(actor);
  } catch (err) {
    wrapDbError(err);
  }
}

// ─── Handoff ledger ───────────────────────────────────────────────────────────

export interface LogHandoffInput {
  /** Seat id or codename of the initiating seat. */
  sourceSeat: string;
  /** Seat id or codename of the receiving seat. */
  targetSeat: string;
  /** Human-readable reason. */
  reason: string;
  /** Task type (matches routing rules, e.g. "pick-research"). */
  taskType: string;
  /** Supporting evidence text (urls, data references, test ids). */
  evidenceText: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  /** Authority tier of the initiating seat (0–4). */
  authorityTier: number;
  ownerApprovalRequired?: boolean;
}

/**
 * Log a handoff from one council seat to another, attributed to a trusted
 * actor. HUMAN (interactive admin), SERVICE, and SYSTEM actors may all log
 * handoffs — an agent logging its own handoff is a legitimate background path.
 */
export async function logHandoffAs(actor: TrustedActor, input: LogHandoffInput) {
  assertActorType(actor, ["HUMAN", "SERVICE", "SYSTEM"], "logHandoff");
  assertValidSeat(input.sourceSeat, "sourceSeat");
  assertValidSeat(input.targetSeat, "targetSeat");

  const actorReceiptId = await persistReceiptOrFail(actor);
  try {
    return await db.agentHandoff.create({
      data: {
        source_seat: input.sourceSeat,
        target_seat: input.targetSeat,
        reason: input.reason,
        task_type: input.taskType,
        evidence_text: input.evidenceText,
        risk_level: input.riskLevel ?? "low",
        authority_tier: input.authorityTier,
        status: "pending",
        owner_approval_required: input.ownerApprovalRequired ?? false,
        actor_subject_id: actor.subjectId,
        actor_type: actor.actorType,
        actor_email: actor.emailSnapshot,
        policy_version: actor.policyVersion,
        actor_receipt_id: actorReceiptId,
      },
    });
  } catch (err) {
    wrapDbError(err);
  }
}

export async function listRecentHandoffs(limit = 20) {
  try {
    return await db.agentHandoff.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    });
  } catch (err) {
    wrapDbError(err);
  }
}

// ─── Subagent run ledger ──────────────────────────────────────────────────────

export interface LogSubagentRunInput {
  subagentId: string;
  parentSeat: string;
  task: string;
  inputContext: string;
  outputArtifactRef: string;
  confidence: number;
  uncertainty: string;
  evidence?: string[];
  prohibitedActionsChecked: boolean;
}

/**
 * Log a subagent run under a parent seat, attributed to a trusted actor.
 * HUMAN / SERVICE / SYSTEM all permitted (background agents record their own
 * runs). The run starts with parent_review_status = "pending_review".
 */
export async function logSubagentRunAs(actor: TrustedActor, input: LogSubagentRunInput) {
  assertActorType(actor, ["HUMAN", "SERVICE", "SYSTEM"], "logSubagentRun");
  assertValidSeat(input.parentSeat, "parentSeat");
  assertValidConfidence(input.confidence, "confidence");

  const actorReceiptId = await persistReceiptOrFail(actor);
  try {
    return await db.subagentRun.create({
      data: {
        subagent_id: input.subagentId,
        parent_seat: input.parentSeat,
        task: input.task,
        input_context: input.inputContext,
        output_artifact_ref: input.outputArtifactRef,
        confidence: input.confidence,
        uncertainty: input.uncertainty,
        evidence: input.evidence ?? [],
        prohibited_actions_checked: input.prohibitedActionsChecked,
        parent_review_status: "pending_review",
        actor_subject_id: actor.subjectId,
        actor_type: actor.actorType,
        actor_email: actor.emailSnapshot,
        policy_version: actor.policyVersion,
        actor_receipt_id: actorReceiptId,
      },
    });
  } catch (err) {
    wrapDbError(err);
  }
}

export type SubagentReviewDecision = "accepted" | "rejected" | "edited";

/**
 * Record the parent seat's review decision for a subagent run.
 *
 * Reviewing is a HUMAN-only operation: a subagent run is a draft awaiting a
 * human parent seat's judgement, so a SERVICE/SYSTEM actor may NOT decide it.
 *
 * SEAT IDENTITY RULE (directive 4.4 — explicit): `reviewerSeatLabel` is a
 * NON-AUTHORITATIVE workflow label. It does NOT authenticate the seat and it
 * confers NO authority. Authority comes solely from the authenticated HUMAN
 * admin actor (`actor`), whose stable subject id — and its immutable
 * ActorReceipt — are what the audit path records as the deciding authority
 * (reviewer_subject_id / reviewer_receipt_id). Any owner/admin human is
 * authorized to review on behalf of a parent seat; the label is validated only
 * for workflow consistency (it must name the run's parent seat, by id or
 * codename), never as an identity claim.
 *
 * Status moves from pending_review → accepted | rejected | edited.
 */
export async function reviewSubagentRunAs(
  actor: TrustedActor,
  runId: string,
  reviewerSeatLabel: string,
  decision: SubagentReviewDecision
) {
  assertActorType(actor, ["HUMAN"], "reviewSubagentRun");
  assertValidSeat(reviewerSeatLabel, "reviewerSeatLabel");

  const reviewerReceiptId = await persistReceiptOrFail(actor);
  try {
    const existing = await db.subagentRun.findUniqueOrThrow({ where: { id: runId } });

    if (!isValidSeat(existing.parent_seat)) {
      // Should never happen — parentSeat was validated at creation time.
      throw new Error(`Run ${runId} has an unrecognised parent seat "${existing.parent_seat}".`);
    }

    // Workflow-consistency check ONLY (not authority): the seat label must be
    // the run's parent seat (id or codename form).
    const reviewerMatches =
      existing.parent_seat === reviewerSeatLabel ||
      AGENT_COUNCIL.find((s) => s.codename === reviewerSeatLabel)?.id === existing.parent_seat ||
      AGENT_COUNCIL.find((s) => s.id === reviewerSeatLabel)?.codename === existing.parent_seat;

    if (!reviewerMatches) {
      throw new Error(
        `Seat "${reviewerSeatLabel}" is not the parent seat for run ${runId}. ` +
        `Only the parent seat ("${existing.parent_seat}") may review this run.`
      );
    }

    return await db.subagentRun.update({
      where: { id: runId },
      data: {
        parent_review_status: decision,
        reviewer_subject_id: actor.subjectId,
        reviewer_type: actor.actorType,
        reviewer_email: actor.emailSnapshot,
        policy_version: actor.policyVersion,
        reviewer_receipt_id: reviewerReceiptId,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Seat ")) throw err;
    if (err instanceof Error && err.message.startsWith("Run ")) throw err;
    // P2025: record not found — surface clearly before wrapDbError masks it
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new Error(`SubagentRun "${runId}" not found.`);
    }
    wrapDbError(err);
  }
}

export async function listPendingSubagentReviews(limit = 20) {
  try {
    return await db.subagentRun.findMany({
      where: { parent_review_status: "pending_review" },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  } catch (err) {
    wrapDbError(err);
  }
}
