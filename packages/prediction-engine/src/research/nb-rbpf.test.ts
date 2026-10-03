import { describe, expect, it } from "vitest";
import { generateSyntheticGames, DEFAULT_DESIGN } from "./synthetic-nb.js";
import { NbRbpf, logNbPmf } from "./nb-rbpf.js";
import { runCapital, stepCapital } from "./capital.js";

describe("synthetic-nb", () => {
  it("is deterministic for a seed", () => {
    const a = generateSyntheticGames(7);
    const b = generateSyntheticGames(7);
    expect(a).toEqual(b);
    expect(a.length).toBe(DEFAULT_DESIGN.nGames);
  });

  it("null design has no planted flag in rows (y still varies)", () => {
    const games = generateSyntheticGames(3, { ...DEFAULT_DESIGN, planted: false, nGames: 20 });
    expect(games.some((g) => g.y !== games[0]!.y)).toBe(true);
  });
});

describe("logNbPmf", () => {
  it("returns a finite number on a typical baseball total", () => {
    const lp = logNbPmf(9, 8.5, 12);
    expect(Number.isFinite(lp)).toBe(true);
    expect(lp).toBeLessThan(0);
  });

  it("degrades instead of NaN on garbage", () => {
    expect(Number.isFinite(logNbPmf(-1, 8.5, 12))).toBe(true);
    expect(Number.isFinite(logNbPmf(4, 0, 12))).toBe(true);
  });
});

describe("NbRbpf house conventions", () => {
  const opts = {
    seed: 11,
    nTeams: 8,
    nPitchers: 8,
    nParks: 4,
    nUmpires: 4,
    nParticles: 16,
  };

  it("requires a seed", () => {
    expect(() => new NbRbpf({ ...opts, seed: Number.NaN })).toThrow(RangeError);
  });

  it("same seed + same games => identical predictOver", () => {
    const games = generateSyntheticGames(11, { ...DEFAULT_DESIGN, nGames: 12 });
    const a = new NbRbpf(opts);
    const b = new NbRbpf(opts);
    for (const g of games) {
      expect(a.predictOver(g)).toBe(b.predictOver(g));
      a.update(g);
      b.update(g);
    }
  });

  it("snapshot/restore continues the trajectory", () => {
    const games = generateSyntheticGames(19, { ...DEFAULT_DESIGN, nGames: 10 });
    const live = new NbRbpf(opts);
    for (let i = 0; i < 5; i++) live.update(games[i]!);
    const restored = NbRbpf.restore(live.snapshot());
    for (let i = 5; i < 10; i++) {
      expect(restored.predictOver(games[i]!)).toBe(live.predictOver(games[i]!));
      live.update(games[i]!);
      restored.update(games[i]!);
    }
  });

  it("diagnostics are shadow / not priced, weights finite", () => {
    const games = generateSyntheticGames(5, { ...DEFAULT_DESIGN, nGames: 8 });
    const f = new NbRbpf(opts);
    for (const g of games) f.update(g);
    const d = f.diagnostics();
    expect(d.priced).toBe(false);
    expect(d.status).toBe("shadow");
    expect(d.weightsFinite).toBe(true);
    expect(d.weightSum).toBeCloseTo(1, 10);
    expect(Number.isFinite(d.ess)).toBe(true);
  });
});

describe("fractional e-process", () => {
  it("factor is 1 when e=1", () => {
    expect(stepCapital(4, 1, 0.3)).toBe(4);
  });

  it("open-loop capital stays 1 on any seed", () => {
    const path = runCapital({ seed: 99, planted: false, openLoop: true, design: { nGames: 30 } });
    expect(path.terminal).toBeCloseTo(1, 12);
    expect(path.maxCapital).toBeCloseTo(1, 12);
    expect(path.exceeded20).toBe(false);
  });
});
