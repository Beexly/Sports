import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSlateCommitment, dailySlateKey } from "@sports/prediction-engine";

/**
 * Behavioral tests for freezeSlateCommitments — the ingestion-cycle pass that
 * freezes one immutable commit-reveal Merkle commitment per (sport, UTC day).
 *
 * The DB is mocked (settle-sport.test.ts pattern) with WINDOW-AWARE query
 * mocks (the game mock honors the commenceTime window it is queried with —
 * the module now attempts BOTH today's and tomorrow's UTC slates, so a
 * window-blind mock would leak games across days). The commitment math is
 * REAL: expected roots/counts come from the actual buildSlateCommitment.
 *
 * Invariants pinned (incl. the hostile-review fixes):
 *   - commits a fresh pre-kickoff slate (real root/count)
 *   - TOMORROW'S slate is committable TODAY (the NFL-primetime / NBA-night
 *     fix: early-UTC kickoffs would otherwise poison their own day forever)
 *   - commitment row + receipt backfill are ONE $transaction (atomicity)
 *   - only slateKey-NULL receipts are eligible (one receipt, one slate —
 *     the postponement double-commit guard)
 *   - freeze-once immutability, zero-game skip, post-kickoff skip
 *   - a thrown DB error is caught and never aborts the loop
 *   - a unique-violation (concurrent race) is a logged SKIP
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: { where: { commenceTime: { gte: Date; lt: Date } } }) => Promise<{ id: string; commenceTime: Date }[]>>(),
  slateFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  slateCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  receiptFindMany: vi.fn<(args: { where: { pick: { gameId: { in: string[] } } } }) => Promise<unknown[]>>(),
  receiptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  transaction: vi.fn<(ops: Promise<unknown>[]) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany },
    slateCommitment: { findUnique: mocks.slateFindUnique, create: mocks.slateCreate },
    pickProofReceipt: { findMany: mocks.receiptFindMany, updateMany: mocks.receiptUpdateMany },
    $transaction: mocks.transaction,
  },
}));

import { freezeSlateCommitments } from "../freeze-slate-commitments.js";

/** Same deterministic FNV-1a test hash the slate-commitment unit tests use. */
function testHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const SPORT = "americanfootball_nfl";
// 10:00Z on the slate day — today's games kick off at 17:00Z (pre-result).
const NOW = new Date("2026-07-02T10:00:00.000Z");
const TODAY_KEY = dailySlateKey(SPORT, "2026-07-02T00:00:00.000Z");
const TOMORROW_KEY = dailySlateKey(SPORT, "2026-07-03T00:00:00.000Z");

const TODAY_GAMES = [
  { id: "game-1", commenceTime: new Date("2026-07-02T17:00:00.000Z") },
  { id: "game-2", commenceTime: new Date("2026-07-02T20:00:00.000Z") },
];

const RECEIPTS = [
  { pickId: "pick-1", payload: "payload-one", gameId: "game-1" },
  { pickId: "pick-2", payload: "payload-two", gameId: "game-2" },
];
/** The leaf shape the module selects (pickId + payload) — gameId is for the mock filter only. */
const LEAVES = RECEIPTS.map(({ pickId, payload }) => ({ pickId, payload }));

/** Window-aware default: games exist on TODAY's slate only. */
function gamesInWindow(games: { id: string; commenceTime: Date }[]) {
  return (args: { where: { commenceTime: { gte: Date; lt: Date } } }) =>
    Promise.resolve(
      games.filter(
        (g) => g.commenceTime >= args.where.commenceTime.gte && g.commenceTime < args.where.commenceTime.lt,
      ),
    );
}

/** Game-scoped receipts (F3): the mock honors where.pick.gameId.in, so a
 * slate's leaves are exactly the receipts for THAT slate's games. */
function receiptsForGames(rows: { pickId: string; payload: string; gameId: string }[]) {
  return (args: { where: { pick: { gameId: { in: string[] } } } }) => {
    const ids = args.where.pick.gameId.in;
    return Promise.resolve(
      rows.filter((r) => ids.includes(r.gameId)).map(({ pickId, payload }) => ({ pickId, payload })),
    );
  };
}

const NO_GAMES_TOMORROW = { slateKey: TOMORROW_KEY, action: "SKIP", reason: expect.stringMatching(/no games/i) };

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.gameFindMany.mockImplementation(gamesInWindow(TODAY_GAMES));
  mocks.slateFindUnique.mockResolvedValue(null);
  mocks.receiptFindMany.mockImplementation(receiptsForGames(RECEIPTS));
  mocks.slateCreate.mockResolvedValue({ id: "slate-row-1" });
  mocks.receiptUpdateMany.mockResolvedValue({ count: RECEIPTS.length });
  // Prisma array-transaction: with mocks, the ops are already-created promises.
  mocks.transaction.mockImplementation((ops) => Promise.all(ops));
});

describe("freezeSlateCommitments", () => {
  it("commits a fresh pre-kickoff slate with the REAL Merkle root and count, atomically with the backfill", async () => {
    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    // The module selects pickId + payload (LEAVES) — the real Merkle math
    // over exactly those leaves is the expected root.
    const expected = buildSlateCommitment(TODAY_KEY, NOW.toISOString(), LEAVES, testHash);

    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
    expect(mocks.slateCreate).toHaveBeenCalledWith({
      data: {
        slateKey: TODAY_KEY,
        root: expected.root,
        count: 2,
        committedAt: NOW,
        // Mock receipts carry no edgeScore, so the Pedersen aggregate fails
        // OPEN to nulls — proving the Merkle path is never blocked by it.
        pedersenAggregateHex: null,
        pedersenAggregateValue: null,
        pedersenBlindingSum: null,
      },
    });
    // ATOMICITY (hostile-review fix): create + backfill ride ONE transaction.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![0]).toHaveLength(2);
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "COMMIT", count: 2 },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("persists the MINTED Pedersen aggregate atomically when receipts carry edge scores", async () => {
    // Receipts WITH published edge scores mint a REAL (non-null) aggregate —
    // the public hex + the opener (value + blinding sum) are persisted in the
    // SAME atomic create as the Merkle commitment row (write-once, never
    // backfilled). Only today's slate has games, so only it queries receipts.
    mocks.receiptFindMany.mockResolvedValue([
      { pickId: "pick-1", payload: "payload-one", edgeScore: 61 },
      { pickId: "pick-2", payload: "payload-two", edgeScore: 48 },
    ]);

    await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
    const data = (mocks.slateCreate.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    // All three aggregate fields are persisted (non-null) when a mint succeeds.
    expect(typeof data["pedersenAggregateHex"]).toBe("string");
    expect((data["pedersenAggregateHex"] as string).length).toBeGreaterThan(0);
    expect(typeof data["pedersenAggregateValue"]).toBe("string");
    expect(typeof data["pedersenBlindingSum"]).toBe("string");
    // The mint rides the SAME atomic transaction as the commitment + backfill.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![0]).toHaveLength(2);
  });

  it("PRIMETIME FIX: tomorrow's early-UTC slate is committed TODAY, pre-kickoff", async () => {
    // An NBA game at 7pm PT is 03:00 UTC "tomorrow" — before tomorrow's own
    // 10:00 UTC run — so it MUST be frozen a day early or lost. The night
    // game's receipt is scoped to its own game id (F3: the mock honors the
    // gameId filter), so the leaf set is exactly this slate's.
    const nightGame = [{ id: "game-west", commenceTime: new Date("2026-07-03T03:00:00.000Z") }];
    const nightReceipts = [{ pickId: "pick-w", payload: "payload-w", gameId: "game-west" }];
    mocks.gameFindMany.mockImplementation(gamesInWindow(nightGame));
    mocks.receiptFindMany.mockImplementation(receiptsForGames(nightReceipts));

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
    expect(mocks.slateCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slateKey: TOMORROW_KEY, count: 1 }),
    });
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/no games/i) },
      { slateKey: TOMORROW_KEY, action: "COMMIT", count: 1 },
    ]);
  });

  it("F2 DEFERRAL: a tomorrow slate whose games all start after tomorrow's own run is left to wait", async () => {
    // Night... but LATE: a tomorrow game at 20:00 UTC starts well after
    // tomorrow's ~10:00 UTC run reaches it, so freezing it a day early would
    // only shrink its population. It must be DEFERRED, not committed now.
    const lateGame = [{ id: "game-late", commenceTime: new Date("2026-07-03T20:00:00.000Z") }];
    const lateReceipts = [{ pickId: "pick-l", payload: "payload-l", gameId: "game-late" }];
    mocks.gameFindMany.mockImplementation(gamesInWindow(lateGame));
    mocks.receiptFindMany.mockImplementation(receiptsForGames(lateReceipts));

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/no games/i) },
      { slateKey: TOMORROW_KEY, action: "SKIP", reason: expect.stringMatching(/deferred/i) },
    ]);
  });

  it("ONE RECEIPT, ONE SLATE: leaves and backfill are both restricted to slateKey NULL (postponement guard)", async () => {
    await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.receiptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slateKey: null }),
        orderBy: { pickId: "asc" },
      }),
    );
    expect(mocks.receiptUpdateMany).toHaveBeenCalledWith({
      where: { pickId: { in: ["pick-1", "pick-2"] }, slateKey: null },
      data: { slateKey: TODAY_KEY },
    });
  });

  it("skips when a commitment already exists (freeze-once immutability)", async () => {
    mocks.slateFindUnique.mockResolvedValue({ id: "already-frozen" });

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/immutable|frozen/i) },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("skips when the sport has no games on either slate", async () => {
    mocks.gameFindMany.mockImplementation(gamesInWindow([]));

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateFindUnique).not.toHaveBeenCalled();
    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/no games/i) },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("skips with the planner's reason once the earliest game already started", async () => {
    mocks.gameFindMany.mockImplementation(
      gamesInWindow([
        { id: "game-early", commenceTime: new Date("2026-07-02T09:00:00.000Z") },
        { id: "game-late", commenceTime: new Date("2026-07-02T21:00:00.000Z") },
      ]),
    );
    // Receipts DO exist for these games — so the SKIP is genuinely the
    // post-kickoff gate, not the empty-receipts path (the planner checks
    // empty receipts first).
    mocks.receiptFindMany.mockImplementation(
      receiptsForGames([{ pickId: "pick-e", payload: "p-e", gameId: "game-early" }]),
    );

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/already started/i) },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("skips when the slate's games have no receipts to commit", async () => {
    mocks.receiptFindMany.mockResolvedValue([]);

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/no receipts/i) },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("catches a thrown DB error, logs it, and continues to the next slate/sport", async () => {
    const otherSport = "basketball_nba";
    const otherKey = dailySlateKey(otherSport, "2026-07-02T00:00:00.000Z");
    const otherTomorrow = dailySlateKey(otherSport, "2026-07-03T00:00:00.000Z");
    // First sport's day-0 game query explodes; everything after must proceed.
    mocks.gameFindMany
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockImplementation(gamesInWindow(TODAY_GAMES));

    const results = await freezeSlateCommitments([SPORT, otherSport], NOW, testHash);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("connection reset"));
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringContaining("connection reset") },
      NO_GAMES_TOMORROW,
      { slateKey: otherKey, action: "COMMIT", count: 2 },
      { slateKey: otherTomorrow, action: "SKIP", reason: expect.stringMatching(/no games/i) },
    ]);
    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
  });

  it("treats a unique-violation inside the transaction as a logged SKIP (concurrent freeze race)", async () => {
    mocks.slateCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on slateKey"), { code: "P2002" }),
    );

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(TODAY_KEY));
    // With real Prisma the transaction rolls the backfill back atomically;
    // the mock can only assert the reported outcome (SKIP, never COMMIT).
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/concurrent/i) },
      NO_GAMES_TOMORROW,
    ]);
  });

  it("MIGRATION SAFETY: a pre-migration missing pedersenAggregate column fails the slate gracefully, never throws", async () => {
    // Reproduces the exact historical outage class (#69/#70 -> #71) for the
    // Pedersen columns specifically: the atomic create writes
    // pedersenAggregateHex/Value/BlindingSum, which do not exist in the
    // database until the additive migration is applied (manual, founder-run).
    // This is NOT a unique-violation (isUniqueViolation must say no), so it
    // must fall through to the generic per-slate catch — logged as a SKIP,
    // never escaping freezeSlateCommitments as a throw (which is the
    // "non-fatal by contract" invariant this module documents: a freeze
    // failure must never fail the ingestion cycle).
    mocks.slateCreate.mockRejectedValue(
      Object.assign(
        new Error(
          "The column `slate_commitments.pedersenAggregateHex` does not exist in the current database.",
        ),
        { code: "P2022" },
      ),
    );

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("pedersenAggregateHex"),
    );
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringContaining("pedersenAggregateHex") },
      NO_GAMES_TOMORROW,
    ]);
  });
});
