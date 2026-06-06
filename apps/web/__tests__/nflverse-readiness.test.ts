import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import {
  latestNflverseInspectionSeason,
  loadNflverseTrendReadiness,
} from "@/lib/trends/nflverse-readiness";

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
});
