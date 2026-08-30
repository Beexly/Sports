/**
 * Jarvis Decision Ledger
 *
 * createJarvisDecision  — write a JarvisDecision row, validate required fields,
 *                          rethrow DB failures as MemoryStoreUnavailableError.
 * listOpenDecisions     — list decisions with status "open".
 * createDecisionWithMemory — one $transaction that writes BOTH a ledger entry
 *                          and a linked "decision" candidate memory event.
 *
 * Non-negotiables:
 *  - Required fields are validated before any DB write.
 *  - All DB errors are rethrown as MemoryStoreUnavailableError.
 *  - The transaction is atomic: both rows land or neither does.
 *  - This file does NOT import actions.ts — the memory event is written
 *    inline inside the $transaction to avoid cross-module circular deps
 *    and to keep the transaction boundary clean.
 */

import { db } from "@sports/db";
import { MemoryStoreUnavailableError } from "./errors";

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateDecisionInput {
  readonly decision_title: string;
  readonly decision_summary: string;
  readonly decision_type: string;
  readonly rationale: string;
  readonly owner: string;
  readonly decision_date: Date;
  readonly evidence?: unknown;
  readonly alternatives_rejected?: unknown;
  readonly revisit_date?: Date;
  readonly source_refs?: unknown;
  /** If omitted the decision is created with status="open". */
  readonly status?: string;
}

export interface CreateDecisionWithMemoryInput extends CreateDecisionInput {
  /** Optional: override the memory title. Defaults to "Decision: <decision_title>" */
  readonly memory_title?: string;
  /** Optional: source_ref for the linked memory candidate. */
  readonly memory_source_ref?: string;
  /** Confidence 0–100 for the linked memory candidate. Defaults to 80. */
  readonly memory_confidence?: number;
  /** Tags for the linked memory. */
  readonly memory_tags?: string[];
  /** Scope for the linked memory. Defaults to "owner.decision". */
  readonly memory_scope?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateDecisionInput(input: CreateDecisionInput): void {
  const required = [
    "decision_title",
    "decision_summary",
    "decision_type",
    "rationale",
    "owner",
    "decision_date",
  ] as const;

  for (const field of required) {
    const value = input[field];
    if (value === undefined || value === null || value === "") {
      throw new Error(`createJarvisDecision: required field '${field}' is missing or empty.`);
    }
  }

  if (!(input.decision_date instanceof Date) || isNaN(input.decision_date.getTime())) {
    throw new Error("createJarvisDecision: 'decision_date' must be a valid Date.");
  }

}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Write a single JarvisDecision row. Validates required fields first.
 * Rethraws all DB errors as MemoryStoreUnavailableError.
 */
export async function createJarvisDecision(input: CreateDecisionInput) {
  validateDecisionInput(input);

  try {
    return await db.jarvisDecision.create({
      data: {
        decision_title: input.decision_title,
        decision_summary: input.decision_summary,
        decision_type: input.decision_type,
        rationale: input.rationale,
        owner: input.owner,
        decision_date: input.decision_date,
        evidence: input.evidence !== undefined ? (input.evidence as Parameters<typeof db.jarvisDecision.create>[0]["data"]["evidence"]) : undefined,
        alternatives_rejected: input.alternatives_rejected !== undefined ? (input.alternatives_rejected as Parameters<typeof db.jarvisDecision.create>[0]["data"]["alternatives_rejected"]) : undefined,
        revisit_date: input.revisit_date,
        source_refs: input.source_refs !== undefined ? (input.source_refs as Parameters<typeof db.jarvisDecision.create>[0]["data"]["source_refs"]) : undefined,
        status: input.status ?? "open",
      },
    });
  } catch (err) {
    throw new MemoryStoreUnavailableError(err);
  }
}

/**
 * List all decisions with status="open", ordered by decision_date desc.
 * Rethraws DB errors as MemoryStoreUnavailableError.
 */
export async function listOpenDecisions() {
  try {
    return await db.jarvisDecision.findMany({
      where: { status: "open" },
      orderBy: { decision_date: "desc" },
    });
  } catch (err) {
    throw new MemoryStoreUnavailableError(err);
  }
}

/**
 * Create BOTH a JarvisDecision ledger entry AND a linked "decision" candidate
 * memory event in one atomic $transaction. The memory event is created inline
 * (not via actions.ts) to keep the transaction boundary clean.
 *
 * Per spec: every major owner decision creates both a ledger entry and a linked
 * memory event. The memory event type is "decision", state is "candidate", and
 * it carries the decision's id as related_decision_id.
 */
export async function createDecisionWithMemory(input: CreateDecisionWithMemoryInput) {
  validateDecisionInput(input);

  try {
    return await db.$transaction(async (tx) => {
      // 1. Write the decision ledger entry
      const decision = await tx.jarvisDecision.create({
        data: {
          decision_title: input.decision_title,
          decision_summary: input.decision_summary,
          decision_type: input.decision_type,
          rationale: input.rationale,
          owner: input.owner,
          decision_date: input.decision_date,
          evidence: input.evidence !== undefined ? (input.evidence as Parameters<typeof db.jarvisDecision.create>[0]["data"]["evidence"]) : undefined,
          alternatives_rejected: input.alternatives_rejected !== undefined ? (input.alternatives_rejected as Parameters<typeof db.jarvisDecision.create>[0]["data"]["alternatives_rejected"]) : undefined,
          revisit_date: input.revisit_date,
          source_refs: input.source_refs !== undefined ? (input.source_refs as Parameters<typeof db.jarvisDecision.create>[0]["data"]["source_refs"]) : undefined,
          status: input.status ?? "open",
        },
      });

      // 2. Write the linked candidate memory event inline
      const memoryEvent = await tx.jarvisMemoryEvent.create({
        data: {
          memory_type: "decision",
          memory_state: "candidate",
          scope: input.memory_scope ?? "owner.decision",
          title: input.memory_title ?? `Decision: ${input.decision_title}`,
          summary: input.decision_summary,
          full_text: input.rationale,
          source_type: "owner_decision",
          source_ref: input.memory_source_ref,
          actor: input.owner,
          owner: input.owner,
          confidence: input.memory_confidence ?? 80,
          sensitivity: "normal",
          tags: input.memory_tags ?? ["decision", input.decision_type],
          owner_approval: false,
          // Link to the decision via the many-to-many relation inline
          related_decision_id: decision.id,
          decisions: { connect: { id: decision.id } },
        },
      });

      return { decision, memoryEvent };
    });
  } catch (err) {
    throw new MemoryStoreUnavailableError(err);
  }
}
