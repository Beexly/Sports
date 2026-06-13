/**
 * Community moderation — pure ladder law.
 *
 * Source of truth for:
 *   - the graduated action ladder (NUDGE → REMOVE → MUTE_24H → MUTE_7D → SUSPEND → BAN)
 *   - which reasons allow a straight-to-BAN jump
 *   - appeal eligibility
 *   - the different-reviewer rule for appeals
 *   - actor+reason required invariant (throws otherwise — "every action is logged" is law)
 *
 * This file has NO database imports. All functions are pure and testable.
 *
 * Policy source: docs/legal/COMMUNITY_MODERATION_POLICY.md
 */

import type { ModerationActionKind, ModerationReasonCode } from "@prisma/client";

// ── Ladder order ──────────────────────────────────────────────────────────────

/**
 * The canonical escalation order. Each index is the severity level.
 * NUDGE(0) < REMOVE(1) < MUTE_24H(2) < MUTE_7D(3) < SUSPEND(4) < BAN(5).
 */
export const LADDER_ORDER: readonly ModerationActionKind[] = [
  "NUDGE",
  "REMOVE",
  "MUTE_24H",
  "MUTE_7D",
  "SUSPEND",
  "BAN",
] as const;

export function ladderIndex(action: ModerationActionKind): number {
  const idx = LADDER_ORDER.indexOf(action);
  if (idx === -1) throw new Error(`Unknown action kind: ${action}`);
  return idx;
}

/**
 * Returns true when `next` is a valid escalation from `current`.
 * Same-level re-application is NOT a valid escalation.
 * Going from any level straight to BAN is always allowed when the reason
 * qualifies (see STRAIGHT_TO_BAN_REASONS).
 */
export function isValidEscalation(
  current: ModerationActionKind,
  next: ModerationActionKind,
  reason: ModerationReasonCode
): boolean {
  if (STRAIGHT_TO_BAN_REASONS.has(reason) && next === "BAN") return true;
  return ladderIndex(next) > ladderIndex(current);
}

// ── Straight-to-BAN categories ────────────────────────────────────────────────

/**
 * Reasons that permit jumping straight to BAN, bypassing the lower ladder rungs.
 * Policy: hate/threats/doxxing/self-exclusion-circumvention may skip the ladder.
 */
export const STRAIGHT_TO_BAN_REASONS: ReadonlySet<ModerationReasonCode> = new Set<ModerationReasonCode>([
  "HATE_SPEECH",
  "THREATS",
  "DOXXING",
  "SELF_EXCLUSION_CIRCUMVENTION",
]);

/**
 * Returns true when the reason permits issuing a BAN as a first action
 * (straight-to-BAN path, no prior escalation required).
 */
export function allowsStraightToBan(reason: ModerationReasonCode): boolean {
  return STRAIGHT_TO_BAN_REASONS.has(reason);
}

// ── Appeal eligibility ────────────────────────────────────────────────────────

/** Only SUSPEND and BAN are appealable. */
export function appealable(action: ModerationActionKind): boolean {
  return action === "SUSPEND" || action === "BAN";
}

// ── Different-reviewer rule ───────────────────────────────────────────────────

/**
 * Policy law: the reviewer deciding an appeal must NOT be the same actor
 * who issued the original action.
 *
 * @param originalActor  The actor field on the ModerationAction.
 * @param reviewerCandidate  The operator attempting to decide the appeal.
 * @returns true when the candidate may decide this appeal.
 */
export function canReview(originalActor: string, reviewerCandidate: string): boolean {
  if (!originalActor.trim()) return true; // system/automated actions: any human may review
  return originalActor.trim() !== reviewerCandidate.trim();
}

// ── Actor+reason required invariant ──────────────────────────────────────────

/**
 * Validates that an action has a non-empty actor and a reason.
 * "Every action is logged" is law — throws ModerationValidationError otherwise.
 */
export function assertActionLoggable(actor: string, reason: ModerationReasonCode | undefined | null): void {
  if (!actor || !actor.trim()) {
    throw new ModerationValidationError("Every moderation action requires a non-empty actor. This is law.");
  }
  if (!reason) {
    throw new ModerationValidationError("Every moderation action requires a reason code. This is law.");
  }
}

// ── Time-boxed action expiry ──────────────────────────────────────────────────

const EXPIRY_MINUTES: Partial<Record<ModerationActionKind, number>> = {
  MUTE_24H: 24 * 60,
  MUTE_7D: 7 * 24 * 60,
};

/**
 * Returns the expiry Date for time-boxed actions, or null for non-expiring ones.
 * MUTE_24H and MUTE_7D carry expiry; BAN, SUSPEND, NUDGE, REMOVE do not.
 * Note: SUSPEND duration is set by the operator (passed in as expiresAt).
 */
export function computeExpiry(action: ModerationActionKind, from: Date = new Date()): Date | null {
  const minutes = EXPIRY_MINUTES[action];
  if (minutes === undefined) return null;
  return new Date(from.getTime() + minutes * 60 * 1000);
}

/**
 * Returns true for actions that MUST carry an expiresAt timestamp.
 */
export function requiresExpiry(action: ModerationActionKind): boolean {
  return action === "MUTE_24H" || action === "MUTE_7D";
}

// ── Appeal SLA ────────────────────────────────────────────────────────────────

const APPEAL_SLA_DAYS = 7;

export function computeAppealDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + APPEAL_SLA_DAYS * 24 * 60 * 60 * 1000);
}

// ── Ladder reference map (for UI) ─────────────────────────────────────────────

export interface LadderEntry {
  readonly action: ModerationActionKind;
  readonly description: string;
  readonly appealable: boolean;
  readonly expiryLabel: string | null;
  readonly straightToBan: boolean;
}

export const LADDER_REFERENCE: readonly LadderEntry[] = [
  {
    action: "NUDGE",
    description: "Automated or moderator note, no penalty (first soft violation).",
    appealable: false,
    expiryLabel: null,
    straightToBan: false,
  },
  {
    action: "REMOVE",
    description: "Content taken down with a reason shown to the author.",
    appealable: false,
    expiryLabel: null,
    straightToBan: false,
  },
  {
    action: "MUTE_24H",
    description: "Temporary room-level silence, 24 hours.",
    appealable: false,
    expiryLabel: "24 hours",
    straightToBan: false,
  },
  {
    action: "MUTE_7D",
    description: "Temporary room-level silence, 7 days.",
    appealable: false,
    expiryLabel: "7 days",
    straightToBan: false,
  },
  {
    action: "SUSPEND",
    description: "Account-level, time-boxed, with appeal.",
    appealable: true,
    expiryLabel: "operator-set",
    straightToBan: false,
  },
  {
    action: "BAN",
    description:
      "Permanent. Reserved for hate, threats, doxxing, repeat touting, or self-exclusion circumvention.",
    appealable: true,
    expiryLabel: null,
    straightToBan: true,
  },
] as const;

// ── SUSPEND time-box guard ────────────────────────────────────────────────────

/**
 * Validates that a SUSPEND action carries an expiresAt timestamp.
 * SUSPEND is always time-boxed — an open-ended suspension is a de-facto BAN.
 *
 * Throws ModerationValidationError if action is SUSPEND and expiresAt is absent.
 */
export function assertSuspendTimeBoxed(
  action: ModerationActionKind,
  expiresAt: Date | null | undefined
): void {
  if (action === "SUSPEND" && !expiresAt) {
    throw new ModerationValidationError(
      "SUSPEND requires expiresAt — suspensions are time-boxed"
    );
  }
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class ModerationValidationError extends Error {
  readonly code = "MODERATION_VALIDATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "ModerationValidationError";
  }
}
