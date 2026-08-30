/**
 * P13-03 — Rate-limit and cache the public ops surface.
 *
 * Verifies:
 *  - Anonymous (non-authenticated) requests to /api/ops/public-surface-truth are
 *    rate-limited: 60 per minute per IP, then 429 with Retry-After.
 *  - The live Stripe webhook list call (loadStripeWebhookHostsPosture) is NOT
 *    invoked on the anonymous (public) branch — it is gated behind hasOpsAuth.
 *  - Authenticated (operator) requests are NOT rate-limited and DO invoke the
 *    Stripe webhook probe.
 *  - stripeWebhookHosts is excluded from the public response body and included
 *    in the operator response body.
 *
 * The route's heavy DB loaders and sub-loaders are mocked so the tests exercise
 * only the rate-limit gate + the Stripe-call gating, not real data loading.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const dbMock = vi.hoisted(() => ({
  ingestionRun: { findFirst: vi.fn() },
}));

const predictionEngineMocks = vi.hoisted(() => ({
  getReadinessGates: vi.fn(() => ({
    canExposePublicPicks: true,
    canExposePerformanceStats: true,
    canLearnFromOutcomes: true,
    minSettledPicksForLearning: 100,
  })),
}));

const stripeWebhookHostsMocks = vi.hoisted(() => ({
  loadStripeWebhookHostsPosture: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  loadSettlementHealth: vi.fn(),
  loadSettlementBreakdown: vi.fn(),
  loadCreditStackPosture: vi.fn(() => ({
    freeLaneConfigured: false,
    claudeProvider: null,
    bedrockConfigured: false,
    azureFoundryConfigured: false,
    vertexConfigured: false,
    jynx: { auto: false },
  })),
  loadBillingMoneyPosture: vi.fn(() => ({
    stripeSecretConfigured: false,
    webhookSecretConfigured: false,
  })),
  loadAutonomyPosture: vi.fn(() => ({})),
  loadWaitlistPosture: vi.fn(() => ({ gateEnabled: false })),
  loadCanonicalSamplePosture: vi.fn(),
  loadCalibrationOpsSurface: vi.fn(),
  loadProvenPathSurface: vi.fn(),
  loadRankingPauseApply: vi.fn(),
  buildFounderNextSteps: vi.fn(),
  evaluateRevenueLadder: vi.fn(),
  assessSchedulerLiveness: vi.fn(() => Promise.resolve(null)),
  maybeRunTrafficHeartbeat: vi.fn(() => Promise.resolve()),
  loadMapBakeoff: vi.fn(() => Promise.resolve(null)),
}));

const dataMocks = vi.hoisted(() => ({
  resolveContestStorageMode: vi.fn(() => "mode"),
  resolveWaitlistStorageMode: vi.fn(() => "mode"),
  isStubMode: vi.fn(() => false),
  isDemoPicksEnabled: vi.fn(() => false),
  listEpisodes: vi.fn(() => []),
  listIssues: vi.fn(() => []),
  freeSpineSnapAgeMs: vi.fn(),
  freeSpineWithinSla: vi.fn(() => true),
  resolveBestFreeSpineSnapshot: vi.fn(() => ({ snap: null, source: "none" })),
  summarizeFreeSpineOddsPath: vi.fn(() => null),
  isSignalBoardSlateStale: vi.fn(() => Promise.resolve(false)),
  isMarketBoardOddsStale: vi.fn(() => Promise.resolve(true)),
  boardSurfacePosture: vi.fn(() => ({ surface: "signal" })),
  aciPublicPosture: vi.fn(() => ({ present: false, aci: null })),
  productBoardSurfaces: vi.fn(() => ({
    surfaces: [],
    liveProductionIds: [],
    darkByLawIds: [],
    designPreviewOnly: false,
    operatorHint: "",
  })),
  buildMurphyResSnapshot: vi.fn(() => null),
  conformalRdPosture: vi.fn(() => ({
    computeEnabled: false,
    productFlags: {
      conformalAbstainEnabled: false,
      calibrationAdjustmentsEnabled: false,
      autoPublish: false,
    },
    raisesRes: false,
    operatorHint: "offline",
  })),
  rankingPauseApplyPosture: vi.fn(() => ({ present: false })),
  selectiveRuntimePosture: vi.fn(() => ({ present: false })),
  summarizeMapBakeoff: vi.fn(() => null),
}));

const ingestionMocks = vi.hoisted(() => ({
  oddsApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: null })),
  rundownApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: null })),
}));

const launchMocks = vi.hoisted(() => ({
  isContestsPublic: vi.fn(() => true),
  isStatsPublic: vi.fn(() => false),
  PUBLIC_NAV_POLICY: { statsDefault: "dark", contestsDefault: "public" },
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("@sports/db", () => ({
  db: dbMock,
  isStubMode: dataMocks.isStubMode,
  isDemoPicksEnabled: dataMocks.isDemoPicksEnabled,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: predictionEngineMocks.getReadinessGates,
}));

vi.mock("@sports/data-ingestion", () => ({
  oddsApiKeyPresence: ingestionMocks.oddsApiKeyPresence,
  rundownApiKeyPresence: ingestionMocks.rundownApiKeyPresence,
}));

vi.mock("@/lib/launch/public-surface-gate", () => ({
  isContestsPublic: launchMocks.isContestsPublic,
  isStatsPublic: launchMocks.isStatsPublic,
  PUBLIC_NAV_POLICY: launchMocks.PUBLIC_NAV_POLICY,
}));

vi.mock("@/lib/contests/store", () => ({
  resolveContestStorageMode: dataMocks.resolveContestStorageMode,
}));

vi.mock("@/lib/gse/waitlist-store", () => ({
  resolveWaitlistStorageMode: dataMocks.resolveWaitlistStorageMode,
}));

vi.mock("@/lib/ops/stripe-webhook-hosts", () => ({
  loadStripeWebhookHostsPosture: stripeWebhookHostsMocks.loadStripeWebhookHostsPosture,
}));

vi.mock("@/lib/ops/credit-stack-posture", () => ({
  loadCreditStackPosture: opsMocks.loadCreditStackPosture,
}));

vi.mock("@/lib/ops/billing-money-posture", () => ({
  loadBillingMoneyPosture: opsMocks.loadBillingMoneyPosture,
}));

vi.mock("@/lib/ops/autonomy-posture", () => ({
  loadAutonomyPosture: opsMocks.loadAutonomyPosture,
}));

vi.mock("@/lib/ops/waitlist-posture", () => ({
  loadWaitlistPosture: opsMocks.loadWaitlistPosture,
}));

vi.mock("@/lib/ops/canonical-sample-posture", () => ({
  loadCanonicalSamplePosture: opsMocks.loadCanonicalSamplePosture,
}));

vi.mock("@/lib/ops/calibration-eligibility-durable", () => ({
  loadCalibrationOpsSurface: opsMocks.loadCalibrationOpsSurface,
}));

vi.mock("@/lib/ops/proven-path-seed", () => ({
  loadProvenPathSurface: opsMocks.loadProvenPathSurface,
}));

vi.mock("@/lib/ops/ranking-pause-durable", () => ({
  loadRankingPauseApply: opsMocks.loadRankingPauseApply,
}));

vi.mock("@/lib/ops/founder-next-steps", () => ({
  buildFounderNextSteps: opsMocks.buildFounderNextSteps,
}));

vi.mock("@/lib/autonomy/revenue-ladder", () => ({
  evaluateRevenueLadder: opsMocks.evaluateRevenueLadder,
}));

vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: opsMocks.loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS: 72,
}));

vi.mock("@/lib/performance/settlement-breakdown", () => ({
  loadSettlementBreakdown: opsMocks.loadSettlementBreakdown,
}));

vi.mock("@/lib/podcast/episodes", () => ({
  listEpisodes: dataMocks.listEpisodes,
}));

vi.mock("@/lib/newsletter/issues", () => ({
  listIssues: dataMocks.listIssues,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isSignalBoardSlateStale: dataMocks.isSignalBoardSlateStale,
  isMarketBoardOddsStale: dataMocks.isMarketBoardOddsStale,
}));

vi.mock("@/lib/board/board-surface-policy", () => ({
  boardSurfacePosture: dataMocks.boardSurfacePosture,
}));

vi.mock("@/lib/data-sources/free-spine-durable", () => ({
  FREE_SPINE_DURABLE_SLA_MS: 3_600_000,
  freeSpineSnapAgeMs: dataMocks.freeSpineSnapAgeMs,
  freeSpineWithinSla: dataMocks.freeSpineWithinSla,
  resolveBestFreeSpineSnapshot: dataMocks.resolveBestFreeSpineSnapshot,
}));

vi.mock("@/lib/ops/free-spine-odds-path", () => ({
  summarizeFreeSpineOddsPath: dataMocks.summarizeFreeSpineOddsPath,
}));

vi.mock("@/lib/calibration/aci-durable", () => ({
  aciPublicPosture: dataMocks.aciPublicPosture,
}));

vi.mock("@/lib/calibration/murphy-res-definition", () => ({
  buildMurphyResSnapshot: dataMocks.buildMurphyResSnapshot,
}));

vi.mock("@/lib/calibration/conformal-calibration", () => ({
  conformalRdPosture: dataMocks.conformalRdPosture,
}));

vi.mock("@/lib/calibration/isotonic-alternatives", () => ({
  ISOTONIC_ALTERNATIVES: [],
}));

vi.mock("@/lib/calibration/ranking-pause-apply", () => ({
  rankingPauseApplyPosture: dataMocks.rankingPauseApplyPosture,
}));

vi.mock("@/lib/calibration/selective-publish-runtime", () => ({
  selectiveRuntimePosture: dataMocks.selectiveRuntimePosture,
}));

vi.mock("@/lib/ops/map-bakeoff-durable", () => ({
  loadMapBakeoff: opsMocks.loadMapBakeoff,
  summarizeMapBakeoff: dataMocks.summarizeMapBakeoff,
}));

vi.mock("@/lib/product/board-surfaces", () => ({
  productBoardSurfaces: dataMocks.productBoardSurfaces,
}));

vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: opsMocks.assessSchedulerLiveness,
}));

vi.mock("@/lib/ops/traffic-heartbeat", () => ({
  maybeRunTrafficHeartbeat: opsMocks.maybeRunTrafficHeartbeat,
}));

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": "203.0.113.1", ...headers },
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("/api/ops/public-surface-truth — P13-03 rate limiting + Stripe gating", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    // DB lookups (only hit when isStubMode() is false)
    dbMock.ingestionRun.findFirst.mockResolvedValue(null);
    // Settlement health returns a shape the route destructures
    opsMocks.loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY",
      commencedTotal: 0,
      overduePending: 0,
      operatorMessage: "",
    });
    // Canonical sample posture
    opsMocks.loadCanonicalSamplePosture.mockResolvedValue({
      canonicalSettled: 0,
      minSettledForLearning: 100,
      remainingToFloor: null,
    });
    // Calibration ops surface
    opsMocks.loadCalibrationOpsSurface.mockResolvedValue({
      eligibility: {
        status: "GREEN",
        reasons: [],
        n: 0,
        brier: null,
        ece: null,
        mce: null,
        murphy: null,
        floors: null,
        consecutiveGreen: null,
        streakRequired: null,
        modelVersion: null,
        dateRange: null,
        operatorHint: "",
      },
      publish: {
        published: false,
        publishedEffective: false,
        source: "none",
        autoPublish: false,
        autoUnpublish: false,
        canExposePerformanceStats: false,
        operatorHint: "",
      },
    });
    opsMocks.loadProvenPathSurface.mockResolvedValue(null);
    opsMocks.loadRankingPauseApply.mockResolvedValue(null);
    opsMocks.buildFounderNextSteps.mockReturnValue({
      next: [],
      message: "",
      steps: [],
    });
    opsMocks.evaluateRevenueLadder.mockReturnValue({
      currentStep: "none",
      nextStep: null,
      canHonestlyMonetizePublicTrackRecord: false,
      operatorMessage: "",
      blockersToNext: [],
      milestones: [],
    });
    // Scheduler liveness
    opsMocks.assessSchedulerLiveness.mockResolvedValue(null);
    // Stripe posture returns null by default (no key configured)
    stripeWebhookHostsMocks.loadStripeWebhookHostsPosture.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import(
      "@/app/api/ops/public-surface-truth/route"
    );
    const req = makeRequest("http://localhost/api/ops/public-surface-truth");
    const res = await mod.GET(req);
    expect(res.status).toBe(200);
  });

  it("returns 429 with Retry-After when an anonymous IP exceeds 60 req/min", async () => {
    const mod = await import(
      "@/app/api/ops/public-surface-truth/route"
    );
    const req = makeRequest("http://localhost/api/ops/public-surface-truth");

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET(req);
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(req);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });

  it("does NOT call loadStripeWebhookHostsPosture for anonymous (non-authenticated) requests", async () => {
    const mod = await import(
      "@/app/api/ops/public-surface-truth/route"
    );
    const req = makeRequest("http://localhost/api/ops/public-surface-truth");

    // No CRON_SECRET set → hasOpsAuth returns false → detailed = false.
    delete process.env.CRON_SECRET;
    await mod.GET(req);

    expect(
      stripeWebhookHostsMocks.loadStripeWebhookHostsPosture
    ).not.toHaveBeenCalled();
  });

  it("excludes stripeWebhookHosts from the public response body", async () => {
    const mod = await import(
      "@/app/api/ops/public-surface-truth/route"
    );
    const req = makeRequest("http://localhost/api/ops/public-surface-truth");

    delete process.env.CRON_SECRET;
    const res = await mod.GET(req);
    const body = await res.json();

    expect(body.detail).toBe("public");
    expect(body).not.toHaveProperty("stripeWebhookHosts");
  });

  it("operator (authenticated) requests are NOT rate-limited and DO call loadStripeWebhookHostsPosture", async () => {
    const mod = await import(
      "@/app/api/ops/public-surface-truth/route"
    );

    // Set CRON_SECRET so hasOpsAuth returns true for the bearer auth header.
    process.env.CRON_SECRET = "test-secret-123";
    const req = makeRequest(
      "http://localhost/api/ops/public-surface-truth",
      { authorization: "Bearer test-secret-123" }
    );

    // Make 61 requests — all should succeed (no rate limit on operator path).
    for (let i = 0; i < 61; i++) {
      const res = await mod.GET(req);
      expect(res.status).toBe(200);
    }

    // Stripe probe should have been called on every authenticated request.
    expect(
      stripeWebhookHostsMocks.loadStripeWebhookHostsPosture
    ).toHaveBeenCalledTimes(61);

    // stripeWebhookHosts should be present in the detailed response.
    const body = await mod.GET(req).then((r) => r.json());
    expect(body.detail).toBe("operator");
    expect(body).toHaveProperty("stripeWebhookHosts");
    expect(body).toHaveProperty("mainFeatureMarkers");
  });
});
