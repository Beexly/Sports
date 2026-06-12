/**
 * Jarvis Action Queue — proposed actions with a hard approval boundary.
 *
 * Pure functions over ActionItem. No I/O, no execution: this module models
 * the lifecycle (PROPOSED → … → SCRIBED) and enforces the invariant that
 * NO external write action executes without approval.
 *
 * Invariants:
 *   - Only READ_ONLY_CHECK can ever execute without approval.
 *   - State transitions follow the lifecycle map; invalid jumps are rejected.
 *   - Every action carries a rollback plan before it is valid.
 */

export type ActionType =
  | "READ_ONLY_CHECK"
  | "DESIGN_PROPOSAL"
  | "CODE_CHANGE_PROPOSAL"
  | "DOC_UPDATE_PROPOSAL"
  | "TEST_RUN"
  | "DEPLOYMENT_PROPOSAL"
  | "EMAIL_DRAFT"
  | "CALENDAR_DRAFT"
  | "GITHUB_PR_REVIEW"
  | "AIRWAVE_REVIEW"
  | "GSE_DATA_CHECK"
  | "GSN_STUDIO_BRIEF";

export type ActionState =
  | "PROPOSED"
  | "NEEDS_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SCRIBED";

export interface ActionItem {
  readonly id: string;
  readonly type: ActionType;
  readonly title: string;
  readonly reason: string;
  readonly risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly expectedOutput: string;
  readonly affectedFiles: readonly string[];
  readonly toolsRequired: readonly string[];
  readonly approvalRequired: boolean;
  readonly rollbackPlan: string;
  readonly scribeEntryRequired: boolean;
  readonly state: ActionState;
  readonly proposedAt: string;
  readonly proposedBy: string;
}

// ─── Creation ─────────────────────────────────────────────────────────────────

// Creates a PROPOSED action item with a deterministic id. Caller provides proposedAt.
export function createActionItem(
  fields: Omit<ActionItem, "id" | "state" | "proposedAt"> & { proposedAt: string }
): ActionItem {
  const stamp = fields.proposedAt.replace(/[:.TZ-]/g, "");
  const safeBy = fields.proposedBy.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    ...fields,
    id: `action-${fields.type.toLowerCase()}-${safeBy}-${stamp}`,
    state: "PROPOSED",
    // Hard rule: anything that is not a read-only check requires approval.
    approvalRequired: fields.type === "READ_ONLY_CHECK" ? fields.approvalRequired : true,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

// Validates required fields and the approval invariant. Returns all errors.
export function validateActionItem(item: ActionItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.id || item.id.trim() === "") errors.push("id is required");
  if (!item.title || item.title.trim() === "") errors.push("title is required");
  if (!item.reason || item.reason.trim() === "") errors.push("reason is required");
  if (!item.expectedOutput || item.expectedOutput.trim() === "") {
    errors.push("expectedOutput is required");
  }
  if (!item.rollbackPlan || item.rollbackPlan.trim() === "") {
    errors.push("rollbackPlan is required");
  }
  if (!item.proposedBy || item.proposedBy.trim() === "") {
    errors.push("proposedBy is required");
  }
  if (!item.proposedAt || item.proposedAt.trim() === "") {
    errors.push("proposedAt is required");
  }
  if (item.type !== "READ_ONLY_CHECK" && !item.approvalRequired) {
    errors.push("approvalRequired must be true for every non-read-only action");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Approval boundary ────────────────────────────────────────────────────────

// True ONLY for read-only checks with no approval flag. Writes always return false.
export function canExecuteWithoutApproval(item: ActionItem): boolean {
  return item.type === "READ_ONLY_CHECK" && !item.approvalRequired;
}

// Everything except an unflagged READ_ONLY_CHECK requires owner approval.
export function requiresApproval(item: ActionItem): boolean {
  return !canExecuteWithoutApproval(item);
}

// ─── State machine ────────────────────────────────────────────────────────────

const TRANSITIONS: Readonly<Record<ActionState, readonly ActionState[]>> = {
  PROPOSED: ["NEEDS_APPROVAL", "RUNNING", "REJECTED"],
  NEEDS_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["RUNNING"],
  RUNNING: ["COMPLETED", "FAILED"],
  COMPLETED: ["SCRIBED"],
  FAILED: ["SCRIBED"],
  REJECTED: ["SCRIBED"],
  SCRIBED: [],
};

// Transitions an action to a new state, rejecting invalid jumps and unapproved runs.
export function transitionActionState(
  item: ActionItem,
  newState: ActionState
): { success: boolean; error?: string; item: ActionItem } {
  const allowed = TRANSITIONS[item.state];
  if (!allowed.includes(newState)) {
    return {
      success: false,
      error: `Invalid transition: ${item.state} → ${newState}. Allowed: ${allowed.join(", ") || "none"}.`,
      item,
    };
  }

  // PROPOSED → RUNNING is only legal for actions that need no approval.
  if (item.state === "PROPOSED" && newState === "RUNNING" && requiresApproval(item)) {
    return {
      success: false,
      error:
        "Cannot run from PROPOSED: this action requires approval. " +
        "Transition to NEEDS_APPROVAL and obtain owner sign-off first.",
      item,
    };
  }

  return { success: true, item: { ...item, state: newState } };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface ActionQueueSummary {
  readonly proposed: number;
  readonly needsApproval: number;
  readonly approved: number;
  readonly running: number;
  readonly completed: number;
  readonly failed: number;
}

// Counts queue items by state for cockpit display.
export function buildActionQueueSummary(
  items: readonly ActionItem[]
): ActionQueueSummary {
  const count = (state: ActionState): number =>
    items.filter((i) => i.state === state).length;
  return {
    proposed: count("PROPOSED"),
    needsApproval: count("NEEDS_APPROVAL"),
    approved: count("APPROVED"),
    running: count("RUNNING"),
    completed: count("COMPLETED"),
    failed: count("FAILED"),
  };
}
