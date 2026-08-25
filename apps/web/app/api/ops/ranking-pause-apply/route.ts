/**
 * Founder / ops: enable durable RANKING_PAUSE_APPLY without Vercel env redeploy.
 *
 * POST { enabled: true|false, groups?: string[] }
 *
 * Auth: Bearer CRON_SECRET ONLY. `cronAuthError(request)` with no options
 * resolves to mode "bearer_only" (GSE-SEC-016), so the spoofable `x-vercel-cron`
 * header does NOT authorize here — and must never be allowed to: this POST
 * mutates durable ranking-pause state, and lib/cron/authorize.ts reserves the
 * "dual" mode for read-only health probes. Do not add `{ mode: "dual" }` here.
 * (This header previously described dual auth; the code has never granted it.)
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
  const groups =
    Array.isArray(body.groups) && body.groups.length > 0
      ? body.groups.map(String)
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
    setBy: body.setBy?.trim() || "ops.ranking-pause-apply",
    note:
      body.note?.trim() ||
      (enabled
        ? `Founder-yes pause apply: ${groups.join(", ")}. Not PROVEN; maps OFF.`
        : "Pause apply disabled (durable)."),
  };

  await persistRankingPauseApply(snap);
  clearSelectiveRuntimeCaches();

  return NextResponse.json({
    ok: true,
    durable: snap,
    claimPosture: "ranking_pause_only_not_proven",
  });
}
