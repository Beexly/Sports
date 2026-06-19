/**
 * Vercel cron — Cockpit Scheduled Dispatch Loop.
 *
 * This is the route that makes the operator cockpit stop being read-only. On a
 * schedule it loads the open cockpit task queue and advances each task ONE safe
 * step through the automation-owned segment of the state machine:
 *
 *     NEW ──► ROUTED ──► DRAFTED ──► NEEDS_REVIEW ──[ PARKED: human gate ]
 *
 * It PARKS every task at NEEDS_REVIEW — the human approval gate
 * (NEEDS_REVIEW → APPROVED / REJECTED) is owner-only and this loop is
 * structurally incapable of crossing it (see lib/cockpit/dispatch.ts and the
 * allow-list in lib/cockpit/transitions.ts).
 *
 * Every move is written by `transitionTask`, which appends an immutable
 * CockpitDecision row in the same transaction — so the route writes internal
 * decision records only. It flips no gate, publishes nothing, spends nothing,
 * changes no model. It is the deterministic, free, side-effect-free counterpart
 * to the (future, explicit) LLM-backed drafting follow-up.
 *
 * Shape mirrors jarvis-snapshot / stale-ingestion-check:
 *   - force-dynamic, bounded maxDuration
 *   - cron Bearer auth via the shared `cronAuthError` helper
 *   - NEVER-THROW at the boundary; a DB read failure degrades to a clean 200
 *     ("read-degraded") so the scheduler does not flap and the failure is
 *     visible, not fatal — same posture as jarvis-snapshot.
 *
 * Idempotent: only the open NEW/ROUTED/DRAFTED tasks are loaded, each advances
 * at most one hop per run, and re-running is harmless (a task parked at
 * NEEDS_REVIEW is no longer loaded). One bad task cannot abort the batch — the
 * advancement core catches per task and continues.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { transitionTask } from "@/lib/cockpit/transitions";
import {
  advanceCockpitBatch,
  DISPATCHABLE_STATUSES,
  type DispatchTransitionExecutor,
  type DispatchableTask,
} from "@/lib/cockpit/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Bounded batch — keep each run small, predictable, and re-runnable. */
const BATCH_LIMIT = 25;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const startedAt = Date.now();

  let tasks: DispatchableTask[];
  try {
    // Load only the automation-owned, open segment. NEEDS_REVIEW / APPROVED /
    // REJECTED / BLOCKED / ARCHIVED are deliberately NOT loaded — they are
    // owner-owned or terminal. Deterministic order so runs are reproducible.
    tasks = await db.cockpitTask.findMany({
      where: { status: { in: [...DISPATCHABLE_STATUSES] } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: BATCH_LIMIT,
      select: {
        id: true,
        status: true,
        assignedAgent: true,
        source: true,
        title: true,
        decisionNotes: true,
      },
    });
  } catch (err) {
    // Read-degraded: return a clean, honest 200 (matches jarvis-snapshot) so the
    // scheduler does not flap. No state changed — nothing was advanced.
    return NextResponse.json({
      ok: false,
      ranAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      advanced: 0,
      byStatus: {},
      errors: ["read-degraded: could not load cockpit task queue"],
      detail: err instanceof Error ? err.message : "queue read unavailable",
      note: "Dispatch degraded; no state changed.",
    });
  }

  // The side-effecting boundary: wrap the safe transition service. Rejections
  // (e.g. a refused transition) propagate to the per-task catch in the core.
  const executeTransition: DispatchTransitionExecutor = async (req) => {
    await transitionTask(db, {
      taskId: req.taskId,
      toStatus: req.toStatus,
      reviewer: req.reviewer,
      note: req.note,
      evidence: req.evidence,
    });
  };

  let summary;
  try {
    summary = await advanceCockpitBatch(tasks, executeTransition);
  } catch (err) {
    // advanceCockpitBatch isolates per-task errors and should not throw, but the
    // route boundary stays never-throw regardless.
    return NextResponse.json({
      ok: false,
      ranAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      advanced: 0,
      byStatus: {},
      errors: [err instanceof Error ? err.message : "batch advancement failed"],
      note: "Dispatch degraded; partial or no state changed.",
    });
  }

  const errorReasons = summary.outcomes
    .filter((o) => o.kind === "error")
    .map((o) => `${o.taskId}: ${o.reason ?? "unknown error"}`);

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    considered: summary.considered,
    advanced: summary.advanced,
    skipped: summary.skipped,
    byStatus: summary.byStatus,
    errors: errorReasons,
    note: "Advanced open cockpit tasks one safe step; parked at the human review gate. No external action.",
  });
}
