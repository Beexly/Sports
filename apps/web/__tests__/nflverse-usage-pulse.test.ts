import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: async () => null }));
import {
  loadNflverseUsagePulse,
  resetNflverseUsagePulseCacheForTests,
} from "@/lib/nflverse/usage-pulse";

const PLAYER_STATS_CSV = [
  "player_id,player_name,player_display_name,position,headshot_url,recent_team,season,week,season_type,opponent_team,attempts,carries,rushing_yards,receptions,targets,receiving_yards,receiving_air_yards,target_share,air_yards_share,wopr,fantasy_points_ppr",
  "00-qb1,,Aaron Rodgers,QB,,PIT,2025,18,REG,CIN,32,2,8,0,0,0,0,,,0,1.1",
  "00-rb1,,Jaylen Warren,RB,,PIT,2025,18,REG,CIN,0,18,88,6,8,42,15,0.25,0.04,0.21,18.0",
  "00-wr1,,George Pickens,WR,,PIT,2025,18,REG,CIN,0,0,0,7,11,94,110,0.34,0.41,0.72,23.4",
].join("\n");

const ROSTERS_CSV = [
  "season,team,position,full_name,birth_date,gsis_id,headshot_url",
  "2025,PIT,QB,Aaron Rodgers,1983-12-02,00-qb1,",
  "2025,PIT,RB,Jaylen Warren,1998-11-01,00-rb1,",
  "2025,PIT,WR,George Pickens,2001-03-04,00-wr1,",
].join("\n");

function gzResponse(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, {
    status: 200,
    headers: { "content-length": String(body.length) },
  });
}

function csvResponse(csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: { "content-length": String(Buffer.byteLength(csv)) },
  });
}

function mockNflverseFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("player_stats.csv.gz")) return gzResponse(PLAYER_STATS_CSV);
    if (url.includes("roster_2025.csv")) return csvResponse(ROSTERS_CSV);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse usage pulse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNflverseUsagePulseCacheForTests();
  });

  it("builds real player usage rows and QB-age context from source CSVs", async () => {
    const pulse = await loadNflverseUsagePulse({
      season: 2025,
      fetcher: mockNflverseFetch(),
      cacheTtlMs: 0,
    });

    expect(pulse.status).toBe("live");
    expect(pulse.sourceRows).toBe(3);
    expect(pulse.seasonRows).toBe(3);
    expect(pulse.latestWeekRows).toBe(3);
    expect(pulse.week).toBe(18);
    expect(pulse.canPublishTrends).toBe(false);
    expect(pulse.playerRows[0]?.playerName).toBe("Jaylen Warren");
    expect(pulse.playerRows[0]?.opportunities).toBe(26);
    expect(pulse.playerRows[1]?.playerName).toBe("George Pickens");
    expect(pulse.playerRows[1]?.opportunities).toBe(11);
    expect(pulse.qbAgeRows[0]).toMatchObject({
      team: "PIT",
      qbName: "Aaron Rodgers",
      qbAgeBucket: "34+",
      passAttempts: 32,
      rbTargets: 8,
    });
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));

    const pulse = await loadNflverseUsagePulse({ season: 2025, fetcher, cacheTtlMs: 0 });

    expect(pulse.status).toBe("source-error");
    expect(pulse.playerRows).toHaveLength(0);
    expect(pulse.qbAgeRows).toHaveLength(0);
    expect(pulse.canPublishTrends).toBe(false);
    expect(pulse.blockReason).toContain("empty state");
  });

  it("serves the usage pulse API without fabricating publishable trends", async () => {
    vi.stubGlobal("fetch", mockNflverseFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/usage-pulse/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["status"]).toBe("live");
    expect(data["canPublishTrends"]).toBe(false);
    expect(data["sourceRows"]).toBe(3);
  });
});
