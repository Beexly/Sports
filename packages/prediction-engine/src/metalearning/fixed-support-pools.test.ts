/**
 * Fixed support pools for meta-training — tests (arXiv 2011.14048v2).
 *
 * ACCEPTANCE GATE: canonical pools pick the canonical weeks (with
 * nearest-week fallback); the designed pool maximizes archetype coverage;
 * episodes keep the frozen support while queries stay diverse; degenerate
 * inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  archetypeCoverage,
  canonicalPool,
  designedPool,
  sampleEpisode,
  type Game,
} from "./fixed-support-pools";

function makeGames(): Game[] {
  // Clustered archetypes: naive early-week pools miss most archetypes.
  const archFor = (w: number): string =>
    w <= 6 ? "balanced" : w <= 10 ? "elite-offense" : w <= 14 ? "elite-defense" : "weak";
  const games: Game[] = [];
  for (let w = 1; w <= 18; w++) {
    games.push({ id: `g${w}`, team: "KC", season: 2024, week: w, archetype: archFor(w) });
  }
  return games;
}

describe("canonicalPool", () => {
  it("picks the canonical weeks and falls back to nearest weeks", () => {
    const games = makeGames();
    const pool = canonicalPool(games, "KC", 2024);
    expect(pool.map((g) => g.week)).toEqual([2, 5, 9, 13, 16]);
    // Remove week 9: falls back to the nearest available week (8 or 10).
    const missing = games.filter((g) => g.week !== 9);
    const pool2 = canonicalPool(missing, "KC", 2024);
    expect(pool2).toHaveLength(5);
    expect(pool2.map((g) => g.week)).toContain(8);
    expect(() => canonicalPool(games, "NE", 2024)).toThrow();
  });
});

describe("designedPool + archetypeCoverage", () => {
  it("maximizes archetype coverage", () => {
    const games = makeGames();
    const archetypes = ["elite-offense", "elite-defense", "balanced", "weak"];
    const pool = designedPool(games, "KC", 2024, 4, archetypes);
    expect(pool).toHaveLength(4);
    expect(archetypeCoverage(pool, archetypes)).toBe(1);
    // A naive first-4-weeks pool is all "balanced": designed coverage wins.
    const naive = games.slice(0, 4);
    expect(archetypeCoverage(naive, archetypes)).toBeLessThan(
      archetypeCoverage(pool, archetypes),
    );
    expect(() => designedPool(games, "KC", 2024, 0, archetypes)).toThrow();
    expect(() => archetypeCoverage(pool, [])).toThrow();
  });
});

describe("sampleEpisode", () => {
  it("freezes the support and diversifies the query", () => {
    const games = makeGames();
    const pool = canonicalPool(games, "KC", 2024);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const ep = sampleEpisode(pool, games, 5, (() => {
        let s = i + 1;
        return () => {
          s = (s * 16807) % 2147483647;
          return s / 2147483647;
        };
      })());
      // Support is identical every episode.
      expect(ep.support.map((g) => g.id)).toEqual(pool.map((g) => g.id));
      expect(ep.query).toHaveLength(5);
      // Query never overlaps the support.
      expect(ep.query.some((g) => pool.some((p) => p.id === g.id))).toBe(false);
      for (const g of ep.query) seen.add(g.id);
    }
    // Queries vary across episodes (diversity preserved).
    expect(seen.size).toBeGreaterThan(5);
    expect(() => sampleEpisode(pool, games, 100)).toThrow();
  });
});
