/**
 * Stale-Ingestion → CockpitTask writer (B1).
 *
 * Turns a per-source freshness verdict into a persisted, DEDUPED CockpitTask
 * assigned to the TAL data-reliability agent, so a stale ingestion source
 * automatically surfaces in the Daily Command Approval Queue (which reads
 * CockpitTask rows). This is the literal "next action" the cockpit has been
 * pointing at via the `stale-ingestion-alert` agent-task seed.
 *
 * Source of truth + dedup:
 *   - The shape of the task (title/risk/agent) is built by
 *     `freshnessStatusToTask()` from a `SourceFreshnessStatus` — never invented
 *     here. FRESH sources yield no task.
 *   - DEDUP KEY is the CockpitTask `source` column, set to a stable
 *     `stale-ingestion:<sourceId>:<class>` string (class = STALE | UNKNOWN). We
 *     query for an OPEN (non-ARCHIVED / non-APPROVED) row with the same source
 *     before creating; if one exists we skip and count it as "deduped". This
 *     means a single open task per (source, freshness-class) — re-running the
 *     cron will not pile up duplicate rows.
 *
 * HONESTY: this writes a real CockpitTask row only. It never flips a gate,
 * never settles, never touches a public surface. The task is a record of an
 * internal decision for the operator queue.
 */

import type { PrismaClient, OperatorAgent, CockpitRiskLevel } from "@prisma/client";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
import { freshnessStatusToTask } from "./data-reliability-tasks";
import type { SourceFreshnessStatus } from "./stale-data-detector";

/** Statuses that count as an OPEN task for dedup — anything not yet resolved. */
const OPEN_STATUSES = ["NEW", "ROUTED", "DRAFTED", "NEEDS_REVIEW", "BLOCKED", "REJECTED"] as const;

/** Stable dedup key for the CockpitTask.source column: one open task per source+class. */
export function staleTaskSourceKey(status: SourceFreshnessStatus): string {
  return `stale-ingestion:${status.sourceId}:${status.status}`;
}

/** Map an AgentTask agent slug ("tal") to the CockpitTask OperatorAgent enum. */
function toOperatorAgent(slug: string): OperatorAgent {
  const upper = slug.toUpperCase();
  const known: readonly OperatorAgent[] = ["JARVIS", "SARAH", "TAL", "SCOUT", "AVA", "BOBBY"];
  return (known as readonly string[]).includes(upper) ? (upper as OperatorAgent) : "TAL";
}

/** Map AgentTask risk to the coarser CockpitRiskLevel enum. */
function toRiskLevel(risk: AgentTask["risk"]): CockpitRiskLevel {
  switch (risk) {
    case "CRITICAL":
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MODERATE";
    default:
      return "LOW";
  }
}

/** Map AgentTask priority bucket to the CockpitTask numeric priority. */
function toPriority(priority: AgentTask["priority"]): number {
  switch (priority) {
    case "P0":
      return 90;
    case "P1":
      return 70;
    case "P2":
      return 50;
    default:
      return 30;
  }
}

export type StaleTaskOutcome = "created" | "deduped" | "skipped_fresh";

export interface StaleTaskResult {
  readonly sourceId: string;
  readonly status: SourceFreshnessStatus["status"];
  readonly outcome: StaleTaskOutcome;
  /** The CockpitTask id when created; null otherwise. */
  readonly taskId: string | null;
}

/**
 * Persist (or dedup) a CockpitTask for a single source's freshness verdict.
 * FRESH → no task. Otherwise: if an open task already exists for this
 * source+class, skip (deduped); else create.
 */
export async function persistStaleIngestionTask(
  db: PrismaClient,
  status: SourceFreshnessStatus,
): Promise<StaleTaskResult> {
  const agentTask = freshnessStatusToTask(status);
  if (!agentTask) {
    return { sourceId: status.sourceId, status: status.status, outcome: "skipped_fresh", taskId: null };
  }

  const sourceKey = staleTaskSourceKey(status);

  const existing = await db.cockpitTask.findFirst({
    where: { source: sourceKey, status: { in: [...OPEN_STATUSES] } },
    select: { id: true },
  });
  if (existing) {
    return { sourceId: status.sourceId, status: status.status, outcome: "deduped", taskId: existing.id };
  }

  const created = await db.cockpitTask.create({
    data: {
      title: agentTask.title,
      description:
        `${agentTask.description}\n\n` +
        `Source: ${status.sourceId} · State: ${status.status}` +
        (status.ageHours != null ? ` · Age: ${status.ageHours.toFixed(1)}h` : " · Age: unknown") +
        (status.critical ? " · CRITICAL source (in-season)" : "") +
        `\nNext action: ${agentTask.nextAction}` +
        (agentTask.blockedReason ? `\nBlocked: ${agentTask.blockedReason}` : ""),
      assignedAgent: toOperatorAgent(agentTask.assignedAgent),
      status: "NEW",
      priority: toPriority(agentTask.priority),
      riskLevel: toRiskLevel(agentTask.risk),
      source: sourceKey,
      payload: {
        kind: "stale-ingestion",
        sourceId: status.sourceId,
        freshnessStatus: status.status,
        ageHours: status.ageHours,
        critical: status.critical,
        agentTaskId: agentTask.id,
        sourceEvidence: [...agentTask.sourceEvidence],
      },
    },
    select: { id: true },
  });

  return { sourceId: status.sourceId, status: status.status, outcome: "created", taskId: created.id };
}
