import { describe, it, expect, afterEach } from "vitest";
import { buildGradedPool, buildGradedProvider, loadGradedPool } from "./graded-pool";
import { registerProjectionsProvider, activePlayerPool } from "./projections";
import { PLAYERS } from "../fantasy/players";
import type { PlayerProfile, ProcessSignal } from "../intelligence/player-model";
import type { ExpectedPointsRow } from "../intelligence/expected-points";

function prof(name: string, position: string, fppg: number, signal: ProcessSignal, touches = 80, games = 8): PlayerProfile {
  return {
    playerId: name, name, team: "KC", position: position as PlayerProfile["position"], games, plays: 200,
    fantasyPpr: fppg * games, fppg, epaPerPlay: 0.1, touches, wopr: 0.5, targetShare: 0.2, dakota: null, pacr: null,
    processGrade: 70, productionPct: 50, signal, note: "n",
  };
}
function xfp(name: string, xfpPerGame: number): ExpectedPointsRow {
  return { playerId: name, name, team: "KC", position: "WR", games: 8, xfpTotal: xfpPerGame * 8, xfpPerGame, actualTotal: 0, diff: 0, xfpPct: 50, prodPct: 50, signal: "in-line", note: "n" };
}

afterEach(() => registerProjectionsProvider(null));

describe("buildGradedPool", () => {
  const profiles = [prof("Star WR", "WR", 12, "buy-low"), prof("No XFP RB", "RB", 10, "in-line"), prof("Zero Guy", "WR", 0, "in-line")];
  const pool = buildGradedPool(profiles, [xfp("Star WR", 15)]);

  it("projects from xFP when present, else actual per-game; excludes no-input players", () => {
    expect(pool.map((p) => p.name)).toEqual(["Star WR", "No XFP RB"]); // Zero Guy excluded, sorted by proj
    expect(pool.find((p) => p.name === "Star WR")!.proj).toBe(255); // xFP 15 * 17
    expect(pool.find((p) => p.name === "No XFP RB")!.proj).toBe(170); // fppg 10 * 17 (no xFP)
  });

  it("maps the buy/sell signal to a trend and keeps a real band", () => {
    const star = pool.find((p) => p.name === "Star WR")!;
    expect(star.trend).toBe("up");
    expect(star.floor).toBeLessThan(star.proj);
    expect(star.ceiling).toBeGreaterThan(star.proj);
  });
});

describe("buildGradedProvider + the founder gate", () => {
  const pool = buildGradedPool([prof("Live Guy", "WR", 14, "buy-low")], [xfp("Live Guy", 16)]);

  it("is a live provider whose projections are tagged live", () => {
    const provider = buildGradedProvider(pool);
    expect(provider.live).toBe(true);
    expect(provider.players!()).toBe(pool);
    expect(provider.list()[0]!.source).toBe("live");
  });

  it("only drives activePlayerPool when registered AND keyed", () => {
    registerProjectionsProvider(buildGradedProvider(pool));
    expect(activePlayerPool({})).toBe(PLAYERS); // env not set -> gate holds, illustrative
    expect(activePlayerPool({ PROJECTIONS_PROVIDER: "graded" })).toBe(pool); // keyed -> real graded pool
  });
});

describe("loadGradedPool", () => {
  it("degrades to source-error when the model can't load (no fabrication)", async () => {
    const r = await loadGradedPool({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.players).toEqual([]);
  });

  // A minimal player_stats CSV (decodeDatasetText passes plain text through) with
  // one WR over the 25-play threshold, season 2024.
  const statsCsv = [
    "season,season_type,week,position,player_id,player_display_name,recent_team,attempts,carries,targets,passing_epa,rushing_epa,receiving_epa,wopr,target_share,dakota,pacr,fantasy_points_ppr",
    "2024,REG,1,WR,WR1,Real Wideout,KC,0,0,14,0,0,6,0.5,0.25,,,10",
    "2024,REG,2,WR,WR1,Real Wideout,KC,0,0,14,0,0,6,0.5,0.25,,,10",
  ].join("\n");
  const xfpCsv = (season: number) => [
    "season,week,position,player_id,full_name,posteam,total_fantasy_points_exp,total_fantasy_points_diff",
    `${season},1,WR,WR1,Real Wideout,KC,18,0`,
    `${season},2,WR,WR1,Real Wideout,KC,18,0`,
  ].join("\n");

  // Routes by URL: nflverse player_stats -> 2024 model; ffverse ep_weekly_2024 -> 2024 xFP.
  type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
  function route(xfpSeasonServed: number): FetchLike {
    return async (url) => {
      if (url.includes("player_stats")) return new Response(statsCsv);
      if (url.includes(`ep_weekly_${xfpSeasonServed}.csv`)) return new Response(xfpCsv(xfpSeasonServed));
      return new Response("not found", { status: 404 });
    };
  }

  it("pins xFP to the model's season so the projection basis is xFP, not actual", async () => {
    const r = await loadGradedPool({ fetcher: route(2024) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    const wr = r.players.find((p) => p.id === "WR1")!;
    expect(wr).toBeTruthy();
    // basis = xFP/g 18 * 17 = 306 (NOT actual fppg 10/g -> 170)
    expect(wr.proj).toBe(306);
  });

  it("falls back to the model's per-game when xFP for the model's season is missing (no cross-season basis)", async () => {
    // Only 2025 xFP is served; the 2024 model must NOT borrow it.
    const r = await loadGradedPool({ fetcher: route(2025) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    const wr = r.players.find((p) => p.id === "WR1")!;
    // basis = actual fppg 10/g * 17 = 170 (2025 xFP rejected as off-season)
    expect(wr.proj).toBe(170);
  });
});
