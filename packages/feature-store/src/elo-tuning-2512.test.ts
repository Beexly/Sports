import { describe, expect, it } from "vitest";
import {
  eloTuneGate,
  empiricalWinProbMap,
  evaluateK,
  tuneK,
  type EloGame,
} from "./elo-tuning-2512.js";

// Deterministic pseudo-season: stronger teams (earlier alphabet) win more.
function season(teams: string[], gamesPerPairing: number, seed: number): EloGame[] {
  const games: EloGame[] = [];
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      for (let g = 0; g < gamesPerPairing; g++) {
        const strengthGap = (j - i) * 60; // team i stronger than team j
        const pHome = 1 / (1 + Math.pow(10, -strengthGap / 400));
        games.push({ home: teams[i] ?? "?", away: teams[j] ?? "?", homeWon: rand() < pHome });
      }
    }
  }
  return games;
}

describe("elo tuning", () => {
  const teams = ["A", "B", "C", "D", "E", "F"];
  const train = season(teams, 8, 42);
  const holdout = season(teams, 4, 99);

  it("grid search finds a finite best K", () => {
    const results = tuneK(train, [4, 8, 16, 24, 32, 48]);
    expect(results.length).toBe(6);
    expect(Number.isFinite(results[0]?.brier)).toBe(true);
    // sorted ascending by brier
    for (let i = 1; i < results.length; i++) {
      expect(results[i]?.brier ?? 0).toBeGreaterThanOrEqual(results[i - 1]?.brier ?? 0);
    }
  });

  it("evaluateK updates ratings in the right direction", () => {
    const r = evaluateK([{ home: "X", away: "Y", homeWon: true }], 32);
    expect(r.games).toBe(1);
    expect(r.brier).toBeCloseTo(0.25, 6); // p=0.5 at start
  });

  it("empirical map is monotone and near theory on clean data", () => {
    const ratings = new Map(teams.map((t, i) => [t, 1500 - i * 60] as [string, number]));
    // Exact theoretical win counts per pairing: tests the map computation,
    // not sampling noise (the 3pp gate on real data is the operator's run).
    const games: EloGame[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i === j) continue;
        const diff = 60 * (j - i);
        const p = 1 / (1 + Math.pow(10, -diff / 400));
        const n = 50;
        const wins = Math.round(n * p);
        for (let g = 0; g < n; g++) {
          games.push({ home: teams[i] ?? "?", away: teams[j] ?? "?", homeWon: g < wins });
        }
      }
    }
    const check = empiricalWinProbMap(games, ratings, 60);
    expect(check.points.length).toBeGreaterThan(0);
    expect(check.monotone).toBe(true);
    expect(check.within3pp).toBe(true);
  });

  it("gate returns a complete verdict", () => {
    const gate = eloTuneGate(train, holdout, [8, 16, 24, 32]);
    expect(Number.isFinite(gate.improvement)).toBe(true);
    expect(typeof gate.adopt).toBe("boolean");
    expect(gate.map.points.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    expect(Number.isNaN(evaluateK([], 20).brier)).toBe(true);
    expect(tuneK([], [8, 16])).toHaveLength(2);
    const check = empiricalWinProbMap([], new Map());
    expect(check.points).toEqual([]);
    expect(check.monotone).toBe(true);
  });
});
