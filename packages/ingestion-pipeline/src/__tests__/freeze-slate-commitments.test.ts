import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSlateCommitment, dailySlateKey } from "@sports/prediction-engine";

/**
 * Behavioral tests for freezeSlateCommitments — the ingestion-cycle pass that
 * freezes one immutable commit-reveal Merkle commitment per (sport, UTC day).
 *
 * The DB is mocked (settle-sport.test.ts pattern), but the commitment math is
 * REAL: expected roots/counts come from the actual buildSlateCommitment via
 * the actual planSlateCommitment planner — nothing about the Merkle spine is
 * stubbed. Pins the invariants the module promises:
 *
 *   - commits a fresh pre-kickoff slate (create called once, real root/count)
 *   - backfills slateKey onto EXACTLY the covered receipts
 *   - skips when a commitment already exists (freeze-once immutability)
 *   - skips on a zero-game day
 *   - skips (with the planner's reason) once the first game has started
 *   - a thrown DB error is caught, logged, and never aborts the sport loop
 *   - a unique-violation on create (concurrent freeze race) is a logged SKIP
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  slateFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  slateCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  receiptFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  receiptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany },
    slateCommitment: { findUnique: mocks.slateFindUnique, create: mocks.slateCreate },
    pickProofReceipt: { findMany: mocks.receiptFindMany, updateMany: mocks.receiptUpdateMany },
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
// 10:00Z on the slate day — games kick off at 17:00Z, so the slate is pre-result.
const NOW = new Date("2026-07-02T10:00:00.000Z");
const SLATE_KEY = dailySlateKey(SPORT, NOW.toISOString()); // AMERICANFOOTBALL_NFL:2026-07-02

const GAMES = [
  { id: "game-1", commenceTime: new Date("2026-07-02T17:00:00.000Z") },
  { id: "game-2", commenceTime: new Date("2026-07-02T20:00:00.000Z") },
];

const RECEIPTS = [
  { pickId: "pick-1", payload: "payload-one" },
  { pickId: "pick-2", payload: "payload-two" },
];

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.gameFindMany.mockResolvedValue(GAMES);
  mocks.slateFindUnique.mockResolvedValue(null);
  mocks.receiptFindMany.mockResolvedValue(RECEIPTS);
  mocks.slateCreate.mockResolvedValue({ id: "slate-row-1" });
  mocks.receiptUpdateMany.mockResolvedValue({ count: RECEIPTS.length });
});

describe("freezeSlateCommitments", () => {
  it("commits a fresh pre-kickoff slate with the REAL Merkle root and count", async () => {
    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    // The expected commitment, computed by the real math over the same leaves.
    const expected = buildSlateCommitment(SLATE_KEY, NOW.toISOString(), RECEIPTS, testHash);

    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
    expect(mocks.slateCreate).toHaveBeenCalledWith({
      data: {
        slateKey: SLATE_KEY,
        root: expected.root,
        count: 2,
        committedAt: NOW,
      },
    });
    expect(results).toEqual([{ slateKey: SLATE_KEY, action: "COMMIT", count: 2 }]);
  });

  it("backfills slateKey onto EXACTLY the covered pickIds", async () => {
    await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.receiptUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.receiptUpdateMany).toHaveBeenCalledWith({
      where: { pickId: { in: ["pick-1", "pick-2"] } },
      data: { slateKey: SLATE_KEY },
    });
  });

  it("skips when a commitment already exists (freeze-once immutability)", async () => {
    mocks.slateFindUnique.mockResolvedValue({ id: "already-frozen" });

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(mocks.receiptUpdateMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: SLATE_KEY, action: "SKIP", reason: expect.stringMatching(/immutable|frozen/i) },
    ]);
  });

  it("skips when the sport has no games on today's UTC slate", async () => {
    mocks.gameFindMany.mockResolvedValue([]);

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateFindUnique).not.toHaveBeenCalled();
    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: SLATE_KEY, action: "SKIP", reason: expect.stringMatching(/no games/i) },
    ]);
  });

  it("skips with the planner's reason once the earliest game already started", async () => {
    // now (10:00Z) is AFTER the earliest kickoff (09:00Z) — committing now
    // would be a fake pre-registration, so the planner must refuse.
    mocks.gameFindMany.mockResolvedValue([
      { id: "game-early", commenceTime: new Date("2026-07-02T09:00:00.000Z") },
      { id: "game-late", commenceTime: new Date("2026-07-02T21:00:00.000Z") },
    ]);
    mocks.receiptFindMany.mockResolvedValue(RECEIPTS);

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: SLATE_KEY, action: "SKIP", reason: expect.stringMatching(/already started/i) },
    ]);
  });

  it("skips when the slate's games have no receipts to commit", async () => {
    mocks.receiptFindMany.mockResolvedValue([]);

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(mocks.slateCreate).not.toHaveBeenCalled();
    expect(results).toEqual([
      { slateKey: SLATE_KEY, action: "SKIP", reason: expect.stringMatching(/no receipts/i) },
    ]);
  });

  it("catches a thrown DB error, logs it, and continues to the next sport", async () => {
    const otherSport = "basketball_nba";
    const otherKey = dailySlateKey(otherSport, NOW.toISOString());
    // First sport's game query explodes; the second sport must still commit.
    mocks.gameFindMany
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(GAMES);

    const results = await freezeSlateCommitments([SPORT, otherSport], NOW, testHash);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("connection reset"));
    expect(results).toEqual([
      {
        slateKey: SLATE_KEY,
        action: "SKIP",
        reason: expect.stringContaining("connection reset"),
      },
      { slateKey: otherKey, action: "COMMIT", count: 2 },
    ]);
    // The failure never propagated and never blocked the second sport's create.
    expect(mocks.slateCreate).toHaveBeenCalledTimes(1);
  });

  it("treats a unique-violation on create as a logged SKIP (concurrent freeze race)", async () => {
    mocks.slateCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on slateKey"), { code: "P2002" }),
    );

    const results = await freezeSlateCommitments([SPORT], NOW, testHash);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(SLATE_KEY));
    // The other writer won — no backfill from this loser, and no throw.
    expect(mocks.receiptUpdateMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      {
        slateKey: SLATE_KEY,
        action: "SKIP",
        reason: expect.stringMatching(/concurrent/i),
      },
    ]);
  });
});
