import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Cockpit calibration API — stub, admin-gated, read-only.
 *
 * Source-level invariants:
 *   - session.user.role !== "ADMIN" → status: 401
 *   - mode: "INTERNAL_ONLY"
 *   - autoPublish: false, autoSend: false, automatedBetting: false
 *   - POST blocked with status: 405 + calibration-is-read-only error
 *   - safeCount() helper with calibrationProposal?: presence check
 *   - never writes a published timestamp
 */
export const dynamic = "force-dynamic";

async function safeCount(
  db: { calibrationProposal?: { count?: (args: unknown) => Promise<number> } } | null
): Promise<number> {
  if (!db?.calibrationProposal) {
    // CalibrationProposal model not generated — degrade gracefully.
    return 0;
  }
  try {
    return (await db.calibrationProposal.count?.({})) ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Lazy import so the stub still works when @sports/db is unavailable.
  const { db } = await import("@sports/db");
  const proposalCount = await safeCount(db as Parameters<typeof safeCount>[0]);
  return NextResponse.json({
    mode: "INTERNAL_ONLY",
    autoPublish: false,
    autoSend: false,
    automatedBetting: false,
    noAutoPublish: true,
    noAutoSend: true,
    noExternalPosting: true,
    noAutomatedBetting: true,
    internalOnly: true,
    guardrails: [
      "no-external-posting",
      "no-automated-betting",
    ],
    proposals: [],
    proposalCount,
    buckets: [],
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "calibration-is-read-only" },
    { status: 405 }
  );
}
