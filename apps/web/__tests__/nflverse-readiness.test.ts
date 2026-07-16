import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The readiness publication gate reads persisted PlayerGameStat rows grouped
 * by season, scoped to the ingestion planner's trend window AND the nflverse
 * sourceId, with a per-season observation floor. The DB mock here is a
 * faithful fake: it applies the exact where-clause the production query sends
 * against an in-test bundle store, so out-of-window / foreign-source fixtures
 * prove the scoping behaviorally instead of only asserting on call args.
 */

interface GroupByArgs {
  by: readonly string[];
  where: { season: { gte: number; lte: number }; sourceId: string };
  _count: { _all: true };
}

const dbMocks = vi.hoisted(() => ({
  groupBy: vi.fn<(args: GroupByArgs) => Promise<{ season: number; _count: { _all: number } }[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { playerGameStat: { groupBy: dbMocks.groupBy } },
}));

import {
  latestNflverseInspectionSeason,
  loadNflverseTrendReadiness,
  PER_SEASON_OBSERVATION_FLOOR,
} from "@/lib/trends/nflverse-readiness";
import { TREND_BACKFILL_SEASONS } from "@/lib/ingestion/player-stats-backfill";

// Deterministic clock: July 2026 → current NFL season 2025, so the gate
// window is [2020, 2025] (TREND_BACKFILL_SEASONS = 6).
const NOW = new Date("2026-07-01T12:00:00Z");
const WINDOW_END = 2025;
const WINDOW_START = WINDOW_END - TREND_BACKFILL_SEASONS + 1; // 2020

/** One (season, sourceId) group of persisted PlayerGameStat rows. */
interface SeasonBundle {
  readonly season: number;
  readonly sourceId: string;
  readonly rows: number;
}

let bundles: SeasonBundle[] = [];

function nflverseSeason(season: number, rows: number): SeasonBundle {
  return { season, sourceId: "nflverse", rows };
}

beforeEach(() => {
  bundles = [];
  dbMocks.groupBy.mockReset();
  dbMocks.groupBy.mockImplementation(async (args: GroupByArgs) => {
    const { gte, lte } = args.where.season;
    return bundles
      .filter((b) => b.season >= gte && b.season <= lte && b.sourceId === args.where.sourceId)
      .map((b) => ({ season: b.season, _count: { _all: b.rows } }));
  });
});

function csvResponse(csv: string, status = 200): Response {
  return new Response(csv, {
    status,
    headers: { "content-length": String(Buffer.byteLength(csv)) },
  });
}

function gzResponse(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, {
    status: 200,
    headers: { "content-length": String(body.length) },
  });
}

function missingFetcher(): (input: string | URL | Request) => Promise<Response> {
  return vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));
}

describe("nflverse trend readiness", () => {
  it("selects the latest inspection season before the next NFL season is active", () => {
    expect(latestNflverseInspectionSeason(new Date("2026-06-05T12:00:00Z"))).toBe(2025);
    expect(latestNflverseInspectionSeason(new Date("2026-09-10T12:00:00Z"))).toBe(2026);
  });

  it("fetches real trend-plan dependencies without treating source rows as published trends", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("players.csv")) return csvResponse("gsis_id,birth_date\n00-1,1990-01-01\n00-2,1992-02-02\n");
      if (url.includes("roster_2025.csv")) return csvResponse("season,player_id,team\n2025,00-1,KC\n");
      if (url.includes("player_stats.csv.gz")) {
        return gzResponse("season,week,player_id,targets\n2025,1,00-1,8\n2025,1,00-2,3\n");
      }
      if (url.includes("snap_counts_2025.csv")) return csvResponse("season,week,player_id,offense_pct\n2025,1,00-1,0.82\n");
      if (url.includes("games.csv")) return csvResponse("season,week,home_team,away_team\n2025,1,KC,LAC\n");
      return new Response("missing", { status: 404 });
    });

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher, now: NOW });

    expect(readiness.liveDatasetCount).toBe(5);
    expect(readiness.requiredDatasetCount).toBe(5);
    expect(readiness.totalSourceRows).toBe(7);
    expect(readiness.joinedTrendObservations).toBe(0);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.datasets.find((dataset) => dataset.key === "player_stats_week")?.url).toContain(
      "player_stats.csv.gz",
    );
    expect(readiness.blockReason).toContain("not persisted");
  });

  it("reports missing release assets without throwing", async () => {
    const fetcher = missingFetcher();

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher, now: NOW });

    expect(readiness.liveDatasetCount).toBe(0);
    expect(readiness.datasets.every((dataset) => dataset.status === "missing")).toBe(true);
    expect(readiness.totalSourceRows).toBe(0);
    expect(readiness.canPublishTrends).toBe(false);
  });

  it("counts persisted joined observations from the DB, not source rows", async () => {
    bundles = [nflverseSeason(2023, 120), nflverseSeason(2024, 100), nflverseSeason(2025, 100)];

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(readiness.joinedTrendObservations).toBe(320);
    expect(readiness.persistedSeasonCount).toBe(3);
    // Below both declared thresholds → still blocked, with the honest numbers.
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("320/500");
    expect(readiness.blockReason).toContain("3/5");
  });

  it("scopes the gate query to the trend window and the nflverse source", async () => {
    bundles = [nflverseSeason(WINDOW_END, 150)];

    await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(dbMocks.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["season"],
        where: { season: { gte: WINDOW_START, lte: WINDOW_END }, sourceId: "nflverse" },
      }),
    );
  });

  it("ignores out-of-window and foreign-source rows — operator overrides cannot open the gate", async () => {
    bundles = [
      // The pre-fix escape hatch: five full out-of-window seasons (manual
      // ?season=1999-style runs) that would have satisfied BOTH thresholds.
      nflverseSeason(1999, 6000),
      nflverseSeason(2000, 6000),
      nflverseSeason(2001, 6000),
      nflverseSeason(2002, 6000),
      nflverseSeason(2003, 6000),
      // A season beyond the window end never counts either.
      nflverseSeason(WINDOW_END + 1, 6000),
      // In-window volume from a source the writer never stamps.
      { season: 2024, sourceId: "manual", rows: 6000 },
      // The only rows the gate may trust.
      nflverseSeason(2025, 320),
    ];

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(readiness.joinedTrendObservations).toBe(320);
    expect(readiness.persistedSeasonCount).toBe(1);
    expect(readiness.windowStartSeason).toBe(WINDOW_START);
    expect(readiness.windowEndSeason).toBe(WINDOW_END);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("320/500");
    expect(readiness.blockReason).toContain("1/5");
  });

  it("never lets 1-row seasons satisfy minimumSeasons (thin-season floor)", async () => {
    // The exact defect scenario: 5+ distinct seasons with >=1 row each and
    // >=500 total rows, but only ONE season is genuinely ingested.
    bundles = [
      nflverseSeason(2020, 1),
      nflverseSeason(2021, 1),
      nflverseSeason(2022, 1),
      nflverseSeason(2023, 1),
      nflverseSeason(2024, 1),
      nflverseSeason(2025, 5000),
    ];

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(readiness.joinedTrendObservations).toBe(5005);
    expect(readiness.persistedSeasonCount).toBe(1);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("1/5");
  });

  it("counts a season exactly at the per-season floor, and not one row below", async () => {
    expect(PER_SEASON_OBSERVATION_FLOOR).toBe(100);

    // Five seasons at exactly the floor → 500 observations, 5 qualifying
    // seasons: both declared thresholds met on the boundary.
    bundles = [2021, 2022, 2023, 2024, 2025].map((season) =>
      nflverseSeason(season, PER_SEASON_OBSERVATION_FLOOR),
    );
    let readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });
    expect(readiness.joinedTrendObservations).toBe(500);
    expect(readiness.persistedSeasonCount).toBe(5);
    expect(readiness.canPublishTrends).toBe(true);
    expect(readiness.blockReason).toBeNull();

    // One row below the floor: the season stops qualifying even though the
    // total observation volume stays high.
    bundles = [
      nflverseSeason(2021, PER_SEASON_OBSERVATION_FLOOR - 1),
      nflverseSeason(2022, 600),
      nflverseSeason(2023, 600),
      nflverseSeason(2024, 600),
      nflverseSeason(2025, 600),
    ];
    readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });
    expect(readiness.joinedTrendObservations).toBe(2499);
    expect(readiness.persistedSeasonCount).toBe(4);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("4/5");
  });

  it("keeps canPublishTrends false until BOTH declared thresholds are met (honest gate)", async () => {
    // Enough observations, too few qualifying seasons.
    bundles = [2022, 2023, 2024, 2025].map((season) => nflverseSeason(season, 1250));
    let readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });
    expect(readiness.joinedTrendObservations).toBe(5000);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).not.toBeNull();

    // One observation short of the declared 500.
    bundles = [
      nflverseSeason(2021, 100),
      nflverseSeason(2022, 100),
      nflverseSeason(2023, 100),
      nflverseSeason(2024, 100),
      nflverseSeason(2025, 99),
    ];
    readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("499/500");
  });

  it("opens the gate only when the declared data volume is truly persisted in-window", async () => {
    bundles = [2020, 2021, 2022, 2023, 2024, 2025].map((season) => nflverseSeason(season, 120));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(readiness.joinedTrendObservations).toBe(720);
    expect(readiness.persistedSeasonCount).toBe(6);
    expect(readiness.minimumSeasons).toBe(5); // thresholds themselves unchanged
    expect(readiness.minimumObservations).toBe(500);
    expect(readiness.perSeasonObservationFloor).toBe(PER_SEASON_OBSERVATION_FLOOR);
    expect(readiness.canPublishTrends).toBe(true);
    expect(readiness.blockReason).toBeNull();
  });

  it("fails closed (zero observations, gate shut) when the DB is unreachable", async () => {
    dbMocks.groupBy.mockRejectedValue(new Error("db down"));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher: missingFetcher(), now: NOW });

    expect(readiness.joinedTrendObservations).toBe(0);
    expect(readiness.persistedSeasonCount).toBe(0);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("not persisted");
  });
});
