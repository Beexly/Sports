import { describe, it, expect } from "vitest";
import {
  classifyMoves,
  profileBook,
  stalenessScore,
  compareMarketLag,
  type QuoteEvent,
} from "../book-dna.js";

// fast leads every move; slow follows ~4 min later; mid never moves off the open.
function series(): QuoteEvent[] {
  return [
    { book: "fast", point: 45, timestamp: "2024-09-08T10:00:00Z" },
    { book: "slow", point: 45, timestamp: "2024-09-08T10:00:00Z" },
    { book: "mid", point: 45, timestamp: "2024-09-08T10:00:00Z" },
    { book: "fast", point: 44, timestamp: "2024-09-08T10:01:00Z" },
    { book: "slow", point: 44, timestamp: "2024-09-08T10:05:00Z" },
    { book: "fast", point: 43, timestamp: "2024-09-08T10:10:00Z" },
    { book: "slow", point: 43, timestamp: "2024-09-08T10:14:00Z" },
  ];
}

describe("classifyMoves", () => {
  it("identifies the leader and lagged followers per move", () => {
    const moves = classifyMoves(series());
    expect(moves.map((m) => m.level)).toEqual([44, 43]);
    expect(moves[0]!.leader).toBe("fast");
    expect(moves[0]!.followers).toEqual([{ book: "slow", lagMs: 240_000 }]);
    expect(moves[0]!.nonFollowers).toContain("mid");
  });
});

describe("profileBook + stalenessScore", () => {
  const moves = classifyMoves(series());
  it("scores the fast book as a leader and the slow book as a stale follower", () => {
    const fast = profileBook("fast", "total", moves);
    const slow = profileBook("slow", "total", moves);
    expect(fast.leadFreq).toBe(1);
    expect(slow.followFreq).toBe(1);
    expect(slow.medianLagMs).toBe(240_000);
    expect(stalenessScore(slow).staleness).toBeGreaterThan(stalenessScore(fast).staleness);
    expect(stalenessScore(fast).staleness).toBe(0);
  });

  it("counts a book that misses moves entirely", () => {
    const mid = profileBook("mid", "total", moves);
    expect(mid.missRate).toBe(1);
    expect(mid.leadFreq).toBe(0);
  });
});

describe("compareMarketLag", () => {
  it("exposes a book slower on props than on sides", () => {
    const sideProfile = { book: "b", market: "spread", samples: 5, leadFreq: 0.4, followFreq: 0.6, medianLagMs: 60_000, missRate: 0 };
    const propProfile = { book: "b", market: "player_rush_yds", samples: 5, leadFreq: 0, followFreq: 0.6, medianLagMs: 300_000, missRate: 0.4 };
    const d = compareMarketLag(propProfile, sideProfile);
    expect(d.lagDeltaMs).toBe(240_000);
    expect(d.missDelta).toBeCloseTo(0.4, 6);
  });
});
