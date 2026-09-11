import { describe, expect, it, vi } from "vitest";
import {
  PERFORMANCE_SUMMARIES_WRITE_FLAG,
  performanceSummariesWriteEnabled,
  persistPerformanceSummaries,
  type PerformanceSummaryWriterDb,
} from "@/lib/performance/persist-performance-summaries";
import type { PerformanceSummaryRow } from "@/lib/performance/build-performance-summaries";

function summaryRow(over: Partial<PerformanceSummaryRow> = {}): PerformanceSummaryRow {
  return {
    sport: "baseball_mlb",
    league: null,
    pickType: "MONEYLINE",
    tier: "A",
    modelVersion: "v5.2.7",
    totalPicks: 10,
    wins: 6,
    losses: 4,
    pushes: 0,
    winRate: 0.6,
    period: "all-time",
    ...over,
  };
}

/** A fake writer that records what the transaction did. */
function fakeWriter(existingRows = 7) {
  const calls: string[] = [];
  const createMany = vi.fn(async (args: { data: readonly unknown[] }) => {
    calls.push(`createMany:${args.data.length}`);
    return { count: args.data.length };
  });
  const deleteMany = vi.fn(async () => {
    calls.push("deleteMany");
    return { count: existingRows };
  });
  const db: PerformanceSummaryWriterDb = {
    $transaction: async (fn) => {
      calls.push("begin");
      const out = await fn({ performanceSummary: { deleteMany, createMany } });
      calls.push("commit");
      return out;
    },
  };
  return { db, calls, createMany, deleteMany };
}

describe("the write flag follows the repo's env idiom", () => {
  it("is off unless the value is exactly true, trimmed and case-insensitive", () => {
    expect(PERFORMANCE_SUMMARIES_WRITE_FLAG).toBe("PERFORMANCE_SUMMARIES_WRITE_ENABLED");
    expect(performanceSummariesWriteEnabled({})).toBe(false);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "" })).toBe(false);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "1" })).toBe(false);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "yes" })).toBe(false);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "false" })).toBe(false);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "TRUE" })).toBe(true);
    expect(performanceSummariesWriteEnabled({ PERFORMANCE_SUMMARIES_WRITE_ENABLED: "  true  " })).toBe(true);
  });
});

describe("persistPerformanceSummaries — inert until deliberately enabled", () => {
  it("writes nothing at all while the flag is off, not even a transaction", async () => {
    const { db, calls, deleteMany, createMany } = fakeWriter();
    const res = await persistPerformanceSummaries(db, [summaryRow()], { env: {} });
    expect(res).toEqual({ status: "skipped_flag_off", replaced: 0, written: 0 });
    expect(calls).toEqual([]);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rebuilds atomically when enabled: delete and insert inside ONE transaction", async () => {
    const { db, calls } = fakeWriter(7);
    const res = await persistPerformanceSummaries(db, [summaryRow(), summaryRow({ period: "2026-09" })], {
      env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" },
    });
    expect(res).toEqual({ status: "written", replaced: 7, written: 2 });
    // Order matters: the delete must be inside the same transaction as the insert.
    expect(calls).toEqual(["begin", "deleteMany", "createMany:2", "commit"]);
  });

  it("is idempotent: a second call replaces the build rather than appending to it", async () => {
    const { db, createMany } = fakeWriter();
    const rows = [summaryRow()];
    await persistPerformanceSummaries(db, rows, { env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" } });
    await persistPerformanceSummaries(db, rows, { env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" } });
    // Two runs, two inserts of the SAME length: no accumulation.
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany.mock.calls.every((c) => c[0].data.length === 1)).toBe(true);
  });

  it("clears stale rows when the population is empty, rather than leaving a record that no longer describes it", async () => {
    const { db, calls } = fakeWriter(9);
    const res = await persistPerformanceSummaries(db, [], { env: { PERFORMANCE_SUMMARIES_WRITE_ENABLED: "true" } });
    expect(res).toEqual({ status: "written", replaced: 9, written: 0 });
    expect(calls).toEqual(["begin", "deleteMany", "commit"]);
  });
});
