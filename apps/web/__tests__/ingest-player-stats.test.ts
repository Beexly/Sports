import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Player weekly-stats ingestion (nflverse → Player/PlayerGameStat).
 * Verifies: the real clearance gate clears nflverse and stamps a rights
 * snapshot + fetchedAt on every row; players dedupe; numbers parse (empty →
 * null); REG/POST split; idempotent upsert keys; and that a denied clearance
 * or a source error stops the job without writing.
 */

const mocks = vi.hoisted(() => ({
  playerUpsert: vi.fn(),
  statUpsert: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    player: { upsert: mocks.playerUpsert },
    playerGameStat: { upsert: mocks.statUpsert },
  },
}));

// Real clearance engine by default (proves nflverse genuinely clears); exposed
// as a spy so one test can force a denial.
vi.mock("@/lib/scraping/clearance-engine", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/scraping/clearance-engine")>();
  return { ...actual, checkClearance: vi.fn(actual.checkClearance) };
});

import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";
import { checkClearance } from "@/lib/scraping/clearance-engine";

const NOW = new Date("2026-06-14T12:00:00.000Z");

type Row = Record<string, string>;
function makeRow(o: Partial<Row> & { player_id: string; week: string }): Row {
  return {
    player_display_name: "Player",
    position: "RB",
    recent_team: "KC",
    opponent_team: "DEN",
    season: "2024",
    season_type: "REG",
    ...o,
  };
}

function fixture(): { records: readonly Row[] } {
  return {
    records: [
      makeRow({ player_id: "00-1", player_display_name: "Alpha Back", position: "RB", recent_team: "KC", week: "1",
        carries: "12", receptions: "3", targets: "4", target_share: "0.21", rushing_yards: "71", fantasy_points_ppr: "18.4", passing_epa: "", rushing_epa: "1.2" }),
      makeRow({ player_id: "00-1", player_display_name: "Alpha Back", position: "RB", recent_team: "KC", week: "2",
        carries: "15", rushing_yards: "84", fantasy_points_ppr: "16.1" }),
      makeRow({ player_id: "00-2", player_display_name: "Bravo Wide", position: "WR", recent_team: "BUF", week: "1",
        receptions: "7", targets: "10", receiving_yards: "96", fantasy_points_ppr: "21.6" }),
      makeRow({ player_id: "00-2", player_display_name: "Bravo Wide", position: "WR", recent_team: "BUF", week: "2", season_type: "POST",
        receptions: "5", targets: "8", receiving_yards: "63", fantasy_points_ppr: "14.3" }),
    ],
  };
}

describe("ingestPlayerWeeklyStats", () => {
  beforeEach(() => {
    mocks.playerUpsert.mockReset();
    mocks.statUpsert.mockReset();
    (checkClearance as Mock).mockClear();
    mocks.playerUpsert.mockImplementation(async (args: { where: { gsisId: string } }) => ({ id: `pid-${args.where.gsisId}` }));
    mocks.statUpsert.mockResolvedValue({});
  });

  it("clears nflverse, dedupes players, and upserts every weekly stat row", async () => {
    const result = await ingestPlayerWeeklyStats(2024, { now: NOW, fetcher: async () => fixture() });

    expect(result.status).toBe("ok");
    expect(result.playersUpserted).toBe(2); // 4 rows → 2 unique players
    expect(result.statsUpserted).toBe(4);
    expect(mocks.playerUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.statUpsert).toHaveBeenCalledTimes(4);
  });

  it("stamps the real rights snapshot + fetchedAt and parses numbers/POST correctly", async () => {
    await ingestPlayerWeeklyStats(2024, { now: NOW, fetcher: async () => fixture() });

    const calls = mocks.statUpsert.mock.calls.map((c) => c[0] as {
      where: { playerId_season_week_seasonType: { playerId: string; season: number; week: number; seasonType: string } };
      create: Record<string, unknown>;
    });

    // Alpha Back, week 1: numbers parsed, empty passing_epa → null.
    const w1 = calls.find((c) => c.where.playerId_season_week_seasonType.playerId === "pid-00-1" && c.where.playerId_season_week_seasonType.week === 1)!;
    expect(w1).toBeDefined();
    expect(w1.where.playerId_season_week_seasonType.seasonType).toBe("REG");
    expect(w1.create["carries"]).toBe(12);
    expect(w1.create["rushingYards"]).toBe(71);
    expect(w1.create["fantasyPointsPpr"]).toBe(18.4);
    expect(w1.create["passingEpa"]).toBeNull();
    expect(w1.create["fetchedAt"]).toBe(NOW);
    expect((w1.create["rightsSnapshot"] as { source_id: string }).source_id).toBe("nflverse");
    // license correction propagates into the persisted snapshot
    expect((w1.create["rightsSnapshot"] as { attribution_text: string }).attribution_text).toMatch(/CC-BY-4\.0/);

    // Bravo Wide, week 2 is a POST row.
    const post = calls.find((c) => c.where.playerId_season_week_seasonType.playerId === "pid-00-2" && c.where.playerId_season_week_seasonType.week === 2)!;
    expect(post.where.playerId_season_week_seasonType.seasonType).toBe("POST");
  });

  it("stops without writing when clearance is denied", async () => {
    (checkClearance as Mock).mockReturnValueOnce({
      allowed: false,
      blocks: [{ code: "BLOCKED_TEST", message: "denied" }],
      warnings: [],
      requiresReview: false,
      rightsSnapshot: null,
      checkedAt: NOW.toISOString(),
    });

    const result = await ingestPlayerWeeklyStats(2024, { now: NOW, fetcher: async () => fixture() });

    expect(result.status).toBe("clearance-denied");
    expect(result.blocks).toEqual(["BLOCKED_TEST"]);
    expect(mocks.playerUpsert).not.toHaveBeenCalled();
    expect(mocks.statUpsert).not.toHaveBeenCalled();
  });

  it("reports source-error and writes nothing when the fetch throws", async () => {
    const result = await ingestPlayerWeeklyStats(2024, {
      now: NOW,
      fetcher: async () => {
        throw new Error("network down");
      },
    });

    expect(result.status).toBe("source-error");
    expect(result.error).toMatch(/network down/);
    expect(mocks.statUpsert).not.toHaveBeenCalled();
  });
});
