/**
 * Operator Cockpit — Task Status Transition Service
 *
 * Single source of truth for which status moves are permitted. The Prisma
 * schema accepts any CockpitTaskStatus value, so the safety guarantee here
 * is enforced at the service layer — every status change goes through
 * `transitionTask()`, which:
 *
 *   1. Verifies the proposed transition is in the allow-list.
 *   2. Refuses the change with a descriptive error if it is not.
 *   3. Appends an immutable CockpitDecision row alongside the update.
 *
 * The transition map below is intentionally conservative. Adding a new
 * transition requires editing this file (and adding a test).
 *
 * No transition implies any external action. Cockpit task status is a
 * record of internal decisions only.
 */

import { Prisma } from "@prisma/client";
import type {
  CockpitTaskStatus,
  CockpitDecision,
  CockpitTask,
  PrismaClient,
} from "@prisma/client";

// ─────────────────────────────────────────────
// Allow-list of state transitions
// ─────────────────────────────────────────────

const TRANSITIONS: Readonly<Record<CockpitTaskStatus, readonly CockpitTaskStatus[]>> = {
  NEW: ["ROUTED", "BLOCKED", "ARCHIVED"],
  ROUTED: ["DRAFTED", "BLOCKED", "ARCHIVED"],
  DRAFTED: ["NEEDS_REVIEW", "ROUTED", "BLOCKED", "ARCHIVED"],
  NEEDS_REVIEW: ["APPROVED", "REJECTED", "DRAFTED", "BLOCKED"],
  APPROVED: ["ARCHIVED"],
  REJECTED: ["ROUTED", "ARCHIVED"],
  BLOCKED: ["ROUTED", "ARCHIVED"],
  ARCHIVED: [],
};

export function isAllowedTransition(
  from: CockpitTaskStatus,
  to: CockpitTaskStatus
): boolean {
  if (from === to) return false; // never a transition; explicit refusal
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(
  from: CockpitTaskStatus
): readonly CockpitTaskStatus[] {
  return TRANSITIONS[from];
}

// ─────────────────────────────────────────────
// Refusal type
// ─────────────────────────────────────────────

export class CockpitTransitionRefused extends Error {
  readonly from: CockpitTaskStatus;
  readonly to: CockpitTaskStatus;
  readonly taskId: string;
  constructor(taskId: string, from: CockpitTaskStatus, to: CockpitTaskStatus) {
    super(
      `Cockpit transition refused: task ${taskId} cannot move from ${from} to ${to}. ` +
        `Allowed targets: ${TRANSITIONS[from].join(", ") || "(none — terminal state)"}.`
    );
    this.name = "CockpitTransitionRefused";
    this.from = from;
    this.to = to;
    this.taskId = taskId;
  }
}

// ─────────────────────────────────────────────
// transitionTask — the only safe way to change task status
// ─────────────────────────────────────────────

export interface TransitionInput {
  readonly taskId: string;
  readonly toStatus: CockpitTaskStatus;
  /** Free-text reviewer id. "manual:<name>", "system", "seed", "agent:<key>". */
  readonly reviewer: string;
  readonly note?: string;
  readonly evidence?: Prisma.InputJsonValue;
}

export interface TransitionResult {
  readonly task: CockpitTask;
  readonly decision: CockpitDecision;
}

/**
 * Apply a state transition and write the matching decision row in a single
 * transaction. Throws CockpitTransitionRefused if the move is not allowed.
 */
export async function transitionTask(
  db: PrismaClient,
  input: TransitionInput
): Promise<TransitionResult> {
  return db.$transaction(async (tx) => {
    const task = await tx.cockpitTask.findUnique({ where: { id: input.taskId } });
    if (!task) {
      throw new Error(`Cockpit task ${input.taskId} not found`);
    }

    if (!isAllowedTransition(task.status, input.toStatus)) {
      throw new CockpitTransitionRefused(task.id, task.status, input.toStatus);
    }

    const updated = await tx.cockpitTask.update({
      where: { id: task.id },
      data: {
        status: input.toStatus,
        decisionNotes: input.note ?? task.decisionNotes,
      },
    });

    const decision = await tx.cockpitDecision.create({
      data: {
        taskId: task.id,
        toStatus: input.toStatus,
        reviewer: input.reviewer,
        note: input.note ?? null,
        evidence: input.evidence ?? Prisma.JsonNull,
      },
    });

    return { task: updated, decision };
  });
}
