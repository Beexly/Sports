import {
  evaluateCoverageRequirement,
  evaluateFallbackChain,
  getAutonomousSystemHealth,
  summarizeControlPlaneSnapshot,
  type AutonomousSystemRun,
  type ControlPlaneSnapshot,
  type CoverageEvaluation,
  type DomainCoverageSnapshot,
  type FallbackChainStatus,
  type IntelligenceCoverageRequirement,
  type SignalCriticality,
  type SignalDomain,
  type SourceActivationState,
  type SourceFallbackChain,
  type SourceFallbackStep,
  type SourceFallbackEvaluation,
  type SourceHealthStatus,
  type SourceLegalState,
} from "@sports/types";

export type ControlPlaneFreshnessState = "FRESH" | "STALE" | "MISSING";

export type ControlPlaneDebugTraceStatus = "READY" | "STALE" | "MISSING" | "FAILED";

export interface ControlPlaneDomainRow {
  readonly requirement: IntelligenceCoverageRequirement;
  readonly snapshot: DomainCoverageSnapshot;
  readonly evaluation: CoverageEvaluation;
}

export interface ControlPlaneSystemRow {
  readonly run: AutonomousSystemRun;
  readonly effectiveStatus: ReturnType<typeof getAutonomousSystemHealth>;
}

export interface ControlPlaneSourceHealthRow {
  readonly chainId: string;
  readonly domain: SignalDomain;
  readonly criticality: SignalCriticality;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly mode: SourceFallbackStep["mode"];
  readonly legalState: SourceLegalState;
  readonly healthStatus: SourceHealthStatus;
  readonly activationState: SourceActivationState;
  readonly confidence: number;
  readonly retrievedAt: string | null;
  readonly freshnessTtlSec: number;
  readonly freshnessState: ControlPlaneFreshnessState;
  readonly ageSec: number | null;
  readonly activeForChain: boolean;
  readonly operatorNote: string;
}

export interface ControlPlaneDebugTraceRow {
  readonly systemId: string;
  readonly systemName: string;
  readonly kind: AutonomousSystemRun["kind"];
  readonly effectiveStatus: ReturnType<typeof getAutonomousSystemHealth>;
  readonly traceStatus: ControlPlaneDebugTraceStatus;
  readonly telemetryTraceId: string | null;
  readonly runbookUrl: string | null;
  readonly lastHeartbeatAt: string | null;
  readonly checkedAt: string;
  readonly ageSec: number | null;
  readonly detail: string;
}

export interface IntelligenceControlPlaneView {
  readonly snapshot: ControlPlaneSnapshot;
  readonly summary: ReturnType<typeof summarizeControlPlaneSnapshot>;
  readonly systems: readonly ControlPlaneSystemRow[];
  readonly sourceHealth: readonly ControlPlaneSourceHealthRow[];
  readonly domains: readonly ControlPlaneDomainRow[];
  readonly fallbackChains: ReadonlyArray<{
    readonly chain: SourceFallbackChain;
    readonly evaluation: SourceFallbackEvaluation;
  }>;
  readonly debugTraces: readonly ControlPlaneDebugTraceRow[];
}

const GENERATED_AT = "2026-06-09T22:20:00.000Z";

const REQUIREMENTS: readonly IntelligenceCoverageRequirement[] = [
  {
    requirementId: "coverage-odds",
    domain: "ODDS",
    criticality: "P0",
    minActiveSources: 1,
    maxStalenessSec: 900,
    allowedSurfaces: ["FREE", "PRO", "ELITE", "COCKPIT"],
    description: "Moneyline, spread, total, book count, open/current, and no-vig shape.",
  },
  {
    requirementId: "coverage-injury",
    domain: "INJURY",
    criticality: "P0",
    minActiveSources: 1,
    maxStalenessSec: 1800,
    allowedSurfaces: ["PRO", "ELITE", "COCKPIT"],
    description: "Official practice status, game status, body part, participation trend.",
  },
  {
    requirementId: "coverage-coach-staff",
    domain: "COACH_STAFF",
    criticality: "P1",
    minActiveSources: 1,
    maxStalenessSec: 604800,
    allowedSurfaces: ["PRO", "ELITE", "COCKPIT"],
    description: "HC, OC, DC, play-caller confidence, staff start/end, source URL.",
  },
  {
    requirementId: "coverage-scheme",
    domain: "SCHEME_TENDENCY",
    criticality: "P1",
    minActiveSources: 1,
    maxStalenessSec: 604800,
    allowedSurfaces: ["ELITE", "COCKPIT"],
    description: "Run/pass, neutral pass rate, third-down split, red-zone split, pace.",
  },
  {
    requirementId: "coverage-officials",
    domain: "OFFICIALS",
    criticality: "P1",
    minActiveSources: 1,
    maxStalenessSec: 86400,
    allowedSurfaces: ["ELITE", "COCKPIT"],
    description: "Game crew, referee, official identities, assignment history.",
  },
  {
    requirementId: "coverage-wind",
    domain: "WIND",
    criticality: "P1",
    minActiveSources: 2,
    maxStalenessSec: 1800,
    allowedSurfaces: ["PRO", "ELITE", "COCKPIT"],
    description: "Speed, gust, direction, station distance, field orientation, roof gate.",
  },
  {
    requirementId: "coverage-reporter",
    domain: "BEAT_REPORTER",
    criticality: "P2",
    minActiveSources: 1,
    maxStalenessSec: 21600,
    allowedSurfaces: ["COCKPIT"],
    description: "Reporter, outlet, team beat, claim type, confirmation latency.",
  },
  {
    requirementId: "coverage-system-health",
    domain: "AUTONOMOUS_SYSTEM_HEALTH",
    criticality: "P0",
    minActiveSources: 1,
    maxStalenessSec: 300,
    allowedSurfaces: ["COCKPIT"],
    description: "Worker health, source monitor status, debug trace presence, runbook links.",
  },
];

const COVERAGE: readonly DomainCoverageSnapshot[] = [
  {
    requirementId: "coverage-odds",
    domain: "ODDS",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T22:13:00.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
  },
  {
    requirementId: "coverage-injury",
    domain: "INJURY",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T21:54:00.000Z",
    staleSourceCount: 1,
    blockedSourceCount: 0,
    manualReviewOpen: false,
    notes: "Official feed pending; manual team-report review is the active fallback.",
  },
  {
    requirementId: "coverage-coach-staff",
    domain: "COACH_STAFF",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T18:42:00.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
  },
  {
    requirementId: "coverage-scheme",
    domain: "SCHEME_TENDENCY",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T18:40:00.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
  },
  {
    requirementId: "coverage-officials",
    domain: "OFFICIALS",
    checkedAt: GENERATED_AT,
    activeSourceCount: 0,
    freshestRetrievedAt: null,
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: true,
    notes: "nflreadr officials ingestion is not wired yet.",
  },
  {
    requirementId: "coverage-wind",
    domain: "WIND",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T21:39:00.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
    notes: "Needs second source before public weather adjustments.",
  },
  {
    requirementId: "coverage-reporter",
    domain: "BEAT_REPORTER",
    checkedAt: GENERATED_AT,
    activeSourceCount: 0,
    freshestRetrievedAt: null,
    staleSourceCount: 0,
    blockedSourceCount: 1,
    manualReviewOpen: true,
    notes: "Reporter registry is research-only until source admission rules are implemented.",
  },
  {
    requirementId: "coverage-system-health",
    domain: "AUTONOMOUS_SYSTEM_HEALTH",
    checkedAt: GENERATED_AT,
    activeSourceCount: 1,
    freshestRetrievedAt: "2026-06-09T22:19:30.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
  },
];

const FALLBACK_CHAINS: readonly SourceFallbackChain[] = [
  {
    chainId: "fallback-odds",
    domain: "ODDS",
    criticality: "P0",
    noDataPolicy: "WITHHOLD",
    steps: [
      {
        sourceId: "the-odds-api",
        sourceName: "The Odds API",
        mode: "PRIMARY",
        domains: ["ODDS"],
        legalState: "APPROVED_DERIVED_ONLY",
        healthStatus: "HEALTHY",
        activationState: "ACTIVE",
        confidence: 0.9,
        retrievedAt: "2026-06-09T22:13:00.000Z",
        freshnessTtlSec: 900,
        notes: "Current production source for market shape.",
      },
      {
        sourceId: "therundown-candidate",
        sourceName: "TheRundown candidate",
        mode: "SECONDARY",
        domains: ["ODDS", "MARKET_PROPS"],
        legalState: "REQUIRES_CONTRACT",
        healthStatus: "UNKNOWN",
        activationState: "BLOCKED_LEGAL",
        confidence: 0,
        retrievedAt: null,
        freshnessTtlSec: 900,
      },
    ],
  },
  {
    chainId: "fallback-injury",
    domain: "INJURY",
    criticality: "P0",
    noDataPolicy: "MANUAL_REVIEW",
    steps: [
      {
        sourceId: "official-injury-feed",
        sourceName: "Official injury feed",
        mode: "PRIMARY",
        domains: ["INJURY"],
        legalState: "REQUIRES_CONTRACT",
        healthStatus: "UNKNOWN",
        activationState: "BLOCKED_LEGAL",
        confidence: 0,
        retrievedAt: null,
        freshnessTtlSec: 1800,
      },
      {
        sourceId: "manual-team-report-review",
        sourceName: "Manual team report review",
        mode: "MANUAL_REVIEW",
        domains: ["INJURY"],
        legalState: "REQUIRES_USER_EXPORT",
        healthStatus: "HEALTHY",
        activationState: "ACTIVE",
        confidence: 0.72,
        retrievedAt: "2026-06-09T21:54:00.000Z",
        freshnessTtlSec: 1800,
      },
    ],
  },
  {
    chainId: "fallback-officials",
    domain: "OFFICIALS",
    criticality: "P1",
    noDataPolicy: "MANUAL_REVIEW",
    steps: [
      {
        sourceId: "nflreadr-officials",
        sourceName: "nflreadr officials",
        mode: "PRIMARY",
        domains: ["OFFICIALS"],
        legalState: "APPROVED_DERIVED_ONLY",
        healthStatus: "UNAVAILABLE",
        activationState: "BLOCKED_MISSING_SOURCE",
        confidence: 0,
        retrievedAt: null,
        freshnessTtlSec: 86400,
        notes: "Public loader identified; ingestion not implemented.",
      },
      {
        sourceId: "football-zebras-watch",
        sourceName: "Football Zebras watch",
        mode: "SHADOW_ONLY",
        domains: ["OFFICIALS"],
        legalState: "APPROVED_DERIVED_ONLY",
        healthStatus: "HEALTHY",
        activationState: "SHADOW_ONLY",
        confidence: 0.4,
        retrievedAt: "2026-06-09T20:00:00.000Z",
        freshnessTtlSec: 86400,
        notes: "Secondary context only.",
      },
    ],
  },
  {
    chainId: "fallback-wind",
    domain: "WIND",
    criticality: "P1",
    noDataPolicy: "WITHHOLD",
    steps: [
      {
        sourceId: "weather-api-primary",
        sourceName: "Weather API primary",
        mode: "PRIMARY",
        domains: ["WEATHER", "WIND"],
        legalState: "APPROVED_DERIVED_ONLY",
        healthStatus: "DEGRADED",
        activationState: "ACTIVE",
        confidence: 0.68,
        retrievedAt: "2026-06-09T21:39:00.000Z",
        freshnessTtlSec: 1800,
        notes: "Only one weather source; needs cross-check before public adjustments.",
      },
    ],
  },
];

const SYSTEMS: readonly AutonomousSystemRun[] = [
  {
    systemId: "source-health-monitor",
    systemName: "Source Health Monitor",
    kind: "SOURCE_HEALTH_MONITOR",
    status: "HEALTHY",
    startedAt: "2026-06-09T22:18:00.000Z",
    completedAt: "2026-06-09T22:19:00.000Z",
    lastHeartbeatAt: "2026-06-09T22:19:30.000Z",
    checkedAt: GENERATED_AT,
    expectedCadenceSec: 300,
    consecutiveFailures: 0,
    maxAllowedFailures: 3,
    ownerSurface: "COCKPIT",
    canAutoRecover: true,
    telemetryTraceId: "trace-source-health-fixture",
    runbookUrl: "/docs/runbooks/source-health",
  },
  {
    systemId: "odds-ingestion-worker",
    systemName: "Odds Ingestion Worker",
    kind: "INGESTION_WORKER",
    status: "HEALTHY",
    startedAt: "2026-06-09T22:10:00.000Z",
    completedAt: "2026-06-09T22:13:30.000Z",
    lastHeartbeatAt: "2026-06-09T22:13:30.000Z",
    checkedAt: GENERATED_AT,
    expectedCadenceSec: 900,
    consecutiveFailures: 0,
    maxAllowedFailures: 3,
    ownerSurface: "COCKPIT",
    canAutoRecover: true,
    telemetryTraceId: "trace-odds-fixture",
    runbookUrl: "/docs/runbooks/odds-ingestion",
  },
  {
    systemId: "football-state-worker",
    systemName: "Football State Worker",
    kind: "INGESTION_WORKER",
    status: "DEGRADED",
    startedAt: "2026-06-09T21:35:00.000Z",
    completedAt: "2026-06-09T21:39:00.000Z",
    lastHeartbeatAt: "2026-06-09T21:39:00.000Z",
    checkedAt: GENERATED_AT,
    expectedCadenceSec: 1800,
    consecutiveFailures: 1,
    maxAllowedFailures: 3,
    ownerSurface: "COCKPIT",
    canAutoRecover: true,
    lastError: "Wind domain has only one active source.",
    telemetryTraceId: "trace-football-state-fixture",
    runbookUrl: "/docs/runbooks/football-state",
  },
  {
    systemId: "claim-governance-scanner",
    systemName: "Claim Governance Scanner",
    kind: "CLAIM_GOVERNANCE_SCANNER",
    status: "HEALTHY",
    startedAt: "2026-06-09T22:12:00.000Z",
    completedAt: "2026-06-09T22:12:20.000Z",
    lastHeartbeatAt: "2026-06-09T22:12:20.000Z",
    checkedAt: GENERATED_AT,
    expectedCadenceSec: 900,
    consecutiveFailures: 0,
    maxAllowedFailures: 1,
    ownerSurface: "COCKPIT",
    canAutoRecover: false,
    telemetryTraceId: "trace-claim-scanner-fixture",
    runbookUrl: "/docs/runbooks/claim-governance",
  },
  {
    systemId: "debug-trace-collector",
    systemName: "Debug Trace Collector",
    kind: "DEBUG_TRACE_COLLECTOR",
    status: "STALE",
    startedAt: "2026-06-09T20:00:00.000Z",
    completedAt: "2026-06-09T20:01:00.000Z",
    lastHeartbeatAt: "2026-06-09T20:01:00.000Z",
    checkedAt: GENERATED_AT,
    expectedCadenceSec: 1800,
    consecutiveFailures: 0,
    maxAllowedFailures: 2,
    ownerSurface: "COCKPIT",
    canAutoRecover: true,
    lastError: "Trace collector fixture intentionally stale until worker integration.",
    telemetryTraceId: "trace-debug-collector-fixture",
    runbookUrl: "/docs/runbooks/debug-traces",
  },
];

function criticalityWeight(criticality: SignalCriticality): number {
  switch (criticality) {
    case "P0":
      return 0;
    case "P1":
      return 1;
    case "P2":
      return 2;
    case "P3":
      return 3;
  }
}

function sortDomainRows(a: ControlPlaneDomainRow, b: ControlPlaneDomainRow): number {
  const stateRank = {
    BLIND_SPOT: 0,
    MANUAL_REVIEW_REQUIRED: 1,
    DEGRADED: 2,
    COVERED: 3,
  };

  const stateDelta = stateRank[a.evaluation.state] - stateRank[b.evaluation.state];
  if (stateDelta !== 0) return stateDelta;
  return criticalityWeight(a.requirement.criticality) - criticalityWeight(b.requirement.criticality);
}

function sortFallbackRows(
  a: { readonly evaluation: SourceFallbackEvaluation },
  b: { readonly evaluation: SourceFallbackEvaluation }
): number {
  const rank: Record<FallbackChainStatus, number> = {
    BLOCKED_LEGAL: 0,
    NO_SOURCE: 1,
    MANUAL_REVIEW_REQUIRED: 2,
    DEGRADED: 3,
    READY: 4,
  };
  return rank[a.evaluation.status] - rank[b.evaluation.status];
}

function ageSeconds(fromIso: string | null | undefined, nowIso: string): number | null {
  if (!fromIso) return null;
  const ageSec = (new Date(nowIso).getTime() - new Date(fromIso).getTime()) / 1000;
  return Number.isFinite(ageSec) ? ageSec : null;
}

function getFreshnessState(
  retrievedAt: string | null,
  freshnessTtlSec: number,
  nowIso: string
): { readonly ageSec: number | null; readonly freshnessState: ControlPlaneFreshnessState } {
  const ageSec = ageSeconds(retrievedAt, nowIso);
  if (ageSec === null) return { ageSec, freshnessState: "MISSING" };
  return {
    ageSec,
    freshnessState: ageSec > freshnessTtlSec ? "STALE" : "FRESH",
  };
}

function sourceHealthRank(row: ControlPlaneSourceHealthRow): number {
  const healthRank: Record<SourceHealthStatus, number> = {
    UNAVAILABLE: 0,
    SUSPENDED: 1,
    RETIRED: 2,
    UNKNOWN: 3,
    STALE: 4,
    DEGRADED: 5,
    HEALTHY: 6,
  };
  const activationPenalty = row.activationState.startsWith("BLOCKED") ? -2 : 0;
  const freshnessPenalty = row.freshnessState === "MISSING" ? -1 : row.freshnessState === "STALE" ? -0.5 : 0;

  return healthRank[row.healthStatus] + activationPenalty + freshnessPenalty;
}

function buildSourceHealthRows(
  fallbackChains: ReadonlyArray<{
    readonly chain: SourceFallbackChain;
    readonly evaluation: SourceFallbackEvaluation;
  }>,
  nowIso: string
): readonly ControlPlaneSourceHealthRow[] {
  return fallbackChains
    .flatMap(({ chain, evaluation }) =>
      chain.steps.map((step) => {
        const freshness = getFreshnessState(step.retrievedAt, step.freshnessTtlSec, nowIso);
        const activeForChain = evaluation.activeSourceId === step.sourceId;
        const operatorNote = activeForChain
          ? `${step.sourceName} is the active ${step.mode.toLowerCase()} source for ${chain.domain}.`
          : step.notes ?? `${step.sourceName} is not active for ${chain.domain}.`;

        return {
          chainId: chain.chainId,
          domain: chain.domain,
          criticality: chain.criticality,
          sourceId: step.sourceId,
          sourceName: step.sourceName,
          mode: step.mode,
          legalState: step.legalState,
          healthStatus: step.healthStatus,
          activationState: step.activationState,
          confidence: step.confidence,
          retrievedAt: step.retrievedAt,
          freshnessTtlSec: step.freshnessTtlSec,
          freshnessState: freshness.freshnessState,
          ageSec: freshness.ageSec,
          activeForChain,
          operatorNote,
        };
      })
    )
    .sort((a, b) => {
      const rankDelta = sourceHealthRank(a) - sourceHealthRank(b);
      if (rankDelta !== 0) return rankDelta;
      const criticalityDelta = criticalityWeight(a.criticality) - criticalityWeight(b.criticality);
      if (criticalityDelta !== 0) return criticalityDelta;
      return a.sourceName.localeCompare(b.sourceName);
    });
}

function evaluateDebugTrace(
  run: AutonomousSystemRun,
  effectiveStatus: ReturnType<typeof getAutonomousSystemHealth>,
  nowIso: string
): ControlPlaneDebugTraceRow {
  const heartbeatAt = run.lastHeartbeatAt ?? run.completedAt;
  const ageSec = ageSeconds(heartbeatAt, nowIso);

  if (effectiveStatus === "FAILED") {
    return {
      systemId: run.systemId,
      systemName: run.systemName,
      kind: run.kind,
      effectiveStatus,
      traceStatus: "FAILED",
      telemetryTraceId: run.telemetryTraceId ?? null,
      runbookUrl: run.runbookUrl ?? null,
      lastHeartbeatAt: heartbeatAt ?? null,
      checkedAt: run.checkedAt,
      ageSec,
      detail: run.lastError ?? "System is failed; inspect trace before trusting downstream outputs.",
    };
  }

  if (!run.telemetryTraceId || !run.runbookUrl) {
    return {
      systemId: run.systemId,
      systemName: run.systemName,
      kind: run.kind,
      effectiveStatus,
      traceStatus: "MISSING",
      telemetryTraceId: run.telemetryTraceId ?? null,
      runbookUrl: run.runbookUrl ?? null,
      lastHeartbeatAt: heartbeatAt ?? null,
      checkedAt: run.checkedAt,
      ageSec,
      detail: "Trace id or runbook link is missing.",
    };
  }

  if (effectiveStatus === "STALE" || (ageSec !== null && ageSec > run.expectedCadenceSec * 2)) {
    return {
      systemId: run.systemId,
      systemName: run.systemName,
      kind: run.kind,
      effectiveStatus,
      traceStatus: "STALE",
      telemetryTraceId: run.telemetryTraceId,
      runbookUrl: run.runbookUrl,
      lastHeartbeatAt: heartbeatAt ?? null,
      checkedAt: run.checkedAt,
      ageSec,
      detail: run.lastError ?? "Trace exists, but the worker heartbeat is stale.",
    };
  }

  return {
    systemId: run.systemId,
    systemName: run.systemName,
    kind: run.kind,
    effectiveStatus,
    traceStatus: "READY",
    telemetryTraceId: run.telemetryTraceId,
    runbookUrl: run.runbookUrl,
    lastHeartbeatAt: heartbeatAt ?? null,
    checkedAt: run.checkedAt,
    ageSec,
    detail: "Trace and runbook are present for this system.",
  };
}

/** Build the fixture-backed autonomous intelligence control-plane view for /cockpit/sources. */
export function loadIntelligenceControlPlaneView(): IntelligenceControlPlaneView {
  const domains = REQUIREMENTS.map((requirement) => {
    const snapshot = COVERAGE.find((item) => item.requirementId === requirement.requirementId) ?? {
      requirementId: requirement.requirementId,
      domain: requirement.domain,
      checkedAt: GENERATED_AT,
      activeSourceCount: 0,
      freshestRetrievedAt: null,
      staleSourceCount: 0,
      blockedSourceCount: 0,
      manualReviewOpen: true,
      notes: "Coverage fixture missing.",
    };

    return {
      requirement,
      snapshot,
      evaluation: evaluateCoverageRequirement(requirement, snapshot, GENERATED_AT),
    };
  }).sort(sortDomainRows);

  const fallbackChains = FALLBACK_CHAINS.map((chain) => ({
    chain,
    evaluation: evaluateFallbackChain(chain),
  })).sort(sortFallbackRows);

  const systems = SYSTEMS.map((run) => ({
    run,
    effectiveStatus: getAutonomousSystemHealth(run, GENERATED_AT),
  }));

  const sourceHealth = buildSourceHealthRows(fallbackChains, GENERATED_AT);
  const debugTraces = systems.map(({ run, effectiveStatus }) =>
    evaluateDebugTrace(run, effectiveStatus, GENERATED_AT)
  );

  const snapshot: ControlPlaneSnapshot = {
    snapshotId: "fixture-control-plane-2026-06-09",
    generatedAt: GENERATED_AT,
    systems: SYSTEMS,
    coverage: domains.map((row) => row.evaluation),
    fallbackChains: fallbackChains.map((row) => row.evaluation),
  };

  return {
    snapshot,
    summary: summarizeControlPlaneSnapshot(snapshot),
    systems,
    sourceHealth,
    domains,
    fallbackChains,
    debugTraces,
  };
}
