import { describe, expect, it } from "vitest";
import { mulberry32, type Rng } from "../rng.js";
import { fitGroupPrior, posteriorRate, type RateSample } from "../props-hb.js";
import {
  fitGroupPriorCalibrated,
  fitNestedByStat,
  fitNestedPriors,
  fitNestedPriorsLeaveOneOut,
  fitVarianceDecomposition,
  gammaFromMoments,
  posteriorRateCalibrated,
  priorForGroup,
  scaleObservation,
  scoreNestedPlayer,
  shrinkageReportNested,
  type GroupedRateSample,
} from "../props-hb-nested.js";

function normal(rng: Rng): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleGamma(shape: number, rate: number, rng: Rng): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) {
      return (d * v) / rate;
    }
  }
}

function samplePoisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function sampleNbOverdispersed(mean: number, phi: number, rng: Rng): number {
  // Gamma-Poisson mixture: Var = φ μ. α = μ/(φ-1), β = 1/(φ-1).
  if (phi <= 1.0001) return samplePoisson(mean, rng);
  const alpha = mean / (phi - 1);
  const beta = 1 / (phi - 1);
  const lam = sampleGamma(Math.max(alpha, 1), beta, rng);
  return samplePoisson(lam, rng);
}

describe("gammaFromMoments", () => {
  it("inverts the Gamma mean/variance identities", () => {
    const prior = gammaFromMoments(2, 0.5);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / prior!.beta).toBeCloseTo(2, 12);
    expect(prior!.alpha / (prior!.beta * prior!.beta)).toBeCloseTo(0.5, 12);
  });

  it("returns null on non-positive or degenerate variance", () => {
    expect(gammaFromMoments(2, 0)).toBeNull();
    expect(gammaFromMoments(2, -1)).toBeNull();
    expect(gammaFromMoments(0, 1)).toBeNull();
    expect(gammaFromMoments(2, 2 * 1e-15)).toBeNull();
  });
});

describe("fitVarianceDecomposition — empirical 1/n", () => {
  it("recovers Gamma-Poisson talent variance and Poisson slope within 50%", () => {
    const rng = mulberry32(20260822);
    const ALPHA = 4;
    const BETA = 2;
    const talentVar = ALPHA / (BETA * BETA); // 1
    const pooled = ALPHA / BETA; // 2
    const gamesChoices = [5, 10, 20, 40];
    const samples: RateSample[] = [];
    for (let i = 0; i < 400; i++) {
      const games = gamesChoices[i % gamesChoices.length] as number;
      const rate = sampleGamma(ALPHA, BETA, rng);
      samples.push({ games, total: samplePoisson(rate * games, rng) });
    }

    const deco = fitVarianceDecomposition(samples);
    expect(deco).not.toBeNull();
    expect(deco!.method === "binned-1n" || deco!.method === "player-ols").toBe(true);
    expect(Math.abs(deco!.talentVar - talentVar) / talentVar).toBeLessThan(0.5);
    expect(Math.abs(deco!.obsVarPerGame - pooled) / pooled).toBeLessThan(0.5);
    expect(deco!.extraPoissonFactor).toBeGreaterThan(0.5);
    expect(deco!.extraPoissonFactor).toBeLessThan(2);
  });

  it("flags extra-Poisson (φ > 1) when counts are overdispersed relative to Poisson", () => {
    const rng = mulberry32(7);
    const ALPHA = 4;
    const BETA = 2;
    const PHI = 4;
    const gamesChoices = [5, 10, 20, 40];
    const samples: RateSample[] = [];
    for (let i = 0; i < 400; i++) {
      const games = gamesChoices[i % gamesChoices.length] as number;
      const rate = sampleGamma(ALPHA, BETA, rng);
      samples.push({ games, total: sampleNbOverdispersed(rate * games, PHI, rng) });
    }
    const deco = fitVarianceDecomposition(samples);
    expect(deco).not.toBeNull();
    expect(deco!.extraPoissonFactor).toBeGreaterThan(1.5);
  });

  it("returns null for empty input and throws on invalid samples", () => {
    expect(fitVarianceDecomposition([])).toBeNull();
    expect(() => fitVarianceDecomposition([{ games: 0, total: 1 }])).toThrow(RangeError);
    expect(() => fitVarianceDecomposition([{ games: 4, total: -1 }])).toThrow(RangeError);
  });
});

describe("posteriorRateCalibrated — extra-Poisson shrinks harder", () => {
  const prior = { alpha: 8, beta: 4 }; // mean 2

  it("preserves the observed mean under the games/φ rescale", () => {
    const s = scaleObservation(40, 10, 4);
    expect(s.total / s.games).toBeCloseTo(4, 12);
    expect(s.games).toBeCloseTo(2.5, 12);
  });

  it("moves the posterior closer to the prior when φ > 1", () => {
    const raw = posteriorRate(prior, 40, 10);
    const cal = posteriorRateCalibrated(prior, 40, 10, 4);
    const priorMean = 2;
    expect(Math.abs(cal.mean - priorMean)).toBeLessThan(Math.abs(raw.mean - priorMean));
    expect(raw.mean).toBeCloseTo(48 / 14, 12);
    expect(cal.mean).toBeCloseTo(18 / 6.5, 12);
  });

  it("matches the unscaled conjugate update at φ = 1", () => {
    const a = posteriorRate(prior, 13, 6);
    const b = posteriorRateCalibrated(prior, 13, 6, 1);
    expect(b.alpha).toBeCloseTo(a.alpha, 12);
    expect(b.beta).toBeCloseTo(a.beta, 12);
  });

  it("throws on non-positive φ", () => {
    expect(() => posteriorRateCalibrated(prior, 1, 1, 0)).toThrow(RangeError);
    expect(() => posteriorRateCalibrated(prior, 1, 1, -2)).toThrow(RangeError);
  });
});

describe("fitGroupPriorCalibrated", () => {
  it("falls back to the one-level MoM on a homogeneous group (no fake dispersion)", () => {
    const homogeneous: RateSample[] = [2, 5, 10].map((g) => ({ games: g, total: g * 2 }));
    expect(fitGroupPrior(homogeneous)).toBeNull();
    expect(fitGroupPriorCalibrated(homogeneous)).toBeNull();
  });
});

function buildLeague(): GroupedRateSample[] {
  const players: GroupedRateSample[] = [];
  for (let i = 0; i < 40; i++) {
    const rate = i < 20 ? 4 : 6;
    players.push({ id: `WR${i}`, groupId: "WR", games: 16, total: 16 * rate });
  }
  for (let i = 0; i < 4; i++) {
    const rate = i < 2 ? 2 : 4;
    players.push({ id: `TE${i}`, groupId: "TE", games: 8, total: 8 * rate });
  }
  for (let i = 0; i < 20; i++) {
    const rate = i < 10 ? 3 : 5;
    players.push({ id: `RB${i}`, groupId: "RB", games: 12, total: 12 * rate });
  }
  return players;
}

describe("fitNestedPriors — player → position → league", () => {
  it("pulls a small group (TE) toward the league more than a large group (WR)", () => {
    const fit = fitNestedPriors(buildLeague());
    const te = fit.groups["TE"];
    const wr = fit.groups["WR"];
    expect(te).toBeDefined();
    expect(wr).toBeDefined();
    expect(te!.rawMean).toBeCloseTo(3, 12);
    expect(wr!.rawMean).toBeCloseTo(5, 12);
    expect(te!.shrinkWeightTowardLeague).toBeGreaterThan(wr!.shrinkWeightTowardLeague);
    expect(Math.abs(te!.shrunkMean - te!.rawMean)).toBeGreaterThan(Math.abs(wr!.shrunkMean - wr!.rawMean));
    expect(te!.shrunkMean).toBeGreaterThan(te!.rawMean);
    expect(te!.shrunkMean).toBeLessThan(wr!.rawMean);
    expect(te!.source).toBe("shrunk");
  });

  it("uses the league prior for an unknown groupId", () => {
    const fit = fitNestedPriors(buildLeague());
    expect(priorForGroup(fit, "K")).toBe(fit.league);
    expect(priorForGroup(fit, "WR")).toBe(fit.groups["WR"]!.prior);
  });

  it("scores a 0-game rookie as the group prior mean (full shrink)", () => {
    const fit = fitNestedPriors(buildLeague());
    const post = scoreNestedPlayer(fit, { id: "rookie", groupId: "WR", games: 0, total: 0 });
    expect(post).not.toBeNull();
    expect(post!.mean).toBeCloseTo(fit.groups["WR"]!.prior!.alpha / fit.groups["WR"]!.prior!.beta, 12);
  });

  it("leave-one-out drops an extreme TE from the group mean", () => {
    const players = buildLeague();
    const extremeIndex = players.findIndex((p) => p.id === "TE0");
    expect(extremeIndex).toBeGreaterThanOrEqual(0);
    const full = fitNestedPriors(players);
    const loo = fitNestedPriorsLeaveOneOut(players, extremeIndex);
    // TE0 is the rate-2 TE; excluding him raises the TE raw mean.
    expect(loo.groups["TE"]!.rawMean).toBeGreaterThan(full.groups["TE"]!.rawMean);
  });

  it("returns an empty fit for no players and throws on empty groupId", () => {
    const empty = fitNestedPriors([]);
    expect(empty.league).toBeNull();
    expect(empty.groups).toEqual({});
    expect(() =>
      fitNestedPriors([{ groupId: "", games: 4, total: 8 }]),
    ).toThrow(RangeError);
    expect(() => fitNestedPriorsLeaveOneOut(buildLeague(), -1)).toThrow(RangeError);
  });
});

describe("shrinkageReportNested", () => {
  it("attaches group-level league shrink and extra-Poisson φ to every row", () => {
    const players = buildLeague();
    const fit = fitNestedPriors(players);
    const rows = shrinkageReportNested(fit, players);
    expect(rows).toHaveLength(players.length);
    const te = rows.filter((r) => r.groupId === "TE");
    const wr = rows.filter((r) => r.groupId === "WR");
    expect(te[0]!.groupShrinkWeightTowardLeague).toBeGreaterThan(wr[0]!.groupShrinkWeightTowardLeague);
    expect(te.every((r) => r.extraPoissonFactor === rows[0]!.extraPoissonFactor)).toBe(true);
  });
});

describe("fitNestedByStat — component-then-recompose grain", () => {
  it("fits receptions and yards independently (different SNR, no lumped fantasy points)", () => {
    const rec: Array<GroupedRateSample & { stat: string }> = buildLeague().map((p) => ({
      ...p,
      stat: "receptions",
    }));
    const yards: Array<GroupedRateSample & { stat: string }> = buildLeague().map((p) => ({
      ...p,
      id: `${p.id}-yd`,
      total: p.total * 12,
      stat: "rec_yards",
    }));
    const fits = fitNestedByStat([...rec, ...yards]);
    expect(Object.keys(fits).sort()).toEqual(["rec_yards", "receptions"]);
    expect(fits.receptions!.groups["WR"]!.rawMean).toBeCloseTo(5, 8);
    expect(fits.rec_yards!.groups["WR"]!.rawMean).toBeCloseTo(60, 8);
  });

  it("throws on an empty stat key", () => {
    expect(() =>
      fitNestedByStat([{ stat: "", groupId: "WR", games: 4, total: 8 }]),
    ).toThrow(RangeError);
  });
});

describe("independent model — no market leak", () => {
  it("GroupedRateSample scoring never consults a spread/odds field", () => {
    const withJunk = {
      id: "p",
      groupId: "WR",
      games: 8,
      total: 40,
      spread: -3.5,
      odds: -110,
    } as GroupedRateSample & { spread: number; odds: number };
    const fit = fitNestedPriors(buildLeague());
    const post = scoreNestedPlayer(fit, withJunk);
    const clean = scoreNestedPlayer(fit, { id: "p", groupId: "WR", games: 8, total: 40 });
    expect(post!.mean).toBeCloseTo(clean!.mean, 12);
  });
});
