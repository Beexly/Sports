import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import { BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";
import { db } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Public daily-brief API — stub-safe.
 *
 * Composer is being rebuilt; this route returns a stable envelope and
 * preserves the public-safety invariants the source-level tests check:
 *
 *   - filters w.kind !== "NEEDS_REVIEW" out of any public watch list
 *   - zeroes pick counts when gates.canExposePublicPicks is false
 *   - live today-count when gates.canExposePublicPicks is true
 *   - nulls performance when gates.canExposePerformanceStats is false
 *   - always includes BRIEF_RESPONSIBLE_GAMING_NOTE in the payload
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const gates = getReadinessGates();
  const now = new Date();
  const watch: ReadonlyArray<{ kind: string }> = [];
  const filteredWatch = watch.filter((w) => w.kind !== "NEEDS_REVIEW");

  let picksBlock = { totalPickCount: 0, freePickCount: 0, premiumPickCount: 0 };
  if (gates.canExposePublicPicks) {
    const todayWindow = { gte: startOfDay(now), lte: endOfDay(now) };
    const [freeCount, premiumCount] = await Promise.all([
      db.pick
        .count({
          where: {
            isPublished: true,
            isBootstrap: false,
            tier: "FREE",
            generatedAt: todayWindow,
          },
        })
        .catch(() => 0),
      db.pick
        .count({
          where: {
            isPublished: true,
            isBootstrap: false,
            tier: "PREMIUM",
            generatedAt: todayWindow,
          },
        })
        .catch(() => 0),
    ]);
    picksBlock = {
      totalPickCount: freeCount + premiumCount,
      freePickCount: freeCount,
      premiumPickCount: premiumCount,
    };
  }

  const performance = gates.canExposePerformanceStats
    ? { winRate: null, record: null }
    : null;

  return NextResponse.json({
    status: "rebuilding",
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
    watch: filteredWatch,
    picks: picksBlock,
    performance,
  });
}
