/**
 * Founder / ops: enable durable RANKING_PAUSE_APPLY without Vercel env redeploy.
 *
 * POST { enabled: true|false, groups?: string[] }
 * Auth: Bearer CRON_SECRET or x-vercel-cron (same dual auth as other ops).
 *
 * Does NOT flip PERFORMANCE_STATS / maps / PROVEN.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  persistRankingPauseApply,
  loadRankingPauseApply,
  type RankingPauseDurableSnap,
} from "@/lib/ops/ranking-pause-durable";
import { loadProvenPathPlan } from "@/lib/ops/proven-path-durable";
import { clearSelectiveRuntimeCaches } from "@/lib/calibration/selective-publish-runtime";
import { sanitizeLogField } from "@/lib/log-safety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;
  const snap = await loadRankingPauseApply();
  const plan = await loadProvenPathPlan();
  return NextResponse.json({
    ok: true,
    durable: snap,
    planPauseGroups: plan?.pauseGroups ?? [],
    note: "POST {enabled:true} to apply plan pauses durably. Env RANKING_PAUSE_APPLY still works.",
  });
}

export async function POST(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  let body: { enabled?: boolean; groups?: string[]; note?: string; setBy?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const enabled = body.enabled === true;
  const plan = await loadProvenPathPlan();
  // Group keys are caller-supplied and end up in the persisted `note`, which
  // `resolvePausedGroups` echoes into `operatorHint`. Flatten them here for the
  // same reason as setBy/note: a newline in a group key is never legitimate,
  // and would otherwise walk straight past the sanitising done below.
  const groups =
    Array.isArray(body.groups) && body.groups.length > 0
      ? body.groups.map((g) => sanitizeLogField(g, 120)).filter(Boolean)
      : [...(plan?.pauseGroups ?? [])];

  if (enabled && groups.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No pause groups — plan empty and body.groups missing. Run calibration-metrics first.",
      },
      { status: 400 },
    );
  }

  const snap: RankingPauseDurableSnap = {
    enabled,
    groups: enabled ? groups : [],
    setAt: new Date().toISOString(),
    // Both fields are echoed into a log line by persistRankingPauseApply and
    // stored on the audit row. Flatten control characters here, at the trust
    // boundary, so a caller cannot inject a newline and forge a second log
    // record claiming a different outcome.
    setBy: sanitizeLogField(body.setBy, 120) || "ops.ranking-pause-apply",
    note:
      sanitizeLogField(body.note, 500) ||
      (enabled
        ? `Founder-yes pause apply: ${groups.join(", ")}. Not PROVEN; maps OFF.`
        : "Pause apply disabled (durable)."),
  };

  // The response used to be a hard-coded `ok: true` echoing `snap` back
  // regardless of what the write did. Report the real outcome: a founder who
  // sees 200/ok must be able to trust that the pause is actually durable in
  // every isolate, and a failed write has to be a retryable 500 rather than a
  // green light over a control that was never applied.
  const persist = await persistRankingPauseApply(snap);

  // `ok` means ONE thing on this route: the suppression control is now durable
  // in every isolate. "stub" is not that — no DATABASE_URL is configured, so
  // nothing was written and nothing will be. Answering 200/ok:true for it would
  // reintroduce exactly the defect this route was fixed for, one state over:
  // the founder reads "applied", the other isolates read nothing, and the
  // groups that were supposed to be paused keep publishing. The two non-ok
  // states are kept apart by status because the remedy differs — a 500 is worth
  // retrying, a 503 needs a database before any retry can succeed.
  if (persist !== "ok") {
    const failedWrite = persist === "error";
    return NextResponse.json(
      {
        ok: false,
        persist,
        error: failedWrite
          ? "Durable RANKING_PAUSE_APPLY write FAILED — the pause was NOT applied. " +
            "Other isolates keep the previous posture; retry, or set the RANKING_PAUSE_APPLY env var."
          : "No durable store in this environment (stub database) — the pause was NOT stored " +
            "and will not survive this isolate. Configure DATABASE_URL, or set the " +
            "RANKING_PAUSE_APPLY env var, which still works.",
        attempted: snap,
        claimPosture: "ranking_pause_only_not_proven",
      },
      { status: failedWrite ? 500 : 503 },
    );
  }

  // ONLY on a landed write. This used to run unconditionally, which made a
  // failed write strictly worse than doing nothing: the isolate was still
  // holding the PREVIOUS valid pause snapshot in cache and pausing correctly,
  // and clearing it forced a re-read that — during the outage that just broke
  // the write — answers "no durable pause". `resolvePausedGroups` then falls
  // through to an empty pause list, so the groups being suppressed start
  // publishing again. A write that did not land must leave the running posture
  // exactly as it found it.
  clearSelectiveRuntimeCaches();

  return NextResponse.json({
    ok: true,
    /** Durable-write outcome for this request. `ok: true` implies persist "ok". */
    persist,
    durable: snap,
    claimPosture: "ranking_pause_only_not_proven",
  });
}
