/**
 * Jarvis Memory Server Actions
 *
 * All mutations go through:
 *   1. canTransition() — state machine enforcement
 *   2. assertConfirmationAllowed() — sensitivity guard
 *   3. DB write in transaction
 *
 * All DB errors are caught and rethrown as MemoryStoreUnavailableError.
 *
 * Non-negotiables:
 *   - No silent candidate promotion
 *   - No overwrite without supersession trail
 *   - Conflicts are surfaced, never buried
 *   - Sensitive memory requires ownerApproval before confirmed
 */

"use server";

import { db } from "@sports/db";
import type { Prisma } from "@sports/db";
import { canTransition } from "./states";
import { assertConfirmationAllowed } from "./guards";
import {
  MemoryStoreUnavailableError,
  MemoryTransitionError,
  MemoryGuardError,
} from "./errors";

// ── Type helpers ──────────────────────────────────────────────────────────────

function wrapDbError(err: unknown): never {
  throw new MemoryStoreUnavailableError(err);
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateMemoryCandidateInput {
  memory_type: string;
  scope: string;
  title: string;
  summary: string;
  full_text?: string;
  source_type: string;
  source_ref?: string;
  source_timestamp?: Date;
  actor: string;
  owner: string;
  confidence: number;
  sensitivity?: string;
  tags?: string[];
  related_decision_id?: string;
  related_agent_id?: string;
  expires_at?: Date;
  embedding_ref?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Create a new memory candidate. AI actors may only create candidates.
 * The state is always 'candidate' — guards enforce this.
 */
export async function createMemoryCandidate(input: CreateMemoryCandidateInput) {
  try {
    const record = await db.jarvisMemoryEvent.create({
      data: {
        memory_type: input.memory_type as Parameters<typeof db.jarvisMemoryEvent.create>[0]["data"]["memory_type"],
        memory_state: "candidate",
        scope: input.scope,
        title: input.title,
        summary: input.summary,
        full_text: input.full_text,
        source_type: input.source_type,
        source_ref: input.source_ref,
        source_timestamp: input.source_timestamp,
        actor: input.actor,
        owner: input.owner,
        confidence: input.confidence,
        sensitivity: input.sensitivity ?? "normal",
        tags: input.tags ?? [],
        related_decision_id: input.related_decision_id,
        related_agent_id: input.related_agent_id,
        expires_at: input.expires_at,
        embedding_ref: input.embedding_ref,
        metadata: input.metadata,
        owner_approval: false,
      },
    });
    return record;
  } catch (err) {
    wrapDbError(err);
  }
}

// ── Transitions ───────────────────────────────────────────────────────────────

/**
 * Confirm a candidate memory. Requires ownerApproval for sensitive types.
 */
export async function confirmMemory(id: string, ownerApproval: boolean = false) {
  try {
    const existing = await db.jarvisMemoryEvent.findUniqueOrThrow({ where: { id } });

    if (!canTransition(existing.memory_state as Parameters<typeof canTransition>[0], "confirmed")) {
      throw new MemoryTransitionError(existing.memory_state, "confirmed");
    }

    // Run sensitivity guard
    assertConfirmationAllowed(
      {
        memory_type: existing.memory_type,
        sensitivity: existing.sensitivity,
        owner_approval: ownerApproval || existing.owner_approval,
      },
      "confirmed"
    );

    return await db.jarvisMemoryEvent.update({
      where: { id },
      data: {
        memory_state: "confirmed",
        owner_approval: ownerApproval || existing.owner_approval,
        confirmed_at: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof MemoryTransitionError || err instanceof MemoryGuardError) throw err;
    wrapDbError(err);
  }
}

export async function rejectMemory(id: string) {
  try {
    const existing = await db.jarvisMemoryEvent.findUniqueOrThrow({ where: { id } });

    if (!canTransition(existing.memory_state as Parameters<typeof canTransition>[0], "rejected")) {
      throw new MemoryTransitionError(existing.memory_state, "rejected");
    }

    return await db.jarvisMemoryEvent.update({
      where: { id },
      data: { memory_state: "rejected", rejected_at: new Date() },
    });
  } catch (err) {
    if (err instanceof MemoryTransitionError) throw err;
    wrapDbError(err);
  }
}

export async function expireMemory(id: string) {
  try {
    const existing = await db.jarvisMemoryEvent.findUniqueOrThrow({ where: { id } });

    if (!canTransition(existing.memory_state as Parameters<typeof canTransition>[0], "expired")) {
      throw new MemoryTransitionError(existing.memory_state, "expired");
    }

    return await db.jarvisMemoryEvent.update({
      where: { id },
      data: { memory_state: "expired" },
    });
  } catch (err) {
    if (err instanceof MemoryTransitionError) throw err;
    wrapDbError(err);
  }
}

/**
 * Supersede a memory: creates a new memory (superseding) and marks the old one superseded.
 * Both happen in a single transaction — no orphaned supersession trail.
 */
export async function supersedeMemory(
  supersededId: string,
  newMemoryInput: CreateMemoryCandidateInput & { owner_approval?: boolean }
) {
  try {
    return await db.$transaction(async (tx) => {
      const old = await tx.jarvisMemoryEvent.findUniqueOrThrow({ where: { id: supersededId } });

      if (!canTransition(old.memory_state as Parameters<typeof canTransition>[0], "superseded")) {
        throw new MemoryTransitionError(old.memory_state, "superseded");
      }

      const newMemory = await tx.jarvisMemoryEvent.create({
        data: {
          memory_type: newMemoryInput.memory_type as Parameters<typeof db.jarvisMemoryEvent.create>[0]["data"]["memory_type"],
          memory_state: "candidate",
          scope: newMemoryInput.scope,
          title: newMemoryInput.title,
          summary: newMemoryInput.summary,
          full_text: newMemoryInput.full_text,
          source_type: newMemoryInput.source_type,
          source_ref: newMemoryInput.source_ref,
          source_timestamp: newMemoryInput.source_timestamp,
          actor: newMemoryInput.actor,
          owner: newMemoryInput.owner,
          confidence: newMemoryInput.confidence,
          sensitivity: newMemoryInput.sensitivity ?? "normal",
          tags: newMemoryInput.tags ?? [],
          supersedes_memory_id: supersededId,
          expires_at: newMemoryInput.expires_at,
          embedding_ref: newMemoryInput.embedding_ref,
          metadata: newMemoryInput.metadata,
          owner_approval: newMemoryInput.owner_approval ?? false,
        },
      });

      const updated = await tx.jarvisMemoryEvent.updateMany({
        where: { id: supersededId, memory_state: old.memory_state },
        data: { memory_state: "superseded" },
      });

      if (updated.count === 0) {
        throw new MemoryTransitionError(old.memory_state, "superseded");
      }

      return { newMemory, supersededId };
    });
  } catch (err) {
    if (err instanceof MemoryTransitionError) throw err;
    wrapDbError(err);
  }
}

// ── Recall ────────────────────────────────────────────────────────────────────

export interface RecallFilter {
  scope?: string;
  tags?: string[];
}

/**
 * Recall relevant memory: confirmed + repeated_pattern only.
 * Also returns unresolved conflicts flagged separately.
 */
export async function recallRelevantMemory(filter: RecallFilter) {
  try {
    const where: Prisma.JarvisMemoryEventWhereInput = {
      memory_state: { in: ["confirmed", "repeated_pattern"] },
    };

    if (filter.scope) {
      where.scope = filter.scope;
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }

    const memories = await db.jarvisMemoryEvent.findMany({
      where,
      orderBy: { confirmed_at: "desc" },
    });

    const conflicts = await db.jarvisMemoryEvent.findMany({
      where: {
        memory_state: "conflicted",
        ...(filter.scope ? { scope: filter.scope } : {}),
      },
      orderBy: { created_at: "desc" },
    });

    return { memories, unresolvedConflicts: conflicts };
  } catch (err) {
    wrapDbError(err);
  }
}

// ── List queries ──────────────────────────────────────────────────────────────

export async function listMemoryByState(state: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await db.jarvisMemoryEvent.findMany({
      where: { memory_state: state as Prisma.EnumMemoryStateFilter["equals"] },
      orderBy: { created_at: "desc" },
    });
  } catch (err) {
    wrapDbError(err);
  }
}

export async function listMemoryConflicts() {
  try {
    return await db.jarvisMemoryEvent.findMany({
      where: { memory_state: "conflicted" },
      orderBy: { created_at: "desc" },
    });
  } catch (err) {
    wrapDbError(err);
  }
}

// ── Link ──────────────────────────────────────────────────────────────────────

export async function linkMemoryToDecision(memoryId: string, decisionId: string) {
  try {
    return await db.jarvisMemoryEvent.update({
      where: { id: memoryId },
      data: {
        related_decision_id: decisionId,
        decisions: { connect: { id: decisionId } },
      },
    });
  } catch (err) {
    wrapDbError(err);
  }
}
