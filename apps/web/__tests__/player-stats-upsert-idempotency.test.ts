import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Upsert idempotency for the player-stats writer, proven against a Map-backed
 * fake DB that honors the real unique keys (Player.gsisId and
 * PlayerGameStat @@unique([playerId, season, week, seasonType])): ingesting
 * the same season twice never duplicates a row, and changed upstream values
 * update the existing record in place. This is what makes the daily
 * steady-state refresh and backfill re-runs safe.
 */

interface PlayerUpsertArgs {
  where: { gsisId: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  select?: Record<string, unknown>;
}
interface StatUpsertArgs {
  where: { playerId_season_week_seasonType: { playerId: string; season: number; week: number; seasonType: string } };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

const fakeDb = vi.hoisted(() => {
  const players = new Map<string, Record<string, unknown>>();
  const stats = new Map<string, Record<string, unknown>>();
  return {
    players,
    stats,
    reset(): void {
      players.clear();
      stats.clear();
    },
  };
});

vi.mock("@sports/db", () => ({
  db: {
    player: {
      upsert: vi.fn(async (args: PlayerUpsertArgs) => {
        const existing = fakeDb.players.get(args.where.gsisId);
        if (existing) {
          Object.assign(existing, args.update);
          return { id: existing["id"] };
        }
        const created = { id: `pid-${args.where.gsisId}`, gsisId: args.where.gsisId, ...args.create };
        fakeDb.players.set(args.where.gsisId, created);
        return { id: created.id };
      }),
    },
    playerGameStat: {
      upsert: vi.fn(async (args: StatUpsertArgs) => {
        const k = args.where.playerId_season_week_seasonType;
        const key = `${k.playerId}|${k.season}|${k.week}|${k.seasonType}`;
        const existing = fakeDb.stats.get(key);
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const created = { ...args.create };
        fakeDb.stats.set(key, created);
        return created;
      }),
    },
  },
}));

import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";

const NOW = new Date("2026-07-01T12:00:00Z");

type Row = Record<string, string>;
function fixture(rushingYardsWeek1: string): { records: readonly Row[] } {
  const base = { player_display_name: "Alpha Back", position: "RB", recent_team: "KC", opponent_team: "DEN", season: "2024", season_type: "REG" };
  return {
    records: [
      { ...base, player_id: "00-1", week: "1", carries: "12", rushing_yards: rushingYardsWeek1 },
      { ...base, player_id: "00-1", week: "2", carries: "15", rushing_yards: "84" },
      { ...base, player_id: "00-2", player_display_name: "Bravo Wide", position: "WR", recent_team: "BUF", week: "1", targets: "10", receiving_yards: "96" },
    ],
  };
}

describe("player-stats ingestion idempotency", () => {
  beforeEach(() => fakeDb.reset());

  it("ingesting the same season twice yields one record per unique key, updated in place", async () => {
    const first = await ingestPlayerWeeklyStats(2024, { now: NOW, fetcher: async () => fixture("71") });
    expect(first.status).toBe("ok");
    expect(fakeDb.players.size).toBe(2);
    expect(fakeDb.stats.size).toBe(3);

    // Second run: identical rows except week 1 rushing yards corrected upstream.
    const second = await ingestPlayerWeeklyStats(2024, { now: NOW, fetcher: async () => fixture("78") });
    expect(second.status).toBe("ok");

    // No duplicates: same unique keys → same row counts.
    expect(fakeDb.players.size).toBe(2);
    expect(fakeDb.stats.size).toBe(3);

    // The existing record was UPDATED, not blind-created alongside.
    const week1 = fakeDb.stats.get("pid-00-1|2024|1|REG");
    expect(week1).toBeDefined();
    expect(week1?.["rushingYards"]).toBe(78);
    expect(week1?.["carries"]).toBe(12);
  });
});
