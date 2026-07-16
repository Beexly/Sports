import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { COCKPIT_OPERATING_MAP } from "@/lib/cockpit/cockpit-operating-map";
import { listSeedAgentTasks } from "@/lib/tasks/agent-task-router";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import { WORKFLOW_REGISTRY } from "@/lib/workflows/workflow-registry";
import { getJarvisClaudeReviewItems, getJarvisOwnerDecisions } from "./jarvis-decision-queue";
import { getJarvisDepartmentHealth } from "./jarvis-department-health";

export interface JarvisOperatingAssessment {
  readonly companyHealth: "CRITICAL" | "CAUTION" | "UNKNOWN";
  readonly departmentHealth: ReturnType<typeof getJarvisDepartmentHealth>;
  readonly topRisks: readonly string[];
  readonly ownerDecisions: readonly string[];
  readonly safeAutonomousTasks: readonly string[];
  readonly staleDataWarnings: readonly string[];
  readonly publicGateStatus: string;
  readonly calibrationStatus: string;
  readonly revenueStatus: string;
  readonly memoryStatus: string;
  readonly claudeReview: readonly string[];
  readonly nextBestAction: string;
}

// Freshness/staleness is an explicit content signal, not an id naming convention.
// Non-negotiable #5 (validate freshness) means an owner-facing stale-data warning must
// keep surfacing even if a task is renamed (e.g. "stale-ingestion-alert" -> "freshness-breach").
// Match the freshness marker vocabulary against the task's descriptive fields with word
// boundaries (so "refresh"/"installed" do not false-hit), rather than a substring of task.id.
const STALE_DATA_MARKER = /\b(?:stale|fresh)/i;

function describesStaleDataCondition(task: AgentTask): boolean {
  return [task.title, task.description, task.nextAction, ...task.sourceEvidence].some((field) =>
    STALE_DATA_MARKER.test(field),
  );
}

export function buildJarvisOperatingAssessment(): JarvisOperatingAssessment {
  const agentHealth = summarizeAgentHealth();
  const tasks = listSeedAgentTasks();
  const blocked = tasks.filter((task) => task.status.startsWith("BLOCKED") || task.risk === "CRITICAL");
  const ownerDecisions = getJarvisOwnerDecisions();
  const claudeReview = getJarvisClaudeReviewItems();
  return {
    companyHealth: blocked.length > 0 ? "CRITICAL" : agentHealth.notWired > 0 ? "CAUTION" : "UNKNOWN",
    departmentHealth: getJarvisDepartmentHealth(),
    topRisks: blocked.slice(0, 5).map((task) => task.title),
    ownerDecisions: ownerDecisions.slice(0, 5).map((task) => task.title),
    safeAutonomousTasks: tasks.filter((task) => !task.ownerApprovalRequired && !task.claudeReviewRequired && !task.status.startsWith("BLOCKED")).slice(0, 5).map((task) => task.title),
    staleDataWarnings: tasks.filter(describesStaleDataCondition).map((task) => task.title),
    publicGateStatus: "Public picks cannot self-enable; owner approval and trust gates are required.",
    calibrationStatus: "Manual/AUDIT-owned; model weights cannot change automatically.",
    revenueStatus: "Unknown until real Stripe/funnel signals are parsed; no fake revenue.",
    memoryStatus:
      "ARCHIVE is NOT_WIRED for execution; the store is built in code but awaits owner activation " +
      "(no confirmed production write). Only memory candidate tasking is safe.",
    claudeReview: claudeReview.slice(0, 5).map((task) => task.title),
    nextBestAction: WORKFLOW_REGISTRY.length > 0 && COCKPIT_OPERATING_MAP.length > 0 ? "Wire stale ingestion task creation into the cockpit decision queue." : "Complete operating map registration.",
  };
}
