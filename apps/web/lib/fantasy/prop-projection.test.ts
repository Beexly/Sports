import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  projectProp,
  MIN_GAMES_FOR_SIGMA,
  SIGMA_FLOOR_FRACTION,
} from "./prop-projection";
import { readProp } from "./props";

const DEEP = process.env.DEEP_FUZZ === "1";
const RUNS = 5_000 * (DEEP ? 25 : 1);

const W1 = { targetSeason: 2026, targetWeek: 1, basisSeason: 2025 } as const;
const base = (perGame: number[]) => ({ playerName: "P", market: "Rec Yds", perGame, ...W1 });

describe("projectProp turns real per-game history into a projection", () => {
  it("projects from a full prior season on Week 1, with the basis named", () => {
    const perGame = [62, 78, 41, 95, 55, 70, 33, 88, 61, 47, 72, 59, 84, 38, 66, 51, 79];
    const r = projectProp(base(perGame));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.games).toBe(17);
    expect(r.mean).toBeCloseTo(63.5, 0);
    expect(r.sigma).toBeGreaterThan(0);
    expect(r.basisLabel).toContain("2025 season basis");
    expect(r.priced).toBe(false); // never claims an edge
  });

  it("refuses rather than inventing a sigma on a thin sample", () => {
    // 5 games clears the basis gate's floor of 4 but not the sigma floor of 6,
    // so this exercises the sigma guard specifically rather than the basis one.
    const r = projectProp(base([60, 70, 65, 55, 72]));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("too few");
  });

  it("refuses a player whose production is effectively zero", () => {
    // Found by fuzz: a positive-by-a-denormal mean floored sigma to 0.0, which
    // props.ts would have read as certainty.
    expect(projectProp(base([0, 0, 0, 0, 0, 0, 0])).ok).toBe(false);
    expect(projectProp(base([0, 0, 0, 1.5e-323, 0, 0, 0])).ok).toBe(false);
  });

  it("floors sigma so a tight cluster cannot manufacture certainty", () => {
    // Five near-identical games would give a sample sigma near zero, and
    // props.ts would then report P(over) as effectively 0 or 1.
    const r = projectProp(base([60, 60.1, 59.9, 60, 60.05, 59.95, 60.02]));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.sigmaSource).toBe("floor");
    expect(r.sigma).toBeCloseTo(60 * SIGMA_FLOOR_FRACTION, 0);
  });

  it("reports which term bound the sigma", () => {
    const spread = projectProp(base([10, 90, 20, 80, 30, 70, 40, 60]));
    expect(spread.ok && spread.sigmaSource).toBe("sample");
  });

  it("refuses a basis the season gate refuses", () => {
    const perGame = Array.from({ length: 17 }, (_, i) => 50 + i);
    // Two seasons behind.
    const old = projectProp({ ...base(perGame), basisSeason: 2024 });
    expect(old.ok).toBe(false);
    // Prior season, but deep into the new one.
    const late = projectProp({ ...base(perGame), targetWeek: 12 });
    expect(late.ok).toBe(false);
  });

  it("refuses non-finite or negative history instead of filtering it away quietly", () => {
    expect(projectProp(base([50, Number.NaN, 60, 70, 80])).ok).toBe(false);
    expect(projectProp(base([50, -10, 60, 70, 80])).ok).toBe(false);
  });
});

describe("the projection feeds props.ts cleanly (fuzz)", () => {
  const arbHistory = fc.array(fc.double({ min: 0, max: 200, noNaN: true }), {
    minLength: MIN_GAMES_FOR_SIGMA, maxLength: 17,
  });

  it("every accepted projection produces a usable read at any line", () => {
    // The integration that matters: whatever this module emits, the prop math
    // must produce a coherent probability rather than NaN or a certainty.
    fc.assert(
      fc.property(arbHistory, fc.double({ min: 1, max: 250, noNaN: true }), (perGame, line) => {
        const p = projectProp(base(perGame));
        if (!p.ok) return;
        const read = readProp({
          id: "x", player: p.playerName, team: "KC", market: "Rec Yds",
          line, mean: p.mean, sigma: p.sigma, alts: [],
        });
        expect(Number.isFinite(read.pOver)).toBe(true);
        expect(read.pOver).toBeGreaterThanOrEqual(0);
        expect(read.pOver).toBeLessThanOrEqual(1);
        expect(read.pSide).toBeGreaterThanOrEqual(0.5);
        expect(read.edge).toBe(0); // unpriced: no player-prop market is ingested
      }),
      { numRuns: RUNS },
    );
  });

  it("never emits a sigma that lets P(over) collapse to a certainty", () => {
    // The floor's whole job. At the mean the probability must sit near 0.5,
    // never pinned to 0 or 1 by a degenerate sigma.
    fc.assert(
      fc.property(arbHistory, (perGame) => {
        const p = projectProp(base(perGame));
        if (!p.ok) return;
        const atMean = readProp({
          id: "x", player: "P", team: "KC", market: "Rec Yds",
          line: p.mean, mean: p.mean, sigma: p.sigma, alts: [],
        });
        expect(atMean.pOver).toBeGreaterThan(0.4);
        expect(atMean.pOver).toBeLessThan(0.6);
      }),
      { numRuns: RUNS },
    );
  });

  it("mean always sits inside the range of the games it came from", () => {
    fc.assert(
      fc.property(arbHistory, (perGame) => {
        const p = projectProp(base(perGame));
        if (!p.ok) return;
        expect(p.mean).toBeGreaterThanOrEqual(Math.min(...perGame) - 0.05);
        expect(p.mean).toBeLessThanOrEqual(Math.max(...perGame) + 0.05);
      }),
      { numRuns: RUNS },
    );
  });

  it("sigma is never below the floor and never negative", () => {
    fc.assert(
      fc.property(arbHistory, (perGame) => {
        const p = projectProp(base(perGame));
        if (!p.ok) return;
        expect(p.sigma).toBeGreaterThan(0);
        expect(p.sigma).toBeGreaterThanOrEqual(p.mean * SIGMA_FLOOR_FRACTION - 0.06);
      }),
      { numRuns: RUNS },
    );
  });

  it("is order-invariant: the same games in any order give the same projection", () => {
    fc.assert(
      fc.property(arbHistory, (perGame) => {
        const a = projectProp(base(perGame));
        const b = projectProp(base([...perGame].reverse()));
        expect(b.ok).toBe(a.ok);
        if (a.ok && b.ok) {
          expect(b.mean).toBeCloseTo(a.mean, 6);
          expect(b.sigma).toBeCloseTo(a.sigma, 6);
        }
      }),
      { numRuns: RUNS },
    );
  });
});
