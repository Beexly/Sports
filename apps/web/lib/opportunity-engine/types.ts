/**
 * NOVA Opportunity Engine — domain contracts.
 *
 * The engine separates discovery, evidence, economics, execution authority, and
 * realized outcomes so a promising headline can never become a claimed asset or
 * an authorized external action by implication.
 */

export type OpportunityClass =
  | "ai_model_release"
  | "platform_update"
  | "api_or_data_feed"
  | "developer_tool"
  | "startup_credit"
  | "grant_or_challenge"
  | "affiliate_program"
  | "partnership"
  | "marketplace_channel"
  | "app_product"
  | "data_product"
  | "model_or_training_program"
  | "cost_reduction"
  | "security_or_deprecation"
  | "workflow_arbitrage"
  | "research_signal";

export type RevenueLane =
  | "subscription"
  | "usage_based_api"
  | "data_license"
  | "model_license"
  | "training_data_license"
  | "evaluation_benchmark"
  | "app_marketplace"
  | "workflow_product"
  | "affiliate"
  | "referral"
  | "partnership"
  | "co_sell"
  | "revenue_share"
  | "sponsorship"
  | "professional_service"
  | "research_license"
  | "grant"
  | "agentic_micropayment"
  | "cost_avoidance"
  | "cloud_credit"
  | "none";

export type EvidenceTier =
  | "official_primary"
  | "regulator_or_standards_body"
  | "official_repository_release"
  | "vendor_terms_or_program_rules"
  | "independent_secondary"
  | "community_signal"
  | "unverified_claim";

export type RightsStatus =
  | "cleared"
  | "public_metadata_only"
  | "permission_required"
  | "terms_review_required"
  | "unknown"
  | "blocked";

export type SecurityPosture =
  | "trusted_read_only"
  | "sandbox_required"
  | "security_review_required"
  | "blocked";

export type MoneyState =
  | "not_applicable"
  | "hypothetical"
  | "discovered"
  | "eligibility_unverified"
  | "eligible"
  | "applied"
  | "approved"
  | "activated"
  | "earned"
  | "invoiced"
  | "paid"
  | "expired"
  | "rejected";

/**
 * Per-grant sub-state refinement of `MoneyState` for credit programs, added by
 * S1 per `docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md` §5.2.
 *
 * NOVA owns this vocabulary (freeze §2/§6: the NOVA name wins); the AI control
 * plane's PR-D consumes it read-only through the §3.1 `CreditGrantSnapshot`
 * read-model interface and never redefines it. The snapshot MODEL itself is
 * materialized in the S5 persistence unit — S1 defines only the state
 * vocabulary and its transition rules.
 *
 * Mapping to `MoneyState` (documented invariant, enforced by
 * `moneyStateSupportsCreditGrant()` in `lifecycle.ts`):
 * - A grant existing in ANY `CreditGrantState` presumes its parent
 *   opportunity's `moneyState` has reached at least `"approved"` in
 *   `MONEY_STATE_ORDER`.
 * - Grant consumption progresses forward only:
 *   `approved -> activated -> partially_consumed -> exhausted`.
 * - `"expired"` and `"revoked"` are terminal and reachable from any
 *   non-terminal state; `"exhausted"` is also terminal (fully consumed).
 */
export type CreditGrantState =
  | "approved"
  | "activated"
  | "partially_consumed"
  | "exhausted"
  | "expired"
  | "revoked";

/**
 * Lifecycle of a credit PROGRAM itself (e.g. a cloud provider's startup-credit
 * program), independent of any application NOVA files against it (directive
 * §11.1). A program being `open` never implies money: the money-state ceiling
 * for every program state is at most `"discovered"` — see
 * `creditProgramStateToMoneyState()` in `credit.ts`.
 *
 * - `announced`: published by the provider but not yet accepting applications.
 * - `open`: accepting applications.
 * - `suspended`: temporarily not accepting applications (reversible).
 * - `closed`: current application window closed; may reopen (`closed -> open`).
 * - `discontinued`: terminated by the provider — terminal and absorbing.
 */
export type CreditProgramState =
  | "announced"
  | "open"
  | "suspended"
  | "closed"
  | "discontinued";

/**
 * Lifecycle of ONE application NOVA files against a credit program (directive
 * §11.1). Deliberately reuses `MoneyState` words where the meaning is
 * identical, but the two are NOT interchangeable: this machine ends at
 * `approved` (a success terminal that hands off to `CreditGrantState`),
 * while `MoneyState` continues into activation/earning/invoicing/payment.
 * The explicit adapter is `creditApplicationStateToMoneyState()` in
 * `credit.ts`.
 *
 * Forward chain (one step at a time, no skipping proof-bearing states):
 * `discovered -> eligibility_unverified -> eligible -> applied -> approved`.
 * `rejected`/`expired` are terminal and reachable from any non-terminal state.
 */
export type CreditApplicationState =
  | "discovered"
  | "eligibility_unverified"
  | "eligible"
  | "applied"
  | "approved"
  | "rejected"
  | "expired";

/**
 * Observed provider-side balance record of ONE awarded grant (directive
 * §11.1). Distinct from `CreditGrantState` (NOVA's own consumption ledger
 * view): the balance machine models the provider's operational posture,
 * including the reversible `frozen` hold that `CreditGrantState` and
 * `MoneyState` deliberately cannot represent. Adapter:
 * `creditBalanceStateToMoneyState()` in `credit.ts`.
 *
 * - `provisioned`: balance record exists; credits not yet usable.
 * - `active`: credits usable.
 * - `frozen`: provider hold — reversible back to `active`.
 * - `depleted`: balance reached zero — terminal.
 * - `expired`: validity window passed — terminal.
 * - `revoked`: provider withdrew the balance — terminal.
 */
export type CreditBalanceState =
  | "provisioned"
  | "active"
  | "frozen"
  | "depleted"
  | "expired"
  | "revoked";

/**
 * Lifecycle of ONE earmarked slice of a grant's balance (directive §11.1) —
 * the reservation vocabulary PR-D's admission/reservation port consumes.
 * `MoneyState` cannot represent reservation semantics at all, which is one
 * reason the vocabularies are not interchangeable; adapter:
 * `creditAllocationStateToMoneyState()` in `credit.ts`.
 *
 * "No atomic reservation, no activation" (directive §11.2) is encoded in the
 * transition map: an allocation can never reach `provisional` (usage
 * observed) without first passing through `reserved`.
 *
 * - `available`: earmark exists; not yet reserved.
 * - `reserved`: atomically reserved for a workload.
 * - `provisional`: usage occurred; provider confirmation pending.
 * - `applied_confirmed`: provider confirmed the credit applied. Absorbing
 *   except for `disputed` (post-confirmation reconciliation mismatch).
 * - `released`: slice returned to the pool without (net) consumption —
 *   terminal.
 * - `disputed`: local/provider mismatch under reconciliation (reversible).
 */
export type CreditAllocationState =
  | "available"
  | "reserved"
  | "provisional"
  | "applied_confirmed"
  | "released"
  | "disputed";

export type OpportunityLifecycleState =
  | "observed"
  | "verified"
  | "scored"
  | "proposed"
  | "approved"
  | "prototyping"
  | "validated"
  | "shipped"
  | "measuring"
  | "scaled"
  | "rejected"
  | "expired";

export type OpportunityDisposition =
  | "IMPLEMENT_INTERNAL"
  | "PROTOTYPE_SANDBOX"
  | "RESEARCH_MORE"
  | "OWNER_REVIEW"
  | "WATCH"
  | "QUARANTINE"
  | "REJECT";

export type PriorityBand = "P0" | "P1" | "P2" | "P3" | "HELD";

export type CouncilReviewer =
  | "JARVIS"
  | "NOVA"
  | "METER"
  | "BOBBY"
  | "TAL"
  | "AUDIT"
  | "GAUGE"
  | "RELAY"
  | "Owner";

export type SourceTransport =
  | "rss"
  | "atom"
  | "json_api"
  | "github_releases"
  | "html_changelog"
  | "webhook"
  | "manual_snapshot";

export type SourceAuthority =
  | "official_vendor"
  | "official_program"
  | "official_registry"
  | "standards_body"
  | "research_repository"
  | "independent_publication"
  | "community";

export interface OpportunitySource {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly url: string;
  readonly transport: SourceTransport;
  readonly authority: SourceAuthority;
  readonly evidenceTier: EvidenceTier;
  readonly classes: readonly OpportunityClass[];
  readonly cadence: "event" | "hourly" | "daily" | "weekly" | "manual";
  readonly rightsStatus: RightsStatus;
  readonly allowedCapture: readonly string[];
  readonly prohibitedCapture: readonly string[];
  readonly requiresTermsReview: boolean;
  readonly enabledByDefault: boolean;
  readonly notes: string;
}

export interface OpportunityEvidence {
  readonly id: string;
  readonly sourceId: string;
  readonly tier: EvidenceTier;
  readonly title: string;
  readonly url: string;
  readonly observedAt: string;
  readonly publishedAt?: string;
  readonly effectiveAt?: string;
  readonly expiresAt?: string;
  /** Hash/fingerprint of the observed source representation, not copied content. */
  readonly contentFingerprint: string;
  readonly supports: readonly string[];
  readonly contradicts?: readonly string[];
  readonly rightsStatus: RightsStatus;
  readonly directEvidence: boolean;
}

export interface EconomicRange {
  readonly low: number;
  readonly high: number;
  readonly currency: "USD";
  readonly period: "one_time" | "monthly" | "annual";
  readonly basis: "official_terms" | "measured" | "scenario" | "unknown";
}

export interface OpportunityEconomics {
  readonly moneyState: MoneyState;
  /** Revenue and savings remain ranges; null means there is no defensible estimate. */
  readonly potentialRevenue?: EconomicRange | null;
  readonly potentialSavings?: EconomicRange | null;
  readonly availableCredits?: EconomicRange | null;
  readonly requiredCashUsd: number;
  readonly requiredOwnerHours: number;
  readonly expectedDaysToFirstEvidence: number;
  readonly expectedDaysToCash: number | null;
  readonly recurringPotential: boolean;
  readonly eligibilityRequirements: readonly string[];
  readonly economicAssumptions: readonly string[];
}

/** Each score is an integer from 0 (none/worst) to 5 (exceptional/highest). */
export interface OpportunitySignals {
  readonly strategicFit: number;
  readonly evidenceStrength: number;
  readonly revenuePotential: number;
  readonly timeToValue: number;
  readonly recurringLeverage: number;
  readonly dataFlywheel: number;
  readonly distributionLeverage: number;
  readonly costReduction: number;
  readonly defensibility: number;
  readonly reversibility: number;
  readonly learningValue: number;
  readonly urgency: number;
}

/** Each risk is an integer from 0 (none) to 5 (critical/highest). */
export interface OpportunityRisks {
  readonly cashRisk: number;
  readonly ownerTimeRisk: number;
  readonly implementationComplexity: number;
  readonly legalRisk: number;
  readonly securityRisk: number;
  readonly dataRightsRisk: number;
  readonly vendorLockInRisk: number;
  readonly volatilityRisk: number;
}

export interface OpportunityCandidate {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly opportunityClass: OpportunityClass;
  readonly revenueLanes: readonly RevenueLane[];
  readonly targetProjects: readonly string[];
  readonly observedAt: string;
  readonly effectiveAt?: string;
  readonly expiresAt?: string;
  readonly lifecycleState: OpportunityLifecycleState;
  readonly evidence: readonly OpportunityEvidence[];
  readonly economics: OpportunityEconomics;
  readonly signals: OpportunitySignals;
  readonly risks: OpportunityRisks;
  readonly rightsStatus: RightsStatus;
  readonly securityPosture: SecurityPosture;
  readonly requiresExternalAction: boolean;
  readonly requiresCredentials: boolean;
  readonly involvesDataSharing: boolean;
  readonly involvesModelTraining: boolean;
  readonly jurisdictionSensitive: boolean;
  readonly proposedActions: readonly string[];
  readonly tags: readonly string[];
}

export interface EvidenceAssessment {
  readonly evidenceScore: number;
  readonly primaryEvidenceCount: number;
  readonly independentEvidenceCount: number;
  readonly hasMoneyClaimEvidence: boolean;
  readonly hasContradiction: boolean;
  readonly stale: boolean;
  readonly missingClaims: readonly string[];
}

export interface OpportunityScore {
  readonly positiveScore: number;
  readonly riskScore: number;
  readonly netScore: number;
  readonly priorityBand: PriorityBand;
  readonly confidence: "LOW" | "MEDIUM" | "HIGH";
  readonly reasons: readonly string[];
}

export interface OpportunityPolicyDecision {
  readonly disposition: OpportunityDisposition;
  readonly blockedReasons: readonly string[];
  readonly requiredReviews: readonly CouncilReviewer[];
  readonly externalActionsAllowed: false;
  readonly automaticInstallAllowed: false;
  readonly automaticSpendAllowed: false;
  readonly automaticPublishAllowed: false;
}

export interface ExperimentBudget {
  readonly maxCashUsd: number;
  readonly maxOwnerHours: number;
  readonly maxCalendarDays: number;
  readonly maxPremiumModelCalls: number;
}

export interface OpportunityExperiment {
  readonly candidateId: string;
  readonly hypothesis: string;
  readonly smallestTest: string;
  readonly successCriteria: readonly string[];
  readonly failureCriteria: readonly string[];
  readonly evidenceToCapture: readonly string[];
  readonly rollbackPlan: string;
  readonly budget: ExperimentBudget;
  readonly sandboxRequired: boolean;
  readonly ownerApprovalRequiredBeforeExternalAction: true;
}

export interface OpportunityDecision {
  readonly candidate: OpportunityCandidate;
  readonly evidence: EvidenceAssessment;
  readonly score: OpportunityScore;
  readonly policy: OpportunityPolicyDecision;
  readonly experiment: OpportunityExperiment | null;
  readonly generatedAt: string;
}

export interface OpportunityObservation {
  readonly sourceId: string;
  readonly externalId: string;
  readonly title: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly observedAt: string;
  readonly contentFingerprint: string;
  readonly labels: readonly string[];
}

export type ChangeKind = "NEW" | "UPDATED" | "UNCHANGED" | "REMOVED";

export interface MaterialChange {
  readonly key: string;
  readonly kind: ChangeKind;
  readonly previous: OpportunityObservation | null;
  readonly current: OpportunityObservation | null;
  readonly materiality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly reasons: readonly string[];
}

export interface OpportunityOutcome {
  readonly candidateId: string;
  readonly opportunityClass: OpportunityClass;
  readonly sourceIds: readonly string[];
  readonly measuredAt: string;
  readonly success: boolean;
  readonly shipped: boolean;
  readonly rolledBack: boolean;
  readonly actualCashCostUsd: number;
  readonly actualOwnerHours: number;
  readonly actualDaysToFirstEvidence: number;
  readonly revenue30dUsd: number;
  readonly savings30dUsd: number;
  readonly predictedSuccessProbability: number;
  readonly notes: readonly string[];
}

export interface LearningBucket {
  readonly key: string;
  readonly sampleSize: number;
  readonly successRate: number;
  readonly meanBrierScore: number;
  readonly meanRevenue30dUsd: number;
  readonly meanSavings30dUsd: number;
  readonly rollbackRate: number;
}

export interface LearningReport {
  readonly generatedAt: string;
  readonly overall: LearningBucket;
  readonly byClass: readonly LearningBucket[];
  readonly bySource: readonly LearningBucket[];
  readonly recommendations: readonly string[];
  /** Recommendations are advisory only; no production weights are changed here. */
  readonly weightChangesApplied: false;
}

export interface OpportunityPortfolio {
  readonly generatedAt: string;
  readonly decisions: readonly OpportunityDecision[];
  readonly activeExperiments: readonly OpportunityDecision[];
  readonly ownerQueue: readonly OpportunityDecision[];
  readonly researchQueue: readonly OpportunityDecision[];
  readonly watchQueue: readonly OpportunityDecision[];
  readonly quarantined: readonly OpportunityDecision[];
  readonly rejected: readonly OpportunityDecision[];
  readonly capacity: {
    readonly maxConcurrentExperiments: number;
    readonly selectedExperiments: number;
  };
}
