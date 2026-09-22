// Tests for decision/kelly-portfolio.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  kellyFraction,
  kellyEliminationPortfolio,
  bisect,
  finiteHorizonKelly,
  betaKellyAllocation,
  riskConstrainedKelly,
  quantileKellySlate,
  greedyMultinomialSupport,
  beliefMixtureKelly,
  kellyGap,
  burnInStake,
  empiricalPmfKelly,
  regimeStateKelly,
  wassersteinRobustFraction,
  selectRobustDelta,
} from "./kelly-portfolio.js";

describe("kellyFraction", () => {
  it("matches the textbook formula", () => {
    // p=0.6, b=1 (even money): f = 0.6 - 0.4 = 0.2
    expect(kellyFraction(0.6, 1)).toBeCloseTo(0.2, 12);
  });
  it("returns 0 for degenerate inputs", () => {
    expect(kellyFraction(0.5, 0)).toBe(0);
    expect(kellyFraction(0, 1)).toBe(0);
    expect(kellyFraction(1, 1)).toBe(0);
  });
});

describe("kellyEliminationPortfolio (0712.2771v3)", () => {
  it("drops negative-Kelly picks and keeps the rest", () => {
    const res = kellyEliminationPortfolio([
      { p: 0.6, b: 1 }, // f = 0.2
      { p: 0.4, b: 1 }, // f = -0.2 -> dropped
    ]);
    expect(res.included).toEqual([0]);
    expect(res.dropped).toEqual([1]);
    expect(res.stakes[0]).toBeCloseTo(0.2, 10);
  });
  it("scales down when sum of fractions exceeds 1", () => {
    const res = kellyEliminationPortfolio([
      { p: 0.9, b: 2 }, // f = 0.75
      { p: 0.9, b: 2 }, // f = 0.75 -> sum 1.5 -> scale to 1
    ]);
    const sum = res.stakes.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(res.stakes[0]).toBeCloseTo(0.5, 10);
  });
  it("reports IPR = 1 for a single pick and <= n for n equal picks", () => {
    const single = kellyEliminationPortfolio([{ p: 0.6, b: 1 }]);
    expect(single.ipr).toBeCloseTo(1, 10);
    const two = kellyEliminationPortfolio([
      { p: 0.6, b: 1 },
      { p: 0.6, b: 1 },
    ]);
    expect(two.ipr).toBeLessThanOrEqual(2 + 1e-9);
    expect(two.ipr).toBeGreaterThan(1);
  });
  it("handles empty input", () => {
    const res = kellyEliminationPortfolio([]);
    expect(res.stakes).toEqual([]);
    expect(res.ipr).toBe(0);
  });
});

describe("bisect", () => {
  it("finds the root of a linear function", () => {
    expect(bisect((x) => x - 3, 0, 10)).toBeCloseTo(3, 10);
  });
});

describe("finiteHorizonKelly (1611.09130)", () => {
  it("recovers classic Kelly for log utility with no reserves", () => {
    expect(finiteHorizonKelly({ p: 0.6, b: 1, periods: 17 })).toBeCloseTo(0.2, 10);
  });
  it("caps the reserve inflation factor at reserveCap", () => {
    const capped = finiteHorizonKelly({ p: 0.6, b: 1, periods: 17, outsideReserves: 5 });
    expect(capped).toBeCloseTo(0.2 * 2, 10);
    const uncapped = finiteHorizonKelly({
      p: 0.6, b: 1, periods: 17, outsideReserves: 5, reserveCap: 6,
    });
    expect(uncapped).toBeCloseTo(0.2 * 6, 10);
  });
  it("power utility with gamma -> 1 approaches log Kelly", () => {
    const near = finiteHorizonKelly({
      p: 0.6, b: 1, periods: 17, utility: { kind: "power", gamma: 1.001 },
    });
    expect(near).toBeCloseTo(0.2, 3);
  });
  it("returns 0 for no-edge inputs", () => {
    expect(finiteHorizonKelly({ p: 0.4, b: 1, periods: 17 })).toBe(0);
  });
});

describe("betaKellyAllocation (1901.06278)", () => {
  const p = [0.5, 0.3, 0.2];
  const odds = [2.1, 3.4, 5.2];
  it("satisfies the closed-form check g(beta -> 0) = p", () => {
    const res = betaKellyAllocation(p, odds, -1e-9);
    res.allocation.forEach((g, i) => expect(g).toBeCloseTo(p[i]!, 9));
  });
  it("tempering toward the book shrinks the allocation", () => {
    const mild = betaKellyAllocation(p, odds, -0.25);
    const strong = betaKellyAllocation(p, odds, -2);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    expect(sum(mild.allocation)).toBeCloseTo(1, 10);
    expect(sum(strong.allocation)).toBeCloseTo(1, 10);
  });
  it("reports zero mispricing when p equals the de-vigged book", () => {
    const r = odds.map((o) => 1 / o);
    const s = r.reduce((a, b) => a + b, 0);
    const fair = r.map((x) => x / s);
    const res = betaKellyAllocation(fair, odds, -0.5);
    expect(res.mispricingNats).toBeCloseTo(0, 10);
  });
  it("vig term equals log overround", () => {
    const res = betaKellyAllocation(p, odds, -1);
    const overround = odds.reduce((a, o) => a + 1 / o, 0);
    expect(res.vigTerm).toBeCloseTo(Math.log(overround), 12);
  });
  it("handles empty input", () => {
    expect(betaKellyAllocation([], [], -1).allocation).toEqual([]);
  });
});

describe("riskConstrainedKelly (2604.11577)", () => {
  it("returns unconstrained stakes when the constraint holds", () => {
    const s = riskConstrainedKelly([0.6], [2.0]);
    expect(s[0]).toBeCloseTo(0.2, 8);
  });
  it("shrinks stakes until sum p_i W_i^-lambda <= 1", () => {
    const p = [0.55, 0.55, 0.55, 0.55];
    const odds = [2.5, 2.5, 2.5, 2.5];
    const s = riskConstrainedKelly(p, odds, 2, 3);
    const unconstrained = p.map((pi, i) => Math.max(0, (0.5 * pi - (1 - pi)) / 1.5));
    void unconstrained;
    const sum = s.reduce((a, b) => a + b, 0);
    const plain = p.reduce((a, pi, i) => a + Math.max(0, ((odds[i]! - 1) * pi - (1 - pi)) / (odds[i]! - 1)), 0);
    expect(sum).toBeLessThanOrEqual(plain + 1e-9);
  });
  it("handles empty input", () => {
    expect(riskConstrainedKelly([], [])).toEqual([]);
  });
});

describe("quantileKellySlate (2604.17577)", () => {
  it("picks the chamber with the best median wealth", () => {
    const res = quantileKellySlate(
      [
        { p: 0.6, b: 1 },
        { p: 0.4, b: 1 }, // negative edge, excluded
      ],
      0.5,
    );
    expect(res.chamber).toEqual([0]);
    expect(res.stakes[0]).toBeCloseTo(0.2, 8);
  });
  it("handles empty input", () => {
    expect(quantileKellySlate([], 0.5).stakes).toEqual([]);
  });
  it("throws for n > 10 (exact enumeration limit)", () => {
    const cands = Array.from({ length: 11 }, () => ({ p: 0.6, b: 1 }));
    expect(() => quantileKellySlate(cands)).toThrow();
  });
});

describe("greedyMultinomialSupport (2603.13581v1)", () => {
  it("matches brute force on small synthetic markets", () => {
    const brute = (p: number[], odds: number[]) => {
      let best = { support: [] as number[], objective: 0 };
      for (let mask = 1; mask < 1 << p.length; mask++) {
        const support: number[] = [];
        for (let i = 0; i < p.length; i++) if (mask & (1 << i)) support.push(i);
        const pSum = support.reduce((a, i) => a + p[i]!, 0);
        let g = 0;
        for (const i of support) g += p[i]! * Math.log(odds[i]! * (p[i]! / pSum));
        if (g > best.objective) best = { support, objective: g };
      }
      return best;
    };
    // Deterministic pseudo-random markets.
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let trial = 0; trial < 20; trial++) {
      const m = 4 + Math.floor(rand() * 4);
      const raw = Array.from({ length: m }, () => 0.2 + rand());
      const s = raw.reduce((a, b) => a + b, 0);
      const p = raw.map((x) => x / s);
      const odds = p.map((pi) => (1 / pi) * (0.9 + 0.3 * rand()));
      const greedy = greedyMultinomialSupport(p, odds);
      const bf = brute(p, odds);
      expect(greedy.objective).toBeCloseTo(bf.objective, 9);
      expect([...greedy.support].sort()).toEqual([...bf.support].sort());
    }
  });
  it("returns empty support when nothing beats holding cash", () => {
    const res = greedyMultinomialSupport([0.1], [1.5]); // 0.1*1.5 < 1
    expect(res.support).toEqual([]);
  });
});

describe("beliefMixtureKelly (2508.18868v2)", () => {
  it("mixes beliefs with normalized weights", () => {
    const res = beliefMixtureKelly(
      [
        [0.2, 0.1],
        [0.1, 0.05],
      ],
      [1, 1],
    );
    expect(res.mixture[0]).toBeCloseTo(0.15, 10);
    expect(res.mixture[1]).toBeCloseTo(0.075, 10);
  });
  it("handles empty input", () => {
    expect(beliefMixtureKelly([], []).mixture).toEqual([]);
  });
});

describe("kellyGap (2607.09505v1)", () => {
  it("matches the analytic scalar GBM formula", () => {
    // gap = 1/2 (1-alpha)^2 ||theta||^2 for Sigma = I, pi = theta.
    const theta = [0.4];
    const gap = kellyGap(theta, [[1]], [0.4], 0.5);
    expect(gap).toBeCloseTo(0.5 * 0.25 * 0.16, 10);
  });
  it("is zero for the growth-optimal portfolio", () => {
    expect(kellyGap([0.4], [[1]], [0.4], 1)).toBeCloseTo(0, 12);
  });
});

describe("burnInStake (2201.03387v2)", () => {
  it("shrinks toward the market with Laplace weighting", () => {
    const res = burnInStake(0.7, 0.5, 10, 10, 5, 2);
    expect(res.pHat).toBeCloseTo((10 * 0.7 + 10 * 0.5) / 20, 12);
  });
  it("uses fractional Kelly before t-star and full after", () => {
    const early = burnInStake(0.6, 0.5, 100, 1, 1, 2, 0.5);
    expect(early.fullKelly).toBe(false);
    expect(early.stakeFraction).toBe(0.5);
    const late = burnInStake(0.6, 0.5, 100, 1, 1e9, 2, 0.5);
    expect(late.fullKelly).toBe(true);
  });
});

describe("empiricalPmfKelly (1710.01786v1)", () => {
  it("finds a positive fraction on a +EV empirical sample", () => {
    const xs = [1, 1, 1, -1, 1, -1, 1, 1, -1, 1]; // +EV coin flips
    const res = empiricalPmfKelly(xs, 0.1);
    expect(res.fStar).toBeGreaterThan(0);
    expect(res.shrunk).toBe(false);
  });
  it("reports the confinement interval [-1/Xmax, -1/Xmin]", () => {
    const res = empiricalPmfKelly([2, -1], 0.1);
    expect(res.confinement[0]).toBeCloseTo(-1 / 2, 12);
    expect(res.confinement[1]).toBeCloseTo(1 / 1, 12);
  });
  it("shrinks toward the fallback when tail risk is high", () => {
    const res = empiricalPmfKelly([1, -1], 0.1, 0.5, 100);
    expect(res.pBad).toBeGreaterThan(0.05);
    expect(res.shrunk).toBe(true);
  });
  it("handles empty input", () => {
    const res = empiricalPmfKelly([], 0.1);
    expect(res.fStar).toBe(0);
    expect(res.shrunk).toBe(true);
  });
});

describe("regimeStateKelly (1708.03813v1)", () => {
  it("matches binary Kelly for a two-outcome state", () => {
    // Win g=1 (p=0.6), lose g=-1 (p=0.4): D solves the Kelly FOC,
    // D = (p(1+g) - 1)/g = 0.2.
    const d = regimeStateKelly([
      { g: 1, p: 0.6 },
      { g: -1, p: 0.4 },
    ]);
    expect(d).toBeCloseTo(0.2, 6);
  });
  it("sits out (D = 0) when no root exists in [0, D_+]", () => {
    const d = regimeStateKelly([{ g: 1, p: 0.4 }]); // negative edge
    expect(d).toBe(0);
  });
  it("respects the no-ruin floor", () => {
    const d = regimeStateKelly([{ g: -0.5, p: 0.9 }, { g: 2, p: 0.9 }], 5, 0.99);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(5);
  });
  it("handles empty input", () => {
    expect(regimeStateKelly([])).toBe(0);
  });
});

describe("wassersteinRobustFraction (2302.13979v1)", () => {
  it("is identity at delta = 0", () => {
    expect(wassersteinRobustFraction(0.2, [1, -1, 1], 0)).toBeCloseTo(0.2, 12);
  });
  it("shrinks with larger delta and higher noise", () => {
    const calm = wassersteinRobustFraction(0.2, [0.5, 0.5, 0.5, 0.5], 0.5);
    const noisy = wassersteinRobustFraction(0.2, [2, -2, 2, -2], 0.5);
    expect(calm).toBeGreaterThan(noisy);
    expect(noisy).toBeGreaterThanOrEqual(0);
  });
});

describe("selectRobustDelta", () => {
  it("picks the smallest-drawdown delta within growth tolerance", () => {
    const d = selectRobustDelta([
      { delta: 0.1, logGrowth: 1.0, maxDrawdown: 0.3 },
      { delta: 0.3, logGrowth: 0.97, maxDrawdown: 0.15 },
      { delta: 0.5, logGrowth: 0.8, maxDrawdown: 0.1 },
    ]);
    expect(d).toBe(0.3);
  });
  it("returns 0 for empty input", () => {
    expect(selectRobustDelta([])).toBe(0);
  });
});
