/**
 * Domain contracts for GX-000/GG-001 (docs/genesis/FIRST_BUILD_CONTRACT.md §7,
 * cross-checked against docs/genesis/CODEBASE_TWIN_SPEC.md and
 * META_COMPILER_SPEC.md — see docs/frontier/GENESIS_CONVERGENCE_MAP.md §5 for
 * the ruling that this ONE package satisfies both the GX-000 and GG-001
 * queues). The two spec docs describe a materially richer eventual system
 * (30 plan-node classes, a 14-state capability vocabulary, a much larger
 * IntelligenceContract); this file implements the FIRST_BUILD_CONTRACT.md §7
 * v0 SUBSET exactly — the binding, fixture-tested contract — and is designed
 * for extension, not pretending to be complete (Twin spec §12 / Metacortex
 * spec §11's own v0 boundary).
 */

// ── Capability state vocabulary (§7.1, exact 12) ────────────────────────────

export type CapabilityState =
  | "DOCTRINE_ONLY"
  | "SPECIFIED"
  | "TYPED_ONLY"
  | "IMPLEMENTED_PURE"
  | "IMPLEMENTED_PERSISTED"
  | "SHADOW_ONLY"
  | "FOUNDER_GATED"
  | "LIVE_INTERNAL"
  | "LIVE_PUBLIC"
  | "STRANDED_BRANCH"
  | "SUPERSEDED"
  | "UNKNOWN";

/**
 * Which audiences/uses may EXECUTE a capability in a given state. Fail
 * closed: any state not listed for an audience is ineligible for it.
 * FOUNDER_GATED is technically executable for COCKPIT_DRAFT but forces the
 * plan decision to OWNER_GATE rather than a plain SELECTED (see
 * plan-compiler.ts) — never silently treated as ordinary SELECTED.
 */
export const STATE_ELIGIBILITY: Readonly<Record<AudienceClass, readonly CapabilityState[]>> = {
  COCKPIT_DRAFT: [
    "IMPLEMENTED_PURE",
    "IMPLEMENTED_PERSISTED",
    "SHADOW_ONLY",
    "LIVE_INTERNAL",
    "LIVE_PUBLIC",
    "FOUNDER_GATED",
  ],
  LIVE_INTERNAL: ["IMPLEMENTED_PERSISTED", "LIVE_INTERNAL", "LIVE_PUBLIC"],
  PUBLIC: ["LIVE_PUBLIC"],
};

/** States that force a plan decision toward OWNER_GATE rather than SELECTED. */
export const OWNER_GATE_STATES: readonly CapabilityState[] = ["FOUNDER_GATED"];

/** Never executable for ANY audience, regardless of the table above. */
export const NEVER_EXECUTABLE_STATES: readonly CapabilityState[] = [
  "DOCTRINE_ONLY",
  "SPECIFIED",
  "TYPED_ONLY",
  "STRANDED_BRANCH",
  "SUPERSEDED",
  "UNKNOWN",
];

export function isCapabilityStateEligible(state: CapabilityState, audience: AudienceClass): boolean {
  if (NEVER_EXECUTABLE_STATES.includes(state)) return false;
  return STATE_ELIGIBILITY[audience].includes(state);
}

// ── Capability descriptor (§7.1) — the Codebase Twin's evidence shape ───────

export type CapabilityKind =
  | "SOURCE"
  | "TRANSFORM"
  | "DERIVED_MEASUREMENT"
  | "MODEL"
  | "SIMULATION"
  | "AGENT"
  | "HUMAN_REVIEW"
  | "PROOF"
  | "RENDERER";

export interface TypeRef {
  readonly name: string;
  readonly sportsIrPrimitive?: string;
}

export interface ExecutionProfile {
  readonly placement: string;
  readonly estimatedCostUsd: number;
  readonly estimatedLatencyMs: number;
}

export interface CapabilityPolicy {
  readonly requiresClearance: boolean;
  readonly publicationBoundary: AudienceClass;
  readonly dataClass: PrivacyDataClass;
}

export interface CapabilityEconomics {
  readonly costUsdPerCall: number;
  readonly latencyMsP50: number;
}

export interface UncertaintyEffect {
  readonly reducesUncertainty: boolean;
  readonly note: string;
}

export interface CapabilityProvenance {
  /** Repo-relative path(s) or a "PR #N @ sha" string — never an absolute path or env value. */
  readonly evidence: readonly string[];
  readonly verifiedAt: string;
}

export interface GenesisCapability {
  readonly id: string;
  readonly version: string;
  readonly kind: CapabilityKind;
  readonly purpose: string;
  readonly owner: string;
  readonly implementationState: CapabilityState;
  readonly inputs: readonly TypeRef[];
  readonly outputs: readonly TypeRef[];
  readonly executionProfiles: readonly ExecutionProfile[];
  readonly policy: CapabilityPolicy;
  readonly economics: CapabilityEconomics;
  readonly uncertaintyEffect?: UncertaintyEffect;
  readonly tests: readonly string[];
  readonly provenance: CapabilityProvenance;
}

// ── Intelligence Contract (§7.2 — the v0 subset the fixture actually uses) ──

export type AudienceClass = "PUBLIC" | "LIVE_INTERNAL" | "COCKPIT_DRAFT";
export type PrivacyDataClass = "INTERNAL_NON_PERSONAL" | "PERSONAL" | "LICENSED";
export type RetentionPolicy = "EPHEMERAL" | "BOUNDED" | "PERSISTENT";

export interface OutputRequirement {
  readonly type: string;
  readonly schemaVersion: string;
  readonly requiresSourceAttribution: boolean;
}

export interface TemporalCutoff {
  readonly mode: "KNOWLEDGE_TIME" | "VALID_TIME";
  readonly asOf: string;
}

export interface EvidencePolicy {
  readonly minimumTier: 1 | 2 | 3;
  readonly requireClearance: boolean;
  readonly allowSyntheticEvidence: boolean;
  readonly requireIndependentOrigins: number;
}

export interface PrivacyPolicy {
  readonly dataClass: PrivacyDataClass;
  readonly remoteExecutionAllowed: boolean;
  readonly retention: RetentionPolicy;
}

export interface UncertaintyPolicy {
  readonly allowAbstention: boolean;
  readonly requireLimitationDisclosure: boolean;
  readonly maximumUnsupportedClaimCount: number;
}

export interface ProofRequirement {
  readonly requirePlanReceipt: boolean;
  readonly requireCapabilityRevisions: boolean;
  readonly requireInputHashes: boolean;
}

export interface ResourceBudget {
  readonly maximumCostUsd: number;
  readonly maximumLatencyMs: number;
  readonly maximumExternalCalls: number;
}

export interface IntelligenceContract {
  readonly contractId: string;
  readonly version: string;
  readonly question: string;
  readonly requiredOutputs: readonly OutputRequirement[];
  readonly temporalCutoff: TemporalCutoff;
  readonly evidencePolicy: EvidencePolicy;
  readonly privacy: PrivacyPolicy;
  readonly uncertainty: UncertaintyPolicy;
  readonly proof: ProofRequirement;
  readonly budget: ResourceBudget;
  readonly audience: AudienceClass;
}

/** Quality floor derived from evidencePolicy.minimumTier — a HARD constraint
 *  (never a utility term, so a cheap plan can never buy its way past it). */
export const QUALITY_FLOOR_BY_TIER: Readonly<Record<1 | 2 | 3, number>> = { 1: 0.7, 2: 0.8, 3: 0.9 };

// ── Candidate capability (the fixture shape a plan candidate is built from) ─

export type FixtureCapabilityKind = "SOURCE" | "MODEL" | "HUMAN_REVIEW";

/**
 * Mirrors docs/genesis/fixtures/capability-candidates.example.json exactly.
 * `hardPolicyEligible`/`hardPolicyFailure` are EXPECTED-OUTCOME metadata the
 * fixture author annotated — the planner must independently RECOMPUTE
 * eligibility from the raw fields below and never read these two as inputs
 * (see hard-constraints.ts); tests assert the recomputation reproduces them.
 */
export interface FixtureCapabilityCandidate {
  readonly id: string;
  readonly version: string;
  readonly kind: FixtureCapabilityKind;
  readonly implementationState: CapabilityState;
  readonly permittedAudiences: readonly AudienceClass[];
  readonly requiresVettedEvidence: boolean;
  readonly remoteExecution: boolean;
  readonly estimatedCostUsd: number;
  readonly estimatedLatencyMs: number;
  readonly qualityClass: number;
  readonly hardPolicyEligible: boolean;
  readonly hardPolicyFailure?: string;
  readonly abstentionFallback?: boolean;
}

// ── Candidate plan (§7.3) ────────────────────────────────────────────────────

export interface PlanNode {
  readonly nodeId: string;
  readonly kind: string;
  readonly capabilityId: string;
  readonly capabilityRevision: string;
}

export interface PlanEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: "DATA" | "CONTROL" | "PROOF" | "POLICY";
}

export interface Assumption {
  readonly id: string;
  readonly statement: string;
}

export interface ConstraintResult {
  readonly constraint: string;
  readonly satisfied: boolean;
  readonly reason: string;
}

export interface PlanEstimate {
  readonly costUsd: number;
  readonly latencyMs: number;
  readonly qualityClass: number;
  readonly utility: number | null;
}

export interface CandidatePlan {
  readonly planId: string;
  readonly contractId: string;
  readonly nodes: readonly PlanNode[];
  readonly edges: readonly PlanEdge[];
  readonly assumptions: readonly Assumption[];
  readonly hardConstraintResults: readonly ConstraintResult[];
  readonly estimate: PlanEstimate;
}

export interface RejectedPlan {
  readonly plan: CandidatePlan;
  readonly failedConstraints: readonly string[];
}

// ── Proof obligations (typed, not bare strings) ─────────────────────────────

export type ProofObligation =
  | { readonly type: "PLAN_RECEIPT" }
  | { readonly type: "CAPABILITY_REVISIONS"; readonly revisions: Readonly<Record<string, string>> }
  | {
      readonly type: "INPUT_HASHES";
      readonly contractHash: string;
      readonly candidateSetHash: string;
      readonly codebaseTwinHash: string;
    };

// ── Plan receipt (§7.4) ──────────────────────────────────────────────────────

export type PlanDecision = "SELECTED" | "ABSTAINED" | "NO_VALID_PLAN" | "OWNER_GATE";

export interface PlanReceipt {
  readonly receiptVersion: string;
  readonly plannerVersion: string;
  readonly generatedAt: string;
  readonly repositoryCommit: string;
  readonly codebaseTwinHash: string;
  readonly contractHash: string;
  readonly selectedPlan: CandidatePlan | null;
  readonly rejectedPlans: readonly RejectedPlan[];
  readonly decision: PlanDecision;
  readonly proofObligations: readonly ProofObligation[];
  readonly utilityFunction: string;
  readonly receiptHash: string;
}

// ── Version constants ────────────────────────────────────────────────────────

export const RECEIPT_VERSION = "genesis-kernel-receipt/v0" as const;
export const PLANNER_VERSION = "genesis-kernel-planner/v0" as const;
export const UTILITY_FUNCTION = "GENESIS_UTILITY_V0" as const;
