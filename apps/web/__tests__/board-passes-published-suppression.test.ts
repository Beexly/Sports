import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gateDecisionFindMany: vi.fn(),
  gameFindMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: () => false,
}));

import { dedupePassesByGame, loadBoardPasses } from "@/lib/board/passes";

const NOW = new Date("2026-09-07T20:00:00.000Z");

/**
 * THE THIRTEENTH SIBLING-LANE INSTANCE (Devin Review, #719).
 *
 * The board page loads two things independently: the state loader, which shows
 * published picks and gated rows, and this pass loader, which shows "evaluated
 * without publishing". c0cfa2b07 gave the STATE loader published-suppression and
 * left the pass loader without it, so a subscriber could see a live published
 * pick in one section and "we passed on this" for the same fixture in the other.
 *
 * The detail that makes it worth a regression test rather than a one-line fix:
 * `publishedPickRelation` was already DECLARED in passes.ts and applied only to
 * the fallback game query further down. The exclusion existed in the file and
 * simply was not wired to the decision query above it.
 *
 * Every value below is a labelled fixture.
 */

const decision = (over: Record<string, unknown> = {}) => ({
  id: "dec-fixture",
  gameId: "game-fixture",
  edgeIndex: 40,
  reason: "Fixture reason: edge below threshold",
  reasonCode: "EDGE_BELOW_THRESHOLD",
  confidence: 51,
  modelVersion: "v5.2.7",
  evidenceRefs: null,
  evaluatedAt: new Date("2026-09-07T12:00:00.000Z"),
  game: {
    homeTeamName: "Fixture Home Sox",
    awayTeamName: "Fixture Away Jays",
    currentEdgeIndex: 40,
    sport: { name: "MLB" },
  },
  ...over,
});

describe("dedupePassesByGame", () => {
  it("keeps the first row per fixture, which is the newest under the query's ordering", () => {
    const out = dedupePassesByGame([
      { gameId: "g1", id: "newest" },
      { gameId: "g1", id: "older" },
      { gameId: "g2", id: "other" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["newest", "other"]);
  });

  it("does NOT re-sort, so a query ordering mistake surfaces instead of hiding", () => {
    // Deliberate: if this function sorted defensively, someone could drop
    // `orderBy evaluatedAt desc` from the query and the bug would be invisible.
    const out = dedupePassesByGame([
      { gameId: "g1", id: "whatever-came-first" },
      { gameId: "g1", id: "second" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["whatever-came-first"]);
  });

  it("passes an already-unique list through untouched", () => {
    const rows = [{ gameId: "a", id: "1" }, { gameId: "b", id: "2" }];
    expect(dedupePassesByGame(rows)).toEqual(rows);
  });
});

describe("loadBoardPasses — a game with a published pick is not a pass", () => {
  beforeEach(() => {
    mocks.gateDecisionFindMany.mockReset();
    mocks.gameFindMany.mockReset();
    mocks.gameFindMany.mockResolvedValue([]);
  });

  it("excludes games carrying a published pick AT THE QUERY", () => {
    // Asserted on the where clause rather than the output, because the exclusion
    // has to happen in the database: filtering afterwards would silently shrink
    // the `take: 100` window and drop genuine passes off the end of the list.
    mocks.gateDecisionFindMany.mockResolvedValue([]);

    return loadBoardPasses(NOW, { includeNoBetDetail: false }).then(() => {
      const where = (mocks.gateDecisionFindMany.mock.calls[0]?.[0] as {
        where: { game?: { picks?: { none?: Record<string, unknown> } } };
      }).where;
      const none = where.game?.picks?.none;
      expect(none).toBeDefined();
      expect(none).toMatchObject({ isPublished: true, isBootstrap: false });
    });
  });

  it("returns ONE pass row for a fixture evaluated several times in a day", async () => {
    // GateDecision has no unique constraint. Without the collapse, one game
    // evaluated four times became four pass rows carrying different reasons and
    // confidences - the same contradiction C-117 fixed on the board itself.
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({ id: "newest", gameId: "g1", confidence: 51, evaluatedAt: new Date("2026-09-07T18:00:00.000Z") }),
      decision({ id: "middle", gameId: "g1", confidence: 62, evaluatedAt: new Date("2026-09-07T14:00:00.000Z") }),
      decision({ id: "oldest", gameId: "g1", confidence: 71, evaluatedAt: new Date("2026-09-07T09:00:00.000Z") }),
      decision({ id: "other-game", gameId: "g2" }),
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["newest", "other-game"]);
  });

  it("keeps genuine passes: a fixture with no published pick still lists", async () => {
    // The control. A suppression that removed everything would also pass the
    // test above, so this pins that the lane still does its job.
    mocks.gateDecisionFindMany.mockResolvedValue([decision({ id: "genuine-pass", gameId: "g9" })]);
    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["genuine-pass"]);
    expect(payload.meta.isSampleData).toBe(false);
  });
});
