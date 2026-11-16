import { describe, expect, it, vi } from "vitest";
import {
  createDbRateHistoryResolver,
  inferActiveNflSeason,
  type DbPlayerGameStatRow,
} from "@/lib/props/db-rate-history-resolver";

const SAMPLE_ROWS: readonly DbPlayerGameStatRow[] = [
  {
    playerId: "p_cook",
    team: "BUF",
    attempts: null,
    carries: 18,
    receptions: 3,
    receivingYards: 22,
    rushingYards: 94,
    player: { fullName: "James Cook III", recentTeam: "BUF" },
  },
  {
    playerId: "p_cook",
    team: "BUF",
    attempts: null,
    carries: 21,
    receptions: 2,
    receivingYards: 14,
    rushingYards: 112,
    player: { fullName: "James Cook III", recentTeam: "BUF" },
  },
  {
    playerId: "p_mclaurin",
    team: "WAS",
    attempts: null,
    carries: 0,
    receptions: 6,
    receivingYards: 89,
    rushingYards: -2,
    player: { fullName: "Terry McLaurin", recentTeam: "WAS" },
  },
  {
    playerId: "p_mclaurin",
    team: "WAS",
    attempts: null,
    carries: 0,
    receptions: 8,
    receivingYards: 105,
    rushingYards: 5,
    player: { fullName: "Terry McLaurin", recentTeam: "WAS" },
  },
  {
    playerId: "p_smith_kc",
    team: "KC",
    attempts: null,
    carries: 2,
    receptions: 4,
    receivingYards: 44,
    rushingYards: 8,
    player: { fullName: "John Smith", recentTeam: "KC" },
  },
  {
    playerId: "p_smith_kc",
    team: "KC",
    attempts: null,
    carries: 1,
    receptions: 5,
    receivingYards: 51,
    rushingYards: 4,
    player: { fullName: "John Smith", recentTeam: "KC" },
  },
  {
    playerId: "p_smith_det",
    team: "DET",
    attempts: null,
    carries: 1,
    receptions: 2,
    receivingYards: 19,
    rushingYards: 3,
    player: { fullName: "John Smith", recentTeam: "DET" },
  },
  {
    playerId: "p_smith_det",
    team: "DET",
    attempts: null,
    carries: 0,
    receptions: 3,
    receivingYards: 28,
    rushingYards: 0,
    player: { fullName: "John Smith", recentTeam: "DET" },
  },
  {
    playerId: "p_one_game",
    team: "CIN",
    attempts: null,
    carries: 0,
    receptions: 5,
    receivingYards: 67,
    rushingYards: 0,
    player: { fullName: "Single Game Receiver", recentTeam: "CIN" },
  },
];

describe("createDbRateHistoryResolver", () => {
  it("infers NFL season across autumn and post-January calendar dates", () => {
    expect(inferActiveNflSeason(new Date("2026-11-15T18:00:00Z"))).toBe(2026);
    expect(inferActiveNflSeason(new Date("2027-01-18T18:00:00Z"))).toBe(2026);
  });

  it("batches one DB query across props, normalizes WSH/WAS & suffixes, and clamps negative yards", async () => {
    const queryStats = vi.fn(async () => SAMPLE_ROWS);
    const resolveRateHistory = createDbRateHistoryResolver({
      season: 2026,
      isStub: () => false,
      queryStats,
    });

    const cook = await resolveRateHistory({
      playerId: "buf_james_cook",
      playerName: "James Cook",
      team: "BUF",
      propType: "rushing_yards",
      line: 78.5,
    });
    expect(cook).toEqual({
      playerId: "buf_james_cook",
      propType: "rushing_yards",
      line: 78.5,
      games: 1,
      samples: [
        { games: 1, total: 94 },
        { games: 1, total: 112 },
      ],
    });

    const mclaurinRush = await resolveRateHistory({
      playerId: "wsh_terry_mclaurin",
      playerName: "Terry McLaurin",
      team: "WSH",
      propType: "rushing_yards",
      line: 0.5,
    });
    expect(mclaurinRush?.samples).toEqual([
      { games: 1, total: 0 },
      { games: 1, total: 5 },
    ]);

    const smithKc = await resolveRateHistory({
      playerId: "kc_john_smith",
      playerName: "John Smith",
      team: "KC",
      propType: "receiving_yards",
      line: 42.5,
    });
    expect(smithKc?.samples).toEqual([
      { games: 1, total: 44 },
      { games: 1, total: 51 },
    ]);

    expect(queryStats).toHaveBeenCalledTimes(1);
    expect(queryStats).toHaveBeenCalledWith(2026);
  });

  it("fails closed in stub mode, for unsupported props, <2 games, ambiguous names, and DB errors", async () => {
    const queryStats = vi.fn(async () => SAMPLE_ROWS);
    const stubResolver = createDbRateHistoryResolver({
      isStub: () => true,
      queryStats,
    });
    expect(
      await stubResolver({
        playerId: "buf_james_cook",
        playerName: "James Cook III",
        team: "BUF",
        propType: "rushing_yards",
        line: 78.5,
      }),
    ).toBeUndefined();
    expect(queryStats).not.toHaveBeenCalled();

    const resolver = createDbRateHistoryResolver({
      season: 2026,
      isStub: () => false,
      queryStats,
    });

    // passing_yards is not a PlayerGameStat column in Prisma schema
    expect(
      await resolver({
        playerId: "cin_joe_burrow",
        playerName: "Joe Burrow",
        team: "CIN",
        propType: "passing_yards",
        line: 265.5,
      }),
    ).toBeUndefined();

    expect(
      await resolver({
        playerId: "cin_single_game_receiver",
        playerName: "Single Game Receiver",
        team: "CIN",
        propType: "receiving_yards",
        line: 55.5,
      }),
    ).toBeUndefined();

    // Ambiguous name on an unmatched team must return undefined
    expect(
      await resolver({
        playerId: "nyg_john_smith",
        playerName: "John Smith",
        team: "NYG",
        propType: "receptions",
        line: 3.5,
      }),
    ).toBeUndefined();

    const errors: unknown[] = [];
    const erroringResolver = createDbRateHistoryResolver({
      season: 2026,
      isStub: () => false,
      queryStats: async () => {
        throw new Error("db timeout");
      },
      onError: (err) => errors.push(err),
    });
    expect(
      await erroringResolver({
        playerId: "buf_james_cook",
        playerName: "James Cook",
        team: "BUF",
        propType: "receptions",
        line: 2.5,
      }),
    ).toBeUndefined();
    expect(errors).toHaveLength(1);
  });
});
