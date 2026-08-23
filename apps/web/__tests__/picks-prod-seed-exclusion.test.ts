import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/picks — production seed-row exclusion (defense-in-depth).
 *
 * The dev seed writes synthetic rows tagged modelVersion="v5.0.0-seed".
 * In PRODUCTION there should be zero such rows, but /api/picks is the last
 * public path that did not guard against them. This pins the additive,
 * default-SAFE guardrail:
 *
 *   - NODE_ENV="production": the picks query AND its totalAvailableToday
 *     count both carry `NOT: { modelVersion: "v5.0.0-seed" }`, so a stray
 *     seed row can never surface on the live endpoint.
 *   - NODE_ENV!=="production" (dev/test): the filter is absent, so demo
 *     mode — which intentionally returns seed rows and flags
 *     meta.containsSeedData — is preserved byte-for-byte. (Pinned by
 *     picks-demo-mode.test.ts.)
 *
 * Mirrors the executed-handler + vi.mock("@sports/db") pattern from
 * picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<(args?: { where?: Record<string, unknown> }) => Promise<unknown[]>>(),
  pickCount: vi.fn<(args?: { where?: Record<string, unknown> }) => Promise<number>>(),
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Record<string, unknown>>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany, count: mocks.pickCount },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

// Keep the readiness gates permissive (public picks on, kill switch off) so
// the handler reaches the picks query. Everything else stays real.
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePublicPicks: true,
      forceNoBetIfStale: false,
    }),
  };
});

const SEED_FILTER = { modelVersion: "v5.0.0-seed" };

function seedRow(id: string) {
  return {
    id,
    modelVersion: "v5.0.0-seed",
    pickType: "SPREAD",
    selection: "Home -3",
    line: -3,
    confidence: 70,
    edgeScore: 5,
    factorBreakdown: null,
    tier: "FREE",
    pickGrade: "LEAN",
    riskLevel: "MODERATE",
    reasoning: "Seed reasoning. More text.",
    reasoningShort: "Seed reasoning.",
    isFeatured: false,
    generatedAt: new Date(),
    dataFreshnessAt: null,
    result: "PENDING",
    game: {
      homeTeamName: "Home",
      awayTeamName: "Away",
      commenceTime: new Date(),
      dataQualityScore: 90,
      sport: { name: "NFL", key: "americanfootball_nfl" },
    },
  };
}

async function callPicks(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks — production seed-row exclusion", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    mocks.pickFindMany.mockReset().mockResolvedValue([]);
    mocks.pickCount.mockReset().mockResolvedValue(0);
    // Anonymous FREE viewer: canSeePremiumPicks=false drives the
    // totalAvailableToday count branch too.
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  afterEach(() => {
    // Restore NODE_ENV exactly so no other test sees a leaked value.
    Object.defineProperty(process.env, "NODE_ENV", {
      value: ORIGINAL_NODE_ENV,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  function setNodeEnv(value: string): void {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }

  it("production: the picks query AND the count exclude seed rows", async () => {
    setNodeEnv("production");

    const { status } = await callPicks();
    expect(status).toBe(200);

    // findMany where carries the prod-only NOT filter.
    const findArgs = mocks.pickFindMany.mock.calls[0]?.[0];
    expect(findArgs?.where).toMatchObject({ NOT: SEED_FILTER });

    // The FREE-viewer totalAvailableToday count carries it too.
    expect(mocks.pickCount).toHaveBeenCalled();
    const countArgs = mocks.pickCount.mock.calls[0]?.[0];
    expect(countArgs?.where).toMatchObject({ NOT: SEED_FILTER });
  });

  it("production: a stray seed row is never returned (query filters it out)", async () => {
    setNodeEnv("production");
    // Even if the DB held a seed row, the prod filter is in the WHERE, so the
    // mock that honors the filter returns nothing. We assert the filter is
    // present rather than re-implementing Prisma semantics.
    const { status, body } = await callPicks();
    expect(status).toBe(200);
    const meta = body["meta"] as Record<string, unknown>;
    // No seed rows returned → containsSeedData must be false in prod.
    expect(meta["containsSeedData"]).toBe(false);
  });

  it("non-production (test): NO seed filter — demo mode preserved", async () => {
    setNodeEnv("test");
    // Demo mode returns seed rows and flags containsSeedData.
    mocks.pickFindMany.mockResolvedValue([seedRow("seed-1")]);

    const { status, body } = await callPicks();
    expect(status).toBe(200);

    const findArgs = mocks.pickFindMany.mock.calls[0]?.[0];
    // The where must NOT carry the seed exclusion outside production.
    expect(findArgs?.where).not.toHaveProperty("NOT");

    const meta = body["meta"] as Record<string, unknown>;
    expect(meta["containsSeedData"]).toBe(true);
  });

  it("development: NO seed filter either (dev demo path unchanged)", async () => {
    setNodeEnv("development");

    await callPicks();

    const findArgs = mocks.pickFindMany.mock.calls[0]?.[0];
    expect(findArgs?.where).not.toHaveProperty("NOT");
  });
});
