import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Repair drain for TEAM_GAME_LOG (hardening 6.10) — the one PostSettlementWork
 * kind that had no drain anywhere: a crash between settleSport()'s enqueue and
 * its settleGameLogs() write left the row PENDING forever.
 */

const mocks = vi.hoisted(() => ({
  settleGameLogs: vi.fn<(args: unknown) => Promise<void>>(),
}));

vi.mock("@sports/data-ingestion", () => ({
  settleGameLogs: mocks.settleGameLogs,
}));

import { drainPendingTeamGameLogs } from "../team-game-log-repair.js";

const gates = { canPersistCanonicalHistory: true, minDataQualityForGameLog: 40 };

beforeEach(() => {
  mocks.settleGameLogs.mockReset();
});

describe("drainPendingTeamGameLogs", () => {
  it("returns zeros when no PENDING TEAM_GAME_LOG rows", async () => {
    const db = {
      postSettlementWork: {
        createMany: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(async () => []),
      },
      game: { findMany: vi.fn() },
      openingLine: { findUnique: vi.fn() },
    };
    const r = await drainPendingTeamGameLogs(db as never, gates, { take: 10 });
    expect(r).toEqual({ attempted: 0, done: 0, failed: 0 });
    expect(db.game.findMany).not.toHaveBeenCalled();
  });

  it("drains a final-scored game: writes the log and marks DONE", async () => {
    mocks.settleGameLogs.mockResolvedValue(undefined);
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const db = {
      postSettlementWork: {
        createMany: vi.fn(),
        updateMany,
        findMany: vi.fn(async () => [{ subjectId: "g1" }]),
      },
      game: {
        findMany: vi.fn(async () => [
          {
            id: "g1",
            homeTeamName: "BUF",
            awayTeamName: "KC",
            commenceTime: new Date("2026-08-01T18:00:00Z"),
            homeScore: 24,
            awayScore: 20,
            dataQualityScore: 90,
            sport: { key: "americanfootball_nfl" },
          },
        ]),
      },
      openingLine: { findUnique: vi.fn(async () => ({ spread: -3 })) },
    };

    const r = await drainPendingTeamGameLogs(db as never, gates, { take: 10 });

    expect(r).toEqual({ attempted: 1, done: 1, failed: 0 });
    expect(mocks.settleGameLogs).toHaveBeenCalledWith({
      gameId: "g1",
      homeTeam: "BUF",
      awayTeam: "KC",
      sport: "americanfootball_nfl",
      gameDate: new Date("2026-08-01T18:00:00Z"),
      homeScore: 24,
      awayScore: 20,
      spread: -3,
      isBootstrap: false,
      gameDataQualityScore: 90,
      minDataQualityThreshold: 40,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { subjectId: "g1", kind: "TEAM_GAME_LOG" },
      data: expect.objectContaining({ status: "DONE" }),
    });
  });

  it("marks FAILED (never throws) when settleGameLogs rejects, and keeps draining", async () => {
    mocks.settleGameLogs
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const game = (id: string) => ({
      id,
      homeTeamName: "BUF",
      awayTeamName: "KC",
      commenceTime: new Date("2026-08-01T18:00:00Z"),
      homeScore: 24,
      awayScore: 20,
      dataQualityScore: 90,
      sport: { key: "americanfootball_nfl" },
    });
    const db = {
      postSettlementWork: {
        createMany: vi.fn(),
        updateMany,
        findMany: vi.fn(async () => [{ subjectId: "g1" }, { subjectId: "g2" }]),
      },
      game: { findMany: vi.fn(async () => [game("g1"), game("g2")]) },
      openingLine: { findUnique: vi.fn(async () => ({ spread: -3 })) },
    };

    const r = await drainPendingTeamGameLogs(db as never, gates, { take: 10 });

    expect(r).toEqual({ attempted: 2, done: 1, failed: 1 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { subjectId: "g1", kind: "TEAM_GAME_LOG" },
      data: expect.objectContaining({ status: "FAILED" }),
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { subjectId: "g2", kind: "TEAM_GAME_LOG" },
      data: expect.objectContaining({ status: "DONE" }),
    });
  });

  it("propagates bootstrap mode from gates.canPersistCanonicalHistory", async () => {
    mocks.settleGameLogs.mockResolvedValue(undefined);
    const db = {
      postSettlementWork: {
        createMany: vi.fn(),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findMany: vi.fn(async () => [{ subjectId: "g1" }]),
      },
      game: {
        findMany: vi.fn(async () => [
          {
            id: "g1",
            homeTeamName: "BUF",
            awayTeamName: "KC",
            commenceTime: new Date("2026-08-01T18:00:00Z"),
            homeScore: 24,
            awayScore: 20,
            dataQualityScore: 90,
            sport: { key: "americanfootball_nfl" },
          },
        ]),
      },
      openingLine: { findUnique: vi.fn(async () => null) },
    };

    await drainPendingTeamGameLogs(
      db as never,
      { canPersistCanonicalHistory: false, minDataQualityForGameLog: 40 },
      { take: 10 },
    );

    expect(mocks.settleGameLogs).toHaveBeenCalledWith(
      expect.objectContaining({ isBootstrap: true, spread: null }),
    );
  });
});
