/**
 * Vercel cron — settle completed games and write Signal Ledger entries.
 *
 * Runs on schedule. Finds published picks with PENDING result where the
 * game has a final score, calls calculatePickResult(), updates the Pick row,
 * and appends a SignalLedgerEntry for calibration tracking.
 *
 * Authorization: Bearer ${CRON_SECRET}
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { calculatePickResult } from "@sports/prediction-engine";
import { recordSettlement } from "@/lib/signal-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL_VERSION = process.env.MODEL_VERSION ?? "1.0.0";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Find picks eligible for settlement ───────────────────────────────────
  const pendingPicks = await db.pick.findMany({
    where: {
      result: "PENDING",
      isPublished: true,
      isBootstrap: false,
    },
    include: {
      game: {
        include: { sport: true },
      },
    },
    take: 100,
  });

  let settled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pick of pendingPicks) {
    const game = pick.game;
    if (!game) { skipped++; continue; }

    // Game must be final with scores
    if (game.status !== "FINAL") { skipped++; continue; }
    if (game.homeScore === null || game.awayScore === null) { skipped++; continue; }

    try {
      const result = calculatePickResult(
        pick.pickType,
        pick.selection,
        pick.line,
        game.homeTeamName,
        game.homeScore,
        game.awayScore,
        game.sport?.key ?? "",
      );

      // Update Pick row
      await db.pick.update({
        where: { id: pick.id },
        data: {
          result,
          settledAt: new Date(),
        },
      });

      // Append Signal Ledger entry
      const outcome =
        result === "WIN" ? "win" : result === "LOSS" ? "loss" : "push";

      await recordSettlement(
        pick.id,
        pick.modelVersion ?? MODEL_VERSION,
        outcome,
        pick.confidence ?? 50,
        "cron:settle-picks",
      );

      settled++;
    } catch (err) {
      errors.push(`pick:${pick.id} — ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    settled,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
