import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The ESPN schedule seed writes `espn:<short>:<id>` (espn:mlb:401816772) while
 * espn-odds-client writes `espn:<sportKey>:<id>` (espn:baseball_mlb:401816772)
 * and the paid path writes the Odds API id — three rows, one contest. These
 * tests pin that the seed reuses an existing row when identity proves it is the
 * same game, and creates one exactly as before when it cannot.
 */

const mocks = vi.hoisted(() => ({
  fetchAllEspnSeedGames: vi.fn<(args: unknown) => Promise<{ games: unknown[]; errors: string[] }>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    sport: { upsert: mocks.sportUpsert },
    game: {
      upsert: mocks.gameUpsert,
      update: mocks.gameUpdate,
      findUnique: mocks.gameFindUnique,
      findMany: mocks.gameFindMany,
    },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  fetchAllEspnSeedGames: mocks.fetchAllEspnSeedGames,
}));

import { seedGamesFromEspn } from "../seed-games-from-espn.js";

const NOW = new Date("2026-09-02T12:00:00.000Z");
const COMMENCE = new Date("2026-09-02T23:10:00.000Z");

function seedGame(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "espn:mlb:401816772",
    sportKey: "baseball_mlb",
    sportName: "MLB",
    sportDisplayName: "Major League Baseball",
    homeTeamName: "San Diego Padres",
    awayTeamName: "Los Angeles Dodgers",
    commenceTime: COMMENCE,
    state: "pre",
    ...overrides,
  };
}

describe("seedGamesFromEspn — game identity", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.fetchAllEspnSeedGames.mockResolvedValue({ games: [seedGame()], errors: [] });
    mocks.sportUpsert.mockResolvedValue({ id: "sport-mlb" });
    mocks.gameUpsert.mockResolvedValue({ id: "game-new" });
    mocks.gameUpdate.mockResolvedValue({ id: "game-odds" });
    mocks.gameFindUnique.mockResolvedValue(null);
    mocks.gameFindMany.mockResolvedValue([]);
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
  });

  it("updates the existing Odds-API row instead of creating an espn: duplicate", async () => {
    mocks.gameFindMany.mockResolvedValue([
      {
        id: "game-odds",
        externalId: "0f2c1d3e4a5b6c7d8e9f0a1b2c3d4e5f",
        sportId: "sport-mlb",
        homeTeamName: "San Diego Padres",
        awayTeamName: "Los Angeles Dodgers",
        commenceTime: COMMENCE,
      },
    ]);

    const result = await seedGamesFromEspn({ now: NOW });

    expect(result.upserted).toBe(1);
    expect(mocks.gameUpsert).not.toHaveBeenCalled();
    expect(mocks.gameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "game-odds" },
        data: expect.objectContaining({
          homeTeamName: "San Diego Padres",
          awayTeamName: "Los Angeles Dodgers",
        }),
      }),
    );
  });

  it("creates the row exactly as before when there is no twin", async () => {
    const result = await seedGamesFromEspn({ now: NOW });

    expect(result.upserted).toBe(1);
    expect(mocks.gameUpdate).not.toHaveBeenCalled();
    expect(mocks.gameUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { externalId: "espn:mlb:401816772" } }),
    );
  });

  it("kill switch restores today's behaviour (no twin scan)", async () => {
    process.env["GAME_IDENTITY_MERGE_DISABLED"] = "true";
    mocks.gameFindMany.mockResolvedValue([
      {
        id: "game-odds",
        externalId: "0f2c1d3e4a5b6c7d8e9f0a1b2c3d4e5f",
        sportId: "sport-mlb",
        homeTeamName: "San Diego Padres",
        awayTeamName: "Los Angeles Dodgers",
        commenceTime: COMMENCE,
      },
    ]);

    await seedGamesFromEspn({ now: NOW });

    expect(mocks.gameFindMany).not.toHaveBeenCalled();
    expect(mocks.gameUpdate).not.toHaveBeenCalled();
    expect(mocks.gameUpsert).toHaveBeenCalledTimes(1);
  });
});
