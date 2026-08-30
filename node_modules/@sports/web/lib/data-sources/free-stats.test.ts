/**
 * Tests for GSE-SEC-042 fix: FreeStats must stamp fetchedAt with the actual
 * fetch time, NOT this.clock() on a cache hit. A cache hit should return the
 * time the underlying data was fetched (and stored), not the wall-clock time
 * at which the hit was served.
 */

import { describe, it, expect, vi } from "vitest";
import { FreeStats, type Clock } from "./free-stats";

// A raw ESPN scoreboard event shape (the input parseEspnScoreboard consumes),
// NOT the normalized NormalizedGame output.
function espnEvent(gameId: string) {
  return {
    id: gameId,
    date: "2025-01-01T00:00:00Z",
    status: { type: { state: "pre", completed: false, shortDetail: "", detail: "" } },
    competitions: [
      {
        venue: { fullName: "Test Stadium" },
        competitors: [
          { homeAway: "home", team: { displayName: "Home", abbreviation: "HME" }, score: "" },
          { homeAway: "away", team: { displayName: "Away", abbreviation: "AWY" }, score: "" },
        ],
      },
    ],
  };
}

function makeFetchReturning(events: unknown) {
  return vi.fn(async () => new Response(JSON.stringify({ events: events })));
}

describe("GSE-SEC-042 — FreeStats fetchedAt provenance", () => {
  it("stamps fetchedAt with the clock time on a cold miss", async () => {
    const t0 = 1_000_000;
    const clock: Clock = vi.fn(() => t0);
    const fetchImpl = makeFetchReturning([espnEvent("g1")]);
    const freestats = new FreeStats({ clock, fetchImpl });

    const res = await freestats.scores("nba");
    expect(res.cached).toBe(false);
    // On a miss, fetchedAt == the single clock() read inside memoize.
    expect(res.fetchedAt).toBe(t0);
    expect((res.data as unknown[]).length).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns the ORIGINAL fetch time (not the hit time) on a cache hit", async () => {
    const clock = vi.fn();
    const fetchImpl = makeFetchReturning([espnEvent("g1")]);
    const freestats = new FreeStats({ clock, fetchImpl });

    // Call 1 (miss): clock() read → fetch time.
    clock.mockReturnValueOnce(1_000_000);
    const first = await freestats.scores("nba");
    expect(first.cached).toBe(false);
    expect(first.fetchedAt).toBe(1_000_000);

    // Call 2 (warm hit within 60s TTL): clock() read → hit time (1_000_005).
    // THE FIX: fetchedAt must stay at the original fetch time, NOT the hit time.
    clock.mockReturnValueOnce(1_000_005);
    const second = await freestats.scores("nba");
    expect(second.cached).toBe(true);
    expect(second.fetchedAt).toBe(1_000_000); // original fetch time, not hit time
    expect(second.data[0].gameId).toBe("g1"); // served from cache
    expect(fetchImpl).toHaveBeenCalledTimes(1); // not re-fetched
  });

  it("a miss AFTER expiry re-fetches and resets fetchedAt", async () => {
    const clock = vi.fn();
    const fetchImpl = makeFetchReturning([espnEvent("g1")]);
    const freestats = new FreeStats({ clock, fetchImpl });

    clock.mockReturnValueOnce(1_000_000);
    const first = await freestats.scores("nba");
    expect(first.fetchedAt).toBe(1_000_000);

    // 70s later — past TTL (60s) → fresh miss, new fetch time.
    clock.mockReturnValueOnce(1_000_000 + 70_000);
    const second = await freestats.scores("nba");
    expect(second.cached).toBe(false);
    expect(second.fetchedAt).toBe(1_000_000 + 70_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
