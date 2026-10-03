/**
 * Owner Summary — high-altitude synthesis for the Jarvis Owner OS.
 *
 * Pure, I/O-free function. Takes existing Jarvis assessment + performance
 * policy + today's context and produces the typed OwnerSummary the cockpit
 * landing page consumes.
 *
 * Trust rules enforced here:
 *   - performance.displaySafe is ONLY true when canExposePerformanceStats is
 *     true AND canonicalSampleSize >= minimumRequired.
 *   - performance.actualWinRate is null whenever displaySafe is false.
 *   - Pending and bootstrap picks are never counted in the win rate.
 *   - All departments are labeled DRAFT_ONLY or MANUAL — never AUTONOMOUS.
 *   - AI Ops telemetry is unavailable until wired; stated honestly.
 *   - 70% is always presented as the target, never as a claimed result
 *     unless canonical data and the display gate both allow it.
 */

import type { JarvisAssessment, JarvisHealth } from "./jarvis";
import type { PublicPerformancePolicy } from "../performance/public-performance-policy";
import { observabilityPosture } from "../observability/sentry";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface GatesForOwnerSummary {
  readonly canExposePublicPicks: boolean;
  readonly isBootstrapMode: boolean;
  readonly minSettledPicksForLearning: number;
}

export interface BuildOwnerSummaryInput {
  readonly assessment: JarvisAssessment;
  readonly performancePolicy: PublicPerformancePolicy;
  readonly gates: GatesForOwnerSummary;
  readonly todayPickCount: number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export type OwnerStatusColor = "GREEN" | "AMBER" | "RED";
export type AgentMode = "DRAFT_ONLY" | "MANUAL" | "UNAVAILABLE";
export type DecisionUrgency = "CRITICAL" | "HIGH" | "NORMAL";

export interface PicksSummary {
  readonly today: number;
  readonly isPublicGateOpen: boolean;
  readonly publicReadyCount: number;
  readonly blockedReason: string | null;
  readonly canonicalPending: number;
  readonly canonicalSettled: number;
  readonly bootstrapExcluded: number;
  readonly totalInSystem: number;
  readonly publicReadinessExplanation: string;
}

export interface PerformanceSummary {
  /** Always 70 — this is the internal target, never a result. */
  readonly targetPct: 70;
  /** null unless displaySafe is true. Never derived from pending or bootstrap picks. */
  readonly actualWinRate: number | null;
  readonly canonicalSampleSize: number;
  readonly minimumRequired: number;
  readonly remainingToThreshold: number;
  readonly isGateOpen: boolean;
  /** Only true when gate is open AND canonical sample >= minimum. */
  readonly displaySafe: boolean;
  readonly gateBlockers: readonly string[];
  readonly smallSampleWarning: boolean;
  readonly record: string;
}

export interface DepartmentSummary {
  readonly id: string;
  readonly name: string;
  readonly agentKey: string | null;
  readonly agentDisplayName: string | null;
  readonly status: JarvisHealth;
  readonly oneLiner: string;
  readonly actionRequired: boolean;
  readonly actionDescription: string | null;
  /** DRAFT_ONLY = agent produces drafts requiring human approval.
   *  MANUAL = no agent, human-run.
   *  UNAVAILABLE = agent planned but not yet active. */
  readonly agentMode: AgentMode;
  readonly drilldownHref: string | null;
}

export interface OwnerDecision {
  readonly urgency: DecisionUrgency;
  readonly description: string;
  readonly link: string | null;
}

export interface AiOpsSummary {
  /** Always false until telemetry is wired. Honest unavailable state. */
  readonly available: false;
  readonly reason: string;
  readonly modelLanePolicy: readonly string[];
  readonly toInstrumentNext: readonly string[];
  readonly ccusageNote: string;
  /** Honest error-tracking posture derived from env presence only. */
  readonly errorTracking: string;
}

export interface OwnerSummary {
  readonly overallColor: OwnerStatusColor;
  readonly oneLiner: string;
  readonly picks: PicksSummary;
  readonly performance: PerformanceSummary;
  readonly departments: readonly DepartmentSummary[];
  readonly decisions: readonly OwnerDecision[];
  readonly criticalWarnings: readonly string[];
  readonly advisoryWarnings: readonly string[];
  readonly aiOps: AiOpsSummary;
  readonly assessedAt: string;
  readonly jarvisVersion: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveOverallColor(assessment: JarvisAssessment): OwnerStatusColor {
  if (assessment.safetyWarnings.length > 0) return "RED";
  if (
    assessment.launchStatus === "NOT_READY_DATA" ||
    assessment.launchStatus === "NOT_READY_SAFETY"
  ) {
    return "RED";
  }
  if (assessment.launchStatus === "LAUNCH_READY") return "GREEN";
  return "AMBER";
}

function buildPicksSummary(
  assessment: JarvisAssessment,
  gates: GatesForOwnerSummary,
  policy: PublicPerformancePolicy,
  todayPickCount: number
): PicksSummary {
  const gateOpen = gates.canExposePublicPicks;

  let blockedReason: string | null = null;
  let explanation: string;

  if (!gateOpen) {
    blockedReason = "PUBLIC_PICKS_ENABLED gate is off";
    explanation =
      "Picks are scoring and publishing internally. The PUBLIC_PICKS_ENABLED " +
      "gate is closed — no picks are exposed on the customer surface. " +
      "This is intentional until you open the gate.";
  } else if (assessment.picksStatus === "RED") {
    blockedReason = "No picks published yet";
    explanation =
      "The public picks gate is open but no picks have been published. " +
      "Run the ingestion and scoring workers to generate the first picks.";
  } else {
    explanation =
      `Public picks gate is open. ${todayPickCount} pick${todayPickCount === 1 ? "" : "s"} published today. ` +
      `${policy.canonicalSettledCount} canonical picks settled in total.`;
  }

  const totalInSystem =
    policy.canonicalSettledCount +
    policy.bootstrapCount +
    policy.pendingCount;

  return {
    today: todayPickCount,
    isPublicGateOpen: gateOpen,
    publicReadyCount: gateOpen ? todayPickCount : 0,
    blockedReason,
    canonicalPending: policy.pendingCount,
    canonicalSettled: policy.canonicalSettledCount,
    bootstrapExcluded: policy.bootstrapCount,
    totalInSystem,
    publicReadinessExplanation: explanation,
  };
}

function buildPerformanceSummary(
  policy: PublicPerformancePolicy,
  gates: GatesForOwnerSummary
): PerformanceSummary {
  const minRequired =
    gates.minSettledPicksForLearning > 0 ? gates.minSettledPicksForLearning : 25;
  const remaining = Math.max(0, minRequired - policy.canonicalSettledCount);
  const gateOpen = !policy.blockers.includes("GATE_OFF_PERFORMANCE_STATS");
  const smallSample =
    policy.canonicalSettledCount > 0 && policy.canonicalSettledCount < minRequired;

  return {
    targetPct: 70,
    actualWinRate: policy.canExposePerformanceStats ? policy.publicWinRate : null,
    canonicalSampleSize: policy.canonicalSettledCount,
    minimumRequired: minRequired,
    remainingToThreshold: remaining,
    isGateOpen: gateOpen,
    displaySafe: policy.canExposePerformanceStats,
    gateBlockers: policy.blockers,
    smallSampleWarning: smallSample,
    record: policy.publicRecord,
  };
}

function picksOneLiner(assessment: JarvisAssessment, todayCount: number): string {
  if (assessment.picksStatus === "GREEN") {
    return `${todayCount} pick${todayCount === 1 ? "" : "s"} published today. Gate open, picks flowing.`;
  }
  if (assessment.picksStatus === "AMBER") {
    return "Picks gate closed. Picks scoring internally only.";
  }
  if (assessment.picksStatus === "RED") {
    return "Gate open but no picks published. Run scoring workers.";
  }
  return "Pick status unknown. Check ingestion.";
}

function ingestionOneLiner(status: JarvisHealth): string {
  if (status === "GREEN") return "Ingestion is fresh. Data pipeline healthy.";
  if (status === "AMBER") return "Ingestion has warnings. Check adapter health.";
  if (status === "RED") return "Ingestion failing or stale. Fix before public claims.";
  return "No ingestion history. Run first refresh.";
}

function settlementOneLiner(status: JarvisHealth): string {
  if (status === "GREEN") return "Settlements running. Results are current.";
  if (status === "AMBER") return "Settlement delayed. Pending picks accumulating.";
  if (status === "RED") return "Settlement stale or failed. Picks need settling.";
  return "No settlements yet. Normal for early stage.";
}

function performanceOneLiner(
  policy: PublicPerformancePolicy,
  minRequired: number
): string {
  if (policy.canExposePerformanceStats) {
    return `Win rate live. ${policy.canonicalSettledCount} canonical picks settled.`;
  }
  if (policy.blockers.includes("GATE_OFF_PERFORMANCE_STATS")) {
    return `Gate closed. ${policy.canonicalSettledCount}/${minRequired} canonical picks accumulated.`;
  }
  if (policy.blockers.includes("INSUFFICIENT_CANONICAL_SAMPLE")) {
    return `Sample too small. ${policy.canonicalSettledCount} of ${minRequired} canonical picks needed.`;
  }
  return "Performance display gated. No canonical picks yet.";
}

function riskOneLiner(assessment: JarvisAssessment): string {
  const n = assessment.safetyWarnings.length;
  if (n > 0) {
    return `${n} safety warning${n === 1 ? "" : "s"} active. Review before expanding public reach.`;
  }
  if (assessment.publicSurfaceStatus === "GREEN") return "No safety warnings. Public surface clean.";
  if (assessment.publicSurfaceStatus === "AMBER") return "Minor warnings. Review before expanding public reach.";
  return "Safety status unknown.";
}

function customerSurfaceOneLiner(status: JarvisHealth): string {
  if (status === "GREEN") return "Customer dashboard healthy. Performance policy honoured.";
  if (status === "AMBER") return "Dashboard functional. Performance stats gated per policy.";
  if (status === "RED") return "Customer dashboard has issues. Investigate.";
  return "Customer surface status unknown.";
}

function buildDepartments(
  assessment: JarvisAssessment,
  policy: PublicPerformancePolicy,
  todayPickCount: number,
  minRequired: number
): DepartmentSummary[] {
  return [
    {
      id: "picks-desk",
      name: "Picks Desk",
      agentKey: "SCOUT",
      agentDisplayName: "Scout",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/cockpit/history",
      status: assessment.picksStatus,
      oneLiner: picksOneLiner(assessment, todayPickCount),
      actionRequired: assessment.picksStatus === "RED",
      actionDescription:
        assessment.picksStatus === "RED"
          ? "No picks published. Run ingestion and scoring workers."
          : null,
    },
    {
      id: "data-reliability",
      name: "Data Reliability",
      agentKey: "TAL",
      agentDisplayName: "Tal",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/admin/dashboard",
      status: assessment.ingestionStatus,
      oneLiner: ingestionOneLiner(assessment.ingestionStatus),
      actionRequired: assessment.ingestionStatus === "RED",
      actionDescription:
        assessment.ingestionStatus === "RED"
          ? "Ingestion failing or stale. Check /admin/dashboard."
          : null,
    },
    {
      id: "settlement-results",
      name: "Settlement & Results",
      agentKey: null,
      agentDisplayName: null,
      agentMode: "MANUAL",
      drilldownHref: "/cockpit/history",
      status: assessment.settlementStatus,
      oneLiner: settlementOneLiner(assessment.settlementStatus),
      actionRequired: assessment.settlementStatus === "RED",
      actionDescription:
        assessment.settlementStatus === "RED"
          ? "Settlement stale or failed. Run settlement worker."
          : null,
    },
    {
      id: "performance-calibration",
      name: "Performance & Calibration",
      agentKey: null,
      agentDisplayName: null,
      agentMode: "MANUAL",
      drilldownHref: "/cockpit/calibration",
      status: assessment.performanceStatus,
      oneLiner: performanceOneLiner(policy, minRequired),
      actionRequired: false,
      actionDescription: null,
    },
    {
      id: "risk-public-claims",
      name: "Risk & Public Claims",
      agentKey: "JARVIS",
      agentDisplayName: "Jarvis",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/cockpit",
      status: assessment.safetyWarnings.length > 0 ? "RED" : assessment.publicSurfaceStatus,
      oneLiner: riskOneLiner(assessment),
      actionRequired: assessment.safetyWarnings.length > 0,
      actionDescription:
        assessment.safetyWarnings.length > 0
          ? "Safety warnings active. Do not expand public surface until resolved."
          : null,
    },
    {
      id: "customer-surface",
      name: "Customer Surface",
      agentKey: "SARAH",
      agentDisplayName: "Sarah",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/dashboard",
      status: assessment.customerDashboardStatus,
      oneLiner: customerSurfaceOneLiner(assessment.customerDashboardStatus),
      actionRequired: assessment.customerDashboardStatus === "RED",
      actionDescription:
        assessment.customerDashboardStatus === "RED"
          ? "Customer dashboard has issues. Investigate."
          : null,
    },
    {
      id: "content-media",
      name: "Content & Media",
      agentKey: "AVA",
      agentDisplayName: "Ava",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/cockpit/content",
      status: assessment.historicalPickStatus,
      oneLiner: "Draft-only engine. All content requires human approval before publish.",
      actionRequired: false,
      actionDescription: null,
    },
    {
      id: "revenue-subscriptions",
      name: "Revenue & Subscriptions",
      agentKey: "BOBBY",
      agentDisplayName: "Bobby",
      agentMode: "DRAFT_ONLY",
      drilldownHref: "/cockpit/promotions",
      status: "UNKNOWN",
      oneLiner: "Subscription telemetry not instrumented. Manual review required.",
      actionRequired: false,
      actionDescription: null,
    },
  ];
}

function buildDecisions(
  assessment: JarvisAssessment
): {
  decisions: OwnerDecision[];
  criticalWarnings: string[];
  advisoryWarnings: string[];
} {
  const criticalWarnings: string[] = [...assessment.safetyWarnings];
  const advisoryWarnings: string[] = [...assessment.missingPhaseWarnings];

  const decisions: OwnerDecision[] = [];

  for (const w of assessment.safetyWarnings) {
    decisions.push({ urgency: "CRITICAL", description: w, link: null });
  }

  for (const k of assessment.externalConfigWarnings) {
    decisions.push({
      urgency: "HIGH",
      description: `Configure missing environment variable: ${k}`,
      link: null,
    });
  }

  const actionsTaken = new Set<string>();
  for (const w of assessment.safetyWarnings) actionsTaken.add(w);

  for (const action of assessment.recommendedNextActions.slice(0, 3)) {
    if (!actionsTaken.has(action)) {
      decisions.push({ urgency: "NORMAL", description: action, link: null });
    }
  }

  return { decisions, criticalWarnings, advisoryWarnings };
}

const AI_OPS_POLICY: readonly string[] = [
  "Haiku / cheap model: file search, grep, summaries, mechanical tasks",
  "Sonnet: bounded implementation (current session)",
  "Opus: architecture-critical decisions only",
  "Codex: repo audit, tests, type errors, mechanical changes",
  "ChatGPT: planning and research compression before Claude touches the repo",
  "Human owner: public claims, privacy/provider approval, major product tradeoffs",
];

const AI_OPS_INSTRUMENT: readonly string[] = [
  "Wire ccusage daily totals to /cockpit/api-costs (run: npx ccusage@latest)",
  "Add Langfuse or Helicone before first paid model call at scale",
  "Create docs/ai/GSE_AI_OPERATING_DOCTRINE.md for context discipline",
  "Create docs/ai/JARVIS_CONTEXT.md as focused context packet for future agents",
];

function buildAiOps(): AiOpsSummary {
  return {
    available: false,
    reason:
      "Usage telemetry is not yet instrumented. No token counts, model costs, " +
      "or failed-run data flow into Jarvis automatically. This is the honest state.",
    modelLanePolicy: AI_OPS_POLICY,
    toInstrumentNext: AI_OPS_INSTRUMENT,
    ccusageNote:
      "ccusage is available in this environment. " +
      "Run `npx ccusage@latest` in the terminal to see daily Claude spend. " +
      "Wire the output to /cockpit/api-costs to make it persistent.",
    errorTracking: observabilityPosture(),
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildOwnerSummary(input: BuildOwnerSummaryInput): OwnerSummary {
  const { assessment, performancePolicy, gates, todayPickCount } = input;

  const minRequired =
    gates.minSettledPicksForLearning > 0 ? gates.minSettledPicksForLearning : 25;

  const overallColor = deriveOverallColor(assessment);
  const picks = buildPicksSummary(assessment, gates, performancePolicy, todayPickCount);
  const performance = buildPerformanceSummary(performancePolicy, gates);
  const departments = buildDepartments(
    assessment,
    performancePolicy,
    todayPickCount,
    minRequired
  );
  const { decisions, criticalWarnings, advisoryWarnings } = buildDecisions(assessment);
  const aiOps = buildAiOps();

  return {
    overallColor,
    oneLiner: assessment.oneSentenceAssessment,
    picks,
    performance,
    departments,
    decisions,
    criticalWarnings,
    advisoryWarnings,
    aiOps,
    assessedAt: assessment.assessedAt,
    jarvisVersion: assessment.version,
  };
}
