import { describe, expect, it, vi, afterEach } from "vitest";
import {
  POST_SETTLEMENT_WORK_CANCELLED,
  cancelPostSettlementWork,
  type PostSettlementWorkDelegate,
} from "../post-settlement-work.js";

/**
 * C-286 (ledger C-197 / C-280; Devin Review #733).
 *
 * `cancelPostSettlementWork` must never throw — a failed retirement cannot be
 * allowed to abort a drain that is otherwise making progress — but "never
 * throws" was implemented as "tells the caller nothing", and the caller then
 * counted every attempt as a retirement. A row whose cancellation did not land
 * is still PENDING and still occupies the oldest batch next cycle: the exact
 * starvation retirement was added to end, hidden behind a count claiming it had
 * been dealt with.
 *
 * So the contract under test is narrow and specific: it still never throws, AND
 * the number it returns is what the database actually changed.
 */

function delegate(impl: () => Promise<{ count: number }>): PostSettlementWorkDelegate {
  return {
    createMany: async () => ({ count: 0 }),
    updateMany: impl,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cancelPostSettlementWork reports what the database actually did", () => {
  it("returns the row count on a retirement that landed", async () => {
    const n = await cancelPostSettlementWork(
      delegate(async () => ({ count: 1 })),
      "pick-1",
      "CLV_GRADE",
      "withdrawn",
    );
    expect(n).toBe(1);
  });

  it("returns 0 when the update matched nothing", async () => {
    const n = await cancelPostSettlementWork(
      delegate(async () => ({ count: 0 })),
      "pick-1",
      "CLV_GRADE",
      "withdrawn",
    );
    expect(n).toBe(0);
  });

  it("returns 0 — and does NOT throw — when the update throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const n = await cancelPostSettlementWork(
      delegate(async () => {
        throw new Error("connection reset");
      }),
      "pick-1",
      "CLV_GRADE",
      "withdrawn",
    );
    expect(n).toBe(0);
  });

  it("writes the terminal status, the reason and the completion time", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const now = new Date("2026-09-09T06:00:00Z");
    await cancelPostSettlementWork(
      {
        createMany: async () => ({ count: 0 }),
        updateMany: async (args) => {
          calls.push(args as unknown as Record<string, unknown>);
          return { count: 1 };
        },
      },
      "pick-1",
      "CLV_GRADE",
      "pick withdrawn to VOID",
      now,
    );
    expect(calls[0]).toEqual({
      where: { subjectId: "pick-1", kind: "CLV_GRADE" },
      data: {
        status: POST_SETTLEMENT_WORK_CANCELLED,
        completedAt: now,
        lastError: "pick withdrawn to VOID",
      },
    });
    // CANCELLED is deliberately neither DONE (the work happened) nor FAILED
    // (retry it); the only readers filter on PENDING, so it is invisible to
    // them and nothing is deleted.
    expect(POST_SETTLEMENT_WORK_CANCELLED).toBe("CANCELLED");
  });
});
