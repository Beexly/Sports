import { describe, it, expect } from "vitest";
import {
  cfovFeatures,
  fitLogistic,
  predictLogistic,
  timeOrderedEval,
  PlayerGame,
} from "./1804-04226v1-cfov-decomposition.js";

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
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Synthetic season: skill + opposition + venue + form momentum all real. */
function simSeason(nPlayers: number, nGames: number, seed: number): PlayerGame[] {
  const rand = mulberry32(seed);
  const skills = Array.from({ length: nPlayers }, () => randn(rand) * 0.5);
  const oppStr = Array.from({ length: 8 }, () => randn(rand) * 0.5);
  const games: PlayerGame[] = [];
  const prev: boolean[] = new Array<boolean>(nPlayers).fill(false);
  for (let p = 0; p < nPlayers; p++) {
    for (let g = 0; g < nGames; g++) {
      const o = Math.floor(rand() * 8);
      const venue = rand() < 0.5 ? "home" : "away";
      const logit =
        skills[p]! -
        oppStr[o]! * 0.9 +
        (venue === "home" ? 0.3 : -0.3) +
        (prev[p] ? 0.35 : -0.35);
      const pr = 1 / (1 + Math.exp(-logit));
      const success = rand() < pr;
      prev[p] = success;
      games.push({ playerId: `p${p}`, opp: `o${o}`, venue, success });
    }
  }
  // interleave so time order mixes players
  const mixed: PlayerGame[] = [];
  for (let g = 0; g < nGames; g++)
    for (let p = 0; p < nPlayers; p++) mixed.push(games[p * nGames + g]!);
  return mixed;
}

describe("cfov decomposition", () => {
  it("features are time-ordered and in (0,1)", () => {
    const games = simSeason(4, 10, 1);
    const f = cfovFeatures(games, games[20]!.playerId, 20);
    for (const v of [f.consistency, f.form, f.opposition, f.venue]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("learned weights are monotone (positive) on real signals", () => {
    const games = simSeason(16, 30, 2);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < games.length; i++) {
      const f = cfovFeatures(games, games[i]!.playerId, i);
      X.push([f.consistency, f.form, f.opposition, f.venue]);
      y.push(games[i]!.success ? 1 : 0);
    }
    const w = fitLogistic(X, y);
    const positive = w.slice(1).filter((x) => x > 0).length;
    expect(positive).toBeGreaterThanOrEqual(3);
    expect(w.slice(1).every((x) => x > -0.1)).toBe(true);
    // sanity: predictions track labels
    const probs = X.map((x) => predictLogistic(w, x));
    const avg = probs.reduce((a, b) => a + b, 0) / probs.length;
    const base = y.reduce((a, b) => a + b, 0) / y.length;
    expect(Math.abs(avg - base)).toBeLessThan(0.05);
  });
  it("time-ordered C/F/O/V beats the raw rolling-average baseline", () => {
    const games = simSeason(16, 30, 3);
    const r = timeOrderedEval(games, 12);
    expect(r.baselineLogLoss - r.cfovLogLoss).toBeGreaterThan(0.003);
  });
});
