/**
 * seedGamesFromEspn game-identity dedup — the seeder must not mint an
 * `espn:{short}:{id}` Game row when the same physical game already exists
 * under another externalId convention (canonical espn sibling, provider hash).
 * A duplicate row strands its picks: paid settlement matches externalId only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const gameUpsert = vi.fn();
const gameFindMany = vi.fn();
const sportUpsert = vi.fn();
const fetchAllEspnSeedGames = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    sport: { upsert: (...args: unknown[]) => sportUpsert(...args) },
    game: {
      upsert: (...args: unknown[]) => gameUpsert(...args),
      findMany: (...args: unknown[]) => gameFindMany(...args),
    },
  },
}));

vi.mock("@sports/data-ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/data-ingestion")>();
  return {
    ...actual,
    fetchAllEspnSeedGames: (...args: unknown[]) => fetchAllEspnSeedGames(...args),
  };
});

import { seedGamesFromEspn } from "../seed-games-from-espn.js";

const NOW = new Date("2026-08-26T00:00:00Z");
const COMMENCE = new Date("2026-08-26T01:40:00Z");

function seedGame(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "espn:mlb:401816675",
    sportKey: "baseball_mlb",
    sportName: "MLB",
    sportDisplayName: "MLB",
    homeTeamName: "San Francisco Giants",
    awayTeamName: "Cincinnati Reds",
    commenceTime: COMMENCE,
    state: "pre" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sportUpsert.mockResolvedValue({ id: "sport-1", key: "baseball_mlb" });
  gameUpsert.mockResolvedValue({ id: "game-row" });
  gameFindMany.mockResolvedValue([]);
});

describe("seedGamesFromEspn identity dedup", () => {
  it("skips creation when the canonical espn sibling id already exists", async () => {
    fetchAllEspnSeedGames.mockResolvedValue({ games: [seedGame()], errors: [] });
    gameFindMany.mockResolvedValue([
      {
        externalId: "espn:baseball_mlb:401816675",
        homeTeamName: "San Francisco Giants",
        awayTeamName: "Cincinnati Reds",
        commenceTime: COMMENCE,
      },
    ]);

    const result = await seedGamesFromEspn({ now: NOW });
    expect(result.deduped).toBe(1);
    expect(result.upserted).toBe(0);
    expect(gameUpsert).not.toHaveBeenCalled();
  });

  it("skips creation when the game exists under a provider-hash id (team+time match)", async () => {
    fetchAllEspnSeedGames.mockResolvedValue({ games: [seedGame()], errors: [] });
    gameFindMany.mockResolvedValue([
      {
        externalId: "1073abdc2b9688872b92c195a7fda87d",
        homeTeamName: "San Francisco",
        awayTeamName: "Cincinnati",
        commenceTime: new Date("2026-08-26T01:45:00Z"),
      },
    ]);

    const result = await seedGamesFromEspn({ now: NOW });
    expect(result.deduped).toBe(1);
    expect(result.upserted).toBe(0);
    expect(gameUpsert).not.toHaveBeenCalled();
  });

  it("still updates a row the seeder itself owns (idempotent re-seed)", async () => {
    fetchAllEspnSeedGames.mockResolvedValue({ games: [seedGame()], errors: [] });
    gameFindMany.mockResolvedValue([
      {
        externalId: "espn:mlb:401816675",
        homeTeamName: "San Francisco Giants",
        awayTeamName: "Cincinnati Reds",
        commenceTime: COMMENCE,
      },
    ]);

    const result = await seedGamesFromEspn({ now: NOW });
    expect(result.deduped).toBe(0);
    expect(result.upserted).toBe(1);
    expect(gameUpsert).toHaveBeenCalledTimes(1);
  });

  it("creates genuinely new games", async () => {
    fetchAllEspnSeedGames.mockResolvedValue({ games: [seedGame()], errors: [] });
    gameFindMany.mockResolvedValue([
      {
        externalId: "ffff00001111222233334444aaaa0000",
        homeTeamName: "San Diego Padres",
        awayTeamName: "Pittsburgh Pirates",
        commenceTime: COMMENCE,
      },
    ]);

    const result = await seedGamesFromEspn({ now: NOW });
    expect(result.deduped).toBe(0);
    expect(result.upserted).toBe(1);
    expect(gameUpsert).toHaveBeenCalledTimes(1);
  });
});
