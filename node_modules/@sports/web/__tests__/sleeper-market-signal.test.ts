import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadSleeperMarketSignal,
  resetSleeperMarketSignalCacheForTests,
} from "@/lib/sleeper/market-signal";

const PLAYERS = {
  "1": { full_name: "Add Andy", team: "KC", position: "WR", injury_status: null, years_exp: 3 },
  "2": { first_name: "Drop", last_name: "Dan", team: "NYJ", position: "RB", injury_status: "Questionable", years_exp: 5 },
  "3": { full_name: "Bench Ben", team: "SF", position: "TE", injury_status: null, years_exp: 1 },
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/trending/add")) {
      // "99" is not in the player map -> must be filtered out.
      return json([{ player_id: "1", count: 500 }, { player_id: "99", count: 100 }]);
    }
    if (url.includes("/trending/drop")) {
      return json([{ player_id: "2", count: 300 }]);
    }
    if (url.includes("/v1/players/nfl")) {
      return json(PLAYERS);
    }
    return new Response("missing", { status: 404 });
  });
}

describe("sleeper market signal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSleeperMarketSignalCacheForTests();
  });

  it("joins trending ids to the player map, drops unknown ids, and carries attribution", async () => {
    const signal = await loadSleeperMarketSignal({ fetcher: mockFetch(), cacheTtlMs: 0, playersTtlMs: 0 });

    expect(signal.status).toBe("live");
    expect(signal.playerPool).toBe(3);
    expect(signal.canPublishPicks).toBe(false);
    expect(signal.attribution).toMatch(/sleeper/i);

    // Unknown id "99" filtered; only "Add Andy" remains.
    expect(signal.adds.map((a) => a.name)).toEqual(["Add Andy"]);
    expect(signal.adds[0]).toMatchObject({ team: "KC", position: "WR", count: 500 });

    expect(signal.drops[0]?.name).toBe("Drop Dan");
    expect(signal.drops[0]?.injuryStatus).toBe("Questionable");
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const signal = await loadSleeperMarketSignal({ fetcher, cacheTtlMs: 0, playersTtlMs: 0 });
    expect(signal.status).toBe("source-error");
    expect(signal.adds).toHaveLength(0);
    expect(signal.drops).toHaveLength(0);
    expect(signal.canPublishPicks).toBe(false);
  });

  it("serves the market-signal API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/sleeper/market-signal/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    expect((body["data"] as Record<string, unknown>)["canPublishPicks"]).toBe(false);
  });
});
