/**
 * Daily Command — composition layer (I/O at the edges).
 *
 * Assembles the five-lane owner console from the platform's existing real
 * substrate. It adds NO new source of truth and NEVER throws: any failure
 * degrades the affected lane to a clearly labeled fallback so the console
 * always renders.
 *
 * Lane sourcing (honest, not aspirational):
 *   - Money Next      MOCK/empty-honest. No revenue rollup exists; we surface
 *                     the honest revenueStatus string + BOBBY's next action and
 *                     label the lane "Telemetry not wired." Never invents MRR.
 *   - Approval Queue  REAL. Transitionable CockpitTask rows + read-only seed
 *                     advisory items from the Jarvis decision queue.
 *   - Agent Activity  REAL static. Projects the agent registry + health. Honest
 *                     that "agents are roles, not running processes."
 *   - Signals         REAL. Claude API spend (budget rings) + ingestion/
 *                     settlement health from the operating assessment. CLV/line
 *                     intelligence is labeled DESIGNED, not wired.
 *   - Lessons         MOCK/empty-honest. No lessons store; memory NOT_WIRED.
 *                     Links to /cockpit/losses + /cockpit/calibration.
 */

import { db, isStubMode } from "@sports/db";
import type { CockpitRiskLevel, CockpitTaskStatus } from "@prisma/client";
import { AGENT_OS_REGISTRY, getAgent } from "@/lib/agents/agent-registry";
import { scoreCandidate } from "@/lib/cockpit/scoring";
import type { ScoringInput } from "@/lib/cockpit/scoring";
import type { CardScore } from "./types";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { buildJarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import {
  getJarvisClaudeReviewItems,
  getJarvisOwnerDecisions,
} from "@/lib/jarvis/jarvis-decision-queue";
import { loadClaudeApiCostsDashboard } from "@/lib/claude-api/dashboard";
import { buildDecisionActions } from "./decision-mapping";
import type {
  CardRisk,
  CommandCard,
  CommandDataMode,
  CommandLane,
  DailyCommand,
  DataMode,
  SignalGauge,
} from "./types";

// The statuses that belong in the approval queue (open, pre-terminal work).
const QUEUE_STATUSES: readonly CockpitTaskStatus[] = [
  "NEEDS_REVIEW",
  "DRAFTED",
  "NEW",
  "ROUTED",
  "BLOCKED",
];

function riskFromCockpit(level: string): CardRisk {
  switch (level) {
    case "COMPLIANCE_HOLD":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MODERATE":
      return "MEDIUM";
    case "LOW":
      return "LOW";
    default:
      return "NONE";
  }
}

function agentDisplayName(assignedAgent: string): string {
  const found = AGENT_OS_REGISTRY.find(
    (a) => a.id.toUpperCase() === assignedAgent.toUpperCase()
  );
  return found?.displayName ?? assignedAgent;
}

function rollup(lanes: readonly CommandLane[]): CommandDataMode {
  if (lanes.length === 0) return "unavailable";
  if (lanes.every((l) => l.dataMode === "unavailable")) return "unavailable";
  return lanes.some((l) => l.dataMode !== "live")
    ? "live_with_labeled_fallbacks"
    : "live";
}

// ── Lane: Money Next (MOCK / empty-honest) ─────────────────────────────────

export function buildMoneyNext(revenueStatus: string, bobbyNextAction: string): CommandLane {
  const card: CommandCard = {
    id: "money-next-revenue",
    title: "Revenue telemetry not wired",
    whyItMatters:
      "There is no MRR/funnel rollup yet, so no money number can be shown honestly.",
    agentOwner: agentDisplayName("bobby"),
    confidence: null,
    risk: "NONE",
    expectedImpact: null,
    evidence: [
      { label: "Revenue status", value: revenueStatus },
      { label: "Next analyst action", value: bobbyNextAction },
    ],
    actionButtons: [],
    taskId: null,
  };
  return {
    key: "money_next",
    title: "Money Next",
    subtitle: "The next dollar-moving decision",
    dataMode: "unavailable",
    fallbackReason:
      "Telemetry not wired — no Stripe/funnel rollup exists. No revenue number is fabricated.",
    cards: [card],
  };
}

// ── Lane: Approval Queue (REAL + read-only seed advisory) ──────────────────

interface QueueTaskRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: CockpitTaskStatus;
  readonly priority: number;
  readonly riskLevel: string;
  readonly assignedAgent: string;
  readonly complianceStatus: string;
  readonly decisions: ReadonlyArray<{
    readonly toStatus: CockpitTaskStatus;
    readonly reviewer: string;
    readonly note: string | null;
    readonly createdAt: Date;
  }>;
}

/**
 * Compute a cockpit score for an Approval Queue task. Pure + defensive: any
 * unexpected shape degrades to no score rather than throwing, preserving the
 * loader's never-throw discipline. The scoring engine itself does no I/O.
 *
 * Inputs are derived from real task + agent-registry fields:
 *   - riskLevel       — the CockpitTask risk classification.
 *   - sensitiveDomains— inferred from the owning agent (model/calibration-
 *                       sensitive agents map to MODEL_WEIGHTS) and the task's
 *                       compliance status (a HOLD signals a rights/compliance
 *                       concern).
 *   - ownerApprovalRequired — the agent's own approval gate.
 */
function scoreQueueTask(task: QueueTaskRow): CardScore | null {
  try {
    const agent = getAgent(task.assignedAgent.toLowerCase());
    const sensitiveDomains: NonNullable<ScoringInput["sensitiveDomains"]>[number][] = [];
    // Scoring-sensitive agents (PRISM/ASCEND/AUDIT) touch model weights/calibration.
    if (agent && (agent.riskLevel === "HIGH" || agent.claudeReviewRequired)) {
      sensitiveDomains.push("MODEL_WEIGHTS");
    }
    // A compliance hold/review flags a rights/scraping or claims concern.
    if (task.complianceStatus === "HOLD" || task.complianceStatus === "REVIEW_REQUIRED") {
      sensitiveDomains.push("RIGHTS_SCRAPING");
    }
    const result = scoreCandidate({
      assignedAgent: task.assignedAgent,
      riskLevel: task.riskLevel as CockpitRiskLevel,
      sensitiveDomains,
      ownerApprovalRequired: agent?.ownerApprovalRequired ?? true,
      authorityLevel: agent?.authorityLevel,
    });
    return {
      routing: result.routing,
      complianceRisk: result.complianceRisk,
      confidence: result.confidence,
    };
  } catch {
    return null; // never throw — a missing score is acceptable, a crash is not
  }
}

function realTaskToCard(task: QueueTaskRow): CommandCard {
  const lastDecision = task.decisions[0];
  const evidence = [
    { label: "Status", value: task.status },
    { label: "Priority", value: String(task.priority) },
  ];
  if (task.complianceStatus !== "NOT_APPLICABLE") {
    evidence.push({ label: "Compliance", value: task.complianceStatus });
  }
  if (lastDecision) {
    evidence.push({
      label: "Last decision",
      value: `→ ${lastDecision.toStatus} by ${lastDecision.reviewer}`,
    });
  }
  return {
    id: `task-${task.id}`,
    title: task.title,
    whyItMatters: task.description.slice(0, 200),
    agentOwner: agentDisplayName(task.assignedAgent),
    confidence: null,
    risk: riskFromCockpit(task.riskLevel),
    expectedImpact: null,
    evidence,
    actionButtons: buildDecisionActions(task.status),
    taskId: task.id,
    score: scoreQueueTask(task),
  };
}

function seedAdvisoryCards(): readonly CommandCard[] {
  const ownerDecisions = getJarvisOwnerDecisions().slice(0, 4);
  const claudeReview = getJarvisClaudeReviewItems().slice(0, 4);
  const seen = new Set<string>();
  const cards: CommandCard[] = [];
  for (const task of [...ownerDecisions, ...claudeReview]) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    cards.push({
      id: `seed-${task.id}`,
      title: task.title,
      whyItMatters: `${task.description.slice(0, 160)} (seed / advisory — not transitionable)`,
      agentOwner: agentDisplayName(task.assignedAgent),
      confidence: null,
      risk: task.risk as CardRisk,
      expectedImpact: null,
      evidence: [
        { label: "Seed status", value: task.status },
        { label: "Owner approval", value: task.ownerApprovalRequired ? "required" : "no" },
      ],
      actionButtons: [],
      taskId: null,
    });
  }
  return cards;
}

/**
 * Build the Approval Queue lane: real transitionable CockpitTask cards (with
 * scored, allow-list-gated action buttons) first, seed/advisory items after.
 */
export function buildApprovalQueue(
  realTasks: readonly QueueTaskRow[],
  dbReachable: boolean
): CommandLane {
  const realCards = realTasks.map(realTaskToCard);
  const advisory = seedAdvisoryCards();
  const dataMode: DataMode = dbReachable ? "live" : "unavailable";
  return {
    key: "approval_queue",
    title: "Approval Queue",
    subtitle: "Exceptions awaiting an owner decision",
    dataMode,
    fallbackReason: dbReachable
      ? null
      : "Database unreachable (stub or outage) — real tasks could not be loaded. Seed advisory items are read-only.",
    cards: [...realCards, ...advisory],
  };
}

// ── Lane: Agent Activity (REAL static) ─────────────────────────────────────

export function buildAgentActivity(): CommandLane {
  const health = summarizeAgentHealth();
  const headline: CommandCard = {
    id: "agent-activity-summary",
    title: `${health.total} agent roles · ${health.operationalCapacity} running processes`,
    whyItMatters:
      "Agents are roles in a governed registry, not running processes. Operational capacity is genuinely 0.",
    agentOwner: agentDisplayName("jarvis"),
    confidence: null,
    risk: health.externalActionsAllowed > 0 ? "CRITICAL" : "NONE",
    expectedImpact: null,
    evidence: [
      { label: "Draft-only", value: String(health.draftOnly) },
      { label: "Manual", value: String(health.manual) },
      { label: "Not wired", value: String(health.notWired) },
      { label: "External-action capable", value: String(health.externalActionsAllowed) },
    ],
    actionButtons: [],
    taskId: null,
  };

  const perAgent: CommandCard[] = AGENT_OS_REGISTRY.slice(0, 8).map((agent) => ({
    id: `agent-${agent.id}`,
    title: `${agent.displayName} — ${agent.role}`,
    whyItMatters: agent.mission,
    agentOwner: agent.displayName,
    confidence: null,
    risk: agent.riskLevel as CardRisk,
    expectedImpact: null,
    evidence: [
      { label: "Status", value: agent.status },
      { label: "Authority", value: agent.authorityLevel },
      { label: "Owner approval", value: agent.ownerApprovalRequired ? "required" : "no" },
    ],
    actionButtons: [],
    taskId: null,
  }));

  return {
    key: "agent_activity",
    title: "Agent Activity",
    subtitle: "Roles in the governed registry — none act on their own",
    dataMode: "live",
    fallbackReason: null,
    cards: [headline, ...perAgent],
  };
}

// ── Lane: Signals (REAL + labeled DESIGNED metrics) ────────────────────────

export function buildSignals(
  costs: { totalSpentUsd: number; totalBudgetUsd: number; surfaces: ReadonlyArray<{ surface: string; ratio: number; spentUsd: number; budgetUsd: number; status: string }> } | null,
  ingestionStatus: string,
  settlementStatus: string,
  costsReachable: boolean
): { lane: CommandLane; gauges: readonly SignalGauge[] } {
  const cards: CommandCard[] = [];
  const gauges: SignalGauge[] = [];

  if (costsReachable && costs) {
    const ratio = costs.totalBudgetUsd > 0 ? costs.totalSpentUsd / costs.totalBudgetUsd : 0;
    const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    gauges.push({
      label: "Claude budget",
      value: pct,
      display: `${pct}%`,
      caption: `$${costs.totalSpentUsd.toFixed(2)} / $${costs.totalBudgetUsd.toFixed(2)}`,
      tone: pct >= 90 ? "critical" : pct >= 70 ? "warn" : "ok",
    });
    cards.push({
      id: "signal-claude-spend",
      title: `Claude API spend ${pct}% of budget`,
      whyItMatters: "Real per-surface token spend this month against policy budgets.",
      agentOwner: agentDisplayName("meter"),
      confidence: null,
      risk: pct >= 90 ? "HIGH" : "LOW",
      expectedImpact: null,
      evidence: costs.surfaces.slice(0, 5).map((s) => ({
        label: s.surface,
        value: `$${s.spentUsd.toFixed(2)} / $${s.budgetUsd.toFixed(2)} (${s.status})`,
      })),
      actionButtons: [],
      taskId: null,
    });
  }

  cards.push({
    id: "signal-pipeline-health",
    title: "Data pipeline health",
    whyItMatters: "Ingestion and settlement health from the live operating assessment.",
    agentOwner: agentDisplayName("tal"),
    confidence: null,
    risk: ingestionStatus === "RED" || settlementStatus === "RED" ? "HIGH" : "LOW",
    expectedImpact: null,
    evidence: [
      { label: "Ingestion", value: ingestionStatus },
      { label: "Settlement", value: settlementStatus },
    ],
    actionButtons: [],
    taskId: null,
  });

  cards.push({
    id: "signal-clv-line",
    title: "CLV / line intelligence — DESIGNED, not wired",
    whyItMatters:
      "Closing-line value and line-movement signals are designed but not yet backed by live data.",
    agentOwner: agentDisplayName("delta"),
    confidence: null,
    risk: "NONE",
    expectedImpact: null,
    evidence: [{ label: "Status", value: "DESIGNED — no live source" }],
    actionButtons: [],
    taskId: null,
  });

  const lane: CommandLane = {
    key: "signals",
    title: "Signals",
    subtitle: "What the system is telling us right now",
    dataMode: costsReachable ? "live" : "labeled_fallback",
    fallbackReason: costsReachable
      ? null
      : "Cost telemetry unreachable — budget gauge omitted, not fabricated. Pipeline health from assessment only.",
    cards,
  };

  return { lane, gauges };
}

// ── Lane: Lessons (MOCK / empty-honest) ────────────────────────────────────

export function buildLessons(memoryStatus: string): CommandLane {
  const card: CommandCard = {
    id: "lessons-store",
    title: "No lessons store wired",
    whyItMatters:
      "There is no persistent lessons/memory store yet, so no automated lesson can be surfaced.",
    agentOwner: agentDisplayName("archive"),
    confidence: null,
    risk: "NONE",
    expectedImpact: null,
    evidence: [
      { label: "Memory status", value: memoryStatus },
      { label: "Loss autopsies", value: "/cockpit/losses" },
      { label: "Calibration", value: "/cockpit/calibration" },
    ],
    actionButtons: [],
    taskId: null,
  };
  return {
    key: "lessons",
    title: "Lessons",
    subtitle: "What we learned and changed",
    dataMode: "unavailable",
    fallbackReason:
      "No lessons store wired (memory NOT_WIRED). See /cockpit/losses and /cockpit/calibration for the real authoring queues.",
    cards: [card],
  };
}

// ── Composition ─────────────────────────────────────────────────────────────

/**
 * Build the full console. Never throws: each lane catches its own failure and
 * degrades to a labeled fallback.
 */
export async function loadDailyCommand(): Promise<DailyCommand> {
  const now = new Date();

  // The operating assessment is static (no DB), so it is always safe to read,
  // but we still guard it. It is the source of the honest status strings.
  let revenueStatus = "Unknown — no Stripe/funnel signals parsed; no fabricated revenue.";
  let memoryStatus = "ARCHIVE is NOT_WIRED; only memory-candidate tasking is safe.";
  let ingestionStatus = "UNKNOWN";
  let settlementStatus = "UNKNOWN";
  let bobbyNextAction = "Analyze revenue signals without inventing customers or revenue.";
  try {
    const assessment = buildJarvisOperatingAssessment();
    revenueStatus = assessment.revenueStatus;
    memoryStatus = assessment.memoryStatus;
    bobbyNextAction = assessment.nextBestAction;
  } catch {
    // keep honest defaults
  }

  // Probe the DB once for the Approval Queue. Mirrors the Command Center feed:
  // in stub mode or on error we treat the queue as unavailable rather than live.
  let realTasks: QueueTaskRow[] = [];
  let dbReachable = false;
  if (!isStubMode()) {
    try {
      const rows = await db.cockpitTask.findMany({
        where: { status: { in: QUEUE_STATUSES as CockpitTaskStatus[] } },
        include: { decisions: { orderBy: { createdAt: "desc" }, take: 3 } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 50,
      });
      realTasks = rows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        riskLevel: t.riskLevel,
        assignedAgent: t.assignedAgent,
        complianceStatus: t.complianceStatus,
        decisions: t.decisions.map((d) => ({
          toStatus: d.toStatus,
          reviewer: d.reviewer,
          note: d.note,
          createdAt: d.createdAt,
        })),
      }));
      dbReachable = true;
    } catch {
      dbReachable = false;
      realTasks = [];
    }
  }

  // Signals reads Claude API spend (DB-backed). Ingestion/settlement health is
  // exposed on /cockpit's launch assessment, not by the static operating
  // assessment, so we surface honest "see assessment" pointers rather than
  // inventing granular health here.
  let costs: Awaited<ReturnType<typeof loadClaudeApiCostsDashboard>> | null = null;
  let costsReachable = false;
  if (!isStubMode()) {
    try {
      costs = await loadClaudeApiCostsDashboard(now);
      costsReachable = true;
    } catch {
      costs = null;
      costsReachable = false;
    }
  }

  ingestionStatus = costsReachable ? "see /cockpit launch assessment" : "UNKNOWN (telemetry probe failed)";
  settlementStatus = costsReachable ? "see /cockpit launch assessment" : "UNKNOWN (telemetry probe failed)";

  const moneyNext = buildMoneyNext(revenueStatus, bobbyNextAction);
  const approvalQueue = buildApprovalQueue(realTasks, dbReachable);
  const agentActivity = buildAgentActivity();
  const { lane: signals, gauges } = buildSignals(
    costs,
    ingestionStatus,
    settlementStatus,
    costsReachable
  );
  const lessons = buildLessons(memoryStatus);

  const lanes: readonly CommandLane[] = [
    moneyNext,
    approvalQueue,
    agentActivity,
    signals,
    lessons,
  ];

  const openCount = approvalQueue.cards.filter((c) => c.taskId !== null).length;
  const headline =
    openCount > 0
      ? `${openCount} exception${openCount === 1 ? "" : "s"} awaiting your decision.`
      : "No open exceptions. Agents are drafting and routing; nothing needs you right now.";

  return {
    success: true,
    generatedAt: now.toISOString(),
    noFakeLiveData: true,
    dataMode: rollup(lanes),
    headline,
    lanes,
    signalGauges: gauges,
    error: null,
  };
}
