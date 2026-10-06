import { describe, expect, it } from "vitest";
import {
  CFOV_GATE,
  ITS_GATE,
  ORDER_FLOW_GATE,
  POISSON_GATE,
  UNGATED,
  evalAshapAggregate,
  evalAshapStability,
  evalCfovFeatures,
  evalCfovTimeOrdered,
  evalCmpPmf,
  evalEffectiveBreadth,
  evalIngarchTotals,
  evalItsBreakScan,
  evalItsFit,
  evalNestedScoreSim,
  evalNormalCdf,
  evalPoissonTotals,
  evalResiliencyRegression,
  evalScarceLiquidity,
  evalSteamSignal,
  evalVolumeBuckets,
} from "./experimental-models-bridge.js";

/** Deterministic LCG — no crypto, no Math.random, identical on every run. */
function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** The C/F/O/V row type, derived so the tests never restate it. */
type CfovGame = Parameters<typeof evalCfovFeatures>[0]["games"][number];

describe("experimental bridge · effective breadth", () => {
  it("returns the exact simplex breadth for a flat weight vector", () => {
    const r = evalEffectiveBreadth({ probs: [1, 1, 1, 1] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.normalized).toEqual([0.25, 0.25, 0.25, 0.25]);
      // 1 / sum(0.25^2) = 1 / 0.25 = 4; exp(H) = exp(ln 4) = 4.
      expect(r.data.effectiveBreadth).toBeCloseTo(4, 10);
      expect(r.data.entropyBreadth).toBeCloseTo(4, 10);
      expect(r.data.isTopHeavy).toBe(false);
      expect(r.data.nominalSize).toBe(4);
      expect(r.data.topHeavyFrac).toBe(0.4);
      expect(r.data.gate).toBe(UNGATED);
      expect(r.data.gate.gateEvaluated).toBe(true);
    }
  });

  it("flags a top-heavy field and reports the exact 1/HSI value", () => {
    const r = evalEffectiveBreadth({ probs: [100, 1, 1] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // normalize -> [100,1,1]/102, so sum(p^2) = 10002/10404 and 1/HSI = 10404/10002.
      expect(r.data.effectiveBreadth).toBeCloseTo(10404 / 10002, 10);
      expect(r.data.effectiveBreadth).toBeLessThan(0.4 * 3);
      expect(r.data.isTopHeavy).toBe(true);
      expect(r.data.entropyBreadth).toBeGreaterThanOrEqual(1);
      expect(r.data.entropyBreadth).toBeLessThanOrEqual(3);
    }
  });

  it("fail-closes on empty, negative, zero-mass and bad-frac inputs", () => {
    expect(evalEffectiveBreadth({ probs: [] }).ok).toBe(false);
    expect(evalEffectiveBreadth({ probs: [1, -1, 2] }).ok).toBe(false);
    expect(evalEffectiveBreadth({ probs: [0, 0] }).ok).toBe(false);
    expect(evalEffectiveBreadth({ probs: [1, 2], topHeavyFrac: 1.5 }).ok).toBe(false);
    expect(evalEffectiveBreadth({ probs: [1, Number.NaN] }).ok).toBe(false);
  });

  it("explains why it refused", () => {
    const r = evalEffectiveBreadth({ probs: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("non-empty");
  });
});

describe("experimental bridge · ashap aggregation", () => {
  const shap = [
    [0.1, -0.2],
    [0.3, 0.4],
    [-0.5, 0],
  ];
  const groupOf = [7, 7, 3];

  it("aggregates per-group mean |SHAP| and mean signed SHAP exactly", () => {
    const r = evalAshapAggregate({ shap, groupOf, k: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const g7 = r.data.groups.find((g) => g.group === 7);
      const g3 = r.data.groups.find((g) => g.group === 3);
      expect(g7?.n).toBe(2);
      // |0.1| + |-0.2| + |0.3| + |0.4| = 1.0 over 2 rows.
      expect(g7?.meanAbs).toBeCloseTo(0.5, 12);
      // 0.1 - 0.2 + 0.3 + 0.4 = 0.6 over 2 rows.
      expect(g7?.meanSigned).toBeCloseTo(0.3, 12);
      expect(g3?.n).toBe(1);
      expect(g3?.meanAbs).toBeCloseTo(0.5, 12);
      expect(g3?.meanSigned).toBeCloseTo(-0.5, 12);
      // mean |SHAP| per column: (0.1+0.3+0.5)/3 = 0.3 and (0.2+0.4+0)/3 = 0.2.
      expect(r.data.topK).toEqual([0, 1]);
      expect(r.data.k).toBe(2);
      expect(r.data.nRows).toBe(3);
      expect(r.data.nFeatures).toBe(2);
      expect(r.data.gate.gateEvaluated).toBe(true);
    }
  });

  it("reports an empty stability set for a team whose top-k set moves", () => {
    const stable = evalAshapStability({
      topKPerTeamPerBootstrap: [
        [
          [1, 0],
          [1, 0],
          [1, 0],
          [1, 0],
          [1, 0],
        ],
      ],
    });
    expect(stable.ok).toBe(true);
    if (stable.ok) {
      expect(stable.data.stability).toBe(1);
      expect(stable.data.teams).toBe(1);
      expect(stable.data.bootstrapsPerTeam).toEqual([5]);
      expect(stable.data.gate.gateEvaluated).toBe(true);
    }
    // 3 of 5 bootstraps keep the reference set -> 0.6 < 0.8 -> that team is not stable.
    const unstable = evalAshapStability({
      topKPerTeamPerBootstrap: [
        [
          [0, 1],
          [0, 1],
          [0, 1],
          [2, 3],
          [4, 5],
        ],
      ],
    });
    expect(unstable.ok).toBe(true);
    if (unstable.ok) expect(unstable.data.stability).toBe(0);
  });

  it("fail-closes on misaligned groups, ragged rows and out-of-range k", () => {
    expect(evalAshapAggregate({ shap, groupOf: [7, 7] }).ok).toBe(false);
    expect(evalAshapAggregate({ shap: [[0.1, 0.2], [0.3]], groupOf: [1, 1] }).ok).toBe(false);
    expect(evalAshapAggregate({ shap, groupOf, k: 9 }).ok).toBe(false);
    expect(evalAshapAggregate({ shap: [], groupOf: [] }).ok).toBe(false);
    expect(evalAshapStability({ topKPerTeamPerBootstrap: [] }).ok).toBe(false);
    expect(
      evalAshapStability({ topKPerTeamPerBootstrap: [[[1, 0], [0.5, 1]]] }).ok,
    ).toBe(false);
  });
});

describe("experimental bridge · ITS break harness", () => {
  /** Counts with a genuine level shift AND a trend break at t = 20. */
  const brokenCounts = (): number[] => {
    const rand = lcg(20260924);
    const out: number[] = [];
    for (let t = 0; t < 40; t++) {
      const base = t < 20 ? 10 + t * 0.2 : 20 + (t - 20) * 1.0;
      out.push(Math.max(0, Math.round(base + (rand() - 0.5) * 4)));
    }
    return out;
  };

  it("normal cdf is 0.5 at the origin and 0.975 at 1.959964", () => {
    const z = evalNormalCdf({ x: 0 });
    expect(z.ok).toBe(true);
    // The module's erf is the Abramowitz-Stegun 7.1.26 approximation, whose
    // absolute error is ~5e-10, so nothing tighter than 8 decimals is honest here.
    if (z.ok) expect(z.data.cdf).toBeCloseTo(0.5, 8);
    const q = evalNormalCdf({ x: 1.959964 });
    expect(q.ok).toBe(true);
    if (q.ok) expect(q.data.cdf).toBeCloseTo(0.975, 4);
    expect(evalNormalCdf({ x: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it("detects a level shift at the true intervention", () => {
    const r = evalItsFit({ counts: brokenCounts(), breakPoint: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.breakPoint).toBe(20);
      // Post-break counts run 20..39 against a 10..14 pre-break baseline.
      expect(r.data.levelShiftBeta).toBeGreaterThan(0.3);
      expect(r.data.trendBreakBeta).toBeGreaterThan(0);
      expect(r.data.fit.pLevel).toBeLessThan(0.05);
      expect(r.data.fit.pTrend).toBeGreaterThanOrEqual(0);
      expect(r.data.fit.pTrend).toBeLessThanOrEqual(1);
      expect(r.data.fit.se.every((s) => Number.isFinite(s) && s >= 0)).toBe(true);
      expect(r.data.fit.beta).toHaveLength(4);
      // The gate is unevaluated upstream: it must be visible on every result.
      expect(r.data.gate).toBe(ITS_GATE);
      expect(r.data.gate.moduleEnabled).toBe(false);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("level scan isolates the true break from every placebo", () => {
    const candidates = [8, 12, 16, 20, 24, 28];
    const r = evalItsBreakScan({ counts: brokenCounts(), candidates, trueBreak: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.scans).toHaveLength(6);
      expect(r.data.scans.map((s) => s.point)).toEqual(candidates);
      // pLevel at the true break is the strict minimum and the only sub-0.05 one.
      const minLevel = Math.min(...r.data.scans.map((s) => s.pLevel));
      expect(r.data.trueBreakLevelP).toBe(minLevel);
      expect(r.data.trueBreakLevelP).toBeLessThan(0.05);
      expect(r.data.placeboLevelPs.every((p) => p >= 0.05)).toBe(true);
      expect(r.data.placeboLevelPs).toHaveLength(5);
      // The verdict is the module's own rule, recomputed from the returned numbers.
      const expectedVerdict =
        r.data.trueBreakTrendP < 0.05 && r.data.placeboTrendPs.every((p) => p >= 0.05)
          ? "ADOPT"
          : "REJECT";
      expect(r.data.verdict).toBe(expectedVerdict);
      expect(r.data.minTrendPScanPoint).toBeGreaterThan(0);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("fires the trend term on an exponential break, and the gate still refuses", () => {
    // Honest behaviour of the module: a ramp can mimic an exponential from almost
    // any candidate, so the placebos fire too and itsGate() returns REJECT. The
    // bridge reports that verdict; it never upgrades it.
    const rand = lcg(777);
    const counts: number[] = [];
    for (let t = 0; t < 60; t++) {
      const base = t < 30 ? 10 : 12 * 1.13 ** (t - 30);
      counts.push(Math.max(0, Math.round(base + rand() * 2)));
    }
    const r = evalItsBreakScan({ counts, candidates: [10, 20, 30, 40, 50], trueBreak: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.trueBreakTrendP).toBeLessThan(0.05);
      expect(r.data.placeboTrendPs.some((p) => p < 0.05)).toBe(true);
      expect(r.data.verdict).toBe("REJECT");
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("fail-closes on a one-sided break, a non-candidate truth and a flat series", () => {
    const counts = brokenCounts();
    expect(evalItsFit({ counts, breakPoint: 0 }).ok).toBe(false);
    expect(evalItsFit({ counts, breakPoint: counts.length }).ok).toBe(false);
    expect(evalItsFit({ counts, breakPoint: 20.5 }).ok).toBe(false);
    expect(evalItsFit({ counts, breakPoint: Number.NaN }).ok).toBe(false);
    expect(evalItsFit({ counts: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], breakPoint: 5 }).ok).toBe(false);
    expect(evalItsBreakScan({ counts, candidates: [8, 12], trueBreak: 20 }).ok).toBe(false);
    expect(evalItsBreakScan({ counts, candidates: [8, 8], trueBreak: 8 }).ok).toBe(false);
    expect(evalItsBreakScan({ counts, candidates: [1, 2, 3], trueBreak: 2 }).ok).toBe(false);
  });
});

describe("experimental bridge · nested Poisson totals", () => {
  const counts = [3, 5, 4, 7, 2, 6, 4, 8, 3, 5, 6, 4];

  it("MLE rate, dispersion and log-likelihood at the MLE", () => {
    const r = evalPoissonTotals({ counts });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.mle).toBe(57 / 12);
      // sample variance 34.25/12 over mean 4.75.
      expect(r.data.dispersionRatio).toBeCloseTo((34.25 / 12) / 4.75, 12);
      expect(r.data.logLikAtMle).toBeLessThan(0);
      expect(Number.isFinite(r.data.logLikAtMle)).toBe(true);
      expect(r.data.n).toBe(12);
      expect(r.data.gate).toBe(POISSON_GATE);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("INGARCH(1,1) filter reproduces its own recursion", () => {
    const r = evalIngarchTotals({
      counts: [2, 4, 3, 5, 1, 6],
      omega: 1,
      alpha: 0.4,
      beta: 0.3,
      lam0: 3.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // lam_0 = omega + alpha*y_0 + beta*lam_prev = 1 + 0.4*2 + 0.3*3.5
      expect(r.data.lambdas[0]).toBeCloseTo(2.85, 12);
      expect(r.data.lambdas[1]).toBeCloseTo(1 + 0.4 * 4 + 0.3 * 2.85, 12);
      expect(r.data.lambdas).toHaveLength(6);
      expect(r.data.lambdas.every((l) => Number.isFinite(l) && l > 0)).toBe(true);
      expect(Number.isFinite(r.data.logLik)).toBe(true);
    }
  });

  it("CMP with nu = 1 is the plain Poisson PMF", () => {
    const r = evalCmpPmf({ k: 4, lambda: 4, nu: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // e^-4 * 4^4 / 4!
      expect(r.data.pmf).toBeCloseTo(Math.exp(-4) * (4 ** 4) / 24, 9);
    }
    const r2 = evalCmpPmf({ k: 3, lambda: 2, nu: 1 });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.data.pmf).toBeCloseTo(Math.exp(-2) * (2 ** 3) / 6, 9);
    // A different dispersion exponent must give a different, still valid, mass.
    const r3 = evalCmpPmf({ k: 3, lambda: 2, nu: 1.5 });
    expect(r3.ok).toBe(true);
    if (r3.ok && r2.ok) {
      expect(r3.data.pmf).toBeGreaterThan(0);
      expect(r3.data.pmf).toBeLessThan(1);
    }
  });

  it("nested simulation draws the favorite rate and a conditioned underdog rate", () => {
    const r = evalNestedScoreSim({
      rand: lcg(4242),
      n: 500,
      favLambda: 3,
      coef: { b0: 0.4, b1: 0.1, b2: 0.1, b3: 0.12 },
      oppStrength: 0.5,
      loc: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fav).toHaveLength(500);
      expect(r.data.dog).toHaveLength(500);
      expect(r.data.fav.every((v) => Number.isInteger(v) && v >= 0)).toBe(true);
      expect(r.data.dog.every((v) => Number.isInteger(v) && v >= 0)).toBe(true);
      expect(r.data.favMean).toBeGreaterThan(2.4);
      expect(r.data.favMean).toBeLessThan(3.6);
      // E[dog] ~ exp(0.5) * E[exp(0.12 * fav)] with fav ~ Poisson(3).
      expect(r.data.dogMean).toBeGreaterThan(1.8);
      expect(r.data.dogMean).toBeLessThan(3.0);
      expect(r.data.combinedMean).toBeCloseTo(r.data.favMean + r.data.dogMean, 10);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("fail-closes on a flat series, a short series and an explosive coefficient", () => {
    expect(evalPoissonTotals({ counts: [4, 4, 4, 4] }).ok).toBe(false);
    expect(evalPoissonTotals({ counts: [1, 2] }).ok).toBe(false);
    expect(evalPoissonTotals({ counts: [1, 2, -3, 4] }).ok).toBe(false);
    expect(evalPoissonTotals({ counts: [1, 2, 3, 4.5] }).ok).toBe(false);
    expect(evalIngarchTotals({ counts, omega: 1, alpha: 0.6, beta: 0.5 }).ok).toBe(false);
    expect(evalIngarchTotals({ counts, omega: -1, alpha: 0.2, beta: 0.2 }).ok).toBe(false);
    expect(evalCmpPmf({ k: 4, lambda: 0, nu: 1 }).ok).toBe(false);
    expect(evalCmpPmf({ k: -1, lambda: 4, nu: 1 }).ok).toBe(false);
    expect(evalCmpPmf({ k: 4, lambda: 4, nu: 0 }).ok).toBe(false);
    expect(
      evalNestedScoreSim({
        rand: lcg(1),
        n: 10,
        favLambda: 3,
        coef: { b0: 0.4, b1: 0.1, b2: 0.1, b3: 0.12 },
        oppStrength: 0.5,
        loc: 0.5,
      }).ok,
    ).toBe(false);
    expect(
      evalNestedScoreSim({
        rand: lcg(1),
        n: 200,
        favLambda: 3,
        coef: { b0: 0.4, b1: 0.1, b2: 0.1, b3: 100 },
        oppStrength: 0.5,
        loc: 0.5,
      }).ok,
    ).toBe(false);
  });
});

describe("experimental bridge · C/F/O/V decomposition", () => {
  const games = [
    { playerId: "p1", opp: "DET", venue: "home", success: true },
    { playerId: "p1", opp: "GB", venue: "away", success: false },
    { playerId: "p1", opp: "DET", venue: "home", success: true },
    { playerId: "p1", opp: "GB", venue: "away", success: false },
    { playerId: "p1", opp: "DET", venue: "home", success: true },
    { playerId: "p1", opp: "GB", venue: "away", success: false },
    { playerId: "p1", opp: "DET", venue: "home", success: true },
  ] as const;

  it("computes each C/F/O/V rate from strictly prior games", () => {
    const r = evalCfovFeatures({ games: [...games], playerId: "p1", gameIdx: 6 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 3 successes in 6 prior games -> Laplace (3+1)/(6+2).
      expect(r.data.features.consistency).toBeCloseTo(0.5, 12);
      // last 4 prior games have 2 successes -> (2+1)/(4+2).
      expect(r.data.features.form).toBeCloseTo(0.5, 12);
      // 3 prior DET games, all successes -> (3+1)/(3+2).
      expect(r.data.features.opposition).toBeCloseTo(0.8, 12);
      expect(r.data.features.venue).toBeCloseTo(0.8, 12);
      expect(r.data.nPrior).toBe(6);
      expect(r.data.nForm).toBe(4);
      expect(r.data.nOpposition).toBe(3);
      expect(r.data.nVenue).toBe(3);
      expect(r.data.opponent).toBe("DET");
      expect(r.data.venue).toBe("home");
      expect(r.data.gate).toBe(CFOV_GATE);
      expect(r.data.gate.moduleEnabled).toBe(false);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("time-ordered evaluation scores every post-burn-in game and returns the weight vector", () => {
    const series: CfovGame[] = Array.from({ length: 40 }, (_, i) => ({
      playerId: "p1",
      opp: i % 3 === 0 ? "DET" : "GB",
      venue: (i % 2 === 0 ? "home" : "away") as CfovGame["venue"],
      success: (i * 7) % 10 < 4,
    }));
    const r = evalCfovTimeOrdered({ games: series, burnIn: 12 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.evaluatedRows).toBe(28);
      expect(r.data.burnIn).toBe(12);
      expect(r.data.weights).toHaveLength(5);
      expect(r.data.weights.every((w) => Number.isFinite(w))).toBe(true);
      expect(r.data.cfovLogLoss).toBeGreaterThan(0);
      expect(r.data.baselineLogLoss).toBeGreaterThan(0);
      expect(r.data.logLossImprovement).toBeCloseTo(
        r.data.baselineLogLoss - r.data.cfovLogLoss,
        12,
      );
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
    const shorter = evalCfovTimeOrdered({ games: series, burnIn: 20 });
    expect(shorter.ok).toBe(true);
    if (shorter.ok) expect(shorter.data.evaluatedRows).toBe(20);
  });

  it("fail-closes on a cold start, a player mismatch and a degenerate outcome balance", () => {
    expect(evalCfovFeatures({ games: [...games], playerId: "p1", gameIdx: 0 }).ok).toBe(false);
    expect(evalCfovFeatures({ games: [...games], playerId: "p2", gameIdx: 6 }).ok).toBe(false);
    // A venue outside the union is what an untyped JSON source actually produces,
    // so the adapter has to refuse it at runtime rather than at the type level.
    const badVenue = [
      { playerId: "p1", opp: "DET", venue: "roof", success: true },
    ] as unknown as CfovGame[];
    expect(evalCfovFeatures({ games: badVenue, playerId: "p1", gameIdx: 0 }).ok).toBe(false);
    const allWin = Array.from({ length: 30 }, (_, i) => ({
      playerId: "p1",
      opp: "DET",
      venue: "home" as const,
      success: true,
    }));
    expect(evalCfovTimeOrdered({ games: allWin, burnIn: 12 }).ok).toBe(false);
    expect(
      evalCfovTimeOrdered({
        games: Array.from({ length: 20 }, (_, i) => ({
          playerId: "p1",
          opp: "DET",
          venue: "home" as const,
          success: i % 2 === 0,
        })),
        burnIn: 19,
      }).ok,
    ).toBe(false);
  });
});

describe("experimental bridge · order-flow resiliency", () => {
  const trades = [
    { side: "buy", size: 6, kind: "taker", price: 0.4 },
    { side: "buy", size: 2, kind: "maker-add", price: 0.41 },
    { side: "buy", size: 4, kind: "taker", price: 0.44 },
    { side: "sell", size: 5, kind: "maker-cancel", price: 0.45 },
    { side: "sell", size: 3, kind: "taker", price: 0.46 },
    { side: "sell", size: 2, kind: "maker-add", price: 0.47 },
    { side: "buy", size: 6, kind: "taker", price: 0.48 },
    { side: "buy", size: 5, kind: "taker", price: 0.5 },
  ] as const;

  it("buckets by traded contracts, not by time", () => {
    const r = evalVolumeBuckets({ trades: [...trades], contractsPerBucket: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.buckets).toHaveLength(3);
      expect(r.data.totalVolume).toBe(33);
      expect(r.data.totalTrades).toBe(8);
      // bucket 0: 10 aggressive buys, 2 limit adds, 0.40 -> 0.44
      expect(r.data.buckets[0]?.takerImbalance).toBe(10);
      expect(r.data.buckets[0]?.makerNetFlow).toBe(2);
      expect(r.data.buckets[0]?.priceChange).toBeCloseTo(0.04, 12);
      expect(r.data.buckets[0]?.volume).toBe(12);
      // bucket 1: 3 aggressive sells, 2 adds and 5 cancels, 0.45 -> 0.47
      expect(r.data.buckets[1]?.takerImbalance).toBe(-3);
      expect(r.data.buckets[1]?.makerNetFlow).toBe(-3);
      expect(r.data.buckets[1]?.priceChange).toBeCloseTo(0.02, 12);
      expect(r.data.buckets[1]?.volume).toBe(10);
      // bucket 2: 11 aggressive buys, no maker flow, 0.48 -> 0.50
      expect(r.data.buckets[2]?.takerImbalance).toBe(11);
      expect(r.data.buckets[2]?.makerNetFlow).toBe(0);
      expect(r.data.buckets[2]?.priceChange).toBeCloseTo(0.02, 12);
      expect(r.data.buckets[2]?.volume).toBe(11);
      expect(r.data.buckets.reduce((s, b) => s + b.volume, 0)).toBe(33);
      expect(r.data.gate).toBe(ORDER_FLOW_GATE);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("recovers exact taker and maker betas on a noiseless flow series", () => {
    // priceChange = 0.001 * takerImbalance + 0.002 * makerNetFlow, by construction.
    const buckets = [
      { takerImbalance: 10, makerNetFlow: 4, priceChange: 0.018, volume: 10 },
      { takerImbalance: 10, makerNetFlow: -4, priceChange: 0.002, volume: 10 },
      { takerImbalance: -10, makerNetFlow: 4, priceChange: -0.002, volume: 10 },
      { takerImbalance: -10, makerNetFlow: -4, priceChange: -0.018, volume: 10 },
      { takerImbalance: 10, makerNetFlow: 4, priceChange: 0.018, volume: 10 },
      { takerImbalance: -10, makerNetFlow: -4, priceChange: -0.018, volume: 10 },
    ];
    const r = evalResiliencyRegression({ buckets });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fit.betaTaker).toBeCloseTo(0.001, 9);
      expect(r.data.fit.betaMaker).toBeCloseTo(0.002, 9);
      expect(r.data.fit.intercept).toBeCloseTo(0, 9);
      expect(r.data.fit.rSquared).toBeCloseTo(1, 9);
      expect(r.data.fit.residSd).toBeCloseTo(0, 9);
      expect(r.data.fit.n).toBe(6);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
  });

  it("steam detector fires on one-sided taker flow with fading maker flow", () => {
    const buckets = [
      { takerImbalance: -3, makerNetFlow: 2, priceChange: -0.007, volume: 10 },
      { takerImbalance: 4, makerNetFlow: -1, priceChange: 0.012, volume: 10 },
      { takerImbalance: 5, makerNetFlow: -2, priceChange: 0.018, volume: 10 },
      { takerImbalance: 6, makerNetFlow: -3, priceChange: 0.02, volume: 10 },
    ];
    const steam = evalSteamSignal({ buckets, lookback: 3 });
    expect(steam.ok).toBe(true);
    if (steam.ok) {
      expect(steam.data.steam).toBe(true);
      expect(steam.data.lookback).toBe(3);
      expect(steam.data.gate.gateEvaluated).toBe(false);
    }
    // Same one-sided taker flow, but makers are adding, so nothing is steaming.
    const added = buckets.map((b, i) =>
      i >= 1 ? { ...b, makerNetFlow: Math.abs(b.makerNetFlow) } : b,
    );
    const noSteam = evalSteamSignal({ buckets: added, lookback: 3 });
    expect(noSteam.ok).toBe(true);
    if (noSteam.ok) expect(noSteam.data.steam).toBe(false);
  });

  it("scarce-liquidity flag matches the residual rule it reports", () => {
    const buckets = [
      { takerImbalance: 12, makerNetFlow: -4, priceChange: 0.03, volume: 20 },
      { takerImbalance: 8, makerNetFlow: -2, priceChange: 0.02, volume: 20 },
      { takerImbalance: -10, makerNetFlow: 3, priceChange: -0.025, volume: 20 },
      { takerImbalance: -6, makerNetFlow: 5, priceChange: -0.015, volume: 20 },
      { takerImbalance: 5, makerNetFlow: -1, priceChange: 0.012, volume: 20 },
      { takerImbalance: -3, makerNetFlow: 2, priceChange: 0.02, volume: 20 },
    ];
    const r = evalScarceLiquidity({ buckets, index: 5, thresholdSd: 1.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.index).toBe(5);
      expect(r.data.residSd).toBeGreaterThan(0);
      expect(r.data.residual).toBeGreaterThan(0);
      expect(r.data.flag).toBe(r.data.residual > 1.5 * r.data.residSd);
      expect(r.data.flag).toBe(true);
      expect(r.data.predicted).not.toBeCloseTo(0.02, 12);
      expect(r.data.gate.gateEvaluated).toBe(false);
    }
    const quiet = evalScarceLiquidity({ buckets, index: 0, thresholdSd: 1.5 });
    expect(quiet.ok).toBe(true);
    if (quiet.ok) expect(quiet.data.flag).toBe(false);
  });

  it("fail-closes on too few buckets, a singular design and bad prices", () => {
    const buckets = [
      { takerImbalance: 10, makerNetFlow: 4, priceChange: 0.018, volume: 10 },
      { takerImbalance: 10, makerNetFlow: 4, priceChange: 0.019, volume: 10 },
    ];
    expect(evalVolumeBuckets({ trades: [...trades], contractsPerBucket: 100 }).ok).toBe(false);
    expect(evalVolumeBuckets({ trades: [], contractsPerBucket: 10 }).ok).toBe(false);
    expect(
      evalVolumeBuckets({
        trades: [{ side: "buy", size: 1, kind: "taker", price: 1.4 }],
        contractsPerBucket: 1,
      }).ok,
    ).toBe(false);
    // too few buckets for a two-regressor fit
    expect(evalResiliencyRegression({ buckets }).ok).toBe(false);
    // no spread in the regressors
    expect(
      evalResiliencyRegression({
        buckets: [
          { takerImbalance: 5, makerNetFlow: 1, priceChange: 0.01, volume: 10 },
          { takerImbalance: 5, makerNetFlow: 1, priceChange: 0.02, volume: 10 },
          { takerImbalance: 5, makerNetFlow: 1, priceChange: 0.03, volume: 10 },
          { takerImbalance: 5, makerNetFlow: 1, priceChange: 0.04, volume: 10 },
        ],
      }).ok,
    ).toBe(false);
    expect(evalSteamSignal({ buckets, lookback: 9 }).ok).toBe(false);
    expect(evalScarceLiquidity({ buckets, index: 0 }).ok).toBe(false);
  });
});
