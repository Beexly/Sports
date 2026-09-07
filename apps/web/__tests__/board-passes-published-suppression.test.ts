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

  it("does NOT list an OLDER gated evaluation once its publication is withdrawn", async () => {
    // THE FOURTEENTH SIBLING-LANE INSTANCE (CodeRabbit, #719).
    //
    // The query excludes a game with a LIVE published pick. That is no rule at
    // all for a WITHDRAWN one: unpublishing the pick makes the relation match
    // again, and the older gated evaluation reappears as a current pass. "We
    // passed on this" is then false in the strongest way this list can be
    // false, because we evaluated it, published it, and then withdrew it.
    // C-149 fixed exactly this in the state loader and left its twin here.
    mocks.gateDecisionFindMany.mockImplementation((args: { where: { status?: string } }) =>
      Promise.resolve(
        args.where.status === "PUBLISHED"
          ? [
              {
                gameId: "g-withdrawn",
                evaluatedAt: new Date("2026-09-07T15:00:00.000Z"),
                status: "PUBLISHED",
                pick: { isPublished: false },
              },
            ]
          : [decision({ id: "older-gated", gameId: "g-withdrawn", evaluatedAt: new Date("2026-09-07T14:00:00.000Z") })],
      ),
    );

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual([]);
  });

  it("still lists a NEWER gated evaluation made after the withdrawal", async () => {
    // The positive control, and the reason the rule is chronological rather
    // than a blanket exclusion: a gated evaluation made AFTER we withdrew
    // really is the fixture's current state, and hiding it would make the pass
    // list silent about a game it has an honest answer for.
    mocks.gateDecisionFindMany.mockImplementation((args: { where: { status?: string } }) =>
      Promise.resolve(
        args.where.status === "PUBLISHED"
          ? [
              {
                gameId: "g-withdrawn",
                evaluatedAt: new Date("2026-09-07T15:00:00.000Z"),
                status: "PUBLISHED",
                pick: { isPublished: false },
              },
            ]
          : [decision({ id: "newer-gated", gameId: "g-withdrawn", evaluatedAt: new Date("2026-09-07T16:00:00.000Z") })],
      ),
    );

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["newer-gated"]);
  });

  it("a publication that is STILL LIVE does not suppress by chronology", async () => {
    // A live publication is handled at the query, which drops the fixture
    // entirely. If it ALSO fed the chronology map, then a row the query never
    // returned would be silently doing work here, and a later refactor of that
    // relation would change this file's behaviour invisibly. Pinned so the two
    // mechanisms stay separable.
    mocks.gateDecisionFindMany.mockImplementation((args: { where: { status?: string } }) =>
      Promise.resolve(
        args.where.status === "PUBLISHED"
          ? [
              {
                gameId: "g-live",
                evaluatedAt: new Date("2026-09-07T15:00:00.000Z"),
                status: "PUBLISHED",
                pick: { isPublished: true },
              },
            ]
          : [decision({ id: "older-gated", gameId: "g-live", evaluatedAt: new Date("2026-09-07T14:00:00.000Z") })],
      ),
    );

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["older-gated"]);
  });

  it("orders the query by a TOTAL order, so an evaluatedAt tie has one winner", async () => {
    // Asserted on the QUERY, not on the output, and that is the whole point.
    // dedupePassesByGame does not re-sort by design, so determinism can only
    // come from the database ordering. A test that shuffled a JS array and
    // expected a stable winner would be asserting a property this code
    // deliberately does not have (Devin Review, #719).
    //
    // Measured before the fix: zero of the 356 GATED decisions in production
    // share a (gameId, evaluatedAt) pair, so this is latent rather than live.
    mocks.gateDecisionFindMany.mockResolvedValue([]);

    await loadBoardPasses(NOW, { includeNoBetDetail: false });

    const gatedCall = mocks.gateDecisionFindMany.mock.calls.find(
      (call) => (call[0] as { where: { status?: string } }).where.status === "GATED",
    );
    const orderBy = (gatedCall?.[0] as { orderBy?: Array<Record<string, string>> }).orderBy;
    expect(orderBy).toEqual([{ evaluatedAt: "desc" }, { id: "desc" }]);
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
