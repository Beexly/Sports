/**
 * Jarvis Ledger Types
 *
 * Types for the Agent Handoff Ledger (spec §8) and Subagent Run Ledger (spec §9).
 * These types exist as honest architecture design — no database store is wired yet.
 * No fake data is generated, no simulated ledger entries are created.
 *
 * buildLedgerStatus() returns the honest posture: both ledgers are not_connected.
 * A database migration is required before any entries can be persisted.
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type HandoffStatus = "pending" | "accepted" | "rejected" | "escalated";
export type SubagentReviewStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "edited";

// ─── Agent Handoff Ledger entry (spec §8) ─────────────────────────────────────

export interface AgentHandoffEntry {
  /** Stable unique id for this handoff event. */
  id: string;
  /** Codename of the seat initiating the handoff. */
  sourceAgent: string;
  /** Codename of the seat receiving the handoff. */
  targetAgent: string;
  /** Human-readable reason for the handoff. */
  reason: string;
  /** Task type from the routing rules. */
  taskType: string;
  /** Supporting evidence items (urls, data references, test results). */
  evidence: string[];
  /** Risk classification for this handoff. */
  riskLevel: RiskLevel;
  /** Authority tier of the initiating seat. */
  authorityTier: number;
  /** Current status of the handoff. */
  status: HandoffStatus;
  /** Whether this handoff requires explicit owner approval before proceeding. */
  ownerApprovalRequired: boolean;
  /** ISO 8601 timestamp of the handoff. */
  timestamp: string;
  /** Outcome narrative once the handoff is resolved (undefined if pending). */
  outcome?: string;
}

// ─── Subagent Run Ledger entry (spec §9) ──────────────────────────────────────

export interface SubagentRunEntry {
  /** Stable unique id for this subagent run. */
  id: string;
  /** Id of the subagent template that ran. */
  subagentId: string;
  /** Id of the parent council seat that spawned this subagent. */
  parentSeatId: string;
  /** Narrow task the subagent was given. */
  task: string;
  /** Context provided as input to the subagent. */
  inputContext: string;
  /** The draft artifact the subagent produced. */
  outputArtifact: string;
  /** Confidence score 0–100 in the output. */
  confidence: number;
  /** Explicit uncertainty statement about the output. */
  uncertainty: string;
  /** Supporting evidence for the output. */
  evidence: string[];
  /** True = prohibited-actions check passed; false = violation detected. */
  prohibitedActionsCheck: boolean;
  /** Parent seat's review status of this run's output. */
  parentReviewStatus: SubagentReviewStatus;
  /** null = pending review; true = accepted; false = rejected. */
  accepted: boolean | null;
  /** ISO 8601 timestamp of the run. */
  timestamp: string;
}

// ─── Ledger connection posture ─────────────────────────────────────────────────

/** The only valid connection state today — no store is wired. */
export type LedgerConnectionState = "not_connected";

export interface LedgerStatus {
  handoffLedger: LedgerConnectionState;
  subagentRunLedger: LedgerConnectionState;
  reason: string;
  storeAvailable: false;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Returns the honest ledger posture.
 *
 * Both ledgers are not_connected. No entries are simulated or fabricated.
 * A database migration is required before handoff or subagent run entries
 * can be persisted.
 */
export function buildLedgerStatus(): LedgerStatus {
  return {
    handoffLedger: "not_connected",
    subagentRunLedger: "not_connected",
    reason:
      "No ledger store wired. A database migration is required before handoff or subagent run entries can be persisted. No entries are simulated.",
    storeAvailable: false,
  };
}
