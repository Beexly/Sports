/**
 * Jarvis Memory Protocol — pure classification and redaction functions.
 *
 * No I/O, no Date.now(), no model calls. This module decides WHAT is worth
 * remembering and keeps secret material out; it does NOT persist anything.
 * The honest backing status is DESIGNED — no queryable store is wired, and
 * buildJarvisMemoryStatus() says so.
 *
 * Rules:
 *   - Never store secrets (same redaction pattern as the Scribe).
 *   - DESIGN_DOCTRINE and PROMPT_PATTERN are always worth storing.
 *   - SYSTEM_STATE is worth storing when captured fresh (it expires fast).
 *   - sensitive=true triggers redaction before any storage.
 */

import type {
  JarvisMemoryRecord,
  MemoryCandidate,
  MemoryProtocolStatus,
  MemoryType,
} from "./memory-types";
import { redactSecretsFromText } from "./scribe";

// ─── Classification ───────────────────────────────────────────────────────────

/** Types that are always worth storing, regardless of content shape. */
const ALWAYS_STORE: readonly MemoryType[] = ["DESIGN_DOCTRINE", "PROMPT_PATTERN"];

/** Durable types: store whenever content is non-trivial. */
const DURABLE_TYPES: readonly MemoryType[] = [
  "OWNER_PREFERENCE",
  "PROJECT_FACT",
  "DECISION",
  "AGENT_CAPABILITY",
  "RISK_RULE",
  "LEGAL_POLICY",
];

// Decides whether a candidate is worth remembering, with the reason and type.
export function classifyMemoryCandidate(candidate: MemoryCandidate): {
  shouldRemember: boolean;
  reason: string;
  type: MemoryType;
} {
  const { type } = candidate;
  const content = candidate.content.trim();

  if (content === "") {
    return { shouldRemember: false, reason: "Empty content — nothing to store.", type };
  }

  if (ALWAYS_STORE.includes(type)) {
    return {
      shouldRemember: true,
      reason: `${type} is always worth storing — doctrine and prompt patterns compound.`,
      type,
    };
  }

  if (type === "SYSTEM_STATE") {
    return {
      shouldRemember: true,
      reason:
        "SYSTEM_STATE is worth storing when captured fresh; it should carry an " +
        "expiry because it goes stale quickly.",
      type,
    };
  }

  if (type === "BUILD_STATUS") {
    return {
      shouldRemember: true,
      reason: "BUILD_STATUS is worth storing with an expiry — superseded by the next build.",
      type,
    };
  }

  if (DURABLE_TYPES.includes(type)) {
    return {
      shouldRemember: true,
      reason: `${type} is a durable fact category — store it.`,
      type,
    };
  }

  return { shouldRemember: false, reason: `Unrecognized memory type: ${type}.`, type };
}

// Convenience boolean wrapper around classifyMemoryCandidate.
export function shouldRemember(candidate: MemoryCandidate): boolean {
  return classifyMemoryCandidate(candidate).shouldRemember;
}

// ─── Redaction ────────────────────────────────────────────────────────────────

// Returns a copy of the record with secret-looking values replaced and redacted=true.
export function redactMemory(record: JarvisMemoryRecord): JarvisMemoryRecord {
  return {
    ...record,
    content: redactSecretsFromText(record.content),
    redacted: true,
  };
}

// ─── Status ───────────────────────────────────────────────────────────────────

// Returns the honest memory posture: protocol designed, no queryable store wired.
export function buildJarvisMemoryStatus(): MemoryProtocolStatus {
  return {
    isWired: false,
    backingStatus: "DESIGNED",
    truth:
      "The memory protocol is designed and typed, with file-backed notes in the " +
      "vault (docs/ai/jarvis/vault/06-memory/). No queryable store is wired — " +
      "nothing is recalled across sessions. Context is rebuilt from the database " +
      "and version-controlled markdown on every load.",
    capabilities: [
      "Classify memory candidates deterministically (classifyMemoryCandidate)",
      "Redact secret material before any storage (redactMemory)",
      "Hold candidate memories as markdown in the vault, version-controlled in git",
      "Summarize held records for the owner (summarizeMemoryForOwner)",
    ],
    limitations: [
      "No cross-session recall — Jarvis does not remember prior conversations",
      "No database or vector store behind the protocol yet",
      "No automated capture — candidates are written by hand or by approved jobs",
      "No retrieval ranking — the vault is browsed, not queried",
    ],
    nextWiringStep:
      "Persist JarvisMemoryRecord rows to a Postgres table (Prisma model) with " +
      "timestamps and tags, then surface retrieval in the cockpit per " +
      "docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md.",
  };
}

// ─── Owner summary ────────────────────────────────────────────────────────────

// Compact owner-facing summary of held memory records, grouped by type.
export function summarizeMemoryForOwner(
  records: readonly JarvisMemoryRecord[]
): string {
  if (records.length === 0) {
    return (
      "No memory records held. The protocol is designed but the store is not " +
      "wired — Jarvis remembers nothing across sessions yet."
    );
  }

  const byType = new Map<string, number>();
  for (const r of records) {
    byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  }
  const parts = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${type}`);
  const redactedCount = records.filter((r) => r.redacted).length;

  return (
    `${records.length} memory record${records.length === 1 ? "" : "s"} held ` +
    `(${parts.join(", ")}). ${redactedCount} redacted. Backing is file/design ` +
    "only — no queryable store is wired."
  );
}
