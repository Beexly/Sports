import { describe, expect, it } from "vitest";
import {
  compareFitters,
  newmanAsyncAlpha0,
  zermeloSync,
  type GameResult,
} from "./zermelo-async-2607.js";

/** CFB-like synthetic season: 4 conferences x 6 teams, dense intra / sparse cross. */
function cfbLikeSeason(): GameResult[] {
  let s = 7;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const teams: string[] = [];
  for (let i = 0; i < 24; i++) teams.push(`T${i}`);
  const tru: Record<string, number> = {};
  teams.forEach((t, i) => {
    tru[t] = Math.exp(1.5 - 0.14 * i);
  });
  const conf = (i: number): number => Math.floor(i / 6);
  const games: GameResult[] = [];
  for (let i = 0; i < 24; i++) {
    for (let j = i + 1; j < 24; j++) {
      const a = teams[i] ?? "";
      const b = teams[j] ?? "";
      const same = conf(i) === conf(j);
      const n = same ? 3 : rnd() < 0.25 ? 1 : 0;
      const p = (tru[a] ?? 1) / ((tru[a] ?? 1) + (tru[b] ?? 1));
      for (let k = 0; k < n; k++) games.push({ teamA: a, teamB: b, aWon: rnd() < p });
    }
  }
  return games;
}

describe("zermelo async (Newman alpha=0)", () => {
  it("sync and async converge to identical MLEs on a CFB-like season", () => {
    const games = cfbLikeSeason();
    const cmp = compareFitters(games, 1e-10);
    expect(cmp.sync.converged).toBe(true);
    expect(cmp.async.converged).toBe(true);
    expect(cmp.identicalMles).toBe(true);
    expect(cmp.maxLogRatioDiff).toBeLessThan(1e-9);
  });

  it("async likelihood increases monotonically across passes", () => {
    const games = cfbLikeSeason();
    const cmp = compareFitters(games, 1e-10);
    expect(cmp.asyncMonotone).toBe(true);
  });

  it("async needs no more full passes than sync", () => {
    const games = cfbLikeSeason();
    const cmp = compareFitters(games, 1e-10);
    expect(cmp.async.passes).toBeLessThanOrEqual(cmp.sync.passes);
    expect(cmp.passRatio).toBeGreaterThanOrEqual(1);
  });

  it("recovers the known strength ordering on a simple round-robin", () => {
    const games: GameResult[] = [];
    const teams = ["A", "B", "C", "D"];
    // transitive tournament with noise: every team wins and loses, so the MLE
    // is finite (a perfect 3-0 sweep would push the MLE to the boundary)
    const results: Array<[string, string, number]> = [
      // [winner, loser, winnerWins] over 3 games
      ["A", "B", 2],
      ["A", "C", 2],
      ["A", "D", 2],
      ["B", "C", 2],
      ["B", "D", 2],
      ["C", "D", 2],
    ];
    for (const [w, l, wWins] of results) {
      for (let k = 0; k < 3; k++) games.push({ teamA: w, teamB: l, aWon: k < wWins });
    }
    const f = newmanAsyncAlpha0(games);
    expect(f.converged).toBe(true);
    const s = f.strengths;
    expect(s["A"] ?? 0).toBeGreaterThan(s["B"] ?? 0);
    expect(s["B"] ?? 0).toBeGreaterThan(s["C"] ?? 0);
    expect(s["C"] ?? 0).toBeGreaterThan(s["D"] ?? 0);
    // unit-product normalization: geometric mean is 1
    const gm = Math.exp(
      teams.reduce((acc, t) => acc + Math.log(s[t] ?? 1), 0) / teams.length,
    );
    expect(gm).toBeCloseTo(1, 9);
  });

  it("handles empty input", () => {
    const f = zermeloSync([]);
    expect(f.strengths).toEqual({});
    expect(f.passes).toBe(0);
    expect(f.converged).toBe(true);
    const cmp = compareFitters([]);
    expect(cmp.identicalMles).toBe(true);
  });

  it("handles malformed input without crashing", () => {
    const games = [
      { teamA: "A", teamB: "A", aWon: true }, // self-game: ignored
      { teamA: "", teamB: "B", aWon: true }, // empty name: ignored
      null,
      { teamA: "A", teamB: "B", aWon: true },
      { teamA: "A", teamB: "B", aWon: false },
    ] as unknown as GameResult[];
    const f = newmanAsyncAlpha0(games);
    expect(Object.keys(f.strengths).sort()).toEqual(["A", "B"]);
    expect(Number.isFinite(f.logLikelihood)).toBe(true);
  });
});
