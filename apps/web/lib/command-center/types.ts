/**
 * Command Center — shared types.
 *
 * The Command Center is a composition layer, not a new data source. It pulls
 * the platform's existing live synthesis (Jarvis assessment + Owner Summary,
 * both already derived from real DB state) and re-presents it as ONE ranked
 * owner-attention queue plus a decision-grade operating narrative.
 *
 * Honesty contract:
 *   - Every lane declares a `dataMode`. Nothing is presented as live unless it
 *     is genuinely derived from live state; otherwise it is a labeled fallback.
 *   - `noFakeLiveData` is the machine-checkable promise that the feed never
 *     dresses fallback/sample content up as live.
 *   - This layer NEVER fabricates picks, stats, or outcomes. It only ranks and
 *     narrates signals the trust-gated synthesis already produced.
 */

import type { JarvisHealth } from "../cockpit/jarvis";

/** How a lane's data was sourced. */
export type DataMode = "live" | "labeled_fallback" | "unavailable";

/** Feed-level rollup of the lane data modes. */
export type FeedDataMode = "live" | "live_with_labeled_fallbacks" | "unavailable";

export type AttentionUrgency = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

/**
 * What kind of decision this item represents — used to group the queue so the
 * owner sees "safety first, then launch gates, then department work."
 */
export type DecisionType =
  | "SAFETY"
  | "LAUNCH_GATE"
  | "DEPARTMENT"
  | "CONFIG"
  | "ROUTINE";

export type AttentionSource =
  | "jarvis_safety"
  | "owner_decision"
  | "department"
  | "external_config"
  | "missing_phase"
  | "recommended_action"
  | "advisory"
  | "ingestion_health";

/**
 * The five principled factors behind every attention score. Each is 0..1.
 * They are deliberately the questions an owner actually asks, not arbitrary
 * weights: "how bad if I wait, how big is the blast radius, can I undo it,
 * how much of my time, and how much do I trust the signal."
 */
export interface AttentionFactors {
  /** How much worse this gets if left unattended. 1 = degrades fast. */
  readonly costOfDelay: number;
  /** Blast radius / impact if it goes wrong. 1 = platform-wide. */
  readonly severity: number;
  /** 1 = easily reversible (lower priority), 0 = irreversible (raises priority). */
  readonly reversibility: number;
  /** Owner time/effort to resolve. 1 = high effort (low-effort wins get a nudge up). */
  readonly ownerEffort: number;
  /** How trustworthy the underlying signal is. 1 = certain. Dampens the score. */
  readonly sourceConfidence: number;
}

/**
 * A pre-scored signal collected from a real source. Pure input to ranking —
 * carries no DB handles, so it is trivially testable.
 */
export interface RawAttentionSignal {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly source: AttentionSource;
  readonly decisionType: DecisionType;
  readonly factors: AttentionFactors;
  /** A minimum urgency the source guarantees (e.g. a safety warning is never below CRITICAL). */
  readonly urgencyFloor: AttentionUrgency;
  readonly recommendedAction: string;
  readonly link: string | null;
}

/** A ranked, owner-facing attention item — the unit of the decision queue. */
export interface OwnerAttentionItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly source: AttentionSource;
  readonly decisionType: DecisionType;
  /** 0..100 — higher means "look at this sooner." */
  readonly score: number;
  readonly urgency: AttentionUrgency;
  readonly factors: AttentionFactors;
  /** One-line "why this score" so the ranking is explainable, never a black box. */
  readonly scoreExplanation: string;
  readonly recommendedAction: string;
  readonly link: string | null;
}

/** One composed source lane, with its honesty label. */
export interface CommandCenterLane {
  readonly key: string;
  readonly label: string;
  readonly dataMode: DataMode;
  /** Present iff dataMode !== "live" — explains why the lane fell back. */
  readonly fallbackReason: string | null;
  readonly itemCount: number;
}

/** The decision-grade narrative: what changed, what's blocked, what needs you. */
export interface OperatingNarrative {
  readonly headline: string;
  readonly whatChanged: readonly string[];
  readonly whatsBlocked: readonly string[];
  readonly needsYou: readonly string[];
  readonly canWait: readonly string[];
  readonly canIgnore: readonly string[];
}

export interface CommandCenterCounts {
  readonly attentionTotal: number;
  readonly critical: number;
  readonly high: number;
  readonly normal: number;
  readonly low: number;
}

/** The full Command Center feed — the API contract and the page's input. */
export interface CommandCenterFeed {
  readonly success: boolean;
  readonly generatedAt: string;
  /** Machine-checkable promise: no fallback/sample data is dressed up as live. */
  readonly noFakeLiveData: true;
  readonly dataMode: FeedDataMode;
  readonly overallColor: "GREEN" | "AMBER" | "RED";
  readonly headline: string;
  readonly lanes: readonly CommandCenterLane[];
  readonly attention: readonly OwnerAttentionItem[];
  readonly narrative: OperatingNarrative;
  readonly counts: CommandCenterCounts;
  readonly jarvisVersion: string;
  /** Present only when synthesis failed entirely; the feed still renders. */
  readonly error: string | null;
}

/**
 * Pure input bundle for signal collection — exactly the fields the ranking
 * needs, extracted from the live Jarvis assessment + Owner Summary by `feed.ts`.
 */
export interface AttentionSourceInput {
  readonly safetyWarnings: readonly string[];
  readonly externalConfigWarnings: readonly string[];
  readonly missingPhaseWarnings: readonly string[];
  readonly recommendedNextActions: readonly string[];
  readonly advisoryWarnings: readonly string[];
  readonly decisions: ReadonlyArray<{
    readonly urgency: "CRITICAL" | "HIGH" | "NORMAL";
    readonly description: string;
    readonly link: string | null;
  }>;
  readonly departments: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly status: JarvisHealth;
    readonly actionRequired: boolean;
    readonly actionDescription: string | null;
    readonly drilldownHref: string | null;
  }>;
  /** Jarvis ingestionStatus — drives stale/unknown attention without extra I/O. */
  readonly ingestionStatus?: JarvisHealth;
  readonly lastIngestionAt?: string | null;
}
