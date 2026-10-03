/**
 * Conservative conflict detection for Jarvis memory.
 *
 * Non-negotiables from the spec:
 *   - A new memory contradicting a confirmed one must NOT overwrite silently.
 *   - Conflicts are surfaced, never buried.
 *   - This detector is conservative: only flags when scope matches AND
 *     explicit supersedes/contradicts markers are present.
 *   - Never auto-resolves: returns the pair for owner review.
 */

export interface MemoryForConflict {
  readonly id: string;
  readonly scope: string;
  readonly summary: string;
  readonly memory_state: string;
  /** Optional: explicit reference to a memory this supersedes/contradicts */
  readonly supersedes_memory_id?: string | null;
  /** Optional: metadata may carry a "contradicts" key */
  readonly metadata?: Record<string, unknown> | null;
}

export interface ConflictPair {
  readonly newMemory: MemoryForConflict;
  readonly existingMemory: MemoryForConflict;
  readonly reason: string;
}

/**
 * Detect conflicts between a new memory candidate and existing confirmed memories.
 *
 * Conservative rules:
 *   1. Scope must match exactly.
 *   2. ONLY flags when the new memory explicitly names a supersedes_memory_id
 *      that matches an existing confirmed memory's id, OR when metadata.contradicts
 *      references an existing memory id.
 *
 * Does NOT infer contradiction from text similarity — that would produce false positives
 * and risk burying legitimate new memories. Text-based conflict detection requires
 * owner review of flagged pairs, not automated resolution.
 *
 * Returns all conflict pairs found. Empty array = no conflicts detected.
 */
export function detectConflict(
  newMemory: MemoryForConflict,
  existing: MemoryForConflict[]
): ConflictPair[] {
  const confirmed = existing.filter(
    (m) => m.memory_state === "confirmed" || m.memory_state === "repeated_pattern"
  );

  const conflicts: ConflictPair[] = [];

  for (const existingMemory of confirmed) {
    // Scope must match
    if (existingMemory.scope !== newMemory.scope) continue;

    // Rule 1: explicit supersedes reference
    if (
      newMemory.supersedes_memory_id &&
      newMemory.supersedes_memory_id === existingMemory.id
    ) {
      conflicts.push({
        newMemory,
        existingMemory,
        reason: `New memory explicitly supersedes confirmed memory ${existingMemory.id} in scope "${newMemory.scope}"`,
      });
      continue;
    }

    // Rule 2: explicit contradicts reference in metadata
    const contradicts = newMemory.metadata?.["contradicts"];
    if (
      contradicts &&
      (contradicts === existingMemory.id ||
        (Array.isArray(contradicts) && (contradicts as string[]).includes(existingMemory.id)))
    ) {
      conflicts.push({
        newMemory,
        existingMemory,
        reason: `New memory explicitly contradicts confirmed memory ${existingMemory.id} in scope "${newMemory.scope}"`,
      });
    }
  }

  return conflicts;
}
