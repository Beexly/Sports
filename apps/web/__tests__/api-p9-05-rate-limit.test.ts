/**
 * P9-05 rate-limiting tests for three newly-protected anonymous GET routes:
 *  - /api/verify/slate   (DB read + live Merkle root recomputation)
 *  - /api/proof/receipts (DB read + per-row verifyReceiptIntegrity)
 *  - /api/picks/[id]/audit (DB read + CPU-heavy pre-mortem/fragility/death-clock)
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

// ─── Unified mock setup (shared across all three routes) ──────────────────────

const dbMock = vi.hoisted(() => ({
  slateCommitment: { findUnique: vi.fn() },
  pickProofReceipt: { findMany: vi.fn() },
  pick: { findUnique: vi.fn() },
  sourceSnapshot: { findMany: vi.fn() },
}));

const predictionEngineMocks = vi.hoisted(() => ({
  getReadinessGates: vi.fn(() => ({
    canExposePublicPicks: true,
    canExposePerformanceStats: true,
    canLearnFromOutcomes: true,
  })),
  merkleRootFromLeafHashes: vi.fn(() => "mock-root"),
  verifyReceiptIntegrity: vi.fn(() => ({
    verified: true,
    frozenAt: "2026-09-14T16:00:00.000Z",
    modelVersion: "v5.1.0",
    committed: { line: -3.5, entryOdds: -110, marketFairProb: 0.5238, confidence: 62, edgeScore: 14, modelProb: 0.55 },
  })),
  bootstrapGateResponse: vi.fn((name: string) => ({
    status: "bootstrapping",
    bootstrapMode: true,
    data: { name },
  })),
}));

const proofMocks = vi.hoisted(() => ({
  verifyReceiptIntegrity: vi.fn(() => ({
    verified: true,
    frozenAt: "2026-09-14T16:00:00.000Z",
    modelVersion: "v5.1.0",
    committed: { line: -3.5, entryOdds: -110, marketFairProb: 0.5238, confidence: 62, edgeScore: 14, modelProb: 0.55 },
  })),
}));

const seoMocks = vi.hoisted(() => ({
  SITE_URL: "https://www.galaxysportsedge.com",
}));

const authMocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
  getUserEntitlements: vi.fn(() => Promise.resolve({
    tier: "FREE",
    canSeeFactorBreakdown: false,
  })),
}));

const premortemMocks = vi.hoisted(() => ({
  buildPickPremortemNote: vi.fn(() => ({ status: "READY", summary: "..." })),
  computeFragilityScore: vi.fn(() => ({ score: 0, components: [] })),
}));

const deathClockMocks = vi.hoisted(() => ({
  buildPickDeathClock: vi.fn(() => ({ phase: "pre", secondsRemaining: 3600, pctElapsed: 0.1 })),
}));

const typesMocks = vi.hoisted(() => ({
  getEntitlements: vi.fn((tier: string) => ({
    tier,
    canSeeFactorBreakdown: false,
  })),
}));

// Mock modules that the three routes depend on.
vi.mock("@sports/db", () => ({
  db: dbMock,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: predictionEngineMocks.getReadinessGates,
  merkleRootFromLeafHashes: predictionEngineMocks.merkleRootFromLeafHashes,
  bootstrapGateResponse: predictionEngineMocks.bootstrapGateResponse,
}));

vi.mock("@/lib/proof/receipt-proof", () => ({
  verifyReceiptIntegrity: proofMocks.verifyReceiptIntegrity,
}));

vi.mock("@/lib/seo/site-url", () => ({
  SITE_URL: seoMocks.SITE_URL,
}));

vi.mock("@/lib/auth", () => ({
  auth: authMocks.auth,
}));

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: authMocks.getUserEntitlements,
}));

vi.mock("@/lib/premortem/build", () => ({
  buildPickPremortemNote: premortemMocks.buildPickPremortemNote,
}));

vi.mock("@/lib/premortem/fragility", () => ({
  computeFragilityScore: premortemMocks.computeFragilityScore,
}));

vi.mock("@/lib/market/pick-death-clock", () => ({
  buildPickDeathClock: deathClockMocks.buildPickDeathClock,
}));

vi.mock("@sports/types", () => ({
  getEntitlements: typesMocks.getEntitlements,
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** A Request with a realistic forwarded IP so all 60 requests share one bucket. */
function makeRequest(url: string): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": "203.0.113.50" },
  });
}

const SLATE_KEY = "AMERICANFOOTBALL_NFL:2026-07-02";
const VALID_HASH = "a".repeat(64);

// ─── /api/verify/slate ────────────────────────────────────────────────────────

describe("/api/verify/slate — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    // Return a non-null slate so the route succeeds within quota (200).
    dbMock.slateCommitment.findUnique.mockResolvedValue({
      slateKey: SLATE_KEY,
      root: "mock-root",
      count: 0,
      committedAt: new Date("2026-07-02T10:00:00.000Z"),
      pedersenAggregateHex: null,
      receipts: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/verify/slate/route");
    const req = makeRequest(`http://localhost/api/verify/slate?slateKey=${encodeURIComponent(SLATE_KEY)}`);
    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 429 with Retry-After when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/verify/slate/route");
    const req = makeRequest(`http://localhost/api/verify/slate?slateKey=${encodeURIComponent(SLATE_KEY)}`);

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

// ─── /api/proof/receipts ──────────────────────────────────────────────────────

describe("/api/proof/receipts — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    // Return an empty array so the route succeeds within quota (200).
    dbMock.pickProofReceipt.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/proof/receipts/route");
    const req = makeRequest("http://localhost/api/proof/receipts");
    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 429 with Retry-After when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/proof/receipts/route");
    const req = makeRequest("http://localhost/api/proof/receipts");

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

// ─── /api/picks/[id]/audit ────────────────────────────────────────────────────

describe("/api/picks/[id]/audit — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    // Return a published, non-bootstrap pick so the route reaches the FREE branch (200).
    dbMock.pick.findUnique.mockResolvedValue({
      id: "pick-1",
      isPublished: true,
      isBootstrap: false,
      selection: "Chiefs -3.5",
      pickType: "SPREAD",
      confidence: 78,
      edgeScore: 60,
      modelVersion: "v5.0.0",
      generatedAt: new Date("2026-07-11T13:00:00.000Z"),
      signalSnapshot: null,
      game: { homeTeamName: "Chiefs", awayTeamName: "Broncos", odds: [] },
    });
    dbMock.sourceSnapshot.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 60/min quota", async () => {
    const mod = await import("@/app/api/picks/[id]/audit/route");
    const req = makeRequest("http://localhost/api/picks/pick-1/audit");
    const res = await mod.GET(req as never, { params: { id: "pick-1" } });
    expect(res.status).toBe(200);
  });

  it("returns 429 with Retry-After when the IP exceeds 60 req/min", async () => {
    const mod = await import("@/app/api/picks/[id]/audit/route");
    const req = makeRequest("http://localhost/api/picks/pick-1/audit");

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET(req as never, { params: { id: "pick-1" } });
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(req as never, { params: { id: "pick-1" } });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });
});
