/**
 * Vercel cron — settle completed games.
 *
 * Currently a no-op pass-through. The actual settlement loop lives in
 * `workers/data-refresh/src/index.ts`, which iterates SUPPORTED_SPORTS,
 * pulls completed scores, calls `settleGameLogs()` for each finished
 * game, and updates pending picks via `calculatePickResult()` from the
 * prediction-engine.
 *
 * Reason for the stub: the worker's settle loop has non-trivial
 * sport/game/team plumbing that needs careful porting to the Vercel
 * cron context (different connection lifecycle, different timeout
 * envelope). Rather than ship a half-right port that drifts from the
 * worker's authoritative behavior, this route stays as a clean
 * documented placeholder until the port is done in a focused pass.
 *
 * Until then: run the long-running worker (Railway / Fly.io / EC2)
 * alongside Vercel. The worker process owns settlement; this cron
 * still acknowledges Vercel's invocation so the schedule does not
 * silently fail.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    note: "Settlement is currently handled by the long-running data-refresh worker. " +
      "This cron is a placeholder; the worker process owns the settlement loop.",
  });
}
