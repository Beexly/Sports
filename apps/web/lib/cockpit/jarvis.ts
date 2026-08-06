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
import {
  REFRESH_WARN_AFTER_MINUTES,
  REFRESH_STALE_AFTER_MINUTES,
} from "@/lib/data-reliability/refresh-sla";

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
  readonly canApplyCalibrationAdjustments: boolean;
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
  /**
   * errorMessage from the most recent FAILED ingestion run, if any. Surfaced in
   * the safety warning so the operator sees WHY ingestion is failing (e.g. "The
   * Odds API error: 429" = quota exhausted, "Upstream odds are stale" = sparse
   * slate) instead of a generic "investigate the data adapter."
   */
  readonly lastFailureReason?: string | null;
}

export interface JarvisSettlementInput {
  /**
   * Primary settlement clock: prefer SettlementRun.startedAt when present;
   * loaders may fall back to last pick.settledAt.
   */
  readonly lastSettlementAt: Date | string | null;
  readonly settledIn24h: number;
  readonly pendingPickCount: number;
  /** Distinct SettlementRun rows in last 24h (0 if table empty / stub). */
  readonly settlementRunCount24h?: number;
  /** How lastSettlementAt was derived. */
  readonly settlementSource?: "settlement_run" | "pick.settledAt" | "none";
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

/**
 * Signal coverage is a multi-metric matrix (not snapshot-only).
 * classifySignal takes the min of all defined 0..1 metrics.
 */
export interface JarvisSignalInput {
  /** Fraction of published-canonical picks with a PickSignalSnapshot row. */
  readonly snapshotCoveragePct: number; // 0..1
  /**
   * Composite feature-matrix coverage: mean fraction of boolean signal flags
   * true across PickSignalSnapshot rows (odds, weather, rest, …).
   * When unknown, loaders may set equal to snapshotCoveragePct for back-compat.
   */
  readonly signalCoveragePct: number; // 0..1
  /** Average dataQualityScore normalized to 0..1 when source is 0..100. */
  readonly averageDataQualityScore: number; // 0..1
  readonly modelVersionsActive: readonly string[];
  /** Games with ≥1 GameSignal / games referenced by published picks. */
  readonly gameSignalCoveragePct?: number; // 0..1
  /** Explicit feature matrix mean (same scale); preferred over signalCoveragePct when set. */
  readonly featureMatrixCoveragePct?: number; // 0..1
  /** Free multi-source dual coverage score (critical need×sport). */
  readonly freeMultiSourceScore?: number; // 0..1
  /** Last free-spine live probe score (sports with games / probed). */
  readonly freeSpineLiveScore?: number; // 0..1
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
  readonly externalConfigMissing?: readonly string[];
}

export const JARVIS_VERSION = "v1.3";

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

function toDate(value: Date | string | null | undefined): Date | null {
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
  const ageMinutes = (now.getTime() - last.getTime()) / (60 * 1000);
  if (ageMinutes > REFRESH_STALE_AFTER_MINUTES) return "RED";
  if (ageMinutes > REFRESH_WARN_AFTER_MINUTES) return "AMBER";
  if (ingestion.recentFailureCount >= 3) return "AMBER";
  return "GREEN";
}

function classifySettlement(
  settlement: JarvisSettlementInput,
  now: Date
): JarvisHealth {
  const last = toDate(settlement.lastSettlementAt);
  if (!last) {
    return settlement.pendingPickCount === 0 ? "UNKNOWN" : "AMBER";
  }
  const ageHours = (now.getTime() - last.getTime()) / HOUR;
  // Prefer settlement-run freshness when we know runs are the source.
  if (settlement.settlementSource === "settlement_run") {
    if (ageHours > 36) return "RED";
    if (ageHours > 12) return "AMBER";
    if ((settlement.settlementRunCount24h ?? 0) === 0 && settlement.pendingPickCount > 0)
      return "AMBER";
    return "GREEN";
  }
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

/** Collect all defined 0..1 metrics for multi-dimensional signal health. */
export function signalMetricVector(signal: JarvisSignalInput): number[] {
  const vals: number[] = [
    signal.snapshotCoveragePct,
    signal.featureMatrixCoveragePct ?? signal.signalCoveragePct,
    signal.averageDataQualityScore,
  ];
  if (typeof signal.gameSignalCoveragePct === "number") {
    vals.push(signal.gameSignalCoveragePct);
  }
  if (typeof signal.freeMultiSourceScore === "number") {
    vals.push(signal.freeMultiSourceScore);
  }
  if (typeof signal.freeSpineLiveScore === "number") {
    vals.push(signal.freeSpineLiveScore);
  }
  return vals.filter((v) => Number.isFinite(v));
}

function classifySignal(signal: JarvisSignalInput): JarvisHealth {
  const vals = signalMetricVector(signal);
  if (vals.length === 0 || vals.every((v) => v === 0)) {
    return "UNKNOWN";
  }
  const min = Math.min(...vals);
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
    const reason = input.ingestion.lastFailureReason?.trim();
    const reasonSuffix = reason ? ` Last error: ${reason.slice(0, 160)}` : "";
    safety.push(
      `Ingestion has ${input.ingestion.recentFailureCount} recent failures — investigate the data adapter before public claims.${reasonSuffix}`
    );
  }
  if (input.gates.canApplyCalibrationAdjustments) {
    if (!input.gates.canLearnFromOutcomes) {
      safety.push(
        "Calibration adjustments are ON but outcome learning is OFF — there is no eligible settled sample to justify a calibrated probability. Confirm the audited MODEL_VERSION activation (docs/path-to-70.md §7) or disable CALIBRATION_ADJUSTMENTS_ENABLED."
      );
    } else if (input.history.canonicalSettledCount < input.gates.minSettledPicksForLearning) {
      safety.push(
        `Calibration adjustments are ON but only ${input.history.canonicalSettledCount}/${input.gates.minSettledPicksForLearning} canonical picks have settled — below the calibration floor. Verify the held-out validation behind the MODEL_VERSION bump (docs/path-to-70.md §7).`
      );
    }
  }
  if (
    input.settlement.settlementSource === "pick.settledAt" &&
    (input.settlement.settlementRunCount24h ?? 0) === 0 &&
    input.settlement.pendingPickCount > 0
  ) {
    safety.push(
      "Settlement clock is falling back to pick.settledAt — no SettlementRun rows in 24h. Prefer free settle / settle-picks cron so durable runs exist."
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
    if (input.history.canonicalSettledCount >= input.gates.minSettledPicksForLearning) {
      actions.push(
        `PERFORMANCE_STATS_ENABLED is data-ready: ${input.history.canonicalSettledCount} canonical picks have settled (floor ${input.gates.minSettledPicksForLearning}). Set PERFORMANCE_STATS_ENABLED=true and redeploy to publish the record and win rate.`
      );
    } else {
      actions.push(
        `Hold PERFORMANCE_STATS_ENABLED off until ${input.gates.minSettledPicksForLearning} canonical picks have settled (currently ${input.history.canonicalSettledCount}).`
      );
    }
  }
  if (input.ingestion.lastSuccessAt === null) {
    actions.push("Run /api/admin/trigger-refresh to seed the first ingestion cycle.");
  } else if (ingestion === "AMBER" || ingestion === "RED") {
    actions.push("Inspect ingestion errors in /admin/dashboard and rerun the data refresh worker.");
  }
  // PENDING includes pre-kickoff rows. Do not cry "run settlement worker"
  // for future games when the issue is only a stale settlement clock.
  if (settlement === "RED" || settlement === "AMBER") {
    const pending = input.settlement.pendingPickCount;
    const runs = input.settlement.settlementRunCount24h ?? 0;
    if (runs === 0) {
      actions.push(
        "Confirm settle-picks cron auth (Bearer CRON_SECRET) and SettlementRun writes — settlement clock is outside tolerance.",
      );
    } else if (pending > 0) {
      actions.push(
        `${pending} picks still PENDING (includes not-yet-commenced). Check ops settlement.overduePending before forcing settle — do not invent scores.`,
      );
    } else {
      actions.push(
        "Settlement clock is outside tolerance with zero PENDING — verify SettlementRun timestamps, not pick backlog.",
      );
    }
  }
  if (
    input.settlement.settlementSource === "pick.settledAt" ||
    input.settlement.settlementSource === "none"
  ) {
    actions.push(
      "Ensure settle-picks cron writes SettlementRun rows (free path OK) so Jarvis uses durable settlement runs."
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
  if (input.signal.freeSpineLiveScore === 0) {
    actions.push(
      "Run /api/cron/free-spine-health (CRON_SECRET) so Jarvis can score live multi-source probes."
    );
  }
  if (actions.length === 0) {
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
