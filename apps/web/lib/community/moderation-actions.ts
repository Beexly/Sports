/**
 * Moderation server actions — DB-backed operations for the graduated action ladder.
 *
 * TRUST MODEL (Phase 1A — Trusted Actor)
 * --------------------------------------
 * Every identity that gets persisted or compared is derived server-side from a
 * TrustedActor, NEVER from a caller-supplied request field. Concretely:
 *   - fileReport (authenticated): reporterUserId comes from the session actor.
 *   - fileAnonymousReport: a SEPARATE explicit contract — reporterUserId is
 *     always null (never a caller-supplied authenticated id) and is guarded by
 *     an anti-abuse rate limiter.
 *   - appealAction: the appellant is the session actor, and the action being
 *     appealed MUST belong to that user (ownership proof) — a caller cannot
 *     consume another user's single allowed appeal.
 *   - takeAction / decideAppeal: the actor / reviewer are the trusted admin
 *     actor's stable subject id. Callers have NO authority over identity fields.
 *     The different-reviewer rule compares trusted stable ids.
 *
 * Auth is resolved BEFORE any sensitive validation (an unauthorized caller
 * never learns whether their input was well-formed).
 *
 * Error contract:
 *   - ModerationStoreUnavailableError: DB is unreachable or query fails.
 *   - ModerationValidationError (from moderation.ts): ladder/business-rule failure.
 *   - UnauthenticatedError / ForbiddenError / InvalidActorError (from auth/actor).
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
import {
  requireAdminActor,
  requireSessionActor,
  ForbiddenError,
} from "@/lib/auth/actor";
import {
  checkAnonymousReportQuota,
  type AnonReportLimiterConfig,
} from "@/lib/community/anon-report-limiter";

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

/**
 * Authenticated report. NOTE: there is intentionally NO reporterUserId field —
 * the reporter identity is derived from the session, never accepted from the
 * caller. Spoofing another user as the reporter is therefore not expressible.
 */
export interface FileReportInput {
  targetUserId: string;
  contentRef: string;
  surface: string;
  reason: ModerationReasonCode;
  notes?: string;
}

/**
 * Anonymous report — a SEPARATE, explicit contract. reporterUserId is always
 * persisted as null. `clientFingerprint` feeds the anti-abuse rate limiter and
 * is NOT an identity claim.
 */
export interface FileAnonymousReportInput {
  targetUserId: string;
  contentRef: string;
  surface: string;
  reason: ModerationReasonCode;
  notes?: string;
  /** Opaque source fingerprint (hashed IP / device token) for rate-limiting. */
  clientFingerprint?: string | null;
}

/**
 * takeAction input. NOTE: there is intentionally NO `actor` field — the acting
 * operator is the trusted admin session, not a caller-supplied string.
 */
export interface TakeActionInput {
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

/**
 * appealAction input. NOTE: there is intentionally NO appellantId — the
 * appellant is the session actor, and ownership of the appealed action is
 * proven server-side.
 */
export interface AppealActionInput {
  actionId: string;
  grounds: string;
}

/**
 * decideAppeal input. NOTE: there is intentionally NO `reviewer` field — the
 * reviewer is the trusted admin session. The different-reviewer rule compares
 * the trusted reviewer's stable id against the original action's stored actor.
 */
export interface DecideAppealInput {
  appealId: string;
  decision: string;
  status: Extract<ModerationAppealStatus, "UPHELD" | "OVERTURNED">;
}

// ── fileReport (authenticated) ─────────────────────────────────────────────────

/**
 * File a moderation report as an authenticated user. The reporter identity is
 * derived from the session — a caller cannot claim to be another user.
 */
export async function fileReport(input: FileReportInput): Promise<ModerationReport> {
  const actor = await requireSessionActor();
  try {
    return await db.moderationReport.create({
      data: {
        reporterUserId: actor.subjectId,
        reporterActorType: actor.actorType,
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

// ── fileAnonymousReport (unauthenticated, explicit) ────────────────────────────

/**
 * File an anonymous moderation report. reporterUserId is ALWAYS null — this
 * path can never be used to attribute a report to an authenticated user.
 * Guarded by a fingerprint-keyed anti-abuse rate limiter.
 */
export async function fileAnonymousReport(
  input: FileAnonymousReportInput,
  limiterConfig?: AnonReportLimiterConfig
): Promise<ModerationReport> {
  // Anti-abuse seam runs first — throws AnonymousReportRateLimitError on abuse
  // or on a missing fingerprint (fail closed).
  checkAnonymousReportQuota(input.clientFingerprint ?? null, limiterConfig);

  try {
    return await db.moderationReport.create({
      data: {
        reporterUserId: null,
        reporterActorType: null,
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
 * Record a moderation action against a user. The acting operator is the trusted
 * admin session — NOT a caller-supplied string. Validates:
 *   - reason is non-empty (throws ModerationValidationError)
 *   - time-boxed actions carry an expiry
 */
export async function takeAction(input: TakeActionInput): Promise<ModerationAction> {
  // Auth FIRST — a HUMAN admin actor. Its stable subject id is the actor.
  const actor = await requireAdminActor();

  // Law: every action requires actor + reason. actor is the trusted subject id
  // (guaranteed non-empty), so this now only meaningfully guards `reason`.
  assertActionLoggable(actor.subjectId, input.reason);

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
        actor: actor.subjectId,
        actorType: actor.actorType,
        actorEmail: actor.emailSnapshot,
        policyVersion: actor.policyVersion,
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
 * File an appeal against a SUSPEND or BAN action. The appellant is the session
 * actor, and the appealed action MUST belong to that user — a caller cannot
 * consume another user's single allowed appeal. Enforces:
 *   - the caller owns the appealed action (targetUserId === appellant)
 *   - only SUSPEND/BAN are appealable
 *   - one appeal per action
 */
export async function appealAction(input: AppealActionInput): Promise<ModerationAppeal> {
  const actor = await requireSessionActor();

  // Load the action to verify ownership + appealability
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

  // Ownership proof: only the user the action was taken against may appeal it.
  if (action.targetUserId !== actor.subjectId) {
    throw new ForbiddenError(
      "You may only appeal a moderation action taken against your own account."
    );
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
        appellantId: actor.subjectId,
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
 * Decide an appeal. The reviewer is the trusted admin session. Enforces:
 *   - appeal must be PENDING or UNDER_REVIEW
 *   - reviewer must NOT be the same actor as the original action
 *     (different-reviewer rule, compared on TRUSTED STABLE IDS — a fabricated
 *     reviewer string can no longer bypass it).
 */
export async function decideAppeal(input: DecideAppealInput): Promise<ModerationAppeal> {
  const reviewer = await requireAdminActor();

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

  // Different-reviewer rule — compares the original action's stored actor
  // (itself a trusted subject id) against this reviewer's trusted subject id.
  if (!canReview(appeal.action.actor, reviewer.subjectId)) {
    throw new ModerationValidationError(
      `Reviewer ${reviewer.subjectId} was the original actor on this action. ` +
        `A different reviewer must decide the appeal.`
    );
  }

  try {
    return await db.moderationAppeal.update({
      where: { id: input.appealId },
      data: {
        status: input.status,
        decidedBy: reviewer.subjectId,
        reviewerType: reviewer.actorType,
        reviewerEmail: reviewer.emailSnapshot,
        policyVersion: reviewer.policyVersion,
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
  await requireAdminActor();
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
  await requireAdminActor();
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
  await requireAdminActor();
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
