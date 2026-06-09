// Shared contracts for the GSE source-provenanced decision OS.
// These types are intentionally storage-agnostic: they can back docs, fixtures,
// API projections, cockpit views, and future database models without changing
// current scoring behavior.

export type IsoTimestamp = string;

export type SourceTier = 1 | 2 | 3 | 4 | 5 | 6;

export type SourceLegalState =
  | "APPROVED"
  | "APPROVED_DERIVED_ONLY"
  | "REQUIRES_CONTRACT"
  | "REQUIRES_USER_EXPORT"
  | "BLOCKED_TOS"
  | "BLOCKED_UNKNOWN";

export type SourceActivationState =
  | "ACTIVE"
  | "SHADOW_ONLY"
  | "BLOCKED_MISSING_SOURCE"
  | "BLOCKED_STALE"
  | "BLOCKED_LOW_TRUST"
  | "BLOCKED_LEGAL"
  | "BLOCKED_SMALL_SAMPLE";

export type SourceFreshnessStatus = "FRESH" | "AGING" | "STALE" | "MISSING";

export type PublicSurface =
  | "PUBLIC"
  | "FREE"
  | "PRO"
  | "ELITE"
  | "FOUNDER"
  | "COCKPIT";

export type TrustUiState =
  | "VERIFIED"
  | "SOURCE_BACKED"
  | "DERIVED_CONTEXT"
  | "HYPOTHETICAL"
  | "STALE"
  | "CONTRADICTED"
  | "LOW_TRUST"
  | "BLOCKED"
  | "FOUNDER_ONLY";

export type ChangeEventSeverity = "INFO" | "WATCH" | "MATERIAL" | "CRITICAL";

export type ChangeEventDomain =
  | "MARKET"
  | "WEATHER"
  | "INJURY"
  | "ROSTER"
  | "PLAYER_ROLE"
  | "NEWS_CLAIM"
  | "SOURCE_STATE"
  | "OPTIMIZER_INPUT"
  | "SCENARIO";

export type ClaimState =
  | "UNREVIEWED"
  | "CORROBORATED"
  | "CONTRADICTED"
  | "OFFICIAL"
  | "REJECTED"
  | "EXPIRED";

export interface SourceRegistryRecord {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceFamily: string;
  readonly tier: SourceTier;
  readonly legalState: SourceLegalState;
  readonly defaultFreshnessTtlSec: number;
  readonly allowedSurfaces: readonly PublicSurface[];
  readonly requiresAttribution: boolean;
  readonly canStoreRawPayload: boolean;
  readonly notes?: string;
}

export interface SourceRun {
  readonly sourceId: string;
  readonly runId: string;
  readonly retrievedAt: IsoTimestamp;
  readonly transformVersion: string;
  readonly payloadHash?: string;
  readonly legalState: SourceLegalState;
  readonly freshnessTtlSec: number;
}

export interface FeatureProvenance {
  readonly featureKey: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceTier: SourceTier;
  readonly sourceRunId?: string;
  readonly retrievedAt: IsoTimestamp | null;
  readonly transformVersion: string;
  readonly freshnessStatus: SourceFreshnessStatus;
  readonly activationState: SourceActivationState;
  readonly legalState: SourceLegalState;
  readonly confidence: number;
  readonly sampleSize?: number | null;
  readonly allowedSurfaces: readonly PublicSurface[];
  readonly whyUsedOrBlocked: string;
}

export interface DecisionTrace {
  readonly decisionId: string;
  readonly modelVersion: string;
  readonly generatedAt: IsoTimestamp;
  readonly surface: PublicSurface;
  readonly features: readonly FeatureProvenance[];
  readonly hypothetical: boolean;
  readonly summary: string;
}

export interface ChangeEvent {
  readonly eventId: string;
  readonly domain: ChangeEventDomain;
  readonly severity: ChangeEventSeverity;
  readonly entityRefs: readonly string[];
  readonly occurredAt: IsoTimestamp;
  readonly detectedAt: IsoTimestamp;
  readonly beforeValue?: unknown;
  readonly afterValue?: unknown;
  readonly source: FeatureProvenance;
  readonly publicSafeSummary: string;
  readonly cockpitSummary: string;
}

export interface ScenarioOverride {
  readonly key: string;
  readonly label: string;
  readonly domain: ChangeEventDomain;
  readonly value: unknown;
  readonly reason: string;
}

export interface ScenarioState {
  readonly scenarioId: string;
  readonly baselineDecisionId: string;
  readonly createdAt: IsoTimestamp;
  readonly createdBy: "USER" | "FOUNDER" | "SYSTEM_FIXTURE";
  readonly overrides: readonly ScenarioOverride[];
  readonly trace: DecisionTrace;
}

export interface ClaimCard {
  readonly claimId: string;
  readonly claimType: string;
  readonly state: ClaimState;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceTier: SourceTier;
  readonly madeAt: IsoTimestamp;
  readonly retrievedAt: IsoTimestamp;
  readonly entityRefs: readonly string[];
  readonly summary: string;
  readonly attribution: string;
  readonly publicSafe: boolean;
  readonly contradictionIds: readonly string[];
}

export type CoachRole =
  | "HEAD_COACH"
  | "OFFENSIVE_COORDINATOR"
  | "DEFENSIVE_COORDINATOR"
  | "SPECIAL_TEAMS_COORDINATOR"
  | "OFFENSIVE_ASSISTANT"
  | "DEFENSIVE_ASSISTANT"
  | "POSITION_COACH";

export type SchemeSide = "OFFENSE" | "DEFENSE";

export type TendencyBias =
  | "PASS_HEAVY"
  | "RUN_HEAVY"
  | "BALANCED"
  | "INSUFFICIENT_SAMPLE";

export type PlayCallSituation =
  | "ALL_NEUTRAL"
  | "EARLY_DOWN_NEUTRAL"
  | "THIRD_DOWN"
  | "THIRD_AND_SHORT"
  | "THIRD_AND_MEDIUM"
  | "THIRD_AND_LONG"
  | "RED_ZONE"
  | "TRAILING"
  | "LEADING"
  | "VS_RUN_HEAVY_DEFENSE"
  | "VS_PASS_HEAVY_DEFENSE"
  | "TWO_MINUTE";

export interface CoachStaffAssignment {
  readonly coachId: string;
  readonly coachName: string;
  readonly team: string;
  readonly season: number;
  readonly role: CoachRole;
  readonly side?: SchemeSide;
  readonly title: string;
  readonly startedAt?: IsoTimestamp;
  readonly endedAt?: IsoTimestamp | null;
  readonly source: FeatureProvenance;
}

export interface PlayCallSplit {
  readonly situation: PlayCallSituation;
  readonly passRate: number;
  readonly rushRate: number;
  readonly sampleSize: number;
  readonly seasons: readonly number[];
  readonly confidence: number;
}

export interface SchemeTendencyProfile {
  readonly profileId: string;
  readonly coachId: string;
  readonly coachName: string;
  readonly team: string;
  readonly side: SchemeSide;
  readonly role: CoachRole;
  readonly seasonRange: readonly number[];
  readonly primarySchemeFamily: string;
  readonly playCallerConfidence: number;
  readonly splits: readonly PlayCallSplit[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly source: FeatureProvenance;
}

export type SignalDomain =
  | "ODDS"
  | "SCORES"
  | "SCHEDULE"
  | "PLAYER_PROFILE"
  | "PLAYER_STATS"
  | "PLAYER_PARTICIPATION"
  | "INJURY"
  | "DEPTH_CHART"
  | "ROSTER_TRANSACTION"
  | "COACH_STAFF"
  | "SCHEME_TENDENCY"
  | "OFFICIALS"
  | "OFFICIATING_TENDENCY"
  | "STADIUM"
  | "WEATHER"
  | "WIND"
  | "SURFACE_ROOF"
  | "MARKET_PROPS"
  | "DFS_SALARIES"
  | "DFS_OWNERSHIP"
  | "FANTASY_ADP"
  | "BEAT_REPORTER"
  | "ANALYST_RANKINGS"
  | "NEWS_CLAIM"
  | "COMMUNITY_WEAK_SIGNAL"
  | "MODEL_OUTPUT"
  | "AUTONOMOUS_SYSTEM_HEALTH";

export type SignalCriticality = "P0" | "P1" | "P2" | "P3";

export type SourceHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "STALE"
  | "UNAVAILABLE"
  | "SUSPENDED"
  | "RETIRED"
  | "UNKNOWN";

export type FallbackMode =
  | "PRIMARY"
  | "SECONDARY"
  | "TERTIARY"
  | "MANUAL_REVIEW"
  | "SHADOW_ONLY"
  | "DISABLED";

export type NoDataPolicy =
  | "WITHHOLD"
  | "MANUAL_REVIEW"
  | "SHADOW_ONLY"
  | "ALLOW_STALE_WITH_BADGE";

export type FallbackChainStatus =
  | "READY"
  | "DEGRADED"
  | "NO_SOURCE"
  | "BLOCKED_LEGAL"
  | "MANUAL_REVIEW_REQUIRED";

export interface SourceFallbackStep {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly mode: FallbackMode;
  readonly domains: readonly SignalDomain[];
  readonly legalState: SourceLegalState;
  readonly healthStatus: SourceHealthStatus;
  readonly activationState: SourceActivationState;
  readonly confidence: number;
  readonly retrievedAt: IsoTimestamp | null;
  readonly freshnessTtlSec: number;
  readonly notes?: string;
}

export interface SourceFallbackChain {
  readonly chainId: string;
  readonly domain: SignalDomain;
  readonly criticality: SignalCriticality;
  readonly noDataPolicy: NoDataPolicy;
  readonly steps: readonly SourceFallbackStep[];
}

export interface SourceFallbackEvaluation {
  readonly chainId: string;
  readonly domain: SignalDomain;
  readonly status: FallbackChainStatus;
  readonly activeSourceId: string | null;
  readonly publicSafe: boolean;
  readonly reason: string;
}

export type CoverageState =
  | "COVERED"
  | "DEGRADED"
  | "BLIND_SPOT"
  | "MANUAL_REVIEW_REQUIRED";

export interface IntelligenceCoverageRequirement {
  readonly requirementId: string;
  readonly domain: SignalDomain;
  readonly criticality: SignalCriticality;
  readonly minActiveSources: number;
  readonly maxStalenessSec: number;
  readonly allowedSurfaces: readonly PublicSurface[];
  readonly description: string;
}

export interface DomainCoverageSnapshot {
  readonly requirementId: string;
  readonly domain: SignalDomain;
  readonly checkedAt: IsoTimestamp;
  readonly activeSourceCount: number;
  readonly freshestRetrievedAt: IsoTimestamp | null;
  readonly staleSourceCount: number;
  readonly blockedSourceCount: number;
  readonly manualReviewOpen: boolean;
  readonly notes?: string;
}

export interface CoverageEvaluation {
  readonly requirementId: string;
  readonly domain: SignalDomain;
  readonly state: CoverageState;
  readonly reason: string;
}

export type AutonomousSystemKind =
  | "INGESTION_WORKER"
  | "PICK_GENERATION_WORKER"
  | "SETTLEMENT_WORKER"
  | "CONTENT_DRAFT_WORKER"
  | "SOURCE_HEALTH_MONITOR"
  | "SYNTHETIC_MONITOR"
  | "CLAIM_GOVERNANCE_SCANNER"
  | "COST_MONITOR"
  | "DEBUG_TRACE_COLLECTOR"
  | "CLAUDE_HANDOFF_RUNNER";

export type AutonomousSystemStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "STALE"
  | "FAILED"
  | "PAUSED"
  | "UNKNOWN";

export interface AutonomousSystemRun {
  readonly systemId: string;
  readonly systemName: string;
  readonly kind: AutonomousSystemKind;
  readonly status: AutonomousSystemStatus;
  readonly startedAt: IsoTimestamp;
  readonly completedAt: IsoTimestamp | null;
  readonly lastHeartbeatAt: IsoTimestamp | null;
  readonly checkedAt: IsoTimestamp;
  readonly expectedCadenceSec: number;
  readonly consecutiveFailures: number;
  readonly maxAllowedFailures: number;
  readonly ownerSurface: PublicSurface;
  readonly canAutoRecover: boolean;
  readonly lastError?: string | null;
  readonly telemetryTraceId?: string | null;
  readonly runbookUrl?: string | null;
}

export interface ControlPlaneSummary {
  readonly overallStatus: AutonomousSystemStatus;
  readonly healthySystems: number;
  readonly degradedSystems: number;
  readonly failedSystems: number;
  readonly staleSystems: number;
  readonly coveredDomains: number;
  readonly blindSpots: number;
  readonly manualReviewCount: number;
  readonly recommendedActions: readonly string[];
}

export interface ControlPlaneSnapshot {
  readonly snapshotId: string;
  readonly generatedAt: IsoTimestamp;
  readonly systems: readonly AutonomousSystemRun[];
  readonly coverage: readonly CoverageEvaluation[];
  readonly fallbackChains: readonly SourceFallbackEvaluation[];
}

export function isFounderSurface(surface: PublicSurface): boolean {
  return surface === "FOUNDER" || surface === "COCKPIT";
}

export function isFeatureAllowedOnSurface(
  feature: FeatureProvenance,
  surface: PublicSurface
): boolean {
  return feature.allowedSurfaces.includes(surface) || (
    isFounderSurface(surface) && feature.allowedSurfaces.some(isFounderSurface)
  );
}

export function isFeaturePublicSafe(feature: FeatureProvenance): boolean {
  return (
    feature.activationState === "ACTIVE" &&
    feature.freshnessStatus !== "STALE" &&
    feature.freshnessStatus !== "MISSING" &&
    feature.legalState !== "BLOCKED_TOS" &&
    feature.legalState !== "BLOCKED_UNKNOWN" &&
    feature.sourceTier <= 4
  );
}

export function getTrustUiState(feature: FeatureProvenance): TrustUiState {
  if (feature.activationState === "SHADOW_ONLY") return "FOUNDER_ONLY";
  if (feature.activationState.startsWith("BLOCKED")) return "BLOCKED";
  if (feature.freshnessStatus === "STALE" || feature.freshnessStatus === "MISSING") {
    return "STALE";
  }
  if (feature.sourceTier === 1) return "VERIFIED";
  if (feature.sourceTier === 2 || feature.sourceTier === 3) return "SOURCE_BACKED";
  if (feature.sourceTier === 4) return "DERIVED_CONTEXT";
  if (feature.sourceTier === 5 || feature.sourceTier === 6) return "LOW_TRUST";
  return "BLOCKED";
}

export function validateDecisionTrace(trace: DecisionTrace): string[] {
  const errors: string[] = [];

  if (!trace.decisionId) errors.push("decisionId is required");
  if (!trace.modelVersion) errors.push("modelVersion is required");
  if (!trace.generatedAt) errors.push("generatedAt is required");
  if (!trace.summary) errors.push("summary is required");

  for (const feature of trace.features) {
    if (!feature.featureKey) errors.push("featureKey is required");
    if (!feature.sourceId) errors.push(`${feature.featureKey}: sourceId is required`);
    if (!feature.sourceName) errors.push(`${feature.featureKey}: sourceName is required`);
    if (!feature.transformVersion) errors.push(`${feature.featureKey}: transformVersion is required`);
    if (!feature.whyUsedOrBlocked) errors.push(`${feature.featureKey}: whyUsedOrBlocked is required`);
    if (!isFeatureAllowedOnSurface(feature, trace.surface)) {
      errors.push(`${feature.featureKey}: not allowed on ${trace.surface}`);
    }
    if (!isFounderSurface(trace.surface) && !isFeaturePublicSafe(feature)) {
      errors.push(`${feature.featureKey}: not public safe on ${trace.surface}`);
    }
  }

  return errors;
}

export function classifyRunPassBias(
  split: PlayCallSplit,
  minSampleSize = 50,
  biasThreshold = 0.58
): TendencyBias {
  if (split.sampleSize < minSampleSize) return "INSUFFICIENT_SAMPLE";
  if (split.passRate >= biasThreshold) return "PASS_HEAVY";
  if (split.rushRate >= biasThreshold) return "RUN_HEAVY";
  return "BALANCED";
}

export function validatePlayCallSplit(split: PlayCallSplit): string[] {
  const errors: string[] = [];
  const total = split.passRate + split.rushRate;

  if (split.passRate < 0 || split.passRate > 1) {
    errors.push(`${split.situation}: passRate must be between 0 and 1`);
  }
  if (split.rushRate < 0 || split.rushRate > 1) {
    errors.push(`${split.situation}: rushRate must be between 0 and 1`);
  }
  if (Math.abs(total - 1) > 0.01) {
    errors.push(`${split.situation}: passRate and rushRate must sum to 1`);
  }
  if (split.sampleSize < 0) {
    errors.push(`${split.situation}: sampleSize cannot be negative`);
  }
  if (split.confidence < 0 || split.confidence > 1) {
    errors.push(`${split.situation}: confidence must be between 0 and 1`);
  }

  return errors;
}

export function validateSchemeTendencyProfile(profile: SchemeTendencyProfile): string[] {
  const errors: string[] = [];

  if (!profile.profileId) errors.push("profileId is required");
  if (!profile.coachId) errors.push("coachId is required");
  if (!profile.coachName) errors.push("coachName is required");
  if (!profile.team) errors.push("team is required");
  if (!profile.primarySchemeFamily) errors.push("primarySchemeFamily is required");
  if (profile.playCallerConfidence < 0 || profile.playCallerConfidence > 1) {
    errors.push("playCallerConfidence must be between 0 and 1");
  }
  if (profile.splits.length === 0) errors.push("at least one play-call split is required");

  for (const split of profile.splits) {
    errors.push(...validatePlayCallSplit(split));
  }

  return errors;
}

export function isFallbackStepUsable(step: SourceFallbackStep): boolean {
  const legallyUsable =
    step.legalState === "APPROVED" ||
    step.legalState === "APPROVED_DERIVED_ONLY" ||
    step.legalState === "REQUIRES_USER_EXPORT";
  const healthUsable = step.healthStatus === "HEALTHY" || step.healthStatus === "DEGRADED";
  const active = step.activationState === "ACTIVE" || step.activationState === "SHADOW_ONLY";

  return legallyUsable && healthUsable && active && step.mode !== "DISABLED";
}

export function evaluateFallbackChain(chain: SourceFallbackChain): SourceFallbackEvaluation {
  if (chain.steps.length === 0) {
    return {
      chainId: chain.chainId,
      domain: chain.domain,
      status: chain.noDataPolicy === "MANUAL_REVIEW" ? "MANUAL_REVIEW_REQUIRED" : "NO_SOURCE",
      activeSourceId: null,
      publicSafe: false,
      reason: `${chain.domain}: no fallback steps are registered`,
    };
  }

  const legalBlock = chain.steps.every((step) =>
    step.legalState === "BLOCKED_TOS" ||
    step.legalState === "BLOCKED_UNKNOWN" ||
    step.legalState === "REQUIRES_CONTRACT"
  );
  if (legalBlock) {
    return {
      chainId: chain.chainId,
      domain: chain.domain,
      status: "BLOCKED_LEGAL",
      activeSourceId: null,
      publicSafe: false,
      reason: `${chain.domain}: all fallback steps are legally blocked or require a contract`,
    };
  }

  const activeStep = chain.steps.find(isFallbackStepUsable);
  if (!activeStep) {
    return {
      chainId: chain.chainId,
      domain: chain.domain,
      status: chain.noDataPolicy === "MANUAL_REVIEW" ? "MANUAL_REVIEW_REQUIRED" : "NO_SOURCE",
      activeSourceId: null,
      publicSafe: false,
      reason: `${chain.domain}: no healthy active fallback source is available`,
    };
  }

  const publicSafe =
    activeStep.activationState === "ACTIVE" &&
    activeStep.legalState !== "REQUIRES_USER_EXPORT" &&
    activeStep.healthStatus === "HEALTHY";

  return {
    chainId: chain.chainId,
    domain: chain.domain,
    status: activeStep.healthStatus === "DEGRADED" ? "DEGRADED" : "READY",
    activeSourceId: activeStep.sourceId,
    publicSafe,
    reason: `${chain.domain}: using ${activeStep.sourceName} as ${activeStep.mode.toLowerCase()} source`,
  };
}

export function evaluateCoverageRequirement(
  requirement: IntelligenceCoverageRequirement,
  snapshot: DomainCoverageSnapshot,
  nowIso: IsoTimestamp
): CoverageEvaluation {
  if (snapshot.manualReviewOpen) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "MANUAL_REVIEW_REQUIRED",
      reason: `${requirement.domain}: manual review is open`,
    };
  }

  if (snapshot.domain !== requirement.domain) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "BLIND_SPOT",
      reason: `${requirement.domain}: coverage snapshot domain mismatch`,
    };
  }

  if (snapshot.activeSourceCount < requirement.minActiveSources) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "BLIND_SPOT",
      reason: `${requirement.domain}: ${snapshot.activeSourceCount}/${requirement.minActiveSources} active sources available`,
    };
  }

  if (!snapshot.freshestRetrievedAt) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "BLIND_SPOT",
      reason: `${requirement.domain}: no retrieved source timestamp is available`,
    };
  }

  const ageSec = (new Date(nowIso).getTime() - new Date(snapshot.freshestRetrievedAt).getTime()) / 1000;
  if (!Number.isFinite(ageSec) || ageSec > requirement.maxStalenessSec) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "DEGRADED",
      reason: `${requirement.domain}: freshest source exceeds max staleness`,
    };
  }

  if (snapshot.staleSourceCount > 0 || snapshot.blockedSourceCount > 0) {
    return {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      state: "DEGRADED",
      reason: `${requirement.domain}: coverage exists with stale or blocked supporting sources`,
    };
  }

  return {
    requirementId: requirement.requirementId,
    domain: requirement.domain,
    state: "COVERED",
    reason: `${requirement.domain}: coverage requirement satisfied`,
  };
}

export function getAutonomousSystemHealth(
  run: AutonomousSystemRun,
  nowIso: IsoTimestamp
): AutonomousSystemStatus {
  if (run.status === "PAUSED") return "PAUSED";
  if (run.status === "FAILED") return "FAILED";
  if (run.consecutiveFailures >= run.maxAllowedFailures) return "FAILED";
  if (run.consecutiveFailures > 0) return "DEGRADED";

  const heartbeatAt = run.lastHeartbeatAt ?? run.completedAt;
  if (!heartbeatAt) return "UNKNOWN";

  const ageSec = (new Date(nowIso).getTime() - new Date(heartbeatAt).getTime()) / 1000;
  if (!Number.isFinite(ageSec)) return "UNKNOWN";
  if (ageSec > run.expectedCadenceSec * 2) return "STALE";
  if (run.status === "STALE" || run.status === "DEGRADED") return run.status;

  return "HEALTHY";
}

export function summarizeControlPlaneSnapshot(snapshot: ControlPlaneSnapshot): ControlPlaneSummary {
  const systemStates = snapshot.systems.map((system) =>
    getAutonomousSystemHealth(system, snapshot.generatedAt)
  );
  const failedSystems = systemStates.filter((status) => status === "FAILED").length;
  const staleSystems = systemStates.filter((status) => status === "STALE").length;
  const degradedSystems = systemStates.filter((status) => status === "DEGRADED").length;
  const healthySystems = systemStates.filter((status) => status === "HEALTHY").length;
  const blindSpots = snapshot.coverage.filter((item) => item.state === "BLIND_SPOT").length;
  const manualReviewCount =
    snapshot.coverage.filter((item) => item.state === "MANUAL_REVIEW_REQUIRED").length +
    snapshot.fallbackChains.filter((item) => item.status === "MANUAL_REVIEW_REQUIRED").length;
  const coveredDomains = snapshot.coverage.filter((item) => item.state === "COVERED").length;

  let overallStatus: AutonomousSystemStatus = "HEALTHY";
  if (failedSystems > 0 || blindSpots > 0) {
    overallStatus = "FAILED";
  } else if (staleSystems > 0) {
    overallStatus = "STALE";
  } else if (degradedSystems > 0 || manualReviewCount > 0) {
    overallStatus = "DEGRADED";
  }

  const recommendedActions: string[] = [];
  if (failedSystems > 0) recommendedActions.push("Open failed autonomous-system runbooks.");
  if (blindSpots > 0) recommendedActions.push("Restore coverage for blind-spot domains before publishing dependent claims.");
  if (manualReviewCount > 0) recommendedActions.push("Clear manual reviews or keep affected outputs withheld.");
  if (staleSystems > 0) recommendedActions.push("Restart or investigate stale workers and monitors.");

  return {
    overallStatus,
    healthySystems,
    degradedSystems,
    failedSystems,
    staleSystems,
    coveredDomains,
    blindSpots,
    manualReviewCount,
    recommendedActions,
  };
}
