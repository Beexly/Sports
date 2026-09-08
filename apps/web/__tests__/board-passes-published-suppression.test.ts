import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gateDecisionFindMany: vi.fn(),
  gateDecisionGroupBy: vi.fn(),
  gameFindMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany, groupBy: mocks.gateDecisionGroupBy },
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
    mocks.gateDecisionGroupBy.mockReset();
    mocks.gateDecisionGroupBy.mockResolvedValue([]);
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
    mocks.gateDecisionGroupBy.mockResolvedValue([
      { gameId: "g-withdrawn", _max: { evaluatedAt: new Date("2026-09-07T15:00:00.000Z") } },
    ]);
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({ id: "older-gated", gameId: "g-withdrawn", evaluatedAt: new Date("2026-09-07T14:00:00.000Z") }),
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual([]);
  });

  it("still lists a NEWER gated evaluation made after the withdrawal", async () => {
    // The positive control, and the reason the rule is chronological rather
    // than a blanket exclusion: a gated evaluation made AFTER we withdrew
    // really is the fixture's current state, and hiding it would make the pass
    // list silent about a game it has an honest answer for.
    mocks.gateDecisionGroupBy.mockResolvedValue([
      { gameId: "g-withdrawn", _max: { evaluatedAt: new Date("2026-09-07T15:00:00.000Z") } },
    ]);
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({ id: "newer-gated", gameId: "g-withdrawn", evaluatedAt: new Date("2026-09-07T16:00:00.000Z") }),
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["newer-gated"]);
  });

  it("a publication that is STILL LIVE does not suppress by chronology", async () => {
    // A live publication is handled at the query, which drops the fixture
    // entirely. If it ALSO fed the chronology map, then a row the query never
    // returned would be silently doing work here, and a later refactor of that
    // relation would change this file's behaviour invisibly. Pinned so the two
    // mechanisms stay separable.
    // A live publication never reaches the watermark at all: the groupBy filter
    // selects only withdrawn or broken-link rows, so it returns nothing here.
    mocks.gateDecisionGroupBy.mockResolvedValue([]);
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({ id: "older-gated", gameId: "g-live", evaluatedAt: new Date("2026-09-07T14:00:00.000Z") }),
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["older-gated"]);

    // And the SEPARATION is pinned at the query: the watermark must ask only
    // for withdrawn publications, never for every published decision.
    const where = (mocks.gateDecisionGroupBy.mock.calls[0]?.[0] as {
      where: { OR?: Array<Record<string, unknown>> };
    }).where;
    expect(where.OR).toEqual([{ pick: null }, { pick: { isPublished: false } }]);
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

    const gatedCall = mocks.gateDecisionFindMany.mock.calls[0];
    const orderBy = (gatedCall?.[0] as { orderBy?: Array<Record<string, string>> }).orderBy;
    expect(orderBy).toEqual([{ evaluatedAt: "desc" }, { id: "desc" }]);
  });

  it("computes the withdrawal watermark in the DATABASE, so no cap can truncate it", async () => {
    // REVIEW ROUND 36 (CodeRabbit, #719), and it is a defect I introduced in the
    // fix one round earlier. The watermark used to come from a second findMany
    // with take:500 and NO ordering - a cap applied before the per-fixture
    // collapse, which is the same class of bug this file keeps producing.
    // Production holds 811 PUBLISHED decisions, so an arbitrary 500 would have
    // been kept and any fixture whose withdrawal fell outside that slice would
    // have shown its OLD gated row as a current pass: the exact false claim the
    // query exists to prevent, reintroduced by the query itself.
    //
    // groupBy takes max(evaluatedAt) per gameId in the database. There is no
    // window to truncate, so this asserts on the SHAPE of the call rather than
    // on an output, because "there is no cap" is a property of the query.
    mocks.gateDecisionFindMany.mockResolvedValue([]);

    await loadBoardPasses(NOW, { includeNoBetDetail: false });

    expect(mocks.gateDecisionGroupBy).toHaveBeenCalledTimes(1);
    const call = mocks.gateDecisionGroupBy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.by).toEqual(["gameId"]);
    expect(call._max).toEqual({ evaluatedAt: true });
    expect(call).not.toHaveProperty("take");
    // And the gated lane is the only findMany left, so a reader cannot confuse
    // the two queries again.
    expect(mocks.gateDecisionFindMany).toHaveBeenCalledTimes(1);
  });

  it("PINS A KNOWN GAP: a gated evaluation made while the pick was LIVE still lists after withdrawal", async () => {
    // REVIEW ROUND 37 (Devin, #719). CONFIRMED, and deliberately NOT fixed in
    // this file. The watermark carries the PUBLICATION's evaluatedAt, never the
    // WITHDRAWAL's, because Pick.isPublished is a bare Boolean with no
    // timestamp beside it. Two different histories therefore produce identical
    // rows, and only one of them is honestly a pass:
    //
    //   published 12:00 -> gated 14:00 -> withdrawn 16:00   a pick was LIVE at 14:00
    //   published 12:00 -> withdrawn 13:00 -> gated 14:00   the gated row is current
    //
    // The lane lists the gated row in both, so the first case shows "we passed
    // on this" for an evaluation made while a subscriber could see the pick.
    //
    // THIS EXPECTATION IS THE DEFECT, not the contract. It should FAIL and be
    // replaced when C-158's provenance column lands: with an `unpublishedAt`
    // the first history suppresses and the second still displays.
    mocks.gateDecisionGroupBy.mockResolvedValue([
      { gameId: "g-withdrawn-late", _max: { evaluatedAt: new Date("2026-09-07T12:00:00.000Z") } },
    ]);
    mocks.gateDecisionFindMany.mockResolvedValue([
      decision({
        id: "gated-while-live",
        gameId: "g-withdrawn-late",
        evaluatedAt: new Date("2026-09-07T14:00:00.000Z"),
      }),
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.id)).toEqual(["gated-while-live"]);
  });

  it("lists a contest ONCE even when the table holds several rows for it (C-171)", async () => {
    // The fallback lane's own collapse keys on gameId (`dedupePassesByGame`),
    // which is exactly what two rows for one contest do NOT share. Three
    // writers key `games` on three externalId shapes, about 2.5 rows per real
    // fixture, and NOTHING is tombstoned - so the pass list showed the same
    // matchup two or three times, each row carrying its own reason. That is the
    // C-117 contradiction, in the lane C-117 did not reach.
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([
      {
        id: "g-odds",
        externalId: "9f2c4d1e8b7a6c5d4e3f2a1b0c9d8e7f",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Denver Broncos",
        commenceTime: new Date("2026-09-07T21:00:00.000Z"),
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: NOW,
        currentEdgeIndex: 44,
        bookmakerCoverageMax: 6,
        dataQualityScore: 80,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        _count: { picks: 0, odds: 3, oddsLineSnapshots: 0 },
      },
      {
        id: "g-espn",
        externalId: "espn:nfl:401772936",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Denver Broncos",
        commenceTime: new Date("2026-09-07T21:05:00.000Z"),
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        updatedAt: NOW,
        currentEdgeIndex: 44,
        bookmakerCoverageMax: 1,
        dataQualityScore: 40,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        _count: { picks: 0, odds: 0, oddsLineSnapshots: 0 },
      },
    ]);

    const payload = await loadBoardPasses(NOW, { includeNoBetDetail: false });
    expect(payload.data.passes.map((p) => p.gameId)).toEqual(["g-odds"]);
  });

  it("scans wider than it lists, and excludes tombstoned rows in THIS lane", async () => {
    // Asserted on the query. The cap has to bound rows SCANNED, or the collapse
    // runs on an already-truncated slice and the lane shows fewer fixtures than
    // it should. The canonicity filter is safe HERE because this is a display
    // lane - unlike the score lane (C-170), where it would strand settlement.
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([]);

    await loadBoardPasses(NOW, { includeNoBetDetail: false });

    const call = mocks.gameFindMany.mock.calls[0]?.[0] as {
      take: number;
      where: { mergedIntoGameId?: unknown };
      include: { sport: { select: Record<string, unknown> } };
    };
    expect(call.take).toBeGreaterThan(100);
    expect(call.where.mergedIntoGameId).toBeNull();
    // The sport KEY drives the twin window; without it baseball would take the
    // 18h default and a doubleheader would collapse into one contest.
    expect(call.include.sport.select).toMatchObject({ key: true });
  });

  it("does not describe a WITHDRAWN fixture as unevaluated in the fallback lane (C-175)", async () => {
    // Devin Review, #719. The fallback relation excludes a LIVE published pick
    // only, so a withdrawn one made its fixture match again - and this lane's
    // reason text says the game was not evaluated, which is false about a game
    // we published and then withdrew. Asserted on the QUERY, because the
    // exclusion has to happen in the database: filtering afterwards would
    // shrink the scan window and drop genuine passes off the end.
    mocks.gateDecisionGroupBy.mockResolvedValue([
      { gameId: "g-withdrawn", _max: { evaluatedAt: new Date("2026-09-07T15:00:00.000Z") } },
    ]);
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([]);

    await loadBoardPasses(NOW, { includeNoBetDetail: false });

    const where = (mocks.gameFindMany.mock.calls[0]?.[0] as {
      where: { id?: { notIn?: string[] } };
    }).where;
    expect(where.id?.notIn).toEqual(["g-withdrawn"]);
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
