/**
 * P9-04 rate-limiting tests for three newly-protected anonymous GET routes:
 *  - /api/sources/catalog
 *  - /api/verify
 *  - /api/picks/daily-slate
 *
 * Each test imports the real route handler and the REAL consumeRateLimit +
 * clientIp (no mocking of the limiter), then asserts:
 *  - a single request within quota succeeds (200)
 *  - repeated requests beyond the 60/min window return 429 with Retry-After
 *
 * The underlying data dependencies are mocked so the tests exercise only the
 * rate-limit gate + handler shape, not real data loading.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

// ─── Unified mock setup ───────────────────────────────────────────────────

const dbMock = vi.hoisted(() => ({
  pickProofReceipt: { findFirst: vi.fn() },
  pick: { count: vi.fn(), findMany: vi.fn() },
  agentReceipt: { findUnique: vi.fn() },
  slateCommitment: { findUnique: vi.fn() },
}));

const predictionEngineMocks = vi.hoisted(() => ({
  getReadinessGates: vi.fn(() => ({
    canExposePerformanceStats: true,
    canExposePublicPicks: true,
    forceNoBetIfStale: false,
    minSettledPicksForLearning: 100,
  })),
  hashLeaf: vi.fn(() => "testhash"),
  parseCanonicalPayload: vi.fn(() => ({})),
  merkleRootFromLeafHashes: vi.fn(() => "root"),
}));

const catalogMocks = vi.hoisted(() => ({
  loadSourceLiveEvidence: vi.fn(),
  providerStatuses: vi.fn(() => []),
  readinessSummary: vi.fn(() => ({ configured: 0, total: 0 })),
}));

const slateMocks = vi.hoisted(() => ({
  isStubMode: vi.fn(() => false),
  isDemoPicksEnabled: vi.fn(() => false),
  getSamplePicks: vi.fn(() => []),
  isPublicPicksSurfaceStale: vi.fn(() => false),
}));

vi.mock("@sports/db", () => ({
  db: dbMock,
  isStubMode: slateMocks.isStubMode,
  isDemoPicksEnabled: slateMocks.isDemoPicksEnabled,
  getSamplePicks: slateMocks.getSamplePicks,
}));

vi.mock("@sports/prediction-engine", () => ({
  ...predictionEngineMocks,
  getReadinessGates: predictionEngineMocks.getReadinessGates,
  hashLeaf: predictionEngineMocks.hashLeaf,
  parseCanonicalPayload: predictionEngineMocks.parseCanonicalPayload,
  merkleRootFromLeafHashes: predictionEngineMocks.merkleRootFromLeafHashes,
  bootstrapGateResponse: vi.fn((name: string) => ({
    status: "bootstrapping",
    bootstrapMode: true,
    data: { name },
  })),
}));

vi.mock("@/lib/data-sources/live-evidence", () => ({
  loadSourceLiveEvidence: catalogMocks.loadSourceLiveEvidence,
}));
vi.mock("@/lib/integrations/providers", () => ({
  providerStatuses: catalogMocks.providerStatuses,
  readinessSummary: catalogMocks.readinessSummary,
}));
vi.mock("@/lib/data-sources/catalog", () => ({
  CONTEXT_INTELLIGENCE_SOURCES: [],
  DATA_SOURCE_STACK: [],
  PUBLIC_DATA_SOURCES: [],
  TREND_BACKLOG: [],
  sourceCostLabel: () => "",
  sourceStatusLabel: () => "",
}));
vi.mock("@/lib/public-picks-quality", () => ({
  MIN_PUBLIC_PICK_DATA_QUALITY_SCORE: 50,
}));
vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: slateMocks.isPublicPicksSurfaceStale,
}));

// ─── Test helpers ─────────────────────────────────────────────────────────

function makeRequest(url: string): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": "203.0.113.1" },
  });
}

// ─── /api/sources/catalog ─────────────────────────────────────────────────

describe("/api/sources/catalog — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    catalogMocks.loadSourceLiveEvidence.mockResolvedValue({ status: "ok" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/sources/catalog/route");
    const req = makeRequest("http://localhost/api/sources/catalog");
    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
    expect(catalogMocks.loadSourceLiveEvidence).toHaveBeenCalledTimes(1);
  });

  it("returns 429 with Retry-After when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/sources/catalog/route");
    const req = makeRequest("http://localhost/api/sources/catalog");

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET(req as never);
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(req as never);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });
});

// ─── /api/verify ──────────────────────────────────────────────────────────

describe("/api/verify — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    dbMock.pickProofReceipt.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/verify/route");
    const req = makeRequest("http://localhost/api/verify?hash=" + "a".repeat(64));
    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
    expect(dbMock.pickProofReceipt.findFirst).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/verify/route");
    const req = makeRequest("http://localhost/api/verify?hash=" + "a".repeat(64));

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET(req as never);
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(req as never);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
  });
});

// ─── /api/picks/daily-slate ───────────────────────────────────────────────

describe("/api/picks/daily-slate — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    dbMock.pick.count.mockResolvedValue(0);
    dbMock.pick.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/picks/daily-slate/route");
    const req = makeRequest("http://localhost/api/picks/daily-slate");
    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
    expect(dbMock.pick.count).toHaveBeenCalled();
  });

  it("returns 429 when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/picks/daily-slate/route");
    const req = makeRequest("http://localhost/api/picks/daily-slate");

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET(req as never);
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(req as never);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
  });
});
