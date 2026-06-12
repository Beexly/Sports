/**
 * Moderation server actions — DB-backed operations for the graduated action ladder.
 *
 * Error contract:
 *   - ModerationStoreUnavailableError: DB is unreachable or query fails.
 *   - ModerationValidationError (from moderation.ts): actor/reason missing, ladder
 *     violation, or business-rule failure (appeal-once, different-reviewer, etc.).
 *
 * "Every action is logged" is law: takeAction will throw rather than persist without
 * an actor + reason.
 *
 * Policy source: docs/legal/COMMUNITY_MODERATION_POLICY.md
 */

"use server";

import { db } from "@sports/db";
import { Prisma } from "@sports/db";
import type {
  ModerationActionKind,
  ModerationAppealStatus,
  ModerationReasonCode,
  ModerationReport,
  ModerationReportStatus,
  ModerationAction,
  ModerationAppeal,
} from "@prisma/client";

import {
  assertActionLoggable,
  assertSuspendTimeBoxed,
  appealable,
  canReview,
  computeExpiry,
  computeAppealDeadline,
  ModerationValidationError,
} from "@/lib/community/moderation";

// ── Local error ───────────────────────────────────────────────────────────────

export class ModerationStoreUnavailableError extends Error {
  readonly code = "MODERATION_STORE_UNAVAILABLE" as const;

  constructor(cause?: unknown) {
    super(
      "Moderation store is unavailable. " +
        (cause instanceof Error ? cause.message : String(cause ?? "No database connection."))
    );
    this.name = "ModerationStoreUnavailableError";
    if (cause instanceof Error && cause.stack) {
      this.stack = this.stack + "\nCaused by: " + cause.stack;
    }
  }
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface FileReportInput {
  reporterUserId?: string;
  targetUserId: string;
  contentRef: string;
  surface: string;
  reason: ModerationReasonCode;
  notes?: string;
}

export interface TakeActionInput {
  actor: string;
  targetUserId: string;
  action: ModerationActionKind;
  reason: ModerationReasonCode;
  contentRef?: string;
  surface?: string;
  notes?: string;
  reportId?: string;
  /** Required when action is SUSPEND. For MUTE_24H/MUTE_7D, computed automatically. */
  expiresAt?: Date;
}

export interface AppealActionInput {
  actionId: string;
  appellantId: string;
  grounds: string;
}

export interface DecideAppealInput {
  appealId: string;
  reviewer: string;
  decision: string;
  status: Extract<ModerationAppealStatus, "UPHELD" | "OVERTURNED">;
}

// ── fileReport ────────────────────────────────────────────────────────────────

/**
 * File a moderation report against a piece of content.
 * reporterUserId is optional (null = automated/system report).
 */
export async function fileReport(input: FileReportInput): Promise<ModerationReport> {
  try {
    return await db.moderationReport.create({
      data: {
        reporterUserId: input.reporterUserId ?? null,
        targetUserId: input.targetUserId,
        contentRef: input.contentRef,
        surface: input.surface,
        reason: input.reason,
        notes: input.notes ?? null,
        status: "OPEN",
      },
    });
  } catch (err) {
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── takeAction ────────────────────────────────────────────────────────────────

/**
 * Record a moderation action against a user.
 * Validates:
 *   - actor and reason are non-empty (throws ModerationValidationError)
 *   - time-boxed actions carry an expiry
 */
export async function takeAction(input: TakeActionInput): Promise<ModerationAction> {
  // Law: every action requires actor + reason
  assertActionLoggable(input.actor, input.reason);

  // Compute expiry for time-boxed actions
  let expiresAt: Date | null | undefined = input.expiresAt ?? null;
  const computed = computeExpiry(input.action);
  if (computed !== null) {
    // MUTE_24H / MUTE_7D: always computed, never caller-supplied
    expiresAt = computed;
  }

  // SUSPEND must always be time-boxed; an open-ended suspend is a de-facto BAN
  assertSuspendTimeBoxed(input.action, expiresAt);

  try {
    return await db.moderationAction.create({
      data: {
        actor: input.actor,
        targetUserId: input.targetUserId,
        action: input.action,
        reason: input.reason,
        contentRef: input.contentRef ?? null,
        surface: input.surface ?? null,
        notes: input.notes ?? null,
        reportId: input.reportId ?? null,
        expiresAt: expiresAt ?? null,
      },
    });
  } catch (err) {
    if (err instanceof ModerationValidationError) throw err;
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── appealAction ─────────────────────────────────────────────────────────────

/**
 * File an appeal against a SUSPEND or BAN action.
 * Enforces:
 *   - only SUSPEND/BAN are appealable
 *   - one appeal per action
 */
export async function appealAction(input: AppealActionInput): Promise<ModerationAppeal> {
  // Load the action to verify it is appealable
  let action: ModerationAction;
  try {
    const found = await db.moderationAction.findUnique({
      where: { id: input.actionId },
    });
    if (!found) {
      throw new ModerationValidationError(`No action found with id ${input.actionId}`);
    }
    action = found;
  } catch (err) {
    if (err instanceof ModerationValidationError) throw err;
    throw new ModerationStoreUnavailableError(err);
  }

  if (!appealable(action.action)) {
    throw new ModerationValidationError(
      `Action kind ${action.action} is not appealable. Only SUSPEND and BAN may be appealed.`
    );
  }

  // Enforce once: check no existing appeal for this action
  try {
    const existing = await db.moderationAppeal.findUnique({
      where: { actionId: input.actionId },
    });
    if (existing) {
      throw new ModerationValidationError(
        `Action ${input.actionId} has already been appealed. Each action may only be appealed once.`
      );
    }
  } catch (err) {
    if (err instanceof ModerationValidationError) throw err;
    throw new ModerationStoreUnavailableError(err);
  }

  const slaDeadline = computeAppealDeadline(new Date());

  try {
    return await db.moderationAppeal.create({
      data: {
        actionId: input.actionId,
        appellantId: input.appellantId,
        grounds: input.grounds,
        status: "PENDING",
        slaDeadline,
      },
    });
  } catch (err) {
    if (err instanceof ModerationValidationError) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ModerationValidationError("action already appealed");
    }
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── decideAppeal ─────────────────────────────────────────────────────────────

/**
 * Decide an appeal. Enforces:
 *   - appeal must be PENDING or UNDER_REVIEW
 *   - reviewer must NOT be the same actor as the original action (different-reviewer rule)
 */
export async function decideAppeal(input: DecideAppealInput): Promise<ModerationAppeal> {
  if (!input.reviewer.trim()) {
    throw new ModerationValidationError("Reviewer must be a non-empty identifier.");
  }

  // Load appeal + original action
  let appeal: (ModerationAppeal & { action: ModerationAction }) | null;
  try {
    appeal = await db.moderationAppeal.findUnique({
      where: { id: input.appealId },
      include: { action: true },
    });
  } catch (err) {
    throw new ModerationStoreUnavailableError(err);
  }

  if (!appeal) {
    throw new ModerationValidationError(`No appeal found with id ${input.appealId}`);
  }

  if (appeal.status !== "PENDING" && appeal.status !== "UNDER_REVIEW") {
    throw new ModerationValidationError(
      `Appeal ${input.appealId} is already decided (status: ${appeal.status}).`
    );
  }

  // Different-reviewer rule
  if (!canReview(appeal.action.actor, input.reviewer)) {
    throw new ModerationValidationError(
      `Reviewer ${input.reviewer} was the original actor on this action. A different reviewer must decide the appeal.`
    );
  }

  try {
    return await db.moderationAppeal.update({
      where: { id: input.appealId },
      data: {
        status: input.status,
        decidedBy: input.reviewer,
        decision: input.decision,
        decidedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof ModerationValidationError) throw err;
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── listOpenReports ───────────────────────────────────────────────────────────

export interface OpenReportRow {
  readonly id: string;
  readonly targetUserId: string;
  readonly contentRef: string;
  readonly surface: string;
  readonly reason: ModerationReasonCode;
  readonly status: ModerationReportStatus;
  readonly createdAt: Date;
  readonly reporterUserId: string | null;
}

export async function listOpenReports(): Promise<OpenReportRow[]> {
  try {
    const rows = await db.moderationReport.findMany({
      where: { status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      targetUserId: r.targetUserId,
      contentRef: r.contentRef,
      surface: r.surface,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      reporterUserId: r.reporterUserId,
    }));
  } catch (err) {
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── listActions ───────────────────────────────────────────────────────────────

export interface ActionRow {
  readonly id: string;
  readonly actor: string;
  readonly action: ModerationActionKind;
  readonly reason: ModerationReasonCode;
  readonly contentRef: string | null;
  readonly surface: string | null;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
}

export async function listActions(targetUserId: string): Promise<ActionRow[]> {
  try {
    const rows = await db.moderationAction.findMany({
      where: { targetUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      reason: r.reason,
      contentRef: r.contentRef,
      surface: r.surface,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    throw new ModerationStoreUnavailableError(err);
  }
}

// ── auditLog ──────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  readonly id: string;
  readonly actor: string;
  readonly targetUserId: string;
  readonly action: ModerationActionKind;
  readonly reason: ModerationReasonCode;
  readonly contentRef: string | null;
  readonly createdAt: Date;
}

/**
 * Returns all moderation actions touching a specific content reference.
 * Supports forensic queries ("what happened to this message?").
 */
export async function auditLog(contentRef: string): Promise<AuditLogRow[]> {
  try {
    const rows = await db.moderationAction.findMany({
      where: { contentRef },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      targetUserId: r.targetUserId,
      action: r.action,
      reason: r.reason,
      contentRef: r.contentRef,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    throw new ModerationStoreUnavailableError(err);
  }
}
