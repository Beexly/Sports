/**
 * Jarvis Memory — Gated Write Path
 *
 * The JarvisMemoryEvent model, state machine (./states.ts), sensitivity
 * guards (./guards.ts), and manual admin actions (./actions.ts) all exist in
 * code today. What has never existed is an autonomous entry point a running
 * process can call to record a memory event on its own — nothing in
 * production currently calls createMemoryCandidate(). That is the literal
 * basis for the "Jarvis has no persistent memory" / "memory is not
 * activated" honesty claim elsewhere in this codebase (see
 * intelligence-state.ts buildMemoryStatus() and
 * docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md).
 *
 * recordMemoryEvent() is that entry point. It is INERT BY DEFAULT — this
 * mirrors packages/ingestion-pipeline/src/line-archive.ts's
 * captureLineSnapshotsIfEnabled gate exactly:
 *   - env-gated: no-ops unless JARVIS_MEMORY_WRITE_ENABLED === "true"
 *   - zero DB interaction when off (`db` is never touched)
 *   - failure-isolated: any DB error is caught and returned as `{ error }`,
 *     never thrown, so a caller can never be blocked or crashed by this path
 *   - the founder flips the flag on when ready; until then this file being
 *     present does NOT make the "not activated" claim false, because no
 *     writes occur and (as of this writing) nothing calls this function from
 *     a production trigger yet either.
 *
 * `db` is accepted as `unknown` at the public boundary and cast internally to
 * `MemoryEventDb`, a small hand-written surface — not the generated Prisma
 * delegate type — purely so tests can pass a plain `vi.fn()`-based mock
 * without fighting `@sports/db` module-mock hoisting (see
 * packages/ingestion-pipeline/src/__tests__/line-archive.test.ts for the
 * established pattern this follows). Any object with this shape works: the
 * real `db` from "@sports/db", or a test double.
 *
 * All writes land in memory_state="candidate" — per ./guards.ts,
 * 'candidate' is the only state an AI/automated actor may create. Promotion
 * to 'confirmed' still requires the owner via ./actions.ts#confirmMemory.
 */

import type { MemoryType } from "@sports/db";
import { assertCandidateOnly } from "./guards";

// ─── Env gate ───────────────────────────────────────────────────────────────

/** True iff JARVIS_MEMORY_WRITE_ENABLED === "true". Default OFF — founder flips it. */
export function isMemoryWriteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["JARVIS_MEMORY_WRITE_ENABLED"] === "true";
}

/** Discrete posture for the write path — never a bare boolean, so callers
 *  can render/report it without re-deriving the meaning. */
export type MemoryWritePathStatus = "WIRED_GATED_OFF" | "WIRED_ACTIVE";

/** Reports the write path's activation posture. No I/O — reads env only. */
export function getMemoryWritePathStatus(
  env: NodeJS.ProcessEnv = process.env
): MemoryWritePathStatus {
  return isMemoryWriteEnabled(env) ? "WIRED_ACTIVE" : "WIRED_GATED_OFF";
}

/** Human-readable truth string for the write path. Never overstates activation. */
export function getMemoryWritePathTruth(env: NodeJS.ProcessEnv = process.env): string {
  return isMemoryWriteEnabled(env)
    ? "Jarvis memory write path is ACTIVE (JARVIS_MEMORY_WRITE_ENABLED=true). " +
        "recordMemoryEvent() persists candidate JarvisMemoryEvent rows; owner " +
        "confirmation is still required before anything is recalled as fact."
    : "Jarvis memory write path is wired in code (recordMemoryEvent()) but gated " +
        'OFF by default. JARVIS_MEMORY_WRITE_ENABLED is not "true", so it makes ' +
        "zero DB writes.";
}

// ─── Minimal db surface (mockable boundary) ──────────────────────────────────

interface StoredMemoryEventRef {
  id: string;
}

/** Minimal Prisma-delegate-shaped surface this module depends on. */
export interface MemoryEventDb {
  jarvisMemoryEvent: {
    findFirst(args: { where: Record<string, unknown> }): Promise<StoredMemoryEventRef | null>;
    create(args: { data: Record<string, unknown> }): Promise<StoredMemoryEventRef>;
  };
}

// ─── Input / result shapes ────────────────────────────────────────────────────

export interface RecordMemoryEventInput {
  readonly memory_type: MemoryType;
  readonly scope: string;
  readonly title: string;
  readonly summary: string;
  readonly source_type: string;
  readonly actor: string;
  readonly owner: string;
  /** 0-100, matches the JarvisMemoryEvent.confidence column comment. */
  readonly confidence: number;
  readonly full_text?: string;
  readonly source_ref?: string;
  readonly sensitivity?: string;
  readonly tags?: readonly string[];
  readonly related_decision_id?: string;
  readonly related_agent_id?: string;
  readonly metadata?: Record<string, unknown>;
  /**
   * Optional application-layer idempotency key. The JarvisMemoryEvent model
   * (packages/db/prisma/schema.prisma) has no dedicated unique/idempotency
   * column, so this is NOT a DB constraint — it is enforced here via a
   * `findFirst` lookup (keyed on `metadata.idempotencyKey`) before insert.
   * Callers that may fire more than once for the same logical event (e.g. a
   * retried job) should pass a stable key; callers that are naturally
   * one-shot can omit it.
   */
  readonly idempotencyKey?: string;
}

export interface RecordMemoryEventArgs extends RecordMemoryEventInput {
  /** Prisma-like db handle — see the module doc comment for why this is
   *  `unknown` rather than `MemoryEventDb` at the public boundary. */
  readonly db: unknown;
}

export interface RecordMemoryEventResult {
  readonly enabled: boolean;
  readonly recorded: boolean;
  /** True when an existing event matched `idempotencyKey` and no new row
   *  was created. `id` is the existing row's id in that case. */
  readonly deduped?: boolean;
  readonly id?: string;
  readonly error?: string;
}

const REQUIRED_STRING_FIELDS = [
  "memory_type",
  "scope",
  "title",
  "summary",
  "source_type",
  "actor",
  "owner",
] as const;

function validateInput(input: RecordMemoryEventInput): string | null {
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = input[field];
    if (typeof value !== "string" || value.trim() === "") {
      return `recordMemoryEvent: required field '${field}' is missing or empty.`;
    }
  }
  if (
    typeof input.confidence !== "number" ||
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 100
  ) {
    return "recordMemoryEvent: 'confidence' must be a finite number between 0 and 100.";
  }
  return null;
}

/**
 * Internal writer — always attempts the write (no gate check). Never throws:
 * any DB error, including the idempotency lookup, is caught and returned as
 * `{ error }`.
 */
async function writeMemoryEvent(args: RecordMemoryEventArgs): Promise<RecordMemoryEventResult> {
  const validationError = validateInput(args);
  if (validationError) {
    return { enabled: true, recorded: false, error: validationError };
  }

  const db = args.db as MemoryEventDb;

  try {
    // Spec guard: AI/automated actors may only create 'candidate' memory.
    // This call is always a no-op here (we only ever create "candidate"),
    // but keeping it exercises the shared guard — inside the try block, so
    // this function's "never throws" contract holds even if that guard's
    // logic ever changes — so this path can never silently drift from the
    // state-machine contract.
    assertCandidateOnly("candidate");

    if (args.idempotencyKey) {
      const existing = await db.jarvisMemoryEvent.findFirst({
        where: { metadata: { path: ["idempotencyKey"], equals: args.idempotencyKey } },
      });
      if (existing) {
        return { enabled: true, recorded: false, deduped: true, id: existing.id };
      }
    }

    const metadata = args.idempotencyKey
      ? { ...(args.metadata ?? {}), idempotencyKey: args.idempotencyKey }
      : args.metadata;

    const record = await db.jarvisMemoryEvent.create({
      data: {
        memory_type: args.memory_type,
        memory_state: "candidate",
        scope: args.scope,
        title: args.title,
        summary: args.summary,
        full_text: args.full_text,
        source_type: args.source_type,
        source_ref: args.source_ref,
        actor: args.actor,
        owner: args.owner,
        confidence: args.confidence,
        sensitivity: args.sensitivity ?? "normal",
        tags: args.tags ? [...args.tags] : [],
        related_decision_id: args.related_decision_id,
        related_agent_id: args.related_agent_id,
        metadata,
        owner_approval: false,
      },
    });

    return { enabled: true, recorded: true, id: record.id };
  } catch (err) {
    return {
      enabled: true,
      recorded: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * HARD GATE — the only entry point automated/AI-driven code should call to
 * record a Jarvis memory event. No-ops (zero DB interaction, `db` is never
 * touched) unless JARVIS_MEMORY_WRITE_ENABLED=true. Delegates to the internal
 * writer, which is itself failure-isolated, so this also never throws.
 *
 * Manual owner-initiated writes (e.g. an admin form) should keep going
 * through ./actions.ts#createMemoryCandidate directly — this gate exists for
 * autonomous/scheduled callers, not to block human-initiated writes.
 */
export async function recordMemoryEvent(
  args: RecordMemoryEventArgs,
  env: NodeJS.ProcessEnv = process.env
): Promise<RecordMemoryEventResult> {
  if (!isMemoryWriteEnabled(env)) {
    return { enabled: false, recorded: false };
  }
  return writeMemoryEvent(args);
}
