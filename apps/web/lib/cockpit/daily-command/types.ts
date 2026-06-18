/**
 * Daily Command — the cockpit owner console contract.
 *
 * The Daily Command turns `/cockpit` into a five-lane, exception-based command
 * center: Money Next · Approval Queue · Agent Activity · Signals · Lessons.
 *
 * Honesty contract (mirrors the Command Center feed):
 *   - Every lane declares a `dataMode`. Nothing is presented as live unless it
 *     is genuinely derived from live state; otherwise it is a labeled fallback.
 *   - A lane whose real backing store does not exist yet is `unavailable` with
 *     a `fallbackReason` — it is NEVER dressed up with fabricated numbers.
 *   - `noFakeLiveData` is the machine-checkable promise that the console never
 *     presents fallback/mock content as live.
 *   - Only the Approval Queue is transitionable (real CockpitTask rows). Every
 *     other lane is read-only projection or honest empty/labeled state.
 */

import type { CockpitTaskStatus } from "@prisma/client";
import type { RoutingDecision } from "@/lib/cockpit/scoring";

/** How a lane's data was sourced. */
export type DataMode = "live" | "labeled_fallback" | "unavailable";

/** Console-level rollup of the lane data modes. */
export type CommandDataMode = "live" | "live_with_labeled_fallbacks" | "unavailable";

export type CardRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE";

/** The five lanes, in fixed order. */
export type LaneKey =
  | "money_next"
  | "approval_queue"
  | "agent_activity"
  | "signals"
  | "lessons";

/**
 * One actionable button on a card. The Approval Queue's buttons carry a target
 * CockpitTaskStatus and are enabled only when that status is an allowed
 * transition; advisory/seed cards carry no buttons.
 */
export interface CardAction {
  readonly action: "APPROVE" | "EDIT" | "REJECT" | "ESCALATE";
  readonly label: string;
  /** The CockpitTaskStatus this action would move the task to. */
  readonly targetStatus: CockpitTaskStatus;
  /** Whether the action is currently permitted (target ∈ allowedTransitions). */
  readonly enabled: boolean;
  /** When true, the UI must collect a required note before submitting. */
  readonly requiresNote: boolean;
}

/** A single piece of supporting evidence, kept as a label/value pair. */
export interface CardEvidence {
  readonly label: string;
  readonly value: string;
}

/** A lane card — the unit of owner attention. */
export interface CommandCard {
  readonly id: string;
  readonly title: string;
  /** Why this matters to the owner, in one line. */
  readonly whyItMatters: string;
  /** The agent role that owns this work (display name). */
  readonly agentOwner: string;
  /** 0..100, or null when no calibrated confidence backs it. */
  readonly confidence: number | null;
  readonly risk: CardRisk;
  /** A short impact statement, or null when none can be honestly claimed. */
  readonly expectedImpact: string | null;
  readonly evidence: readonly CardEvidence[];
  readonly actionButtons: readonly CardAction[];
  /**
   * Real CockpitTask id when this card maps to a transitionable task; null for
   * advisory/seed/projection cards (which carry no action buttons).
   */
  readonly taskId: string | null;
  /**
   * Cockpit scoring engine output (Workstream J5), attached to Approval Queue
   * cards so a lane can render a risk/quality badge and the routing decision.
   * Optional/null for cards that are not scored (advisory/projection lanes).
   */
  readonly score?: CardScore | null;
}

/**
 * The compact, display-ready slice of a `ScoringResult` carried on a card.
 * The full engine result lives in `@/lib/cockpit/scoring`; the card only needs
 * the routing decision plus the two axes a badge surfaces.
 */
export interface CardScore {
  /** The routing decision the scoring engine reached. */
  readonly routing: RoutingDecision;
  /** Likelihood of a trust-guardrail breach, 0..1. */
  readonly complianceRisk: number;
  /** Confidence in the proposal, 0..1. */
  readonly confidence: number;
}

/** One composed lane, with its honesty label. */
export interface CommandLane {
  readonly key: LaneKey;
  readonly title: string;
  /** One-line description of what this lane answers. */
  readonly subtitle: string;
  readonly dataMode: DataMode;
  /** Present iff dataMode !== "live" — explains why the lane fell back. */
  readonly fallbackReason: string | null;
  readonly cards: readonly CommandCard[];
}

/** A single ring/metric the Signals lane surfaces. */
export interface SignalGauge {
  readonly label: string;
  /** Arc fill 0..100. */
  readonly value: number;
  /** Pre-formatted center text, e.g. "63%". */
  readonly display: string;
  readonly caption: string;
  /** Honest status of the underlying metric. */
  readonly tone: "ok" | "warn" | "critical";
}

/** The full Daily Command console — the page's input. */
export interface DailyCommand {
  readonly success: boolean;
  readonly generatedAt: string;
  /** Machine-checkable promise: no fallback/mock data is dressed up as live. */
  readonly noFakeLiveData: true;
  readonly dataMode: CommandDataMode;
  readonly headline: string;
  readonly lanes: readonly CommandLane[];
  /** Gauges the Signals lane renders (e.g. Claude budget %). */
  readonly signalGauges: readonly SignalGauge[];
  /** Present only when composition failed entirely; the console still renders. */
  readonly error: string | null;
}

// ── Authority matrix (L0–L5) ───────────────────────────────────────────────

/** Rung in the autonomy ladder, L0 (observe) … L5 (declared-empty autonomous). */
export interface AuthorityRung {
  /** "L0".."L5" */
  readonly level: string;
  readonly title: string;
  /** What an agent at this rung is permitted to do. */
  readonly description: string;
  /**
   * Whether this rung permits real external action. False for L0–L4 (and L5 is
   * a declared-empty rung — no agent has externalActionsAllowed=true).
   */
  readonly externalActionsAllowed: boolean;
  /** Agents currently projected at this rung. */
  readonly agents: readonly AuthorityAgentRef[];
}

export interface AuthorityAgentRef {
  readonly id: string;
  readonly displayName: string;
  readonly role: string;
  readonly status: string;
  readonly riskLevel: string;
  readonly ownerApprovalRequired: boolean;
}

export interface AuthorityMatrix {
  readonly rungs: readonly AuthorityRung[];
  /** Honest count of agents that can take external action (must be 0). */
  readonly externalActionCapableCount: number;
  readonly note: string;
}
