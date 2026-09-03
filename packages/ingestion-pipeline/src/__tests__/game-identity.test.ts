import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findTwinCandidate,
  resolveCanonicalGame,
  preferLongerTeamName,
  gameIdentityMergeDisabled,
  GAME_IDENTITY_COMMENCE_MATCH_MS,
  BASEBALL_COMMENCE_MATCH_MS,
  AMBIGUOUS_CITY_TOKENS,
  commenceMatchMsFor,
  MAX_ALIAS_HOPS,
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
    mergedIntoGameId: null,
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

  it("matches across feeds whose kickoff clocks disagree inside the sport window (baseball: 2h)", () => {
    const match = findTwinCandidate(
      [candidate({ commenceTime: new Date(BASE.getTime() - 1.5 * HOUR) })],
      probe(),
    );
    expect(match?.candidate.id).toBe("game-1");
    expect(match?.commenceDeltaMs).toBe(1.5 * HOUR);
  });

  it("refuses a candidate outside the sport window", () => {
    const match = findTwinCandidate(
      [
        candidate({
          commenceTime: new Date(BASE.getTime() + commenceMatchMsFor("baseball_mlb") + 60_000),
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

describe("findTwinCandidate — alias-safe (scripts/ops/merge-duplicate-games.ts)", () => {
  it("resolves a matching ALIAS row to its canonical, never returning the alias", () => {
    const rows = [
      candidate({
        id: "game-alias",
        externalId: "espn:mlb:legacy",
        mergedIntoGameId: "game-canonical",
      }),
      candidate({
        id: "game-canonical",
        externalId: "0f2c1d3e4a5b6c7d8e9f0a1b2c3d4e5f",
        // Deliberately different team-name specificity/time so this row alone
        // would NOT match the probe — proving the alias row's own match is
        // what drove resolution, not an independent match on this row.
        homeTeamName: "San Diego",
        awayTeamName: "Los Angeles",
        commenceTime: new Date(BASE.getTime() + 5 * HOUR),
      }),
    ];
    const match = findTwinCandidate(rows, probe());
    expect(match?.candidate.id).toBe("game-canonical");
    expect(match?.candidate.mergedIntoGameId).toBeNull();
  });

  it("follows a 2-hop alias chain (within MAX_ALIAS_HOPS)", () => {
    // Only game-a matches the probe's team pair (the alias entry point);
    // game-b/game-c intentionally carry a NON-matching team pair so the only
    // way to reach game-c is by following game-a's chain, not an independent
    // direct match.
    const rows = [
      candidate({ id: "game-a", externalId: "a", mergedIntoGameId: "game-b" }),
      candidate({
        id: "game-b",
        externalId: "b",
        homeTeamName: "Chicago Cubs",
        awayTeamName: "Cincinnati Reds",
        mergedIntoGameId: "game-c",
      }),
      candidate({ id: "game-c", externalId: "c", homeTeamName: "Chicago Cubs", awayTeamName: "Cincinnati Reds" }),
    ];
    const match = findTwinCandidate(rows, probe());
    expect(match?.candidate.id).toBe("game-c");
  });

  it("fails closed (drops the candidate) when the chain exceeds MAX_ALIAS_HOPS", () => {
    // 4 hops: a -> b -> c -> d -> e, deeper than MAX_ALIAS_HOPS (3). Only
    // game-a matches the probe's team pair; b/c/d/e intentionally carry a
    // NON-matching team pair so none of them is an independent direct match
    // — the only path to "game-e" is via game-a's chain, which must fail.
    expect(MAX_ALIAS_HOPS).toBe(3);
    const other = { homeTeamName: "Chicago Cubs", awayTeamName: "Cincinnati Reds" };
    const rows = [
      candidate({ id: "game-a", externalId: "a", mergedIntoGameId: "game-b" }),
      candidate({ id: "game-b", externalId: "b", ...other, mergedIntoGameId: "game-c" }),
      candidate({ id: "game-c", externalId: "c", ...other, mergedIntoGameId: "game-d" }),
      candidate({ id: "game-d", externalId: "d", ...other, mergedIntoGameId: "game-e" }),
      candidate({ id: "game-e", externalId: "e", ...other }),
    ];
    expect(findTwinCandidate(rows, probe())).toBeNull();
  });

  it("fails closed when the alias target is not among the given candidates", () => {
    const rows = [
      candidate({ id: "game-alias", externalId: "a", mergedIntoGameId: "game-missing" }),
    ];
    expect(findTwinCandidate(rows, probe())).toBeNull();
  });

  it("dedupes an alias and its own canonical so both matching does not read as a tie", () => {
    // Both rows independently satisfy the team+time match (why they were
    // merged in the first place) — without dedupe this would look like two
    // distinct candidates tying on commence delta and fail closed to null.
    const rows = [
      candidate({ id: "game-alias", externalId: "alias-id", mergedIntoGameId: "game-canonical" }),
      candidate({ id: "game-canonical", externalId: "canon-id" }),
    ];
    const match = findTwinCandidate(rows, probe());
    expect(match?.candidate.id).toBe("game-canonical");
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

  it("queries only the sport's twin window for the same sport (baseball: ±2h)", async () => {
    await resolveCanonicalGame(db, probe());

    const windowMs = commenceMatchMsFor("baseball_mlb");
    expect(findMany).toHaveBeenCalledWith({
      where: {
        sportId: "sport-mlb",
        commenceTime: {
          gte: new Date(BASE.getTime() - windowMs),
          lte: new Date(BASE.getTime() + windowMs),
        },
      },
      select: {
        id: true,
        externalId: true,
        sportId: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        mergedIntoGameId: true,
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

describe("resolveCanonicalGame — alias-safe fast path", () => {
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const db = { game: { findUnique, findMany } } as unknown as GameIdentityDb;

  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env["GAME_IDENTITY_MERGE_DISABLED"];
  });

  it("re-ingesting an old (now-aliased) externalId returns the canonical row, not the tombstone", async () => {
    const alias = candidate({
      id: "game-alias",
      externalId: probe().externalId,
      mergedIntoGameId: "game-canonical",
    });
    const canonical = candidate({ id: "game-canonical", externalId: "espn:mlb:401816772" });
    findUnique.mockImplementation(async (args: { where: { externalId?: string; id?: string } }) => {
      if (args.where.externalId === probe().externalId) return alias;
      if (args.where.id === "game-canonical") return canonical;
      return null;
    });

    const resolved = await resolveCanonicalGame(db, probe());

    expect(resolved).toEqual({ game: canonical, matchedBy: "externalId" });
    expect(resolved?.game.mergedIntoGameId).toBeNull();
    // The hop was a direct DB lookup by id, not the ±18h twin scan.
    expect(findMany).not.toHaveBeenCalled();
  });

  it("follows a 2-hop chain via the DB (within MAX_ALIAS_HOPS)", async () => {
    const a = candidate({ id: "game-a", externalId: probe().externalId, mergedIntoGameId: "game-b" });
    const b = candidate({ id: "game-b", externalId: "b", mergedIntoGameId: "game-c" });
    const c = candidate({ id: "game-c", externalId: "c" });
    findUnique.mockImplementation(async (args: { where: { externalId?: string; id?: string } }) => {
      if (args.where.externalId === probe().externalId) return a;
      if (args.where.id === "game-b") return b;
      if (args.where.id === "game-c") return c;
      return null;
    });

    const resolved = await resolveCanonicalGame(db, probe());
    expect(resolved?.game.id).toBe("game-c");
  });

  it("throws when a hop's target row is missing (never silently falls back to the alias)", async () => {
    const alias = candidate({
      id: "game-alias",
      externalId: probe().externalId,
      mergedIntoGameId: "game-nowhere",
    });
    findUnique.mockImplementation(async (args: { where: { externalId?: string; id?: string } }) => {
      if (args.where.externalId === probe().externalId) return alias;
      return null;
    });

    await expect(resolveCanonicalGame(db, probe())).rejects.toThrow(/missing canonical game/);
  });

  it("throws when the alias chain exceeds MAX_ALIAS_HOPS (fail closed, never guesses)", async () => {
    expect(MAX_ALIAS_HOPS).toBe(3);
    const chain: Record<string, GameTwinCandidate> = {
      [probe().externalId]: candidate({ id: "game-0", externalId: probe().externalId, mergedIntoGameId: "game-1" }),
      "game-1": candidate({ id: "game-1", externalId: "1", mergedIntoGameId: "game-2" }),
      "game-2": candidate({ id: "game-2", externalId: "2", mergedIntoGameId: "game-3" }),
      "game-3": candidate({ id: "game-3", externalId: "3", mergedIntoGameId: "game-4" }),
      "game-4": candidate({ id: "game-4", externalId: "4" }),
    };
    findUnique.mockImplementation(async (args: { where: { externalId?: string; id?: string } }) => {
      if (args.where.externalId != null) return chain[args.where.externalId] ?? null;
      if (args.where.id != null) return chain[args.where.id] ?? null;
      return null;
    });

    await expect(resolveCanonicalGame(db, probe())).rejects.toThrow(/exceeded 3 hops/);
  });
});

describe("sport-specific twin window (doubleheaders) and shared-city tokens", () => {
  it("baseball uses a 2h window: a second contest 3.5h later is NOT a twin even when it is the only row", () => {
    const only = candidate({ commenceTime: BASE });
    const game2 = probe({ commenceTime: new Date(BASE.getTime() + 3.5 * HOUR) });
    expect(commenceMatchMsFor("baseball_mlb")).toBe(BASEBALL_COMMENCE_MATCH_MS);
    expect(findTwinCandidate([only], game2)).toBeNull();
  });

  it("baseball still merges the same game when feed clocks differ by minutes", () => {
    const only = candidate({ commenceTime: BASE });
    const sameGame = probe({ commenceTime: new Date(BASE.getTime() + 25 * 60 * 1000) });
    expect(findTwinCandidate([only], sameGame)?.candidate.id).toBe("game-1");
  });

  it("football keeps the 18h window (one contest per pair per week)", () => {
    const nfl = candidate({
      id: "nfl-1",
      sportId: "sport-nfl",
      externalId: "espn:nfl:1",
      homeTeamName: "Kansas City Chiefs",
      awayTeamName: "Baltimore Ravens",
      commenceTime: BASE,
    });
    const tenHoursLater = probe({
      sportId: "sport-nfl",
      sportKey: "americanfootball_nfl",
      externalId: "abc123",
      homeTeamName: "Kansas City Chiefs",
      awayTeamName: "Baltimore Ravens",
      commenceTime: new Date(BASE.getTime() + 10 * HOUR),
    });
    expect(commenceMatchMsFor("americanfootball_nfl")).toBe(GAME_IDENTITY_COMMENCE_MATCH_MS);
    expect(commenceMatchMsFor(undefined)).toBe(GAME_IDENTITY_COMMENCE_MATCH_MS);
    expect(findTwinCandidate([nfl], tenHoursLater)?.candidate.id).toBe("nfl-1");
  });

  it("a bare 'Manchester' never prefix-matches Manchester City or United (EPL)", () => {
    const city = candidate({
      id: "epl-1",
      sportId: "sport-epl",
      externalId: "espn:epl:1",
      homeTeamName: "Manchester City",
      awayTeamName: "Arsenal",
    });
    const cityOnly = probe({
      sportId: "sport-epl",
      sportKey: "soccer_epl",
      externalId: "rundown-epl-1",
      homeTeamName: "Manchester",
      awayTeamName: "Arsenal",
    });
    expect(AMBIGUOUS_CITY_TOKENS.has("manchester")).toBe(true);
    expect(findTwinCandidate([city], cityOnly)).toBeNull();
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
