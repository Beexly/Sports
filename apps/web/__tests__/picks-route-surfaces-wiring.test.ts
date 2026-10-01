import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE LIVE PICK PATH MUST CALL THE ENGINE WITH ITS REAL DATA.
 *
 * `loadBundleSurfaces` reads the twelve raw DB surfaces (injuries, ratings,
 * snaps, NGS, player stats, game signals, weather) and #985 wired it into
 * /api/picks as the 4th argument to `enrichPickWithIntelligence`. The
 * existing tests do NOT cover that wiring and could not have:
 *
 *   - intelligence-enrichment.db-wiring.test.ts calls the enrichment function
 *     DIRECTLY. It proves the function uses surfaces when handed them. It says
 *     nothing about whether production hands it any.
 *   - db-loaders.test.ts calls the loader DIRECTLY. It proves the loader
 *     returns rows. It says nothing about whether the route calls it.
 *
 * So the one link between them — the four-argument call in the live route —
 * was unpinned, which is precisely how a three-argument call can ship without
 * a single test going red. The engine ran on market context alone and every
 * test in the repo stayed green, because every test was calling one half.
 *
 * This file executes the real handler and asserts the link itself:
 *   - the loader is invoked ONCE PER PICK on the slate (not zero times);
 *   - the bundle it returns reaches `enrichPickWithIntelligence` as arg 4;
 *   - the engine runs EXACTLY ONCE per pick (an earlier wiring ran it twice);
 *   - a loader that throws degrades that pick to market-only and still serves
 *     the response, rather than blanking the whole slate.
 */

const mocks = vi.hoisted(() => ({
  forceNoBetIfStale: false,
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickFindFirst: vi.fn<(args?: unknown) => Promise<unknown>>(),
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Record<string, unknown>>>(),
  loadBundleSurfaces: vi.fn<(args: unknown) => Promise<unknown>>(),
  enrichPickWithIntelligence: vi.fn<(...args: unknown[]) => Record<string, unknown>>(),
}));

// Rate limiting is not this file's subject and the durable limiter needs a DB
// surface this mock does not provide. Allow-all so the wiring under test is
// what decides the response.
vi.mock("@/lib/api/public-form-rate-limit", () => ({
  consumePublicFormRateLimit: vi.fn(async () => ({ ok: true, backend: "memory" })),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany, count: mocks.pickCount, findFirst: mocks.pickFindFirst },
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
  },
  isStubMode: () => false,
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePublicPicks: true,
      forceNoBetIfStale: mocks.forceNoBetIfStale,
      canApplyCalibrationAdjustments: false,
    }),
  };
});

// THE LINK UNDER TEST. Mocking the loader is what makes "did the route call
// it, and did the result arrive as arg 4" observable at all; without a spy on
// both ends the assertion would be a comment.
vi.mock("@/lib/intelligence-core/db-loaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intelligence-core/db-loaders")>();
  return { ...actual, loadBundleSurfaces: mocks.loadBundleSurfaces };
});

vi.mock("@/lib/picks/intelligence-enrichment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/picks/intelligence-enrichment")>();
  return {
    ...actual,
    enrichPickWithIntelligence: mocks.enrichPickWithIntelligence,
  };
});

/**
 * A loader bundle carrying one distinguishable marker per surface group. The
 * marker is what the fourth-argument assertion looks for: it proves the exact
 * object the loader returned is the object the engine received, not a
 * re-derived lookalike.
 */
const BUNDLE_MARKER = "SURFACES_FROM_LOADER";
const SURFACES_BUNDLE = {
  homeInjuries: [{ playerName: "P1", team: "KC", reportStatus: "Out" }],
  awayInjuries: [],
  homeRatings: [],
  awayRatings: [],
  homeSnaps: [],
  awaySnaps: [],
  homeNgs: [],
  awayNgs: [],
  homePlayerStats: [],
  awayPlayerStats: [],
  gameSignals: [],
  weather: [],
  resolution: {
    homeAbbr: "KC",
    awayAbbr: "BUF",
    season: 2026,
    asOfWeek: 3,
    lagWeek: 3,
    weeksSeen: { injuries: [3], ratings: [], snaps: [], ngs: [], playerStats: [] },
    notes: [BUNDLE_MARKER],
  },
};

function pickRow(id: string, homeTeamName = "Kansas City Chiefs") {
  return {
    id,
    gameId: `game-${id}`,
    selection: "Kansas City Chiefs ML",
    line: 0,
    pickType: "MONEYLINE",
    confidence: 68,
    edgeScore: 18,
    consensusPct: null,
    bookmakerCount: 0,
    tier: "FREE",
    pickGrade: "LEAN",
    riskLevel: "MODERATE",
    reasoning: "Model signal: independent estimate 68% for KC.",
    reasoningShort: "KC model signal.",
    modelVersion: "v5.2.7",
    dataFreshnessAt: new Date(),
    result: "PENDING",
    ingestionRunId: null,
    factorBreakdown: { rankingP: 0.68, marketFairProb: null, dataQualityScore: 80 },
    isFeatured: false,
    isPublished: true,
    generatedAt: new Date(),
    game: {
      commenceTime: new Date(Date.now() + 60 * 60 * 1000),
      homeTeamName,
      awayTeamName: "Buffalo Bills",
      dataQualityScore: 80,
      openingSpread: null,
      openingTotal: null,
      sport: { name: "NFL", key: "americanfootball_nfl" },
    },
    proofReceipt: null,
    signalSnapshot: null,
  };
}

async function callPicks(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks — the engine runs on real DB surfaces, not market context alone", () => {
  beforeEach(() => {
    mocks.forceNoBetIfStale = false;
    mocks.pickFindMany.mockReset().mockResolvedValue([pickRow("p1"), pickRow("p2")]);
    mocks.pickFindFirst.mockReset().mockResolvedValue(null);
    mocks.pickCount.mockReset().mockResolvedValue(2);
    mocks.ingestionRunFindFirst.mockReset();
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
    mocks.loadBundleSurfaces.mockReset().mockResolvedValue(SURFACES_BUNDLE);
    // Spy, not a stub: record the call and return a minimal-shaped result so
    // the route's projection path still completes.
    mocks.enrichPickWithIntelligence.mockReset().mockImplementation((...args: unknown[]) => {
      const surfaces = args[3] as { resolution?: { notes?: string[] } } | undefined;
      const filled = surfaces ? 1 : 0;
      return {
        calibratedProb: 0.68,
        observationCount: filled > 0 ? 2 : 0,
        dbSurfacesFilled: filled,
        dbRowCount: filled,
        dbSurfacesEmpty: [],
        dbResolution: surfaces?.resolution ?? null,
        summary: null,
        sixQuestions: null,
        why: [],
        familyWeights: [],
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the bundle surfaces for every pick on the slate", async () => {
    const { status } = await callPicks();

    expect(status).toBe(200);
    // Once per pick. Zero calls here is the exact regression this file exists
    // for: the engine would be doing arithmetic over market data only.
    expect(mocks.loadBundleSurfaces).toHaveBeenCalledTimes(2);
    // ORDER-INDEPENDENT on purpose. The route re-ranks survivors by rankingP
    // then generatedAt, and the two fixture picks share a confidence, so which
    // pick loads first is not stable across runs. Asserting `calls[0]` would
    // make this guard flaky and therefore eventually ignored, which is how an
    // unpinned wiring rots in the first place. What matters is that EVERY game
    // on the slate was asked for, and that the route named the club.
    const requestedGameIds = mocks.loadBundleSurfaces.mock.calls
      .map((call) => (call[0] as Record<string, unknown>)["gameId"])
      .sort();
    expect(requestedGameIds).toEqual(["game-p1", "game-p2"]);
    for (const call of mocks.loadBundleSurfaces.mock.calls) {
      const args = call[0] as Record<string, unknown>;
      expect(args["homeTeamName"]).toBe("Kansas City Chiefs");
      expect(args["awayTeamName"]).toBe("Buffalo Bills");
      // `asOf` must be present: the loaders lag their reads strictly against
      // it, and an omitted one silently reads the clock per surface.
      expect(args["asOf"]).toBeInstanceOf(Date);
    }
  });

  it("passes the loaded bundle to the engine as the FOURTH argument", async () => {
    await callPicks();

    expect(mocks.enrichPickWithIntelligence).toHaveBeenCalledTimes(2);
    for (const call of mocks.enrichPickWithIntelligence.mock.calls) {
      // Args 1-3 are pick / now / universalSignals. The surfaces bundle is arg 4.
      // Arg 5 is the shadowOnly WEATHER_TRAVEL gate (2026-10-01, Tier 1 #3).
      expect(call).toHaveLength(5);
      const surfaces = call[3] as { resolution?: { notes?: string[] } };
      // Identity, not shape: this is the loader's own object.
      expect(surfaces.resolution?.notes).toContain(BUNDLE_MARKER);
    }
  });

  it("runs the engine EXACTLY once per pick, not twice", async () => {
    await callPicks();

    // An earlier wiring attempt ran the enrichment twice per pick. Pinning the
    // count is what keeps that from returning.
    expect(mocks.enrichPickWithIntelligence).toHaveBeenCalledTimes(2);
  });

  it("degrades one failing surface to market-only WITHOUT failing the response", async () => {
    mocks.loadBundleSurfaces.mockRejectedValueOnce(new Error("snap_counts read failed"));

    const { status, body } = await callPicks();

    // The whole slate still serves...
    expect(status).toBe(200);
    const data = body["data"] as unknown[];
    expect(data).toHaveLength(2);
    // ...and the failed pick ran the engine anyway, with no bundle.
    expect(mocks.enrichPickWithIntelligence).toHaveBeenCalledTimes(2);
    const firstSurfaces = mocks.enrichPickWithIntelligence.mock.calls[0]?.[3];
    expect(firstSurfaces).toBeUndefined();
  });

  it("surfaces the filled count on the public payload so the change is measurable", async () => {
    const { body } = await callPicks();

    const data = body["data"] as { intelligence?: { dbSurfacesFilled?: number } }[];
    expect(data[0]?.intelligence?.dbSurfacesFilled).toBe(1);
  });
});