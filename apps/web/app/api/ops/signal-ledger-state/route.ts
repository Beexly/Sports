/**
 * GET /api/ops/signal-ledger-state — READ-ONLY proof that `signals` is populated.
 *
 * WHY. The writer (PR #932, fetchedAt fix #934, deadline fix #935) could not be
 * verified from outside. The write cron returns 200 whether it wrote forty rows
 * or forty thousand, and until this route existed NO route in the repo read the
 * `signals` table at all — so a fully populated table and an empty one were
 * indistinguishable from the outside. That is exactly the condition that let the
 * table sit at 0 rows for the life of the project.
 *
 * This is the read side of that. It answers three questions and nothing else:
 * how many rows exist, which keys they carry, and how fresh the newest is.
 *
 * LAWS OBSERVED:
 * - READS ONLY. No create/update/upsert anywhere in this file.
 * - Aggregate counts and a small key sample. NO row-level values, ever: a signal
 *   value is engine state and this surface is operator-facing.
 * - CRON_SECRET bearer auth, same as the other ops routes.
 * - No gate, no env flag, no schema change.
 *
 * An empty table is reported as `total: 0` with an explicit note. It is a real
 * answer, not an error, and it must never be papered over with a plausible
 * count.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const [total, byKey, freshest] = await Promise.all([
      db.signal.count(),
      db.signal.groupBy({ by: ["key"], _count: { _all: true } }),
      db.signal.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } }),
    ]);

    const keys = byKey
      .map((k) => ({ key: k.key, rows: k._count._all }))
      .sort((a, b) => b.rows - a.rows);

    return NextResponse.json({
      success: true,
      data: {
        total,
        distinctKeys: keys.length,
        keys,
        newestFetchedAt: freshest?.fetchedAt?.toISOString() ?? null,
      },
      note:
        "READ-ONLY. total: 0 means the writer has not persisted anything yet, which is a " +
        "real and reportable state — not an error to be hidden. Row values are never " +
        "exposed here; only counts, keys, and freshness.",
    });
  } catch (error) {
    captureError(error, { tags: { surface: "signal-ledger-state" } });
    return NextResponse.json(
      { success: false, error: "read failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
