/**
 * Pythagorean duel — tests (arXiv 2112.14846).
 *
 * ACCEPTANCE GATE: fractional-logit fitting recovers a known exponent on
 * synthetic team-seasons; both forms are monotone in point differential
 * and symmetric at zero; the game-level EWP fit recovers positive
 * PD/HFA coefficients; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  differenceForm,
  fitAlpha,
  fitGameEwp,
  gameEwp,
  tullock,
  winRmse,
  type GameRow,
  type TeamSeason,
} from "./pythagorean-duel";

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

function synthSeasons(n: number, alpha: number, seed: number): TeamSeason[] {
  const rand = mulberry32(seed);
  const out: TeamSeason[] = [];
  for (let i = 0; i < n; i++) {
    const pf = 300 + rand() * 300;
    const pa = 300 + rand() * 300;
    const p = tullock(pf, pa, alpha);
    let wins = 0;
    for (let g = 0; g < 17; g++) if (rand() < p) wins++;
    out.push({ pf, pa, wins, games: 17 });
  }
  return out;
}

describe("tullock + differenceForm", () => {
  it("is symmetric at zero differential and monotone in PF", () => {
    expect(tullock(400, 400, 2.37)).toBeCloseTo(0.5, 12);
    expect(differenceForm(400, 400, 0.05)).toBeCloseTo(0.5, 12);
    expect(tullock(500, 400, 2.37)).toBeGreaterThan(0.5);
    expect(differenceForm(500, 400, 0.05)).toBeGreaterThan(0.5);
    expect(tullock(500, 400, 3)).toBeGreaterThan(tullock(500, 400, 2));
    expect(() => tullock(0, 400, 2)).toThrow();
  });
});

describe("fitAlpha", () => {
  it("recovers the true exponent on synthetic Tullock data", () => {
    const seasons = synthSeasons(300, 2.37, 131);
    const a = fitAlpha(seasons, "tullock");
    expect(a).toBeGreaterThan(1.8);
    expect(a).toBeLessThan(3.0);
    // Fitted form beats a wrong exponent on RMSE.
    expect(winRmse(seasons, "tullock", a)).toBeLessThan(winRmse(seasons, "tullock", 1.0));
    expect(() => fitAlpha([], "tullock")).toThrow();
  });
});

describe("fitGameEwp + gameEwp", () => {
  it("recovers positive PD and HFA coefficients", () => {
    const rand = mulberry32(133);
    const games: GameRow[] = [];
    for (let i = 0; i < 2000; i++) {
      const pd = Math.round((rand() - 0.5) * 40);
      const hfa = 1;
      const restEdge = Math.round((rand() - 0.5) * 6);
      const p = 1 / (1 + Math.exp(-(0.12 * pd + 0.35 * hfa + 0.05 * restEdge)));
      games.push({ pd, hfa, restEdge, won: rand() < p ? 1 : 0 });
    }
    const c = fitGameEwp(games);
    expect(c.alpha).toBeGreaterThan(0.08);
    expect(c.alpha).toBeLessThan(0.17);
    expect(c.beta).toBeGreaterThan(0.15);
    expect(c.gamma).toBeGreaterThan(0);
    // EWP is a valid probability, increasing in PD.
    expect(gameEwp(10, 1, 0, c)).toBeGreaterThan(gameEwp(-10, 1, 0, c));
    expect(gameEwp(0, 1, 0, c)).toBeGreaterThan(0.5);
    expect(() => fitGameEwp([])).toThrow();
  });
});
