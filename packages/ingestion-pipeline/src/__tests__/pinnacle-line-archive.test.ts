import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capturePinnacleLineSnapshotsIfEnabled,
  isLineArchiveEuPinnacleEnabled,
  PINNACLE_BOOKMAKER,
} from "../pinnacle-line-archive.js";
import type { LineArchiveDb } from "../line-archive.js";
import type { NormalizedOdds } from "@sports/types";

/**
 * pinnacle-line-archive.ts adds the Pinnacle closing-line leg to the forward
 * line archive. It is DOUBLE-GATED on top of line-archive.ts's own
 * LINE_ARCHIVE_ENABLED gate — these tests pin:
 *   - either flag missing/false: fetchOdds is NEVER invoked (zero API calls,
 *     zero DB calls)
 *   - both flags "true": fetchOdds is called with exactly
 *     { regions: "eu", bookmakers: ["pinnacle"] } and the returned odds are
 *     persisted through the same OddsLineSnapshot write path with
 *     bookmaker "pinnacle"
 *   - a fetchOdds/normalizeOdds failure is swallowed and returned as
 *     `{ error }`, never thrown
 */

const ORIGINAL_ENABLED = process.env["LINE_ARCHIVE_ENABLED"];
const ORIGINAL_EU_PINNACLE = process.env["LINE_ARCHIVE_EU_PINNACLE"];

function clearFlags(): void {
  delete process.env["LINE_ARCHIVE_ENABLED"];
  delete process.env["LINE_ARCHIVE_EU_PINNACLE"];
}

function enableBothFlags(): void {
  process.env["LINE_ARCHIVE_ENABLED"] = "true";
  process.env["LINE_ARCHIVE_EU_PINNACLE"] = "true";
}

beforeEach(() => {
  clearFlags();
});

afterEach(() => {
  clearFlags();
  if (ORIGINAL_ENABLED !== undefined) process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENABLED;
  if (ORIGINAL_EU_PINNACLE !== undefined) {
    process.env["LINE_ARCHIVE_EU_PINNACLE"] = ORIGINAL_EU_PINNACLE;
  }
});

function mockDb(): LineArchiveDb & {
  oddsLineSnapshot: {
    count: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
} {
  return {
    oddsLineSnapshot: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

function pinnacleEvent(gameExternalId: string): NormalizedOdds {
  return {
    gameExternalId,
    bookmaker: PINNACLE_BOOKMAKER,
    market: "SPREADS",
    spread: -3.5,
    homeSpreadPrice: -108,
    awaySpreadPrice: -112,
    fetchedAt: new Date("2026-07-16T12:00:00Z"),
    bookmakerLastUpdate: new Date("2026-07-16T11:55:00Z"),
  };
}

const GAME_RECORDS = { ext_1: { id: "game_db_1" } };
const CAPTURED_AT = new Date("2026-07-16T12:00:00Z");

describe("isLineArchiveEuPinnacleEnabled", () => {
  it("is true only for the exact string 'true'", () => {
    expect(isLineArchiveEuPinnacleEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isLineArchiveEuPinnacleEnabled({ LINE_ARCHIVE_EU_PINNACLE: "1" } as unknown as NodeJS.ProcessEnv)).toBe(
      false,
    );
    expect(
      isLineArchiveEuPinnacleEnabled({ LINE_ARCHIVE_EU_PINNACLE: "true" } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});

describe("capturePinnacleLineSnapshotsIfEnabled — double gate", () => {
  it("never invokes fetchOdds when both flags are unset (the default)", async () => {
    const db = mockDb();
    const fetchOdds = vi.fn();
    const normalizeOdds = vi.fn();

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["h2h", "spreads", "totals"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    expect(result).toEqual({ enabled: false, persisted: 0, gamesArchived: 0 });
    expect(fetchOdds).not.toHaveBeenCalled();
    expect(normalizeOdds).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.count).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.createMany).not.toHaveBeenCalled();
  });

  it("never invokes fetchOdds when only LINE_ARCHIVE_ENABLED is true (EU_PINNACLE off)", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const db = mockDb();
    const fetchOdds = vi.fn();

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["h2h"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds: vi.fn(),
    });

    expect(result).toEqual({ enabled: false, persisted: 0, gamesArchived: 0 });
    expect(fetchOdds).not.toHaveBeenCalled();
  });

  it("never invokes fetchOdds when only LINE_ARCHIVE_EU_PINNACLE is true (base archive off)", async () => {
    process.env["LINE_ARCHIVE_EU_PINNACLE"] = "true";
    const db = mockDb();
    const fetchOdds = vi.fn();

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["h2h"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds: vi.fn(),
    });

    expect(result).toEqual({ enabled: false, persisted: 0, gamesArchived: 0 });
    expect(fetchOdds).not.toHaveBeenCalled();
  });

  it("no-ops when a non-'true' value is used (e.g. '1')", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    process.env["LINE_ARCHIVE_EU_PINNACLE"] = "1";
    const fetchOdds = vi.fn();

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db: mockDb(),
      sport: "americanfootball_nfl",
      markets: ["h2h"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds: vi.fn(),
    });

    expect(result.enabled).toBe(false);
    expect(fetchOdds).not.toHaveBeenCalled();
  });
});

describe("capturePinnacleLineSnapshotsIfEnabled — enabled: request + storage", () => {
  it("calls fetchOdds with regions=eu, bookmakers=[pinnacle] and the run's own sport/markets", async () => {
    enableBothFlags();
    const db = mockDb();
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ raw: true }] });
    const normalizeOdds = vi.fn().mockReturnValue([pinnacleEvent("ext_1")]);

    await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["h2h", "spreads", "totals"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    expect(fetchOdds).toHaveBeenCalledTimes(1);
    expect(fetchOdds).toHaveBeenCalledWith(
      "americanfootball_nfl",
      ["h2h", "spreads", "totals"],
      { regions: "eu", bookmakers: ["pinnacle"] },
    );
  });

  it("persists snapshots with bookmaker 'pinnacle' for each game with returned odds", async () => {
    enableBothFlags();
    const db = mockDb();
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: 2 });
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ raw: true }] });
    const normalizeOdds = vi.fn().mockReturnValue([pinnacleEvent("ext_1")]);

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["spreads"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    expect(result.enabled).toBe(true);
    expect(result.persisted).toBe(2);
    expect(result.gamesArchived).toBe(1);
    expect(db.oddsLineSnapshot.createMany).toHaveBeenCalledTimes(1);
    const data = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0].data;
    expect(data.length).toBeGreaterThan(0);
    for (const row of data) {
      expect(row.book).toBe("pinnacle");
      expect(row.gameId).toBe("game_db_1");
    }
  });

  it("archives every game present in gameRecords that has returned pinnacle odds", async () => {
    enableBothFlags();
    const db = mockDb();
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: 2 });
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ raw: true }] });
    const normalizeOdds = vi
      .fn()
      .mockReturnValue([pinnacleEvent("ext_1"), pinnacleEvent("ext_2")]);

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "basketball_nba",
      markets: ["spreads"],
      gameRecords: { ext_1: { id: "game_1" }, ext_2: { id: "game_2" } },
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    expect(result.gamesArchived).toBe(2);
    expect(db.oddsLineSnapshot.createMany).toHaveBeenCalledTimes(2);
  });

  it("skips a game cleanly (no db call) when normalizeOdds returns nothing for it", async () => {
    enableBothFlags();
    const db = mockDb();
    const fetchOdds = vi.fn().mockResolvedValue({ data: [] });
    const normalizeOdds = vi.fn().mockReturnValue([]); // no games have pinnacle odds this cycle

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["h2h"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    expect(result).toEqual({ enabled: true, persisted: 0, gamesArchived: 0 });
    expect(db.oddsLineSnapshot.count).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.createMany).not.toHaveBeenCalled();
  });

  it("defensively drops any non-pinnacle rows a lenient normalizer might return", async () => {
    enableBothFlags();
    const db = mockDb();
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: 2 });
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ raw: true }] });
    const normalizeOdds = vi.fn().mockReturnValue([
      pinnacleEvent("ext_1"),
      { ...pinnacleEvent("ext_1"), bookmaker: "some_other_book" },
    ]);

    await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["spreads"],
      gameRecords: GAME_RECORDS,
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    const data = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0].data;
    for (const row of data) {
      expect(row.book).toBe("pinnacle");
    }
  });
});

describe("capturePinnacleLineSnapshotsIfEnabled — failure isolation", () => {
  it("swallows a fetchOdds rejection and returns { error } instead of throwing", async () => {
    enableBothFlags();
    const fetchOdds = vi.fn().mockRejectedValue(new Error("eu region rate limited"));

    await expect(
      capturePinnacleLineSnapshotsIfEnabled({
        db: mockDb(),
        sport: "americanfootball_nfl",
        markets: ["h2h"],
        gameRecords: GAME_RECORDS,
        capturedAt: CAPTURED_AT,
        fetchOdds,
        normalizeOdds: vi.fn(),
      }),
    ).resolves.toEqual({
      enabled: true,
      persisted: 0,
      gamesArchived: 0,
      error: "eu region rate limited",
    });
  });

  it("swallows a normalizeOdds throw and returns { error } instead of throwing", async () => {
    enableBothFlags();
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ bad: true }] });
    const normalizeOdds = vi.fn().mockImplementation(() => {
      throw new Error("Unknown market key: props");
    });

    await expect(
      capturePinnacleLineSnapshotsIfEnabled({
        db: mockDb(),
        sport: "americanfootball_nfl",
        markets: ["h2h"],
        gameRecords: GAME_RECORDS,
        capturedAt: CAPTURED_AT,
        fetchOdds,
        normalizeOdds,
      }),
    ).resolves.toEqual({
      enabled: true,
      persisted: 0,
      gamesArchived: 0,
      error: "Unknown market key: props",
    });
  });

  it("main flow is unaffected: a rejecting db write for one game still lets others persist", async () => {
    enableBothFlags();
    const db = mockDb();
    // ext_1 fails, ext_2 succeeds — captureLineSnapshots isolates per-game failures.
    db.oddsLineSnapshot.count
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(0);
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: 2 });
    const fetchOdds = vi.fn().mockResolvedValue({ data: [{ raw: true }] });
    const normalizeOdds = vi
      .fn()
      .mockReturnValue([pinnacleEvent("ext_1"), pinnacleEvent("ext_2")]);

    const result = await capturePinnacleLineSnapshotsIfEnabled({
      db,
      sport: "americanfootball_nfl",
      markets: ["spreads"],
      gameRecords: { ext_1: { id: "game_1" }, ext_2: { id: "game_2" } },
      capturedAt: CAPTURED_AT,
      fetchOdds,
      normalizeOdds,
    });

    // No throw; ext_1's failure doesn't stop ext_2 from being archived.
    expect(result.enabled).toBe(true);
    expect(result.gamesArchived).toBe(1);
    expect(result.persisted).toBe(2);
  });
});
