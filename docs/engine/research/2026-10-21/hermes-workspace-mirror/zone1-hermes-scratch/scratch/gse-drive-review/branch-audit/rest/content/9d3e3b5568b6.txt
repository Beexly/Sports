import { describe, it, expect, afterEach } from "vitest";
import {
  factorial,
  poissonPmf,
  poissonCdf,
  jointScoreMatrix,
  moneylineProbabilities,
  overUnderProbabilities,
  poissonConsistencyScore,
  assertTeamRatesAvailable,
} from "../poisson.js";

describe("factorial", () => {
  it("computes small factorials", () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(2)).toBe(2);
    expect(factorial(5)).toBe(120);
    expect(factorial(10)).toBe(3628800);
  });

  it("throws on negative input", () => {
    expect(() => factorial(-1)).toThrow(RangeError);
  });

  it("throws on non-integer input", () => {
    expect(() => factorial(2.5)).toThrow(RangeError);
  });

  it("memoizes — repeated calls are fast", () => {
    factorial(15); // warm
    expect(factorial(15)).toBe(1307674368000);
    expect(factorial(12)).toBe(479001600);
  });
});

describe("poissonPmf", () => {
  it("P(X=0 | λ=1) = e^-1 ≈ 0.368", () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(Math.E ** -1, 5);
  });

  it("P(X=1 | λ=1) = e^-1 ≈ 0.368", () => {
    expect(poissonPmf(1, 1)).toBeCloseTo(Math.E ** -1, 5);
  });

  it("P(X=2 | λ=2) = 2·e^-2 ≈ 0.271", () => {
    expect(poissonPmf(2, 2)).toBeCloseTo(2 * Math.E ** -2, 5);
  });

  it("returns 0 for non-positive lambda", () => {
    expect(poissonPmf(3, 0)).toBe(0);
    expect(poissonPmf(3, -1)).toBe(0);
  });

  it("returns 0 for non-integer k", () => {
    expect(poissonPmf(2.5, 2)).toBe(0);
  });

  it("returns 0 for negative k", () => {
    expect(poissonPmf(-1, 2)).toBe(0);
  });

  it("PMF over reasonable range sums to ≈ 1", () => {
    let sum = 0;
    for (let k = 0; k < 30; k++) sum += poissonPmf(k, 3);
    expect(sum).toBeCloseTo(1, 4);
  });
});

describe("poissonCdf", () => {
  it("CDF is monotonically non-decreasing", () => {
    let prev = 0;
    for (let k = 0; k < 20; k++) {
      const c = poissonCdf(k, 4);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it("CDF approaches 1 in the tail", () => {
    expect(poissonCdf(30, 3)).toBeCloseTo(1, 5);
  });

  it("returns 0 for negative k", () => {
    expect(poissonCdf(-1, 2)).toBe(0);
  });
});

describe("jointScoreMatrix", () => {
  it("produces a (maxGoals+1) × (maxGoals+1) matrix", () => {
    const m = jointScoreMatrix(1.5, 1.2, 5);
    expect(m).toHaveLength(6);
    for (const row of m) expect(row).toHaveLength(6);
  });

  it("matrix sums to ≈ 1 over a wide range", () => {
    const m = jointScoreMatrix(2.0, 1.8, 15);
    let sum = 0;
    for (const row of m) for (const v of row) sum += v;
    expect(sum).toBeCloseTo(1, 3);
  });

  it("throws on negative maxGoals", () => {
    expect(() => jointScoreMatrix(1, 1, -1)).toThrow(RangeError);
  });
});

describe("moneylineProbabilities", () => {
  it("home and away symmetric when λs match → P(home) ≈ P(away)", () => {
    const r = moneylineProbabilities(1.5, 1.5, 12);
    expect(r.home).toBeCloseTo(r.away, 3);
  });

  it("higher home λ → home win probability rises", () => {
    const r = moneylineProbabilities(2.5, 1.0, 12);
    expect(r.home).toBeGreaterThan(r.away);
    expect(r.home).toBeGreaterThan(0.5);
  });

  it("coverage approaches 1 with adequate maxGoals", () => {
    const r = moneylineProbabilities(1.5, 1.2, 12);
    expect(r.coverage).toBeCloseTo(1, 3);
  });

  it("probabilities are all in [0,1]", () => {
    const r = moneylineProbabilities(2.1, 1.7, 10);
    expect(r.home).toBeGreaterThanOrEqual(0);
    expect(r.home).toBeLessThanOrEqual(1);
    expect(r.away).toBeGreaterThanOrEqual(0);
    expect(r.away).toBeLessThanOrEqual(1);
    expect(r.draw).toBeGreaterThanOrEqual(0);
    expect(r.draw).toBeLessThanOrEqual(1);
  });
});

describe("overUnderProbabilities", () => {
  it("over + under + push sums to coverage", () => {
    const r = overUnderProbabilities(2.0, 2.0, 4.5, 12);
    expect(r.over + r.under + r.push).toBeCloseTo(r.coverage, 6);
  });

  it("integer total can produce non-zero push", () => {
    const r = overUnderProbabilities(2.0, 2.0, 4, 12);
    expect(r.push).toBeGreaterThan(0);
  });

  it("half-line total produces zero push", () => {
    const r = overUnderProbabilities(2.0, 2.0, 4.5, 12);
    expect(r.push).toBe(0);
  });

  it("higher λs → P(over) rises", () => {
    const low = overUnderProbabilities(1.0, 1.0, 3.5, 12);
    const high = overUnderProbabilities(2.5, 2.5, 3.5, 12);
    expect(high.over).toBeGreaterThan(low.over);
  });
});

describe("poissonConsistencyScore", () => {
  it("0 when Poisson total equals bookmaker total", () => {
    expect(poissonConsistencyScore(2.0, 2.0, 4.0)).toBe(0);
  });

  it("positive when Poisson total disagrees with bookmaker", () => {
    expect(poissonConsistencyScore(2.5, 2.5, 4.0)).toBeGreaterThan(0);
  });

  it("clamped at 1", () => {
    expect(poissonConsistencyScore(5.0, 5.0, 1.0)).toBeLessThanOrEqual(1);
  });

  it("returns 0 for degenerate inputs", () => {
    expect(poissonConsistencyScore(0, 1, 4)).toBe(0);
    expect(poissonConsistencyScore(1, 0, 4)).toBe(0);
    expect(poissonConsistencyScore(1, 1, 0)).toBe(0);
  });

  it("monotonically rises with divergence magnitude", () => {
    const small = poissonConsistencyScore(2.0, 2.0, 4.2);
    const big = poissonConsistencyScore(2.0, 2.0, 5.5);
    expect(big).toBeGreaterThan(small);
  });
});

describe("assertTeamRatesAvailable (production guard)", () => {
  const originalNodeEnv = process.env["NODE_ENV"];
  const originalFlag = process.env["TEAM_RATES_AVAILABLE"];

  afterEach(() => {
    process.env["NODE_ENV"] = originalNodeEnv;
    if (originalFlag === undefined) {
      delete process.env["TEAM_RATES_AVAILABLE"];
    } else {
      process.env["TEAM_RATES_AVAILABLE"] = originalFlag;
    }
  });

  it("does not throw in test environment by default", () => {
    process.env["NODE_ENV"] = "test";
    delete process.env["TEAM_RATES_AVAILABLE"];
    expect(() => assertTeamRatesAvailable()).not.toThrow();
  });

  it("does not throw in dev by default", () => {
    process.env["NODE_ENV"] = "development";
    delete process.env["TEAM_RATES_AVAILABLE"];
    expect(() => assertTeamRatesAvailable()).not.toThrow();
  });

  it("throws in production when flag is unset", () => {
    process.env["NODE_ENV"] = "production";
    delete process.env["TEAM_RATES_AVAILABLE"];
    expect(() => assertTeamRatesAvailable()).toThrow(/Poisson/);
  });

  it("passes in production when flag is true", () => {
    process.env["NODE_ENV"] = "production";
    process.env["TEAM_RATES_AVAILABLE"] = "true";
    expect(() => assertTeamRatesAvailable()).not.toThrow();
  });

  it("throws in production when flag is anything other than 'true'", () => {
    process.env["NODE_ENV"] = "production";
    process.env["TEAM_RATES_AVAILABLE"] = "1";
    expect(() => assertTeamRatesAvailable()).toThrow();
    process.env["TEAM_RATES_AVAILABLE"] = "yes";
    expect(() => assertTeamRatesAvailable()).toThrow();
  });

  it("guards the aggregate moneyline function", () => {
    process.env["NODE_ENV"] = "production";
    delete process.env["TEAM_RATES_AVAILABLE"];
    expect(() => moneylineProbabilities(1.5, 1.5)).toThrow();
  });

  it("guards the aggregate over/under function", () => {
    process.env["NODE_ENV"] = "production";
    delete process.env["TEAM_RATES_AVAILABLE"];
    expect(() => overUnderProbabilities(1.5, 1.5, 4.5)).toThrow();
  });
});
