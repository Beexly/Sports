import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMoneyPuckNhl, resetMoneyPuckNhlCacheForTests } from "@/lib/moneypuck/nhl";

const SKATERS = [
  "playerId,name,team,position,situation,games_played,I_F_xGoals,I_F_goals,I_F_points,I_F_shotsOnGoal,onIce_xGoalsPercentage",
  "1,Elite Eddie,BOS,C,all,30,25.0,30,70,250,0.58",
  "2,Lucky Larry,TOR,R,all,30,10.0,25,55,180,0.51",
  "3,Volume Vic,COL,L,all,30,28.0,20,60,300,0.56",
  "4,Few Games Fred,NYR,C,all,10,30.0,18,40,150,0.50", // < MIN_GAMES
  "1,Elite Eddie,BOS,C,5on5,30,18.0,20,45,180,0.60", // wrong situation -> excluded
].join("\n");

const GOALIES = [
  "playerId,name,team,situation,games_played,xGoals,goals",
  "10,Wall Wally,NYR,all,40,120.0,100",
  "11,Sieve Steve,SJS,all,40,90.0,110",
  "12,Backup Benny,DAL,all,5,30.0,20", // < MIN_GOALIE_GAMES
].join("\n");

const TEAMS = [
  "team,situation,games_played,xGoalsPercentage",
  "BOS,all,82,0.55",
  "TOR,all,82,0.52",
].join("\n");

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/csv" } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("skaters.csv")) return csv(SKATERS);
    if (url.includes("goalies.csv")) return csv(GOALIES);
    if (url.includes("teams.csv")) return csv(TEAMS);
    return new Response("missing", { status: 404 });
  });
}

describe("moneypuck nhl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetMoneyPuckNhlCacheForTests();
  });

  it("ranks all-situation skaters by xGoals and computes goals-over-expected", async () => {
    const nhl = await loadMoneyPuckNhl({ season: 2025, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(nhl.status).toBe("live");
    expect(nhl.season).toBe(2025);
    expect(nhl.seasonLabel).toBe("2025-26");
    expect(nhl.canPublishPicks).toBe(false);
    expect(nhl.attribution).toMatch(/moneypuck/i);

    // Sorted by xG; Fred (<20 g) and the 5on5 row excluded -> 3 skaters.
    expect(nhl.skaters.map((s) => s.name)).toEqual(["Volume Vic", "Elite Eddie", "Lucky Larry"]);
    const larry = nhl.skaters.find((s) => s.name === "Lucky Larry");
    expect(larry?.goalsOverExpected).toBe(15); // 25 goals - 10 xG
    expect(nhl.teams[0]?.team).toBe("BOS");

    // Goalies ranked by GSAx (xGA - GA); the 5-game backup is excluded.
    expect(nhl.goalies.map((g) => g.name)).toEqual(["Wall Wally", "Sieve Steve"]);
    expect(nhl.goalies[0]?.gsax).toBe(20); // 120 xGA - 100 GA
  });

  it("guards against MoneyPuck's HTML error page for a missing season", async () => {
    const fetcher = vi.fn(async () => new Response("<html><body>Not found</body></html>", { status: 200, headers: { "content-type": "text/html" } }));
    const nhl = await loadMoneyPuckNhl({ season: 1999, fetcher, cacheTtlMs: 0 });
    expect(nhl.status).toBe("source-error");
    expect(nhl.skaters).toHaveLength(0);
  });

  it("serves the moneypuck nhl API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/moneypuck/nhl/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
