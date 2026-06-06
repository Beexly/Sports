import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadQbAgeRbTrendReport,
  resetQbAgeRbTrendCacheForTests,
} from "@/lib/nflverse/qb-age-rb-trend";

const PLAYER_STATS = [
  "player_id,player_display_name,position,recent_team,season,week,season_type,attempts,targets",
  "old-qb-1,Old QB 1,QB,OLD1,2024,1,REG,40,0",
  "old-rb-1,Old RB 1,RB,OLD1,2024,1,REG,0,20",
  "old-qb-2,Old QB 2,QB,OLD2,2024,1,REG,40,0",
  "old-rb-2,Old RB 2,RB,OLD2,2024,1,REG,0,22",
  "old-qb-3,Old QB 3,QB,OLD3,2024,1,REG,40,0",
  "old-rb-3,Old RB 3,RB,OLD3,2024,1,REG,0,18",
  "young-qb-1,Young QB 1,QB,YNG1,2024,1,REG,40,0",
  "young-rb-1,Young RB 1,RB,YNG1,2024,1,REG,0,4",
  "young-qb-2,Young QB 2,QB,YNG2,2024,1,REG,40,0",
  "young-rb-2,Young RB 2,RB,YNG2,2024,1,REG,0,5",
  "young-qb-3,Young QB 3,QB,YNG3,2024,1,REG,40,0",
  "young-rb-3,Young RB 3,RB,YNG3,2024,1,REG,0,3",
].join("\n");

const PLAYERS = [
  "gsis_id,display_name,birth_date",
  "old-qb-1,Old QB 1,1986-01-01",
  "old-qb-2,Old QB 2,1986-02-01",
  "old-qb-3,Old QB 3,1986-03-01",
  "young-qb-1,Young QB 1,1998-01-01",
  "young-qb-2,Young QB 2,1998-02-01",
  "young-qb-3,Young QB 3,1998-03-01",
].join("\n");

const SCHEDULES = [
  "game_id,season,game_type,week,gameday,away_team,home_team,away_qb_id,home_qb_id,away_qb_name,home_qb_name",
  "2024_01_OLD1_X,2024,REG,1,2024-09-08,OLD1,X,old-qb-1,,Old QB 1,",
  "2024_01_OLD2_X,2024,REG,1,2024-09-08,OLD2,X,old-qb-2,,Old QB 2,",
  "2024_01_OLD3_X,2024,REG,1,2024-09-08,OLD3,X,old-qb-3,,Old QB 3,",
  "2024_01_YNG1_X,2024,REG,1,2024-09-08,YNG1,X,young-qb-1,,Young QB 1,",
  "2024_01_YNG2_X,2024,REG,1,2024-09-08,YNG2,X,young-qb-2,,Young QB 2,",
  "2024_01_YNG3_X,2024,REG,1,2024-09-08,YNG3,X,young-qb-3,,Young QB 3,",
].join("\n");

function csvResponse(csv: string): Response {
  return new Response(csv, {
    status: 200,
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

function mockTrendFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("player_stats.csv.gz")) return gzResponse(PLAYER_STATS);
    if (url.includes("players.csv")) return csvResponse(PLAYERS);
    if (url.includes("games.csv")) return csvResponse(SCHEDULES);
    return new Response("missing", { status: 404 });
  });
}

describe("QB-age RB target-share trend report", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetQbAgeRbTrendCacheForTests();
  });

  it("computes a real cohort report from nflverse-shaped CSV rows", async () => {
    const report = await loadQbAgeRbTrendReport({
      fetcher: mockTrendFetch(),
      minSampleSize: 2,
      alpha: 0.05,
      cacheTtlMs: 0,
    });

    const oldQbTrend = report.trends.find((trend) => trend.cohort === "QB age 34+");

    expect(report.status).toBe("live");
    expect(report.quality.observationsUsed).toBe(6);
    expect(report.quality.skippedMissingTeamStats).toBe(6);
    expect(report.seasonRange).toEqual({ start: 2024, end: 2024 });
    expect(oldQbTrend?.n).toBe(3);
    expect(oldQbTrend?.cohortMean).toBeCloseTo(0.5, 2);
    expect(oldQbTrend?.baselineMean).toBeCloseTo(0.1, 2);
    expect(oldQbTrend?.relativeDelta).toBeGreaterThan(3);
    expect(report.canPowerScoring).toBe(false);
    expect(report.boundary).toContain("not a betting pick");
  });

  it("serves the report API without making it a scoring input", async () => {
    vi.stubGlobal("fetch", mockTrendFetch());
    vi.resetModules();

    const mod = await import("@/app/api/nflverse/qb-age-rb-trend/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["status"]).toBe("live");
    expect(data["canPowerScoring"]).toBe(false);
    expect(data["trends"]).toEqual(expect.any(Array));
  });

  it("returns an empty report instead of fabricating rows when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));

    const report = await loadQbAgeRbTrendReport({ fetcher, cacheTtlMs: 0 });

    expect(report.status).toBe("source-error");
    expect(report.trends).toHaveLength(0);
    expect(report.quality.observationsUsed).toBe(0);
    expect(report.canPowerScoring).toBe(false);
  });
});
