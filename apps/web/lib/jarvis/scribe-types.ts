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
 *   - body/summary is plain text or markdown — never raw data dumps.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScribeProject = "GSE" | "GSN" | "AIRWAVE" | "JARVIS" | "DESIGN" | "OPS";
export type ScribeVisibility = "PRIVATE" | "INTERNAL" | "PUBLIC_SAFE";
export type ScribeApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";
export type ScribeRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ScribeEntryType =
  | "OBSERVATION"
  | "DECISION"         // owner made a call
  | "PROMPT"
  | "ACTION_PROPOSAL"
  | "DISPATCH"         // task was dispatched
  | "BRIEFING"         // morning briefing produced
  | "RISK"             // risk surfaced and recorded
  | "PATTERN"          // pattern observed and stored
  | "HANDOFF"          // session handoff for continuity
  | "SELF_CORRECTION"  // Jarvis corrected earlier output
  | "SESSION_SUMMARY"  // end-of-session synthesis
  | "RESULT"
  | "MEMORY"
  | "TODO";

export interface ScribeEntry {
  readonly id: string;
  readonly type: ScribeEntryType;
  readonly title: string;
  readonly createdAt: string;
  readonly tags: readonly string[];
  /** Plain text or markdown body (used by Executive Intelligence v2 layers). */
  readonly body?: string;
  /** Vault-relative path for the Obsidian vault. */
  readonly vaultPath?: string;
  /** Session that produced this entry. */
  readonly sourceSessionId?: string;
  // ── Original scribe protocol fields (optional for v2 compatibility) ──────
  readonly source?: string;
  readonly actor?: string;
  readonly agent?: string;
  readonly taskId?: string;
  readonly project?: ScribeProject;
  readonly summary?: string;
  readonly details?: string;
  readonly relatedFiles?: readonly string[];
  readonly relatedRoutes?: readonly string[];
  readonly approvalStatus?: ScribeApprovalStatus;
  readonly visibility?: ScribeVisibility;
  readonly riskLevel?: ScribeRiskLevel;
  readonly nextAction?: string;
}

export interface ScribeProtocol {
  readonly agentId: string;
  readonly defaultProject: ScribeProject;
  readonly defaultVisibility: ScribeVisibility;
  readonly requiredFields: readonly string[];
  readonly forbiddenFields: readonly string[];
  readonly outputPath: string;
}
