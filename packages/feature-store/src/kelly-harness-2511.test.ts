import { describe, expect, it } from "vitest";
import {
  compareSeason,
  headToHead,
  kellyFraction,
  type ModelGameProb,
} from "./kelly-harness-2511.js";

function mkGames(n: number, pa: number, pb: number, truth: (i: number) => boolean): ModelGameProb[] {
  return Array.from({ length: n }, (_, i) => ({
    gameId: `g${i}`,
    probs: { A: pa, B: pb },
    homeWon: truth(i),
  }));
}

describe("kelly harness", () => {
  it("kelly fraction is zero without edge and positive with edge", () => {
    expect(kellyFraction(0.5, 2.0)).toBe(0);
    expect(kellyFraction(0.6, 2.0)).toBeGreaterThan(0);
    expect(kellyFraction(0.6, 2.0)).toBeLessThanOrEqual(0.05);
  });

  it("head-to-head rewards the model that calls the upsets", () => {
    // A always takes home at 0.6, B always takes away at 0.6; home wins 70%
    const games = mkGames(100, 0.6, 0.4, (i) => i % 10 < 7);
    const h = headToHead(games, "A", "B");
    expect(h.games).toBe(100);
    expect(h.winner).toBe("A");
    expect(h.pnlA).toBeGreaterThan(h.pnlB);
  });

  it("skips games where models agree", () => {
    const games = mkGames(20, 0.7, 0.7, () => true);
    const h = headToHead(games, "A", "B");
    expect(h.games).toBe(0);
    expect(h.winner).toBe("tie");
  });

  it("compareSeason reports brier winner and reversal flag", () => {
    const games = mkGames(100, 0.6, 0.4, (i) => i % 10 < 7);
    const c = compareSeason(games, "A", "B");
    expect(c.brierA).toBeLessThan(c.brierB);
    expect(c.brierWinner).toBe("A");
    expect(typeof c.rankingReversed).toBe("boolean");
    expect(typeof c.stableUnderSplit).toBe("boolean");
  });

  it("handles empty input", () => {
    const h = headToHead([], "A", "B");
    expect(h.games).toBe(0);
    expect(h.winner).toBe("tie");
    const c = compareSeason([], "A", "B");
    expect(Number.isNaN(c.brierA)).toBe(true);
    expect(c.rankingReversed).toBe(false);
  });

  it("handles malformed probabilities without crashing", () => {
    const games: ModelGameProb[] = [
      { gameId: "x", probs: { A: NaN, B: 2 }, homeWon: true },
    ];
    const h = headToHead(games, "A", "B");
    expect(Number.isFinite(h.pnlA)).toBe(true);
    expect(kellyFraction(NaN, NaN)).toBeGreaterThanOrEqual(0);
  });
});
