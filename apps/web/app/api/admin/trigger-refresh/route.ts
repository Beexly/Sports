import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport, settleResults } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";

// Generous timeout — a full 7-sport sync can take 1–2 minutes. Setting this
// so serverless deploys (Vercel) don't kill the function mid-run. Locally
// with `next dev` it's inert.
export const maxDuration = 300;

// Cap how long we consider a RUNNING ingestionRun to be "fresh" before
// declaring it zombied. Anything older than this doesn't block a new sync.
const STALE_RUNNING_LOCK_MS = 10 * 60 * 1000; // 10 min

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "THE_ODDS_API_KEY not configured" },
      { status: 503 }
    );
  }

  // Concurrency lock: refuse to start if a recent RUNNING ingestionRun exists.
  // Prevents two admins double-clicking Trigger Sync from burning 2× API quota
  // and stomping on each other's writes.
  const recentRunning = await db.ingestionRun.findFirst({
    where: {
      status: "RUNNING",
      startedAt: { gte: new Date(Date.now() - STALE_RUNNING_LOCK_MS) },
    },
    orderBy: { startedAt: "desc" },
  });
  if (recentRunning) {
    return NextResponse.json(
      {
        error:
          "Another sync is already running. Wait for it to finish, or retry in 10 minutes if it's stuck.",
        startedAt: recentRunning.startedAt.toISOString(),
        sport: recentRunning.sport,
      },
      { status: 409 }
    );
  }

  // Read gates once — identical to how the scheduled worker reads them.
  const gates = getReadinessGates();

  const results = [];
  for (const sport of SUPPORTED_SPORTS) {
    results.push(await processSport(sport, apiKey, gates, "[trigger-refresh]"));
  }

  // Settle anything completed since last cycle. Swallow errors — picks were
  // successfully regenerated above, settlement is opportunistic.
  let settlement: Awaited<ReturnType<typeof settleResults>> = [];
  try {
    settlement = await settleResults({
      sports: SUPPORTED_SPORTS,
      apiKey,
      gates,
      logPrefix: "[trigger-refresh][settlement]",
    });
  } catch (err) {
    console.error(
      "[trigger-refresh] settlement pass failed:",
      err instanceof Error ? err.message : err
    );
  }

  return NextResponse.json({ success: true, results, settlement });
}
