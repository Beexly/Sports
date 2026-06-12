/**
 * Department intelligence reports — Layer C of Executive Intelligence v2.
 *
 * Each department head synthesizes their domain up to Jarvis; Jarvis
 * synthesizes for the owner. Health is NEVER claimed without
 * OwnerSummary evidence — a department absent from the summary reports
 * UNKNOWN, honestly. No raw data crosses this layer: one-liners,
 * counts, the single top risk, the recommended action.
 */

import type { OwnerSummary, DepartmentSummary } from "@/lib/cockpit/owner-summary";
import { getCouncilMember } from "./agent-council";

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

/** Department → council seat. The eight desks that report up. */
export const DEPARTMENTS: ReadonlyArray<readonly [string, string]> = [
  ["PICKS_DESK", "scout"],
  ["DATA_PIPELINE", "tal"],
  ["CUSTOMER_SURFACE", "sarah"],
  ["CONTENT", "ava"],
  ["REVENUE", "bobby"],
  ["SETTLEMENT", "settlement-officer"],
  ["PERFORMANCE", "performance-auditor"],
  ["AI_OPS", "ai-ops-officer"],
];

function healthFromSummary(s: DepartmentSummary | undefined): DeptHealthLevel {
  if (!s) return "UNKNOWN";
  if (s.status === "RED") return "CRITICAL";
  if (s.status === "AMBER") return s.actionRequired ? "DEGRADED" : "ATTENTION";
  if (s.status === "GREEN") return "HEALTHY";
  return "UNKNOWN";
}

/** Match a summary department to a council seat by agentKey or name. */
function findSummaryDept(
  summary: OwnerSummary,
  agentId: string,
  department: string
): DepartmentSummary | undefined {
  const seat = getCouncilMember(agentId);
  const codename = seat?.codename?.toUpperCase();
  return summary.departments.find(
    (d) =>
      d.agentKey?.toUpperCase() === codename ||
      d.agentKey?.toLowerCase() === agentId ||
      d.id.toUpperCase() === department ||
      d.name.toUpperCase().replace(/[^A-Z]/g, "_") === department
  );
}

export function buildDepartmentReport(
  agentId: string,
  summary: OwnerSummary
): DepartmentReport {
  const entry = DEPARTMENTS.find(([, id]) => id === agentId);
  const department = entry?.[0] ?? agentId.toUpperCase();
  const sd = findSummaryDept(summary, agentId, department);
  const health = healthFromSummary(sd);
  const seat = getCouncilMember(agentId);

  return {
    department,
    agentId,
    healthLevel: health,
    oneLiner: sd
      ? sd.oneLiner
      : `No evidence in OwnerSummary for ${department} — reporting UNKNOWN, not guessing.`,
    openItems: sd?.actionRequired ? 1 : 0,
    topRisk:
      health === "CRITICAL" || health === "DEGRADED"
        ? sd?.actionDescription ?? sd?.oneLiner ?? null
        : null,
    recommendedAction: sd?.actionDescription ?? null,
    lastUpdated: summary.assessedAt,
    requiresOwnerDecision: Boolean(sd?.actionRequired),
    ...(seat ? {} : {}),
  };
}

export function buildAllDepartmentReports(
  summary: OwnerSummary
): readonly DepartmentReport[] {
  return DEPARTMENTS.map(([, agentId]) => buildDepartmentReport(agentId, summary));
}

const HEALTH_RANK: Readonly<Record<DeptHealthLevel, number>> = {
  CRITICAL: 4,
  DEGRADED: 3,
  ATTENTION: 2,
  UNKNOWN: 1,
  HEALTHY: 0,
};

export function buildIntelligenceBriefing(
  reports: readonly DepartmentReport[],
  summary: OwnerSummary,
  nowIso: string = new Date().toISOString()
): IntelligenceBriefing {
  const critical = reports.filter((r) => r.healthLevel === "CRITICAL");
  const attention = reports.filter(
    (r) => r.healthLevel === "DEGRADED" || r.healthLevel === "ATTENTION"
  );
  const healthy = reports.filter((r) => r.healthLevel === "HEALTHY");

  const worst = reports.reduce<DeptHealthLevel>(
    (acc, r) => (HEALTH_RANK[r.healthLevel] > HEALTH_RANK[acc] ? r.healthLevel : acc),
    "HEALTHY"
  );

  const actions = reports
    .filter((r) => r.recommendedAction)
    .sort((a, b) => HEALTH_RANK[b.healthLevel] - HEALTH_RANK[a.healthLevel])
    .slice(0, 3)
    .map((r) => `${r.department}: ${r.recommendedAction}`);

  const decisionQueue = summary.decisions.map(
    (d) => `[${d.urgency}] ${d.description}`
  );

  const safeToDelegate = reports
    .filter((r) => !r.requiresOwnerDecision && r.healthLevel !== "CRITICAL")
    .map((r) => r.department);

  // Executive summary: hard cap < 300 chars, board register.
  const executiveSummary = (
    `${summary.overallColor} overall. ` +
    `${critical.length} critical, ${attention.length} need attention, ` +
    `${healthy.length} healthy. ` +
    `${decisionQueue.length} decision${decisionQueue.length === 1 ? "" : "s"} in your queue.`
  ).slice(0, 299);

  return {
    generatedAt: nowIso,
    overallHealth: worst,
    criticalDepartments: critical.map((r) => r.department),
    attentionDepartments: attention.map((r) => r.department),
    healthyDepartments: healthy.map((r) => r.department),
    executiveSummary,
    topThreeActions: actions,
    ownerDecisionQueue: decisionQueue,
    safeToDelegate,
    briefingForOwner: generateMorningBriefing(summary, reports, nowIso),
  };
}

export function generateMorningBriefing(
  summary: OwnerSummary,
  reports: readonly DepartmentReport[],
  nowIso: string = new Date().toISOString()
): string {
  const needsDecision = summary.decisions;
  const fine = reports.filter(
    (r) => r.healthLevel === "HEALTHY" && !r.requiresOwnerDecision
  );
  const aware = reports.filter(
    (r) => r.healthLevel === "DEGRADED" || r.healthLevel === "ATTENTION"
  );
  const nextBuild =
    reports.find((r) => r.healthLevel === "CRITICAL")?.recommendedAction ??
    reports.find((r) => r.healthLevel === "DEGRADED")?.recommendedAction ??
    "Hold course — keep accumulating settled picks toward the performance gate.";

  const lines: string[] = [
    `Morning. ${summary.oneLiner} Overall ${summary.overallColor}, assessed ${summary.assessedAt.slice(0, 16).replace("T", " ")} UTC.`,
    "",
    `NEEDS YOUR DECISION: ${needsDecision.length}`,
    ...needsDecision.map((d, i) => `  ${i + 1}. [${d.urgency}] ${d.description}`),
    "",
    `RUNNING FINE — NO ACTION NEEDED: ${fine.length} department${fine.length === 1 ? "" : "s"}` +
      (fine.length > 0 ? ` (${fine.map((r) => r.department).join(", ")})` : ""),
  ];
  if (aware.length > 0) {
    lines.push(
      "",
      `AWARENESS (no decision needed): ${aware
        .map((r) => `${r.department} — ${r.oneLiner}`)
        .join(" · ")}`
    );
  }
  lines.push("", `NEXT BUILD: ${nextBuild}`);
  void nowIso;
  return lines.join("\n");
}
