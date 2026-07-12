/**
 * O-6 — non-vacuous board loader tests.
 *
 * The stub-mode route tests assert EMPTY results against the stub Prisma
 * client, which returns empty for every query — so they pass whether or not
 * the where-clauses, lane mapping, or suppression logic are correct. These
 * tests close that hole with POPULATED fixtures:
 *
 *   1. With data present and no suppression, the loaders must RETURN it,
 *      correctly laned/mapped (a broken where-clause or mapper now fails).
 *   2. With data present and demo suppression active, the loaders must
 *      suppress WITHOUT QUERYING — proving suppression wins over data
 *      presence, not merely coinciding with stub emptiness.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  gateDecisionFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  pickFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    pick: { findMany: mocks.pickFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
}));

// The stale kill-switch is a separate suppression lane — hold it open here.
vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: async () => false,
}));

import { loadBoardState } from "@/lib/board/state";
import { loadBoardPasses } from "@/lib/board/passes";

const NOW = new Date("2026-07-11T15:00:00.000Z");

function sportRel(name: string) {
  return { name };
}

function gameRel(over: Record<string, unknown> = {}) {
  return {
    id: "game-1",
    awayTeamName: "Raiders",
    homeTeamName: "Chiefs",
    sport: sportRel("NFL"),
    currentEdgeIndex: 61,
    bookmakerCoverageMax: 7,
    dataQualityScore: 92,
    updatedAt: NOW,
    commenceTime: new Date("2026-07-11T23:00:00.000Z"),
    status: "SCHEDULED",
    ...over,
  };
}

function decision(over: Record<string, unknown> = {}) {
  return {
    id: "dec-1",
    gameId: "game-1",
    status: "PUBLISHED",
    reason: null,
    edgeIndex: 63,
    confidence: 71,
    modelVersion: "v5.1.0",
    evaluatedAt: NOW,
    isBootstrap: false,
    game: gameRel(),
    pick: { selection: "Chiefs -3.5", confidence: 71 },
    ...over,
  };
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.isStubMode.mockReturnValue(false);
  mocks.isDemoPicksEnabled.mockReturnValue(false);
  mocks.gateDecisionFindMany.mockResolvedValue([]);
  mocks.pickFindMany.mockResolvedValue([]);
  mocks.gameFindMany.mockResolvedValue([]);
  delete process.env["FORCE_NO_BET_IF_STALE"];
});

describe("loadBoardState with a POPULATED db (O-6)", () => {
  it("lanes gate decisions and derives the counts — data must come THROUGH", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision(),
      decision({
        id: "dec-2",
        gameId: "game-2",
        status: "GATED",
        reason: "Market depth below threshold",
        game: gameRel({ id: "game-2", sport: sportRel("MLB"), awayTeamName: "Guardians", homeTeamName: "Marlins" }),
        pick: null,
      }),
      decision({ id: "dec-3", gameId: "game-3", status: "SCORING", game: gameRel({ id: "game-3" }), pick: null }),
    ]);

    const payload = await loadBoardState(NOW);

    expect(payload.meta.suppressedDemoData).toBeUndefined();
    expect(payload.data.publishedToday).toHaveLength(1);
    expect(payload.data.gatedTodayRows).toHaveLength(1);
    expect(payload.data.scoringNow).toHaveLength(1);
    expect(payload.data.openPicks).toBe(1);
    expect(payload.data.gatedToday).toBe(1);
    expect(payload.data.sportsWatched).toBe(2); // NFL + MLB
    expect(payload.data.publishedToday[0]).toMatchObject({
      matchup: "Raiders @ Chiefs",
      market: "Chiefs -3.5",
      confidence: 71,
      gateReason: null,
    });
    expect(payload.data.gatedTodayRows[0]!.gateReason).toBe("Market depth below threshold");
    expect(payload.data.modelVersion).toBe("v5.1.0");
  });

  it("falls back to pick/game queries when no decisions exist — and still returns data", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([
      {
        id: "pick-1",
        gameId: "game-1",
        selection: "Chiefs -3.5",
        confidence: 68,
        edgeScore: 60,
        generatedAt: NOW,
        game: gameRel(),
      },
    ]);
    mocks.gameFindMany.mockResolvedValue([gameRel({ id: "game-9" })]);

    const payload = await loadBoardState(NOW);

    expect(payload.data.publishedToday).toHaveLength(1);
    expect(payload.data.publishedToday[0]!.market).toBe("Chiefs -3.5");
    expect(payload.data.scoringNow.length).toBeGreaterThan(0);
  });

  it("demo suppression EMPTIES a populated board and never queries the db", async () => {
    mocks.isStubMode.mockReturnValue(true);
    mocks.isDemoPicksEnabled.mockReturnValue(true);
    mocks.gateDecisionFindMany.mockResolvedValue([decision()]); // data EXISTS

    const payload = await loadBoardState(NOW);

    expect(payload.meta.suppressedDemoData).toBe(true);
    expect(payload.data.publishedToday).toEqual([]);
    expect(payload.data.scoringNow).toEqual([]);
    expect(payload.data.gatedTodayRows).toEqual([]);
    expect(payload.data.openPicks).toBe(0);
    // The strongest form of the pin: suppression short-circuits BEFORE any
    // query — the empty board is a decision, not a coincidence of stub data.
    expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });
});

describe("loadBoardPasses with a POPULATED db (O-6)", () => {
  it("maps GATED decisions into pass rows — data must come THROUGH", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({ status: "GATED", reason: "Books disagree beyond tolerance", pick: undefined }),
    ]);

    const payload = await loadBoardPasses(NOW);

    expect(payload.meta.suppressedDemoData).toBeUndefined();
    expect(payload.data.passes).toHaveLength(1);
    expect(payload.data.passes[0]).toMatchObject({
      matchup: "Raiders @ Chiefs",
      sport: "NFL",
      reason: "Books disagree beyond tolerance",
    });
    expect(payload.data.date).toBe("2026-07-11");
  });

  it("derives pass reasons from game thresholds on the fallback path", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([
      gameRel({ id: "thin", bookmakerCoverageMax: 2, dataQualityScore: 95 }),
      gameRel({ id: "lowdq", bookmakerCoverageMax: 6, dataQualityScore: 50 }),
    ]);

    const payload = await loadBoardPasses(NOW);

    expect(payload.data.passes).toHaveLength(2);
    expect(payload.data.passes[0]!.reason).toBe("Market depth below publish threshold.");
    expect(payload.data.passes[1]!.reason).toBe("Evidence health below publish threshold.");
  });

  it("demo suppression EMPTIES a populated pass list and never queries the db", async () => {
    mocks.isStubMode.mockReturnValue(true);
    mocks.isDemoPicksEnabled.mockReturnValue(true);
    mocks.gateDecisionFindMany.mockResolvedValue([decision({ status: "GATED" })]);

    const payload = await loadBoardPasses(NOW);

    expect(payload.meta.suppressedDemoData).toBe(true);
    expect(payload.data.passes).toEqual([]);
    expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });
});
