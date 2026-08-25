import { describe, expect, it } from "vitest";
import { mulberry32, type Rng } from "../rng.js";
import { posteriorRate, probOver, type RateSample } from "../props-hb.js";
import {
  aggregateGameLog,
  capGameLog,
  discountGameLog,
  expectedExcess,
  fitMeanVariance,
  fitMeanVarianceFromGameLogs,
  phiForMean,
  posteriorRateMeanVar,
  posteriorRateObs,
  regimeShift,
  shrinkQuasiLikelihood,
} from "../props-hb-obs.js";

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

/** NB2: Var = μ + α μ² via Gamma-Poisson (shape = 1/α). Requires α ≤ 1. */
function sampleNb2(mu: number, alpha: number, rng: Rng): number {
  if (alpha <= 1e-9) return samplePoisson(mu, rng);
  const shape = 1 / alpha;
  const rate = 1 / (alpha * Math.max(mu, 1e-9));
  const lam = sampleGamma(Math.max(shape, 1), rate, rng);
  return samplePoisson(lam, rng);
}

describe("fitMeanVariance — glmGamPoi family", () => {
  it("selects Poisson (or QL with φ ≈ 1) on synthetic Gamma-Poisson counts", () => {
    const rng = mulberry32(20260822);
    const samples: RateSample[] = [];
    const gamesChoices = [5, 10, 20, 40];
    for (let i = 0; i < 400; i++) {
      const games = gamesChoices[i % gamesChoices.length] as number;
      const rate = sampleGamma(4, 2, rng);
      samples.push({ games, total: samplePoisson(rate * games, rng) });
    }
    const fit = fitMeanVariance(samples);
    expect(fit).not.toBeNull();
    expect(fit!.family === "poisson" || (fit!.family === "ql" && Math.abs(fit!.phi - 1) < 0.5)).toBe(true);
  });

  it("selects NB2 from game logs when low-mean and high-mean groups have different φ(μ)", () => {
    // Cell-level Var/mean is glmGamPoi's identifying statistic. Aggregated
    // (games, total) cannot separate constant-φ QL from NB2.
    const rng = mulberry32(11);
    const ALPHA = 0.8;
    const players: { games: { total: number }[] }[] = [];
    for (let i = 0; i < 80; i++) {
      const rate = i < 40 ? 0.8 : 6;
      const games = [];
      for (let g = 0; g < 12; g++) games.push({ total: sampleNb2(rate, ALPHA, rng) });
      players.push({ games });
    }
    const fit = fitMeanVarianceFromGameLogs(players);
    expect(fit).not.toBeNull();
    expect(fit!.rss.nb2).toBeLessThan(fit!.rss.ql);
    expect(fit!.rss.nb2).toBeLessThan(fit!.rss.poisson);
    expect(fit!.family).toBe("nb2");
    expect(fit!.alpha).toBeGreaterThan(0.2);
    expect(phiForMean(fit!, 6)).toBeGreaterThan(phiForMean(fit!, 0.8));
  });

  it("returns null for empty input and Poisson-plugin below the player floor", () => {
    expect(fitMeanVariance([])).toBeNull();
    const tiny = Array.from({ length: 4 }, () => ({ games: 8, total: 16 }));
    const fit = fitMeanVariance(tiny);
    expect(fit).not.toBeNull();
    expect(fit!.family).toBe("poisson");
    expect(fit!.playerCount).toBe(4);
  });

  it("throws on invalid samples", () => {
    expect(() => fitMeanVariance([{ games: 0, total: 1 }])).toThrow(RangeError);
  });
});

describe("shrinkQuasiLikelihood — glmGamPoi / DESeq2", () => {
  it("returns the prior at df = 0 and the estimate at large df", () => {
    expect(shrinkQuasiLikelihood(4, 0, 1, 10)).toBeCloseTo(1, 12);
    expect(shrinkQuasiLikelihood(4, 10_000, 1, 10)).toBeCloseTo(4, 2);
  });

  it("is a convex combination of φ̂ and the prior", () => {
    const mid = shrinkQuasiLikelihood(4, 10, 1, 10);
    expect(mid).toBeCloseTo(2.5, 12);
  });
});

describe("posteriorRateObs — extra-Poisson φ shrinks harder", () => {
  const prior = { alpha: 8, beta: 4 };

  it("matches the unscaled conjugate update at φ = 1", () => {
    const a = posteriorRate(prior, 40, 10);
    const b = posteriorRateObs(prior, 40, 10, 1);
    expect(b.mean).toBeCloseTo(a.mean, 12);
  });

  it("moves toward the prior when φ > 1", () => {
    const raw = posteriorRate(prior, 40, 10);
    const cal = posteriorRateObs(prior, 40, 10, 4);
    expect(Math.abs(cal.mean - 2)).toBeLessThan(Math.abs(raw.mean - 2));
  });

  it("evaluates NB2 φ at the player's own mean, not a global constant", () => {
    const fit = {
      family: "nb2" as const,
      pooledMean: 2,
      talentVar: 0.5,
      phi: 1,
      alpha: 0.5,
      rss: { poisson: 1, ql: 1, nb2: 0.5 },
      playerCount: 40,
    };
    expect(phiForMean(fit, 4)).toBeCloseTo(3, 12);
    const high = posteriorRateMeanVar(prior, 80, 10, fit); // raw rate 8
    const low = posteriorRateMeanVar(prior, 10, 10, fit); // raw rate 1
    // higher μ → larger φ → more shrink toward the prior mean 2
    expect(Math.abs(high.mean - 2)).toBeLessThan(Math.abs(posteriorRate(prior, 80, 10).mean - 2));
    expect(phiForMean(fit, 8)).toBeGreaterThan(phiForMean(fit, 1));
    expect(low.mean).toBeGreaterThan(0);
  });
});

describe("aggregateGameLog — idcap then recency", () => {
  it("decay = 1 recovers the raw sum", () => {
    const s = discountGameLog([{ total: 1 }, { total: 3 }, { total: 5 }], 1);
    expect(s.total).toBe(9);
    expect(s.games).toBe(3);
  });

  it("decay < 1 overweights the most recent game", () => {
    const s = discountGameLog([{ total: 10 }, { total: 0 }], 0.5);
    expect(s.total).toBeCloseTo(10 * 0.5 + 0, 12);
    expect(s.games).toBeCloseTo(1.5, 12);
    expect(s.total / s.games).toBeLessThan(10 / 2);
  });

  it("caps a blow-up game before pooling (fishHook idcap)", () => {
    const capped = capGameLog([{ total: 8 }, { total: 1 }, { total: 1 }], 3);
    expect(capped.map((g) => g.total)).toEqual([3, 1, 1]);
    const agg = aggregateGameLog([{ total: 8 }, { total: 1 }, { total: 1 }], { cap: 3, decay: 1 });
    expect(agg.total).toBe(5);
    expect(agg.games).toBe(3);
  });

  it("throws on empty log or invalid decay/cap", () => {
    expect(() => discountGameLog([], 1)).toThrow(RangeError);
    expect(() => discountGameLog([{ total: 1 }], 0)).toThrow(RangeError);
    expect(() => capGameLog([{ total: 1 }], 0)).toThrow(RangeError);
  });
});

describe("regimeShift — radiation Poisson band", () => {
  const career = posteriorRate({ alpha: 20, beta: 10 }, 40, 20); // mean 2

  it("flags a recent window far above the career predictive tail", () => {
    const shift = regimeShift(career, { games: 3, total: 30 }, 0.01);
    expect(shift.direction).toBe("high");
    expect(shift.pHigh).toBeLessThan(0.01);
  });

  it("is none when recent is typical", () => {
    const shift = regimeShift(career, { games: 5, total: 10 }, 0.01);
    expect(shift.direction).toBe("none");
  });

  it("flags a collapse", () => {
    const shift = regimeShift(career, { games: 8, total: 0 }, 0.01);
    expect(shift.direction).toBe("low");
  });
});

describe("expectedExcess — count-space surplus", () => {
  it("matches the Geometric closed form at r = 1", () => {
    const geom = { alpha: 1, beta: 4, mean: 0.25 };
    const p = 4 / 5;
    expect(expectedExcess(geom, 0)).toBeCloseTo((1 - p) / p, 10);
    expect(expectedExcess(geom, 0.5)).toBeCloseTo((1 - p) / p - 0.5 * (1 - p), 10);
  });

  it("is 0 for an absurd line and E[X] − line for a negative line", () => {
    const post = { alpha: 8, beta: 4, mean: 2 };
    expect(expectedExcess(post, 50_000)).toBeLessThan(1e-6);
    expect(expectedExcess(post, -2)).toBeCloseTo(2 - -2, 12);
  });

  it("is strictly larger when P(over) is larger (same posterior, lower line)", () => {
    const post = { alpha: 8, beta: 4, mean: 2 };
    expect(expectedExcess(post, 1)).toBeGreaterThan(expectedExcess(post, 3));
    expect(probOver(post, 1)).toBeGreaterThan(probOver(post, 3));
  });
});
