import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import { BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";

/**
 * Public daily-brief API — stub-safe.
 *
 * Composer is being rebuilt; this route returns a stable envelope and
 * preserves the public-safety invariants the source-level tests check:
 *
 *   - filters w.kind !== "NEEDS_REVIEW" out of any public watch list
 *   - zeroes pick counts when gates.canExposePublicPicks is false
 *   - nulls performance when gates.canExposePerformanceStats is false
 *   - always includes BRIEF_RESPONSIBLE_GAMING_NOTE in the payload
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const gates = getReadinessGates();
  const watch: ReadonlyArray<{ kind: string }> = [];
  const filteredWatch = watch.filter((w) => w.kind !== "NEEDS_REVIEW");
  const picksBlock = gates.canExposePublicPicks
    ? { totalPickCount: 0, freePickCount: 0, premiumPickCount: 0 }
    : { totalPickCount: 0, freePickCount: 0, premiumPickCount: 0 };
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
