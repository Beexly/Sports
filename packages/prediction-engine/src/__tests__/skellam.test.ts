import { describe, expect, it } from "vitest";
import {
  isSkellamValidSport,
  skellamCdf,
  skellamCoverProbabilities,
  skellamPmf,
  skellamPmfGrid,
} from "../skellam.js";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("isSkellamValidSport", () => {
  it("accepts low-count sports and rejects NFL/NBA", () => {
    expect(isSkellamValidSport("icehockey_nhl")).toBe(true);
    expect(isSkellamValidSport("baseball_mlb")).toBe(true);
    expect(isSkellamValidSport("soccer_epl")).toBe(true);
    expect(isSkellamValidSport("americanfootball_nfl")).toBe(false);
    expect(isSkellamValidSport("basketball_nba")).toBe(false);
  });
});

describe("skellamPmf", () => {
  it("sums to ~1 over the truncated grid", () => {
    const grid = skellamPmfGrid(2.8, 2.4, 15);
    expect(sum(grid.map((p) => p.probability))).toBeCloseTo(1, 3);
  });

  it("is symmetric around 0 when λh = λa", () => {
    expect(skellamPmf(2, 2.5, 2.5)).toBeCloseTo(skellamPmf(-2, 2.5, 2.5), 8);
    expect(skellamPmf(0, 2.5, 2.5)).toBeGreaterThan(skellamPmf(1, 2.5, 2.5));
  });

  it("puts more mass on positive margins when home is the better scoring side", () => {
    expect(skellamPmf(2, 3.2, 2.0)).toBeGreaterThan(skellamPmf(-2, 3.2, 2.0));
  });

  it("returns 0 on degenerate λ / non-integer k", () => {
    expect(skellamPmf(0, 0, 2)).toBe(0);
    expect(skellamPmf(0, -1, 2)).toBe(0);
    expect(skellamPmf(1.5, 2, 2)).toBe(0);
  });
});

describe("skellamCdf", () => {
  it("is monotone and approaches coverage in the tail", () => {
    let prev = 0;
    for (let k = -10; k <= 10; k++) {
      const c = skellamCdf(k, 2.2, 2.2, 12);
      expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = c;
    }
    expect(skellamCdf(12, 2.2, 2.2, 12)).toBeCloseTo(1, 3);
  });
});

describe("skellamCoverProbabilities", () => {
  it("returns null on invalid sport or λ", () => {
    expect(
      skellamCoverProbabilities({
        lambdaHome: 2.8,
        lambdaAway: 2.5,
        spreadHome: -1.5,
        sportKey: "americanfootball_nfl",
      }),
    ).toBeNull();
    expect(
      skellamCoverProbabilities({ lambdaHome: 0, lambdaAway: 2, spreadHome: 0 }),
    ).toBeNull();
  });

  it("home-cover probability is monotone increasing in the home spread (underdog points help)", () => {
    const spreads = [-2.5, -1.5, -0.5, 0.5, 1.5];
    const covers = spreads.map(
      (spreadHome) =>
        skellamCoverProbabilities({
          lambdaHome: 3.0,
          lambdaAway: 2.4,
          spreadHome,
          sportKey: "icehockey_nhl",
        })!.homeCover,
    );
    for (let i = 1; i < covers.length; i++) {
      expect(covers[i]!).toBeGreaterThan(covers[i - 1]!);
    }
  });

  it("half-point spreads have zero push; integer spreads can push", () => {
    const half = skellamCoverProbabilities({
      lambdaHome: 2.7,
      lambdaAway: 2.7,
      spreadHome: -1.5,
      sportKey: "baseball_mlb",
    })!;
    expect(half.push).toBe(0);
    expect(half.homeCover + half.awayCover).toBeCloseTo(half.coverage, 6);

    const whole = skellamCoverProbabilities({
      lambdaHome: 2.7,
      lambdaAway: 2.7,
      spreadHome: -1,
      sportKey: "baseball_mlb",
    })!;
    expect(whole.push).toBeGreaterThan(0);
    expect(whole.homeCover + whole.awayCover + whole.push).toBeCloseTo(whole.coverage, 6);
  });

  it("expected margin equals λh − λa", () => {
    const result = skellamCoverProbabilities({
      lambdaHome: 3.1,
      lambdaAway: 2.4,
      spreadHome: -0.5,
      sportKey: "soccer_epl",
    })!;
    expect(result.expectedMargin).toBeCloseTo(0.7, 6);
  });
});
