import { describe, it, expect, vi, afterEach } from "vitest";
import { SleeperClient, SleeperError, pprPointsFor } from "../sleeper-client.js";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as unknown as Response;
}

const noSleep = (_ms: number) => Promise.resolve();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SleeperClient.getNflState", () => {
  it("parses season/week/state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ season: "2024", season_type: "regular", week: 5, leg: 5 }),
      ),
    );
    const state = await new SleeperClient().getNflState();
    expect(state).toEqual({ season: "2024", seasonType: "regular", week: 5, leg: 5 });
  });
});

describe("SleeperClient.getTrending", () => {
  it("maps player ids + counts, drops rows without a player_id, and passes lookback/limit in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        { player_id: "123", count: 50 },
        { player_id: "456", count: 30 },
        { count: 5 }, // malformed — must be dropped
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const trending = await new SleeperClient().getTrending("add", { lookbackHours: 48, limit: 10 });
    expect(trending).toEqual([
      { playerId: "123", count: 50 },
      { playerId: "456", count: 30 },
    ]);
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("/players/nfl/trending/add?lookback_hours=48&limit=10");
  });

  it("clamps limit to [1,100] and lookback to >=1", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await new SleeperClient().getTrending("drop", { lookbackHours: 0, limit: 999 });
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("/players/nfl/trending/drop?lookback_hours=1&limit=100");
  });
});

describe("SleeperClient.getWeeklyStats + pprPointsFor", () => {
  it("returns the per-player stats map and extracts PPR points", async () => {
    const stats = { "123": { pts_ppr: 20.5, rush_yd: 88 }, "456": { pts_ppr: 0 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(stats)));
    const out = await new SleeperClient().getWeeklyStats(2024, 1);
    expect(out["123"]!.pts_ppr).toBe(20.5);
    expect(pprPointsFor(out, "123")).toBe(20.5);
    expect(pprPointsFor(out, "999")).toBe(0); // absent → 0
  });
});

describe("SleeperClient retry + errors", () => {
  it("retries a 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ season: "2024", season_type: "regular", week: 1, leg: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const state = await new SleeperClient({ sleep: noSleep }).getNflState();
    expect(state.week).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws SleeperError on a non-retryable error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));
    await expect(new SleeperClient({ sleep: noSleep }).getNflState()).rejects.toBeInstanceOf(
      SleeperError,
    );
  });
});
