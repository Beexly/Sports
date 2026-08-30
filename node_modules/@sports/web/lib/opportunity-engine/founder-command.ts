/**
 * NOVA S4 — Founder OS domain contracts (directive `docs/ai/phase0/
 * NOVA_CONVERGENCE_FREEZE_2026-07-22.md` §5.3, split unit S4).
 *
 * S4's freeze acceptance gate: "read models only; consumes control-plane
 * economics (§3.2) and settlement anomalies; no writes, no second
 * dashboard." Every type below is a plain, immutable data shape describing
 * a *view* over S1/S2/S3 output plus the two upstream domains NOVA does not
 * own (settlement anomalies, AI control-plane economics/config events).
 * Nothing here mutates state, schedules work, or grants execution
 * authority — that mirrors S2's `executionAuthority: false` convention and
 * the freeze's "one cockpit, one owner queue" rule (§2).
 *
 * Founder OS is the ONLY owner-decision surface (freeze §2): `SettlementDecision`
 * receipts (#161) and control-plane `ConfigurationError`/override events feed
 * INTO the `FounderWorkItem` queue below; they do not grow their own UIs.
 *
 * Reuses S1's `PriorityBand` and `CouncilReviewer` vocabularies rather than
 * minting parallel ones (freeze §6, "NOVA name wins" applies internally too —
 * one vocabulary per concept).
 */
import type { CouncilReviewer, PriorityBand } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Work-item lifecycle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which NOVA domain (or upstream-owned domain surfaced read-only) a Founder
 * OS work item originates from. `SETTLEMENT_ANOMALY` and
 * `CONTROL_PLANE_ECONOMICS` are the two domains the freeze (§2) says NOVA
 * may read from but never define — every item in those lanes is a read
 * model of someone else's canonical state.
 */
export type FounderWorkLane =
  | "CAPABILITY_GOVERNANCE"
  | "SOURCE_INTELLIGENCE"
  | "REVENUE_OPPORTUNITY"
  | "CREDIT_LIFECYCLE"
  | "SETTLEMENT_ANOMALY"
  | "CONTROL_PLANE_ECONOMICS";

export const FOUNDER_WORK_LANES: readonly FounderWorkLane[] = [
  "CAPABILITY_GOVERNANCE",
  "SOURCE_INTELLIGENCE",
  "REVENUE_OPPORTUNITY",
  "CREDIT_LIFECYCLE",
  "SETTLEMENT_ANOMALY",
  "CONTROL_PLANE_ECONOMICS",
];

/**
 * A work item's position in the queue. Terminal states (`RESOLVED`,
 * `DISMISSED`) are absorbing — nothing in S4 transitions a work item back
 * out of them; that would require a write path S4 does not have.
 */
export type FounderWorkState =
  | "NEW"
  | "TRIAGED"
  | "AGENT_HANDLING"
  | "AWAITING_OWNER"
  | "RESOLVED"
  | "DISMISSED";

export const FOUNDER_OPEN_WORK_STATES: ReadonlySet<FounderWorkState> = new Set([
  "NEW",
  "TRIAGED",
  "AGENT_HANDLING",
  "AWAITING_OWNER",
]);

/**
 * Who is authorized to act on a work item. Exactly the freeze §5.3
 * vocabulary — no fourth value, no synonyms.
 *
 *  - `AGENT_INTERNAL`   — NOVA may handle and log this without owner input.
 *  - `OWNER_ONLY`       — only a human owner decision resolves this.
 *  - `AGENT_THEN_OWNER` — NOVA may propose a disposition; only the owner
 *                         confirms it.
 *
 * S4 never grants itself more than classification here: nothing in this
 * split unit performs the "AGENT_INTERNAL" handling or the owner
 * confirmation — those are separate, later-arriving action surfaces. This
 * module only decides *who* is authorized, never *acts*.
 */
export type FounderWorkAuthority = "AGENT_INTERNAL" | "OWNER_ONLY" | "AGENT_THEN_OWNER";

/**
 * One unit of founder attention. Immutable, already-classified — nothing
 * that renders a `FounderWorkItem` may re-derive or override `authority`;
 * that classification lives upstream in `nova-agent.ts`.
 */
export interface FounderWorkItem {
  readonly id: string;
  readonly lane: FounderWorkLane;
  readonly state: FounderWorkState;
  readonly authority: FounderWorkAuthority;
  readonly priorityBand: PriorityBand;
  readonly title: string;
  readonly summary: string;
  /** Exact, auditable reasons this item exists and why it was classified
   *  the way it was — never a vague "flagged for review". */
  readonly reasons: readonly string[];
  /** Ids of the real upstream records this item was derived from (a
   *  capability id, source id, snapshot id, anomaly id, control-plane error
   *  id, …) — never fabricated, always traceable back to source data. */
  readonly sourceRefs: readonly string[];
  readonly generatedAtIso: string;
  readonly requiresOwnerDecision: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Operating policy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static governance policy for the Founder OS queue itself. Mirrors S1's
 * `OpportunityPolicyDecision` / S2's `CapabilityRoute` convention of
 * spelling out explicit `false` capability flags rather than leaving an
 * absence of a field to be misread as "allowed".
 */
export interface FounderOperatingPolicy {
  readonly maxOwnerQueueDepth: number;
  readonly maxAgentInternalItemsPerLane: number;
  readonly laneDefaultAuthority: Readonly<Record<FounderWorkLane, FounderWorkAuthority>>;
  readonly autoResolveAllowed: false;
  readonly autoDismissAllowed: false;
  readonly automaticSpendAllowed: false;
  readonly automaticPublishAllowed: false;
  readonly secondDashboardAllowed: false;
}

/**
 * The frozen default policy (freeze §2/§4 S4 gate). `CREDIT_LIFECYCLE` and
 * `SETTLEMENT_ANOMALY` default to `OWNER_ONLY` outright because every item
 * NOVA surfaces there is inherently money-bearing or owned by another
 * domain entirely — there is no "safe to log only" case in those two
 * lanes. `CONTROL_PLANE_ECONOMICS` starts at `AGENT_INTERNAL` because that
 * lane legitimately contains transient/infra control-plane events
 * (`PROVIDER_UNAVAILABLE`, `TELEMETRY_DEGRADED`, `STORE_UNAVAILABLE` — see
 * `nova-agent`/`founder-work-seed`'s `AGENT_LOGGABLE_CONTROL_PLANE_CODES`)
 * that are safe for NOVA to log without an owner; deterministic/money
 * control-plane events (`CONFIGURATION_ERROR`, `BUDGET_BLOCKED`,
 * `AMBIGUOUS_CHARGE`, …) still escalate per-item via
 * `classifyFounderWork`'s `requiresOwnerDecision`/`involvesMoney` signals —
 * escalation in `nova-agent.ts` is monotonic (only ever adds owner
 * involvement), never the reverse.
 */
export const DEFAULT_FOUNDER_OPERATING_POLICY: FounderOperatingPolicy = Object.freeze({
  maxOwnerQueueDepth: 50,
  maxAgentInternalItemsPerLane: 10,
  laneDefaultAuthority: Object.freeze({
    CAPABILITY_GOVERNANCE: "AGENT_INTERNAL",
    SOURCE_INTELLIGENCE: "AGENT_INTERNAL",
    REVENUE_OPPORTUNITY: "AGENT_THEN_OWNER",
    CREDIT_LIFECYCLE: "OWNER_ONLY",
    SETTLEMENT_ANOMALY: "OWNER_ONLY",
    CONTROL_PLANE_ECONOMICS: "AGENT_INTERNAL",
  }),
  autoResolveAllowed: false,
  autoDismissAllowed: false,
  automaticSpendAllowed: false,
  automaticPublishAllowed: false,
  secondDashboardAllowed: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Owner decisions (read-model shape only — S4 never writes these)
// ─────────────────────────────────────────────────────────────────────────────

export type FounderQueueDecisionKind =
  | "ACKNOWLEDGED"
  | "ASSIGNED_TO_AGENT"
  | "APPROVED"
  | "REJECTED"
  | "DEFERRED"
  | "DISMISSED";

/**
 * Actor receipt shape. Deliberately mirrors the settlement domain's
 * OWNER-vs-SYSTEM actor receipt convention
 * (`packages/ingestion-pipeline/src/settlement-decisions.ts`,
 * `OwnerActorReceipt`) so a future swap to the shared `TrustedActor`
 * contract (#159, freeze §3.3) is a type substitution, not a redesign.
 */
export interface FounderQueueActorReceipt {
  readonly actorType: "OWNER" | "SYSTEM";
  readonly subjectId: string;
  readonly observedAtIso: string;
}

/**
 * The read-model shape of one owner (or system-on-owner's-behalf) decision
 * over a `FounderWorkItem`. S4 defines this shape so cockpit pages can
 * render decision history; it does not define how a decision gets
 * persisted or applied — that write path is out of scope for a
 * "read models only" split unit (freeze §4 S4 gate).
 */
export interface FounderQueueDecision {
  readonly id: string;
  readonly workItemId: string;
  readonly decisionKind: FounderQueueDecisionKind;
  readonly actor: FounderQueueActorReceipt;
  readonly reason: string;
  readonly priorState: FounderWorkState;
  readonly nextState: FounderWorkState;
  readonly decidedAtIso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily brief / nightly autopsy
// ─────────────────────────────────────────────────────────────────────────────

export interface FounderLaneSummary {
  readonly lane: FounderWorkLane;
  readonly openCount: number;
  readonly ownerActionRequiredCount: number;
  readonly agentHandledCount: number;
}

/**
 * The one daily read model the Founder OS renders. Every count here is
 * derived, never asserted — `founder-work-seed.ts` is the only place that
 * builds one of these, from real S1/S2/S3 output plus (optionally) real
 * settlement/control-plane read models.
 */
export interface FounderDailyBrief {
  readonly generatedAtIso: string;
  readonly windowStartIso: string;
  readonly windowEndIso: string;
  readonly totalOpenItems: number;
  readonly ownerActionRequiredCount: number;
  readonly agentHandledCount: number;
  readonly laneSummaries: readonly FounderLaneSummary[];
  readonly topPriorityItems: readonly FounderWorkItem[];
  readonly items: readonly FounderWorkItem[];
  readonly settlementAnomalyOpenCount: number;
  readonly controlPlaneConfigurationErrorCount: number;
}

/**
 * Input to a nightly autopsy pass: everything that changed between two
 * `FounderDailyBrief`s, plus the decisions recorded in between. Named after
 * the existing `/cockpit/losses` "autopsy authoring queue" convention —
 * same idea (structured, evidence-first retrospective), applied to the
 * Founder OS queue instead of pick losses. This is an INPUT contract only;
 * S4 ships no autopsy-generation logic, matching "read models only".
 */
export interface NightlyAutopsyInput {
  readonly windowStartIso: string;
  readonly windowEndIso: string;
  readonly priorBrief: FounderDailyBrief | null;
  readonly currentBrief: FounderDailyBrief;
  readonly newWorkItems: readonly FounderWorkItem[];
  readonly resolvedWorkItems: readonly FounderWorkItem[];
  readonly decisions: readonly FounderQueueDecision[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Upstream read-model mirrors (settlement + AI control plane)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Narrow read-model mirrors of upstream contracts NOVA does not own (freeze
 * §2, §3.2). Field names and vocabularies are kept identical to the real
 * owning modules so a future wire-up is a type-import swap, not a rewrite:
 *
 *  - Settlement domain (#161, branch `settlement/evidence-outbox`):
 *    `packages/ingestion-pipeline/src/settlement-decisions.ts` /
 *    `settlement-evidence.ts` — `SettlementAnomalyState` values and
 *    `OwnerDecisionKind` values below match that module's vocabulary
 *    exactly (`OPEN | OWNER_REVIEW | RESOLVED | DISMISSED`;
 *    `ACKNOWLEDGED | WAIT_FOR_SOURCE | MARK_POSTPONED | VOID_PICKS |
 *    DISMISS_ANOMALY | RESOLVE_SCORES_ARRIVED`).
 *  - AI control plane (#162-164, branch `feat/ai-control-plane-contracts`):
 *    `apps/web/lib/ai-control-plane/errors.ts` — `ControlPlaneErrorCode`
 *    below matches that module's `AiErrorCode` union exactly.
 *
 * Neither upstream branch is part of S4's precondition set (S1-S3, freeze
 * §4) and neither is merged anywhere yet — S4 stops at this read-model
 * boundary. `founder-work-seed.ts` accepts these as optional, injectable
 * inputs (empty by default) rather than importing across unmerged branches
 * or fabricating sample data.
 */
export type SettlementAnomalyState = "OPEN" | "OWNER_REVIEW" | "RESOLVED" | "DISMISSED";

export type SettlementOwnerDecisionKind =
  | "ACKNOWLEDGED"
  | "WAIT_FOR_SOURCE"
  | "MARK_POSTPONED"
  | "VOID_PICKS"
  | "DISMISS_ANOMALY"
  | "RESOLVE_SCORES_ARRIVED";

export interface SettlementAnomalyReadModel {
  readonly id: string;
  readonly gameId: string;
  readonly state: SettlementAnomalyState;
  readonly reason: string;
  readonly firstObservedAtIso: string;
  readonly lastSeenAtIso: string;
}

export type ControlPlaneErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "CONFIGURATION_ERROR"
  | "POLICY_BLOCKED"
  | "BUDGET_BLOCKED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_REJECTED"
  | "AMBIGUOUS_CHARGE"
  | "TELEMETRY_DEGRADED"
  | "STORE_UNAVAILABLE";

export interface ControlPlaneConfigurationEventReadModel {
  readonly id: string;
  readonly code: ControlPlaneErrorCode;
  readonly retriable: boolean;
  readonly message: string;
  readonly observedAtIso: string;
}

// Reference so CouncilReviewer stays imported for consumers building
// FounderSubagentRole tables against it (nova-subagents.ts) without every
// caller needing a second import path.
export type { CouncilReviewer };
