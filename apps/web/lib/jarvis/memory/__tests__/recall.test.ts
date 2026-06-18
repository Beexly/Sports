/**
 * Tests for recallConfirmedLessons() — the read-only memory recall (J7).
 *
 * Verifies the recall contract:
 *   - The query is gated to confirmed + repeated_pattern and excludes expired
 *     (asserted via the `where` argument passed to the DB).
 *   - Non-confirmed / expired rows are never surfaced.
 *   - Recall is never-throw: a DB failure (or unwired store) → honest [].
 *   - Mapping is faithful (learnedAt falls back to created_at).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB so we control jarvisMemoryEvent.findMany without a real database.
const findMany = vi.fn();
vi.mock("@sports/db", () => ({
  db: { jarvisMemoryEvent: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

import { recallConfirmedLessons, RECALLABLE_STATES } from "../recall";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1",
    memory_type: "episodic",
    memory_state: "confirmed",
    scope: "picks.gate",
    title: "Gate opened",
    summary: "Owner opened the pro gate on 2026-06-01.",
    confidence: 80,
    sensitivity: "normal",
    confirmed_at: new Date("2026-06-01T00:00:00Z"),
    created_at: new Date("2026-05-31T00:00:00Z"),
    tags: ["gate"],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recallConfirmedLessons — gating", () => {
  it("queries ONLY confirmed + repeated_pattern states", async () => {
    findMany.mockResolvedValue([]);
    await recallConfirmedLessons();
    const where = findMany.mock.calls[0]![0].where;
    expect(where.memory_state).toEqual({ in: [...RECALLABLE_STATES] });
    expect([...RECALLABLE_STATES].sort()).toEqual(["confirmed", "repeated_pattern"]);
  });

  it("excludes expired rows in the query (expires_at null OR in the future)", async () => {
    findMany.mockResolvedValue([]);
    await recallConfirmedLessons();
    const where = findMany.mock.calls[0]![0].where;
    expect(Array.isArray(where.OR)).toBe(true);
    // null-expiry branch
    expect(where.OR).toEqual(
      expect.arrayContaining([{ expires_at: null }])
    );
    // future-expiry branch — gt is a Date strictly in the future of "now"
    const futureBranch = where.OR.find(
      (b: { expires_at?: { gt?: Date } }) => b.expires_at?.gt instanceof Date
    );
    expect(futureBranch).toBeDefined();
    expect(futureBranch.expires_at.gt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("orders by recency (confirmed_at desc, created_at desc) and bounds rows", async () => {
    findMany.mockResolvedValue([]);
    await recallConfirmedLessons({ limit: 5 });
    const args = findMany.mock.calls[0]![0];
    expect(args.orderBy).toEqual([
      { confirmed_at: "desc" },
      { created_at: "desc" },
    ]);
    expect(args.take).toBe(5);
  });

  it("applies scope and tags filters when provided", async () => {
    findMany.mockResolvedValue([]);
    await recallConfirmedLessons({ scope: "model.routing", tags: ["clv"] });
    const where = findMany.mock.calls[0]![0].where;
    expect(where.scope).toBe("model.routing");
    expect(where.tags).toEqual({ hasSome: ["clv"] });
  });
});

describe("recallConfirmedLessons — mapping + honesty", () => {
  it("maps confirmed rows to compact lessons", async () => {
    findMany.mockResolvedValue([row()]);
    const lessons = await recallConfirmedLessons();
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({
      id: "mem-1",
      memoryState: "confirmed",
      scope: "picks.gate",
      title: "Gate opened",
      confidence: 80,
    });
    expect(lessons[0]!.learnedAt).toEqual(new Date("2026-06-01T00:00:00Z"));
  });

  it("falls back to created_at for learnedAt when confirmed_at is null", async () => {
    findMany.mockResolvedValue([row({ confirmed_at: null })]);
    const lessons = await recallConfirmedLessons();
    expect(lessons[0]!.learnedAt).toEqual(new Date("2026-05-31T00:00:00Z"));
  });

  it("returns an honest empty array when there are no qualifying memories", async () => {
    findMany.mockResolvedValue([]);
    expect(await recallConfirmedLessons()).toEqual([]);
  });

  it("never throws — a DB failure degrades to []", async () => {
    findMany.mockRejectedValue(new Error("connection refused"));
    await expect(recallConfirmedLessons()).resolves.toEqual([]);
  });
});
