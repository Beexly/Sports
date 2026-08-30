/**
 * P15-0A — Tests for the daily-truth ops route.
 *
 * VERIFY protocol: each test uses mocked loaders + a fake db, so no real
 * database or env-var setup is needed. Auth is a timing-safe Bearer
 * CRON_SECRET check; we test 401 without it and 200 with it.
 *
 * The route never writes to any table (read-only guardrail in code).
 *
 * Pattern mirrors ops-public-surface-truth-rate-limit.test.ts:
 *   - vi.hoisted() for mock objects
 *   - vi.mock() for module substitution
 *   - dynamic import() of the route module (so @/ resolution works)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

type MockPick = {
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const dbMock = vi.hoisted(() => ({
  pick: {
    count: vi.fn(),
    // Write methods — should never be called (route is read-only). Declared so
    // the "never writes" test can assert they weren't invoked.
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as MockPick,
}));

const predictionEngineMocks = vi.hoisted(() => ({
  getReadinessGates: vi.fn(() => ({
    canExposePerformanceStats: true,
    canExposePublicPicks: true,
    canLearnFromOutcomes: true,
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canPromoteFeaturedPicks: true,
    canPublishContent: true,
    isBootstrapMode: false,
    confidenceDisplayMode: "percentile" as const,
    minDataQualityForGameLog: 0.7,
    canApplyCalibrationAdjustments: false,
    minSettledPicksForLearning: 30,
    forceNoBetIfStale: false,
    config: {},
  })),
}));

const settlementHealthMocks = vi.hoisted(() => ({
  loadSettlementHealth: vi.fn(),
  SETTLEMENT_DEFAULT_GRACE_HOURS: 6,
}));

const clvCoverageMocks = vi.hoisted(() => ({
  loadClvCoverage: vi.fn(),
}));

const calibrationMocks = vi.hoisted(() => ({
  loadCalibrationOpsSurface: vi.fn(),
}));

const schedulerMocks = vi.hoisted(() => ({
  assessSchedulerLiveness: vi.fn(),
}));

const canonicalSampleMocks = vi.hoisted(() => ({
  loadCanonicalSamplePosture: vi.fn(),
}));

const dataMocks = vi.hoisted(() => ({
  isStubMode: vi.fn(() => false),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("@sports/db", () => ({
  db: dbMock,
  isStubMode: dataMocks.isStubMode,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: predictionEngineMocks.getReadinessGates,
}));

vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: settlementHealthMocks.loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS: 6,
}));

vi.mock("@/lib/performance/clv-coverage", () => ({
  loadClvCoverage: clvCoverageMocks.loadClvCoverage,
}));

vi.mock("@/lib/ops/calibration-eligibility-durable", () => ({
  loadCalibrationOpsSurface: calibrationMocks.loadCalibrationOpsSurface,
}));

vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: schedulerMocks.assessSchedulerLiveness,
}));

vi.mock("@/lib/ops/canonical-sample-posture", () => ({
  loadCanonicalSamplePosture: canonicalSampleMocks.loadCanonicalSamplePosture,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const REAL_SECRET = "test-cron-secret-value";

function makeRequest(authHeader?: string) {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/ops/daily-truth", { headers });
}

async function invokeGet(authHeader?: string) {
  const mod = await import("@/app/api/ops/daily-truth/route");
  const res = await mod.GET(makeRequest(authHeader));
  const body = await res.json();
  return { res, body };
}

// ─── Default mock returns ───────────────────────────────────────────────────

function defaultSettlementHealth() {
  return settlementHealthMocks.loadSettlementHealth.mockResolvedValue({
    health: "NO_DATA",
    commencedTotal: 0,
    overduePending: 0,
    graceHours: 6,
    clean: false,
    operatorMessage: "No commenced.",
    remediation: [],
  });
}

function defaultClvCoverage() {
  return clvCoverageMocks.loadClvCoverage.mockResolvedValue({
    settledEligible: 0,
    graded: 0,
    uncovered: 0,
    coverageRatePct: null,
    health: "NO_DATA",
    invariantHolds: false,
    latestGradedAt: null,
    operatorMessage: "",
    remediation: [],
  });
}

function defaultCanonicalSample() {
  return canonicalSampleMocks.loadCanonicalSamplePosture.mockResolvedValue({
    commencedTotal: 0,
    canonicalSettled: 0,
    canonicalWins: 0,
    canonicalLosses: 0,
    canonicalPushes: 0,
    canonicalPending: 0,
    bootstrapSettled: 0,
    minSettledForLearning: 30,
    remainingToFloor: 30,
    operatorHint: "empty",
  });
}

function defaultCalibration() {
  return calibrationMocks.loadCalibrationOpsSurface.mockResolvedValue({
    metrics: null,
    eligibility: { status: "LEARNING", consecutiveGreen: 0, streakRequired: 5, runMeetsFloors: false },
    publish: { published: false, source: "AUTO_PUBLISH", autoPublish: false },
    receipt: null,
  });
}

function defaultScheduler() {
  return schedulerMocks.assessSchedulerLiveness.mockResolvedValue({
    status: "unknown",
    lastAnyIngestionSuccessAt: null,
    ageMinutes: null,
    tightestExpectedGapMinutes: 15,
    degradedThresholdMinutes: 60,
    deadThresholdMinutes: 180,
    operatorHint: "No rows.",
  });
}

function resetMocks() {
  dbMock.pick.count.mockReset();
  (dbMock.pick.create as ReturnType<typeof vi.fn>).mockReset();
  (dbMock.pick.update as ReturnType<typeof vi.fn>).mockReset();
  (dbMock.pick.delete as ReturnType<typeof vi.fn>).mockReset();
  settlementHealthMocks.loadSettlementHealth.mockReset();
  clvCoverageMocks.loadClvCoverage.mockReset();
  calibrationMocks.loadCalibrationOpsSurface.mockReset();
  schedulerMocks.assessSchedulerLiveness.mockReset();
  canonicalSampleMocks.loadCanonicalSamplePosture.mockReset();
  dataMocks.isStubMode.mockReset();
  predictionEngineMocks.getReadinessGates.mockReset();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("daily-truth route auth", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true,
      canExposePublicPicks: true,
      canLearnFromOutcomes: true,
      canPersistCanonicalHistory: true,
      canUseDerivedHistory: true,
      canPromoteFeaturedPicks: true,
      canPublishContent: true,
      isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const,
      minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false,
      minSettledPicksForLearning: 30,
      forceNoBetIfStale: false,
      config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no Authorization header", async () => {
    const { res, body } = await invokeGet(undefined);
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when Bearer token is wrong", async () => {
    const { res } = await invokeGet("Bearer wrong-secret");
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is empty", async () => {
    vi.stubEnv("CRON_SECRET", "  ");
    const { res } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok:true when Bearer token matches (all loaders mocked)", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    const { res, body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.detail).toBe("operator");
    expect(body.window.label).toBe("last-24h");
  });
});

describe("daily-truth route shape", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns all expected top-level keys", async () => {
    dbMock.pick.count.mockResolvedValue(5);
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    // Override settlement to HEALTHY with data
    settlementHealthMocks.loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY", commencedTotal: 100, overduePending: 0, graceHours: 6,
      clean: true, operatorMessage: "ok", remediation: [],
    });
    canonicalSampleMocks.loadCanonicalSamplePosture.mockResolvedValue({
      commencedTotal: 100, canonicalSettled: 80, canonicalWins: 45, canonicalLosses: 30,
      canonicalPushes: 5, canonicalPending: 20, bootstrapSettled: 5,
      minSettledForLearning: 30, remainingToFloor: 0, operatorHint: "ok",
    });
    calibrationMocks.loadCalibrationOpsSurface.mockResolvedValue({
      metrics: { generatedAt: "2026-08-17T09:00:00.000Z", n: 80, status: "ok", modelVersion: "v6", dateRange: "2026-08-01…2026-08-17", gitSha: null, overall: { brier: 0.25, ece: 0.03, mce: 0.05, murphy: { reliability: 0.1, resolution: 0.3, uncertainty: 0.5 } }, notes: [] },
      eligibility: { status: "PROVEN", consecutiveGreen: 3, streakRequired: 3, runMeetsFloors: true },
      publish: { published: true, source: "PUBLISHED", autoPublish: false },
      receipt: { published: true, publishedAt: "2026-08-17T09:00:00.000Z", gitSha: "abc123", source: "MANUAL", detail: null },
    });
    schedulerMocks.assessSchedulerLiveness.mockResolvedValue({
      status: "healthy", lastAnyIngestionSuccessAt: "2026-08-17T10:00:00.000Z", ageMinutes: 5,
      tightestExpectedGapMinutes: 15, degradedThresholdMinutes: 60, deadThresholdMinutes: 180, operatorHint: "OK",
    });

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(body.ok).toBe(true);

    const topKeys = Object.keys(body);
    for (const key of ["ok", "detail", "generatedAt", "window", "deployment", "published", "winRate", "settled", "clv", "settlement", "calibration", "scheduler", "canonicalSample"]) {
      expect(topKeys).toContain(key);
    }
  });
});

describe("daily-truth route reuses loaders (not duplicating logic)", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("calls each loader exactly once", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    await invokeGet(`Bearer ${REAL_SECRET}`);

    expect(settlementHealthMocks.loadSettlementHealth).toHaveBeenCalledTimes(1);
    expect(clvCoverageMocks.loadClvCoverage).toHaveBeenCalledTimes(1);
    expect(canonicalSampleMocks.loadCanonicalSamplePosture).toHaveBeenCalledTimes(1);
    expect(calibrationMocks.loadCalibrationOpsSurface).toHaveBeenCalledTimes(1);
    expect(schedulerMocks.assessSchedulerLiveness).toHaveBeenCalledTimes(1);
  });

  it("passes canonical filter (isBootstrap:false, isPublished:true, NOT seed) to all pick.count calls", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    await invokeGet(`Bearer ${REAL_SECRET}`);

    const calls = dbMock.pick.count.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      const w = call[0]?.where;
      expect(w).toEqual(
        expect.objectContaining({
          isPublished: true,
          isBootstrap: false,
        }),
      );
      expect(w).toHaveProperty("NOT");
      expect(w.NOT).toEqual(
        expect.objectContaining({
          modelVersion: expect.objectContaining({ contains: "seed" }),
        }),
      );
    }
  });
});

describe("daily-truth route win rate computation", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("computes win rate = wins/(wins+losses) to 1 decimal", async () => {
    const countMock = dbMock.pick.count;
    countMock.mockImplementation((args: { where: Record<string, unknown> }) => {
      const w = args.where;
      if (w.result === "WIN") return Promise.resolve(12);
      if (w.result === "LOSS") return Promise.resolve(8);
      if (w.result === "PUSH") return Promise.resolve(2);
      if (w.settledAt) return Promise.resolve(22);
      if (w.generatedAt) return Promise.resolve(30);
      return Promise.resolve(0);
    });

    settlementHealthMocks.loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY", commencedTotal: 100, overduePending: 0, graceHours: 6,
      clean: true, operatorMessage: "ok", remediation: [],
    });
    clvCoverageMocks.loadClvCoverage.mockResolvedValue({
      settledEligible: 50, graded: 48, uncovered: 2, coverageRatePct: 96,
      health: "DEGRADED", invariantHolds: false, latestGradedAt: "2026-08-17T09:00:00.000Z",
      operatorMessage: "", remediation: [],
    });
    canonicalSampleMocks.loadCanonicalSamplePosture.mockResolvedValue({
      commencedTotal: 100, canonicalSettled: 80, canonicalWins: 45, canonicalLosses: 30,
      canonicalPushes: 5, canonicalPending: 20, bootstrapSettled: 5,
      minSettledForLearning: 30, remainingToFloor: 0, operatorHint: "ok",
    });
    calibrationMocks.loadCalibrationOpsSurface.mockResolvedValue({
      metrics: { generatedAt: "2026-08-17T09:00:00.000Z", n: 80, status: "ok", modelVersion: "v6", dateRange: "x", gitSha: null, overall: { brier: 0.25, ece: 0.03, mce: 0.05, murphy: { reliability: 0.1, resolution: 0.3, uncertainty: 0.5 } }, notes: [] },
      eligibility: { status: "PROVEN", consecutiveGreen: 3, streakRequired: 3, runMeetsFloors: true },
      publish: { published: true, source: "PUBLISHED", autoPublish: false },
      receipt: { published: true, publishedAt: "2026-08-17T09:00:00.000Z", gitSha: "abc", source: "MANUAL", detail: null },
    });
    schedulerMocks.assessSchedulerLiveness.mockResolvedValue({
      status: "healthy", lastAnyIngestionSuccessAt: "2026-08-17T10:00:00.000Z", ageMinutes: 5,
      tightestExpectedGapMinutes: 15, degradedThresholdMinutes: 60, deadThresholdMinutes: 180, operatorHint: "ok",
    });

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    // 12 wins / (12+8) = 60.0%
    expect(body.winRate.rate).toBe(60);
    expect(body.winRate.wins).toBe(12);
    expect(body.winRate.losses).toBe(8);
    expect(body.winRate.pushes).toBe(2);
    expect(body.winRate.eligibleForRate).toBe(20);
    expect(body.winRate.reason).toBeNull();
  });

  it("returns null winRate with a reason when no WIN/LOSS picks settled", async () => {
    const countMock = dbMock.pick.count;
    countMock.mockImplementation((args: { where: Record<string, unknown> }) => {
      const w = args.where;
      if (typeof w.result === "object" && w.result !== null) return Promise.resolve(0);
      if (w.settledAt) return Promise.resolve(0);
      if (w.generatedAt) return Promise.resolve(0);
      return Promise.resolve(0);
    });

    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(body.winRate.rate).toBeNull();
    expect(body.winRate.wins).toBe(0);
    expect(body.winRate.losses).toBe(0);
    expect(body.winRate.reason).toMatch(/No WIN\/LOSS picks settled/i);
  });

  it("rounds win rate to 1 decimal place", async () => {
    const countMock = dbMock.pick.count;
    countMock.mockImplementation((args: { where: Record<string, unknown> }) => {
      const w = args.where;
      if (w.result === "WIN") return Promise.resolve(2);
      if (w.result === "LOSS") return Promise.resolve(1);
      if (w.result === "PUSH") return Promise.resolve(0);
      if (w.settledAt) return Promise.resolve(3);
      if (w.generatedAt) return Promise.resolve(5);
      return Promise.resolve(0);
    });

    settlementHealthMocks.loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY", commencedTotal: 100, overduePending: 0, graceHours: 6,
      clean: true, operatorMessage: "ok", remediation: [],
    });
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    // 2/3 = 66.666... → 66.7
    expect(body.winRate.rate).toBe(66.7);
  });
});

describe("daily-truth route error isolation", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with null+reason when loadSettlementHealth throws", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    settlementHealthMocks.loadSettlementHealth.mockRejectedValue(new Error("DB connection lost"));
    defaultClvCoverage();
    // canonicalSample won't be called because settlement is null
    defaultCalibration();
    defaultScheduler();

    const { res, body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // settlement is null with a reason
    expect(body.settlement).toHaveProperty("reason");
    expect(body.settlement.reason).toMatch(/loadSettlementHealth failed/i);
    // canonicalSample is blocked because settlement is null
    expect(body.canonicalSample).toHaveProperty("reason");
  });

  it("isolates a thrown scheduler liveness (never crashes the route)", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    schedulerMocks.assessSchedulerLiveness.mockRejectedValue(new Error("liveness query failed"));

    const { res, body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scheduler.status).toBe("unknown");
    expect(body.scheduler.operatorHint).toMatch(/could not assess/i);
  });
});

describe("daily-truth route stub mode", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns null + reason for pick-count fields when isStubMode is true", async () => {
    dataMocks.isStubMode.mockReturnValue(true);
    defaultScheduler();  // assessSchedulerLiveness is still called even in stub mode
    dbMock.pick.count.mockRejectedValue(new Error("should not be called"));

    const { res, body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // Published should be null with stub reason
    expect(body.published.today).toBeNull();
    expect(body.published.reason).toMatch(/Stub DB mode/i);
    // Win rate should be null with stub reason
    expect(body.winRate.rate).toBeNull();
    expect(body.winRate.reason).toMatch(/Stub DB mode/i);
    // Settled should be null with stub reason
    expect(body.settled.today).toBeNull();
    expect(body.settled.reason).toMatch(/Stub DB mode/i);
    // CLV should not be called
    expect(clvCoverageMocks.loadClvCoverage).not.toHaveBeenCalled();
    // Settlement health should not be called
    expect(settlementHealthMocks.loadSettlementHealth).not.toHaveBeenCalled();
  });
});

describe("daily-truth route settled delta", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("computes delta = today - yesterday when both are non-null", async () => {
    const countMock = dbMock.pick.count;
    let callIndex = 0;
    countMock.mockImplementation((args: { where: Record<string, unknown> }) => {
      const w = args.where;
      callIndex++;
      // The first settled query (result is { in: [...] }) is todaySettled, second is yesterdaySettled
      // Both have `settledAt` and `result` as object
      if (w.result === "WIN") return Promise.resolve(3);
      if (w.result === "LOSS") return Promise.resolve(2);
      if (w.result === "PUSH") return Promise.resolve(0);
      if (w.settledAt) {
        // First settledAt query = today, second = yesterday
        // Promise.all invokes callbacks synchronously in order, so callIndex
        // distinguishes today (1) from yesterday (2) within this batch.
        if (callIndex === 1) return Promise.resolve(15);
        return Promise.resolve(10);
      }
      if (w.generatedAt) return Promise.resolve(20);
      return Promise.resolve(0);
    });

    settlementHealthMocks.loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY", commencedTotal: 100, overduePending: 0, graceHours: 6,
      clean: true, operatorMessage: "ok", remediation: [],
    });
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(body.settled.today).toBe(15);
    expect(body.settled.yesterday).toBe(10);
    expect(body.settled.delta).toBe(5);
  });

  it("returns null delta when settled counts are unmeasurable", async () => {
    dbMock.pick.count.mockRejectedValue(new Error("count failed"));
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    const { body } = await invokeGet(`Bearer ${REAL_SECRET}`);
    expect(body.settled.today).toBeNull();
    expect(body.settled.yesterday).toBeNull();
    expect(body.settled.delta).toBeNull();
    expect(body.settled.reason).toMatch(/DB query failed/i);
  });
});

describe("daily-truth route never writes", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", REAL_SECRET);
    dataMocks.isStubMode.mockReturnValue(false);
    predictionEngineMocks.getReadinessGates.mockReturnValue({
      canExposePerformanceStats: true, canExposePublicPicks: true,
      canLearnFromOutcomes: true, canPersistCanonicalHistory: true,
      canUseDerivedHistory: true, canPromoteFeaturedPicks: true,
      canPublishContent: true, isBootstrapMode: false,
      confidenceDisplayMode: "percentile" as const, minDataQualityForGameLog: 0.7,
      canApplyCalibrationAdjustments: false, minSettledPicksForLearning: 30,
      forceNoBetIfStale: false, config: {},
    });
  });

  afterEach(() => {
    resetMocks();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("only calls db.pick.count (read) — never creates, updates, or deletes", async () => {
    dbMock.pick.count.mockResolvedValue(0);
    // Stub the pick object so any mutation method would be a mock fn
    dbMock.pick.create = vi.fn();
    dbMock.pick.update = vi.fn();
    dbMock.pick.delete = vi.fn();
    defaultSettlementHealth();
    defaultClvCoverage();
    defaultCanonicalSample();
    defaultCalibration();
    defaultScheduler();

    await invokeGet(`Bearer ${REAL_SECRET}`);

    expect(dbMock.pick.create).not.toHaveBeenCalled();
    expect(dbMock.pick.update).not.toHaveBeenCalled();
    expect(dbMock.pick.delete).not.toHaveBeenCalled();
  });
});
