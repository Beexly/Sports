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
import { isSignalBoardSlateStale, isMarketBoardOddsStale } from "@/lib/data-reliability/public-freshness-gate";
import { boardSurfacePosture } from "@/lib/board/board-surface-policy";
import { loadBillingMoneyPosture } from "@/lib/ops/billing-money-posture";
import { loadAutonomyPosture } from "@/lib/ops/autonomy-posture";
import { loadStripeWebhookHostsPosture } from "@/lib/ops/stripe-webhook-hosts";
import { loadWaitlistPosture } from "@/lib/ops/waitlist-posture";
import { summarizeFreeSpineOddsPath } from "@/lib/ops/free-spine-odds-path";
import { loadCanonicalSamplePosture } from "@/lib/ops/canonical-sample-posture";
import { loadCalibrationOpsSurface } from "@/lib/ops/calibration-eligibility-durable";
import { aciPublicPosture } from "@/lib/calibration/aci-durable";
import { loadProvenPathSurface } from "@/lib/ops/proven-path-seed";
import { buildMurphyResSnapshot } from "@/lib/calibration/murphy-res-definition";
import { conformalRdPosture } from "@/lib/calibration/conformal-calibration";
import { ISOTONIC_ALTERNATIVES } from "@/lib/calibration/isotonic-alternatives";
import { productBoardSurfaces } from "@/lib/product/board-surfaces";
import { rankingPauseApplyPosture } from "@/lib/calibration/ranking-pause-apply";
import { selectiveRuntimePosture } from "@/lib/calibration/selective-publish-runtime";
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
  "checkout-pricing-alias",
  "stripe-webhook-hosts-posture",
  "founder-queue-low-noise",
  "waitlist-posture-ops-surface",
  "free-spine-parallel-probes",
  "canonical-sample-ops-truth",
  "odds-inserting-freshness-ops",
  "calibration-eligibility-engine",
  "calibration-auto-publish-policy",
  "ranking-surface-sort",
  "independent-ranking-v5.2.2",
  "public-dark-reason-taxonomy",
  "news-rss-curated-defaults",
  "b2b-signals-rankingp",
  "tools-line-movement",
  "session-leverage-atlas",
  "ranking-power-control-plane",
  "rpcp-conformal-bridge-offline",
  "product-board-surfaces-posture",
  "ranking-pause-apply-default-off",
  "why-board-quiet-draft",
  "b2b-experimental-openapi",
  "pick-card-rankingp",
  "generate-signal-slate",
  "signal-board-launch-path",
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
 * - Public: gates, storage modes, settlement band counts, deploymentSha, sample.
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

  // Canonical sample via loadPublicPerformancePolicy — not commencedTotal.
  let sample: Awaited<ReturnType<typeof loadCanonicalSamplePosture>> | null = null;
  if (!isStubMode()) {
    try {
      sample = await loadCanonicalSamplePosture(db, {
        commencedTotal: settlement?.commencedTotal ?? 0,
        canExposePerformanceStats: gates.canExposePerformanceStats,
        minSettledPicksForLearning: gates.minSettledPicksForLearning,
      });
    } catch {
      sample = null;
    }
  }

  // Kill-switch clock: last SUCCESS with oddsInserted > 0 (not free-spine zeros).
  let oddsInserting: {
    lastSuccessAt: string | null;
    ageMinutes: number | null;
    withinRefreshSla: boolean | null;
    oddsInserted: number | null;
    sport: string | null;
    operatorHint: string;
  } = {
    lastSuccessAt: null,
    ageMinutes: null,
    withinRefreshSla: null,
    oddsInserted: null,
    sport: null,
    operatorHint:
      "No odds-inserting SUCCESS found yet. Public /api/picks stays dark until oddsInserted>0 within Refresh SLA.",
  };
  if (!isStubMode()) {
    try {
      const run = await db.ingestionRun.findFirst({
        where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true, oddsInserted: true, sport: true },
      });
      if (run?.completedAt) {
        const ageMinutes = Math.round((Date.now() - run.completedAt.getTime()) / 60000);
        const withinRefreshSla = ageMinutes <= 240;
        oddsInserting = {
          lastSuccessAt: run.completedAt.toISOString(),
          ageMinutes,
          withinRefreshSla,
          oddsInserted: run.oddsInserted ?? null,
          sport: run.sport ?? null,
          operatorHint: withinRefreshSla
            ? `Last odds insert ${ageMinutes}m ago (within 240m SLA) — kill switch should allow public picks if PUBLIC_PICKS on.`
            : `Last odds insert ${ageMinutes}m ago (outside 240m SLA) — public picks stay dark until refresh-odds inserts odds again (quiet board does not clear this).`,
        };
      }
    } catch {
      /* leave default */
    }
  }

  const creditStack = loadCreditStackPosture();
  const billingMoney = loadBillingMoneyPosture();
  const autonomy = loadAutonomyPosture();
  const waitlist = loadWaitlistPosture();
  let stripeWebhookHosts: Awaited<
    ReturnType<typeof loadStripeWebhookHostsPosture>
  > = null;
  try {
    stripeWebhookHosts = await loadStripeWebhookHostsPosture();
  } catch {
    stripeWebhookHosts = null;
  }
  const jynx = creditStack.jynx;

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

  // Calibration eligibility + publish policy (durable; never invent metrics).
  let calibrationEligibility: Awaited<
    ReturnType<typeof loadCalibrationOpsSurface>
  >["eligibility"] | null = null;
  let calibrationPublish: Awaited<
    ReturnType<typeof loadCalibrationOpsSurface>
  >["publish"] | null = null;
  if (!isStubMode()) {
    try {
      const cal = await loadCalibrationOpsSurface({
        canonicalSettled: sample?.canonicalSettled ?? 0,
        minSettledForLearning:
          sample?.minSettledForLearning ?? gates.minSettledPicksForLearning,
        settlementHealthy: settlement?.health === "HEALTHY",
      });
      calibrationEligibility = cal.eligibility;
      calibrationPublish = cal.publish;
    } catch {
      calibrationEligibility = null;
      calibrationPublish = null;
    }
  }

  // Ladder + public performance only when published AND eligibility GREEN.
  const effectivePerformanceStats =
    calibrationPublish?.canExposePerformanceStats === true;
  const calibrationPublished = effectivePerformanceStats;

  const oddsStaleForSurface = await isMarketBoardOddsStale().catch(() => true);
  const boardSurface = boardSurfacePosture(process.env, { oddsFresh: !oddsStaleForSurface });
  const signalSlateStale =
    boardSurface.surface === "signal"
      ? await isSignalBoardSlateStale().catch(() => true)
      : false;

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
    stripeWebhookProbed: stripeWebhookHosts?.probed === true,
    stripeWebhookAuditRequired: stripeWebhookHosts?.auditRequired === true,
    stripeWebhookGseHealthy: stripeWebhookHosts?.gsePrimaryHealthy === true,
    stripeWebhookForeignHosts: stripeWebhookHosts?.enabledForeignHosts,
    freeSpinePresent: freeSpine.present,
    freeSpineWithinSla: freeSpine.withinSla,
    freeSpineCriticalGaps: freeSpine.criticalGaps,
    freeSpineRequireSpend: freeSpine.requireSpend,
    waitlistGateEnabled: waitlist.gateEnabled,
    nonSeedSettled: sample?.canonicalSettled ?? null,
    nonSeedFloorProven: sample?.minSettledForLearning ?? gates.minSettledPicksForLearning,
    oddsInsertingStale: oddsInserting.withinRefreshSla === false,
    boardSurface: boardSurface.surface,
    signalSlateStale,
    calibrationEligibilityStatus: calibrationEligibility?.status ?? null,
    calibrationPublished,
    calibrationAutoPublish: calibrationPublish?.autoPublish ?? false,
    remainingToFloor: sample?.remainingToFloor ?? null,
  });

  // Proof-gated ladder — canonical settled; publish from eligibility policy.
  const revenueLadder = evaluateRevenueLadder({
    canonicalSettled: sample?.canonicalSettled ?? 0,
    calibrationPublished,
    clvBeatCloseRate: null,
    settlementHealthy: settlement?.health === "HEALTHY",
    boardNotSuppressed:
      boardSurface.surface === "signal"
        ? signalSlateStale === false
        : oddsInserting.withinRefreshSla === true,
    liveBoardEnabled: process.env["LIVE_BOARD"]?.trim().toLowerCase() === "true",
    publicPicksEnabled: process.env["PUBLIC_PICKS_ENABLED"]?.trim().toLowerCase() === "true",
    performanceStatsEnabled: effectivePerformanceStats,
    minSettledProven: gates.minSettledPicksForLearning,
  });

  const productBoards = productBoardSurfaces(process.env);

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
        canExposePerformanceStats: effectivePerformanceStats,
        envPerformanceStatsEnabled: gates.canExposePerformanceStats,
        minSettledPicksForLearning: gates.minSettledPicksForLearning,
        calibrationPublished,
      },
      contestStorage: resolveContestStorageMode(),
      waitlistStorage: resolveWaitlistStorageMode(),
      waitlist,
      settlement,
      /**
       * Canonical sample (publish/learning SoT).
       * commenced ≠ settled. Excludes bootstrap + modelVersion v5.0.0-seed.
       * settle = grade; filter = these counts; publish = eligibility GREEN + policy (AUTO_PUBLISH or PUBLISHED).
       */
      sample,
      oddsInserting,
      calibrationEligibility: calibrationEligibility
        ? {
            status: calibrationEligibility.status,
            reasons: calibrationEligibility.reasons,
            n: calibrationEligibility.n,
            brier: calibrationEligibility.brier,
            ece: calibrationEligibility.ece,
            mce: calibrationEligibility.mce,
            murphy: calibrationEligibility.murphy,
            floors: calibrationEligibility.floors,
            consecutiveGreen: calibrationEligibility.consecutiveGreen,
            streakRequired: calibrationEligibility.streakRequired,
            modelVersion: calibrationEligibility.modelVersion,
            dateRange: calibrationEligibility.dateRange,
            generatedAt: calibrationEligibility.generatedAt,
            operatorHint: calibrationEligibility.operatorHint,
          }
        : null,
      calibrationPublish: calibrationPublish
        ? {
            published: calibrationPublish.published,
            publishedEffective: calibrationPublish.publishedEffective ?? calibrationPublish.published,
            source: calibrationPublish.source,
            autoPublish: calibrationPublish.autoPublish,
            autoUnpublish: calibrationPublish.autoUnpublish,
            canExposePerformanceStats: calibrationPublish.canExposePerformanceStats,
            operatorHint: calibrationPublish.operatorHint,
          }
        : null,
      content: {
        podcastEpisodes: listEpisodes().length,
        newsletterIssues: listIssues().length,
      },
      creditStack,
      billingMoney,
      stripeWebhookHosts,
      autonomy,
      boardSurface: boardSurfacePosture(process.env, {
        oddsFresh: oddsInserting?.withinRefreshSla === true,
      }),
      /** STATKING / HELM / PICKPILOT / CLUBHOUSE / GSE board honesty map. */
      productBoards: {
        surfaces: productBoards.surfaces,
        liveProductionIds: productBoards.liveProductionIds,
        darkByLawIds: productBoards.darkByLawIds,
        designPreviewOnly: productBoards.designPreviewOnly,
        operatorHint: productBoards.operatorHint,
      },
      aciPosture: aciPublicPosture(),
      ...(await (async () => {
        const surface = await loadProvenPathSurface();
        const murphySnap =
          calibrationEligibility?.murphy != null &&
          calibrationEligibility.brier != null
            ? buildMurphyResSnapshot({
                brier: calibrationEligibility.brier,
                reliability: calibrationEligibility.murphy.reliability,
                resolution: calibrationEligibility.murphy.resolution,
                uncertainty: calibrationEligibility.murphy.uncertainty,
              })
            : null;
        const pausePosture = rankingPauseApplyPosture(
          process.env,
          surface?.plan ?? null,
        );
        const selectivePosture = selectiveRuntimePosture(
          process.env,
          surface?.plan ?? null,
        );
        return {
          provenPath: surface?.plan ?? null,
          provenPathProjection: surface?.projection ?? null,
          /** Ranking Power Control Plane — residual + operatorHint for founder ops. */
          rankingPower: surface?.rankingPowerPosture ?? {
            present: false,
            bestScore: null,
            rankingSignal: null,
            pathViable: null,
            liveRes: null,
            projectedRes: null,
            deltaRes: null,
            pauseGroupCount: null,
            independentCoverage: null,
            primaryBottleneck: null,
            mapsApplyGateOpen: null,
            residualOperatorHint: null,
            operatorHint: "Ranking Power Control Plane not seeded.",
            rankingPolarityLaw: "positive_separation_required",
          },
          /** Offline conformal bridge posture (never eligibility). */
          rpcpConformalBridge: surface?.conformalBridgeEnv ?? {
            computeEnabled: false,
            productFlags: {
              conformalAbstainEnabled: false,
              calibrationAdjustmentsEnabled: false,
              autoPublish: false,
            },
            unlocksProven: false,
            raisesRes: false,
            operatorHint:
              "RPCP–conformal bridge default offline (not seeded).",
          },
          /** Pause list apply — default OFF; plan pause is advisory until RANKING_PAUSE_APPLY. */
          rankingPauseApply: pausePosture,
          selectiveRuntime: selectivePosture,
          // Top-level polarity glance (also nested under provenPath*)
          rankingPolarityLaw:
            surface?.plan?.rankingPolarityLaw ?? "positive_separation_required",
          bestScore: surface?.plan?.bestScore ?? null,
          bestSeparation: surface?.projection?.bestSeparation ?? null,
          pathViable: surface?.projection?.pathViable ?? null,
          murphyExplain: murphySnap?.explain ?? null,
          murphyRes: murphySnap,
          conformalRd: conformalRdPosture(process.env),
          isotonicAlternatives: ISOTONIC_ALTERNATIVES.map((a) => ({
            situation: a.situation,
            prefer: a.prefer,
            module: a.existingModule,
            raisesRes: a.raisesRes,
          })),
        };
      })()),
      mapVsCanonical: {
        canonicalSettled: sample?.canonicalSettled ?? null,
        mapN: calibrationEligibility?.n ?? null,
        note:
          "canonicalSettled includes WIN|LOSS|PUSH; map n is learning-eligible WIN|LOSS only (eligibleForLearning). Gap is expected — see docs/ops/SAMPLE_N_VS_MAP_N.md",
      },
      bayesianRd: {
        adjustmentsEnabled: false,
        hierarchicalEbTau: true,
        dirichletProcessInPath: false,
        note: "Bayesian/hierarchical MAP Platt is offline R&D only (EB τ clamped). Eligibility stays frequentist. DP clustering not in prod path.",
      },
      freeSpine,
      policy: PUBLIC_NAV_POLICY,
      law: {
        liveBoardDefault: "off",
        statsDefault: "dark",
        contestsDefault: "public free paper skill",
        refuseEphemeralWrites: true,
        rankingPauseApplyDefault: "off",
        mapsDefault: "off",
      },
      founderNextSteps,
      revenueLadder: {
        currentStep: revenueLadder.currentStep,
        nextStep: revenueLadder.nextStep,
        canHonestlyMonetizePublicTrackRecord: revenueLadder.canHonestlyMonetizePublicTrackRecord,
        operatorMessage: revenueLadder.operatorMessage,
        blockersToNext: revenueLadder.blockersToNext,
        milestones: revenueLadder.milestones,
      },
      ...(detailed ? { mainFeatureMarkers: MAIN_FEATURE_MARKERS } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
