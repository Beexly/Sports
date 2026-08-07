/**
 * I3/I8 — durable free-spine via JarvisMemoryEvent.
 * Process cache alone is empty on cold isolates; Neon holds the last probe.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const findFirst = vi.fn();
const findMany = vi.fn();
const deleteMany = vi.fn();
const isStubMode = vi.fn(() => false);

vi.mock("@sports/db", () => ({
  db: {
    jarvisMemoryEvent: {
      create: (...a: unknown[]) => create(...a),
      findFirst: (...a: unknown[]) => findFirst(...a),
      findMany: (...a: unknown[]) => findMany(...a),
      deleteMany: (...a: unknown[]) => deleteMany(...a),
    },
  },
  isStubMode: () => isStubMode(),
}));

import {
  FREE_SPINE_DURABLE_SLA_MS,
  FREE_SPINE_DURABLE_RETAIN,
  FREE_SPINE_SCOPE,
  freeSpineSnapAgeMs,
  freeSpineWithinSla,
  loadDurableFreeSpine,
  persistFreeSpineSnapshot,
  pruneOldFreeSpineSnapshots,
} from "@/lib/data-sources/free-spine-durable";
import type { FreeSpineCacheSnapshot } from "@/lib/data-sources/free-spine-cache";

const SAMPLE: FreeSpineCacheSnapshot = {
  probedAt: "2026-08-07T03:00:00.000Z",
  sportsProbed: 7,
  sportsWithGames: 4,
  criticalGaps: 0,
  requireSpend: 2,
  freeCovered: 40,
  live: [
    { sport: "nfl", used: "espn", games: 2, failover: false },
    { sport: "nba", used: null, games: 0, failover: true },
  ],
};

beforeEach(() => {
  create.mockReset();
  findFirst.mockReset();
  findMany.mockReset();
  deleteMany.mockReset();
  findMany.mockResolvedValue([]);
  deleteMany.mockResolvedValue({ count: 0 });
  isStubMode.mockReturnValue(false);
});

describe("persistFreeSpineSnapshot", () => {
  it("returns stub and skips db when stub mode", async () => {
    isStubMode.mockReturnValue(true);
    await expect(persistFreeSpineSnapshot(SAMPLE)).resolves.toBe("stub");
    expect(create).not.toHaveBeenCalled();
  });

  it("writes JarvisMemoryEvent with free-spine scope and confirmed state", async () => {
    create.mockResolvedValue({ id: "mem_fs1" });
    findMany.mockResolvedValue([{ id: "mem_fs1" }]);
    await expect(persistFreeSpineSnapshot(SAMPLE)).resolves.toBe("ok");
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0]?.[0]?.data;
    expect(data.scope).toBe(FREE_SPINE_SCOPE);
    expect(data.memory_type).toBe("episodic");
    expect(data.memory_state).toBe("confirmed");
    expect(data.source_type).toBe("cron.free-spine-health");
    expect(data.metadata).toEqual(SAMPLE);
    expect(data.tags).toEqual(expect.arrayContaining(["free-spine", "i3", "i8"]));
  });

  it("returns error without throwing when create rejects", async () => {
    create.mockRejectedValue(new Error("pool down"));
    await expect(persistFreeSpineSnapshot(SAMPLE)).resolves.toBe("error");
  });
});

describe("loadDurableFreeSpine", () => {
  it("returns null in stub mode", async () => {
    isStubMode.mockReturnValue(true);
    await expect(loadDurableFreeSpine()).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null when no rows", async () => {
    findFirst.mockResolvedValue(null);
    await expect(loadDurableFreeSpine()).resolves.toBeNull();
  });

  it("prefers metadata when shape is valid", async () => {
    findFirst.mockResolvedValue({ metadata: SAMPLE, full_text: null });
    await expect(loadDurableFreeSpine()).resolves.toEqual(SAMPLE);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: FREE_SPINE_SCOPE, memory_type: "episodic" },
        orderBy: { created_at: "desc" },
      }),
    );
  });

  it("falls back to full_text JSON when metadata invalid", async () => {
    findFirst.mockResolvedValue({
      metadata: { garbage: true },
      full_text: JSON.stringify(SAMPLE),
    });
    await expect(loadDurableFreeSpine()).resolves.toEqual(SAMPLE);
  });

  it("returns null on corrupt payload (never fabricates)", async () => {
    findFirst.mockResolvedValue({
      metadata: { probedAt: "x" },
      full_text: "{not-json",
    });
    await expect(loadDurableFreeSpine()).resolves.toBeNull();
  });

  it("returns null when findFirst rejects", async () => {
    findFirst.mockRejectedValue(new Error("timeout"));
    await expect(loadDurableFreeSpine()).resolves.toBeNull();
  });
});

describe("freeSpineSnapAgeMs / freeSpineWithinSla (I8)", () => {
  const now = Date.parse("2026-08-07T04:00:00.000Z");

  it("computes age and SLA boundary at 120m", () => {
    expect(freeSpineSnapAgeMs(SAMPLE, now)).toBe(60 * 60 * 1000);
    expect(freeSpineWithinSla(SAMPLE, now)).toBe(true);

    const stale: FreeSpineCacheSnapshot = {
      ...SAMPLE,
      probedAt: "2026-08-07T01:30:00.000Z", // 150m before now
    };
    expect(freeSpineSnapAgeMs(stale, now)).toBe(150 * 60 * 1000);
    expect(freeSpineWithinSla(stale, now)).toBe(false);
    expect(FREE_SPINE_DURABLE_SLA_MS).toBe(120 * 60 * 1000);
  });

  it("null snap is outside SLA", () => {
    expect(freeSpineSnapAgeMs(null, now)).toBeNull();
    expect(freeSpineWithinSla(null, now)).toBe(false);
  });
});

describe("pruneOldFreeSpineSnapshots", () => {
  it("returns 0 in stub mode", async () => {
    isStubMode.mockReturnValue(true);
    await expect(pruneOldFreeSpineSnapshots()).resolves.toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("deletes rows beyond retain window", async () => {
    const keep = Array.from({ length: FREE_SPINE_DURABLE_RETAIN }, (_, i) => ({ id: `k${i}` }));
    findMany.mockResolvedValue(keep);
    deleteMany.mockResolvedValue({ count: 12 });
    await expect(pruneOldFreeSpineSnapshots()).resolves.toBe(12);
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scope: FREE_SPINE_SCOPE,
          id: { notIn: keep.map((k) => k.id) },
        }),
      }),
    );
  });

  it("skips delete when fewer than retain rows", async () => {
    findMany.mockResolvedValue([{ id: "only" }]);
    await expect(pruneOldFreeSpineSnapshots()).resolves.toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
