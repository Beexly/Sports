import { describe, expect, it } from "vitest";
import { btWinProb, fitBradleyTerry, mad, strengthCovariate } from "./bradley-terry";

const games = [
  { home: "A", away: "B", homeWin: 1 }, { home: "A", away: "B", homeWin: 1 },
  { home: "B", away: "A", homeWin: 0 }, { home: "B", away: "C", homeWin: 1 },
  { home: "C", away: "A", homeWin: 0 }, { home: "C", away: "B", homeWin: 0 },
];

describe("bradley-terry", () => {
  it("fitBradleyTerry ranks the dominant team first", () => {
    const fit = fitBradleyTerry(games, 1.0);
    const s = fit.strengths;
    expect(s["A"] ?? 0).toBeGreaterThan(s["B"] ?? 0);
    expect(s["B"] ?? 0).toBeGreaterThan(s["C"] ?? 0);
    const mean = (Object.values(s).reduce((a, b) => a + b, 0) / 3);
    expect(mean).toBeCloseTo(1, 8);
  });
  it("btWinProb favors the stronger home team and respects homeEdge", () => {
    const fit = fitBradleyTerry(games, 1.2);
    expect(btWinProb(fit, "A", "C")).toBeGreaterThan(0.5);
    expect(btWinProb(fit, "C", "A")).toBeLessThan(0.5);
    const neutral = fitBradleyTerry(games, 1.0);
    expect(btWinProb(fit, "A", "B")).toBeGreaterThan(btWinProb(neutral, "A", "B"));
  });
  it("strengthCovariate is MAD-normalized and sign-correct", () => {
    const fit = fitBradleyTerry(games, 1.0);
    const om = strengthCovariate(fit, [["A", "C"], ["C", "A"]]);
    expect(om[0] ?? 0).toBeGreaterThan(0);
    expect(om[1] ?? 0).toBeLessThan(0);
    expect(Math.abs((om[0] ?? 0) + (om[1] ?? 0))).toBeLessThan(1e-9);
    expect(mad([1, 1, 1, 1])).toBe(0);
    expect(mad([1, 2, 3, 4, 5])).toBe(1);
  });
  it("throws on degenerate inputs", () => {
    expect(() => fitBradleyTerry([])).toThrow();
    expect(() => fitBradleyTerry(games, -1)).toThrow();
    expect(() => btWinProb(fitBradleyTerry(games), "A", "ZZZ")).toThrow();
  });
});
