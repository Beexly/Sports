import { describe, expect, it } from "vitest";
import {
  clvEdge,
  edgeWeight,
  parametricPagerank,
  tuneRecencyDecay,
  winProbFromRatings,
} from "./parametric-pagerank";
import type { RatedGame } from "./parametric-pagerank";

// Synthetic: A beats everyone recently; B beats C long ago.
const games: RatedGame[] = [];
for (let i = 0; i < 8; i++) {
  games.push({ winner: "A", loser: "B", weeksAgo: i, situation: 1, importance: 1 });
  games.push({ winner: "A", loser: "C", weeksAgo: i, situation: 1, importance: 1 });
}
for (let i = 0; i < 4; i++) {
  games.push({ winner: "B", loser: "C", weeksAgo: 30 + i, situation: 1, importance: 1 });
}

describe("parametric-pagerank", () => {
  it("edgeWeight decays with age and scales with situation/importance", () => {
    const g: RatedGame = { winner: "A", loser: "B", weeksAgo: 0, situation: 1, importance: 1 };
    expect(edgeWeight(g, { recencyDecay: 0.1 })).toBeCloseTo(1, 12);
    expect(edgeWeight({ ...g, weeksAgo: 10 }, { recencyDecay: 0.1 })).toBeCloseTo(
      Math.exp(-1),
      12,
    );
    expect(edgeWeight({ ...g, importance: 2 }, { recencyDecay: 0.1 })).toBeCloseTo(2, 12);
  });

  it("dominant recent winner ranks first", () => {
    const r = parametricPagerank(games, { recencyDecay: 0.05 });
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(r["A"]).toBeGreaterThan(r["B"] ?? 0);
    expect(r["B"]).toBeGreaterThan(r["C"] ?? 0);
  });

  it("empty games return empty ratings", () => {
    expect(parametricPagerank([], { recencyDecay: 0.1 })).toEqual({});
  });

  it("winProbFromRatings is monotone in the rating gap", () => {
    expect(winProbFromRatings(0.05, 0.03)).toBeGreaterThan(0.5);
    expect(winProbFromRatings(0.03, 0.05)).toBeLessThan(0.5);
    expect(winProbFromRatings(0.04, 0.04)).toBeCloseTo(0.5, 12);
  });

  it("tuneRecencyDecay picks the best candidate", () => {
    const best = tuneRecencyDecay((d) => -((d - 0.1) ** 2), [0.02, 0.1, 0.35]);
    expect(best.decay).toBe(0.1);
  });

  it("clvEdge signs the edge by pick direction", () => {
    expect(clvEdge([0.6], [0.55], [true])).toBeCloseTo(0.05, 12);
    expect(clvEdge([0.6], [0.55], [false])).toBeCloseTo(-0.05, 12);
    expect(clvEdge([], [], [])).toBe(0);
    expect(() => clvEdge([0.6], [], [true])).toThrow("mismatch");
  });
});
