/**
 * GET /api/ops/watch-status — read-only game-day readout for the watch loop.
 *
 * Returns the windows active right now (from the scheduler's watch.games
 * state), the next upcoming window, and the last scheduler heartbeat.
 * The Windows watcher polls this to decide what to tune to; operators use
 * it on game day to confirm the loop is armed.
 *
 * Auth: same CRON_SECRET Bearer <redacted> as the other ops routes (the watcher
 * relays with the shared secret). Read-only — never writes.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasOpsAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(auth);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type Row = Record<string, unknown>;

export async function GET(request: Request) {
  if (!hasOpsAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = (db as never as { $queryRawUnsafe: <T>(q: string) => Promise<T> })
    .$queryRawUnsafe;
  try {
    const active = await q<Row[]>(
      `SELECT game_id, away, home, kickoff_ts, window_start, window_end, status, mode
       FROM watch.games
       WHERE window_start <= now() AND now() <= window_end
       ORDER BY window_start`,
    );
    const next = await q<Row[]>(
      `SELECT game_id, away, home, kickoff_ts, window_start, status
       FROM watch.games
       WHERE window_start > now()
       ORDER BY window_start
       LIMIT 1`,
    );
    const lastRun = await q<Row[]>(
      `SELECT run_ts, active_games, next_game_id, space_warmed
       FROM watch.scheduler_runs
       ORDER BY run_ts DESC
       LIMIT 1`,
    );
    return NextResponse.json({
      ok: true,
      now: new Date().toISOString(),
      active_windows: active,
      next_window: next[0] ?? null,
      last_scheduler_run: lastRun[0] ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "watch status unavailable" },
      { status: 500 },
    );
  }
}
