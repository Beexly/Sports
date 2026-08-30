import { describe, it, expect, vi } from "vitest";
import {
  listWatchlistEntries,
  countWatchlistEntries,
  findWatchlistEntry,
  createWatchlistEntry,
  deleteWatchlistEntry,
  isTableMissingError,
  isDatabaseUnreachableError,
} from "./db";

function row(overrides: Partial<{ id: string; userId: string; entityType: string; entityId: string; createdAt: Date }> = {}) {
  return {
    id: "wl-1",
    userId: "user-1",
    entityType: "TEAM",
    entityId: "team-1",
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}

describe("isTableMissingError / isDatabaseUnreachableError", () => {
  it("recognizes Prisma P2021 (table does not exist)", () => {
    expect(isTableMissingError({ code: "P2021" })).toBe(true);
  });

  it("recognizes the raw Postgres 'does not exist' message even without a code", () => {
    expect(
      isTableMissingError(new Error('relation "watchlist_entries" does not exist in the current database')),
    ).toBe(true);
  });

  it("does not misclassify an unrelated error", () => {
    expect(isTableMissingError(new Error("boom"))).toBe(false);
    expect(isTableMissingError({ code: "P2002" })).toBe(false);
  });

  it("recognizes Prisma P1001 (unreachable)", () => {
    expect(isDatabaseUnreachableError({ code: "P1001" })).toBe(true);
    expect(isDatabaseUnreachableError(new Error("Can't reach database server at x"))).toBe(true);
  });
});

describe("listWatchlistEntries — stub-safe", () => {
  it("maps rows to entries on success", async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const result = await listWatchlistEntries({ watchlist: { findMany } }, "user-1");
    expect(result).toEqual({
      ok: true,
      data: [{ id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-1", createdAt: row().createdAt }],
    });
    expect(findMany).toHaveBeenCalledWith({ where: { userId: "user-1" }, orderBy: { createdAt: "desc" } });
  });

  it("returns table_missing (not a throw) when the table doesn't exist", async () => {
    const findMany = vi.fn().mockRejectedValue({ code: "P2021" });
    const result = await listWatchlistEntries({ watchlist: { findMany } }, "user-1");
    expect(result).toEqual({ ok: false, reason: "table_missing" });
  });

  it("returns unreachable when the DB can't be reached", async () => {
    const findMany = vi.fn().mockRejectedValue({ code: "P1001" });
    const result = await listWatchlistEntries({ watchlist: { findMany } }, "user-1");
    expect(result).toEqual({ ok: false, reason: "unreachable" });
  });

  it("never throws on an arbitrary error — degrades to a structured result", async () => {
    const findMany = vi.fn().mockRejectedValue(new Error("weird"));
    await expect(listWatchlistEntries({ watchlist: { findMany } }, "user-1")).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "weird",
    });
  });
});

describe("countWatchlistEntries", () => {
  it("returns the count on success", async () => {
    const count = vi.fn().mockResolvedValue(3);
    const result = await countWatchlistEntries({ watchlist: { count } }, "user-1");
    expect(result).toEqual({ ok: true, data: 3 });
  });

  it("is table-missing-safe", async () => {
    const count = vi.fn().mockRejectedValue({ code: "P2021" });
    const result = await countWatchlistEntries({ watchlist: { count } }, "user-1");
    expect(result).toEqual({ ok: false, reason: "table_missing" });
  });
});

describe("findWatchlistEntry", () => {
  it("returns null (not an error) when no row matches", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const result = await findWatchlistEntry({ watchlist: { findUnique } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({ ok: true, data: null });
    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_entityType_entityId: { userId: "user-1", entityType: "TEAM", entityId: "team-1" } },
    });
  });
});

describe("createWatchlistEntry — idempotent under a unique-constraint race", () => {
  it("creates and reports created:true on the normal path", async () => {
    const create = vi.fn().mockResolvedValue(row());
    const result = await createWatchlistEntry({ watchlist: { create } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({
      ok: true,
      data: { entry: { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-1", createdAt: row().createdAt }, created: true },
    });
  });

  it("on P2002 (concurrent duplicate), re-fetches and returns created:false instead of erroring", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const findUnique = vi.fn().mockResolvedValue(row());
    const result = await createWatchlistEntry(
      { watchlist: { create, findUnique } },
      "user-1",
      "TEAM",
      "team-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.created).toBe(false);
      expect(result.data.entry.id).toBe("wl-1");
    }
  });

  it("is table-missing-safe", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2021" });
    const result = await createWatchlistEntry({ watchlist: { create } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({ ok: false, reason: "table_missing" });
  });
});

describe("deleteWatchlistEntry — idempotent unfollow", () => {
  it("reports deleted:true on the normal path", async () => {
    const del = vi.fn().mockResolvedValue(row());
    const result = await deleteWatchlistEntry({ watchlist: { delete: del } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({ ok: true, data: { deleted: true } });
  });

  it("on P2025 (record not found), reports deleted:false as a success, not an error", async () => {
    const del = vi.fn().mockRejectedValue({ code: "P2025" });
    const result = await deleteWatchlistEntry({ watchlist: { delete: del } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({ ok: true, data: { deleted: false } });
  });

  it("is table-missing-safe", async () => {
    const del = vi.fn().mockRejectedValue({ code: "P2021" });
    const result = await deleteWatchlistEntry({ watchlist: { delete: del } }, "user-1", "TEAM", "team-1");
    expect(result).toEqual({ ok: false, reason: "table_missing" });
  });
});
