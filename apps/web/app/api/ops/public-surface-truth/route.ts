import { NextResponse } from "next/server";
import { isContestsPublic, isStatsPublic, PUBLIC_NAV_POLICY } from "@/lib/launch/public-surface-gate";
import { resolveContestStorageMode } from "@/lib/contests/store";
import { resolveWaitlistStorageMode } from "@/lib/gse/waitlist-store";
import { isStubMode, isDemoPicksEnabled, db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { listEpisodes } from "@/lib/podcast/episodes";
import { listIssues } from "@/lib/newsletter/issues";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { loadSettlementBreakdown } from "@/lib/performance/settlement-breakdown";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";
import { evaluateRevenueLadder } from "@/lib/autonomy/revenue-ladder";
import { buildFounderNextSteps } from "@/lib/ops/founder-next-steps";
import { loadBillingMoneyPosture } from "@/lib/ops/billing-money-posture";
import { loadAutonomyPosture } from "@/lib/ops/autonomy-posture";
import { summarizeFreeSpineOddsPath } from "@/lib/ops/free-spine-odds-path";
import {
  FREE_SPINE_DURABLE_SLA_MS,
  freeSpineSnapAgeMs,
  freeSpineWithinSla,
  resolveBestFreeSpineSnapshot,
} from "@/lib/data-sources/free-spine-durable";
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
  "free-path-team-game-log-repair",
  "revenue-ladder-ops-surface",
  "free-spine-durable-i3-i8",
  "autonomy-free-spine-age",
  "free-spine-empty-not-critical-i5",
  "impeccable-probe-harness",
  "checkout-revenue-capability-probe",
  "billing-money-posture-ops-surface",
  "autonomy-resolve-best-free-spine",
  "free-spine-prefer-fresher-durable",
  "free-spine-coverage-founder-queue",
  "autonomy-posture-ops-surface",
  "free-spine-odds-path-summary",
  "impeccable-multi-path-probe",
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
      const s = await loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS });
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
          const b = await loadSettlementBreakdown(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS });
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
  const billingMoney = loadBillingMoneyPosture();
  const autonomy = loadAutonomyPosture();
  const jynx = creditStack.jynx;

  // I3/I8: resolve free-spine BEFORE founder queue so coverage gaps / SLA land in steps.
  let freeSpine: {
    present: boolean;
    source: "process" | "durable" | "none";
    ageMinutes: number | null;
    withinSla: boolean;
    sportsProbed: number | null;
    sportsWithGames: number | null;
    criticalGaps: number | null;
    freeCovered: number | null;
    requireSpend: number | null;
    oddsPath: ReturnType<typeof summarizeFreeSpineOddsPath>;
    probedAt: string | null;
    slaMinutes: number;
  } = {
    present: false,
    source: "none",
    ageMinutes: null,
    withinSla: false,
    sportsProbed: null,
    sportsWithGames: null,
    criticalGaps: null,
    freeCovered: null,
    requireSpend: null,
    oddsPath: null,
    probedAt: null,
    slaMinutes: Math.round(FREE_SPINE_DURABLE_SLA_MS / 60000),
  };
  try {
    // I3: prefer fresh process RAM; if cold/stale, load Neon durable and pick fresher.
    const { snap, source } = await resolveBestFreeSpineSnapshot();
    if (snap) {
      const ageMs = freeSpineSnapAgeMs(snap);
      freeSpine = {
        present: true,
        source,
        ageMinutes: ageMs == null ? null : Math.round(ageMs / 60000),
        withinSla: freeSpineWithinSla(snap),
        sportsProbed: snap.sportsProbed,
        sportsWithGames: snap.sportsWithGames,
        criticalGaps: snap.criticalGaps,
        freeCovered: snap.freeCovered,
        requireSpend: snap.requireSpend,
        oddsPath: summarizeFreeSpineOddsPath({
          criticalGaps: snap.criticalGaps,
          requireSpend: snap.requireSpend,
          freeCovered: snap.freeCovered,
        }),
        probedAt: snap.probedAt,
        slaMinutes: Math.round(FREE_SPINE_DURABLE_SLA_MS / 60000),
      };
    }
  } catch {
    /* honest empty */
  }

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
    stripeSecretConfigured: billingMoney.stripeSecretConfigured,
    webhookSecretConfigured: billingMoney.webhookSecretConfigured,
    freeSpinePresent: freeSpine.present,
    freeSpineWithinSla: freeSpine.withinSla,
    freeSpineCriticalGaps: freeSpine.criticalGaps,
    freeSpineRequireSpend: freeSpine.requireSpend,
  });

  // Proof-gated ladder — never invents calibration/CLV; never flips gates.
  const revenueLadder = evaluateRevenueLadder({
    canonicalSettled: settlement?.commencedTotal ?? 0,
    calibrationPublished: false,
    clvBeatCloseRate: null,
    settlementHealthy: settlement?.health === "HEALTHY",
    boardNotSuppressed: false,
    liveBoardEnabled: process.env["LIVE_BOARD"]?.trim().toLowerCase() === "true",
    publicPicksEnabled: process.env["PUBLIC_PICKS_ENABLED"]?.trim().toLowerCase() === "true",
    performanceStatsEnabled: process.env["PERFORMANCE_STATS_ENABLED"]?.trim().toLowerCase() === "true",
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
      /** Public-safe money path posture — booleans + lookup keys only, never secrets. */
      billingMoney,
      /** Public-safe autonomy executor posture — dry-run default, free crons only. */
      autonomy,
      freeSpine,
      policy: PUBLIC_NAV_POLICY,
      law: {
        liveBoardDefault: "off",
        statsDefault: "dark",
        contestsDefault: "public free paper skill",
        refuseEphemeralWrites: true,
      },
      founderNextSteps,
      revenueLadder: {
        currentStep: revenueLadder.currentStep,
        nextStep: revenueLadder.nextStep,
        canHonestlyMonetizePublicTrackRecord: revenueLadder.canHonestlyMonetizePublicTrackRecord,
        operatorMessage: revenueLadder.operatorMessage,
        blockersToNext: revenueLadder.blockersToNext,
      },
      ...(detailed ? { mainFeatureMarkers: MAIN_FEATURE_MARKERS } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
