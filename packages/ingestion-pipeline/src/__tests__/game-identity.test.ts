import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findTwinCandidate,
  resolveCanonicalGame,
  preferLongerTeamName,
  gameIdentityMergeDisabled,
  GAME_IDENTITY_COMMENCE_MATCH_MS,
  type GameIdentityDb,
  type GameTwinCandidate,
} from "../game-identity.js";

/**
 * Duplicate-row prevention at the ingestion layer.
 *
 * Production evidence (Neon, 2026-09-02): one real game exists up to three
 * times in `games` — Odds API id, TheRundown event_id, `espn:<sport>:<id>` —
 * each with its own picks. These tests pin the matching rule that stops a
 * fourth, and (just as importantly) pin every case where it must REFUSE to
 * merge rather than guess.
 */

const HOUR = 60 * 60 * 1000;
const BASE = new Date("2026-09-02T23:10:00.000Z");

function candidate(overrides: Partial<GameTwinCandidate> = {}): GameTwinCandidate {
  return {
    id: "game-1",
    externalId: "espn:mlb:401816772",
    sportId: "sport-mlb",
    homeTeamName: "San Diego Padres",
    awayTeamName: "Los Angeles Dodgers",
    commenceTime: BASE,
    ...overrides,
  };
}

function probe(overrides: Record<string, unknown> = {}) {
  return {
    sportId: "sport-mlb",
    sportKey: "baseball_mlb",
    externalId: "0f2c1d3e4a5b6c7d8e9f0a1b2c3d4e5f",
    homeTeamName: "San Diego Padres",
    awayTeamName: "Los Angeles Dodgers",
    commenceTime: BASE,
    ...overrides,
  };
}

describe("findTwinCandidate (pure)", () => {
  it("matches the same contest under a different feed id (full names, same time)", () => {
    const match = findTwinCandidate([candidate()], probe());
    expect(match?.candidate.externalId).toBe("espn:mlb:401816772");
    expect(match?.orientation).toBe("aligned");
    expect(match?.exact).toBe(true);
  });

  it("matches across feeds whose kickoff clocks disagree by less than 18h", () => {
    const match = findTwinCandidate(
      [candidate({ commenceTime: new Date(BASE.getTime() - 17 * HOUR) })],
      probe(),
    );
    expect(match?.candidate.id).toBe("game-1");
    expect(match?.commenceDeltaMs).toBe(17 * HOUR);
  });

  it("refuses a candidate outside the 18h window", () => {
    const match = findTwinCandidate(
      [
        candidate({
          commenceTime: new Date(BASE.getTime() + GAME_IDENTITY_COMMENCE_MATCH_MS + 60_000),
        }),
      ],
      probe(),
    );
    expect(match).toBeNull();
  });

  it("refuses a candidate from another sport", () => {
    const match = findTwinCandidate([candidate({ sportId: "sport-nfl" })], probe());
    expect(match).toBeNull();
  });

  it("matches a city-only TheRundown name against the stored full name", () => {
    // TheRundown emitted "St. Louis" / "Milwaukee"; ESPN stored full names.
    const rows = [
      candidate({
        id: "game-stl",
        externalId: "espn:mlb:401817000",
        homeTeamName: "St. Louis Cardinals",
        awayTeamName: "Milwaukee Brewers",
      }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({ homeTeamName: "St. Louis", awayTeamName: "Milwaukee" }),
    );
    expect(match?.candidate.id).toBe("game-stl");
    expect(match?.exact).toBe(false);
  });

  it("returns null for an ambiguous city — 'Los Angeles' when Dodgers AND Angels play inside 18h", () => {
    const rows = [
      candidate({
        id: "game-dodgers",
        externalId: "espn:mlb:1",
        homeTeamName: "Los Angeles Dodgers",
        awayTeamName: "San Francisco Giants",
      }),
      candidate({
        id: "game-angels",
        externalId: "espn:mlb:2",
        homeTeamName: "Los Angeles Angels",
        awayTeamName: "San Francisco Giants",
        commenceTime: new Date(BASE.getTime() + 3 * HOUR),
      }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({ homeTeamName: "Los Angeles", awayTeamName: "San Francisco" }),
    );
    expect(match).toBeNull();
  });

  it("returns null for a shared-city prefix even when only ONE candidate is on the board", () => {
    // The single row we hold may belong to the OTHER team in that city, so a
    // bare "Los Angeles" never prefix-matches — no guess, no wrong merge.
    const rows = [
      candidate({
        id: "game-angels",
        homeTeamName: "Los Angeles Angels",
        awayTeamName: "Seattle Mariners",
      }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({ homeTeamName: "Los Angeles", awayTeamName: "Seattle" }),
    );
    expect(match).toBeNull();
  });

  it("returns null when two different candidates prefix-match the same probe", () => {
    const rows = [
      candidate({
        id: "game-a",
        homeTeamName: "Toronto Blue Jays",
        awayTeamName: "Boston Red Sox",
      }),
      candidate({
        id: "game-b",
        homeTeamName: "Toronto Blue Jays Something",
        awayTeamName: "Boston Red Sox Other",
        commenceTime: new Date(BASE.getTime() + 2 * HOUR),
      }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({ homeTeamName: "Toronto Blue Jays", awayTeamName: "Boston Red Sox" }),
    );
    // "Toronto Blue Jays" matches game-a EXACTLY, so the exact tier wins and
    // the prefix candidate is discarded — the exact row is returned.
    expect(match?.candidate.id).toBe("game-a");

    // With no exact candidate at all, two prefix matches are fatal.
    const prefixOnly = findTwinCandidate(
      [rows[1]!, candidate({ id: "game-c", homeTeamName: "Toronto Blue Jays Extra", awayTeamName: "Boston Red Sox Extra" })],
      probe({ homeTeamName: "Toronto Blue Jays", awayTeamName: "Boston Red Sox" }),
    );
    expect(prefixOnly).toBeNull();
  });

  it("never prefix-matches in college sports (Texas vs Texas Tech are different schools)", () => {
    const rows = [
      candidate({
        sportId: "sport-ncaaf",
        homeTeamName: "Texas Tech Red Raiders",
        awayTeamName: "Oklahoma State Cowboys",
      }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({
        sportId: "sport-ncaaf",
        sportKey: "americanfootball_ncaaf",
        homeTeamName: "Texas",
        awayTeamName: "Oklahoma",
      }),
    );
    expect(match).toBeNull();
  });

  it("disables prefix matching when the sport key is unknown (fails closed)", () => {
    const rows = [
      candidate({ homeTeamName: "St. Louis Cardinals", awayTeamName: "Milwaukee Brewers" }),
    ];
    const match = findTwinCandidate(
      rows,
      probe({ sportKey: undefined, homeTeamName: "St. Louis", awayTeamName: "Milwaukee" }),
    );
    expect(match).toBeNull();
  });

  it("picks the NEAREST kickoff when both games of an 18h-apart pair are on the board", () => {
    const rows = [
      candidate({ id: "game-night", commenceTime: new Date(BASE.getTime() - 18 * HOUR) }),
      candidate({ id: "game-matinee", externalId: "espn:mlb:2", commenceTime: BASE }),
    ];
    const match = findTwinCandidate(rows, probe());
    expect(match?.candidate.id).toBe("game-matinee");
  });

  it("returns null when two candidates tie on kickoff distance", () => {
    const rows = [
      candidate({ id: "game-a", commenceTime: new Date(BASE.getTime() - 2 * HOUR) }),
      candidate({ id: "game-b", externalId: "espn:mlb:2", commenceTime: new Date(BASE.getTime() + 2 * HOUR) }),
    ];
    expect(findTwinCandidate(rows, probe())).toBeNull();
  });

  it("reports a home/away flip as flipped (detected, never silently merged)", () => {
    const rows = [
      candidate({
        homeTeamName: "Los Angeles Dodgers",
        awayTeamName: "San Diego Padres",
      }),
    ];
    const match = findTwinCandidate(rows, probe());
    expect(match?.orientation).toBe("flipped");
  });
});

describe("resolveCanonicalGame (db)", () => {
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const db = { game: { findUnique, findMany } } as unknown as GameIdentityDb;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
  });

  it("fast path: an existing externalId returns that row without a twin scan", async () => {
    findUnique.mockResolvedValue(candidate({ externalId: probe().externalId }));

    const resolved = await resolveCanonicalGame(db, probe());

    expect(resolved).toEqual({
      game: candidate({ externalId: probe().externalId }),
      matchedBy: "externalId",
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("reuses an unambiguous twin and logs one line naming both externalIds", async () => {
    findMany.mockResolvedValue([candidate()]);

    const resolved = await resolveCanonicalGame(db, probe());

    expect(resolved?.matchedBy).toBe("twin");
    expect(resolved?.game.id).toBe("game-1");
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const line = String(infoSpy.mock.calls[0]![0]);
    expect(line).toContain("espn:mlb:401816772");
    expect(line).toContain(probe().externalId);
    expect(line).toContain("San Diego Padres");
    expect(line).toContain("baseball_mlb");
  });

  it("queries only the ±18h window for the same sport", async () => {
    await resolveCanonicalGame(db, probe());

    expect(findMany).toHaveBeenCalledWith({
      where: {
        sportId: "sport-mlb",
        commenceTime: {
          gte: new Date(BASE.getTime() - GAME_IDENTITY_COMMENCE_MATCH_MS),
          lte: new Date(BASE.getTime() + GAME_IDENTITY_COMMENCE_MATCH_MS),
        },
      },
      select: {
        id: true,
        externalId: true,
        sportId: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
      },
    });
  });

  it("refuses to merge a flipped-orientation row and warns instead", async () => {
    findMany.mockResolvedValue([
      candidate({ homeTeamName: "Los Angeles Dodgers", awayTeamName: "San Diego Padres" }),
    ]);

    const resolved = await resolveCanonicalGame(db, probe());

    expect(resolved).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]![0])).toContain("orientation conflict");
  });

  it("returns null when no candidate matches (caller creates the row, as today)", async () => {
    findMany.mockResolvedValue([
      candidate({ homeTeamName: "Chicago Cubs", awayTeamName: "Cincinnati Reds" }),
    ]);

    expect(await resolveCanonicalGame(db, probe())).toBeNull();
  });

  it("kill switch: GAME_IDENTITY_MERGE_DISABLED=true makes it a no-op with zero DB calls", async () => {
    process.env["GAME_IDENTITY_MERGE_DISABLED"] = "true";
    findMany.mockResolvedValue([candidate()]);

    expect(await resolveCanonicalGame(db, probe())).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(gameIdentityMergeDisabled({ GAME_IDENTITY_MERGE_DISABLED: "true" })).toBe(true);
    expect(gameIdentityMergeDisabled({})).toBe(false);
    expect(gameIdentityMergeDisabled({ GAME_IDENTITY_MERGE_DISABLED: "false" })).toBe(false);
  });

  it("accepts pre-loaded candidates without querying", async () => {
    const resolved = await resolveCanonicalGame(db, probe(), {
      candidates: [candidate()],
    });

    expect(resolved?.matchedBy).toBe("twin");
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("preferLongerTeamName", () => {
  it("never downgrades a stored full name to a city-only feed name", () => {
    expect(preferLongerTeamName("Los Angeles Dodgers", "Los Angeles")).toBe(
      "Los Angeles Dodgers",
    );
    expect(preferLongerTeamName("Los Angeles", "Los Angeles Dodgers")).toBe(
      "Los Angeles Dodgers",
    );
    expect(preferLongerTeamName("Athletics", "")).toBe("Athletics");
    expect(preferLongerTeamName("", "Athletics")).toBe("Athletics");
  });
});
