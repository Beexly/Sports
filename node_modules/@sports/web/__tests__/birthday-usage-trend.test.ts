import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: async () => null }));
import {
  loadBirthdayUsageTrendReport,
  resetBirthdayUsageTrendCacheForTests,
} from "@/lib/nflverse/birthday-usage-trend";

const PLAYER_STATS = [
  "player_id,player_display_name,position,recent_team,season,week,season_type,opponent_team,carries,targets",
  "p-a,Player A,RB,TMA,2024,1,REG,OPP,8,2",
  "p-a,Player A,RB,TMA,2024,2,REG,OPP,8,2",
  "p-a,Player A,RB,TMA,2024,3,REG,OPP,8,2",
  "p-a,Player A,RB,TMA,2024,4,REG,OPP,8,2",
  "p-a,Player A,RB,TMA,2024,5,REG,OPP,18,2",
  "p-a,Player A,RB,TMA,2024,6,REG,OPP,9,2",
  "p-b,Player B,WR,TMB,2024,1,REG,OPP,0,10",
  "p-b,Player B,WR,TMB,2024,2,REG,OPP,0,10",
  "p-b,Player B,WR,TMB,2024,3,REG,OPP,0,10",
  "p-b,Player B,WR,TMB,2024,4,REG,OPP,0,10",
  "p-b,Player B,WR,TMB,2024,5,REG,OPP,0,10",
  "p-b,Player B,WR,TMB,2024,6,REG,OPP,0,10",
  "p-c,Player C,TE,TMC,2024,1,REG,OPP,0,8",
  "p-c,Player C,TE,TMC,2024,2,REG,OPP,0,8",
  "p-c,Player C,TE,TMC,2024,3,REG,OPP,0,8",
  "p-c,Player C,TE,TMC,2024,4,REG,OPP,0,8",
  "p-c,Player C,TE,TMC,2024,5,REG,OPP,0,2",
  "p-c,Player C,TE,TMC,2024,6,REG,OPP,0,8",
].join("\n");

const PLAYERS = [
  "gsis_id,display_name,birth_date",
  "p-a,Player A,2000-10-13",
  "p-b,Player B,2000-01-01",
  "p-c,Player C,2000-10-13",
].join("\n");

const SCHEDULES = [
  "game_id,season,game_type,week,gameday,away_team,home_team",
  "2024_01_TMA,2024,REG,1,2024-09-08,TMA,OPP",
  "2024_01_TMB,2024,REG,1,2024-09-08,TMB,OPP",
  "2024_01_TMC,2024,REG,1,2024-09-08,TMC,OPP",
  "2024_02_TMA,2024,REG,2,2024-09-15,TMA,OPP",
  "2024_02_TMB,2024,REG,2,2024-09-15,TMB,OPP",
  "2024_02_TMC,2024,REG,2,2024-09-15,TMC,OPP",
  "2024_03_TMA,2024,REG,3,2024-09-22,TMA,OPP",
  "2024_03_TMB,2024,REG,3,2024-09-22,TMB,OPP",
  "2024_03_TMC,2024,REG,3,2024-09-22,TMC,OPP",
  "2024_04_TMA,2024,REG,4,2024-09-29,TMA,OPP",
  "2024_04_TMB,2024,REG,4,2024-09-29,TMB,OPP",
  "2024_04_TMC,2024,REG,4,2024-09-29,TMC,OPP",
  "2024_05_TMA,2024,REG,5,2024-10-13,TMA,OPP",
  "2024_05_TMB,2024,REG,5,2024-10-13,TMB,OPP",
  "2024_05_TMC,2024,REG,5,2024-10-13,TMC,OPP",
  "2024_06_TMA,2024,REG,6,2024-10-20,TMA,OPP",
  "2024_06_TMB,2024,REG,6,2024-10-20,TMB,OPP",
  "2024_06_TMC,2024,REG,6,2024-10-20,TMC,OPP",
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

describe("birthday-window usage trend report", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetBirthdayUsageTrendCacheForTests();
  });

  it("computes a real birthday-window cohort without making it a scoring input", async () => {
    const report = await loadBirthdayUsageTrendReport({
      fetcher: mockTrendFetch(),
      minSampleSize: 1,
      minPriorAverage: 5,
      cacheTtlMs: 0,
    });

    expect(report.status).toBe("live");
    expect(report.sourceRows.playerStats).toBe(18);
    expect(report.quality.observationsUsed).toBe(6);
    expect(report.quality.birthdayWindowObservations).toBe(2);
    expect(report.quality.careerMilestone50Observations).toBe(0);
    expect(report.result?.n).toBe(2);
    expect(report.result?.baselineN).toBe(4);
    expect(report.milestoneResult?.label).toBe("Career game 50/100/150+");
    expect(report.milestoneSensitivity).toHaveLength(3);
    expect(report.result?.metric).toBe("opportunity-delta");
    expect(report.canPowerScoring).toBe(false);
    expect(report.boundary).toContain("scoring input");
    expect(report.examples.positiveSpikes[0]?.playerName).toBe("Player A");
    expect(report.examples.negativeDrops[0]?.playerName).toBe("Player C");
  });

  it("serves the report API as a read-only research result", async () => {
    vi.stubGlobal("fetch", mockTrendFetch());
    vi.resetModules();

    const mod = await import("@/app/api/nflverse/birthday-usage-trend/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["status"]).toBe("live");
    expect(data["canPowerScoring"]).toBe(false);
    expect(data["conclusion"]).toEqual(expect.stringMatching(/candidate|not-publishable/));
  });

  it("returns an empty report instead of fabricating a narrative when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));

    const report = await loadBirthdayUsageTrendReport({ fetcher, cacheTtlMs: 0 });

    expect(report.status).toBe("source-error");
    expect(report.result).toBeNull();
    expect(report.quality.observationsUsed).toBe(0);
    expect(report.conclusion).toBe("source-error");
  });
});
