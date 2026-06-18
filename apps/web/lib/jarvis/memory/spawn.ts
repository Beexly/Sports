/**
 * Jarvis Memory — candidate spawning helper (Workstream J7, optional surface).
 *
 * A convenience an agent MAY call on task completion to record a lesson it
 * believes it learned. It deliberately does the bare minimum:
 *
 *   - Creates the memory in 'candidate' state ONLY. It can never auto-confirm,
 *     never auto-promote, and never reach a sensitive state on its own. The
 *     existing guards (assertCandidateOnly) enforce the candidate-only rule;
 *     owner sign-off via guards.assertConfirmationAllowed remains the only path
 *     to 'confirmed'.
 *   - Delegates the actual write to the audited createMemoryCandidate server
 *     action, which forces memory_state='candidate' and owner_approval=false.
 *
 * This helper is intentionally NOT wired into any automatic / scheduled / loop
 * path. It exists so agents can opt in explicitly; nothing calls it implicitly.
 */

"use server";

import { createMemoryCandidate, type CreateMemoryCandidateInput } from "./actions";
import { assertCandidateOnly } from "./guards";

/**
 * Spawn a memory candidate from a completed task. Always lands in 'candidate'
 * state pending owner review — never auto-confirmed, never sensitive-promoted.
 *
 * The candidate-only guard is asserted up front as a defensive double-check
 * (the write path also pins the state), making the no-auto-confirm invariant
 * explicit at this call site.
 */
export async function spawnMemoryCandidate(input: CreateMemoryCandidateInput) {
  // Defensive: assert the only state this helper may create. createMemoryCandidate
  // already hardcodes 'candidate', so this can never diverge — it documents intent.
  assertCandidateOnly("candidate");
  return createMemoryCandidate(input);
}
