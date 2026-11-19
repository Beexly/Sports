import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("Wave 50 security and money-path contracts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@sports/db");
    vi.doUnmock("@/lib/auth");
    vi.doUnmock("@/lib/mobile/bearer-auth");
    vi.doUnmock("@/lib/entitlements");
    vi.doUnmock("@/lib/api/public-form-rate-limit");
    vi.doUnmock("@sports/prediction-engine");
    vi.doUnmock("@/lib/intelligence-core/db-loaders");
    vi.doUnmock("@/lib/picks/intelligence-enrichment");
    vi.doUnmock("@/lib/packages/stage5-gate");
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("POST /api/email-capture never records one_time_pack or grants PRO in checkPurchaseLedgerAccess", async () => {
    const createSpy = vi.fn(async () => ({ id: "rev_1" }));
    const findManySpy = vi.fn(async () => []);
    vi.doMock("@sports/db", () => ({
      isStubMode: () => false,
      db: {
        revenueEvent: {
          create: createSpy,
          findMany: findManySpy,
        },
      },
    }));

    const { POST } = await import("@/app/api/email-capture/route");
    const { checkPurchaseLedgerAccess } = await import("@/lib/packages/purchase-ledger");

    const email = "wave50-lead-check@example.com";
    const req = new NextRequest("https://www.galaxysportsedge.com/api/email-capture", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.42",
      },
      body: JSON.stringify({ email }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const createdArg = (createSpy.mock.calls[0]?.[0] as { data: { kind: string; amountCents: number } }).data;
    expect(createdArg.kind).toBe("email_capture");
    expect(createdArg.kind).not.toBe("one_time_pack");
    expect(createdArg.amountCents).toBe(0);

    const access = await checkPurchaseLedgerAccess({ email, slug: "tnf-all-in-pack" });
    expect(access.unlocked).toBe(false);
  });

  it("openrouter and openrouter-provider endpoints fail closed with 401 when OPENROUTER_PROVIDER_API_KEY is unset", async () => {
    delete process.env.OPENROUTER_PROVIDER_API_KEY;

    const { POST: postV1 } = await import("@/app/api/openrouter/v1/chat/completions/route");
    const { POST: postProvider } = await import("@/app/api/openrouter-provider/chat/completions/route");

    const reqV1 = new Request("https://www.galaxysportsedge.com/api/openrouter/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gse/skeleton-flash", messages: [{ role: "user", content: "hi" }] }),
    });
    const resV1 = await postV1(reqV1);
    expect(resV1.status).toBe(401);

    const reqProvider = new Request("https://www.galaxysportsedge.com/api/openrouter-provider/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gse/skeleton-flash", messages: [{ role: "user", content: "hi" }] }),
    });
    const resProvider = await postProvider(reqProvider);
    expect(resProvider.status).toBe(401);
  });

  it("GET /api/models/invoke requires ops auth and fails closed with 401", async () => {
    process.env.OPS_CRON_SECRET = "wave50-test-ops-secret-1234";
    const { GET } = await import("@/app/api/models/invoke/route");

    const unauthReq = new Request("https://www.galaxysportsedge.com/api/models/invoke", {
      method: "GET",
    });
    const res = await GET(unauthReq);
    expect(res.status).toBe(401);
  });

  it("GET /api/picks returns reasoningTrace: null for FREE viewers", async () => {
    const pickRow = {
      id: "wave50-pick-1",
      gameId: "game-wave50-1",
      selection: "Houston Texans -2.5",
      line: -2.5,
      pickType: "SPREAD",
      confidence: 68,
      edgeScore: 18,
      consensusPct: null,
      bookmakerCount: 3,
      tier: "FREE",
      pickGrade: "LEAN",
      riskLevel: "MODERATE",
      reasoning: "Internal reasoning trace that must stay hidden from FREE callers.",
      reasoningShort: "Public teaser.",
      modelVersion: "v5.2.7",
      dataFreshnessAt: new Date(),
      result: "PENDING",
      ingestionRunId: null,
      factorBreakdown: {
        rankingP: 0.68,
        marketFairProb: 0.52,
        dataQualityScore: 85,
        situational: { reasoningTrace: "SECRET_INTERNAL_TRACE" },
      },
      isFeatured: false,
      isPublished: true,
      generatedAt: new Date(),
      game: {
        commenceTime: new Date(Date.now() + 3600_000),
        homeTeamName: "Houston Texans",
        awayTeamName: "Indianapolis Colts",
        dataQualityScore: 85,
        openingSpread: -2.5,
        openingTotal: 45.5,
        lineMovementSpread: 0,
        lineMovementTotal: 0,
        sport: { name: "NFL", key: "americanfootball_nfl" },
      },
      proofReceipt: null,
      signalSnapshot: null,
    };

    vi.doMock("@/lib/api/public-form-rate-limit", () => ({
      consumePublicFormRateLimit: vi.fn(async () => ({ ok: true, backend: "memory" })),
    }));
    vi.doMock("@sports/db", () => ({
      isStubMode: () => false,
      db: {
        pick: {
          findMany: vi.fn(async () => [pickRow]),
          count: vi.fn(async () => 1),
          findFirst: vi.fn(async () => null),
        },
        ingestionRun: { findFirst: vi.fn(async () => ({ completedAt: new Date() })) },
        pickVote: { count: vi.fn(async () => 0), groupBy: vi.fn(async () => []) },
      },
    }));
    vi.doMock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
    vi.doMock("@/lib/mobile/bearer-auth", () => ({
      resolveEitherViewer: vi.fn(async () => null),
    }));
    vi.doMock("@/lib/entitlements", () => ({
      getUserEntitlements: vi.fn(async () => ({ tier: "FREE" })),
    }));
    vi.doMock("@sports/prediction-engine", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
      return {
        ...actual,
        getReadinessGates: () => ({
          canExposePublicPicks: true,
          forceNoBetIfStale: false,
          canApplyCalibrationAdjustments: false,
        }),
      };
    });
    vi.doMock("@/lib/intelligence-core/db-loaders", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/intelligence-core/db-loaders")>();
      return {
        ...actual,
        loadBundleSurfaces: vi.fn(async () => null),
      };
    });

    const { GET } = await import("@/app/api/picks/route");
    const req = new NextRequest("https://www.galaxysportsedge.com/api/picks");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: Array<{ reasoningTrace: unknown; factorBreakdown: unknown }>;
    };
    expect(json.data).toHaveLength(1);
    expect(json.data[0]?.reasoningTrace).toBeNull();
    expect(json.data[0]?.factorBreakdown).toBeNull();
  });

  it("/api/packages/checkout rejects GET with 405 and enforces PAID_CHECKOUT_OPEN and production Stage-5 gate", async () => {
    const getStage5Mock = vi.fn(async () => ({
      checkoutEnabled: false,
      officialPlayCount: 0,
      reason: "Awaiting Stage-5 official plays",
      evaluatedAt: "2026-11-19T00:00:00.000Z",
    }));
    vi.doMock("@/lib/packages/stage5-gate", () => ({
      getStage5GateStatus: getStage5Mock,
    }));

    const { GET, POST } = await import("@/app/api/packages/checkout/route");

    const getRes = await GET(new Request("https://www.galaxysportsedge.com/api/packages/checkout", { method: "GET" }));
    expect(getRes.status).toBe(405);

    process.env.PAID_CHECKOUT_OPEN = "false";
    const pausedRes = await POST(
      new Request("https://www.galaxysportsedge.com/api/packages/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageSlug: "tnf-all-in-pack" }),
      }),
    );
    expect(pausedRes.status).toBe(503);
    const pausedJson = (await pausedRes.json()) as { checkoutEnabled: boolean };
    expect(pausedJson.checkoutEnabled).toBe(false);

    delete process.env.PAID_CHECKOUT_OPEN;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const gatedRes = await POST(
      new Request("https://www.galaxysportsedge.com/api/packages/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageSlug: "tnf-all-in-pack" }),
      }),
    );
    expect(gatedRes.status).toBe(503);
    expect(getStage5Mock).toHaveBeenCalledTimes(1);
    const gatedJson = (await gatedRes.json()) as { checkoutEnabled: boolean; officialPlayCount: number };
    expect(gatedJson.checkoutEnabled).toBe(false);
    expect(gatedJson.officialPlayCount).toBe(0);
  });

  it("whop-v1-entitlements admits Week 11 SKUs, preserves PRO/ELITE/FANTASY planTier, and maps revocations to REVOKE", async () => {
    const { WHOP_SLUG_ALLOWLIST, mapWhopEventToGseEntitlement } = await import(
      "@/lib/integrations/whop-v1-entitlements"
    );

    for (const slug of [
      "primetime-showdown-pack",
      "thanksgiving-5game-pack",
      "sunday-full-slate-pack",
      "pro-monthly",
      "elite-monthly",
      "redzone-dfs-pro-pack",
    ]) {
      expect(WHOP_SLUG_ALLOWLIST.has(slug)).toBe(true);
    }

    const proSub = mapWhopEventToGseEntitlement({
      id: "evt_pro_1",
      type: "payment.succeeded",
      api_version: "v1",
      timestamp: "2026-11-19T00:00:00Z",
      data: {
        id: "pay_1",
        amount: 3900,
        metadata: { gse_pack_slug: "pro-monthly" },
        user: { id: "user_1", email: "member@example.com" },
      },
    });
    expect(proSub.action).toBe("GRANT");
    expect(proSub.planTier).toBe("PRO");

    const eliteSub = mapWhopEventToGseEntitlement({
      id: "evt_elite_1",
      type: "membership.activated",
      api_version: "v1",
      timestamp: "2026-11-19T00:00:00Z",
      data: {
        id: "mem_1",
        amount: 7900,
        metadata: { gse_pack_slug: "elite-monthly" },
        user: { id: "user_2", email: "elite@example.com" },
      },
    });
    expect(eliteSub.action).toBe("GRANT");
    expect(eliteSub.planTier).toBe("ELITE");

    const dfsPack = mapWhopEventToGseEntitlement({
      id: "evt_fantasy_1",
      type: "payment.succeeded",
      api_version: "v1",
      timestamp: "2026-11-19T00:00:00Z",
      data: {
        id: "pay_2",
        amount: 2900,
        metadata: { gse_pack_slug: "redzone-dfs-pro-pack" },
        user: { id: "user_3", email: "dfs@example.com" },
      },
    });
    expect(dfsPack.action).toBe("GRANT");
    expect(dfsPack.planTier).toBe("FANTASY");

    for (const revokeType of ["refund.created", "membership.went_invalid"] as const) {
      const rev = mapWhopEventToGseEntitlement({
        id: `evt_rev_${revokeType}`,
        type: revokeType,
        api_version: "v1",
        timestamp: "2026-11-19T00:00:00Z",
        data: {
          id: "mem_rev",
          metadata: { gse_pack_slug: "primetime-showdown-pack" },
          user: { id: "user_rev", email: "rev@example.com" },
        },
      });
      expect(rev.action).toBe("REVOKE");
    }
  });

  it("STAGE0_VERIFIED_WEEK9_DFS_LINEUPS Sunday Main Classic lineups stay under $50,000 and exclude non-Sunday / OUT teams", async () => {
    const { STAGE0_VERIFIED_WEEK9_DFS_LINEUPS } = await import("@/lib/engine/engine-live-bridge");

    const bannedTeams = /\((IND|HOU|MIN|SF|CIN|WSH)\)/;
    const bannedPlayers = /Woody Marks|D\.J\. Moore|Jayden Reed/i;

    for (const key of ["cashFlagship", "gppTournament"] as const) {
      const lu = STAGE0_VERIFIED_WEEK9_DFS_LINEUPS[key];
      expect(lu.slots).toHaveLength(9);
      let sumSalary = 0;
      for (const slot of lu.slots) {
        const m = slot.detail.match(/\$([\d,]+)/);
        expect(m).not.toBeNull();
        sumSalary += Number((m?.[1] ?? "0").replace(/,/g, ""));
        expect(slot.player).not.toMatch(bannedTeams);
        expect(slot.player).not.toMatch(bannedPlayers);
      }
      expect(sumSalary).toBeLessThanOrEqual(50_000);
      expect(sumSalary).toBeGreaterThan(45_000);
    }
  });

  it("estimateClaudeCostUsd prices Opus models at $15/$75 per 1M tokens", async () => {
    const { estimateClaudeCostUsd } = await import("@/lib/claude-api/cost-monitor");

    expect(estimateClaudeCostUsd(1_000_000, 1_000_000, "claude-opus-4-1")).toBe(90);
    expect(estimateClaudeCostUsd(2_000_000, 1_000_000, "claude-3-opus-20240229")).toBe(105);
  });
});
