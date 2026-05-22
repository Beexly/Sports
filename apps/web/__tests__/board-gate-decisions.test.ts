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
}));

import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState } from "@/lib/board/state";

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

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));

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
});
