/**
 * Agent Council Ledger Store
 *
 * Write paths for the Agent Handoff Ledger (spec §8) and the
 * Subagent Run Ledger (spec §9).
 *
 * Design rules:
 *   - Seats are validated against AGENT_COUNCIL ids — unknown seats are rejected.
 *   - Subagent outputs are drafts: parent_review_status starts as "pending_review"
 *     and stays there until the parent seat explicitly calls reviewSubagentRun().
 *   - All DB errors are caught and rethrown as LedgerStoreUnavailableError (never
 *     silently swallowed).
 *
 * Non-negotiables:
 *   - No fake or simulated entries.
 *   - Seat validation is strict — every handoff and run must name real seats.
 *   - Review states follow a one-way path: pending_review → accepted|rejected|edited.
 */

"use server";

import { db } from "@sports/db";
import { Prisma } from "@sports/db";
import { AGENT_COUNCIL } from "./agent-council";

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

/**
 * Returns true when the value matches a known seat id or codename.
 * Handoffs and runs accept either form so callers can use whichever
 * is natural in context.
 */
function isValidSeat(value: string): boolean {
  return VALID_SEAT_IDS.has(value) || VALID_CODENAMES.has(value);
}

function assertValidSeat(value: string, label: string): void {
  if (!isValidSeat(value)) {
    throw new Error(`Unknown agent seat "${value}" for ${label}. Must be a valid AGENT_COUNCIL id or codename.`);
  }
}

// ─── DB error wrapper ─────────────────────────────────────────────────────────

function wrapDbError(err: unknown): never {
  throw new LedgerStoreUnavailableError(err);
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
 * Log a handoff from one council seat to another.
 *
 * Both seats are validated against the AGENT_COUNCIL registry. Status
 * starts as "pending" and is updated via outcome resolution.
 */
export async function logHandoff(input: LogHandoffInput) {
  assertValidSeat(input.sourceSeat, "sourceSeat");
  assertValidSeat(input.targetSeat, "targetSeat");

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
      },
    });
  } catch (err) {
    wrapDbError(err);
  }
}

/**
 * Returns the most recent handoffs, newest first.
 *
 * @param limit  Max rows to return (default 20).
 */
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
  /** Id of the subagent template that ran. */
  subagentId: string;
  /** Seat id or codename of the parent council seat that spawned the subagent. */
  parentSeat: string;
  /** Narrow task the subagent was given. */
  task: string;
  /** Context provided as input to the subagent. */
  inputContext: string;
  /** Reference to the draft artifact the subagent produced (path, id, or url). */
  outputArtifactRef: string;
  /** Confidence score 0–100. */
  confidence: number;
  /** Explicit uncertainty statement. */
  uncertainty: string;
  /** Supporting evidence items. */
  evidence?: string[];
  /** True = prohibited-actions check passed. */
  prohibitedActionsChecked: boolean;
}

/**
 * Log a subagent run under a parent seat.
 *
 * The run starts with parent_review_status = "pending_review".
 * The parent seat must call reviewSubagentRun() to move it to
 * accepted / rejected / edited. Until then the output is a draft.
 */
export async function logSubagentRun(input: LogSubagentRunInput) {
  assertValidSeat(input.parentSeat, "parentSeat");

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
 * Only the parent seat (by codename or id) that spawned the run may review it.
 * Status moves from pending_review → accepted | rejected | edited.
 * Re-reviewing an already-decided run replaces the status (last-write-wins;
 * the run record itself acts as the append-only artifact).
 */
export async function reviewSubagentRun(
  runId: string,
  reviewerSeat: string,
  decision: SubagentReviewDecision
) {
  assertValidSeat(reviewerSeat, "reviewerSeat");

  try {
    const existing = await db.subagentRun.findUniqueOrThrow({ where: { id: runId } });

    if (!isValidSeat(existing.parent_seat)) {
      // Should never happen — parentSeat was validated at creation time.
      throw new Error(`Run ${runId} has an unrecognised parent seat "${existing.parent_seat}".`);
    }

    // The reviewer must be the parent seat (id or codename form).
    const reviewerMatches =
      existing.parent_seat === reviewerSeat ||
      // Resolve codename → id comparison
      AGENT_COUNCIL.find((s) => s.codename === reviewerSeat)?.id === existing.parent_seat ||
      AGENT_COUNCIL.find((s) => s.id === reviewerSeat)?.codename === existing.parent_seat;

    if (!reviewerMatches) {
      throw new Error(
        `Seat "${reviewerSeat}" is not the parent seat for run ${runId}. ` +
        `Only the parent seat ("${existing.parent_seat}") may review this run.`
      );
    }

    return await db.subagentRun.update({
      where: { id: runId },
      data: { parent_review_status: decision },
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

/**
 * Returns subagent runs still awaiting parent review, newest first.
 *
 * @param limit  Max rows to return (default 20).
 */
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
