/**
 * Jarvis Ledger Types
 *
 * Types for the Agent Handoff Ledger (spec §8) and Subagent Run Ledger (spec §9).
 *
 * buildLedgerStatus() — sync fallback, returns not_connected posture.
 * buildLiveLedgerStatus() — async probe: COUNT queries on the new tables.
 *   Success → connected posture with REAL counts.
 *   Any failure → not_connected posture (never throws).
 */

import { db } from "@sports/db";

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

/** Posture when no store is reachable. */
export interface NotConnectedLedgerStatus {
  handoffLedger: "not_connected";
  subagentRunLedger: "not_connected";
  reason: string;
  storeAvailable: false;
}

/** Posture when the store is reachable and COUNT queries succeeded. */
export interface ConnectedLedgerStatus {
  handoffLedger: "connected";
  subagentRunLedger: "connected";
  reason: string;
  storeAvailable: true;
  /** Total handoff entries logged. */
  handoffCount: number;
  /** Subagent runs still awaiting parent review. */
  pendingReviewCount: number;
  /** Total subagent run entries logged. */
  subagentRunCount: number;
}

export type LedgerStatus = NotConnectedLedgerStatus | ConnectedLedgerStatus;

// Backward-compat: LedgerConnectionState used in the old narrow type.
export type LedgerConnectionState = "not_connected";

// ─── Sync fallback builder ────────────────────────────────────────────────────

/**
 * Returns the not-connected posture synchronously.
 *
 * Use when you cannot await (e.g. static rendering, fallback path).
 * Nothing is simulated or fabricated.
 */
export function buildLedgerStatus(): NotConnectedLedgerStatus {
  return {
    handoffLedger: "not_connected",
    subagentRunLedger: "not_connected",
    reason:
      "No ledger store wired. A database migration is required before handoff or subagent run entries " +
      "can be persisted. No entries are simulated.",
    storeAvailable: false,
  };
}

// ─── Async probe builder ──────────────────────────────────────────────────────

/**
 * Async variant: runs cheap COUNT queries against agent_handoffs and subagent_runs.
 *
 * Success → ConnectedLedgerStatus with REAL counts from the DB:
 *   - handoffCount: total rows in agent_handoffs
 *   - subagentRunCount: total rows in subagent_runs
 *   - pendingReviewCount: rows with parent_review_status = 'pending_review'
 *
 * Any DB error (unavailable, table not yet migrated, etc.) → returns the sync
 * buildLedgerStatus() not-connected posture. Never throws.
 */
export async function buildLiveLedgerStatus(): Promise<LedgerStatus> {
  try {
    const [handoffCount, subagentRunCount, pendingReviewCount] = await Promise.all([
      db.agentHandoff.count(),
      db.subagentRun.count(),
      db.subagentRun.count({ where: { parent_review_status: "pending_review" } }),
    ]);

    const connected: ConnectedLedgerStatus = {
      handoffLedger: "connected",
      subagentRunLedger: "connected",
      reason: "Ledger store connected (PostgreSQL). Handoff and subagent run entries are being persisted.",
      storeAvailable: true,
      handoffCount,
      subagentRunCount,
      pendingReviewCount,
    };

    return connected;
  } catch {
    // DB unavailable or table not yet migrated — fall back to not-connected posture.
    return buildLedgerStatus();
  }
}
