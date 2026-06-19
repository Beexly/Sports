import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchScoresWithPool,
  __resetScorePoolStateForTests,
  SCORE_POOL_COOLDOWN_MS,
  DEFAULT_SCORE_PROVIDERS,
} from "./score-provider-pool";
import { espnScoreProvider } from "./providers/espn-scores";
import { nflverseScoreProvider } from "./providers/nflverse-scores";
import type {
  ScoreProvider,
  NormalizedScore,
  NormalizedScoreResult,
} from "./score-provider";

function score(gameKey: string): NormalizedScore {
  return {
    gameKey,
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 21,
    awayScore: 14,
    completed: true,
    commenceTime: "2026-06-19T17:00:00Z",
  };
}

/** A controllable fake provider. */
function fakeProvider(
  sourceId: string,
  impl: () => NormalizedScoreResult | Promise<NormalizedScoreResult>,
): ScoreProvider & { fetchScores: ReturnType<typeof vi.fn> } {
  const fetchScores = vi.fn(async () => impl());
  return {
    name: `fake:${sourceId}`,
    sourceId,
    fetchScores: fetchScores as unknown as ScoreProvider["fetchScores"],
  } as ScoreProvider & { fetchScores: ReturnType<typeof vi.fn> };
}

function healthy(provider: string, keys: string[]): NormalizedScoreResult {
  return { provider, scores: keys.map(score), healthy: true, rightsSnapshot: null };
}
function unhealthy(provider: string, error: string): NormalizedScoreResult {
  return { provider, scores: [], healthy: false, error };
}

describe("fetchScoresWithPool", () => {
  beforeEach(() => __resetScorePoolStateForTests());

  it("returns the first healthy provider's scores and does not call later providers", async () => {
    const a = fakeProvider("a", () => healthy("a", ["g1", "g2"]));
    const b = fakeProvider("b", () => healthy("b", ["g3"]));
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [a, b]);

    expect(res.healthy).toBe(true);
    expect(res.servedBy).toBe("a");
    expect(res.result.scores).toHaveLength(2);
    expect(a.fetchScores).toHaveBeenCalledTimes(1);
    expect(b.fetchScores).not.toHaveBeenCalled();
  });

  it("threads fetchFn + checkClearance through to the provider unchanged", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const checkClearance = vi.fn(() => ({ allowed: true as const, rightsSnapshot: null }));
    const a = fakeProvider("a", () => healthy("a", ["g1"]));
    await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0, fetchFn, checkClearance }, [a]);

    expect(a.fetchScores).toHaveBeenCalledWith(
      "americanfootball_nfl",
      2,
      expect.objectContaining({ fetchFn, checkClearance }),
    );
  });

  it("FAILS OVER to the next provider when the first is unhealthy", async () => {
    const a = fakeProvider("a", () => unhealthy("a", "clearance-denied"));
    const b = fakeProvider("b", () => healthy("b", ["g1"]));
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [a, b]);

    expect(res.healthy).toBe(true);
    expect(res.servedBy).toBe("b");
    expect(res.attempts).toEqual([{ provider: "a", reason: "clearance-denied" }]);
    expect(a.fetchScores).toHaveBeenCalledTimes(1);
    expect(b.fetchScores).toHaveBeenCalledTimes(1);
  });

  it("ALL DOWN → honest empty result, healthy:false, never throws", async () => {
    const a = fakeProvider("a", () => unhealthy("a", "http-503"));
    const b = fakeProvider("b", () => unhealthy("b", "csv-parse-failed"));
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [a, b]);

    expect(res.healthy).toBe(false);
    expect(res.servedBy).toBeNull();
    expect(res.result).toEqual({
      provider: "score-pool",
      scores: [],
      healthy: false,
      error: "no-provider-available",
    });
    expect(res.attempts.map((x) => x.provider)).toEqual(["a", "b"]);
  });

  it("a provider that THROWS is contained — pool fails over and never propagates", async () => {
    const a = fakeProvider("a", () => {
      throw new Error("boom");
    });
    const b = fakeProvider("b", () => healthy("b", ["g1"]));
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [a, b]);

    expect(res.healthy).toBe(true);
    expect(res.servedBy).toBe("b");
    expect(res.attempts[0]).toMatchObject({ provider: "a", reason: "threw:Error" });
  });

  it("healthy-but-EMPTY is not a failure: returns the honest healthy-empty result when no provider serves scores", async () => {
    const a = fakeProvider("a", () => healthy("a", [])); // healthy, zero scores
    const b = fakeProvider("b", () => healthy("b", [])); // healthy, zero scores
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [a, b]);

    expect(res.healthy).toBe(true);
    expect(res.result.scores).toEqual([]);
    // Whichever was attempted first is the served-by; both were probed.
    expect(res.servedBy).not.toBeNull();
    expect(a.fetchScores).toHaveBeenCalledTimes(1);
    expect(b.fetchScores).toHaveBeenCalledTimes(1);
  });

  it("prefers a provider with scores over a healthy-empty one regardless of order", async () => {
    const empty = fakeProvider("empty", () => healthy("empty", []));
    const full = fakeProvider("full", () => healthy("full", ["g1"]));
    const res = await fetchScoresWithPool("americanfootball_nfl", 2, { now: () => 0 }, [empty, full]);

    expect(res.healthy).toBe(true);
    expect(res.servedBy).toBe("full");
    expect(res.result.scores).toHaveLength(1);
  });

  it("ROUND-ROBIN: rotates the starting provider across calls", async () => {
    const a = fakeProvider("a", () => healthy("a", ["g1"]));
    const b = fakeProvider("b", () => healthy("b", ["g2"]));

    // Fixed clock so neither is in cooldown; only rotation moves the start index.
    const first = await fetchScoresWithPool("nfl", 2, { now: () => 0 }, [a, b]);
    const second = await fetchScoresWithPool("nfl", 2, { now: () => 0 }, [a, b]);

    // Two healthy providers, fresh state → call 1 starts at a, call 2 starts at b.
    expect(first.servedBy).toBe("a");
    expect(second.servedBy).toBe("b");
    // The non-winner of each call is never invoked (first-success-wins).
    expect(a.fetchScores).toHaveBeenCalledTimes(1);
    expect(b.fetchScores).toHaveBeenCalledTimes(1);
  });

  it("COOLDOWN: a failed provider is de-preferred (tried last) on the next call until cooldown elapses", async () => {
    let now = 1_000_000;
    const order: string[] = [];
    const a = fakeProvider("a", () => {
      order.push("a");
      return unhealthy("a", "http-500");
    });
    const b = fakeProvider("b", () => {
      order.push("b");
      return healthy("b", ["g1"]);
    });

    // Call 1: rotation start = a. a fails (→ cooldown), b serves.
    const r1 = await fetchScoresWithPool("nfl", 2, { now: () => now }, [a, b]);
    expect(r1.servedBy).toBe("b");

    // Call 2 (still within cooldown): rotation start would be b, but even if it
    // were a, a is cooling so b is preferred. b serves; a stays de-preferred.
    order.length = 0;
    const r2 = await fetchScoresWithPool("nfl", 2, { now: () => now + 1000 }, [a, b]);
    expect(r2.servedBy).toBe("b");
    // a (cooling) is not even reached because b (healthy) serves first.
    expect(order).toEqual(["b"]);

    // After cooldown elapses, a is healthy again and re-enters normal rotation.
    now += SCORE_POOL_COOLDOWN_MS + 1;
    const a2 = fakeProvider("a", () => healthy("a", ["g9"]));
    __resetScorePoolStateForTests(); // fresh state to assert clean rotation
    const r3 = await fetchScoresWithPool("nfl", 2, { now: () => now }, [a2, b]);
    expect(r3.healthy).toBe(true);
  });

  it("empty roster → honest empty result, no throw", async () => {
    const res = await fetchScoresWithPool("nfl", 2, { now: () => 0 }, []);
    expect(res.healthy).toBe(false);
    expect(res.servedBy).toBeNull();
    expect(res.result.error).toBe("no-provider-available");
  });

  it("default roster wires the two real free providers (ESPN, nflverse)", () => {
    expect(DEFAULT_SCORE_PROVIDERS).toContain(espnScoreProvider);
    expect(DEFAULT_SCORE_PROVIDERS).toContain(nflverseScoreProvider);
  });
});
