/**
 * Scribe Types — foundation types for Jarvis institutional memory.
 *
 * A ScribeEntry is the unit of record for the Obsidian vault. Every
 * decision, dispatch, session handoff, and pattern observation that
 * warrants institutional memory becomes a ScribeEntry. These are
 * append-only records — they never get mutated after creation.
 *
 * Trust rules:
 *   - ScribeEntry is a record, not a promise. It documents what happened.
 *   - vaultPath is the vault-relative path (e.g., "01-daily/2026-06-12.md").
 *   - ScribeEntry.body is plain text or markdown — never raw data dumps.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScribeEntryType =
  | "DECISION"         // owner made a call
  | "DISPATCH"         // task was dispatched
  | "BRIEFING"         // morning briefing produced
  | "RISK"             // risk surfaced and recorded
  | "PATTERN"          // pattern observed and stored
  | "HANDOFF"          // session handoff for continuity
  | "SELF_CORRECTION"  // Jarvis corrected earlier output
  | "SESSION_SUMMARY"; // end-of-session synthesis

export interface ScribeEntry {
  readonly id: string;
  readonly type: ScribeEntryType;
  readonly title: string;
  /** Plain text or markdown. Executive register. Never raw data. */
  readonly body: string;
  readonly createdAt: string;
  readonly sourceSessionId?: string;
  readonly tags: readonly string[];
  /** Vault-relative path for the Obsidian vault. */
  readonly vaultPath?: string;
}
