/**
 * Agent Charter — formal, L0–L5-bound charter for every fleet seat.
 *
 * Workstream J-fleet. A charter is the explicit, machine-readable contract for
 * what an agent may do, how its output is judged, and how it escalates. It binds
 * each agent to a rung of the L0–L5 authority ladder so the dispatch loop,
 * scoring, and observability can reason about every agent uniformly instead of
 * special-casing uneven definitions.
 *
 * This module is ADDITIVE: it defines the charter shape and the level-binding
 * defaults only. It does not change any existing registry field, and it never
 * grants an external action — every charter inherits the platform invariant
 * `externalActionsAllowed=false` and lists evasion/external tools NOWHERE.
 *
 * Authority binding (mirrors lib/cockpit/daily-command/authority-matrix.ts):
 *   OBSERVE          → L0  read/analyze only
 *   DRAFT            → L1  produce drafts; never publish
 *   ROUTE            → L2  route work into the governed queue
 *   MANUAL_EXECUTION → L3  human-triggered, verified execution
 *   OWNER_ONLY       → L4  owner approval required for the action
 *   (AUTONOMOUS      → L5  declared empty by design — no charter binds here)
 */

import type { AgentAuthorityLevel } from "./agent-authority";

/** The L0–L5 rung label an authority level binds to. L5 is declared-empty. */
export type CharterAuthorityRung = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

/**
 * Full charter block for a fleet seat. Every field is required on the charter
 * object itself; the charter as a whole is OPTIONAL on `AgentOSDefinition` so
 * legacy definitions still compile. The registry fills it in for all agents.
 */
export interface AgentCharter {
  /** One-line mission statement for the seat. */
  readonly charter: string;
  /** The L0–L5 rung this seat's authority level binds to. */
  readonly authorityRung: CharterAuthorityRung;
  /** What the seat may do — aligns to the seat's allowedActions. */
  readonly permissions: readonly string[];
  /**
   * Tools the seat may use. Default []. Evasion or external-action tools are
   * NEVER listed here — the platform invariant is externalActionsAllowed=false.
   */
  readonly toolsAllowed: readonly string[];
  /** Actions the seat must never take — references FORBIDDEN_EXTERNAL_ACTIONS. */
  readonly forbiddenActions: readonly string[];
  /** Kinds of input the seat consumes. */
  readonly inputTypes: readonly string[];
  /** Kinds of output the seat produces (drafts/reviews/reports only). */
  readonly outputTypes: readonly string[];
  /** How the seat's output is judged for quality. */
  readonly qualityRubric: readonly string[];
  /** When and to whom the seat escalates — defaults to escalatesTo jarvis/owner. */
  readonly escalationRules: readonly string[];
  /** Evidence the seat must attach to any output before review. */
  readonly evidenceRequirements: readonly string[];
  /**
   * Memory write posture. Candidate-only by default; sensitive writes require
   * owner sign-off. Mirrors the memory-candidate review protocol.
   */
  readonly memoryWriteRules: readonly string[];
  /** Metrics the seat is evaluated against over time. */
  readonly evaluationMetrics: readonly string[];
}

/** Maps an authority level onto its L0–L5 rung. L5 is never produced (empty). */
export function authorityLevelToRung(level: AgentAuthorityLevel): CharterAuthorityRung {
  switch (level) {
    case "OBSERVE":
      return "L0";
    case "DRAFT":
      return "L1";
    case "ROUTE":
      return "L2";
    case "MANUAL_EXECUTION":
      return "L3";
    case "OWNER_ONLY":
      return "L4";
    default: {
      // Exhaustive: every AgentAuthorityLevel is handled above. The L5
      // AUTONOMOUS rung is declared-empty by design and never bound here.
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/** Human-readable permission phrasing per authority rung (binding doctrine). */
export function rungPermissionFloor(rung: CharterAuthorityRung): string {
  switch (rung) {
    case "L0":
      return "Observe: read and analyze cockpit state only; no drafts, routing, or action.";
    case "L1":
      return "Draft: produce drafts and review items; never publish or send.";
    case "L2":
      return "Route: route work into the governed task queue; approval gates preserved.";
    case "L3":
      return "Manual execution: human-triggered, verified execution only.";
    case "L4":
      return "Owner-only: owner approval required before the action is taken.";
    case "L5":
      return "Autonomous: declared empty by design; no agent acts externally.";
  }
}
