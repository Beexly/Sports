/**
 * Decision action → CockpitTask transition mapping.
 *
 * The Daily Command exposes four owner actions on a transitionable task.
 * Each maps to a single status move that `transitionTask()` validates against
 * its allow-list. Shared by the loader (to compute which buttons are enabled)
 * and the /decide endpoint (to perform the move) so the two never drift.
 *
 *   APPROVE  → APPROVED   (only legal from NEEDS_REVIEW)
 *   EDIT     → DRAFTED    (send back for revision; legal from NEEDS_REVIEW)
 *   REJECT   → REJECTED   (note required; legal from NEEDS_REVIEW)
 *   ESCALATE → BLOCKED    (note required; legal from any pre-terminal state)
 *
 * APPROVED is reachable ONLY through APPROVE here, and only via the human
 * decide endpoint — never autonomously.
 */

import type { CockpitTaskStatus } from "@prisma/client";
import { allowedTransitionsFrom } from "@/lib/cockpit/transitions";
import type { CardAction } from "./types";

export type DecisionAction = "APPROVE" | "EDIT" | "REJECT" | "ESCALATE";

export const DECISION_ACTIONS: readonly DecisionAction[] = [
  "APPROVE",
  "EDIT",
  "REJECT",
  "ESCALATE",
];

interface DecisionActionSpec {
  readonly action: DecisionAction;
  readonly label: string;
  readonly targetStatus: CockpitTaskStatus;
  readonly requiresNote: boolean;
}

export const DECISION_ACTION_SPECS: Readonly<Record<DecisionAction, DecisionActionSpec>> = {
  APPROVE: { action: "APPROVE", label: "Approve", targetStatus: "APPROVED", requiresNote: false },
  EDIT: { action: "EDIT", label: "Edit", targetStatus: "DRAFTED", requiresNote: false },
  REJECT: { action: "REJECT", label: "Reject", targetStatus: "REJECTED", requiresNote: true },
  ESCALATE: { action: "ESCALATE", label: "Escalate", targetStatus: "BLOCKED", requiresNote: true },
};

/** Type guard: is `value` one of the four owner decision verbs? */
export function isDecisionAction(value: unknown): value is DecisionAction {
  return typeof value === "string" && (DECISION_ACTIONS as readonly string[]).includes(value);
}

/** The CockpitTaskStatus an action moves a task to. */
export function targetStatusFor(action: DecisionAction): CockpitTaskStatus {
  return DECISION_ACTION_SPECS[action].targetStatus;
}

/** Whether an action demands an operator note (REJECT/ESCALATE do). */
export function actionRequiresNote(action: DecisionAction): boolean {
  return DECISION_ACTION_SPECS[action].requiresNote;
}

/**
 * Build the four owner action buttons for a task at `status`, each marked
 * enabled iff its target status is in the allow-list. Shared by the Daily
 * Command loader and the task detail page so they never drift.
 */
export function buildDecisionActions(status: CockpitTaskStatus): readonly CardAction[] {
  const allowed = allowedTransitionsFrom(status);
  return DECISION_ACTIONS.map((action) => {
    const spec = DECISION_ACTION_SPECS[action];
    return {
      action,
      label: spec.label,
      targetStatus: spec.targetStatus,
      enabled: allowed.includes(spec.targetStatus),
      requiresNote: spec.requiresNote,
    };
  });
}
