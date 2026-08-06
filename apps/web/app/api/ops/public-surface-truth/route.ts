import { NextResponse } from "next/server";
import { isContestsPublic, isStatsPublic, PUBLIC_NAV_POLICY } from "@/lib/launch/public-surface-gate";
import { resolveContestStorageMode } from "@/lib/contests/store";
import { resolveWaitlistStorageMode } from "@/lib/gse/waitlist-store";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { listEpisodes } from "@/lib/podcast/episodes";
import { listIssues } from "@/lib/newsletter/issues";
import { db } from "@sports/db";
import { loadSettlementHealth } from "@/lib/performance/settlement-health";
import { loadSettlementBreakdown } from "@/lib/performance/settlement-breakdown";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Operator truth snapshot — what public gates resolve to on this host.
 * No secrets. Under /api/ (robots-disallowed). Cache-Control: no-store.
 */
export async function GET() {
  const gates = getReadinessGates();

  let settlement: {
    health: string;
    commencedTotal: number;
    overduePending: number;
    operatorMessage: string;
    bySport?: readonly { sportKey: string; overduePending: number }[];
    operatorNext?: readonly string[];
  } | null = null;
  try {
    if (!isStubMode()) {
      const s = await loadSettlementHealth(db, { graceHours: 6 });
      let bySport: { sportKey: string; overduePending: number }[] = [];
      let operatorNext: string[] = [];
      try {
        const b = await loadSettlementBreakdown(db, { graceHours: 6 });
        bySport = [...b.overdueBySport];
        operatorNext = [...b.operatorNext];
      } catch {
        /* breakdown optional */
      }
      settlement = {
        health: s.health,
        commencedTotal: s.commencedTotal,
        overduePending: s.overduePending,
        operatorMessage: s.operatorMessage,
        bySport,
        operatorNext,
      };
    }
  } catch {
    settlement = null;
  }

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      host: {
        stubMode: isStubMode(),
        demoPicksEnabled: isDemoPicksEnabled(),
        vercel: process.env.VERCEL === "1",
        nodeEnv: process.env.NODE_ENV ?? "unknown",
      },
      gates: {
        statsPublic: isStatsPublic(),
        contestsPublic: isContestsPublic(),
        canExposePublicPicks: gates.canExposePublicPicks,
        isBootstrapMode: gates.isBootstrapMode,
      },
      contestStorage: resolveContestStorageMode(),
      waitlistStorage: resolveWaitlistStorageMode(),
      settlement,
      content: {
        podcastEpisodes: listEpisodes().length,
        newsletterIssues: listIssues().length,
      },
      policy: PUBLIC_NAV_POLICY,
      law: {
        liveBoardDefault: "off",
        statsDefault: "dark",
        contestsDefault: "public free paper skill",
        refuseEphemeralWrites: true,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
