import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { COCKPIT_OPERATING_MAP } from "@/lib/cockpit/cockpit-operating-map";
import { listSeedAgentTasks } from "@/lib/tasks/agent-task-router";
import { WORKFLOW_REGISTRY } from "@/lib/workflows/workflow-registry";
import { getJarvisClaudeReviewItems, getJarvisOwnerDecisions } from "./jarvis-decision-queue";
import { getJarvisDepartmentHealth } from "./jarvis-department-health";
import { recallConfirmedLessons, type RecalledLesson } from "./memory/recall";

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
  /**
   * Additive (J7): a compact "what we've learned" set drawn from CONFIRMED /
   * repeated-pattern memory only. Empty by default — the synchronous builder
   * does no I/O, so this stays []. The async companion
   * buildJarvisOperatingAssessmentWithMemory() populates it from recall and
   * degrades to [] on any failure. Never fabricated.
   */
  readonly whatWeveLearned: readonly string[];
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
    staleDataWarnings: tasks.filter((task) => task.id.includes("stale")).map((task) => task.title),
    publicGateStatus: "Public picks cannot self-enable; owner approval and trust gates are required.",
    calibrationStatus: "Manual/AUDIT-owned; model weights cannot change automatically.",
    revenueStatus: "Unknown until real Stripe/funnel signals are parsed; no fake revenue.",
    memoryStatus: "ARCHIVE is NOT_WIRED; only memory candidate tasking is safe.",
    claudeReview: claudeReview.slice(0, 5).map((task) => task.title),
    nextBestAction: WORKFLOW_REGISTRY.length > 0 && COCKPIT_OPERATING_MAP.length > 0 ? "Wire stale ingestion task creation into the cockpit decision queue." : "Complete operating map registration.",
    // Synchronous builder does no I/O, so the learned set is honestly empty.
    // Callers that want recalled lessons use the async companion below.
    whatWeveLearned: [],
  };
}

/** Render a recalled lesson as one compact "what we've learned" line. */
function lessonToLine(lesson: RecalledLesson): string {
  return `${lesson.title} — ${lesson.summary}`;
}

/**
 * Async companion to buildJarvisOperatingAssessment that surfaces a compact
 * "what we've learned" set from CONFIRMED / repeated-pattern memory via recall.
 *
 * Additive and non-breaking: it returns the exact same assessment shape, only
 * with whatWeveLearned populated. Recall is read-only and never-throw, so a DB
 * outage or unwired store degrades whatWeveLearned to [] — never a fabricated
 * lesson, never an exception.
 */
export async function buildJarvisOperatingAssessmentWithMemory(): Promise<JarvisOperatingAssessment> {
  const base = buildJarvisOperatingAssessment();
  let whatWeveLearned: readonly string[] = [];
  try {
    const lessons = await recallConfirmedLessons({ limit: 5 });
    whatWeveLearned = lessons.map(lessonToLine);
  } catch {
    // recall is already never-throw; this is belt-and-suspenders. Stay empty.
    whatWeveLearned = [];
  }
  return { ...base, whatWeveLearned };
}
