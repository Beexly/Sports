/**
 * POST /api/ops/watch-ingest — thin ingest for the HF Space's JSON output.
 *
 * The Windows watcher relays the Space's /process-frame JSON here; this route
 * validates it and persists detections/tracklets/positions/derived metrics to
 * the watch.* learning store (Neon). DB credentials stay server-side.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (same pattern as the other ops
 * routes). The watcher relays with the shared secret Garrett provisions.
 *
 * ?dryRun=1 — validate + count, no writes. Used by tests and game-day checks.
 *
 * Raw frames are NEVER accepted here — JSON only.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@sports/db";
import {
  persistFrameOutput,
  validateSpaceOutput,
} from "@/lib/ops/watch-ingest";

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

export async function POST(request: Request) {
  if (!hasOpsAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  let out;
  try {
    out = validateSpaceOutput(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid payload" },
      { status: 400 },
    );
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  try {
    const result = await persistFrameOutput(db as never, out, { dryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "persist failed" },
      { status: 500 },
    );
  }
}
