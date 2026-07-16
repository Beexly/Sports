import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The readiness join reads persisted PlayerGameStat rows; mock the DB so each
// test controls exactly how many joined observations/seasons exist.
const dbMocks = vi.hoisted(() => ({
  count: vi.fn<() => Promise<number>>(),
  findMany: vi.fn<(args?: unknown) => Promise<{ season: number }[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { playerGameStat: { count: dbMocks.count, findMany: dbMocks.findMany } },
}));

import {
  latestNflverseInspectionSeason,
  loadNflverseTrendReadiness,
} from "@/lib/trends/nflverse-readiness";

beforeEach(() => {
  dbMocks.count.mockReset();
  dbMocks.findMany.mockReset();
  dbMocks.count.mockResolvedValue(0);
  dbMocks.findMany.mockResolvedValue([]);
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

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });

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
    const fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });

    expect(readiness.liveDatasetCount).toBe(0);
    expect(readiness.datasets.every((dataset) => dataset.status === "missing")).toBe(true);
    expect(readiness.totalSourceRows).toBe(0);
    expect(readiness.canPublishTrends).toBe(false);
  });

  it("counts persisted joined observations from the DB, not source rows", async () => {
    dbMocks.count.mockResolvedValue(220);
    dbMocks.findMany.mockResolvedValue([{ season: 2023 }, { season: 2024 }, { season: 2025 }]);
    const fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });

    expect(readiness.joinedTrendObservations).toBe(220);
    expect(readiness.persistedSeasonCount).toBe(3);
    // Below both declared thresholds → still blocked, with the honest numbers.
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("220/500");
    expect(readiness.blockReason).toContain("3/5");
  });

  it("keeps canPublishTrends false until BOTH declared thresholds are met (honest gate)", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));

    // Enough observations, too few seasons.
    dbMocks.count.mockResolvedValue(5000);
    dbMocks.findMany.mockResolvedValue([{ season: 2022 }, { season: 2023 }, { season: 2024 }, { season: 2025 }]);
    let readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).not.toBeNull();

    // Enough seasons, one observation short of the declared 500.
    dbMocks.count.mockResolvedValue(499);
    dbMocks.findMany.mockResolvedValue(
      [2021, 2022, 2023, 2024, 2025].map((season) => ({ season })),
    );
    readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("499/500");
  });

  it("opens the gate only when the declared data volume is truly persisted", async () => {
    dbMocks.count.mockResolvedValue(720);
    dbMocks.findMany.mockResolvedValue(
      [2020, 2021, 2022, 2023, 2024, 2025].map((season) => ({ season })),
    );
    const fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });

    expect(readiness.joinedTrendObservations).toBe(720);
    expect(readiness.persistedSeasonCount).toBe(6);
    expect(readiness.minimumSeasons).toBe(5); // thresholds themselves unchanged
    expect(readiness.minimumObservations).toBe(500);
    expect(readiness.canPublishTrends).toBe(true);
    expect(readiness.blockReason).toBeNull();
  });

  it("fails closed (zero observations, gate shut) when the DB is unreachable", async () => {
    dbMocks.count.mockRejectedValue(new Error("db down"));
    dbMocks.findMany.mockRejectedValue(new Error("db down"));
    const fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));

    const readiness = await loadNflverseTrendReadiness({ season: 2025, fetcher });

    expect(readiness.joinedTrendObservations).toBe(0);
    expect(readiness.persistedSeasonCount).toBe(0);
    expect(readiness.canPublishTrends).toBe(false);
    expect(readiness.blockReason).toContain("not persisted");
  });
});
