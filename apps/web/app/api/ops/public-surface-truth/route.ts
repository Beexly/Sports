import { NextRequest, NextResponse } from "next/server";
// isContestsPublic is still reported below. The contests SURFACE is gone, but
// this endpoint is the operator truth surface: saying "contests is dark" is
// exactly the fact an operator needs, and a silently-missing key would read as
// "unknown" rather than "deliberately off". The gate itself stays in
// public-surface-gate.ts for the same reason.
import { isContestsPublic, isStatsPublic, PUBLIC_NAV_POLICY } from "@/lib/launch/public-surface-gate";
import { hasOpsAuth } from "@/lib/ops/ops-auth";
import { resolveWaitlistStorageMode } from "@/lib/gse/waitlist-store";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";
import { HANDLED_STRIPE_WEBHOOK_EVENTS } from "@/lib/billing/stripe-webhook-events";
import { isStubMode, isDemoPicksEnabled, db } from "@sports/db";
import { getReadinessGates, getPlatformConfig } from "@sports/prediction-engine";
import { listEpisodes } from "@/lib/podcast/episodes";
import { listIssues } from "@/lib/newsletter/issues";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { loadSettlementBreakdown } from "@/lib/performance/settlement-breakdown";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";
import { evaluateRevenueLadder } from "@/lib/autonomy/revenue-ladder";
import {
  loadPublicClvPolicy,
  evaluatePublicClvPolicy,
  computeClvPushDoctrineRates,
} from "@/lib/performance/public-clv-policy";
import { evaluatePhaseAdvance } from "@/lib/pricing/phase-readiness";
import {
  STALE_PENDING_PICK_MAX_AGE_DAYS,
  staleUnstartedPublishedPendingWhere,
} from "@/lib/board/stale-pick-policy";
import { loadMarketCoverage } from "@/lib/board/market-coverage";
import { loadConfidenceTail } from "@/lib/calibration/confidence-tail";
import { loadRankingBasisCensus } from "@/lib/calibration/ranking-basis-census";
import {
  assessOddsLineArchiveFreshness,
  readOddsLineArchiveFreshnessInput,
  type OddsLineArchiveFreshnessResult,
  type OddsLineArchiveFreshnessThresholds,
} from "@/lib/ops/odds-line-archive-freshness";
import { buildFounderNextSteps } from "@/lib/ops/founder-next-steps";
import { isSignalBoardSlateStale, isMarketBoardOddsStale } from "@/lib/data-reliability/public-freshness-gate";
import { boardSurfacePosture } from "@/lib/board/board-surface-policy";
import { loadBillingMoneyPosture } from "@/lib/ops/billing-money-posture";
import { loadAutonomyPosture } from "@/lib/ops/autonomy-posture";
import { surveyLineIntegrity } from "@/lib/settlement/line-integrity-lane";
import { loadStripeWebhookHostsPosture } from "@/lib/ops/stripe-webhook-hosts";
import { loadWaitlistPosture } from "@/lib/ops/waitlist-posture";
import { summarizeFreeSpineOddsPath } from "@/lib/ops/free-spine-odds-path";
import { loadCanonicalSamplePosture } from "@/lib/ops/canonical-sample-posture";
import {
  calibrationDriftPosture,
  loadCalibrationOpsSurface,
} from "@/lib/ops/calibration-eligibility-durable";
import { aciPublicPosture } from "@/lib/calibration/aci-durable";
import { loadProvenPathSurface } from "@/lib/ops/proven-path-seed";
import { buildMurphyResSnapshot } from "@/lib/calibration/murphy-res-definition";
import { conformalRdPosture } from "@/lib/calibration/conformal-calibration";
import { ISOTONIC_ALTERNATIVES } from "@/lib/calibration/isotonic-alternatives";
import { loadMapBakeoff, summarizeMapBakeoff } from "@/lib/ops/map-bakeoff-durable";
import { productBoardSurfaces } from "@/lib/product/board-surfaces";
import { rankingPauseApplyPosture } from "@/lib/calibration/ranking-pause-apply";
import { selectiveRuntimePosture } from "@/lib/calibration/selective-publish-runtime";
import { loadRankingPauseApply } from "@/lib/ops/ranking-pause-durable";
import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";
import { maybeRunTrafficHeartbeat } from "@/lib/ops/traffic-heartbeat";
import {
  FREE_SPINE_DURABLE_SLA_MS,
  freeSpineSnapAgeMs,
  freeSpineWithinSla,
  resolveBestFreeSpineSnapshot,
} from "@/lib/data-sources/free-spine-durable";
import {
  oddsApiKeyPresence,
  rundownApiKeyPresence,
  emptyOddsCreditTruth,
  loadOddsCreditTruth,
  type OddsCreditLedgerDb,
  type OddsCreditTruth,
} from "@sports/data-ingestion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Bounded server-side snapshot cache TTL to prevent DB stampedes on L10 polls. */
export const PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS = 45_000;
/** Hard per-read timeout bound so one slow DB/RPC query never stalls the surface past 10s. */
export const PUBLIC_SURFACE_TRUTH_READ_TIMEOUT_MS = 3_500;

type TruthCacheBucket = "public" | "operator";
type TruthCacheEntry = {
  readonly payload: Record<string, unknown>;
  readonly expiresAt: number;
};

const truthResponseCache = new Map<TruthCacheBucket, TruthCacheEntry>();
let testCacheOverride: boolean | null = null;

/** Test-only helper: clear cached truth snapshots and restore default test cache behavior. */
export function __resetPublicSurfaceTruthCacheForTests(): void {
  truthResponseCache.clear();
  testCacheOverride = null;
}

/** Test-only helper: explicitly enable or disable the 45s cache inside Vitest. */
export function __setPublicSurfaceTruthCacheEnabledForTests(enabled: boolean | null): void {
  testCacheOverride = enabled;
  if (!enabled) {
    truthResponseCache.clear();
  }
}

function shouldUseCache(request: Request): { enabled: boolean; bypassRead: boolean } {
  let fresh = false;
  try {
    const parsed = new URL(request.url);
    const param = parsed.searchParams.get("fresh");
    fresh = param === "1" || param === "true";
  } catch {
    fresh = false;
  }

  const headerOptIn = request.headers.get("x-ops-truth-cache") === "1";
  const isTestEnv = process.env.NODE_ENV === "test";
  const enabled =
    testCacheOverride !== null
      ? testCacheOverride
      : headerOptIn || !isTestEnv;

  return { enabled, bypassRead: fresh };
}

/** A read-only posture field must never take the whole truth surface down: any
 *  throw (including a synchronous one from a partial client) reads as null. */
async function safeRead<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** Bound an independent read-only probe by `timeoutMs`, returning `fallback` on timeout or error. */
async function withReadTimeout<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs: number = PUBLIC_SURFACE_TRUTH_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), timeoutMs);
    });
    return await Promise.race([
      Promise.resolve().then(fn).catch(() => fallback),
      timeoutPromise,
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function settledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Features expected on main that older deploys may lack -- diagnose lag. */
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

/**
 * 2026-09-19: read-only observability field. odds_line_snapshots silently
 * stopped being written for three weeks (2026-08-22 to 2026-09-13, see
 * AGENTS.md). ADDITIVE ONLY: never gates PUBLIC_PICKS / STATS_PUBLIC /
 * LIVE_BOARD / PERFORMANCE_STATS.
 */
const ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS: OddsLineArchiveFreshnessThresholds = {
  degradedAfterMinutes: 60,
  staleAfterMinutes: 360,
};

/**
 * Fail-closed read: stub mode, DB error, or timeout resolves to the same
 * "absent" input, which assessOddsLineArchiveFreshness judges STALE, never healthy.
 */
async function readOddsLineArchiveFreshnessSafely(): Promise<OddsLineArchiveFreshnessResult> {
  if (isStubMode()) {
    return assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: null },
      ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS,
    );
  }
  try {
    const read = await readOddsLineArchiveFreshnessInput({
      db,
      recentWindowMinutes: ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS.degradedAfterMinutes,
    });
    return assessOddsLineArchiveFreshness(read.input, ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS);
  } catch {
    return assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: null },
      ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS,
    );
  }
}

/**
 * Surface truth snapshot.
 * - Public: gates, storage modes, settlement band counts, deploymentSha, sample.
 * - Bearer CRON_SECRET: bySport + operatorNext (internal remediation).
 */
export async function GET(request: Request) {
  const detailed = hasOpsAuth(request);

  // Check rate-limit BEFORE cache hit so abusive anonymous IPs still hit 429
  // at 60 req/min regardless of whether responses are served from cache.
  if (!detailed) {
    const limit = consumeRateLimit("public-ops-surfaces", clientIp(request as NextRequest), 60, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait and try again.",
          code: "rate_limited",
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  const cachePolicy = shouldUseCache(request);
  const cacheBucket: TruthCacheBucket = detailed ? "operator" : "public";
  const nowMs = Date.now();
  if (cachePolicy.enabled && !cachePolicy.bypassRead) {
    const hit = truthResponseCache.get(cacheBucket);
    if (hit && hit.expiresAt > nowMs) {
      return NextResponse.json(hit.payload, { headers: { "Cache-Control": "no-store" } });
    }
  }

  const stubMode = isStubMode();
  const gates = getReadinessGates();
  const deploymentSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

  const staleArchiveFallback = assessOddsLineArchiveFreshness(
    { mostRecentCapturedAt: null },
    ODDS_LINE_ARCHIVE_FRESHNESS_THRESHOLDS,
  );

  // Fire-and-forget traffic heartbeat: never awaited, never fails this response.
  void maybeRunTrafficHeartbeat().catch(() => undefined);

  // Wave 1: run ALL independent DB and ops probes concurrently with a 3,500ms
  // per-read timeout budget so production never stalls into a serial >10s waterfall.
  const wave1 = await Promise.allSettled([
    withReadTimeout(() => assessSchedulerLiveness(), null),
    withReadTimeout(() => resolveBestFreeSpineSnapshot(), null),
    withReadTimeout(() => isMarketBoardOddsStale(), true),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () => loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS }),
          null,
        ),
    detailed && !stubMode
      ? withReadTimeout(
          () => loadSettlementBreakdown(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS }),
          null,
        )
      : Promise.resolve(null),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            loadCanonicalSamplePosture(db, {
              commencedTotal: 0,
              canExposePerformanceStats: gates.canExposePerformanceStats,
              minSettledPicksForLearning: gates.minSettledPicksForLearning,
            }),
          null,
        ),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            db.ingestionRun.findFirst({
              where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
              orderBy: { completedAt: "desc" },
              select: { completedAt: true, oddsInserted: true, sport: true },
            }),
          null,
        ),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            db.ingestionRun.findFirst({
              where: {
                status: "SUCCESS",
                oddsInserted: 0,
                sport: { not: "free-spine" },
              },
              orderBy: { completedAt: "desc" },
              select: { completedAt: true, oddsInserted: true, sport: true, errorMessage: true },
            }),
          null,
        ),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            safeRead(() =>
              loadOddsCreditTruth(db as unknown as OddsCreditLedgerDb, new Date()),
            ),
          null,
        ),
    detailed
      ? withReadTimeout(() => loadStripeWebhookHostsPosture(), null)
      : Promise.resolve(null),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            loadPublicClvPolicy(db, {
              canExposePerformanceStats: false,
              minGradedForPublic: 25,
            }),
          null,
        ),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            db.pick.count({
              where: staleUnstartedPublishedPendingWhere(new Date()),
            }),
          null,
        ),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(() => loadMarketCoverage(db as never), null),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(() => loadConfidenceTail(db as never), null),
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(() => loadRankingBasisCensus(db as never), null),
    withReadTimeout(() => readOddsLineArchiveFreshnessSafely(), staleArchiveFallback),
    !detailed || stubMode
      ? Promise.resolve(null)
      : withReadTimeout(() => surveyLineIntegrity(db as never), null),
    withReadTimeout(() => loadProvenPathSurface(), null),
    withReadTimeout(() => loadRankingPauseApply(), null),
    withReadTimeout(() => loadMapBakeoff(), null),
  ]);

  const schedulerLiveness = settledOr(wave1[0], null);
  const freeSpineSnap = settledOr(wave1[1], null);
  const oddsStaleForSurface = settledOr(wave1[2], true);
  const settlementHealthRes = settledOr(wave1[3], null);
  const settlementBreakdownRes = settledOr(wave1[4], null);
  const sampleRaw = settledOr(wave1[5], null);
  const run = settledOr(wave1[6], null);
  const zeroRun = settledOr(wave1[7], null);
  const credits = settledOr(wave1[8], null);
  const stripeWebhookHosts = settledOr(wave1[9], null);
  const rawClvPolicy = settledOr(wave1[10], null);
  const stalePendingPicks = settledOr(wave1[11], null);
  const marketCoverage = settledOr(wave1[12], null);
  const confidenceTail = settledOr(wave1[13], null);
  const rankingBasis = settledOr(wave1[14], null);
  const oddsLineArchiveFreshness = settledOr(wave1[15], staleArchiveFallback);
  const lineIntegrity = settledOr(wave1[16], null);
  const provenSurface = settledOr(wave1[17], null);
  const durablePause = settledOr(wave1[18], null);
  const mapBakeoffRaw = settledOr(wave1[19], null);

  let settlement: {
    health: string;
    commencedTotal: number;
    overduePending: number;
    operatorMessage: string;
    bySport?: readonly { sportKey: string; overduePending: number }[];
    operatorNext?: readonly string[];
  } | null = null;
  if (settlementHealthRes) {
    settlement = {
      health: settlementHealthRes.health,
      commencedTotal: settlementHealthRes.commencedTotal,
      overduePending: settlementHealthRes.overduePending,
      operatorMessage: detailed
        ? settlementHealthRes.operatorMessage
        : `${settlementHealthRes.overduePending} of ${settlementHealthRes.commencedTotal} commenced picks overdue past grace (${settlementHealthRes.health}).`,
    };
    if (detailed && settlementBreakdownRes) {
      settlement = {
        ...settlement,
        bySport: [...settlementBreakdownRes.overdueBySport],
        operatorNext: [...settlementBreakdownRes.operatorNext],
      };
    }
  }

  // Reconcile commencedTotal onto the sample object once settlement finishes.
  const sample: Awaited<ReturnType<typeof loadCanonicalSamplePosture>> | null = sampleRaw
    ? {
        ...sampleRaw,
        commencedTotal: Math.max(0, Math.floor(settlement?.commencedTotal ?? sampleRaw.commencedTotal)),
      }
    : null;

  const boardSurface = boardSurfacePosture(process.env, { oddsFresh: !oddsStaleForSurface });

  // Wave 2: only the two probes that depend on Wave 1 outputs run here.
  const wave2 = await Promise.allSettled([
    stubMode
      ? Promise.resolve(null)
      : withReadTimeout(
          () =>
            loadCalibrationOpsSurface({
              canonicalSettled: sample?.canonicalSettled ?? 0,
              minSettledForLearning:
                sample?.minSettledForLearning ?? gates.minSettledPicksForLearning,
              settlementHealthy: settlement?.health === "HEALTHY",
            }),
          null,
        ),
    boardSurface.surface === "signal"
      ? withReadTimeout(() => isSignalBoardSlateStale(), true)
      : Promise.resolve(false),
  ]);

  const cal = settledOr(wave2[0], null);
  const signalSlateStale = settledOr(wave2[1], boardSurface.surface === "signal");

  // Kill-switch clock: last SUCCESS with oddsInserted > 0 (not free-spine zeros).
  const oddsKeySlot = oddsApiKeyPresence();
  const rundownKeySlot = rundownApiKeyPresence();
  let oddsInserting: {
    lastSuccessAt: string | null;
    ageMinutes: number | null;
    withinRefreshSla: boolean | null;
    oddsInserted: number | null;
    sport: string | null;
    dualPath: {
      oddsKeyPresent: boolean;
      oddsMatchedEnv: string | null;
      rundownKeyPresent: boolean;
      rundownMatchedEnv: string | null;
      /** Zero-key ESPN public odds tertiary path (always code-available). */
      espnPublicTertiary: true;
      credits: OddsCreditTruth;
    };
    lastZeroOddsSuccessAt: string | null;
    lastZeroOddsSport: string | null;
    lastZeroOddsNote: string | null;
    operatorHint: string;
  } = {
    lastSuccessAt: null,
    ageMinutes: null,
    withinRefreshSla: null,
    oddsInserted: null,
    sport: null,
    dualPath: {
      oddsKeyPresent: oddsKeySlot.present,
      oddsMatchedEnv: oddsKeySlot.matchedEnv,
      rundownKeyPresent: rundownKeySlot.present,
      rundownMatchedEnv: rundownKeySlot.matchedEnv,
      espnPublicTertiary: true,
      credits: emptyOddsCreditTruth(),
    },
    lastZeroOddsSuccessAt: null,
    lastZeroOddsSport: null,
    lastZeroOddsNote: null,
    operatorHint:
      "No odds-inserting SUCCESS found yet. Market board stays dark until oddsInserted>0 within Refresh SLA. Signal board is independent.",
  };

  if (!stubMode) {
    if (zeroRun?.completedAt) {
      oddsInserting.lastZeroOddsSuccessAt = zeroRun.completedAt.toISOString();
      oddsInserting.lastZeroOddsSport = zeroRun.sport ?? null;
      const err = (zeroRun.errorMessage ?? "").toLowerCase();
      const rateLimited =
        err.includes("429") ||
        err.includes("rate_limited") ||
        err.includes("rate limit");
      oddsInserting.lastZeroOddsNote = rateLimited
        ? "Recent SUCCESS with oddsInserted=0 -- provider HTTP 429 / rate_limited. Does NOT advance market kill-switch clock. Wait out free-tier window or set THE_ODDS_API_KEY (dual path)."
        : "Recent SUCCESS with oddsInserted=0 (quiet board, empty provider events, or mapping drop) -- does NOT advance market kill-switch clock.";
    }
    if (run?.completedAt) {
      const ageMinutes = Math.round((Date.now() - run.completedAt.getTime()) / 60000);
      const withinRefreshSla = ageMinutes <= 240;
      const zeroErr = (zeroRun?.errorMessage ?? "").toLowerCase();
      const rateLimited =
        zeroErr.includes("429") ||
        zeroErr.includes("rate_limited") ||
        zeroErr.includes("rate limit");
      let keyHint = !oddsKeySlot.present && !rundownKeySlot.present
        ? " No Odds/Rundown keys visible -- ESPN public free path still available (tertiary)."
        : !oddsKeySlot.present && rundownKeySlot.present
          ? ` Rundown key present (${rundownKeySlot.matchedEnv}); Odds API ABSENT; ESPN public tertiary if Rundown empty/429.`
          : oddsKeySlot.present
            ? ` Odds key present (${oddsKeySlot.matchedEnv}).`
            : "";
      if (rateLimited && !oddsKeySlot.present) {
        keyHint +=
          " Rundown free-tier 429 active -- cascade to ESPN public odds (zero keys) or wait cool-off / add THE_ODDS_API_KEY.";
      }
      oddsInserting = {
        ...oddsInserting,
        lastSuccessAt: run.completedAt.toISOString(),
        ageMinutes,
        withinRefreshSla,
        oddsInserted: run.oddsInserted ?? null,
        sport: run.sport ?? null,
        operatorHint: withinRefreshSla
          ? `Last odds insert ${ageMinutes}m ago (within 240m SLA).${keyHint}`
          : `Last odds insert ${ageMinutes}m ago (outside 240m SLA) -- market board dark until refresh-odds inserts odds again (quiet/empty SUCCESS does not clear this).${keyHint} Signal board independent.`,
      };
    } else {
      const keyHint = !oddsKeySlot.present && !rundownKeySlot.present
        ? "No quote keys visible."
        : rundownKeySlot.present
          ? `Rundown key present (${rundownKeySlot.matchedEnv}) but no oddsInserted>0 run yet -- provider empty/mapping, 429, or multi-day lag.`
          : `Odds key present (${oddsKeySlot.matchedEnv}) but no oddsInserted>0 run yet.`;
      oddsInserting = {
        ...oddsInserting,
        operatorHint: `${keyHint} Market board stays dark until oddsInserted>0. Signal board independent.`,
      };
    }
    if (credits) {
      oddsInserting = {
        ...oddsInserting,
        dualPath: { ...oddsInserting.dualPath, credits },
      };
    }
  }

  const creditStack = loadCreditStackPosture();
  const billingMoney = loadBillingMoneyPosture();
  const autonomy = loadAutonomyPosture();
  const waitlist = loadWaitlistPosture();
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
  if (freeSpineSnap?.snap) {
    const { snap, source } = freeSpineSnap;
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

  // Calibration eligibility + publish policy (durable; never invent metrics).
  let calibrationEligibility: Awaited<
    ReturnType<typeof loadCalibrationOpsSurface>
  >["eligibility"] | null = null;
  let calibrationPublish: Awaited<
    ReturnType<typeof loadCalibrationOpsSurface>
  >["publish"] | null = null;
  let calibrationMetricsArtifact: Awaited<
    ReturnType<typeof loadCalibrationOpsSurface>
  >["metrics"] | null = null;
  let calibrationDrift: ReturnType<typeof calibrationDriftPosture> = null;
  if (cal) {
    calibrationEligibility = cal.eligibility;
    calibrationPublish = cal.publish;
    calibrationMetricsArtifact = cal.metrics ?? null;
    try {
      calibrationDrift = calibrationDriftPosture(cal.drift ?? null);
    } catch {
      calibrationDrift = null;
    }
  }

  // Ladder + public performance only when published AND eligibility GREEN.
  const effectivePerformanceStats =
    calibrationPublish?.canExposePerformanceStats === true;
  const calibrationPublished = effectivePerformanceStats;

  const founderNextSteps = buildFounderNextSteps({
    schedulerStatus: schedulerLiveness?.status,
    schedulerAgeMinutes: schedulerLiveness?.ageMinutes ?? null,
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

  // Re-evaluate CLV exposure synchronously against effectivePerformanceStats once calibration resolves.
  const clvPolicy =
    rawClvPolicy &&
    effectivePerformanceStats &&
    typeof rawClvPolicy.beatCloseCount === "number"
      ? evaluatePublicClvPolicy({
          canExposePerformanceStats: effectivePerformanceStats,
          minGradedForPublic: 25,
          gradedSampleSize: rawClvPolicy.gradedSampleSize,
          beatCloseCount: rawClvPolicy.beatCloseCount,
          lostToCloseCount: rawClvPolicy.lostToCloseCount,
          matchedCloseCount: rawClvPolicy.matchedCloseCount,
        })
      : rawClvPolicy;

  const clvBeatCloseRate =
    clvPolicy && clvPolicy.gradedSampleSize >= 25
      ? clvPolicy.beatCloseCount / clvPolicy.gradedSampleSize
      : null;
  const clvDoctrineRates = clvPolicy
    ? computeClvPushDoctrineRates({
        beatCloseCount: clvPolicy.beatCloseCount,
        lostToCloseCount: clvPolicy.lostToCloseCount,
        matchedCloseCount: clvPolicy.matchedCloseCount,
      })
    : null;
  const clvPosture = clvPolicy
    ? clvPolicy.canExposeClv
      ? {
          gradedSampleSize: clvPolicy.gradedSampleSize,
          beatCloseCount: clvPolicy.beatCloseCount,
          matchedCloseCount: clvPolicy.matchedCloseCount,
          lostToCloseCount: clvPolicy.lostToCloseCount,
          beatCloseRate: clvBeatCloseRate,
          decidedClvBeatRate: clvDoctrineRates?.decidedClvBeatRate ?? null,
          decidedClvBeatDenominator: clvDoctrineRates?.decidedClvBeatDenominator ?? 0,
          clvPushRate: clvDoctrineRates?.clvPushRate ?? null,
          clvPushRateDenominator: clvDoctrineRates?.clvPushRateDenominator ?? 0,
          clearsBreakEven: clvPolicy.clearsBreakEven,
          canExposeClv: true as const,
          blockers: clvPolicy.blockers,
          operatorMessage: clvPolicy.operatorMessage,
        }
      : {
          gradedSampleSize: clvPolicy.gradedSampleSize,
          beatCloseCount: null,
          matchedCloseCount: null,
          lostToCloseCount: null,
          beatCloseRate: null,
          decidedClvBeatRate: null,
          decidedClvBeatDenominator: 0,
          clvPushRate: null,
          clvPushRateDenominator: 0,
          clearsBreakEven: null,
          canExposeClv: false as const,
          blockers: clvPolicy.blockers,
          operatorMessage: clvPolicy.operatorMessage,
        }
    : null;

  const pricingPhaseReadiness = evaluatePhaseAdvance({
    canonicalSettledPicks: sample?.canonicalSettled ?? 0,
    calibrationPublished,
    beatCloseRate: clvBeatCloseRate,
    beatCloseRateDecided: clvDoctrineRates?.decidedClvBeatRate ?? null,
  });

  const revenueLadder = evaluateRevenueLadder({
    canonicalSettled: sample?.canonicalSettled ?? 0,
    calibrationPublished,
    clvBeatCloseRate,
    clvBeatCloseRateDecided: clvDoctrineRates?.decidedClvBeatRate ?? null,
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
  const surface = provenSurface;
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
    durablePause,
  );
  const selectivePosture = selectiveRuntimePosture(
    process.env,
    surface?.plan ?? null,
    durablePause,
  );

  const payload: Record<string, unknown> = {
    ok: true,
    generatedAt: new Date().toISOString(),
    detail: detailed ? "operator" : "public",
    deployment: {
      sha: deploymentSha,
      note: "Redeploy after main merges (honesty/Jynx/free-lane). Settlement CRITICAL or SHA lag -> redeploy before matching code.",
      expectedMainFeatures: MAIN_FEATURE_MARKERS,
    },
    host: {
      stubMode,
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
      forceNoBetIfStale: getPlatformConfig().forceNoBetIfStale,
      minSettledPicksForLearning: gates.minSettledPicksForLearning,
      calibrationPublished,
    },
    waitlistStorage: resolveWaitlistStorageMode(),
    waitlist,
    settlement,
    sample,
    oddsInserting,
    calibrationEligibility: calibrationEligibility
      ? {
          status: calibrationEligibility.status,
          reasons: calibrationEligibility.reasons,
          n: calibrationEligibility.n,
          brier: calibrationEligibility.brier,
          ece: calibrationEligibility.ece,
          eceNoise: calibrationEligibility.eceNoise,
          eceDebiased: calibrationEligibility.eceDebiased,
          mce: calibrationEligibility.mce,
          murphy: calibrationEligibility.murphy,
          floors: calibrationEligibility.floors,
          consecutiveGreen: calibrationEligibility.consecutiveGreen,
          streakRequired: calibrationEligibility.streakRequired,
          deployedVersionChecked: calibrationEligibility.deployedVersionChecked ?? false,
          deployedVersion: calibrationEligibility.deployedVersion ?? null,
          modelVersion: calibrationEligibility.modelVersion,
          dateRange: calibrationEligibility.dateRange,
          generatedAt: calibrationEligibility.generatedAt,
          operatorHint: calibrationEligibility.operatorHint,
          pBasis: calibrationMetricsArtifact?.pBasis ?? null,
          exclusions: calibrationMetricsArtifact?.exclusions ?? null,
          pSources: calibrationMetricsArtifact?.pSources ?? null,
          marketPFromOddsTable: calibrationMetricsArtifact?.marketPFromOddsTable ?? null,
          bySport: calibrationMetricsArtifact?.bySport ?? null,
          byModelVersion: calibrationMetricsArtifact?.byModelVersion ?? null,
          byMarket: calibrationMetricsArtifact?.byMarket ?? null,
          brierCi95: calibrationMetricsArtifact?.brierCi95 ?? null,
          eceCi95: calibrationMetricsArtifact?.eceCi95 ?? null,
          deployedVersionMapHoldout:
            calibrationMetricsArtifact?.deployedVersionMapHoldout ?? null,
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
    calibrationDrift: calibrationDrift
      ? {
          since: calibrationDrift.since,
          previousStatus: calibrationDrift.previousStatus,
          currentStatus: calibrationDrift.currentStatus,
          failingFloors: calibrationDrift.failingFloors,
          reasons: calibrationDrift.reasons,
          publishedAt: calibrationDrift.publishedAt,
          observedAt: calibrationDrift.observedAt,
          operatorHint: calibrationDrift.operatorHint,
        }
      : null,
    content: {
      podcastEpisodes: listEpisodes().length,
      newsletterIssues: listIssues().length,
    },
    creditStack,
    billingMoney,
    ...(detailed ? { stripeWebhookHosts } : {}),
    autonomy,
    boardSurface: boardSurfacePosture(process.env, {
      oddsFresh: oddsInserting?.withinRefreshSla === true,
    }),
    productBoards: {
      surfaces: productBoards.surfaces,
      liveProductionIds: productBoards.liveProductionIds,
      darkByLawIds: productBoards.darkByLawIds,
      designPreviewOnly: productBoards.designPreviewOnly,
      operatorHint: productBoards.operatorHint,
    },
    boardVerticalSurfaces: {
      propsSlate: {
        route: "/api/ops/props-slate",
        enabled: process.env["PROPS_SLATE_ENABLED"] === "1",
        storageTarget: "signals",
        isPublishedPicksTarget: false,
        operatorHint:
          "props-slate writes player prop model_p_over to the signals table, not the picks table.",
      },
      copulaSgp: {
        surface: "sgp-copula",
        engineModule: "packages/prediction-engine/src/parlay/apmm-market-maker.ts",
        distribution: "bivariate-copula",
        storageTarget: "blog_posts | static",
        isPublishedPicksTarget: false,
        operatorHint:
          "copula SGPs are priced via APMM / Frank copula; published via content engine or static projections.",
      },
    },
    aciPosture: aciPublicPosture(),
    provenPath: surface?.plan ?? null,
    provenPathProjection: surface?.projection ?? null,
    provenPathExclusions: surface?.exclusions ?? null,
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
    rpcpConformalBridge: surface?.conformalBridgeEnv ?? {
      computeEnabled: false,
      productFlags: {
        conformalAbstainEnabled: false,
        calibrationAdjustmentsEnabled: false,
        autoPublish: false,
      },
      unlocksProven: false,
      raisesRes: false,
      operatorHint: "RPCP-conformal bridge default offline (not seeded).",
    },
    rankingPauseApply: pausePosture,
    selectiveRuntime: selectivePosture,
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
    mapBakeoff: summarizeMapBakeoff(mapBakeoffRaw),
    mapVsCanonical: {
      canonicalSettled: sample?.canonicalSettled ?? null,
      mapN: calibrationEligibility?.n ?? null,
      note:
        "canonicalSettled includes WIN|LOSS|PUSH; map n is learning-eligible WIN|LOSS only (eligibleForLearning). Gap is expected -- see docs/ops/SAMPLE_N_VS_MAP_N.md",
    },
    bayesianRd: {
      adjustmentsEnabled: false,
      hierarchicalEbTau: true,
      dirichletProcessInPath: false,
      note: "Bayesian/hierarchical MAP Platt is offline R&D only (EB tau clamped). Eligibility stays frequentist. DP clustering not in prod path.",
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
    schedulerLiveness,
    revenueLadder: {
      currentStep: revenueLadder.currentStep,
      nextStep: revenueLadder.nextStep,
      canHonestlyMonetizePublicTrackRecord: revenueLadder.canHonestlyMonetizePublicTrackRecord,
      operatorMessage: revenueLadder.operatorMessage,
      blockersToNext: revenueLadder.blockersToNext,
      milestones: revenueLadder.milestones,
    },
    clvPosture,
    pricingPhaseReadiness,
    stalePendingPicks: {
      count: stalePendingPicks,
      maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS,
      operatorHint:
        stalePendingPicks === null
          ? "unknown (stub DB or query failed)"
          : stalePendingPicks > 0
            ? `${stalePendingPicks} published PENDING pick(s) on unstarted games not refreshed in ${STALE_PENDING_PICK_MAX_AGE_DAYS}d. The settle-picks cron unpublishes them automatically at the end of its next cycle (zero-sit lane, WP-29) and records each action as a memory event; a count that persists across cycles means the lane is not running. Manual override only: npm run ops:stale-picks:unpublish.`
            : "none (the zero-sit lane unpublishes stale unstarted picks every settle cycle)",
    },
    marketCoverage,
    confidenceTail,
    rankingBasis,
    oddsLineArchiveFreshness,
    lineIntegrity,
    ...(detailed ? { mainFeatureMarkers: MAIN_FEATURE_MARKERS } : {}),
    ...(detailed
      ? {
          stripe: {
            handledEvents: HANDLED_STRIPE_WEBHOOK_EVENTS,
            handledEventCount: HANDLED_STRIPE_WEBHOOK_EVENTS.length,
            dashboardSubscribedEvents: "NOT_READABLE",
            termsConsentEnabled: process.env["STRIPE_TERMS_CONSENT_ENABLED"] === "true",
            termsUrlConfigured: "NOT_READABLE",
            foundingPaymentLinkActive: "NOT_READABLE",
            operatorHint:
              "handledEvents is the server-knowable half only. Confirm in the Stripe Dashboard: " +
              "(F-20) the endpoint subscribes to every event in handledEvents; " +
              "(F-18) the public Terms URL is set BEFORE STRIPE_TERMS_CONSENT_ENABLED is turned on; " +
              "(F-19) no Founding Payment Link is active or shared -- a Payment Link charges " +
              "without granting access, because it never emits checkout.session.completed.",
          },
        }
      : {}),
  };

  if (cachePolicy.enabled) {
    truthResponseCache.set(cacheBucket, {
      payload,
      expiresAt: Date.now() + PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS,
    });
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
