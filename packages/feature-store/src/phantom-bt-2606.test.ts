import { describe, expect, it } from "vitest";
import {
  btLogLoss,
  compareWindows,
  fitBT,
  tunePhantomRho,
  type BtGame,
} from "./phantom-bt-2606.js";

function roundRobin(teams: string[], upsetEvery: number): BtGame[] {
  const games: BtGame[] = [];
  let i = 0;
  for (const h of teams)
    for (const a of teams) {
      if (h === a) continue;
      // stronger = earlier alphabet; upset every k-th game
      const homeStronger = h < a;
      games.push({ home: h, away: a, homeWon: i++ % upsetEvery === 0 ? !homeStronger : homeStronger });
    }
  return games;
}

describe("phantom bt", () => {
  const teams = ["A", "B", "C", "D"];
  // extra A-beats-B game breaks the head-to-head symmetry of the round robin
  const season: BtGame[] = [
    ...roundRobin(teams, 1000),
    { home: "A", away: "B", homeWon: true },
  ];

  it("recovers the correct team ordering", () => {
    const theta = fitBT(season, teams, {});
    expect(theta.get("A")).toBeGreaterThan(theta.get("B") ?? 0);
    expect(theta.get("B")).toBeGreaterThan(theta.get("C") ?? 0);
    expect(theta.get("C")).toBeGreaterThan(theta.get("D") ?? 0);
  });

  it("phantom rho shrinks extreme ratings toward zero", () => {
    const plain = fitBT(season, teams, {});
    const reg = fitBT(season, teams, { phantomRho: 5 });
    const maxPlain = Math.max(...teams.map((t) => Math.abs(plain.get(t) ?? 0)));
    const maxReg = Math.max(...teams.map((t) => Math.abs(reg.get(t) ?? 0)));
    expect(maxReg).toBeLessThan(maxPlain);
  });

  it("rho=0 reproduces ordinary BT", () => {
    const a = fitBT(season, teams, {});
    const b = fitBT(season, teams, { phantomRho: 0 });
    for (const t of teams) expect(a.get(t)).toBeCloseTo(b.get(t) ?? 0, 9);
  });

  it("tunePhantomRho returns a sorted finite ranking", () => {
    const weeks = [roundRobin(teams, 5), roundRobin(teams, 6), roundRobin(teams, 7)];
    const tuned = tunePhantomRho(weeks, teams, [0, 1, 3]);
    expect(tuned.length).toBe(3);
    expect(tuned.every((r) => Number.isFinite(r.cvLogLoss))).toBe(true);
    for (let i = 1; i < tuned.length; i++) {
      expect(tuned[i]?.cvLogLoss ?? 0).toBeGreaterThanOrEqual(tuned[i - 1]?.cvLogLoss ?? 0);
    }
  });

  it("compareWindows returns complete per-window verdicts", () => {
    const train = roundRobin(teams, 5);
    const test = roundRobin(teams, 6);
    const cmp = compareWindows([{ name: "w1", train, test }], teams, [0, 2]);
    expect(cmp.length).toBe(1);
    expect(Number.isFinite(cmp[0]?.phantom)).toBe(true);
    expect(typeof cmp[0]?.phantomBeatsOrdinary).toBe("boolean");
  });

  it("handles empty input", () => {
    const theta = fitBT([], teams, {});
    expect(theta.get("A")).toBe(0);
    expect(Number.isNaN(btLogLoss([], theta))).toBe(true);
    expect(tunePhantomRho([], teams, [0, 1])).toHaveLength(2);
  });
});
