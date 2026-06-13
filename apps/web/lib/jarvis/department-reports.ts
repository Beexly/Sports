/**
 * Department Intelligence Reports — Layer C
 *
 * Every department head runs their domain and reports to Jarvis.
 * Jarvis synthesizes and presents to the owner. Never raw data — always
 * synthesized intelligence.
 *
 * Departments map from the Agent Council:
 *   PICKS_DESK      → SCOUT
 *   DATA_PIPELINE   → TAL
 *   CUSTOMER_SURFACE → SARAH
 *   CONTENT         → AVA
 *   REVENUE         → BOBBY
 *   SETTLEMENT      → LEDGER
 *   PERFORMANCE     → AUDIT
 *   AI_OPS          → METER
 *
 * Trust rules:
 *   - No department is HEALTHY unless OwnerSummary evidence supports it.
 *   - oneLiner must cite the source field (e.g., "picks.today", "overallColor").
 *   - requiresOwnerDecision is true only when the dept has decision-queue items.
 *   - Never claims "everything is fine" — always references actual state.
 */

import type { OwnerSummary } from "../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "./intelligence-state";

// ─── Re-export for consumers ───────────────────────────────────────────────────

export type JarvisOSState = JarvisIntelligenceState;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeptHealthLevel = "HEALTHY" | "ATTENTION" | "DEGRADED" | "CRITICAL" | "UNKNOWN";

export interface DepartmentReport {
  readonly department: string;
  readonly agentId: string;
  readonly healthLevel: DeptHealthLevel;
  readonly oneLiner: string;
  readonly openItems: number;
  readonly topRisk: string | null;
  readonly recommendedAction: string | null;
  readonly lastUpdated: string;
  readonly scribeRef?: string;
  readonly requiresOwnerDecision: boolean;
}

export interface IntelligenceBriefing {
  readonly generatedAt: string;
  readonly overallHealth: DeptHealthLevel;
  readonly criticalDepartments: readonly string[];
  readonly attentionDepartments: readonly string[];
  readonly healthyDepartments: readonly string[];
  readonly executiveSummary: string;
  readonly topThreeActions: readonly string[];
  readonly ownerDecisionQueue: readonly string[];
  readonly safeToDelegate: readonly string[];
  readonly briefingForOwner: string;
}

// ─── Department configurations ────────────────────────────────────────────────

interface DeptConfig {
  readonly agentId: string;
  readonly department: string;
  readonly buildReport: (summary: OwnerSummary) => DepartmentReport;
}

const DEPT_CONFIGS: readonly DeptConfig[] = [
  {
    agentId: "scout",
    department: "PICKS_DESK",
    buildReport(summary) {
      const { picks, assessedAt } = summary;
      const deptSummary = summary.departments.find((d) => d.agentKey === "SCOUT");
      const gateOpen = picks.isPublicGateOpen;
      const hasPicksToday = picks.today > 0;

      const healthLevel: DeptHealthLevel =
        !gateOpen && picks.totalInSystem === 0
          ? "ATTENTION"
          : hasPicksToday
            ? "HEALTHY"
            : !gateOpen
              ? "ATTENTION"
              : "DEGRADED";

      const oneLiner = gateOpen
        ? `${picks.today} pick${picks.today === 1 ? "" : "s"} published today (source: picks.today). Settled pool: ${picks.canonicalSettled}.`
        : `Picks gate CLOSED (source: picks.isPublicGateOpen). Internal scoring only. ${picks.canonicalPending} pending settlement.`;

      const openItems = deptSummary?.actionRequired ? 1 : 0;
      const topRisk = !gateOpen
        ? "Public picks gate is closed — no subscriber-facing picks."
        : picks.today === 0
          ? "No picks published today — ingestion or scoring may be stalled."
          : null;

      return {
        department: "PICKS_DESK",
        agentId: "scout",
        healthLevel,
        oneLiner,
        openItems,
        topRisk,
        recommendedAction: topRisk
          ? gateOpen
            ? "Run ingestion + scoring workers to generate picks."
            : "Open PUBLIC_PICKS_ENABLED gate when data quality is confirmed."
          : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision:
          !gateOpen || (deptSummary?.actionRequired ?? false),
      };
    },
  },

  {
    agentId: "tal",
    department: "DATA_PIPELINE",
    buildReport(summary) {
      const { assessedAt } = summary;
      const deptSummary = summary.departments.find((d) => d.agentKey === "TAL");
      const health = deptSummary?.status ?? "UNKNOWN";

      const healthLevel: DeptHealthLevel =
        health === "RED" ? "CRITICAL"
          : health === "AMBER" ? "ATTENTION"
            : health === "GREEN" ? "HEALTHY"
              : "UNKNOWN";

      const oneLiner = deptSummary?.oneLiner
        ? `${deptSummary.oneLiner} (source: departments.TAL)`
        : `Data pipeline status unknown — no TAL signal in assessment (source: departments).`;

      return {
        department: "DATA_PIPELINE",
        agentId: "tal",
        healthLevel,
        oneLiner,
        openItems: deptSummary?.actionRequired ? 1 : 0,
        topRisk:
          healthLevel === "CRITICAL"
            ? "Data pipeline has errors — ingestion may be stale."
            : null,
        recommendedAction:
          healthLevel === "CRITICAL"
            ? "Investigate data pipeline errors immediately."
            : healthLevel === "ATTENTION"
              ? "Review TAL department report for pipeline warnings."
              : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision: deptSummary?.actionRequired ?? false,
      };
    },
  },

  {
    agentId: "sarah",
    department: "CUSTOMER_SURFACE",
    buildReport(summary) {
      const { assessedAt } = summary;
      const deptSummary = summary.departments.find((d) => d.agentKey === "SARAH");
      const health = deptSummary?.status ?? "UNKNOWN";

      const healthLevel: DeptHealthLevel =
        health === "RED" ? "CRITICAL"
          : health === "AMBER" ? "ATTENTION"
            : health === "GREEN" ? "HEALTHY"
              : "UNKNOWN";

      return {
        department: "CUSTOMER_SURFACE",
        agentId: "sarah",
        healthLevel,
        oneLiner: deptSummary?.oneLiner
          ? `${deptSummary.oneLiner} (source: departments.SARAH)`
          : "Customer surface status unknown (source: departments).",
        openItems: deptSummary?.actionRequired ? 1 : 0,
        topRisk:
          healthLevel === "CRITICAL"
            ? "Customer-facing surface has critical issues."
            : null,
        recommendedAction:
          healthLevel === "CRITICAL" || healthLevel === "ATTENTION"
            ? "Review SARAH department report and address customer surface issues."
            : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision: deptSummary?.actionRequired ?? false,
      };
    },
  },

  {
    agentId: "ava",
    department: "CONTENT",
    buildReport(summary) {
      const { assessedAt } = summary;
      const deptSummary = summary.departments.find((d) => d.agentKey === "AVA");
      const health = deptSummary?.status ?? "UNKNOWN";

      const healthLevel: DeptHealthLevel =
        health === "RED" ? "DEGRADED"
          : health === "AMBER" ? "ATTENTION"
            : health === "GREEN" ? "HEALTHY"
              : "UNKNOWN";

      return {
        department: "CONTENT",
        agentId: "ava",
        healthLevel,
        oneLiner: deptSummary?.oneLiner
          ? `${deptSummary.oneLiner} (source: departments.AVA)`
          : "Content department status unknown — AVA is DRAFT_ONLY (source: departments).",
        openItems: deptSummary?.actionRequired ? 1 : 0,
        topRisk:
          healthLevel === "DEGRADED"
            ? "Content pipeline has failures — drafts may be stalled."
            : null,
        recommendedAction:
          healthLevel === "DEGRADED" || healthLevel === "ATTENTION"
            ? "Review content queue and unblock draft generation."
            : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision: deptSummary?.actionRequired ?? false,
      };
    },
  },

  {
    agentId: "bobby",
    department: "REVENUE",
    buildReport(summary) {
      const { assessedAt } = summary;
      const deptSummary = summary.departments.find((d) => d.agentKey === "BOBBY");
      const health = deptSummary?.status ?? "UNKNOWN";

      const healthLevel: DeptHealthLevel =
        health === "RED" ? "CRITICAL"
          : health === "AMBER" ? "ATTENTION"
            : health === "GREEN" ? "HEALTHY"
              : "UNKNOWN";

      return {
        department: "REVENUE",
        agentId: "bobby",
        healthLevel,
        oneLiner: deptSummary?.oneLiner
          ? `${deptSummary.oneLiner} (source: departments.BOBBY)`
          : "Revenue intelligence unavailable — BOBBY is DRAFT_ONLY, Stripe is wired (source: departments).",
        openItems: deptSummary?.actionRequired ? 1 : 0,
        topRisk:
          healthLevel === "CRITICAL"
            ? "Revenue anomaly detected — Stripe webhook or subscription data may be stale."
            : null,
        recommendedAction:
          healthLevel === "CRITICAL"
            ? "Check Stripe webhook health and subscription state."
            : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision:
          healthLevel === "CRITICAL" || (deptSummary?.actionRequired ?? false),
      };
    },
  },

  {
    agentId: "settlement-officer",
    department: "SETTLEMENT",
    buildReport(summary) {
      const { picks, assessedAt } = summary;
      const hasBacklog = picks.canonicalPending > 0;

      const healthLevel: DeptHealthLevel = hasBacklog ? "ATTENTION" : "HEALTHY";

      return {
        department: "SETTLEMENT",
        agentId: "settlement-officer",
        healthLevel,
        oneLiner: `${picks.canonicalSettled} picks settled; ${picks.canonicalPending} pending settlement (source: picks.canonicalPending).`,
        openItems: hasBacklog ? picks.canonicalPending : 0,
        topRisk:
          picks.canonicalPending > 10
            ? `${picks.canonicalPending} picks awaiting settlement — results ledger is behind.`
            : null,
        recommendedAction:
          hasBacklog ? "Run settlement worker to resolve pending picks." : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision: false,
      };
    },
  },

  {
    agentId: "performance-auditor",
    department: "PERFORMANCE",
    buildReport(summary) {
      const { performance, assessedAt } = summary;

      const healthLevel: DeptHealthLevel = performance.displaySafe
        ? "HEALTHY"
        : performance.isGateOpen && performance.canonicalSampleSize > 0
          ? "ATTENTION"
          : "UNKNOWN";

      const oneLiner = performance.displaySafe
        ? `Performance display-safe (source: performance.displaySafe). Win rate: ${performance.actualWinRate}%. Record: ${performance.record}.`
        : performance.isGateOpen
          ? `Gate open but ${performance.remainingToThreshold} more canonical picks needed before public display (source: performance).`
          : `Performance gate CLOSED (source: performance.isGateOpen). Target: ${performance.targetPct}%.`;

      return {
        department: "PERFORMANCE",
        agentId: "performance-auditor",
        healthLevel,
        oneLiner,
        openItems: performance.gateBlockers.length,
        topRisk: !performance.displaySafe
          ? `${performance.remainingToThreshold} canonical picks short of display threshold.`
          : null,
        recommendedAction: !performance.displaySafe
          ? `Settle ${performance.remainingToThreshold} more canonical picks before enabling performance display.`
          : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision:
          performance.gateBlockers.length > 0 && !performance.displaySafe,
      };
    },
  },

  {
    agentId: "ai-ops-officer",
    department: "AI_OPS",
    buildReport(summary) {
      const { aiOps, assessedAt } = summary;

      return {
        department: "AI_OPS",
        agentId: "ai-ops-officer",
        healthLevel: "ATTENTION",
        oneLiner: `AI Ops telemetry unavailable (source: aiOps.available=false). ${aiOps.errorTracking}. Model lane policy: active.`,
        openItems: aiOps.toInstrumentNext.length,
        topRisk:
          aiOps.toInstrumentNext.length > 0
            ? `${aiOps.toInstrumentNext.length} instrumentation item${aiOps.toInstrumentNext.length === 1 ? "" : "s"} pending: ${aiOps.toInstrumentNext[0]}`
            : null,
        recommendedAction:
          aiOps.toInstrumentNext.length > 0
            ? `Wire observability: ${aiOps.toInstrumentNext[0]}`
            : null,
        lastUpdated: assessedAt,
        requiresOwnerDecision: false,
      };
    },
  },
];

// ─── Report builders ──────────────────────────────────────────────────────────

export function buildDepartmentReport(
  agentId: string,
  summary: OwnerSummary,
): DepartmentReport {
  const config = DEPT_CONFIGS.find((c) => c.agentId === agentId);
  if (!config) {
    return {
      department: agentId.toUpperCase(),
      agentId,
      healthLevel: "UNKNOWN",
      oneLiner: `No department config for agent "${agentId}" (source: dept-config registry).`,
      openItems: 0,
      topRisk: null,
      recommendedAction: null,
      lastUpdated: summary.assessedAt,
      requiresOwnerDecision: false,
    };
  }
  return config.buildReport(summary);
}

export function buildAllDepartmentReports(
  summary: OwnerSummary,
): readonly DepartmentReport[] {
  return DEPT_CONFIGS.map((c) => c.buildReport(summary));
}

function aggregateHealth(reports: readonly DepartmentReport[]): DeptHealthLevel {
  if (reports.some((r) => r.healthLevel === "CRITICAL")) return "CRITICAL";
  if (reports.some((r) => r.healthLevel === "DEGRADED")) return "DEGRADED";
  if (reports.some((r) => r.healthLevel === "ATTENTION")) return "ATTENTION";
  if (reports.every((r) => r.healthLevel === "HEALTHY")) return "HEALTHY";
  return "UNKNOWN";
}

export function buildIntelligenceBriefing(
  reports: readonly DepartmentReport[],
  osState: JarvisOSState,
): IntelligenceBriefing {
  const generatedAt = new Date().toISOString();
  const summary = osState.summary;

  const criticalDepartments = reports
    .filter((r) => r.healthLevel === "CRITICAL")
    .map((r) => r.department);

  const attentionDepartments = reports
    .filter((r) => r.healthLevel === "ATTENTION" || r.healthLevel === "DEGRADED")
    .map((r) => r.department);

  const healthyDepartments = reports
    .filter((r) => r.healthLevel === "HEALTHY")
    .map((r) => r.department);

  const overallHealth = aggregateHealth(reports);

  // Executive summary: 2-3 sentences, board-room register.
  const colorWord =
    summary.overallColor === "GREEN" ? "GREEN"
      : summary.overallColor === "AMBER" ? "AMBER"
        : "RED";

  const execLines: string[] = [
    `Platform ${colorWord} — ${summary.oneLiner}`,
  ];
  if (criticalDepartments.length > 0) {
    execLines.push(
      `${criticalDepartments.length} department${criticalDepartments.length === 1 ? "" : "s"} critical: ${criticalDepartments.join(", ")}.`,
    );
  } else if (attentionDepartments.length > 0) {
    execLines.push(
      `${attentionDepartments.length} department${attentionDepartments.length === 1 ? "" : "s"} need attention: ${attentionDepartments.join(", ")}.`,
    );
  } else {
    execLines.push("All departments reporting normally.");
  }
  const executiveSummary = execLines.join(" ").slice(0, 299);

  // Top 3 actions — prioritized: critical first, then attention, then general.
  const allActions = reports
    .filter((r) => r.recommendedAction !== null)
    .sort((a, b) => {
      const rank = (h: DeptHealthLevel) =>
        h === "CRITICAL" ? 0 : h === "DEGRADED" ? 1 : h === "ATTENTION" ? 2 : 3;
      return rank(a.healthLevel) - rank(b.healthLevel);
    })
    .map((r) => r.recommendedAction as string);

  const topThreeActions = allActions.slice(0, 3);

  const ownerDecisionQueue = [
    ...summary.decisions.map((d) => d.description),
    ...reports
      .filter((r) => r.requiresOwnerDecision)
      .map((r) => `[${r.department}] ${r.oneLiner}`),
  ].slice(0, 5);

  const safeToDelegate = healthyDepartments
    .concat(
      reports
        .filter((r) => r.healthLevel === "HEALTHY" && !r.requiresOwnerDecision)
        .map((r) => r.department)
        .filter((d) => !healthyDepartments.includes(d)),
    )
    .slice(0, 5);

  // Morning briefing: what the owner reads
  const briefingLines: string[] = [
    execLines.join(" "),
    "",
    `NEEDS YOUR DECISION (${ownerDecisionQueue.length}):`,
  ];
  if (ownerDecisionQueue.length > 0) {
    ownerDecisionQueue.forEach((item, i) => briefingLines.push(`  ${i + 1}. ${item}`));
  } else {
    briefingLines.push("  None.");
  }

  briefingLines.push(
    "",
    `RUNNING FINE — NO ACTION NEEDED (${healthyDepartments.length}):`,
    `  ${healthyDepartments.length > 0 ? healthyDepartments.join(", ") : "None yet."}`,
  );

  if (topThreeActions.length > 0) {
    briefingLines.push("", `NEXT BUILD: ${topThreeActions[0]}`);
  }

  return {
    generatedAt,
    overallHealth,
    criticalDepartments,
    attentionDepartments,
    healthyDepartments,
    executiveSummary,
    topThreeActions,
    ownerDecisionQueue,
    safeToDelegate,
    briefingForOwner: briefingLines.join("\n"),
  };
}

export function generateMorningBriefing(
  summary: OwnerSummary,
  osState: JarvisOSState,
): string {
  const reports = buildAllDepartmentReports(summary);
  const briefing = buildIntelligenceBriefing(reports, osState);

  const decisionsCount = briefing.ownerDecisionQueue.length;
  const healthyCount = briefing.healthyDepartments.length;
  const nextBuild =
    briefing.topThreeActions[0] ??
    "No immediate build actions. Continue monitoring ingestion and settlement.";

  const lines: string[] = [
    `${briefing.executiveSummary}`,
    "",
    `NEEDS YOUR DECISION: ${decisionsCount} item${decisionsCount === 1 ? "" : "s"}.`,
  ];
  briefing.ownerDecisionQueue.forEach((item, i) => {
    lines.push(`  ${i + 1}. ${item}`);
  });
  if (decisionsCount === 0) lines.push("  None pending.");

  lines.push(
    "",
    `RUNNING FINE — NO ACTION NEEDED: ${healthyCount} department${healthyCount === 1 ? "" : "s"}.`,
    `  ${healthyCount > 0 ? briefing.healthyDepartments.join(", ") : "None yet."}`,
    "",
    `NEXT BUILD: ${nextBuild}`,
  );

  return lines.join("\n");
}
