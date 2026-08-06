import { NextResponse } from "next/server";
import { isContestsPublic, isStatsPublic, PUBLIC_NAV_POLICY } from "@/lib/launch/public-surface-gate";
import { resolveContestStorageMode } from "@/lib/contests/store";
import { resolveWaitlistStorageMode } from "@/lib/gse/waitlist-store";
import { isStubMode, isDemoPicksEnabled, db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { listEpisodes } from "@/lib/podcast/episodes";
import { listIssues } from "@/lib/newsletter/issues";
import { loadSettlementHealth } from "@/lib/performance/settlement-health";
import { loadSettlementBreakdown } from "@/lib/performance/settlement-breakdown";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Features expected on main that older deploys may lack — diagnose lag. */
const MAIN_FEATURE_MARKERS = [
  "free-path-clv-grade",
  "free-path-clv-repair",
  "free-path-snapshot-outcome",
  "free-path-date-targeted-scores",
  "settle-picks-hourly",
  "overdue-first-stp",
  "postgres-public-form-rate-limit",
  "ops-truth-detail-auth",
] as const;

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

/**
 * Surface truth snapshot.
 * - Public: gates, storage modes, settlement band counts, deploymentSha.
 * - Bearer CRON_SECRET: bySport + operatorNext (internal remediation).
 */
export async function GET(request: Request) {
  const gates = getReadinessGates();
  const detailed = hasOpsAuth(request);
  const deploymentSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

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
      settlement = {
        health: s.health,
        commencedTotal: s.commencedTotal,
        overduePending: s.overduePending,
        operatorMessage: detailed
          ? s.operatorMessage
          : `${s.overduePending} of ${s.commencedTotal} commenced picks overdue past grace (${s.health}).`,
      };
      if (detailed) {
        try {
          const b = await loadSettlementBreakdown(db, { graceHours: 6 });
          settlement = {
            ...settlement,
            bySport: [...b.overdueBySport],
            operatorNext: [...b.operatorNext],
          };
        } catch {
          /* optional */
        }
      }
    }
  } catch {
    settlement = null;
  }

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      detail: detailed ? "operator" : "public",
      deployment: {
        sha: deploymentSha,
        note: "If settlement stays CRITICAL after main merges, redeploy so Vercel runs the latest SHA.",
        expectedMainFeatures: MAIN_FEATURE_MARKERS,
      },
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
      ...(detailed ? { mainFeatureMarkers: MAIN_FEATURE_MARKERS } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
