// Tests for decision/1710-04818-drawdown-risk-frontier.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  currentDrawdownRisk,
  expectedLogTwr,
  solveDrawdownConstrainedAllocation,
  perCategoryKellyCaps,
  drawdownFrontierGatePasses,
  BET_CATEGORIES,
} from "./1710-04818-drawdown-risk-frontier.js";

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

/** Synthetic trade-return matrix: 4 categories x 300 trades, spreads strongest.
 * Returns are scaled to 20% stakes (0.2275/-0.25): at simplex allocations no
 * single trade can ruin (1 + phi·trade > 0 always), keeping expectedLogTwr
 * finite so the constrained solver has a well-defined objective. */
function synthT(seed: number): number[][] {
  const rand = mulberry32(seed);
  const edge = [0.06, 0.03, 0.04, 0.02];
  const T: number[][] = [];
  for (let t = 0; t < 300; t++) {
    T.push(
      edge.map((e) => {
        const r = rand();
        return r < 0.5 + e ? 0.2275 : -0.25; // ~ -110 odds at 20% stakes, edge shifts win prob
      }),
    );
  }
  return T;
}

describe("currentDrawdownRisk (1710.04818)", () => {
  it("is positively homogeneous in phi", () => {
    const T = synthT(5);
    const phi = [0.2, 0.2, 0.2, 0.2];
    const r1 = currentDrawdownRisk(phi, T, 600, 99);
    const r2 = currentDrawdownRisk(phi.map((p) => p * 2), T, 600, 99);
    // Exact homogeneity (linearized P&L curve): same MC draws, scaled curve.
    expect(r2).toBeCloseTo(2 * r1, 8);
    const r3 = currentDrawdownRisk(phi.map((p) => p * 0.5), T, 600, 99);
    expect(r3).toBeCloseTo(0.5 * r1, 8);
  });
  it("is zero for the zero allocation and non-negative otherwise", () => {
    const T = synthT(6);
    expect(currentDrawdownRisk([0, 0, 0, 0], T, 200, 1)).toBe(0);
    expect(currentDrawdownRisk([0.25, 0.25, 0.25, 0.25], T, 200, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe("solveDrawdownConstrainedAllocation", () => {
  it("returns a simplex allocation respecting the budget", () => {
    const T = synthT(7);
    // Unconstrained uniform risk is ~2.8; budget 1.0 binds and the solver
    // must reallocate toward high-edge categories to satisfy it.
    const { phi, risk, growth } = solveDrawdownConstrainedAllocation(T, 1.0, 21, 25, 200);
    const sum = phi.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(phi.every((p) => p >= 0)).toBe(true);
    expect(risk).toBeLessThanOrEqual(1.0 + 0.15); // MC noise allowance on finite iterations
    expect(growth).toBeGreaterThan(-Infinity);
  });
  it("tilts toward the higher-edge category", () => {
    // Deterministic stark-edge fixture: spreads wins every trade; each
    // other category wins 1 in 4. Growth-optimal is all-in on spreads.
    const T: number[][] = [];
    for (let t = 0; t < 120; t++) {
      const j = t % 4;
      T.push([
        0.2275,
        j === 1 ? 0.2275 : -0.25,
        j === 2 ? 0.2275 : -0.25,
        j === 3 ? 0.2275 : -0.25,
      ]);
    }
    const { phi } = solveDrawdownConstrainedAllocation(T, 1.0, 22, 25, 200);
    expect(phi[0]!).toBeGreaterThanOrEqual(phi[3]!); // spreads (always wins) >= props
    expect(phi[0]!).toBeGreaterThan(0.5);
  });
});

describe("perCategoryKellyCaps", () => {
  it("maps phi onto the four bet categories", () => {
    const caps = perCategoryKellyCaps([0.4, 0.3, 0.2, 0.1], 0.25);
    expect(Object.keys(caps).sort()).toEqual([...BET_CATEGORIES].sort());
    expect(caps.spreads).toBeCloseTo(0.1, 10);
    const total = Object.values(caps).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(0.25, 10);
  });
});

describe("expectedLogTwr", () => {
  it("returns -Infinity on ruin", () => {
    expect(expectedLogTwr([1], [[-1]])).toBe(-Infinity);
  });
});

describe("drawdownFrontierGatePasses", () => {
  it("encodes the >=25% drawdown cut and >=90% bankroll gate", () => {
    expect(drawdownFrontierGatePasses(0.15, 0.2, 0.92, 1.0)).toBe(true);
    expect(drawdownFrontierGatePasses(0.16, 0.2, 0.92, 1.0)).toBe(false);
    expect(drawdownFrontierGatePasses(0.15, 0.2, 0.89, 1.0)).toBe(false);
  });
});
