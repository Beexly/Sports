/**
 * Entity Graph Resolver — unit tests
 *
 * All Prisma DB calls are mocked at the module level so these tests run
 * without a real database. vi.hoisted() is required because vi.mock() is
 * hoisted to the top of the file by the Vitest transformer, so any
 * variables the factory references must also be hoisted.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ─── Hoist mock objects so the vi.mock factory can reference them ─────────────

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    playerEntity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    entityAlias: {
      upsert: vi.fn(),
      create: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    playerTenure: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockDb };
});

vi.mock("@sports/db", () => ({
  db: mockDb,
}));

// ─── Import resolver AFTER mock is registered ────────────────────────────────

import { resolvePlayer, resolveTeamAsOf, whoPlayedFor } from "../resolver";
import type { PlayerEntity, Team } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<PlayerEntity> = {}): PlayerEntity {
  return {
    id: "player-1",
    displayName: "Patrick Mahomes",
    position: "QB",
    nflId: null,
    pfrId: null,
    gsisId: "00-0033873",
    espnId: null,
    birthYear: 1995,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    lastVerifiedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-rams",
    leagueId: "league-nfl",
    name: "Los Angeles Rams",
    abbreviation: "LAR",
    city: "Los Angeles",
    logoUrl: null,
    createdAt: new Date("2020-01-01T00:00:00Z"),
    nflId: null,
    pfrId: null,
    sportradarId: null,
    formerNames: [{ name: "St. Louis Rams", fromSeason: 1995, toSeason: 2015 }],
    validFrom: null,
    validUntil: null,
    ...overrides,
  } as unknown as Team;
}

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: $transaction executes the callback with a tx that mirrors mockDb
  (mockDb.$transaction as Mock).mockImplementation(
    (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb),
  );
});

// ─── resolvePlayer: dedup ─────────────────────────────────────────────────────

describe("resolvePlayer — dedup", () => {
  it("returns the same entity id on a second lookup and bumps lastVerifiedAt", async () => {
    const existing = makePlayer();

    // findUnique by gsisId returns the player.
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValueOnce(existing);
    // update call returns the updated entity with a new lastVerifiedAt.
    const updated = makePlayer({ lastVerifiedAt: new Date("2025-01-01T00:00:00Z") });
    (mockDb.playerEntity.update as Mock).mockResolvedValueOnce(updated);

    const result = await resolvePlayer({ gsisId: "00-0033873", source: "nflverse" });

    // Same canonical id.
    expect(result.id).toBe("player-1");
    // update was called once (to bump lastVerifiedAt).
    expect(mockDb.playerEntity.update).toHaveBeenCalledOnce();
    // No new player row was created.
    expect(mockDb.playerEntity.create).not.toHaveBeenCalled();
    // lastVerifiedAt on the returned entity is the bumped value.
    expect(result.lastVerifiedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("does not create extra rows when called twice with the same gsisId", async () => {
    const existing = makePlayer();
    const updated = makePlayer({ lastVerifiedAt: new Date() });

    // Both calls hit the same findUnique path.
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValue(existing);
    (mockDb.playerEntity.update as Mock).mockResolvedValue(updated);

    await resolvePlayer({ gsisId: "00-0033873", source: "nflverse" });
    await resolvePlayer({ gsisId: "00-0033873", source: "nflverse" });

    // create should never be called.
    expect(mockDb.playerEntity.create).not.toHaveBeenCalled();
    // update was called twice (once per resolvePlayer call).
    expect(mockDb.playerEntity.update).toHaveBeenCalledTimes(2);
  });
});

// ─── resolvePlayer: alias creation ───────────────────────────────────────────

describe("resolvePlayer — alias creation", () => {
  it("creates an EntityAlias with the correct source when creating a new player", async () => {
    // No existing player found on any lookup.
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValue(null);
    (mockDb.playerEntity.findFirst as Mock).mockResolvedValue(null);

    const created = makePlayer({ id: "player-new", gsisId: "00-0033873" });
    (mockDb.playerEntity.create as Mock).mockResolvedValue(created);

    await resolvePlayer({
      gsisId: "00-0033873",
      name: "Patrick Mahomes",
      source: "nflverse",
    });

    // playerEntity.create was called once inside the transaction.
    expect(mockDb.playerEntity.create).toHaveBeenCalledOnce();
    // entityAlias.create was called with the correct alias and source.
    expect(mockDb.entityAlias.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alias: "Patrick Mahomes",
          source: "nflverse",
        }),
      }),
    );
  });

  it("upserts an alias (not create) when the player already exists", async () => {
    const existing = makePlayer();
    const updated = makePlayer({ lastVerifiedAt: new Date() });

    (mockDb.playerEntity.findUnique as Mock).mockResolvedValueOnce(existing);
    (mockDb.playerEntity.update as Mock).mockResolvedValueOnce(updated);

    await resolvePlayer({
      gsisId: "00-0033873",
      name: "Pat Mahomes",
      source: "espn",
    });

    // Should upsert alias, not create a new player.
    expect(mockDb.entityAlias.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          playerId_alias_source: expect.objectContaining({
            alias: "Pat Mahomes",
            source: "espn",
          }),
        }),
        create: expect.objectContaining({
          alias: "Pat Mahomes",
          source: "espn",
        }),
      }),
    );
    expect(mockDb.playerEntity.create).not.toHaveBeenCalled();
  });
});

// ─── resolveTeamAsOf: temporal team lookup ────────────────────────────────────

describe("resolveTeamAsOf — temporal franchise identity", () => {
  it("resolves a current team name by exact match", async () => {
    const ramsTeam = makeTeam();

    (mockDb.team.findFirst as Mock).mockImplementation(
      ({ where }: { where: { name: string } }) =>
        where.name === "Los Angeles Rams" ? ramsTeam : null,
    );

    const result = await resolveTeamAsOf("Los Angeles Rams", new Date("2016-01-01"));
    expect(result?.id).toBe("team-rams");
  });

  it("resolves 'St. Louis Rams' in 2015 to the same team id as 'Los Angeles Rams' in 2016", async () => {
    const ramsTeam = makeTeam();

    // "Los Angeles Rams" resolves by exact current name; "St. Louis Rams" does not.
    (mockDb.team.findFirst as Mock).mockImplementation(
      ({ where }: { where: { name: string } }) =>
        where.name === "Los Angeles Rams" ? ramsTeam : null,
    );
    // formerNames scan returns the Rams team.
    (mockDb.team.findMany as Mock).mockResolvedValue([ramsTeam]);

    const stLouisResult = await resolveTeamAsOf("St. Louis Rams", new Date("2015-01-01"));
    const laResult = await resolveTeamAsOf("Los Angeles Rams", new Date("2016-01-01"));

    // Both resolve to the same canonical franchise.
    expect(stLouisResult?.id).toBe("team-rams");
    expect(laResult?.id).toBe("team-rams");
  });

  it("returns null for a name that matches no current or former name", async () => {
    (mockDb.team.findFirst as Mock).mockResolvedValue(null);
    (mockDb.team.findMany as Mock).mockResolvedValue([makeTeam()]);

    const result = await resolveTeamAsOf("Unknown FC", new Date("2015-01-01"));
    expect(result).toBeNull();
  });

  it("does not match a former name when the year is outside the season range", async () => {
    (mockDb.team.findFirst as Mock).mockResolvedValue(null);
    // The Rams' formerNames entry covers 1995–2015; 2016 is outside toSeason.
    (mockDb.team.findMany as Mock).mockResolvedValue([makeTeam()]);

    const result = await resolveTeamAsOf("St. Louis Rams", new Date("2016-06-01"));
    expect(result).toBeNull();
  });
});

// ─── whoPlayedFor: knownAt look-ahead prevention ─────────────────────────────

describe("whoPlayedFor — bitemporal knownAt enforcement", () => {
  it("passes knownAt: { lte: asOf } to the DB query to prevent look-ahead", async () => {
    (mockDb.playerTenure.findMany as Mock).mockResolvedValueOnce([]);

    const asOf = new Date("2024-01-01");
    await whoPlayedFor("team-kc", asOf);

    expect(mockDb.playerTenure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamId: "team-kc",
          knownAt: { lte: asOf },
        }),
      }),
    );
  });

  it("returns an empty array when all tenures are excluded by knownAt", async () => {
    (mockDb.playerTenure.findMany as Mock).mockResolvedValueOnce([]);

    const result = await whoPlayedFor("team-kc", new Date("2024-01-01"));
    expect(result).toHaveLength(0);
  });

  it("returns players whose tenure is active and known at the query date", async () => {
    const player = makePlayer();
    const tenure = {
      id: "tenure-1",
      playerId: "player-1",
      teamId: "team-kc",
      validAt: new Date("2023-09-01"),
      validUntil: null,
      knownAt: new Date("2023-09-01"),
      createdAt: new Date("2023-09-01"),
      player,
    };

    (mockDb.playerTenure.findMany as Mock).mockResolvedValueOnce([tenure]);

    const result = await whoPlayedFor("team-kc", new Date("2024-01-15"));

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("player-1");
  });
});

// ─── resolvePlayer: null-safety / fallbacks ──────────────────────────────────

describe("resolvePlayer — null safety", () => {
  it("falls back to name+birthYear when no external IDs are provided", async () => {
    // All findUnique calls return null (no external IDs provided).
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValue(null);
    // findFirst for name+birthYear returns a match.
    const existing = makePlayer({ gsisId: null });
    (mockDb.playerEntity.findFirst as Mock).mockResolvedValueOnce(existing);
    const updated = makePlayer({ gsisId: null, lastVerifiedAt: new Date() });
    (mockDb.playerEntity.update as Mock).mockResolvedValueOnce(updated);

    const result = await resolvePlayer({
      name: "Patrick Mahomes",
      birthYear: 1995,
      source: "nflverse",
    });

    expect(result.id).toBe("player-1");
    expect(mockDb.playerEntity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          displayName: "Patrick Mahomes",
          birthYear: 1995,
        }),
      }),
    );
  });

  it("does not crash when birthYear is missing and no external IDs are provided", async () => {
    // No external IDs, no birthYear — findFirst is NOT called (can't dedup without birthYear).
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValue(null);
    const created = makePlayer({ id: "player-new", gsisId: null, birthYear: null });
    (mockDb.playerEntity.create as Mock).mockResolvedValue(created);

    const result = await resolvePlayer({ name: "Mystery Player", source: "nflverse" });

    expect(result.id).toBe("player-new");
    // findFirst should NOT have been called (no birthYear).
    expect(mockDb.playerEntity.findFirst).not.toHaveBeenCalled();
  });

  it("does not crash when called with an empty input object", async () => {
    (mockDb.playerEntity.findUnique as Mock).mockResolvedValue(null);
    const created = makePlayer({ id: "player-empty", gsisId: null, displayName: "" });
    (mockDb.playerEntity.create as Mock).mockResolvedValue(created);

    const result = await resolvePlayer({});

    expect(result).toBeDefined();
    expect(typeof result.id).toBe("string");
    // No findFirst called (no name+birthYear pair available).
    expect(mockDb.playerEntity.findFirst).not.toHaveBeenCalled();
  });
});
