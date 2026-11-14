/**
 * GET /api/cron/site-wide-workflows
 *
 * Permanent scheduled execution fabric across all 23 council seats, 21
 * subagent templates, 10 AI-council DESTROY seats, 8 War Room watchers, and
 * 14 governed workflows. Defaults to zero-cost / credit-safe inference lanes
 * (`hybrid_auto` / `free`) and enforces `WEEK10_HELD_FOR_CORPUS_COMPLETION`.
 *
 * Bearer-only CRON_SECRET auth (never mode: "dual"). Skips DB-touching work
 * during the Neon autosuspend quiet window (02:30-06:30 America/Chicago).
 */

import { NextResponse } from "next/server";
import { cronAuthErrorBearerOnly } from "@/lib/cron/authorize";
import { isNeonQuietWindow } from "@/lib/cron/neon-quiet-window";
import { resolveInferenceLane } from "@/lib/inference/multi-provider-router";
import { runSiteWideWorkflowFabric } from "@/lib/autonomy/site-wide-workflow-fabric";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthErrorBearerOnly(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun");
  const dryRun = dryRunParam === "0" || dryRunParam === "false" ? false : true;
  const executeInference = url.searchParams.get("execute") === "1" && !dryRun;
  const lane = resolveInferenceLane(url.searchParams.get("lane"));
  const workflowsParam = url.searchParams.get("workflows");
  const workflowIds = workflowsParam
    ? workflowsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const quietWindowActive = isNeonQuietWindow(new Date());

  try {
    const summary = await runSiteWideWorkflowFabric({
      dryRun,
      executeInference,
      lane,
      workflowIds,
    });

    return NextResponse.json({
      ...summary,
      quietWindowActive,
      cron: "/api/cron/site-wide-workflows",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        quietWindowActive,
        cron: "/api/cron/site-wide-workflows",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
