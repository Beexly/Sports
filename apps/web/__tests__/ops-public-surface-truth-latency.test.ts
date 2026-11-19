/**
 * Latency, per-read timeout, and bounded cache tests for /api/ops/public-surface-truth.
 *
 * Verifies:
 *  1. Independent DB/ops probes run concurrently (250ms simulated per-query latency
 *     finishes well below 800ms rather than a 2000ms+ serial waterfall).
 *  2. A slow/hanging read is bounded by the 3,500ms per-read timeout and returns
 *     a safe fail-closed fallback without hanging past 4,500ms.
 *  3. Bounded 45s in-process cache serves repeated requests without re-querying DB,
 *     ?fresh=1 bypasses the cache, and rate-limiting (429) executes BEFORE cache hit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

const latencyState = vi.hoisted(() => ({
  queryDelayMs: 0,
  hangQueries: new Set<string>(),
}));

function sleepOrHang(name: string, ms: number): Promise<void> {
  if (latencyState.hangQueries.has(name)) {
    return new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const dbMock = vi.hoisted(() => ({
  ingestionRun: {
    findFirst: vi.fn(async () => {
      await sleepOrHang("ingestionRun.findFirst", latencyState.queryDelayMs);
      return null;
    }),
  },
  jarvisMemoryEvent: {
    findFirst: vi.fn(async () => {
      await sleepOrHang("jarvisMemoryEvent.findFirst", latencyState.queryDelayMs);
      return null;
    }),
    findMany: vi.fn(async () => {
      await sleepOrHang("jarvisMemoryEvent.findMany", latencyState.queryDelayMs);
      return [];
    }),
  },
  oddsLineSnapshot: {
    findFirst: vi.fn(async () => {
      await sleepOrHang("oddsLineSnapshot.findFirst", latencyState.queryDelayMs);
      return null;
    }),
    count: vi.fn(async () => {
      await sleepOrHang("oddsLineSnapshot.count", latencyState.queryDelayMs);
      return 0;
    }),
  },
  pick: {
    count: vi.fn(async () => {
      await sleepOrHang("pick.count", latencyState.queryDelayMs);
      return 0;
    }),
  },
}));

const opsMocks = vi.hoisted(() => ({
  loadSettlementHealth: vi.fn(async () => {
    await sleepOrHang("loadSettlementHealth", latencyState.queryDelayMs);
    return {
      health: "HEALTHY",
      commencedTotal: 10,
      overduePending: 0,
      operatorMessage: "ok",
    };
  }),
  loadSettlementBreakdown: vi.fn(async () => {
    await sleepOrHang("loadSettlementBreakdown", latencyState.queryDelayMs);
    return { overdueBySport: [], operatorNext: [] };
  }),
  loadCanonicalSamplePosture: vi.fn(async () => {
    await sleepOrHang("loadCanonicalSamplePosture", latencyState.queryDelayMs);
    return {
      commencedTotal: 10,
      canonicalSettled: 10,
      canonicalWins: 6,
      canonicalLosses: 4,
      canonicalPushes: 0,
      canonicalPending: 0,
      bootstrapSettled: 0,
      minSettledForLearning: 100,
      remainingToFloor: 90,
      operatorHint: "ok",
    };
  }),
  loadCalibrationOpsSurface: vi.fn(async () => {
    await sleepOrHang("loadCalibrationOpsSurface", latencyState.queryDelayMs);
    return {
      metrics: null,
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
        generatedAt: "2026-11-18T00:00:00.000Z",
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
      receipt: null,
      drift: null,
    };
  }),
  loadStripeWebhookHostsPosture: vi.fn(async () => {
    await sleepOrHang("loadStripeWebhookHostsPosture", latencyState.queryDelayMs);
    return null;
  }),
  surveyLineIntegrity: vi.fn(async () => {
    await sleepOrHang("surveyLineIntegrity", latencyState.queryDelayMs);
    return { surveyed: true };
  }),
  loadProvenPathSurface: vi.fn(async () => {
    await sleepOrHang("loadProvenPathSurface", latencyState.queryDelayMs);
    return null;
  }),
  loadRankingPauseApply: vi.fn(async () => {
    await sleepOrHang("loadRankingPauseApply", latencyState.queryDelayMs);
    return null;
  }),
  loadMapBakeoff: vi.fn(async () => {
    await sleepOrHang("loadMapBakeoff", latencyState.queryDelayMs);
    return null;
  }),
  assessSchedulerLiveness: vi.fn(async () => {
    await sleepOrHang("assessSchedulerLiveness", latencyState.queryDelayMs);
    return null;
  }),
  resolveBestFreeSpineSnapshot: vi.fn(async () => {
    await sleepOrHang("resolveBestFreeSpineSnapshot", latencyState.queryDelayMs);
    return { snap: null, source: "none" as const };
  }),
  isMarketBoardOddsStale: vi.fn(async () => {
    await sleepOrHang("isMarketBoardOddsStale", latencyState.queryDelayMs);
    return true;
  }),
  isSignalBoardSlateStale: vi.fn(async () => {
    await sleepOrHang("isSignalBoardSlateStale", latencyState.queryDelayMs);
    return false;
  }),
  loadMarketCoverage: vi.fn(async () => {
    await sleepOrHang("loadMarketCoverage", latencyState.queryDelayMs);
    return null;
  }),
  loadConfidenceTail: vi.fn(async () => {
    await sleepOrHang("loadConfidenceTail", latencyState.queryDelayMs);
    return null;
  }),
  loadRankingBasisCensus: vi.fn(async () => {
    await sleepOrHang("loadRankingBasisCensus", latencyState.queryDelayMs);
    return null;
  }),
  maybeRunTrafficHeartbeat: vi.fn(async () => undefined),
}));

vi.mock("@sports/db", () => ({
  db: dbMock,
  isStubMode: vi.fn(() => false),
  isDemoPicksEnabled: vi.fn(() => false),
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: vi.fn(() => ({
      canExposePublicPicks: true,
      canExposePerformanceStats: true,
      canLearnFromOutcomes: true,
      minSettledPicksForLearning: 100,
    })),
    getPlatformConfig: () => ({ forceNoBetIfStale: false }),
  };
});

vi.mock("@sports/data-ingestion", async () => {
  const actual = await vi.importActual<typeof import("@sports/data-ingestion")>(
    "@sports/data-ingestion",
  );
  return {
    oddsApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: null })),
    rundownApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: null })),
    emptyOddsCreditTruth: actual.emptyOddsCreditTruth,
    loadOddsCreditTruth: actual.loadOddsCreditTruth,
  };
});

vi.mock("@/lib/launch/public-surface-gate", () => ({
  isContestsPublic: vi.fn(() => true),
  isStatsPublic: vi.fn(() => false),
  PUBLIC_NAV_POLICY: { statsDefault: "dark", contestsDefault: "public" },
}));
vi.mock("@/lib/gse/waitlist-store", () => ({ resolveWaitlistStorageMode: vi.fn(() => "mode") }));
vi.mock("@/lib/ops/stripe-webhook-hosts", () => ({
  loadStripeWebhookHostsPosture: opsMocks.loadStripeWebhookHostsPosture,
}));
vi.mock("@/lib/settlement/line-integrity-lane", () => ({
  surveyLineIntegrity: opsMocks.surveyLineIntegrity,
}));
vi.mock("@/lib/ops/credit-stack-posture", () => ({
  loadCreditStackPosture: vi.fn(() => ({
    freeLaneConfigured: false,
    claudeProvider: null,
    bedrockConfigured: false,
    azureFoundryConfigured: false,
    vertexConfigured: false,
    jynx: { auto: false },
  })),
}));
vi.mock("@/lib/ops/billing-money-posture", () => ({
  loadBillingMoneyPosture: vi.fn(() => ({
    stripeSecretConfigured: false,
    webhookSecretConfigured: false,
  })),
}));
vi.mock("@/lib/ops/autonomy-posture", () => ({ loadAutonomyPosture: vi.fn(() => ({})) }));
vi.mock("@/lib/ops/waitlist-posture", () => ({
  loadWaitlistPosture: vi.fn(() => ({ gateEnabled: false })),
}));
vi.mock("@/lib/ops/canonical-sample-posture", () => ({
  loadCanonicalSamplePosture: opsMocks.loadCanonicalSamplePosture,
}));
vi.mock("@/lib/ops/calibration-eligibility-durable", () => ({
  calibrationDriftPosture: vi.fn(() => null),
  loadCalibrationOpsSurface: opsMocks.loadCalibrationOpsSurface,
}));
vi.mock("@/lib/ops/proven-path-seed", () => ({
  loadProvenPathSurface: opsMocks.loadProvenPathSurface,
}));
vi.mock("@/lib/ops/ranking-pause-durable", () => ({
  loadRankingPauseApply: opsMocks.loadRankingPauseApply,
}));
vi.mock("@/lib/ops/founder-next-steps", () => ({
  buildFounderNextSteps: vi.fn(() => ({ next: [], message: "", steps: [] })),
}));
vi.mock("@/lib/autonomy/revenue-ladder", () => ({
  evaluateRevenueLadder: vi.fn(() => ({
    currentStep: "none",
    nextStep: null,
    canHonestlyMonetizePublicTrackRecord: false,
    operatorMessage: "",
    blockersToNext: [],
    milestones: [],
  })),
}));
vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: opsMocks.loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS: 72,
}));
vi.mock("@/lib/performance/settlement-breakdown", () => ({
  loadSettlementBreakdown: opsMocks.loadSettlementBreakdown,
}));
vi.mock("@/lib/podcast/episodes", () => ({ listEpisodes: vi.fn(() => []) }));
vi.mock("@/lib/newsletter/issues", () => ({ listIssues: vi.fn(() => []) }));
vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isSignalBoardSlateStale: opsMocks.isSignalBoardSlateStale,
  isMarketBoardOddsStale: opsMocks.isMarketBoardOddsStale,
}));
vi.mock("@/lib/board/board-surface-policy", () => ({
  boardSurfacePosture: vi.fn(() => ({ surface: "signal" })),
}));
vi.mock("@/lib/data-sources/free-spine-durable", () => ({
  FREE_SPINE_DURABLE_SLA_MS: 3_600_000,
  freeSpineSnapAgeMs: vi.fn(() => null),
  freeSpineWithinSla: vi.fn(() => true),
  resolveBestFreeSpineSnapshot: opsMocks.resolveBestFreeSpineSnapshot,
}));
vi.mock("@/lib/ops/free-spine-odds-path", () => ({
  summarizeFreeSpineOddsPath: vi.fn(() => null),
}));
vi.mock("@/lib/calibration/aci-durable", () => ({
  aciPublicPosture: vi.fn(() => ({ present: false, aci: null })),
}));
vi.mock("@/lib/calibration/murphy-res-definition", () => ({
  buildMurphyResSnapshot: vi.fn(() => null),
}));
vi.mock("@/lib/calibration/conformal-calibration", () => ({
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
}));
vi.mock("@/lib/calibration/isotonic-alternatives", () => ({ ISOTONIC_ALTERNATIVES: [] }));
vi.mock("@/lib/calibration/ranking-pause-apply", () => ({
  rankingPauseApplyPosture: vi.fn(() => ({ present: false })),
}));
vi.mock("@/lib/calibration/selective-publish-runtime", () => ({
  selectiveRuntimePosture: vi.fn(() => ({ present: false })),
}));
vi.mock("@/lib/ops/map-bakeoff-durable", () => ({
  loadMapBakeoff: opsMocks.loadMapBakeoff,
  summarizeMapBakeoff: vi.fn(() => null),
}));
vi.mock("@/lib/product/board-surfaces", () => ({
  productBoardSurfaces: vi.fn(() => ({
    surfaces: [],
    liveProductionIds: [],
    darkByLawIds: [],
    designPreviewOnly: false,
    operatorHint: "",
  })),
}));
vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: opsMocks.assessSchedulerLiveness,
}));
vi.mock("@/lib/ops/traffic-heartbeat", () => ({
  maybeRunTrafficHeartbeat: opsMocks.maybeRunTrafficHeartbeat,
}));
vi.mock("@/lib/board/market-coverage", () => ({
  loadMarketCoverage: opsMocks.loadMarketCoverage,
}));
vi.mock("@/lib/calibration/confidence-tail", () => ({
  loadConfidenceTail: opsMocks.loadConfidenceTail,
}));
vi.mock("@/lib/calibration/ranking-basis-census", () => ({
  loadRankingBasisCensus: opsMocks.loadRankingBasisCensus,
}));

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": "198.51.100.42", ...headers },
  });
}

describe("/api/ops/public-surface-truth latency, timeout, and 45s cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    latencyState.queryDelayMs = 0;
    latencyState.hangQueries.clear();
  });

  afterEach(async () => {
    const mod = (await import("@/app/api/ops/public-surface-truth/route")) as Record<
      string,
      unknown
    >;
    if (typeof mod.__resetPublicSurfaceTruthCacheForTests === "function") {
      (mod.__resetPublicSurfaceTruthCacheForTests as () => void)();
    }
    delete process.env.CRON_SECRET;
    vi.unstubAllEnvs();
  });

  it("executes independent DB and ops probes concurrently (< 800ms at 250ms per-query latency)", async () => {
    latencyState.queryDelayMs = 250;
    process.env.CRON_SECRET = "latency-secret";
    const mod = await import("@/app/api/ops/public-surface-truth/route");

    const req = makeRequest("http://localhost/api/ops/public-surface-truth", {
      authorization: "Bearer latency-secret",
    });

    const t0 = Date.now();
    const res = await mod.GET(req);
    const elapsedMs = Date.now() - t0;
    const body = (await res.json()) as { ok: boolean; detail: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.detail).toBe("operator");
    expect(elapsedMs).toBeLessThan(800);
  });

  it("bounds slow or hanging reads with a 3500ms timeout and returns fail-closed fallbacks", async () => {
    latencyState.hangQueries.add("loadSettlementHealth");
    latencyState.hangQueries.add("oddsLineSnapshot.findFirst");
    latencyState.hangQueries.add("loadMapBakeoff");
    const mod = await import("@/app/api/ops/public-surface-truth/route");

    const t0 = Date.now();
    const res = await mod.GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    const elapsedMs = Date.now() - t0;
    const body = (await res.json()) as {
      ok: boolean;
      settlement: unknown;
      oddsLineArchiveFreshness: { verdict: string };
      mapBakeoff: unknown;
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(4500);
    expect(body.settlement).toBeNull();
    expect(body.oddsLineArchiveFreshness.verdict).toBe("stale");
    expect(body.mapBakeoff).toBeNull();
  }, 10_000);

  it("serves bounded 45s cache without re-querying DB, honors ?fresh=1, and enforces 429 before cache", async () => {
    const mod = (await import("@/app/api/ops/public-surface-truth/route")) as typeof import("@/app/api/ops/public-surface-truth/route") & {
      __resetPublicSurfaceTruthCacheForTests?: () => void;
      __setPublicSurfaceTruthCacheEnabledForTests?: (enabled: boolean | null) => void;
      PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS?: number;
    };

    expect(typeof mod.__resetPublicSurfaceTruthCacheForTests).toBe("function");
    expect(typeof mod.__setPublicSurfaceTruthCacheEnabledForTests).toBe("function");
    expect(mod.PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS).toBe(45_000);

    mod.__resetPublicSurfaceTruthCacheForTests!();
    mod.__setPublicSurfaceTruthCacheEnabledForTests!(true);

    const req = makeRequest("http://localhost/api/ops/public-surface-truth");
    const first = await mod.GET(req);
    const firstBody = (await first.json()) as { generatedAt: string };
    expect(first.status).toBe(200);
    expect(opsMocks.loadSettlementHealth).toHaveBeenCalledTimes(1);

    const second = await mod.GET(req);
    const secondBody = (await second.json()) as { generatedAt: string };
    expect(second.status).toBe(200);
    expect(secondBody.generatedAt).toBe(firstBody.generatedAt);
    expect(opsMocks.loadSettlementHealth).toHaveBeenCalledTimes(1);

    const freshRes = await mod.GET(
      makeRequest("http://localhost/api/ops/public-surface-truth?fresh=1"),
    );
    expect(freshRes.status).toBe(200);
    expect(opsMocks.loadSettlementHealth).toHaveBeenCalledTimes(2);

    // 3 requests consumed so far; 57 more allowed before 429 on #61 (rate limit runs BEFORE cache).
    for (let i = 0; i < 57; i += 1) {
      const okRes = await mod.GET(req);
      expect(okRes.status).toBe(200);
    }
    const blocked = await mod.GET(req);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });
});
