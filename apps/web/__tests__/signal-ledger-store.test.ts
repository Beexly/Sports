/**
 * Tests for the stored-signal reader (`apps/web/lib/ops/signal-ledger-store.ts`).
 *
 * The reader's contract: it maps persisted `signals` rows to composer input
 * with NO reinterpretation — value, weight, confidence, and capturedAt pass
 * through exactly as stored — and it drops uncomposable rows rather than
 * defaulting them. The composer must never blend a synthetic vote.
 */
import { describe, it, expect, vi } from "vitest";
import { readStoredSignals, type SignalStoreDb } from "@/lib/ops/signal-ledger-store";

function makeDb(
  rows: ReadonlyArray<Record<string, unknown>>,
): SignalStoreDb & { findMany: ReturnType<typeof vi.fn> } {
  const findMany = vi.fn(async () => rows);
  return { signal: { findMany }, findMany };
}

const GOOD_ROW = {
  entityType: "player",
  entityId: "00-0034796",
  key: "pgs.fantasy_ppr",
  category: "PRODUCTION",
  value: 0.42,
  weight: 0.9,
  confidence: 1,
  capturedAt: new Date("2026-09-30T12:00:00.000Z"),
  season: 2026,
  week: 4,
};

describe("readStoredSignals", () => {
  it("maps a stored row faithfully — value, weight, confidence, capturedAt pass through", async () => {
    const db = makeDb([GOOD_ROW]);
    const report = await readStoredSignals(db);

    expect(report.rowsRead).toBe(1);
    expect(report.rowsDropped).toBe(0);
    expect(report.candidates).toHaveLength(1);
    const c = report.candidates[0]!;
    expect(c.entityType).toBe("player");
    expect(c.entityId).toBe("00-0034796");
    expect(c.key).toBe("pgs.fantasy_ppr");
    expect(c.value).toBe(0.42);
    expect(c.weight).toBe(0.9);
    expect(c.confidence).toBe(1);
    expect(c.capturedAt).toBe("2026-09-30T12:00:00.000Z");
    expect(c.season).toBe(2026);
    expect(c.week).toBe(4);
  });

  it("accepts ISO-string timestamps from serialized clients", async () => {
    const db = makeDb([{ ...GOOD_ROW, capturedAt: "2026-09-30T12:00:00.000Z" }]);
    const report = await readStoredSignals(db);
    expect(report.rowsDropped).toBe(0);
    expect(report.candidates[0]!.capturedAt).toBe("2026-09-30T12:00:00.000Z");
  });

  it("drops uncomposable rows and counts them — never defaults", async () => {
    const bad = [
      { ...GOOD_ROW, entityType: "coach" }, // unknown entity class
      { ...GOOD_ROW, value: Number.NaN }, // non-finite value
      { ...GOOD_ROW, weight: -1 }, // negative weight
      { ...GOOD_ROW, confidence: 1.5 }, // confidence outside 0..1
      { ...GOOD_ROW, entityId: "" }, // no entity
      { ...GOOD_ROW, capturedAt: "not-a-date" }, // unparsable timestamp
    ];
    const db = makeDb([GOOD_ROW, ...bad]);
    const report = await readStoredSignals(db);

    expect(report.rowsRead).toBe(7);
    expect(report.rowsDropped).toBe(6);
    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0]!.entityId).toBe("00-0034796");
  });

  it("passes the filter into the where clause with ordering and a bounded take", async () => {
    const db = makeDb([]);
    await readStoredSignals(db, { entityType: "team", season: 2026, week: 4, limit: 1000 });

    expect(db.findMany).toHaveBeenCalledTimes(1);
    const args = db.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
      take: number;
    };
    expect(args.where).toEqual({ entityType: "team", season: 2026, week: 4 });
    expect(args.orderBy).toEqual({ capturedAt: "desc" });
    expect(args.take).toBe(1000);
  });

  it("defaults to a bounded take and returns an empty report on no rows", async () => {
    const db = makeDb([]);
    const report = await readStoredSignals(db);

    const args = db.findMany.mock.calls[0]![0] as { take: number };
    expect(args.take).toBe(50_000);
    expect(report.rowsRead).toBe(0);
    expect(report.rowsDropped).toBe(0);
    expect(report.candidates).toEqual([]);
  });
});
