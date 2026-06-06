import { describe, it, expect, afterEach } from "vitest";
import { activePlayerPool, registerProjectionsProvider, ILLUSTRATIVE_PROJECTIONS } from "./projections";
import { PLAYERS, vor, byPosition, type Player } from "../fantasy/players";

function rb(id: string, proj: number): Player {
  return {
    id, name: id, pos: "RB", team: "ATL", bye: 12, proj, floor: proj - 50, ceiling: proj + 50,
    usage: 0.6, schemeFit: 0.6, role: "back", trend: "flat", injury: "healthy", note: "",
  };
}

afterEach(() => registerProjectionsProvider(null));

describe("activePlayerPool — the plug-in swap point", () => {
  it("returns the illustrative universe when no live feed is registered", () => {
    expect(activePlayerPool({})).toBe(PLAYERS);
  });

  it("returns a live feed's players only when registered, live, AND keyed", () => {
    const customPool = [rb("a", 300), rb("b", 100)];
    registerProjectionsProvider({ name: "Acme", live: true, list: () => [], players: () => customPool });

    // registered but env not set -> still illustrative (the founder gate holds)
    expect(activePlayerPool({})).toBe(PLAYERS);
    // registered AND keyed -> the live pool flows through
    expect(activePlayerPool({ PROJECTIONS_PROVIDER: "acme" })).toBe(customPool);
  });

  it("falls back to illustrative when a live provider omits players()", () => {
    registerProjectionsProvider({ name: "thin", live: true, list: () => [] });
    expect(activePlayerPool({ PROJECTIONS_PROVIDER: "acme" })).toBe(PLAYERS);
  });

  it("the illustrative provider exposes the rich pool", () => {
    expect(ILLUSTRATIVE_PROJECTIONS.players?.()).toBe(PLAYERS);
  });
});

describe("pool-aware VOR helpers", () => {
  it("computes replacement + VOR against the passed pool, not the global one", () => {
    const pool = [rb("a", 300), rb("b", 100)];
    // replacement = 2nd-ranked RB in this 2-player pool = 100, so VOR(300) = 200
    expect(vor(pool[0]!, pool)).toBe(200);
    expect(byPosition("RB", pool).map((p) => p.id)).toEqual(["a", "b"]);
    // default pool (global PLAYERS) yields a different replacement baseline
    expect(vor(pool[0]!)).not.toBe(200);
  });
});
