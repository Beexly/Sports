import { describe, expect, it } from "vitest";
import {
  cycleEnrichment,
  standingCheckAdopt,
  type RatedGame,
} from "./cycle-enrichment-2508.js";

function game(home: string, away: string, homeWon: boolean, pHome = 0.6): RatedGame {
  return { home, away, homeWon, pHome };
}

describe("cycle enrichment", () => {
  it("detects a rock-paper-scissors cycle the ratings did not expect", () => {
    // A beats B, B beats C, C beats A — but ratings say A >> B >> C transitively
    const games = [
      game("A", "B", true, 0.9),
      game("B", "C", true, 0.9),
      game("C", "A", true, 0.1), // C beats A: the cycle
    ];
    const r = cycleEnrichment(games);
    expect(r.observedCycles).toBe(1);
    expect(r.expectedCycles).toBeLessThan(0.2);
    expect(r.z).toBeGreaterThan(2);
    expect(r.enriched).toBe(true);
  });

  it("no enrichment in a fully transitive season", () => {
    const games = [
      game("A", "B", true, 0.8),
      game("A", "C", true, 0.85),
      game("B", "C", true, 0.75),
    ];
    const r = cycleEnrichment(games);
    expect(r.observedCycles).toBe(0);
    expect(r.enriched).toBe(false);
  });

  it("standing check needs |z|>2 in >=3 of last 6", () => {
    expect(standingCheckAdopt([2.5, -2.1, 0.5, 3.0, 0.1, 0.2])).toBe(true);
    expect(standingCheckAdopt([2.5, -2.1, 0.5, 0.3, 0.1, 0.2])).toBe(false);
    expect(standingCheckAdopt([2.5, 2.5, 2.5])).toBe(true);
  });

  it("handles empty input", () => {
    const r = cycleEnrichment([]);
    expect(r.triples).toBe(0);
    expect(r.z).toBe(0);
    expect(r.enriched).toBe(false);
    expect(standingCheckAdopt([])).toBe(false);
  });

  it("clamps malformed probabilities instead of crashing", () => {
    const games = [
      { home: "A", away: "B", homeWon: true, pHome: 5 },
      { home: "B", away: "C", homeWon: false, pHome: -2 },
    ];
    const r = cycleEnrichment(games);
    expect(Number.isFinite(r.expectedCycles)).toBe(true);
    expect(Number.isFinite(r.z)).toBe(true);
  });
});
