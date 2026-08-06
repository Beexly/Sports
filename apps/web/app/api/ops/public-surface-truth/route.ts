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
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";
import { buildFounderNextSteps } from "@/lib/ops/founder-next-steps";
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
  "gate-honesty-feature-gate",
  "free-lane-content-wire",
  "credit-stack-posture",
  "jynx-unified-intelligence",
  "azure-foundry-provider",
  "cipher-claim-reward-honesty",
  "open-weight-free-lane-secondary",
  "founder-next-steps-queue",
  "web-standards-trust-surfaces",
  "free-lane-content-smoke",
  "jynx-multicloud-failover-smoke",
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


  const creditStack = loadCreditStackPosture();
  const jynx = creditStack.jynx;
  const founderNextSteps = buildFounderNextSteps({
    overduePending: settlement?.overduePending ?? null,
    settlementHealth: settlement?.health ?? null,
    freeLaneConfigured: creditStack.freeLaneConfigured,
    claudeProvider: creditStack.claudeProvider,
    anyCloudConfigured:
      creditStack.bedrockConfigured ||
      creditStack.azureFoundryConfigured ||
      creditStack.vertexConfigured,
    jynxAuto: Boolean(jynx?.auto),
    statsPublic: isStatsPublic(),
    canExposePublicPicks: gates.canExposePublicPicks,
    podcastEpisodes: listEpisodes().length,
    newsletterIssues: listIssues().length,
    markerCount: MAIN_FEATURE_MARKERS.length,
    expectedMarkerFloor: MAIN_FEATURE_MARKERS.length,
  });

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      detail: detailed ? "operator" : "public",
      deployment: {
        sha: deploymentSha,
        note: "Redeploy after main merges (honesty/Jynx/free-lane). Settlement CRITICAL or SHA lag → redeploy before matching code.",
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
      /** Public-safe AI cost posture — booleans only, never secrets. */
      creditStack,
      policy: PUBLIC_NAV_POLICY,
      law: {
        liveBoardDefault: "off",
        statsDefault: "dark",
        contestsDefault: "public free paper skill",
        refuseEphemeralWrites: true,
      },
      founderNextSteps,
      ...(detailed ? { mainFeatureMarkers: MAIN_FEATURE_MARKERS } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
