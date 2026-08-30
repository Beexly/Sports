import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: async () => null }));
import {
  loadNflverseNextGenStats,
  resetNextGenStatsCacheForTests,
} from "@/lib/nflverse/next-gen-stats";

const RECEIVING = [
  "season,season_type,week,player_display_name,player_position,team_abbr,avg_cushion,avg_separation,avg_intended_air_yards,percent_share_of_intended_air_yards,receptions,targets,catch_percentage,yards,rec_touchdowns,avg_yac,avg_expected_yac,avg_yac_above_expectation,player_gsis_id",
  // week 0 = season aggregate (used)
  "2024,REG,0,Open Olsen,WR,AAA,6.1,3.50,9.0,32.5,80,110,68.0,1100,8,5.0,4.2,0.80,00-rec1",
  "2024,REG,0,Covered Cole,WR,BBB,5.2,2.80,8.0,28.0,60,90,62.0,800,5,4.0,4.1,-0.10,00-rec2",
  // a weekly row that must be EXCLUDED (week != 0)
  "2024,REG,1,Open Olsen,WR,AAA,6.0,4.00,9.0,33.0,6,9,70.0,95,1,5.5,4.0,1.50,00-rec1",
  // below target threshold (excluded)
  "2024,REG,0,Tiny Targets,WR,CCC,5.0,3.90,7.0,10.0,5,12,60.0,70,0,3.0,3.0,0.00,00-rec3",
].join("\n");

const PASSING = [
  "season,season_type,week,player_display_name,player_position,team_abbr,avg_time_to_throw,avg_completed_air_yards,avg_intended_air_yards,aggressiveness,completion_percentage,expected_completion_percentage,completion_percentage_above_expectation,passer_rating,attempts,completions,player_gsis_id",
  "2024,REG,0,Sharp Shooter,QB,AAA,2.7,6.0,8.0,16.0,70.0,65.0,5.0,105.0,560,392,00-qb1",
  "2024,REG,0,Average Arm,QB,BBB,2.9,5.5,7.5,14.0,64.0,62.0,2.0,92.0,500,320,00-qb2",
  // below attempts threshold (excluded)
  "2024,REG,0,Backup Bob,QB,CCC,2.6,5.0,7.0,12.0,60.0,60.0,9.9,88.0,40,24,00-qb3",
].join("\n");

const RUSHING = [
  "season,season_type,week,player_display_name,player_position,team_abbr,efficiency,percent_attempts_gte_eight_defenders,avg_time_to_los,rush_attempts,rush_yards,expected_rush_yards,rush_yards_over_expected,rush_yards_over_expected_per_att,player_gsis_id",
  "2024,REG,0,Vision Vance,RB,AAA,3.4,22.0,2.8,260,1400,1100,300,1.20,00-rb1",
  "2024,REG,0,Plodder Pete,RB,BBB,4.0,28.0,3.0,200,820,790,30,0.50,00-rb2",
  // below rush threshold (excluded)
  "2024,REG,0,Scat Back,RB,CCC,3.0,18.0,2.5,30,180,150,30,1.90,00-rb3",
].join("\n");

function gz(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("ngs_receiving.csv.gz")) return gz(RECEIVING);
    if (url.includes("ngs_passing.csv.gz")) return gz(PASSING);
    if (url.includes("ngs_rushing.csv.gz")) return gz(RUSHING);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse next gen stats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNextGenStatsCacheForTests();
  });

  it("ranks tracking leaders from season-aggregate rows only", async () => {
    const ngs = await loadNflverseNextGenStats({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(ngs.status).toBe("live");
    expect(ngs.season).toBe(2024);
    expect(ngs.canPublishProjections).toBe(false);

    // Receiving sorted by separation; weekly row + sub-threshold target excluded.
    expect(ngs.receiving.map((r) => r.playerName)).toEqual(["Open Olsen", "Covered Cole"]);
    expect(ngs.receiving[0]?.avgSeparation).toBe(3.5);
    expect(ngs.receiving[0]?.avgYacAboveExpectation).toBe(0.8);
    expect(ngs.receiving[0]?.catchPct).toBeCloseTo(0.68, 2);

    // Passing sorted by CPOE; backup under 100 attempts excluded despite high CPOE.
    expect(ngs.passing.map((p) => p.playerName)).toEqual(["Sharp Shooter", "Average Arm"]);
    expect(ngs.passing[0]?.cpoe).toBe(5);

    // Rushing sorted by RYOE/att; scat back under 50 carries excluded.
    expect(ngs.rushing.map((r) => r.playerName)).toEqual(["Vision Vance", "Plodder Pete"]);
    expect(ngs.rushing[0]?.ryoePerAtt).toBe(1.2);
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const ngs = await loadNflverseNextGenStats({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(ngs.status).toBe("source-error");
    expect(ngs.receiving).toHaveLength(0);
    expect(ngs.passing).toHaveLength(0);
    expect(ngs.rushing).toHaveLength(0);
    expect(ngs.canPublishProjections).toBe(false);
  });

  it("serves the NGS API without fabricating projections", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/next-gen-stats/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    expect((body["data"] as Record<string, unknown>)["canPublishProjections"]).toBe(false);
  });
});
