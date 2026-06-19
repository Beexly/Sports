/**
 * Vercel cron — Jarvis operating self-audit (autonomous).
 *
 * Part of the "runs itself" loop: on a schedule, the platform recomputes its own
 * operating assessment (company health, top risks, owner decisions waiting, stale-
 * data warnings, the single next-best action) WITHOUT needing an operator to visit
 * the cockpit. The result is the system watching itself.
 *
 * This is READ-ONLY and never-throw: it computes the assessment from the existing
 * registries and returns a compact real summary. It changes nothing — no model, no
 * gate, no publish, no spend. The persistent trend buffer remains a follow-up that
 * needs a schema decision (process-local memory can't persist across serverless
 * invocations); until then this surfaces live status the owner / a monitor can read.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { buildJarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const a = buildJarvisOperatingAssessment();
    return NextResponse.json({
      ok: true,
      assessedAt: new Date().toISOString(),
      companyHealth: a.companyHealth,
      topRiskCount: a.topRisks.length,
      ownerDecisionCount: a.ownerDecisions.length,
      safeAutonomousTaskCount: a.safeAutonomousTasks.length,
      staleDataWarningCount: a.staleDataWarnings.length,
      nextBestAction: a.nextBestAction,
      note: "Autonomous self-audit. Read-only; changes nothing.",
    });
  } catch (err) {
    // Never-throw: a degraded read still returns a clean, honest 200 so the
    // scheduler doesn't flap and the failure is visible, not fatal.
    return NextResponse.json({
      ok: false,
      assessedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "assessment unavailable",
      note: "Self-audit degraded; no state changed.",
    });
  }
}
