/**
 * Cockpit Scoring Engine — types (Workstream J5).
 *
 * The scoring engine is the gate that sits BEFORE the Approval Queue. Every
 * candidate action/task an agent proposes is scored here so the cockpit can
 * route it: keep it internal, send it to the owner, ask for edits, block it,
 * or escalate it. The output is a structured, deterministic score — no I/O.
 *
 * These types intentionally reuse existing cockpit/agent vocabulary so the
 * engine stays aligned with the rest of the platform:
 *   - `CockpitRiskLevel`        — the Prisma risk enum a CockpitTask carries.
 *   - `AgentAuthorityLevel`     — the agent autonomy rung (OBSERVE … OWNER_ONLY).
 *   - `AgentAction`             — the action vocabulary (incl. forbidden ones).
 */

import type { CockpitRiskLevel } from "@prisma/client";
import type { AgentAuthorityLevel } from "@/lib/agents/agent-authority";
import type { AgentAction } from "@/lib/agents/agent-capabilities";

/**
 * The sensitive trust domains a candidate action may touch. Touching ANY of
 * these forces HIGH complianceRisk and removes AUTO_SAVE_INTERNAL from the
 * table (see scoring rules). These mirror the platform's non-negotiable
 * trust guardrails: public picks, model/calibration, revenue claims, rights.
 */
export type SensitiveDomain =
  /** Public-facing picks (free/premium) — never auto. */
  | "PUBLIC_PICKS"
  /** Model weights, confidence calibration, scoring features. */
  | "MODEL_WEIGHTS"
  /** Revenue / pricing / accuracy claims shown to customers. */
  | "REVENUE_CLAIMS"
  /** Scraping clearance, source rights, data licensing. */
  | "RIGHTS_SCRAPING";

/** A coarse, human-readable estimate of how much an action changes if shipped. */
export type ExpectedImpactHint = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/**
 * The routing decision the engine emits. This is the single thing the cockpit
 * reads to decide what to do with a candidate before it reaches the owner.
 */
export type RoutingDecision =
  /** Safe, reversible, internal-only — may be saved without owner attention. */
  | "AUTO_SAVE_INTERNAL"
  /** Goes to the Approval Queue for a normal owner decision. */
  | "SEND_TO_APPROVAL"
  /** Returned to the agent for revision before it can be approved. */
  | "REQUIRE_EDITS"
  /** Forbidden / unsafe — hard-stopped, never routed to the owner as approvable. */
  | "BLOCK"
  /** High-stakes or owner-only — surfaced to the owner with an escalation flag. */
  | "ESCALATE";

/** A candidate action/task to be scored. Pure data — no handles, no I/O. */
export interface ScoringInput {
  /** The agent proposing this action (registry id, e.g. "scout"). */
  readonly assignedAgent: string;
  /** The cockpit risk classification the proposal carries. */
  readonly riskLevel: CockpitRiskLevel;
  /** Sensitive trust domains this action touches (empty = none). */
  readonly sensitiveDomains?: readonly SensitiveDomain[];
  /** Concrete action the proposal would take, if known (drives BLOCK on forbidden). */
  readonly action?: AgentAction;
  /** Owner approval explicitly demanded (e.g. agent.ownerApprovalRequired). */
  readonly ownerApprovalRequired?: boolean;
  /** The agent's authority rung; OWNER_ONLY can never auto-save. */
  readonly authorityLevel?: AgentAuthorityLevel;
  /** Whether the action is reversible (undoable with no external side effect). */
  readonly reversible?: boolean;
  /** How many surfaces/users the action touches if shipped. */
  readonly blastRadius?: "ISOLATED" | "LOCALIZED" | "BROAD";
  /** Strength of the supporting evidence behind the proposal. */
  readonly evidenceStrength?: "NONE" | "WEAK" | "MODERATE" | "STRONG";
  /** Coarse expected-impact hint. */
  readonly expectedImpact?: ExpectedImpactHint;
  /**
   * Optional pre-computed confidence (0..1). When absent, the engine derives a
   * conservative confidence from risk + evidence so the score is never null.
   */
  readonly confidenceHint?: number;
}

/** The structured score the engine returns. All axes 0..1 unless noted. */
export interface ScoringResult {
  /** Calibrated confidence in the proposal, 0..1. */
  readonly confidence: number;
  /** Likelihood the action breaches a trust guardrail, 0..1 (1 = certain breach). */
  readonly complianceRisk: number;
  /** How reversible the action is, 0..1 (1 = fully reversible). */
  readonly reversibility: number;
  /** How far the action reaches, 0..1 (1 = broad / many users). */
  readonly blastRadius: number;
  /** Strength of supporting evidence, 0..1. */
  readonly evidenceStrength: number;
  /** Expected impact if shipped, 0..1. */
  readonly expectedImpact: number;
  /** The routing decision the cockpit acts on. */
  readonly routing: RoutingDecision;
  /** Human-readable reasons the routing came out this way (audit trail). */
  readonly reasons: readonly string[];
}
