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
});
