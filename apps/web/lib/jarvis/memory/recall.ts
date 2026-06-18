/**
 * Jarvis Memory — read-only recall (Workstream J7).
 *
 * This is the "recall" half of the memory loop. The state machine, guards, and
 * mutating server actions live elsewhere (states.ts / guards.ts / actions.ts);
 * this module never mutates and never transitions. It answers a single question:
 * "what has Jarvis actually learned (and is allowed to act on)?"
 *
 * Hard guarantees (the recall contract):
 *   - Returns ONLY 'confirmed' + 'repeated_pattern' memories. Candidate,
 *     rejected, conflicted, stale, superseded, and expired are never recalled.
 *   - Excludes anything whose expires_at is in the past (point-in-time check).
 *   - Pure query + mapping. No writes, no transitions, no side effects.
 *   - Honest degradation: any DB failure (or store not wired) resolves to an
 *     empty array. It never throws and never fabricates a lesson.
 *
 * Sensitivity note: a memory only reaches 'confirmed' after passing
 * guards.assertConfirmationAllowed (sensitive types/levels require owner
 * sign-off). Because recall is gated to confirmed/repeated_pattern, owner
 * gating on the write side transitively protects the read side.
 */

import { db } from "@sports/db";
import type { Prisma } from "@prisma/client";

/** States that are safe to recall and surface as a "learned" fact. */
export const RECALLABLE_STATES = ["confirmed", "repeated_pattern"] as const;

/** Upper bound on rows returned by a single recall — prevents unbounded scans. */
const MAX_RECALL_LESSONS = 12;

/** Optional narrowing for a recall query. Omitting all fields recalls broadly. */
export interface RecallLessonsFilter {
  /** Restrict to a single memory scope (e.g. "picks.gate", "model.routing"). */
  readonly scope?: string;
  /** Restrict to memories tagged with at least one of these tags. */
  readonly tags?: readonly string[];
  /** Cap the number of lessons returned (defaults to MAX_RECALL_LESSONS). */
  readonly limit?: number;
}

/**
 * A compact, display-ready projection of a recalled memory. Intentionally a
 * narrow slice — recall surfaces "what we learned", not the full record.
 */
export interface RecalledLesson {
  readonly id: string;
  readonly memoryType: string;
  readonly memoryState: "confirmed" | "repeated_pattern";
  readonly scope: string;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly sensitivity: string;
  /** When the memory became confirmed, or its creation time as a fallback. */
  readonly learnedAt: Date;
  readonly tags: readonly string[];
}

/**
 * Recall the confirmed lessons Jarvis is allowed to act on, most recent first.
 *
 * Read-only and never-throw: returns an honest empty array when the store is
 * unwired, unreachable, or simply has no qualifying memories. Filtering to
 * RECALLABLE_STATES and excluding expired rows happens in the query, so a
 * caller can trust every returned row is a live, confirmed lesson.
 */
export async function recallConfirmedLessons(
  filter: RecallLessonsFilter = {}
): Promise<readonly RecalledLesson[]> {
  const take = clampLimit(filter.limit);
  try {
    const now = new Date();
    const where: Prisma.JarvisMemoryEventWhereInput = {
      memory_state: { in: [...RECALLABLE_STATES] },
      // Exclude expired: either no expiry set, or it is still in the future.
      OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    };
    if (filter.scope) {
      where.scope = filter.scope;
    }
    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: [...filter.tags] };
    }

    const rows = await db.jarvisMemoryEvent.findMany({
      where,
      // Recency first; confirmed_at is the truest "when we learned it" signal,
      // with created_at as the tiebreaker for repeated_pattern rows that may
      // not carry a confirmed_at.
      orderBy: [{ confirmed_at: "desc" }, { created_at: "desc" }],
      take,
    });

    return rows.map(toRecalledLesson);
  } catch {
    // Store unwired / unreachable / not migrated — degrade to honest empty.
    return [];
  }
}

/** Clamp a caller-supplied limit into the safe [1, MAX_RECALL_LESSONS] range. */
function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return MAX_RECALL_LESSONS;
  }
  return Math.min(Math.floor(limit), MAX_RECALL_LESSONS);
}

/**
 * Map a raw memory row to the compact RecalledLesson projection. Defensive: a
 * row that somehow lacks a confirmed_at falls back to created_at so learnedAt
 * is always a real Date, never null.
 */
function toRecalledLesson(row: {
  id: string;
  memory_type: string;
  memory_state: string;
  scope: string;
  title: string;
  summary: string;
  confidence: number;
  sensitivity: string;
  confirmed_at: Date | null;
  created_at: Date;
  tags: string[];
}): RecalledLesson {
  return {
    id: row.id,
    memoryType: row.memory_type,
    // The query restricts state to RECALLABLE_STATES, so this narrowing is safe.
    memoryState: row.memory_state as "confirmed" | "repeated_pattern",
    scope: row.scope,
    title: row.title,
    summary: row.summary,
    confidence: row.confidence,
    sensitivity: row.sensitivity,
    learnedAt: row.confirmed_at ?? row.created_at,
    tags: row.tags,
  };
}
