/**
 * Jarvis — operator synthesis layer.
 *
 * Pure, deterministic synthesizer. Takes evidence the cockpit already has
 * (readiness gates, ingestion health, settlement health, signal coverage,
 * historical pick counts, missing-layer flags) and produces a typed,
 * boringly honest launch assessment.
 *
 * Rules:
 *   - Never fabricate. If an input is missing, the output says "unknown".
 *   - Separate code readiness from data readiness.
 *   - Separate public readiness from operator readiness.
 *   - Separate bootstrap history from canonical history.
 *   - Never recommend auto-betting. Never recommend auto-publishing.
 *   - Do not claim LAUNCH_READY if public performance is unsafe.
 *
 * This module is intentionally I/O-free so it can be unit tested with
 * fixtures.
 */

import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

// ─── Status enums ────────────────────────────────────────────────────────

export type JarvisLaunchStatus =
  | "LAUNCH_READY"
  | "LAUNCH_READY_PENDING_EXTERNAL_CONFIG"
  | "NOT_READY_DATA"
  | "NOT_READY_VALIDATION"
  | "NOT_READY_SAFETY"
  | "UNKNOWN";

export type JarvisHealth = "GREEN" | "AMBER" | "RED" | "UNKNOWN";

export type JarvisPhaseStatus =
  | "implemented"
  | "partial"
  | "missing"
  | "blocked_external"
  | "unknown";

// ─── Input shapes ────────────────────────────────────────────────────────

export interface JarvisReadinessGates {
  readonly canPersistCanonicalHistory: boolean;
  readonly canUseDerivedHistory: boolean;
  readonly canExposePublicPicks: boolean;
  readonly canPromoteFeaturedPicks: boolean;
  readonly canExposePerformanceStats: boolean;
  readonly canPublishContent: boolean;
  readonly canLearnFromOutcomes: boolean;
  readonly canApplyCalibrationAdjustments: false;
  readonly isBootstrapMode: boolean;
  readonly minSettledPicksForLearning: number;
}

export interface JarvisIngestionInput {
  /** ISO timestamp of the last ingestion attempt (any status). */
  readonly lastAttemptAt: Date | string | null;
  /** ISO timestamp of the last SUCCESS ingestion. */
  readonly lastSuccessAt: Date | string | null;
  /** Whether the latest ingestion finished SUCCESS. */
  readonly lastWasSuccess: boolean | null;
  /** Recent ingestion failure count (last 24h). */
  readonly recentFailureCount: number;
}

export interface JarvisSettlementInput {
  readonly lastSettlementAt: Date | string | null;
  readonly settledIn24h: number;
  readonly pendingPickCount: number;
}

export interface JarvisHistoryInput {
  readonly canonicalSettledCount: number;
  readonly bootstrapSettledCount: number;
  readonly canonicalPendingCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly pushCount: number;
  readonly voidCount: number;
  readonly publishedCount: number;
  readonly featuredCount: number;
  readonly canonicalEligibleForPublic: number;
  readonly canonicalExcludedFromPublic: number;
}

export interface JarvisSignalInput {
  readonly snapshotCoveragePct: number; // 0..1
  readonly signalCoveragePct: number; // 0..1
  readonly averageDataQualityScore: number; // 0..1
  readonly modelVersionsActive: readonly string[];
}

export interface JarvisLayerStatuses {
  readonly trustClaims: JarvisPhaseStatus;
  readonly performanceGating: JarvisPhaseStatus;
  readonly promotions: JarvisPhaseStatus;
  readonly dailyBrief: JarvisPhaseStatus;
  readonly calibration: JarvisPhaseStatus;
  readonly cockpit: JarvisPhaseStatus;
  readonly contentEngine: JarvisPhaseStatus;
  readonly ciHardening: JarvisPhaseStatus;
}

export interface JarvisInput {
  readonly now: Date;
  readonly gates: JarvisReadinessGates;
  readonly performancePolicy: PublicPerformancePolicy;
  readonly ingestion: JarvisIngestionInput;
  readonly settlement: JarvisSettlementInput;
  readonly history: JarvisHistoryInput;
  readonly signal: JarvisSignalInput;
  readonly layers: JarvisLayerStatuses;
  /** Optional: list of explicitly named external config items not yet set. */
  readonly externalConfigMissing?: readonly string[];
}

// ─── Output shape ────────────────────────────────────────────────────────

/**
 * Bump JARVIS_VERSION whenever the synthesizer's logic changes in a way
 * that would alter past assessments — i.e. a meaningful rule change, a
 * new sectional status, or a status-classification threshold update.
 * Stamped onto every assessment so cockpit screenshots and saved reports
 * are auditable against the version that produced them.
 */
export const JARVIS_VERSION = "v1.1";

export interface JarvisAssessment {
  /** ISO timestamp the assessment was synthesized. */
  readonly assessedAt: string;
  /** Synthesizer version string. See `JARVIS_VERSION`. */
  readonly version: string;
  readonly launchStatus: JarvisLaunchStatus;
  readonly oneSentenceAssessment: string;
  readonly confidenceLevel: "LOW" | "MEDIUM" | "HIGH";

  readonly publicSurfaceStatus: JarvisHealth;
  readonly customerDashboardStatus: JarvisHealth;
  readonly picksStatus: JarvisHealth;
  readonly performanceStatus: JarvisHealth;
  readonly cockpitStatus: JarvisHealth;
  readonly historicalPickStatus: JarvisHealth;
  readonly ingestionStatus: JarvisHealth;
  readonly settlementStatus: JarvisHealth;
  readonly canonicalHistoryStatus: JarvisHealth;
  readonly bootstrapStatus: JarvisHealth;
  readonly signalCoverageStatus: JarvisHealth;

  readonly readinessGateSummary: {
    readonly openCount: number;
    readonly totalCount: number;
    readonly closed: readonly string[];
  };

  readonly safetyWarnings: readonly string[];
  readonly missingPhaseWarnings: readonly string[];
  readonly externalConfigWarnings: readonly string[];
  readonly recommendedNextActions: readonly string[];

  readonly phaseMatrix: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly status: JarvisPhaseStatus;
  }>;
}

// ─── Implementation ──────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;

function toDate(value: Date | string | null): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function gateLabels(gates: JarvisReadinessGates): string[] {
  const closed: string[] = [];
  if (!gates.canPersistCanonicalHistory) closed.push("canPersistCanonicalHistory");
  if (!gates.canUseDerivedHistory) closed.push("canUseDerivedHistory");
  if (!gates.canExposePublicPicks) closed.push("canExposePublicPicks");
  if (!gates.canPromoteFeaturedPicks) closed.push("canPromoteFeaturedPicks");
  if (!gates.canExposePerformanceStats) closed.push("canExposePerformanceStats");
  if (!gates.canPublishContent) closed.push("canPublishContent");
  if (!gates.canLearnFromOutcomes) closed.push("canLearnFromOutcomes");
  return closed;
}

function classifyIngestion(
  ingestion: JarvisIngestionInput,
  now: Date
): JarvisHealth {
  const last = toDate(ingestion.lastSuccessAt);
  if (!last) return "UNKNOWN";
  const ageHours = (now.getTime() - last.getTime()) / HOUR;
  if (ageHours > 24) return "RED";
  if (ageHours > 6) return "AMBER";
  if (ingestion.recentFailureCount >= 3) return "AMBER";
  return "GREEN";
}

function classifySettlement(
  settlement: JarvisSettlementInput,
  now: Date
): JarvisHealth {
  const last = toDate(settlement.lastSettlementAt);
  if (!last) {
    // No settlements yet at all — fine if there are no pending picks either.
    return settlement.pendingPickCount === 0 ? "UNKNOWN" : "AMBER";
  }
  const ageHours = (now.getTime() - last.getTime()) / HOUR;
  if (ageHours > 36) return "RED";
  if (ageHours > 12) return "AMBER";
  return "GREEN";
}

function classifyCanonicalHistory(
  history: JarvisHistoryInput,
  gates: JarvisReadinessGates
): JarvisHealth {
  if (history.canonicalSettledCount === 0) {
    return gates.isBootstrapMode ? "AMBER" : "RED";
  }
  if (history.canonicalSettledCount < gates.minSettledPicksForLearning) return "AMBER";
  return "GREEN";
}

function classifySignal(signal: JarvisSignalInput): JarvisHealth {
  if (
    signal.snapshotCoveragePct === 0 &&
    signal.signalCoveragePct === 0 &&
    signal.averageDataQualityScore === 0
  ) {
    return "UNKNOWN";
  }
  const min = Math.min(
    signal.snapshotCoveragePct,
    signal.signalCoveragePct,
    signal.averageDataQualityScore
  );
  if (min >= 0.85) return "GREEN";
  if (min >= 0.6) return "AMBER";
  return "RED";
}

function classifyPicks(
  gates: JarvisReadinessGates,
  history: JarvisHistoryInput
): JarvisHealth {
  if (!gates.canExposePublicPicks) return "AMBER";
  if (history.publishedCount === 0) return "RED";
  return "GREEN";
}

function classifyPerformance(
  policy: PublicPerformancePolicy
): JarvisHealth {
  if (policy.canExposePerformanceStats) return "GREEN";
  if (policy.primaryReason === "GATE_OFF_PERFORMANCE_STATS") return "AMBER";
  return "AMBER";
}

function classifyCustomerDashboard(
  policy: PublicPerformancePolicy
): JarvisHealth {
  // Dashboard is healthy as long as the policy is computed and honoured.
  return policy.canExposePerformanceStats ? "GREEN" : "AMBER";
}

function classifyCockpit(layers: JarvisLayerStatuses): JarvisHealth {
  if (layers.cockpit === "implemented") return "GREEN";
  if (layers.cockpit === "partial") return "AMBER";
  return "RED";
}

function classifyHistorical(history: JarvisHistoryInput): JarvisHealth {
  const known =
    history.canonicalSettledCount +
    history.bootstrapSettledCount +
    history.canonicalPendingCount;
  if (known === 0) return "UNKNOWN";
  if (history.canonicalSettledCount === 0 && history.bootstrapSettledCount > 0)
    return "AMBER";
  return "GREEN";
}

function classifyBootstrap(
  gates: JarvisReadinessGates,
  history: JarvisHistoryInput
): JarvisHealth {
  if (gates.isBootstrapMode) {
    return history.bootstrapSettledCount > 0 ? "AMBER" : "UNKNOWN";
  }
  // canonical mode — bootstrap should be a steady residual.
  return "GREEN";
}

function classifyPublicSurface(
  picks: JarvisHealth,
  performance: JarvisHealth,
  customerDash: JarvisHealth
): JarvisHealth {
  const order: Record<JarvisHealth, number> = {
    GREEN: 0,
    AMBER: 1,
    UNKNOWN: 2,
    RED: 3,
  };
  const worst = [picks, performance, customerDash].sort(
    (a, b) => order[b] - order[a]
  )[0];
  return worst ?? "UNKNOWN";
}

function classifyOverall(
  parts: readonly JarvisHealth[]
): JarvisLaunchStatus {
  if (parts.includes("RED")) return "NOT_READY_DATA";
  if (parts.includes("UNKNOWN")) return "NOT_READY_VALIDATION";
  if (parts.includes("AMBER")) return "LAUNCH_READY_PENDING_EXTERNAL_CONFIG";
  return "LAUNCH_READY";
}

function buildPhaseMatrix(layers: JarvisLayerStatuses): JarvisAssessment["phaseMatrix"] {
  return [
    { key: "phase-1", label: "Phase 1 — Audit/Baseline", status: "implemented" },
    { key: "phase-2", label: "Phase 2 — Trust Cleanup", status: layers.trustClaims },
    { key: "phase-3", label: "Phase 3 — Performance Gating", status: layers.performanceGating },
    { key: "phase-4", label: "Phase 4 — Promotions", status: layers.promotions },
    { key: "phase-5", label: "Phase 5 — Daily Brief", status: layers.dailyBrief },
    { key: "phase-6", label: "Phase 6 — Calibration", status: layers.calibration },
    { key: "phase-7", label: "Phase 7 — Cockpit/Admin Dashboard", status: layers.cockpit },
    { key: "phase-8", label: "Phase 8 — Draft-Only Content Engine", status: layers.contentEngine },
    { key: "phase-9", label: "Phase 9 — CI/Deployment Hardening", status: layers.ciHardening },
  ];
}

// Synthesizes launch readiness from gates, evidence, and safety signals.
export function synthesizeJarvis(input: JarvisInput): JarvisAssessment {
  const closedGates = gateLabels(input.gates);

  const ingestion = classifyIngestion(input.ingestion, input.now);
  const settlement = classifySettlement(input.settlement, input.now);
  const canonicalHistory = classifyCanonicalHistory(input.history, input.gates);
  const signal = classifySignal(input.signal);
  const picks = classifyPicks(input.gates, input.history);
  const performance = classifyPerformance(input.performancePolicy);
  const customerDash = classifyCustomerDashboard(input.performancePolicy);
  const cockpit = classifyCockpit(input.layers);
  const historical = classifyHistorical(input.history);
  const bootstrap = classifyBootstrap(input.gates, input.history);
  const publicSurface = classifyPublicSurface(picks, performance, customerDash);

  const safety: string[] = [];
  if (
    !input.performancePolicy.canExposePerformanceStats &&
    input.gates.canExposePublicPicks &&
    input.history.publishedCount > 0
  ) {
    safety.push(
      "Public picks are live but performance stats are gated. Customer surfaces must hide win-rate claims."
    );
  }
  if (input.gates.isBootstrapMode && input.history.bootstrapSettledCount > 0) {
    safety.push(
      "Bootstrap mode is active. Bootstrap picks exist and must remain excluded from public performance."
    );
  }
  if (
    input.ingestion.recentFailureCount >= 3 &&
    classifyIngestion(input.ingestion, input.now) !== "GREEN"
  ) {
    safety.push(
      `Ingestion has ${input.ingestion.recentFailureCount} recent failures — investigate the data adapter before public claims.`
    );
  }

  const missingPhase: string[] = [];
  const layerEntries: Array<[string, JarvisPhaseStatus]> = [
    ["Trust claims", input.layers.trustClaims],
    ["Performance gating", input.layers.performanceGating],
    ["Promotions", input.layers.promotions],
    ["Daily Brief", input.layers.dailyBrief],
    ["Calibration", input.layers.calibration],
    ["Cockpit", input.layers.cockpit],
    ["Content engine", input.layers.contentEngine],
    ["CI hardening", input.layers.ciHardening],
  ];
  for (const [label, status] of layerEntries) {
    if (status === "missing") missingPhase.push(`${label}: not implemented.`);
    else if (status === "partial") missingPhase.push(`${label}: partial — verify before launch.`);
    else if (status === "unknown") missingPhase.push(`${label}: status unknown — inspect repo.`);
    else if (status === "blocked_external") missingPhase.push(`${label}: blocked on external dependency.`);
  }

  const externalConfig = [...(input.externalConfigMissing ?? [])];

  const actions: string[] = [];
  if (!input.gates.canExposePerformanceStats) {
    actions.push(
      `Hold PERFORMANCE_STATS_ENABLED off until ${input.gates.minSettledPicksForLearning} canonical picks have settled (currently ${input.history.canonicalSettledCount}).`
    );
  }
  if (input.ingestion.lastSuccessAt === null) {
    actions.push("Run /api/admin/trigger-refresh to seed the first ingestion cycle.");
  } else if (ingestion === "AMBER" || ingestion === "RED") {
    actions.push("Inspect ingestion errors in /admin/dashboard and rerun the data refresh worker.");
  }
  if (input.settlement.pendingPickCount > 0 && settlement !== "GREEN") {
    actions.push(
      `Settle ${input.settlement.pendingPickCount} pending picks (settlement worker has not run within tolerance).`
    );
  }
  if (input.gates.isBootstrapMode) {
    actions.push(
      "Once data quality is stable, flip CANONICAL_HISTORY_ENABLED=true to start producing canonical picks."
    );
  }
  for (const name of externalConfig) {
    actions.push(`Configure missing external dependency: ${name}.`);
  }
  if (actions.length === 0) {
    // Steady-state recommendations when nothing is blocking. The order
    // mirrors the daily operator checklist in docs/launch-runbook.md §7.
    actions.push(
      "Run the daily operator checklist: verify ingestion + settlement are GREEN, " +
        "skim /cockpit/history for unexpected eligibility drift, and confirm no new safety warnings."
    );
    actions.push(
      "If the performance gate is still closed and canonical history has accumulated, " +
        "review readiness in /cockpit and consider flipping PERFORMANCE_STATS_ENABLED=true."
    );
    actions.push(
      "Capture today's Jarvis assessment via serializeJarvisAudit() if you keep a daily log."
    );
  }

  const overall = classifyOverall([
    publicSurface,
    customerDash,
    picks,
    performance,
    cockpit,
    historical,
    ingestion,
    settlement,
    canonicalHistory,
    signal,
  ]);

  let launchStatus: JarvisLaunchStatus = overall;
  if (safety.length > 0 && launchStatus === "LAUNCH_READY") {
    launchStatus = "NOT_READY_SAFETY";
  }
  if (externalConfig.length > 0 && launchStatus === "LAUNCH_READY") {
    launchStatus = "LAUNCH_READY_PENDING_EXTERNAL_CONFIG";
  }
  if (overall === "LAUNCH_READY_PENDING_EXTERNAL_CONFIG" && externalConfig.length === 0 && missingPhase.length === 0 && safety.length === 0) {
    // Amber with no specific blocker reduces to launch-ready-pending-config.
    launchStatus = "LAUNCH_READY_PENDING_EXTERNAL_CONFIG";
  }

  const confidenceLevel: JarvisAssessment["confidenceLevel"] =
    launchStatus === "LAUNCH_READY"
      ? "HIGH"
      : launchStatus === "UNKNOWN" || launchStatus === "NOT_READY_VALIDATION"
        ? "LOW"
        : "MEDIUM";

  const oneSentenceAssessment = oneSentence(launchStatus, input, safety.length);

  return {
    assessedAt: input.now.toISOString(),
    version: JARVIS_VERSION,
    launchStatus,
    oneSentenceAssessment,
    confidenceLevel,
    publicSurfaceStatus: publicSurface,
    customerDashboardStatus: customerDash,
    picksStatus: picks,
    performanceStatus: performance,
    cockpitStatus: cockpit,
    historicalPickStatus: historical,
    ingestionStatus: ingestion,
    settlementStatus: settlement,
    canonicalHistoryStatus: canonicalHistory,
    bootstrapStatus: bootstrap,
    signalCoverageStatus: signal,
    readinessGateSummary: {
      openCount: 7 - closedGates.length,
      totalCount: 7,
      closed: closedGates,
    },
    safetyWarnings: safety,
    missingPhaseWarnings: missingPhase,
    externalConfigWarnings: externalConfig,
    recommendedNextActions: actions,
    phaseMatrix: buildPhaseMatrix(input.layers),
  };
}

function oneSentence(
  status: JarvisLaunchStatus,
  input: JarvisInput,
  safetyCount: number
): string {
  // Concrete pick activity summary the operator can scan in one glance.
  // We reference settled canonical, pending, and the bootstrap-excluded
  // count so the sentence shows what Jarvis sees vs what's held back.
  const activity =
    `${input.history.canonicalSettledCount} canonical settled, ` +
    `${input.history.canonicalPendingCount} pending, ` +
    `${input.history.bootstrapSettledCount} bootstrap excluded`;

  switch (status) {
    case "LAUNCH_READY":
      return `Platform is launch-ready: gates aligned, ${activity}, ingestion fresh.`;
    case "LAUNCH_READY_PENDING_EXTERNAL_CONFIG":
      return `Code is launch-ready (${activity}); data and external config still need attention before going public.`;
    case "NOT_READY_DATA":
      return `Not launch-ready (${activity}): ingestion, settlement, or canonical history is in RED state — fix data before public claims.`;
    case "NOT_READY_VALIDATION":
      return `Not launch-ready (${activity}): one or more inputs are unknown — verify in /admin/dashboard before public claims.`;
    case "NOT_READY_SAFETY":
      return `Not launch-ready (${activity}): ${safetyCount} safety warning(s) active — public surfaces would expose ungated stats.`;
    case "UNKNOWN":
    default:
      return `Launch status unknown — Jarvis is missing inputs.`;
  }
}
