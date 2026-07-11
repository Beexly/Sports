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
      data: { slateKey: TODAY_KEY, root: expected.root, count: 2, committedAt: NOW },
    });
    // ATOMICITY (hostile-review fix): create + backfill ride ONE transaction.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![0]).toHaveLength(2);
    expect(results).toEqual([
      { slateKey: TODAY_KEY, action: "COMMIT", count: 2 },
      NO_GAMES_TOMORROW,
    ]);
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

  describe("M-F2: a pre-mint-hour run must not front-run the 10:00 mint on today's slate", () => {
    // The 07:00 UTC settle-picks freeze shot. Same slate day as NOW (10:00).
    const SEVEN_AM = new Date("2026-07-02T07:00:00.000Z");

    it("(a) 07:00 run DEFERS today's slate when every kickoff is after the mint run's reach", async () => {
      // Kickoffs 17:00/20:00 — well past the mint run's 12:00 reach. Freezing
      // at 07:00 would seal yesterday's population and lock the 10:00 mint
      // out of the root forever (freeze-once). Must defer, not commit.
      const results = await freezeSlateCommitments([SPORT], SEVEN_AM, testHash);

      expect(mocks.slateCreate).not.toHaveBeenCalled();
      expect(results).toEqual([
        { slateKey: TODAY_KEY, action: "SKIP", reason: expect.stringMatching(/deferred.*mint/i) },
        NO_GAMES_TOMORROW,
      ]);
    });

    it("(b) the 10:00 mint run then freezes the SAME slate with its full population", async () => {
      // Identical slate, NOW = the mint hour: the deferral must not apply.
      const results = await freezeSlateCommitments([SPORT], NOW, testHash);

      expect(mocks.slateCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ slateKey: TODAY_KEY, count: 2 }),
      });
      expect(results[0]).toEqual({ slateKey: TODAY_KEY, action: "COMMIT", count: 2 });
    });

    it("(c) 07:00 run SEALS today's slate when a kickoff precedes the mint run's reach", async () => {
      // A 09:00 UTC kickoff (before the 12:00 reach): waiting for the mint
      // run would publish the root post-kickoff — a fake pre-registration.
      // Seal NOW with the existing population; that trade is deliberate.
      mocks.gameFindMany.mockImplementation(
        gamesInWindow([
          { id: "game-early", commenceTime: new Date("2026-07-02T09:00:00.000Z") },
          { id: "game-late", commenceTime: new Date("2026-07-02T21:00:00.000Z") },
        ]),
      );
      mocks.receiptFindMany.mockImplementation(
        receiptsForGames([{ pickId: "pick-e", payload: "p-e", gameId: "game-early" }]),
      );

      const results = await freezeSlateCommitments([SPORT], SEVEN_AM, testHash);

      expect(mocks.slateCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ slateKey: TODAY_KEY, count: 1 }),
      });
      expect(results[0]).toEqual({ slateKey: TODAY_KEY, action: "COMMIT", count: 1 });
    });

    it("(d) offset-1 behavior is unchanged from a 07:00 run (early-UTC tomorrow still frozen, late tomorrow still deferred)", async () => {
      // Primetime case: tomorrow 03:00Z kickoff must still freeze early.
      const nightGame = [{ id: "game-west", commenceTime: new Date("2026-07-03T03:00:00.000Z") }];
      mocks.gameFindMany.mockImplementation(gamesInWindow(nightGame));
      mocks.receiptFindMany.mockImplementation(
        receiptsForGames([{ pickId: "pick-w", payload: "payload-w", gameId: "game-west" }]),
      );
      const early = await freezeSlateCommitments([SPORT], SEVEN_AM, testHash);
      expect(early[1]).toEqual({ slateKey: TOMORROW_KEY, action: "COMMIT", count: 1 });

      // Late-tomorrow case: still deferred to its own day, same reason string.
      mocks.slateCreate.mockClear();
      mocks.gameFindMany.mockImplementation(
        gamesInWindow([{ id: "game-late", commenceTime: new Date("2026-07-03T20:00:00.000Z") }]),
      );
      const late = await freezeSlateCommitments([SPORT], SEVEN_AM, testHash);
      expect(mocks.slateCreate).not.toHaveBeenCalled();
      expect(late[1]).toEqual({
        slateKey: TOMORROW_KEY,
        action: "SKIP",
        reason: "deferred: own-day run can still freeze it",
      });
    });

    it("(e) TRAP PIN: the mint run itself must NEVER defer offset 0 — even though now < runReach still holds at 10:00", async () => {
      // The tempting implementation (`now < runReach`, mirroring offset 1)
      // is still TRUE at the 10:00 run (10:00 < 12:00) — offset 0 would
      // defer at 07:00 AND at 10:00, and nothing would ever freeze today's
      // slate. The guard must key on the mint HOUR. NOW is exactly 10:00
      // with kickoffs ≥ runReach; a deferral here means the trap shipped.
      const results = await freezeSlateCommitments([SPORT], NOW, testHash);

      expect(results[0]!.action).toBe("COMMIT");
      expect(results[0]!.reason ?? "").not.toMatch(/deferred/i);
    });
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
});
