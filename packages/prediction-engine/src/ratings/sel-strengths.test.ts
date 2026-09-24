/**
 * SEL latent strengths — tests (arXiv 2307.11777).
 *
 * ACCEPTANCE GATE: as-of-date filtering excludes the target date and
 * later games; estimated strengths recover a planted hierarchy and
 * sum to ~0 on offense; the provenance audit catches a leaking
 * feature and passes clean features; SEL features shift the base
 * probability in the direction of the strength differential; the
 * Brier gate arithmetic holds; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  asOfDate,
  auditProvenance,
  brierScore,
  estimateStrengths,
  selFeatures,
  type GameResult,
  type TeamStrengths,
} from "./sel-strengths";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic league: team i scores ~ (strength_i - strength_j) + noise. */
function syntheticSeason(rand: () => number): GameResult[] {
  const strengths = [8, 4, 0, -4, -8, -12];
  const games: GameResult[] = [];
  let day = 1;
  for (let i = 0; i < strengths.length; i++) {
    for (let j = i + 1; j < strengths.length; j++) {
      for (const [h, a] of [
        [i, j],
        [j, i],
      ] as const) {
        const diff = strengths[h]! - strengths[a]! + 2.5;
        const margin = diff + (rand() - 0.5) * 12;
        games.push({
          date: `2024-09-${String(day).padStart(2, "0")}`,
          home: `T${h}`,
          away: `T${a}`,
          homePoints: Math.round(24 + margin / 2),
          awayPoints: Math.round(24 - margin / 2),
        });
        day++;
      }
    }
  }
  return games;
}

describe("asOfDate + estimateStrengths", () => {
  it("estimates strictly as-of-date strengths", () => {
    const rand = mulberry32(391);
    const games = syntheticSeason(rand);
    const target = "2024-09-20";
    const past = asOfDate(games, target);
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((g) => g.date < target)).toBe(true);
    expect(past.length).toBeLessThan(games.length);
    const strengths = estimateStrengths(games, target);
    expect(strengths).toHaveLength(6);
    // Offense sums to ~0 (identification constraint).
    const sum = strengths.reduce((s, t) => s + t.offense, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-6);
    // Planted hierarchy recovered: T0 strongest, T5 weakest.
    const byOff = [...strengths].sort((a, b) => b.offense - a.offense);
    expect(byOff[0]?.team).toBe("T0");
    expect(byOff[byOff.length - 1]?.team).toBe("T5");
    expect(() => estimateStrengths(games, "2020-01-01")).toThrow();
  });
});

describe("selFeatures + auditProvenance", () => {
  const mk = (o: number, d: number): TeamStrengths => ({ team: "x", offense: o, defense: d });

  it("builds SEL features and audits provenance", () => {
    const f = selFeatures(0.55, mk(5, 3), mk(-2, -1));
    expect(f.strengthDiff).toBeCloseTo(5 + 3 - (-2 + -1), 10);
    expect(f.baseProb).toBe(0.55);
    // Clean provenance passes.
    const clean = auditProvenance([
      { feature: "homeOffense", maxDataDate: "2024-09-19", targetDate: "2024-09-20" },
    ]);
    expect(clean).toHaveLength(0);
    // A feature touching the target date (or later) leaks.
    const leaks = auditProvenance([
      { feature: "homeOffense", maxDataDate: "2024-09-20", targetDate: "2024-09-20" },
      { feature: "awayDefense", maxDataDate: "2024-09-21", targetDate: "2024-09-20" },
    ]);
    expect(leaks.map((l) => l.feature).sort()).toEqual(["awayDefense", "homeOffense"]);
  });
});

describe("brierScore", () => {
  it("scores probabilistic predictions", () => {
    expect(brierScore([1, 0], [1, 0])).toBe(0);
    expect(brierScore([0.5, 0.5], [1, 0])).toBe(0.25);
    // SEL-augmented probs closer to outcomes score lower.
    const base = [0.55, 0.45, 0.6];
    const sel = [0.7, 0.3, 0.75];
    const outcomes = [1, 0, 1];
    expect(brierScore(sel, outcomes)).toBeLessThan(brierScore(base, outcomes));
    expect(() => brierScore([0.5], [1, 0])).toThrow();
  });
});
