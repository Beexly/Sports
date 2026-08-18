import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureLineSnapshots,
  captureLineSnapshotsIfEnabled,
  markClosingSnapshots,
  markClosingSnapshotsIfEnabled,
  toLineSnapshotRows,
  type LineArchiveDb,
} from "../line-archive.js";
import type { NormalizedOdds } from "@sports/types";

/**
 * line-archive.ts is INERT by default (LINE_ARCHIVE_ENABLED unset). These
 * tests pin:
 *   - flag unset: captureLineSnapshotsIfEnabled never touches the db
 *   - flag on: phase is OPEN on the first capture per (gameId, market),
 *     INTERIM thereafter
 *   - markClosingSnapshots re-tags only the latest pre-kickoff row per
 *     (market, book, side)
 *   - any db rejection is caught and returned as `{ error }`, never thrown
 */

const ORIGINAL_ENV = process.env["LINE_ARCHIVE_ENABLED"];

beforeEach(() => {
  delete process.env["LINE_ARCHIVE_ENABLED"];
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env["LINE_ARCHIVE_ENABLED"];
  } else {
    process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENV;
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
      count: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

const ROWS = [
  { book: "fanduel", market: "SPREAD" as const, side: "home", price: -110, line: -3.5 },
  { book: "fanduel", market: "SPREAD" as const, side: "away", price: -110, line: 3.5 },
];

describe("captureLineSnapshotsIfEnabled — hard gate", () => {
  it("no-ops with zero db calls when LINE_ARCHIVE_ENABLED is unset", async () => {
    const db = mockDb();
    const result = await captureLineSnapshotsIfEnabled({
      db,
      gameId: "game_1",
      capturedAt: new Date("2026-07-16T12:00:00Z"),
      rows: ROWS,
    });

    expect(result).toEqual({ enabled: false, persisted: 0 });
    expect(db.oddsLineSnapshot.count).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.createMany).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.findMany).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.update).not.toHaveBeenCalled();
  });

  it("no-ops when LINE_ARCHIVE_ENABLED is set to a non-'true' value", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "1";
    const db = mockDb();
    const result = await captureLineSnapshotsIfEnabled({
      db,
      gameId: "game_1",
      capturedAt: new Date(),
      rows: ROWS,
    });

    expect(result).toEqual({ enabled: false, persisted: 0 });
    expect(db.oddsLineSnapshot.count).not.toHaveBeenCalled();
  });

  it("persists and delegates to captureLineSnapshots when LINE_ARCHIVE_ENABLED=true", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const db = mockDb();
    db.oddsLineSnapshot.count.mockResolvedValue(0);
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: ROWS.length });

    const result = await captureLineSnapshotsIfEnabled({
      db,
      gameId: "game_1",
      capturedAt: new Date("2026-07-16T12:00:00Z"),
      rows: ROWS,
    });

    expect(result).toEqual({ enabled: true, persisted: ROWS.length });
    expect(db.oddsLineSnapshot.createMany).toHaveBeenCalledTimes(1);
  });
});

describe("captureLineSnapshots — phase classification", () => {
  it("tags rows OPEN when this is the first snapshot ever for (gameId, market)", async () => {
    const db = mockDb();
    db.oddsLineSnapshot.count.mockResolvedValue(0);
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: ROWS.length });

    const result = await captureLineSnapshots({
      db,
      gameId: "game_1",
      capturedAt: new Date("2026-07-16T12:00:00Z"),
      rows: ROWS,
    });

    expect(result).toEqual({ persisted: ROWS.length });
    expect(db.oddsLineSnapshot.count).toHaveBeenCalledWith({
      where: { gameId: "game_1", market: "SPREAD" },
    });
    const data = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0].data;
    expect(data).toHaveLength(ROWS.length);
    for (const row of data) {
      expect(row.phase).toBe("OPEN");
    }
  });

  it("tags rows INTERIM when a snapshot already exists for (gameId, market)", async () => {
    const db = mockDb();
    db.oddsLineSnapshot.count.mockResolvedValue(2); // prior snapshots exist
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: ROWS.length });

    await captureLineSnapshots({
      db,
      gameId: "game_1",
      capturedAt: new Date("2026-07-16T13:00:00Z"),
      rows: ROWS,
    });

    const data = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0].data;
    for (const row of data) {
      expect(row.phase).toBe("INTERIM");
    }
  });

  it("classifies phase independently per market within one call", async () => {
    const db = mockDb();
    // SPREAD has no prior snapshots (OPEN); MONEYLINE already has one (INTERIM).
    db.oddsLineSnapshot.count.mockImplementation(
      async ({ where }: { where: { market: string } }) =>
        where.market === "SPREAD" ? 0 : 1,
    );
    db.oddsLineSnapshot.createMany.mockResolvedValue({ count: 2 });

    const mixedRows = [
      { book: "fanduel", market: "SPREAD" as const, side: "home", price: -110, line: -3.5 },
      { book: "fanduel", market: "MONEYLINE" as const, side: "home", price: -150 },
    ];

    await captureLineSnapshots({
      db,
      gameId: "game_1",
      capturedAt: new Date(),
      rows: mixedRows,
    });

    const data = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0].data;
    const spreadRow = data.find((r: { market: string }) => r.market === "SPREAD");
    const mlRow = data.find((r: { market: string }) => r.market === "MONEYLINE");
    expect(spreadRow.phase).toBe("OPEN");
    expect(mlRow.phase).toBe("INTERIM");
  });

  it("does nothing (no db calls) when rows is empty", async () => {
    const db = mockDb();
    const result = await captureLineSnapshots({
      db,
      gameId: "game_1",
      capturedAt: new Date(),
      rows: [],
    });

    expect(result).toEqual({ persisted: 0 });
    expect(db.oddsLineSnapshot.count).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.createMany).not.toHaveBeenCalled();
  });
});

describe("captureLineSnapshots — failure isolation", () => {
  it("returns { error } instead of throwing when the db rejects", async () => {
    const db = mockDb();
    db.oddsLineSnapshot.count.mockRejectedValue(new Error("connection reset"));

    await expect(
      captureLineSnapshots({
        db,
        gameId: "game_1",
        capturedAt: new Date(),
        rows: ROWS,
      }),
    ).resolves.toEqual({ persisted: 0, error: "connection reset" });
  });

  it("captureLineSnapshotsIfEnabled also never throws on a rejecting db", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const db = mockDb();
    db.oddsLineSnapshot.count.mockRejectedValue(new Error("pool exhausted"));

    await expect(
      captureLineSnapshotsIfEnabled({
        db,
        gameId: "game_1",
        capturedAt: new Date(),
        rows: ROWS,
      }),
    ).resolves.toEqual({ enabled: true, persisted: 0, error: "pool exhausted" });
  });
});

describe("markClosingSnapshots", () => {
  it("re-tags only the latest pre-kickoff row per (market, book, side)", async () => {
    const db = mockDb();
    const kickoff = new Date("2026-07-16T18:00:00Z");
    const rows = [
      // (SPREAD, fanduel, home): two captures, the second is the latest.
      { id: "s1", market: "SPREAD", book: "fanduel", side: "home", phase: "OPEN", capturedAt: new Date("2026-07-15T12:00:00Z") },
      { id: "s2", market: "SPREAD", book: "fanduel", side: "home", phase: "INTERIM", capturedAt: new Date("2026-07-16T10:00:00Z") },
      // (SPREAD, fanduel, away): a single capture — it is trivially the latest.
      { id: "s3", market: "SPREAD", book: "fanduel", side: "away", phase: "OPEN", capturedAt: new Date("2026-07-15T12:00:00Z") },
      // (MONEYLINE, draftkings, home): already CLOSE — must be skipped (idempotent).
      { id: "s4", market: "MONEYLINE", book: "draftkings", side: "home", phase: "CLOSE", capturedAt: new Date("2026-07-16T11:00:00Z") },
    ];
    db.oddsLineSnapshot.findMany.mockResolvedValue(rows);
    db.oddsLineSnapshot.update.mockResolvedValue({});

    const result = await markClosingSnapshots(db, "game_1", kickoff);

    expect(db.oddsLineSnapshot.findMany).toHaveBeenCalledWith({
      where: { gameId: "game_1", capturedAt: { lte: kickoff } },
    });
    // Only s2 (latest SPREAD/fanduel/home) and s3 (only SPREAD/fanduel/away
    // row) are updated; s1 is superseded, s4 is already CLOSE.
    expect(db.oddsLineSnapshot.update).toHaveBeenCalledTimes(2);
    expect(db.oddsLineSnapshot.update).toHaveBeenCalledWith({
      where: { id: "s2" },
      data: { phase: "CLOSE" },
    });
    expect(db.oddsLineSnapshot.update).toHaveBeenCalledWith({
      where: { id: "s3" },
      data: { phase: "CLOSE" },
    });
    expect(db.oddsLineSnapshot.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" } }),
    );
    expect(db.oddsLineSnapshot.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s4" } }),
    );
    expect(result).toEqual({ updated: 2 });
  });

  it("returns { error } instead of throwing when the db rejects", async () => {
    const db = mockDb();
    db.oddsLineSnapshot.findMany.mockRejectedValue(new Error("timeout"));

    await expect(markClosingSnapshots(db, "game_1", new Date())).resolves.toEqual({
      updated: 0,
      error: "timeout",
    });
  });
});

describe("markClosingSnapshotsIfEnabled — hard gate", () => {
  it("no-ops with zero db calls when LINE_ARCHIVE_ENABLED is unset", async () => {
    const db = mockDb();
    const result = await markClosingSnapshotsIfEnabled(db, "game_1", new Date());
    expect(result).toEqual({ enabled: false, updated: 0 });
    expect(db.oddsLineSnapshot.findMany).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.update).not.toHaveBeenCalled();
  });

  it("invokes the closer when LINE_ARCHIVE_ENABLED=true", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const db = mockDb();
    db.oddsLineSnapshot.findMany.mockResolvedValue([]);
    const result = await markClosingSnapshotsIfEnabled(db, "game_1", new Date("2026-07-16T18:00:00Z"));
    expect(result).toEqual({ enabled: true, updated: 0 });
    expect(db.oddsLineSnapshot.findMany).toHaveBeenCalled();
  });

  it("never throws when the closer rejects", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const db = mockDb();
    db.oddsLineSnapshot.findMany.mockRejectedValue(new Error("archive down"));
    await expect(
      markClosingSnapshotsIfEnabled(db, "game_1", new Date()),
    ).resolves.toEqual({ enabled: true, updated: 0, error: "archive down" });
  });
});

describe("toLineSnapshotRows", () => {
  it("flattens NormalizedOdds into per-side rows without inventing values", () => {
    const fetchedAt = new Date("2026-07-16T12:00:00Z");
    const gameOdds: NormalizedOdds[] = [
      {
        gameExternalId: "ext_1",
        bookmaker: "fanduel",
        market: "H2H",
        homePrice: -150,
        awayPrice: 130,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      },
      {
        gameExternalId: "ext_1",
        bookmaker: "fanduel",
        market: "SPREADS",
        spread: -3.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      },
      {
        gameExternalId: "ext_1",
        bookmaker: "fanduel",
        market: "TOTALS",
        total: 48.5,
        overPrice: -105,
        underPrice: -115,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      },
    ];

    const rows = toLineSnapshotRows(gameOdds);

    expect(rows).toEqual(
      expect.arrayContaining([
        { book: "fanduel", market: "MONEYLINE", side: "home", price: -150, line: null },
        { book: "fanduel", market: "MONEYLINE", side: "away", price: 130, line: null },
        { book: "fanduel", market: "SPREAD", side: "home", price: -110, line: -3.5 },
        // NormalizedOdds.spread is the HOME point; the away handicap is its
        // negation. The old expectation here (-3.5 on both sides) encoded the
        // exact grading bug this pins against: an away selection stored with
        // the home handicap grades against the opposite line.
        { book: "fanduel", market: "SPREAD", side: "away", price: -110, line: 3.5 },
        { book: "fanduel", market: "TOTAL", side: "over", price: -105, line: 48.5 },
        { book: "fanduel", market: "TOTAL", side: "under", price: -115, line: 48.5 },
      ]),
    );
    expect(rows).toHaveLength(6);
  });
});
