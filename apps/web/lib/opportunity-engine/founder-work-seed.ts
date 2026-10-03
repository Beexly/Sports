/**
 * NOVA S4 — Founder OS read-model assembler (read-only).
 *
 * Builds a `FounderDailyBrief` from REAL S1/S2/S3 output — no fabricated
 * numbers, no placeholder rows. Every `FounderWorkItem` this module
 * produces traces back to an actual record: a real capability-inspection
 * recommendation (S2), a real source-registry entry (S3), a real credit
 * grant snapshot (S1) when one is supplied, or a real settlement/
 * control-plane read model when one is supplied. When an upstream input is
 * empty (no snapshots, no anomalies, no control-plane events observed yet —
 * true today, since neither the settlement outbox nor the AI control plane
 * is merged), the corresponding lane is simply empty. Nothing here
 * synthesizes a plausible-looking row to fill a gap.
 *
 * This module performs zero writes: it reads S2/S3's already-loaded static
 * data plus whatever the caller injects, and returns plain data. It does
 * not call `fetch`, does not touch a database, and does not schedule
 * anything.
 */
import {
  getCapabilityGovernanceRecords,
  type CapabilityGovernanceRecord,
} from "./capability-governance";
import { getCapabilityInventory } from "./capability-inventory";
import {
  selectInspectionCandidates,
  type CapabilityInspectionCandidate,
  type CapabilityTaskClass,
  type IneligibleCapabilityRecord,
} from "./capability-governor";
import { DEFAULT_OPPORTUNITY_SOURCES } from "./source-registry";
import type { OpportunitySource } from "./types";
import {
  evaluateCreditSnapshotAdmissibility,
  isCreditGrantSnapshotExpired,
  isCreditGrantSnapshotFresh,
  type CreditGrantSnapshot,
  type CreditScopeRequest,
} from "./credit-snapshot";
import {
  DEFAULT_FOUNDER_OPERATING_POLICY,
  FOUNDER_OPEN_WORK_STATES,
  type ControlPlaneConfigurationEventReadModel,
  type FounderDailyBrief,
  type FounderLaneSummary,
  type FounderOperatingPolicy,
  type FounderWorkItem,
  type FounderWorkLane,
  type SettlementAnomalyReadModel,
} from "./founder-command";
import { classifyFounderWork } from "./nova-agent";

/**
 * The complete `CapabilityTaskClass` union (`capability-governor.ts`). Kept
 * here as an explicit list rather than importing a private constant so this
 * module has no dependency on S2's internal task-preference table shape —
 * only its public function signature.
 */
const ALL_CAPABILITY_TASK_CLASSES: readonly CapabilityTaskClass[] = [
  "GSE_REPOSITORY_IMPLEMENTATION",
  "GSE_PR_REVIEW",
  "GSE_PRODUCT_UI",
  "NOVA_OBSERVABILITY",
  "NOVA_RESEARCH",
  "NOVA_SECURITY",
  "AWS_ARCHITECTURE_AND_CREDITS",
  "FIRST_CASH_SERVICE",
  "LEGAL_AND_AI_GOVERNANCE",
  "CHATGPT_APP_BUILD",
  "LOCAL_CODING_CONTINUITY",
];

function priorityForRiskCount(count: number): FounderWorkItem["priorityBand"] {
  if (count >= 3) return "P0";
  if (count >= 1) return "P1";
  return "P2";
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY_GOVERNANCE lane (S2)
// ─────────────────────────────────────────────────────────────────────────────

interface CapabilityGovernanceWorkInput {
  readonly taskClasses?: readonly CapabilityTaskClass[];
  readonly generatedAtIso: string;
  readonly runId: string;
}

/**
 * Runs S2's `selectInspectionCandidates` across every capability task
 * class and turns HELD candidates and fail-closed INELIGIBLE records into
 * `FounderWorkItem`s. A capability appearing under multiple task classes is
 * collapsed into one item (deduped by capability id) so the queue reflects
 * distinct capabilities, not distinct preference-list appearances.
 */
export function buildCapabilityGovernanceWorkItems(
  input: CapabilityGovernanceWorkInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): readonly FounderWorkItem[] {
  const taskClasses = input.taskClasses ?? ALL_CAPABILITY_TASK_CLASSES;
  const inventory = getCapabilityInventory();
  const governanceRecords = getCapabilityGovernanceRecords();

  const heldById = new Map<string, { candidate: CapabilityInspectionCandidate; taskClasses: string[] }>();
  const ineligibleById = new Map<string, { record: IneligibleCapabilityRecord; taskClasses: string[] }>();

  for (const taskClass of taskClasses) {
    const recommendation = selectInspectionCandidates({
      taskClass,
      generatedAt: input.generatedAtIso,
      runId: `${input.runId}:${taskClass}`,
      inventory,
      governanceRecords,
    });

    for (const held of recommendation.held) {
      const existing = heldById.get(held.capabilityId);
      if (existing) existing.taskClasses.push(taskClass);
      else heldById.set(held.capabilityId, { candidate: held, taskClasses: [taskClass] });
    }
    for (const ineligible of recommendation.ineligible) {
      const existing = ineligibleById.get(ineligible.capabilityId);
      if (existing) existing.taskClasses.push(taskClass);
      else ineligibleById.set(ineligible.capabilityId, { record: ineligible, taskClasses: [taskClass] });
    }
  }

  const items: FounderWorkItem[] = [];

  for (const [capabilityId, { candidate, taskClasses: classes }] of heldById) {
    const classification = classifyFounderWork(
      {
        lane: "CAPABILITY_GOVERNANCE",
        requiresOwnerDecision: true,
        involvesMoney: candidate.riskFlags.includes("FINANCIAL_OR_ACCOUNT_ACTION"),
        involvesExternalAction:
          candidate.riskFlags.includes("DEPLOYMENT_OR_INFRASTRUCTURE") ||
          candidate.riskFlags.includes("EXTERNAL_COMMUNICATION"),
        evidenceIsFailClosed: false,
      },
      policy,
    );
    items.push({
      id: `capability-governance:held:${capabilityId}`,
      lane: "CAPABILITY_GOVERNANCE",
      state: "TRIAGED",
      authority: classification.authority,
      priorityBand: priorityForRiskCount(candidate.riskFlags.length),
      title: `Capability held for inspection: ${candidate.entry.name}`,
      summary: `S2 governor holds "${candidate.entry.name}" (trust tier ${candidate.trustTier}) for task classes: ${classes.join(", ")}.`,
      reasons: [...candidate.reasons, ...classification.reasons],
      sourceRefs: [capabilityId, ...classes],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: true,
    });
  }

  for (const [capabilityId, { record, taskClasses: classes }] of ineligibleById) {
    const failClosedForSupplyChain = record.reasons.includes("UNKNOWN_SUPPLY_CHAIN_STATE");
    const classification = classifyFounderWork(
      {
        lane: "CAPABILITY_GOVERNANCE",
        requiresOwnerDecision: false,
        involvesMoney: false,
        involvesExternalAction: false,
        evidenceIsFailClosed: true,
      },
      policy,
    );
    items.push({
      id: `capability-governance:ineligible:${capabilityId}`,
      lane: "CAPABILITY_GOVERNANCE",
      state: "AGENT_HANDLING",
      authority: classification.authority,
      priorityBand: failClosedForSupplyChain ? "P2" : "P3",
      title: `Capability ineligible for inspection: ${record.name}`,
      summary: `S2 governor fails closed on "${record.name}" for task classes: ${classes.join(", ")}. Reasons: ${record.reasons.join(", ")}.`,
      reasons: [...record.reasons, ...classification.reasons],
      sourceRefs: [capabilityId, ...classes],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: false,
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE_INTELLIGENCE lane (S3)
// ─────────────────────────────────────────────────────────────────────────────

interface SourceIntelligenceWorkInput {
  readonly sources?: readonly OpportunitySource[];
  readonly generatedAtIso: string;
}

/**
 * Surfaces S3 source-registry entries that need owner attention before
 * NOVA may enable them: entries pending terms review, or entries disabled
 * by default. A source with no such flag produces no work item — the queue
 * shows attention-worthy state, not a full inventory dump.
 */
export function buildSourceIntelligenceWorkItems(
  input: SourceIntelligenceWorkInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): readonly FounderWorkItem[] {
  const sources = input.sources ?? DEFAULT_OPPORTUNITY_SOURCES;
  const items: FounderWorkItem[] = [];

  for (const source of sources) {
    if (!source.requiresTermsReview && source.enabledByDefault) continue;

    const reasons: string[] = [];
    if (source.requiresTermsReview) reasons.push("Source requires terms-of-service review before use.");
    if (!source.enabledByDefault) reasons.push("Source is disabled by default.");

    const classification = classifyFounderWork(
      {
        lane: "SOURCE_INTELLIGENCE",
        requiresOwnerDecision: source.requiresTermsReview,
        involvesMoney: false,
        involvesExternalAction: source.requiresTermsReview,
        evidenceIsFailClosed: false,
      },
      policy,
    );

    items.push({
      id: `source-intelligence:${source.id}`,
      lane: "SOURCE_INTELLIGENCE",
      state: source.requiresTermsReview ? "AWAITING_OWNER" : "TRIAGED",
      authority: classification.authority,
      priorityBand: source.requiresTermsReview ? "P2" : "P3",
      title: `Source pending clearance: ${source.name}`,
      summary: `${source.name} (${source.owner}) — ${reasons.join(" ")}`,
      reasons: [...reasons, ...classification.reasons],
      sourceRefs: [source.id],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: source.requiresTermsReview,
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT_LIFECYCLE lane (S1)
// ─────────────────────────────────────────────────────────────────────────────

interface CreditLifecycleWorkInput {
  readonly snapshots?: readonly CreditGrantSnapshot[];
  /**
   * Omit this when there is no specific charge/product being evaluated —
   * `buildCreditLifecycleWorkItems` then runs a scope-independent GENERAL
   * health check (state/expiry/freshness/reconciliation/balance only).
   * There is deliberately no "wildcard" scope request fallback: a fake
   * `product: "*"` request would fail `creditScopeCovers` for every real
   * snapshot (wildcards apply to a grant's OWN eligibility list, never to
   * what is being requested) and flag every healthy grant as unhealthy.
   */
  readonly scopeRequest?: CreditScopeRequest;
  readonly generatedAtIso: string;
}

/** Consumable grant states, exactly S1's `CONSUMABLE_GRANT_STATES`
 *  (`credit-snapshot.ts`, private) — kept in sync by
 *  `nova-credit-state-machines.test.ts` / `nova-founder-work-seed.test.ts`
 *  asserting against the shared conformance fixture. */
const HEALTHY_CONSUMABLE_STATES: ReadonlySet<CreditGrantSnapshot["grantState"]> = new Set([
  "activated",
  "partially_consumed",
]);

/**
 * Scope-independent grant health check: the same fail-closed checks
 * `evaluateCreditSnapshotAdmissibility` runs, minus scope coverage (no
 * charge/product is being evaluated). Reason codes are the exact
 * `CreditAdmissibilityReason` strings so a rendered work item's reasons are
 * never a bespoke vocabulary.
 */
function evaluateGeneralCreditHealth(
  snapshot: CreditGrantSnapshot,
  evaluationAtIso: string,
): { readonly healthy: boolean; readonly reasons: string[] } {
  const reasons: string[] = [];
  if (!HEALTHY_CONSUMABLE_STATES.has(snapshot.grantState)) reasons.push("grant_state_not_consumable");
  if (snapshot.expiresAt === null) reasons.push("grant_expiry_unknown");
  else if (isCreditGrantSnapshotExpired(snapshot, evaluationAtIso)) reasons.push("grant_expired");
  if (!isCreditGrantSnapshotFresh(snapshot, evaluationAtIso)) reasons.push("snapshot_stale");
  if (snapshot.reconciliationState === "drifted") reasons.push("reconciliation_drifted");
  else if (snapshot.reconciliationState === "failed_closed") reasons.push("reconciliation_failed_closed");
  const spendable = snapshot.remainingMinorUnits - snapshot.reservedMinorUnits;
  if (!Number.isSafeInteger(spendable) || spendable <= 0) reasons.push("no_spendable_balance");
  return { healthy: reasons.length === 0, reasons };
}

/**
 * Flags credit-grant snapshots (S1's `CreditGrantSnapshot`, when the caller
 * supplies real ones — S4 has no snapshot data source of its own) that are
 * not healthy: expired, stale, unreconciled against provider records, no
 * spendable balance, or (when a real `scopeRequest` is supplied) not
 * covering the requested scope. Every reason comes straight from S1's
 * fail-closed vocabulary — never re-derived or guessed here.
 */
export function buildCreditLifecycleWorkItems(
  input: CreditLifecycleWorkInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): readonly FounderWorkItem[] {
  const snapshots = input.snapshots ?? [];
  const items: FounderWorkItem[] = [];

  for (const snapshot of snapshots) {
    const admissibility = input.scopeRequest
      ? evaluateCreditSnapshotAdmissibility(snapshot, input.scopeRequest, input.generatedAtIso)
      : (() => {
          const health = evaluateGeneralCreditHealth(snapshot, input.generatedAtIso);
          return { admissible: health.healthy, reasons: health.reasons };
        })();
    if (admissibility.admissible) continue;

    const expired = isCreditGrantSnapshotExpired(snapshot, input.generatedAtIso);
    const stale = !isCreditGrantSnapshotFresh(snapshot, input.generatedAtIso);

    const classification = classifyFounderWork(
      {
        lane: "CREDIT_LIFECYCLE",
        requiresOwnerDecision: true,
        involvesMoney: true,
        involvesExternalAction: false,
        evidenceIsFailClosed: admissibility.reasons.includes("reconciliation_failed_closed"),
      },
      policy,
    );

    items.push({
      id: `credit-lifecycle:${snapshot.grantId}`,
      lane: "CREDIT_LIFECYCLE",
      state: "AWAITING_OWNER",
      authority: classification.authority,
      priorityBand: expired || admissibility.reasons.includes("no_spendable_balance") ? "P1" : "P2",
      title: `Credit grant not admissible: ${snapshot.programId}/${snapshot.grantId}`,
      summary: `Provider ${snapshot.provider}, state ${snapshot.grantState}${expired ? ", expired" : ""}${stale ? ", stale" : ""}. Reasons: ${admissibility.reasons.join(", ")}.`,
      reasons: [...admissibility.reasons, ...classification.reasons],
      sourceRefs: [snapshot.programId, snapshot.applicationId, snapshot.grantId],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: true,
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLEMENT_ANOMALY lane (settlement domain, #161 — NOVA reads only)
// ─────────────────────────────────────────────────────────────────────────────

interface SettlementAnomalyWorkInput {
  readonly anomalies?: readonly SettlementAnomalyReadModel[];
  readonly generatedAtIso: string;
}

/**
 * Surfaces OPEN/OWNER_REVIEW settlement anomalies into the Founder OS
 * queue. `RESOLVED`/`DISMISSED` anomalies are not open work and produce no
 * item — matching the freeze rule that NOVA reads settlement state, it
 * never re-litigates a settlement decision.
 */
export function buildSettlementAnomalyWorkItems(
  input: SettlementAnomalyWorkInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): readonly FounderWorkItem[] {
  const anomalies = input.anomalies ?? [];
  const items: FounderWorkItem[] = [];

  for (const anomaly of anomalies) {
    if (anomaly.state !== "OPEN" && anomaly.state !== "OWNER_REVIEW") continue;

    const classification = classifyFounderWork(
      {
        lane: "SETTLEMENT_ANOMALY",
        requiresOwnerDecision: true,
        involvesMoney: true,
        involvesExternalAction: false,
        evidenceIsFailClosed: false,
      },
      policy,
    );

    items.push({
      id: `settlement-anomaly:${anomaly.id}`,
      lane: "SETTLEMENT_ANOMALY",
      state: anomaly.state === "OPEN" ? "NEW" : "AWAITING_OWNER",
      authority: classification.authority,
      priorityBand: "P1",
      title: `Settlement anomaly: game ${anomaly.gameId}`,
      summary: anomaly.reason,
      reasons: [`Settlement anomaly state: ${anomaly.state}.`, ...classification.reasons],
      sourceRefs: [anomaly.id, anomaly.gameId],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: true,
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL_PLANE_ECONOMICS lane (AI control plane, #162-164 — NOVA reads only)
// ─────────────────────────────────────────────────────────────────────────────

interface ControlPlaneEconomicsWorkInput {
  readonly events?: readonly ControlPlaneConfigurationEventReadModel[];
  readonly generatedAtIso: string;
}

/** Codes that are transient/infra and safe for an agent to log without an
 *  owner decision; everything else escalates. Mirrors the real
 *  `AiControlPlaneError` retriable classification (`errors.ts`):
 *  `PROVIDER_UNAVAILABLE`/`TELEMETRY_DEGRADED`/`STORE_UNAVAILABLE` are the
 *  only retriable codes. */
const AGENT_LOGGABLE_CONTROL_PLANE_CODES: ReadonlySet<string> = new Set([
  "PROVIDER_UNAVAILABLE",
  "TELEMETRY_DEGRADED",
  "STORE_UNAVAILABLE",
]);

/**
 * Surfaces control-plane `ConfigurationError`/budget/override events. Only
 * the deterministic, non-retriable classes (`CONFIGURATION_ERROR`,
 * `POLICY_BLOCKED`, `BUDGET_BLOCKED`, `AMBIGUOUS_CHARGE`, …) require an
 * owner decision; transient infra events are logged for visibility only.
 */
export function buildControlPlaneEconomicsWorkItems(
  input: ControlPlaneEconomicsWorkInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): readonly FounderWorkItem[] {
  const events = input.events ?? [];
  const items: FounderWorkItem[] = [];

  for (const event of events) {
    const agentLoggable = AGENT_LOGGABLE_CONTROL_PLANE_CODES.has(event.code);
    const classification = classifyFounderWork(
      {
        lane: "CONTROL_PLANE_ECONOMICS",
        requiresOwnerDecision: !agentLoggable,
        involvesMoney: event.code === "BUDGET_BLOCKED" || event.code === "AMBIGUOUS_CHARGE",
        involvesExternalAction: false,
        evidenceIsFailClosed: false,
      },
      policy,
    );

    items.push({
      id: `control-plane-economics:${event.id}`,
      lane: "CONTROL_PLANE_ECONOMICS",
      state: agentLoggable ? "AGENT_HANDLING" : "AWAITING_OWNER",
      authority: classification.authority,
      priorityBand: event.code === "AMBIGUOUS_CHARGE" ? "P0" : agentLoggable ? "P3" : "P1",
      title: `Control-plane event: ${event.code}`,
      summary: event.message,
      reasons: [`Control-plane error code: ${event.code} (retriable=${event.retriable}).`, ...classification.reasons],
      sourceRefs: [event.id],
      generatedAtIso: input.generatedAtIso,
      requiresOwnerDecision: !agentLoggable,
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily brief assembly
// ─────────────────────────────────────────────────────────────────────────────

export interface FounderDailyBriefInput {
  readonly now?: Date;
  readonly windowStartIso: string;
  readonly windowEndIso: string;
  readonly runId: string;
  readonly capabilityTaskClasses?: readonly CapabilityTaskClass[];
  readonly sources?: readonly OpportunitySource[];
  readonly creditSnapshots?: readonly CreditGrantSnapshot[];
  readonly creditScopeRequest?: CreditScopeRequest;
  readonly settlementAnomalies?: readonly SettlementAnomalyReadModel[];
  readonly controlPlaneEvents?: readonly ControlPlaneConfigurationEventReadModel[];
  readonly policy?: FounderOperatingPolicy;
  readonly topPriorityCount?: number;
}

const PRIORITY_RANK: Readonly<Record<FounderWorkItem["priorityBand"], number>> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  HELD: 4,
};

function summarizeLane(lane: FounderWorkLane, items: readonly FounderWorkItem[]): FounderLaneSummary {
  const laneItems = items.filter((item) => item.lane === lane);
  const open = laneItems.filter((item) => FOUNDER_OPEN_WORK_STATES.has(item.state));
  return {
    lane,
    openCount: open.length,
    ownerActionRequiredCount: open.filter((item) => item.requiresOwnerDecision).length,
    agentHandledCount: open.filter((item) => item.authority === "AGENT_INTERNAL").length,
  };
}

/**
 * Assembles the one `FounderDailyBrief` the cockpit renders. Pure
 * aggregation over the per-lane builders above — this function does not
 * call a clock unless `now` is omitted (defaulted for caller convenience,
 * exactly like the existing `loadClaudeApiCostsDashboard(now = new Date())`
 * cockpit-loader convention), does no I/O beyond the S2/S3 static-data
 * loaders those builders already call, and performs zero writes.
 */
export function buildFounderDailyBrief(input: FounderDailyBriefInput): FounderDailyBrief {
  const generatedAtIso = (input.now ?? new Date()).toISOString();
  const policy = input.policy ?? DEFAULT_FOUNDER_OPERATING_POLICY;

  const items: FounderWorkItem[] = [
    ...buildCapabilityGovernanceWorkItems(
      { taskClasses: input.capabilityTaskClasses, generatedAtIso, runId: input.runId },
      policy,
    ),
    ...buildSourceIntelligenceWorkItems({ sources: input.sources, generatedAtIso }, policy),
    ...buildCreditLifecycleWorkItems(
      { snapshots: input.creditSnapshots, scopeRequest: input.creditScopeRequest, generatedAtIso },
      policy,
    ),
    ...buildSettlementAnomalyWorkItems({ anomalies: input.settlementAnomalies, generatedAtIso }, policy),
    ...buildControlPlaneEconomicsWorkItems({ events: input.controlPlaneEvents, generatedAtIso }, policy),
  ];

  const openItems = items.filter((item) => FOUNDER_OPEN_WORK_STATES.has(item.state));
  const laneSummaries = ([
    "CAPABILITY_GOVERNANCE",
    "SOURCE_INTELLIGENCE",
    "REVENUE_OPPORTUNITY",
    "CREDIT_LIFECYCLE",
    "SETTLEMENT_ANOMALY",
    "CONTROL_PLANE_ECONOMICS",
  ] as const).map((lane) => summarizeLane(lane, items));

  const topPriorityCount = input.topPriorityCount ?? 10;
  const topPriorityItems = [...openItems]
    .sort((a, b) => PRIORITY_RANK[a.priorityBand] - PRIORITY_RANK[b.priorityBand])
    .slice(0, topPriorityCount);

  return {
    generatedAtIso,
    windowStartIso: input.windowStartIso,
    windowEndIso: input.windowEndIso,
    totalOpenItems: openItems.length,
    ownerActionRequiredCount: openItems.filter((item) => item.requiresOwnerDecision).length,
    agentHandledCount: openItems.filter((item) => item.authority === "AGENT_INTERNAL").length,
    laneSummaries,
    topPriorityItems,
    items,
    settlementAnomalyOpenCount: openItems.filter((item) => item.lane === "SETTLEMENT_ANOMALY").length,
    controlPlaneConfigurationErrorCount: openItems.filter(
      (item) => item.lane === "CONTROL_PLANE_ECONOMICS" && item.requiresOwnerDecision,
    ).length,
  };
}

// Keep `CapabilityGovernanceRecord` referenced so downstream consumers can
// import governance-record shape from this module's public surface if
// needed without a second import path.
export type { CapabilityGovernanceRecord };
