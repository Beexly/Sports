import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gateDecisionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    pick: { findMany: mocks.pickFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  getSamplePicks: () => [],
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ isBootstrapMode: false }),
  MODEL_VERSION: "v5.0.0",
  // Real clamp behavior — the board must never surface an Edge Index > 100.
  toEdgeIndex: (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? null : Math.max(0, Math.min(100, Math.round(v))),
}));

import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState } from "@/lib/board/state";
import { getEntitlements } from "@sports/types";

// This suite exercises Gate Cam lane construction, not the paywall — pass a
// PRO viewer so `market` reflects the real derived selection instead of the
// tier-redacted "ALL_MARKETS" a FREE/anonymous viewer now receives.
const proViewer = getEntitlements("PRO");

const evaluatedAt = new Date("2026-05-22T15:30:00.000Z");

function game(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    awayTeamName: "BOS",
    homeTeamName: "NYY",
    currentEdgeIndex: 61,
    bookmakerCoverageMax: 11,
    sport: { name: "MLB" },
    ...overrides,
  };
}

describe("board loaders with persisted gate decisions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T16:00:00.000Z"));
    mocks.gateDecisionFindMany.mockReset();
    mocks.pickFindMany.mockReset();
    mocks.gameFindMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds Gate Cam lanes from persisted decisions before falling back to derived rows", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_published",
        gameId: "game_1",
        status: "PUBLISHED",
        reason: "Cleared publish threshold.",
        edgeIndex: 72,
        confidence: 74,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game(),
        pick: { selection: "BOS -1.5", confidence: 74 },
      },
      {
        id: "gd_gated",
        gameId: "game_2",
        status: "GATED",
        reason: "Market depth below publish threshold.",
        edgeIndex: null,
        confidence: null,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 44 }),
        pick: null,
      },
      {
        id: "gd_scoring",
        gameId: "game_3",
        status: "SCORING",
        reason: "Refresh in progress.",
        edgeIndex: 58,
        confidence: null,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "SEA", homeTeamName: "HOU" }),
        pick: null,
      },
    ]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

    expect(result.meta.isSampleData).toBe(false);
    expect(result.data.openPicks).toBe(1);
    expect(result.data.gatedToday).toBe(1);
    expect(result.data.booksPolled).toBe(11);
    expect(result.data.publishedToday[0]?.market).toBe("BOS -1.5");
    expect(result.data.gatedTodayRows[0]?.gateReason).toBe("Market depth below publish threshold.");
    expect(result.data.scoringNow[0]?.status).toBe("SCORING_NOW");
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range persisted edgeIndex to 0–100 (Edge Index 100 bug guard)", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_overflow",
        gameId: "game_x",
        status: "PUBLISHED",
        reason: "Cleared publish threshold.",
        // Corrupt/mis-scaled upstream value (e.g. a stray ×10). Must NOT reach the UI as 350.
        edgeIndex: 350,
        confidence: 74,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "TEX", homeTeamName: "STL" }),
        pick: { selection: "OVER 7.5", confidence: 74 },
      },
    ]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));
    const row = result.data.publishedToday[0];
    expect(row?.edgeIndex).not.toBeNull();
    expect(row!.edgeIndex!).toBeLessThanOrEqual(100);
    expect(row!.edgeIndex!).toBe(100);
  });

  it("builds the Pass List from persisted gated decisions", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_gated",
        gameId: "game_2",
        status: "GATED",
        reason: "Consensus below publish threshold.",
        edgeIndex: null,
        evaluatedAt,
        game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 44 }),
      },
    ]);

    const result = await loadBoardPasses(new Date("2026-05-22T16:00:00.000Z"));

    expect(result.meta.isSampleData).toBe(false);
    expect(result.data.passes).toHaveLength(1);
    expect(result.data.passes[0]).toMatchObject({
      id: "gd_gated",
      gameId: "game_2",
      matchup: "LAD @ SF",
      sport: "MLB",
      edgeIndex: 44,
      reason: "Consensus below publish threshold.",
    });
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("falls back to the active engine model version when no rows expose one", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));

    expect(result.data.modelVersion).toBe("v5.0.0");
  });

  it("keeps identical pick counts for PRO and FREE viewers (no tier-based row drop)", async () => {
    // Two picks: one FREE (tier="FREE"), one PREMIUM (tier="PREMIUM").
    // Before the fix, the FREE viewer's query carried `tier: "FREE"` which dropped
    // the premium row entirely, making openPicks vary by viewer tier.
    const freePick = {
      id: "pick_free",
      gameId: "game_1",
      selection: "BOS -1.5",
      confidence: 68,
      edgeScore: 60,
      factorBreakdown: null,
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "FREE",
      game: game(),
    };
    const premiumPick = {
      id: "pick_premium",
      gameId: "game_2",
      selection: "LAD +2.0",
      confidence: 82,
      edgeScore: 75,
      factorBreakdown: null,
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 55 }),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([freePick, premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    const freeViewer = getEntitlements("FREE");
    const proResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    const freeResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), freeViewer);

    // Counts must be identical regardless of viewer tier.
    expect(freeResult.data.openPicks).toBe(proResult.data.openPicks);
    expect(freeResult.data.openPicks).toBe(2);
    expect(freeResult.data.gatedToday).toBe(proResult.data.gatedToday);
    expect(freeResult.data.sportsWatched).toBe(proResult.data.sportsWatched);

    // Only the market field differs: PRO sees real selections, FREE sees "ALL_MARKETS".
    // Every FREE-viewer row must be redacted to "ALL_MARKETS".
    expect(freeResult.data.publishedToday.every((r) => r.market === "ALL_MARKETS")).toBe(true);
    // PRO viewer must see at least one real selection (not all redacted).
    expect(proResult.data.publishedToday.some((r) => r.market !== "ALL_MARKETS")).toBe(true);
  });

  it("redacts rankingP/rankingSource for FREE viewers (GSE-SEC-026)", async () => {
    // rankingP and rankingSource are premium-only model internals.
    // A FREE/anonymous viewer must never receive them.
    const premiumPick = {
      id: "pick_premium",
      gameId: "game_2",
      selection: "LAD +2.0",
      confidence: 82,
      edgeScore: 75,
      factorBreakdown: {
        consensusScore: 15,
        marketDepthScore: 12,
        edgeScore: 20,
        rankingP: 0.723,
        rankingSource: "independent_trueProb",
        factors: [],
      },
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 55 }),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    const freeViewer = getEntitlements("FREE");
    const proResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    const freeResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), freeViewer);

    // PRO viewer sees rankingP + rankingSource from the factor breakdown.
    expect(proResult.data.publishedToday[0]?.rankingP).toBeCloseTo(0.723, 3);
    expect(proResult.data.publishedToday[0]?.rankingSource).toBe("independent_trueProb");

    // FREE viewer gets BOTH nulled out server-side.
    expect(freeResult.data.publishedToday[0]?.rankingP).toBeNull();
    expect(freeResult.data.publishedToday[0]?.rankingSource).toBeNull();
  });

  it("nulls rankingP for anonymous viewers (no entitlements)", async () => {
    const premiumPick = {
      id: "pick_1",
      gameId: "game_1",
      selection: "CHI -3.5",
      confidence: 88,
      edgeScore: 80,
      factorBreakdown: {
        consensusScore: 15,
        marketDepthScore: 12,
        edgeScore: 20,
        rankingP: 0.912,
        rankingSource: "blend_indep_conf",
        factors: [],
      },
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game(),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    // Anonymous = no entitlements passed -> isPremiumViewer defaults to false.
    const anonymousResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));
    expect(anonymousResult.data.publishedToday[0]?.rankingP).toBeNull();
    expect(anonymousResult.data.publishedToday[0]?.rankingSource).toBeNull();
  });

  describe("loadBoardState — fallback lanes never double-count a fixture (C-117)", () => {
    const futureGame = {
      id: "game_overlap",
      commenceTime: new Date("2026-05-22T23:00:00.000Z"),
      updatedAt: new Date("2026-05-22T15:00:00.000Z"),
      dataQualityScore: 80,
      ...game(),
    };

    it("labels a not-yet-started game GATED_TODAY, never SCORING_NOW", async () => {
      // The fallback's two game queries overlap by construction: the same mock
      // serves both, exactly as one fixture satisfying both would in production.
      // The scoring query selects `commenceTime >= now AND status SCHEDULED`, so
      // every row it returns is a game that has NOT started. Lane precedence
      // ranks SCORING_NOW above GATED_TODAY, which would announce a game as
      // being scored before it kicks off (Devin Review, #717).
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([futureGame]);

      const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

      const rows = [...result.data.scoringNow, ...result.data.gatedTodayRows];
      expect(rows.filter((r) => r.gameId === "game_overlap")).toHaveLength(1);
      expect(result.data.scoringNow).toHaveLength(0);
      expect(result.data.gatedTodayRows[0]?.status).toBe("GATED_TODAY");
    });

    it("asks the database only for games that have STARTED, so SCORING_NOW is truthful at the source", async () => {
      // The suppression above is a backstop, not the fix. It only removes a
      // scoring row when a gated row shares the id, and the gated query covers
      // today's window — so a game further out had no gated twin and stayed
      // labelled SCORING_NOW. The query predicate is what makes the label
      // honest for every future game, so pin it directly (Devin Review, #717).
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([]);

      await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

      const scoringWhere = (mocks.gameFindMany.mock.calls[0]?.[0] as {
        where: { commenceTime?: Record<string, unknown>; status?: unknown };
      }).where;
      // Started, not upcoming.
      expect(scoringWhere.commenceTime).toHaveProperty("lte");
      expect(scoringWhere.commenceTime).not.toHaveProperty("gte");
      // And not yet FINAL.
      expect(scoringWhere.status).toEqual({ in: ["LIVE", "SCHEDULED"] });
    });

    it("suppresses a generic lane row for a fixture that already has a published pick", async () => {
      // Published rows key on the real pickType and the generic lanes on
      // NO_PICK, so their keys never collide and the collapse alone cannot pair
      // them. The gated query already excludes published games; the scoring
      // query does not, so the same fixture appeared twice.
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([
        {
          id: "pick_pub",
          gameId: "game_overlap",
          pickType: "SPREAD",
          selection: "BOS -1.5",
          confidence: 71,
          edgeScore: 63,
          factorBreakdown: null,
          generatedAt: evaluatedAt,
          modelVersion: "v5.1.0",
          tier: "FREE",
          game: game(),
        },
      ]);
      mocks.gameFindMany.mockResolvedValue([futureGame]);

      const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

      expect(result.data.publishedToday).toHaveLength(1);
      expect(result.data.scoringNow.some((r) => r.gameId === "game_overlap")).toBe(false);
      expect(result.data.gatedTodayRows.some((r) => r.gameId === "game_overlap")).toBe(false);
      // And the counters agree with the rows actually shown.
      expect(result.data.openPicks).toBe(1);
      expect(result.data.gatedToday).toBe(0);
    });
  });

  describe("loadBoardState — one fixture, one row (C-117)", () => {
    it("collapses repeated gate decisions for one game and keeps the counts honest", async () => {
      // Measured on a live slate: 58 rows over 18 fixtures, one matchup shown
      // four times as two contradictory variants. GateDecision has no unique
      // constraint and the query takes the latest 100 with no per-game collapse,
      // so repeated evaluations of one game each became a row.
      mocks.gateDecisionFindMany.mockResolvedValue([
        {
          id: "gd_a",
          gameId: "game_dupe",
          status: "PUBLISHED",
          reason: "Cleared publish threshold.",
          edgeIndex: 60,
          confidence: 57,
          evaluatedAt,
          modelVersion: "v5.1.0",
          game: game(),
          pick: { selection: "BOS -1.5", confidence: 57 },
        },
        {
          id: "gd_b",
          gameId: "game_dupe",
          status: "PUBLISHED",
          reason: "Cleared publish threshold.",
          edgeIndex: 72,
          confidence: 88,
          evaluatedAt,
          modelVersion: "v5.1.0",
          game: game(),
          pick: { selection: "BOS -1.5", confidence: 88 },
        },
      ]);
  
      const result = await loadBoardState(new Date("2026-05-22T18:00:00.000Z"), proViewer);
  
      // One fixture, one row — the free visitor and the subscriber can no longer
      // be shown 57 LEAN and 88 STRONG_PLAY for the same game.
      expect(result.data.publishedToday).toHaveLength(1);
      expect(result.data.publishedToday[0]!.confidence).toBe(88);
      // The board's own numbers describe the rows it actually shows. Deduping
      // after the counts were taken would leave these disagreeing.
      expect(result.data.openPicks).toBe(1);
      expect(result.data.sportsWatched).toBe(1);
    });
  
    it("asks the database only for decisions on games that were not merged away", async () => {
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([]);
  
      await loadBoardState(new Date("2026-05-22T18:00:00.000Z"), proViewer);
  
      const where = mocks.gateDecisionFindMany.mock.calls[0]?.[0]?.where as {
        game?: { mergedIntoGameId?: null };
      };
      expect(where.game?.mergedIntoGameId).toBeNull();
    });
  });
});
