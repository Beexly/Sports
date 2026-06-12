/**
 * Sensitivity guards for Jarvis memory.
 *
 * Non-negotiables from the spec:
 *   - memory_type public_claim_rule or sensitivity 'high'/'legal'/'hr'/'spend'
 *     can NEVER reach 'confirmed' without ownerApproval=true.
 *   - 'candidate' is the only state creatable by AI actors.
 *   - These are hard gates, not soft warnings.
 */

import type { MemoryState } from "./states";
import { MemoryGuardError } from "./errors";

/** Sensitivity levels that require owner approval before confirmation. */
export const SENSITIVE_SENSITIVITY_LEVELS = new Set([
  "high",
  "legal",
  "hr",
  "spend",
]);

/** Memory types that require owner approval before confirmation. */
export const APPROVAL_REQUIRED_TYPES = new Set([
  "public_claim_rule",
]);

export interface MemoryForGuard {
  readonly memory_type: string;
  readonly sensitivity: string;
  readonly owner_approval: boolean;
}

/**
 * Returns true if this memory requires owner approval before reaching 'confirmed'.
 */
export function requiresOwnerApproval(memory: MemoryForGuard): boolean {
  return (
    APPROVAL_REQUIRED_TYPES.has(memory.memory_type) ||
    SENSITIVE_SENSITIVITY_LEVELS.has(memory.sensitivity)
  );
}

/**
 * Guard: throws if a sensitive memory is being promoted to 'confirmed' without owner approval.
 *
 * Call this before any transition to 'confirmed'.
 */
export function assertConfirmationAllowed(
  memory: MemoryForGuard,
  targetState: MemoryState
): void {
  if (targetState !== "confirmed") return;

  if (requiresOwnerApproval(memory) && !memory.owner_approval) {
    throw new MemoryGuardError(
      `Sensitive memory (type=${memory.memory_type}, sensitivity=${memory.sensitivity}) ` +
        `cannot reach 'confirmed' without owner_approval=true. ` +
        `Set owner_approval before confirming.`
    );
  }
}

/**
 * Guard: throws if an actor is attempting to create a memory in any state other than 'candidate'.
 *
 * 'candidate' is the only state an AI actor may write. All promotions require
 * explicit owner or system action via the state machine.
 */
export function assertCandidateOnly(targetState: MemoryState): void {
  if (targetState !== "candidate") {
    throw new MemoryGuardError(
      `AI actors may only create memory in 'candidate' state. ` +
        `Attempted state: '${targetState}'.`
    );
  }
}
