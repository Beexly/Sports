import { describe, expect, it, vi } from "vitest";
import { rebuildPerformanceSummaries } from "@/lib/performance/rebuild-performance-summaries";
import type { PerformanceSummaryWriterDb } from "@/lib/performance/persist-performance-summaries";

const KICKOFF = new Date("2026-09-10T23:00:00Z");

function rawRow(over: Record<string, unknown> = {}) {
  return {
    result: "WIN",
    settledAt: new Date("2026-09-11T02:00:00Z"),
    generatedAt: new Date("2026-09-10T12:00:00Z"),
    pickType: "MONEYLINE",
    tier: "A",
    modelVersion: "v5.2.7",
    game: { commenceTime: KICKOFF, sport: { key: "baseball_mlb" } },
    ...over,
  };
}

function fakeWriter() {
  const created: Array<{ data: readonly unknown[] }> = [];
  const db: PerformanceSummaryWriterDb = {
    $transaction: async (fn) =>
      fn({
        performanceSummary: {
          deleteMany: async () => ({ count: 0 }),
          createMany: async (args) => {
            created.push(args);
            return { count: args.data.length };
          },
        },
      }),
  };
  return { db, created };
}

describe("rebuildPerformanceSummaries", () => {
  it("reads NOTHING while the flag is off — not a query, not a transaction", async () => {
    const findMany = vi.fn();
    const writer = { $transaction: vi.fn() };
    const res = await rebuildPerformanceSummaries({
      env: {},
      reader: { pick: { findMany } },
      writer: writer as unknown as PerformanceSummaryWriterDb,
    });
    expect(res.status).toBe("skipped_flag_off");
    expect(res.written).toBe(0);
    expect(res.periods).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
    expect(writer.$transaction).not.toHaveBeenCalled();
  });

  it("filters to the canonical population in the query it sends", async () => {
    let seenArgs: Record<string, unknown> | null = null;
    const { db: writer } = fakeWriter();
    await rebuildPerformanceSummaries({
      env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" },
      reader: {
        pick: {
          findMany: async (args) => {
            seenArgs = args;
            return [rawRow()];
          },
        },
      },
      writer,
    });
    expect(seenArgs).toMatchObject({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
    });
    // The clocks have to be selected or the in-play exclusion is inert.
    const select = (seenArgs as unknown as { select: Record<string, unknown> }).select;
    expect(select.generatedAt).toBe(true);
    expect(select.game).toMatchObject({ select: { commenceTime: true, sport: { select: { key: true } } } });
  });

  it("builds and reports what the build withheld, end to end", async () => {
    const { db: writer, created } = fakeWriter();
    const res = await rebuildPerformanceSummaries({
      env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" },
      reader: {
        pick: {
          findMany: async () => [
            rawRow(),
            rawRow({ result: "LOSS" }),
            rawRow({ result: "PUSH" }),
            // in-play: generated after kickoff, must be withheld and reported
            rawRow({ result: "WIN", generatedAt: new Date("2026-09-10T23:30:00Z") }),
          ],
        },
      },
      writer,
    });
    expect(res.status).toBe("written");
    expect(res.written).toBe(2); // all-time + 2026-09
    expect(res.skipped.inPlay).toBe(1);
    expect(res.periods).toEqual(["2026-09", "all-time"]);
    const allTime = (created[0].data as Array<{ period: string; totalPicks: number; wins: number }>).find(
      (r) => r.period === "all-time",
    )!;
    expect(allTime).toMatchObject({ totalPicks: 3, wins: 1 });
  });

  it("reports a null sport rather than inventing one, and does not write it", async () => {
    const { db: writer, created } = fakeWriter();
    const res = await rebuildPerformanceSummaries({
      env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" },
      reader: { pick: { findMany: async () => [rawRow({ game: { commenceTime: KICKOFF, sport: null } })] } },
      writer,
    });
    expect(res.skipped.unkeyable).toBe(1);
    expect(res.written).toBe(0);
    // No insert at all rather than an empty one: with nothing to write the persist
    // path clears and stops, so createMany is never called.
    expect(created).toHaveLength(0);
  });
});
