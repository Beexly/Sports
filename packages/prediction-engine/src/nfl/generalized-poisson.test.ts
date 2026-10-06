import { describe, expect, it } from "vitest";
import { poissonPmf } from "../poisson.js";
import {
  buildMatchup,
  fitHomeFieldMultiplier,
  generalizedPoisson,
  sampleRareEvents,
  simulateMatchup,
  trailingRatings,
  type TeamGame,
  type TeamRating,
} from "./generalized-poisson.js";

function game(over: Partial<TeamGame> = {}): TeamGame {
  return {
    teamId: "KC",
    opponentId: "BUF",
    touchdowns: 3,
    touchdownsAllowed: 2,
    drives: 11,
    kickoff: "2026-09-25T20:00:00.000Z",
    home: true,
    ...over,
  };
}

function rating(over: Partial<TeamRating> = {}): TeamRating {
  return {
    teamId: "KC",
    tdForRate: 2.4,
    tdAgainstRate: 1.8,
    tdForUncertainty: 0.4,
    tdAgainstUncertainty: 0.4,
    gamesUsed: 12,
    window: 12,
    ...over,
  };
}

describe("V6 generalizedPoisson", () => {
  it("matches ordinary Poisson when theta = 0", () => {
    for (let k = 0; k <= 5; k++) {
      expect(generalizedPoisson(k, 0, 2)).toBeCloseTo(Math.exp(-2) * 2 ** k / factorial(k), 5);
    }
  });

  it("returns 0 for invalid support", () => {
    expect(generalizedPoisson(-1, 0.1, 2)).toBe(0);
    expect(generalizedPoisson(1.5, 0.1, 2)).toBe(0);
    expect(generalizedPoisson(0, 0.1, -1)).toBe(0);
    expect(generalizedPoisson(0, 2, 2)).toBe(0);
  });

  it("is a proper PMF over small support", () => {
    let s = 0;
    for (let k = 0; k <= 15; k++) s += generalizedPoisson(k, 0.1, 2);
    expect(s).toBeGreaterThan(0.98);
    expect(s).toBeLessThan(1.02);
  });

  it("under-disperses relative to Poisson for theta > 0", () => {
    // P(k=0) is identical under Consul-Jain; higher k differs and variance shrinks.
    const theta = 0.15;
    const lambda = 1.5;
    const gp0 = generalizedPoisson(0, theta, lambda);
    expect(gp0).toBeCloseTo(Math.exp(-lambda), 8);
    const gp3 = generalizedPoisson(3, theta, lambda);
    const p3 = poissonPmf(3, lambda);
    expect(gp3).toBeGreaterThan(0);
    expect(gp3).not.toBeCloseTo(p3, 3);
  });
});

describe("V6 trailingRatings", () => {
  it("blends toward prior with few games", () => {
    const r = trailingRatings("KC", [game()], 12);
    expect(r.teamId).toBe("KC");
    expect(r.gamesUsed).toBe(1);
    // Prior 1.5, strength 4, observed 3 → (4*1.5+3)/(4+1) = 1.8
    expect(r.tdForRate).toBeCloseTo(1.8, 3);
  });

  it("respects the trailing window", () => {
    const games = Array.from({ length: 20 }, (_, i) =>
      game({
        touchdowns: 4,
        kickoff: `2026-09-${String(i + 1).padStart(2, "0")}T20:00:00.000Z`,
      }),
    );
    const r = trailingRatings("KC", games, 5);
    expect(r.gamesUsed).toBe(5);
  });

  it("never imputes missing touchdowns — excludes them from the rate", () => {
    const r = trailingRatings(
      "KC",
      [
        game({ touchdowns: null }),
        game({ touchdowns: 2, kickoff: "2026-09-26T20:00:00.000Z" }),
      ],
      12,
    );
    // Only one observed TD=2 counted: (4*1.5+2)/(4+1)=1.6
    expect(r.tdForRate).toBeCloseTo(1.6, 3);
    expect(r.gamesUsed).toBe(2);
  });
});

describe("V6 fitHomeFieldMultiplier", () => {
  it("fits from observed home/away rates", () => {
    const games: TeamGame[] = [];
    for (let i = 0; i < 5; i++) {
      games.push(
        game({ home: true, touchdowns: 3, kickoff: `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00.000Z` }),
        game({ home: false, touchdowns: 2, kickoff: `2026-09-${String(i + 1).padStart(2, "0")}T20:00:00.000Z` }),
      );
    }
    const m = fitHomeFieldMultiplier(games);
    expect(m).not.toBeNull();
    expect(m!).toBeCloseTo(1.5, 3);
  });

  it("returns null on insufficient data — never invents 10%", () => {
    expect(fitHomeFieldMultiplier([])).toBeNull();
    expect(fitHomeFieldMultiplier([game()])).toBeNull();
    expect(
      fitHomeFieldMultiplier([game({ home: true, touchdowns: 3 }), game({ home: true })]),
    ).toBeNull();
  });
});

describe("V6 sampleRareEvents", () => {
  it("samples FG as Poisson and safety as Bernoulli", () => {
    let rngState = 0;
    const rng = () => {
      rngState = (rngState * 1103515245 + 12345) % 2147483648;
      return rngState / 2147483648;
    };
    const s = sampleRareEvents(
      { fgRate: 2, safetyRate: 0.1, xpSuccess: 0.94, homeOtWin: 0.5 },
      3,
      rng,
    );
    expect(s.fgs).toBeGreaterThanOrEqual(0);
    expect(typeof s.safety).toBe("boolean");
    expect(s.xpsMade).toBeGreaterThanOrEqual(0);
    expect(s.xpsMade).toBeLessThanOrEqual(3);
  });
});

describe("V6 simulateMatchup", () => {
  const home = rating({ teamId: "KC", tdForRate: 2.6, tdAgainstRate: 1.7 });
  const away = rating({ teamId: "BUF", tdForRate: 2.2, tdAgainstRate: 2.0 });

  const params = buildMatchup(home, away, {
    homeFieldMultiplier: 1.12,
    spread: -2.5,
    totalLine: 47.5,
  });

  it("buildMatchup fail-closes without home field", () => {
    expect(
      buildMatchup(home, away, { homeFieldMultiplier: null, spread: -2.5, totalLine: 47.5 }),
    ).toBeNull();
    expect(
      buildMatchup(home, away, { homeFieldMultiplier: 0, spread: -2.5, totalLine: 47.5 }),
    ).toBeNull();
  });

  it("returns valid probabilities and score distribution", () => {
    expect(params).not.toBeNull();
    const r = simulateMatchup(params!, 2000, 42);
    expect(r.pHomeWin).toBeGreaterThan(0.3);
    expect(r.pHomeWin).toBeLessThan(0.9);
    expect(r.pCover).not.toBeNull();
    expect(r.pCover!).toBeGreaterThan(0);
    expect(r.pCover!).toBeLessThan(1);
    expect(r.pOver).not.toBeNull();
    expect(r.pOver!).toBeGreaterThan(0);
    expect(r.pOver!).toBeLessThan(1);
    expect(r.scoreDist.length).toBeGreaterThan(1);
    const sum = r.scoreDist.reduce((a, b) => a + b.probability, 0);
    expect(sum).toBeGreaterThan(0.95);
    expect(sum).toBeLessThan(1.05);
    expect(r.homeFieldMultiplier).toBeCloseTo(1.12, 4);
    expect(r.n).toBe(2000);
  });

  it("is deterministic under a seed", () => {
    const a = simulateMatchup(params!, 500, 7);
    const b = simulateMatchup(params!, 500, 7);
    expect(a.pHomeWin).toBe(b.pHomeWin);
    expect(a.scoreDist).toEqual(b.scoreDist);
  });

  it("pOver is null when totalLine is null — never imputed", () => {
    const p = buildMatchup(home, away, {
      homeFieldMultiplier: 1.12,
      spread: -2.5,
      totalLine: null,
    })!;
    const r = simulateMatchup(p, 300, 1);
    expect(r.pOver).toBeNull();
    expect(r.pHomeWin).toBeGreaterThan(0);
    expect(r.pCover).not.toBeNull();
  });

  it("throws on non-positive n", () => {
    expect(() => simulateMatchup(params!, 0)).toThrow();
  });
});

function factorial(n: number): number {
  let s = 1;
  for (let i = 2; i <= n; i++) s *= i;
  return s;
}
