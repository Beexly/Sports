/**
 * Jarvis Scribe — types.
 *
 * The Scribe is the shared note-taking protocol every agent and session
 * writes through. Entries are structured, redacted, and rendered to the
 * Obsidian-compatible vault under docs/ai/jarvis/.
 *
 * Pure type definitions only. No runtime code.
 */

export type ScribeProject = "GSE" | "GSN" | "AIRWAVE" | "JARVIS" | "DESIGN" | "OPS";

export type ScribeEntryType =
  | "OBSERVATION"
  | "DECISION"
  | "PROMPT"
  | "ACTION_PROPOSAL"
  | "HANDOFF"
  | "RESULT"
  | "RISK"
  | "MEMORY"
  | "TODO";

export type ScribeVisibility = "PRIVATE" | "INTERNAL" | "PUBLIC_SAFE";

export type ScribeApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";

export type ScribeRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ScribeEntry {
  readonly id: string;
  readonly createdAt: string; // ISO string — always provided by the caller
  readonly source: string; // agent id, "owner", "claude", "codex"
  readonly actor: string;
  readonly agent?: string;
  readonly taskId?: string;
  readonly project: ScribeProject;
  readonly type: ScribeEntryType;
  readonly title: string;
  readonly summary: string;
  readonly details?: string;
  readonly tags: readonly string[];
  readonly relatedFiles: readonly string[];
  readonly relatedRoutes: readonly string[];
  readonly approvalStatus: ScribeApprovalStatus;
  readonly visibility: ScribeVisibility;
  readonly riskLevel: ScribeRiskLevel;
  readonly nextAction?: string;
}

export interface ScribeProtocol {
  readonly agentId: string;
  readonly defaultProject: ScribeProject;
  readonly defaultVisibility: ScribeVisibility;
  readonly requiredFields: readonly string[];
  readonly forbiddenFields: readonly string[];
  readonly outputPath: string; // e.g. "docs/ai/jarvis/scribe/"
}
