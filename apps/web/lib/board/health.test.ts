import { describe, expect, it } from "vitest";
import { buildBoardHealth, createBoardTraceId } from "@/lib/board/health";

const BASE = {
  modelVersion: "v5.1.0",
  now: new Date("2026-06-24T16:00:00.000Z"),
  rowCounts: { gatedTodayRows: 1, publishedToday: 2, scoringNow: 3 },
};

describe("board health", () => {
  it("emits a stable trace id for the same request inputs", () => {
    expect(createBoardTraceId(BASE)).toBe(createBoardTraceId(BASE));
    expect(createBoardTraceId(BASE)).toMatch(/^board-20260624T160000-[0-9a-f]{8}$/);
  });

  it("reports healthy when live rows are present without degradations", () => {
    const report = buildBoardHealth(BASE);

    expect(report.badge).toMatchObject({
      draftOnly: true,
      label: "Healthy",
      priced: false,
      rowCount: 6,
      status: "HEALTHY",
    });
    expect(report.degradations).toEqual([]);
  });

  it("reports unavailable with a critical degradation when the data store is down", () => {
    const report = buildBoardHealth({
      ...BASE,
      dataError: "DB_UNREACHABLE",
      rowCounts: { gatedTodayRows: 0, publishedToday: 0, scoringNow: 0 },
    });

    expect(report.badge.status).toBe("UNAVAILABLE");
    expect(report.degradations).toEqual([
      {
        code: "DATA_STORE_UNREACHABLE",
        message: "Board data store did not answer; empty nonblocking state returned.",
        severity: "critical",
        source: "board-state",
      },
    ]);
  });

  it("distinguishes stale suppression from normal empty collection", () => {
    const stale = buildBoardHealth({
      ...BASE,
      rowCounts: { gatedTodayRows: 0, publishedToday: 0, scoringNow: 0 },
      suppressedReason: "STALE_DATA",
    });
    const empty = buildBoardHealth({
      ...BASE,
      rowCounts: { gatedTodayRows: 0, publishedToday: 0, scoringNow: 0 },
    });

    expect(stale.badge.status).toBe("UNAVAILABLE");
    expect(stale.degradations[0]?.code).toBe("STALE_DATA_SUPPRESSED");
    expect(empty.badge.status).toBe("DEGRADED");
    expect(empty.degradations[0]?.code).toBe("NO_ACTIVE_BOARD_ROWS");
  });
});
