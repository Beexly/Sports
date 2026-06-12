/**
 * Scribe types — the institutional-memory record format.
 *
 * A ScribeEntry is a vault-ready note: decisions, dispatches, risks,
 * patterns, corrections, and session handoffs. Entries are immutable
 * once written; corrections reference the entry they amend rather than
 * mutating it. File-backed (docs/ai/jarvis/vault) — no DB, no vectors.
 * That limitation is recorded honestly in the self-knowledge model.
 */

export type ScribeEntryType =
  | "DECISION"      // owner decided something
  | "DISPATCH"      // a task was routed to an agent
  | "RISK"          // a risk was surfaced
  | "PATTERN"       // a recurring pattern was observed
  | "CORRECTION"    // Jarvis corrected an earlier statement
  | "HANDOFF";      // end-of-session context for the next session

export interface ScribeEntry {
  readonly id: string;
  readonly type: ScribeEntryType;
  readonly title: string;
  /** Markdown body. Concise — the vault is a ledger, not a journal. */
  readonly body: string;
  /** Where this lands in the vault, e.g. "06-memory/2026-06-12-handoff.md". */
  readonly vaultPath: string;
  readonly createdAt: string;
  readonly tags: readonly string[];
}

let scribeSeq = 0;

/** Deterministic-enough id for in-session entries (no crypto needed). */
export function nextScribeId(type: ScribeEntryType, nowIso: string): string {
  scribeSeq += 1;
  return `scribe-${type.toLowerCase()}-${nowIso.slice(0, 10)}-${scribeSeq}`;
}

/** Render an entry as vault-ready markdown. */
export function renderScribeEntry(entry: ScribeEntry): string {
  return [
    `# ${entry.title}`,
    "",
    `- type: ${entry.type}`,
    `- created: ${entry.createdAt}`,
    `- tags: ${entry.tags.join(", ") || "—"}`,
    "",
    entry.body,
  ].join("\n");
}
