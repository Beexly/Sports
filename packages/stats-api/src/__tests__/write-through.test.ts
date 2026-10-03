import { describe, expect, it } from "vitest";
import {
  expandPrismaPlayerGameStat,
  hydratePlayerGameStatsToMemory,
  writeThroughPlayerGameStats,
} from "../hydration/write-through.js";
import { NflverseMemoryStore } from "../providers/nflverse-memory.js";

describe("PlayerGameStat write-through", () => {
  it("expands columnar prisma rows to nfl.* metrics", () => {
    const rows = expandPrismaPlayerGameStat({
      playerId: "p1",
      season: 2025,
      week: 8,
      attempts: 30,
      rushingYards: 12.5,
      asOf: "2025-11-02T00:00:00.000Z",
    });
    expect(rows.some((r) => r.metricId === "nfl.pass_attempts" && r.value === 30)).toBe(
      true,
    );
    expect(rows.some((r) => r.metricId === "nfl.rushing_yards")).toBe(true);
  });

  it("hydrates memory store via put", () => {
    const store = new NflverseMemoryStore();
    const r = hydratePlayerGameStatsToMemory(store, [
      {
        playerId: "player_x",
        season: 2025,
        week: 1,
        carries: 15,
        rushingEpa: 0.2,
        asOf: "2025-09-08T00:00:00.000Z",
      },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.written).toBeGreaterThanOrEqual(2);
    const got = store.getAsOf(
      "nfl.carries",
      "player_x",
      "2025-09-08T00:00:00.000Z",
    );
    expect(got?.value).toBe(15);
  });

  it("refuses oversized batch", () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      playerId: "p",
      season: 2025,
      week: 1,
      metricId: "nfl.carries",
      value: i,
      asOf: "2025-09-01T00:00:00.000Z",
    }));
    const r = writeThroughPlayerGameStats(rows, {
      requireFinite: true,
      maxBatch: 2,
      metricPrefixAllow: ["nfl."],
    });
    expect(r.ok).toBe(false);
  });

  it("skips non-allowlisted metrics", () => {
    const r = writeThroughPlayerGameStats([
      {
        playerId: "p",
        season: 2025,
        week: 1,
        metricId: "blocked.secret",
        value: 1,
        asOf: "2025-09-01T00:00:00.000Z",
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.written).toBe(0);
      expect(r.skipped).toBe(1);
    }
  });
});
