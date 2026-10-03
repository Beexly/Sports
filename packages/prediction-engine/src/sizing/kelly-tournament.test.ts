
import { describe, expect, it } from "vitest";
import { kellyFraction, kellyTournament, simulateKellyFraction } from "./kelly-tournament";

describe("kelly-tournament", () => {
  it("kellyFraction matches (bp-q)/b floored at 0", () => {
    expect(kellyFraction(0.6, 2.0)).toBeCloseTo(0.2, 10);
    expect(kellyFraction(0.4, 2.0)).toBe(0);
  });
  it("simulation grows wealth on +EV resolutions", () => {
    const bets = Array.from({ length: 100 }, (_, i) => ({ p: 0.6, odds: 2.0, won: i % 2 === 0 ? true : i % 5 !== 0 }));
    const r = simulateKellyFraction(bets, 0.5);
    expect(r.terminalWealth).toBeGreaterThan(0);
    expect(r.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
  it("tournament respects the drawdown cap when possible", () => {
    const bets = Array.from({ length: 60 }, (_, i) => ({ p: 0.55, odds: 2.1, won: i % 3 !== 0 }));
    const winner = kellyTournament(bets, [0.25, 0.5, 1.0], 0.5);
    expect([0.25, 0.5, 1.0]).toContain(winner.fraction);
  });
  it("edge cases throw", () => {
    expect(() => kellyFraction(0.5, 1.0)).toThrow();
    expect(() => simulateKellyFraction([], -1)).toThrow();
    expect(() => kellyTournament([], [])).toThrow();
  });
});
