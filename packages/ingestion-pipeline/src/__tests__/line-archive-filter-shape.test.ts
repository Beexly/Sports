import { describe, expect, it, vi } from "vitest";
import { captureLineSnapshots } from "../line-archive.js";

/**
 * The line archive stopped writing on 2026-08-22 and nobody noticed for three
 * weeks. `odds_line_snapshots` held 684,498 rows spanning only 2026-08-19 to
 * 2026-08-22, which is the ESTABLISHED-tier CLV blocker: closing lines are not
 * being recorded, so CLV cannot be graded on any pick generated since.
 *
 * The cause was one argument shape. `544d0148e` (2026-08-22, "line-archive N+1
 * batch") replaced N per-market `count()` calls with a single `findMany`, and
 * wrote the filter as:
 *
 *     where: { gameId, market: markets }        // markets is string[]
 *
 * `OddsLineSnapshot.market` is a scalar String column (schema.prisma:473).
 * Prisma spells list membership on a scalar as `{ in: [...] }`; a bare array is
 * a validation error. Every capture after that commit threw at this line, and
 * `captureLineSnapshots` wraps its body in a catch that returns
 * `{ persisted: 0, error }` rather than raising, so the pipeline reported a
 * soft failure nobody read and the archive went quiet.
 *
 * THREE THINGS LET IT SURVIVE, and this file is aimed at the third:
 *
 *   1. The catch swallows. Failure isolation is correct here (a broken archive
 *      must not take down ingestion) but it means the only signal was the row
 *      count, which nothing monitors.
 *   2. `db` enters the module as `unknown` and is cast to `LineArchiveDb`, so
 *      the real Prisma client's types never constrain the call.
 *   3. `LineArchiveDb` declared `market?: readonly string[]` — the interface
 *      was written to match the buggy call instead of Prisma's actual filter.
 *      With the type endorsing the mistake, `tsc` passed for three weeks.
 *
 * A test double is a `vi.fn()`, so no amount of mocking reproduces Prisma's
 * validation. The only thing a unit test CAN do is assert the exact argument
 * shape handed to the driver. That is what this does, and it is why it is a
 * separate file: it is not testing behaviour, it is pinning a wire format.
 */

const ROWS = [
  { book: "fanduel", market: "SPREAD", side: "HOME", price: -110, line: -1.5 },
  { book: "fanduel", market: "MONEYLINE", side: "HOME", price: -150, line: null },
  { book: "draftkings", market: "SPREAD", side: "AWAY", price: -110, line: 1.5 },
];

function dbDouble() {
  const findMany = vi.fn().mockResolvedValue([]);
  const createMany = vi.fn().mockResolvedValue({ count: ROWS.length });
  const update = vi.fn().mockResolvedValue({});
  return { db: { oddsLineSnapshot: { findMany, createMany, update } }, findMany, createMany };
}

describe("the existence check hands Prisma a filter Prisma accepts", () => {
  it("spells market membership as { in: [...] }, never as a bare array", async () => {
    const { db, findMany } = dbDouble();
    await captureLineSnapshots({
      db,
      gameId: "g1",
      capturedAt: new Date("2026-09-13T20:00:00Z"),
      rows: ROWS,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0]![0]!.where as Record<string, unknown>;

    // The regression, stated directly: a bare array here is the bug.
    expect(Array.isArray(where["market"])).toBe(false);
    expect(where["market"]).toEqual({ in: expect.arrayContaining(["SPREAD", "MONEYLINE"]) });
    expect(where["gameId"]).toBe("g1");
  });

  it("still batches — one findMany for the whole capture, not one per market", async () => {
    // The commit that introduced the bug was fixing a real N+1 that would melt
    // Neon on a dense slate. Fixing the filter must not undo that.
    const { db, findMany } = dbDouble();
    await captureLineSnapshots({
      db,
      gameId: "g1",
      capturedAt: new Date("2026-09-13T20:00:00Z"),
      rows: ROWS,
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    const markets = (findMany.mock.calls[0]![0]!.where as { market: { in: string[] } }).market.in;
    // Distinct markets only, not one entry per row.
    expect([...markets].sort()).toEqual(["MONEYLINE", "SPREAD"]);
  });

  it("actually persists when the driver accepts the call", async () => {
    // The end state the outage denied us: rows reaching createMany.
    const { db, createMany } = dbDouble();
    const result = await captureLineSnapshots({
      db,
      gameId: "g1",
      capturedAt: new Date("2026-09-13T20:00:00Z"),
      rows: ROWS,
    });
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(result.error).toBeUndefined();
    expect(result.persisted).toBeGreaterThan(0);
  });

  it("reports the error rather than pretending it wrote, when the driver rejects", async () => {
    // Failure isolation is correct; silent SUCCESS would not be. A caller that
    // wants to alarm on this has something to read.
    const findMany = vi.fn().mockRejectedValue(new Error("Invalid `prisma.oddsLineSnapshot.findMany()`"));
    const result = await captureLineSnapshots({
      db: { oddsLineSnapshot: { findMany, createMany: vi.fn(), update: vi.fn() } },
      gameId: "g1",
      capturedAt: new Date("2026-09-13T20:00:00Z"),
      rows: ROWS,
    });
    expect(result.persisted).toBe(0);
    expect(result.error).toContain("findMany");
  });
});
