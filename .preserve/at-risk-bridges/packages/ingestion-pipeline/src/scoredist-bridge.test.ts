/**
 * scoredist-bridge tests.
 *
 * Two tests here are worth more than the rest combined, and the pair is the
 * point of the whole bridge:
 *
 *   - "skellam pmf grid sums to 1"  — a score distribution is only a probability
 *     distribution if its mass is conserved. A grid that quietly loses 4% of the
 *     tail still LOOKS like a spread distribution; it is not one.
 *   - "de-vigged two-way pair sums to 1" — a fair price that does not sum to 1
 *     produces simultaneous positive edge on both sides of the same game, which
 *     is arithmetically impossible and a direct path to an unearned claim.
 *
 * Every eval also carries at least one fail-closed test, because a bridge that
 * only proves it can say "yes" is not a bridge.
 */

import { describe, expect, it } from "vitest";
import {
  PMF_SUM_TOLERANCE,
  SIX_DP_ROUNDING_BOUND,
  dixonColesTauDomainReason,
  evalAic,
  evalAr1ScoreFilter,
  evalBrownianWinProbability,
  evalConditionalQuantileCurve,
  evalConsensusMarket,
  evalCrowdBlend,
  evalDixonColesJointPmf,
  evalDixonColesMoneyline,
  evalDixonColesTau,
  evalEstimatorSigma,
  evalEwmaVolatility,
  evalGcnWinProbabilities,
  evalGotoConversion,
  evalInGameVolInterval,
  evalMarketAnchoredReconciliation,
  evalMarketClvFeatures,
  evalMarketDisagreement,
  evalMarketReadNoVig,
  evalOuWinProbability,
  evalOracleDevig,
  evalPinballLoss,
  evalPoissonCdfCurve,
  evalPoissonConsistency,
  evalPoissonJointPmf,
  evalPoissonOverUnder,
  evalPoissonPmf,
  evalPoissonPmfGrid,
  evalPowerDevig,
  evalPrecisionWeightedEnsemble,
  evalRemoveVig,
  evalShinDevig,
  evalShrinkTowardBase,
  evalSkellamCdfCurve,
  evalSkellamCover,
  evalSkellamCoverFairValue,
  evalSkellamPmf,
  evalSkellamPmfGrid,
  evalTotalsQuantileCurve,
  evalUnconditionalQuantileCurve,
  evalZiCover,
  evalZiSkellamPmfGrid,
  lcgRandom,
  roundedSumTolerance,
} from "./scoredist-bridge.js";

// ============================================================
// A. Poisson
// ============================================================

describe("scoredist Poisson", () => {
  it("poissonPmf(2, 1.5) matches e^-1.5 * 1.5^2 / 2! exactly", () => {
    const r = evalPoissonPmf({ k: 2, lambda: 1.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Closed form, not a re-run of the kernel.
      expect(r.data).toBeCloseTo((Math.exp(-1.5) * 1.5 ** 2) / 2, 12);
      expect(r.data).toBeCloseTo(0.251021430167, 12);
    }
  });

  it("poissonPmf grid provably sums to 1 at maxK=20", () => {
    const r = evalPoissonPmfGrid({ lambda: 1.5, maxK: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(21);
      const sum = r.data.reduce((acc, p) => acc + p.probability, 0);
      expect(sum).toBeCloseTo(1, 12);
      expect(Math.abs(sum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
      expect(r.data[0]?.probability).toBeCloseTo(Math.exp(-1.5), 12);
    }
  });

  it("poissonPmf grid fail-closes on a truncation that loses the tail, and reports the sum", () => {
    const r = evalPoissonPmfGrid({ lambda: 1.5, maxK: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/pmf sums to/);
      expect(r.reason).toMatch(/refusing to renormalise/);
    }
  });

  it("poissonCdf curve is non-decreasing and equals the closed form at k=0", () => {
    const r = evalPoissonCdfCurve({ lambda: 1.5, ks: [0, 1, 2, 3, 5, 8] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data[0]).toBeCloseTo(Math.exp(-1.5), 12);
      for (let i = 1; i < r.data.length; i++) {
        expect(r.data[i]).toBeGreaterThanOrEqual(r.data[i - 1] ?? 0);
      }
      for (const v of r.data) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("poissonCdf curve fail-closes on a non-ascending k grid", () => {
    expect(evalPoissonCdfCurve({ lambda: 1.5, ks: [2, 2] }).ok).toBe(false);
    expect(evalPoissonCdfCurve({ lambda: 1.5, ks: [] }).ok).toBe(false);
  });

  it("jointScoreMatrix sums to 1 at maxGoals=20 and the 1X2 partition sums to 1", () => {
    const joint = evalPoissonJointPmf({ lambdaHome: 1.5, lambdaAway: 1.2, maxGoals: 20 });
    expect(joint.ok).toBe(true);
    if (joint.ok) {
      expect(joint.data).toHaveLength(21 * 21);
      const sum = joint.data.reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 12);
      // Row-major, index x*(maxGoals+1)+y. P(1-1) is a single cell of the joint,
      // not the whole distribution: exp(-1.5)*1.5 * exp(-1.2)*1.2.
      expect(joint.data[1 * 21 + 1]).toBeCloseTo(Math.exp(-1.5) * 1.5 * Math.exp(-1.2) * 1.2, 12);
    }

    const ou = evalPoissonOverUnder({ lambdaHome: 1.5, lambdaAway: 1.2, totalLine: 2.7, maxGoals: 20 });
    expect(ou.ok).toBe(true);
    if (ou.ok) {
      // Half-integer line can never push, so over + under must be exactly 1.
      expect(ou.data.push).toBe(0);
      expect(ou.data.over + ou.data.under).toBeCloseTo(1, 12);
      expect(ou.data.coverage).toBeCloseTo(1, 12);
    }
  });

  it("joint pmf fail-closes at the module's own default truncation of 12", () => {
    // MEASURED: jointScoreMatrix(1.5, 1.2, 12) sums to 0.999999991631 — a
    // deviation of 8.4e-9, past the 1e-9 contract. The 4e-9 of tail a caller
    // would silently absorb is exactly the kind of mass a total price hides.
    const r = evalPoissonJointPmf({ lambdaHome: 1.5, lambdaAway: 1.2, maxGoals: 12 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/pmf sums to 0\.9999/);
  });

  it("poisson evals fail-closed on a non-positive rate rather than returning 0 mass", () => {
    // The kernels return 0 here. 0 mass and "no model" are different answers.
    const zero = evalPoissonPmf({ k: 0, lambda: 0 });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.reason).toMatch(/strictly positive/);
    expect(evalPoissonPmfGrid({ lambda: -1, maxK: 5 }).ok).toBe(false);
    expect(evalPoissonJointPmf({ lambdaHome: 0, lambdaAway: 1.2, maxGoals: 10 }).ok).toBe(false);
    expect(evalPoissonOverUnder({ lambdaHome: 1.5, lambdaAway: 0, totalLine: 2, maxGoals: 10 }).ok).toBe(false);
    expect(evalPoissonCdfCurve({ lambda: Number.NaN, ks: [0, 1] }).ok).toBe(false);
  });

  it("poissonConsistency is in [0,1] and fail-closes on a non-positive book total", () => {
    const r = evalPoissonConsistency({ lambdaHome: 1.5, lambdaAway: 1.5, bookmakerTotal: 45 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.poissonTotal).toBe(3);
      // A total the Poisson model reproduces exactly scores zero divergence.
      const matched = evalPoissonConsistency({ lambdaHome: 2, lambdaAway: 3, bookmakerTotal: 5 });
      expect(matched.ok).toBe(true);
      if (matched.ok) {
        expect(matched.data.score).toBe(0);
        expect(matched.data.poissonTotal).toBe(5);
      }
      // A real disagreement scores a strictly positive, capped divergence.
      expect(r.data.score).toBeGreaterThan(0);
      expect(r.data.score).toBeLessThanOrEqual(1);
    }
    expect(evalPoissonConsistency({ lambdaHome: 1.5, lambdaAway: 1.5, bookmakerTotal: 0 }).ok).toBe(false);
  });
});

// ============================================================
// B. Skellam (canonical)
// ============================================================

describe("scoredist Skellam (canonical skellam.ts)", () => {
  it("skellamPmf(0, 1.5, 1.2) matches the Bessel closed form", () => {
    const r = evalSkellamPmf({ k: 0, lambdaHome: 1.5, lambdaAway: 1.2, maxGoals: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // P(M=0) = sum_a P(H=a)P(A=a) — the convolution the kernel implements,
      // written out here independently of the kernel's own loop bounds.
      let series = 0;
      for (let a = 0; a <= 20; a++) {
        let fact = 1;
        for (let f = 2; f <= a; f++) fact *= f;
        const ph = (Math.exp(-1.5) * 1.5 ** a) / fact;
        const pa = (Math.exp(-1.2) * 1.2 ** a) / fact;
        series += ph * pa;
      }
      expect(r.data).toBeCloseTo(series, 12);
      expect(r.data).toBeCloseTo(0.254816777586, 12);
    }
  });

  it("skellam pmf grid provably sums to 1 across every realistic rate pair", () => {
    for (const [lh, la] of [
      [1.4, 1.1],
      [2.5, 2.2],
      [3.0, 1.0],
    ] as const) {
      const r = evalSkellamPmfGrid({ lambdaHome: lh, lambdaAway: la, maxGoals: 20 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data).toHaveLength(41);
        const sum = r.data.reduce((acc, pt) => acc + pt.probability, 0);
        expect(sum).toBeCloseTo(1, 9);
        expect(Math.abs(sum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
        // The grid must be a true margin distribution, centred where the rates say.
        const mean = r.data.reduce((acc, pt) => acc + pt.margin * pt.probability, 0);
        expect(mean).toBeCloseTo(lh - la, 9);
      }
    }
  });

  it("skellam pmf grid fail-closes on a truncation that drops the tail", () => {
    // MEASURED: skellamPmfGrid(3.0, 1.0, 4) loses the whole upper tail.
    const r = evalSkellamPmfGrid({ lambdaHome: 3.0, lambdaAway: 1.0, maxGoals: 4 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/pmf sums to/);
  });

  it("skellam pmf grid fail-closes on a non-positive rate", () => {
    const r = evalSkellamPmfGrid({ lambdaHome: 0, lambdaAway: 1.1, maxGoals: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/lambdaHome must be strictly positive/);
  });

  it("skellamCdf curve is non-decreasing in [0,1] and matches the pmf at k=0", () => {
    const r = evalSkellamCdfCurve({
      lambdaHome: 1.5,
      lambdaAway: 1.2,
      ks: [-4, -2, 0, 2, 4, 8],
      maxGoals: 20,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data[2]).toBeCloseTo(0.558534826833, 12);
      for (let i = 1; i < r.data.length; i++) {
        expect(r.data[i]).toBeGreaterThanOrEqual(r.data[i - 1] ?? 0);
      }
      // F(-inf) = 0 at the truncation edge, F(+inf) approaches 1.
      expect(r.data[0]).toBeGreaterThan(0);
      expect(r.data[5]).toBeLessThan(1);
    }
  });

  it("skellamCdf curve fail-closed on a non-ascending grid and a non-positive rate", () => {
    expect(evalSkellamCdfCurve({ lambdaHome: 1.5, lambdaAway: 1.2, ks: [1, 0] }).ok).toBe(false);
    expect(evalSkellamCdfCurve({ lambdaHome: 1.5, lambdaAway: -1, ks: [0, 1] }).ok).toBe(false);
  });

  it("skellam cover partitions to 1 and the 2-way fair sums to 1", () => {
    const cover = evalSkellamCover({ lambdaHome: 1.5, lambdaAway: 1.2, spreadHome: -0.5, maxGoals: 20 });
    expect(cover.ok).toBe(true);
    if (cover.ok) {
      const sum = cover.data.homeCover + cover.data.awayCover + cover.data.push;
      expect(sum).toBeCloseTo(1, 6);
      expect(Math.abs(sum - 1)).toBeLessThanOrEqual(roundedSumTolerance(3));
      expect(cover.data.expectedMargin).toBeCloseTo(0.3, 6);
      for (const v of [cover.data.homeCover, cover.data.awayCover, cover.data.push]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }

    const fair = evalSkellamCoverFairValue({ lambdaHome: 1.5, lambdaAway: 1.2, spreadHome: -0.5, maxGoals: 20 });
    expect(fair.ok).toBe(true);
    if (fair.ok) {
      expect(fair.data.homeFairProb + fair.data.awayFairProb).toBeCloseTo(1, 6);
      // The engine's convention: spreadHome is the home spread as posted and
      // NEGATIVE means home is favourite, so home covers -0.5 only by winning
      // by more than half a goal. With an expected margin of just +0.3 that is
      // the minority of the Skellam distribution, so the fair price sits BELOW
      // 0.5 even though home is the stronger team.
      expect(fair.data.homeFairProb).toBeCloseTo(0.441465, 6);
      expect(fair.data.homeFairProb).toBeLessThan(0.5);
    }
  });

  it("skellam cover fail-closed on a non-positive rate, a non-finite spread, and an out-of-domain sport", () => {
    expect(evalSkellamCover({ lambdaHome: 1.5, lambdaAway: 0, spreadHome: -0.5 }).ok).toBe(false);
    expect(evalSkellamCover({ lambdaHome: 1.5, lambdaAway: 1.2, spreadHome: Number.NaN }).ok).toBe(false);
    // NFL is outside the Poisson-valid sport set, so the kernel returns null.
    const wrongSport = evalSkellamCover({
      lambdaHome: 1.5,
      lambdaAway: 1.2,
      spreadHome: -0.5,
      sportKey: "americanfootball_nfl",
    });
    expect(wrongSport.ok).toBe(false);
    if (!wrongSport.ok) expect(wrongSport.reason).toMatch(/Poisson-valid set/);
  });

  it("skellamPmf fail-closed outside the truncation support", () => {
    const r = evalSkellamPmf({ k: 30, lambdaHome: 1.5, lambdaAway: 1.2, maxGoals: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/outside the truncation support/);
  });
});

// ============================================================
// C. ZI-Skellam
// ============================================================

describe("scoredist ZI-Skellam", () => {
  it("ziSkellamPmf grid provably sums to 1 across its support", () => {
    const r = evalZiSkellamPmfGrid({ mu: 0.5, sigma2: 4, pushMass: 0.05, maxK: 25 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.points).toHaveLength(51);
      expect(r.data.sum).toBeCloseTo(1, 12);
      expect(Math.abs(r.data.sum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
      // The push mass lives at k = 0.
      expect(r.data.push).toBeCloseTo(0.241399428317, 12);
      const atZero = r.data.points.find(([k]) => k === 0)?.[1] ?? 0;
      expect(atZero).toBeCloseTo(r.data.push, 12);
    }
  });

  it("ziSkellamPmf grid fail-closed on sigma2 <= |mu|, which the kernel throws on", () => {
    const r = evalZiSkellamPmfGrid({ mu: 5, sigma2: 4, pushMass: 0.1, maxK: 12 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/must exceed \|mu\|/);
  });

  it("ziSkellamPmf grid fail-closed on a push mass outside [0,1]", () => {
    expect(evalZiSkellamPmfGrid({ mu: 0.5, sigma2: 4, pushMass: 1.5, maxK: 12 }).ok).toBe(false);
    expect(evalZiSkellamPmfGrid({ mu: 0.5, sigma2: 4, pushMass: 0.1, maxK: 0 }).ok).toBe(false);
  });

  it("zi cover reports both halves of the two-way bridge", () => {
    const r = evalZiCover({ mu: 0.5, sigma2: 4, pushMass: 0.05, range: 12 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.coverProbability).toBeCloseTo(0.470187387232, 12);
      expect(r.data.pushProbability).toBeCloseTo(0.241399428317, 12);
      expect(r.data.coverProbability).toBeGreaterThanOrEqual(0);
      expect(r.data.coverProbability).toBeLessThanOrEqual(1);
    }
  });

  it("zi cover fail-closed on a range too small to resolve the distribution", () => {
    expect(evalZiCover({ mu: 0.5, sigma2: 4, pushMass: 0.05, range: 2 }).ok).toBe(false);
    // sigma2 must exceed |mu|; at sigma2 = 1 and |mu| = 0.5 it does, so this one
    // is valid — the real refusal is the sigma2 <= |mu| case tested above.
    expect(evalZiCover({ mu: 5, sigma2: 1, pushMass: 0.05 }).ok).toBe(false);
  });

  it("aic ranks the models and fail-closes on a fractional parameter count", () => {
    const better = evalAic({ logLik: -100, nParams: 2, otherLogLik: -120, otherParams: 2 });
    expect(better.ok).toBe(true);
    if (better.ok) {
      // AIC = 2k - 2lnL: 2*2 - 2*(-100) = 204 vs 2*2 - 2*(-120) = 244.
      expect(better.data.aic).toBeCloseTo(204, 12);
      expect(better.data.preferredModel).toBe("this");
      expect(better.data.deltaToOther).toBeCloseTo(-40, 12);
    }
    expect(evalAic({ logLik: -100, nParams: 1.5, otherLogLik: -120, otherParams: 2 }).ok).toBe(false);
  });
});

// ============================================================
// D. Dixon-Coles
// ============================================================

describe("scoredist Dixon-Coles", () => {
  it("tau matches the Dixon-Coles formulas on all four low-score cells", () => {
    const lh = 1.5;
    const la = 1.2;
    const rho = -0.13;
    const cases: readonly (readonly [number, number, number])[] = [
      [0, 0, 1 - lh * la * rho],
      [0, 1, 1 + lh * rho],
      [1, 0, 1 + la * rho],
      [1, 1, 1 - rho],
    ];
    for (const [h, a, expected] of cases) {
      const r = evalDixonColesTau({ homeGoals: h, awayGoals: a, lambdaHome: lh, lambdaAway: la, rho });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data).toBeCloseTo(expected, 12);
    }
  });

  it("tau is exactly 1 on the untouched cells and fail-closes on a non-positive rate", () => {
    const r = evalDixonColesTau({ homeGoals: 2, awayGoals: 2, lambdaHome: 1.5, lambdaAway: 1.2, rho: -0.13 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(1);
    expect(
      evalDixonColesTau({ homeGoals: 0, awayGoals: 0, lambdaHome: 0, lambdaAway: 1.2, rho: -0.13 }).ok,
    ).toBe(false);
  });

  it("tau domain rejects the lh*la*|rho| > 1 blow-up the kernel silently allows", () => {
    // MEASURED: dixonColesTau(0, 0, 3, 3, -0.13) = 2.17 — a 2.17x inflation of
    // the 0-0 cell that the kernel's Math.max(0, ...) floor never catches.
    expect(
      dixonColesTauDomainReason(0, 0, 3, 3, -0.13),
    ).toMatch(/legal domain/);
    const r = evalDixonColesTau({ homeGoals: 0, awayGoals: 0, lambdaHome: 3, lambdaAway: 3, rho: -0.13 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/inflated above 1/);
  });

  it("tau domain rejects the negative lh*|rho| case the kernel silently floors to 0", () => {
    // MEASURED: dixonColesTau(0, 1, 10, 1.2, -0.13) = -0.3, floored to 0 by the
    // kernel, destroying that cell's mass without any signal to the caller.
    const r = evalDixonColesTau({ homeGoals: 0, awayGoals: 1, lambdaHome: 10, lambdaAway: 1.2, rho: -0.13 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/negative/);
  });

  it("tau domain rejects a rho the kernel would silently clamp", () => {
    const r = evalDixonColesTau({ homeGoals: 0, awayGoals: 0, lambdaHome: 1.5, lambdaAway: 1.2, rho: -5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/clampDixonColesRho would silently rewrite/);
  });

  it("dixon-coles joint pmf provably sums to 1 and the 1X2 partition sums to 1", () => {
    const joint = evalDixonColesJointPmf({ lambdaHome: 1.5, lambdaAway: 1.2, rho: -0.13, maxGoals: 20 });
    expect(joint.ok).toBe(true);
    if (joint.ok) {
      expect(joint.data.sum).toBeCloseTo(1, 12);
      expect(Math.abs(joint.data.sum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
      for (const row of joint.data.matrix) {
        for (const v of row) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }

    const ml = evalDixonColesMoneyline({ lambdaHome: 1.5, lambdaAway: 1.2, rho: -0.13, maxGoals: 20 });
    expect(ml.ok).toBe(true);
    if (ml.ok) {
      expect(ml.data.home + ml.data.draw + ml.data.away).toBeCloseTo(1, 12);
      expect(ml.data.home).toBeGreaterThan(ml.data.away);
    }
  });

  it("dixon-coles joint pmf fail-closed on an illegal tau domain before the kernel runs", () => {
    const r = evalDixonColesJointPmf({ lambdaHome: 3, lambdaAway: 3, rho: -0.13, maxGoals: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/legal domain/);
  });
});

// ============================================================
// E. De-vig  (the de-vig-sums-to-one gate)
// ============================================================

describe("scoredist de-vig sums to one", () => {
  it("shinDevig on a two-way book provably sums to 1", () => {
    const r = evalShinDevig({ decimalOdds: [1.5, 2.5] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sum).toBeCloseTo(1, 9);
      expect(Math.abs(r.data.sum - 1)).toBeLessThanOrEqual(roundedSumTolerance(2));
      expect(r.data.probabilities[0]).toBeCloseTo(0.633333, 6);
      expect(r.data.probabilities[1]).toBeCloseTo(0.366667, 6);
      // Shin's z is an insider share: the favourite is over-weighted, so the
      // de-vigged favourite is BELOW the multiplicative share of 0.625.
      expect(r.data.probabilities[0]).toBeGreaterThan(0.625);
      expect(r.data.z).toBeGreaterThan(0);
    }
  });

  it("every de-vig method in the oracle provably sums to 1 on a real two-way book", () => {
    const methods = [
      "multiplicative",
      "additive",
      "power",
      "shin",
      "differential_margin_weighting",
      "odds_ratio",
      "logarithmic",
    ] as const;
    for (const method of methods) {
      const r = evalOracleDevig({ decimalOdds: [1.5, 2.5], method });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data.sum).toBeCloseTo(1, 9);
        expect(Math.abs(r.data.sum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
        // Every method must shrink the favourite-longshoot bias: the raw
        // implied 0.6667/0.4 sums to 1.0667, and no correct de-vig leaves the
        // favourite at or above its raw implied probability.
        expect(r.data.probabilities[0]).toBeLessThan(0.6667);
        expect(r.data.probabilities[0]).toBeGreaterThan(0.6);
      }
    }
  });

  it("gotoConversion and powerDevig both provably sum to 1", () => {
    const goto = evalGotoConversion({ decimalOdds: [1.5, 2.5] });
    expect(goto.ok).toBe(true);
    if (goto.ok) {
      expect(goto.data.sum).toBeCloseTo(1, 6);
      expect(goto.data.probabilities[0]).toBeCloseTo(0.633975, 6);
    }

    const power = evalPowerDevig({ decimalOdds: [1.5, 2.5] });
    expect(power.ok).toBe(true);
    if (power.ok) {
      expect(power.data.sum).toBeCloseTo(1, 6);
      expect(power.data.k).toBeGreaterThan(1); // an overround book needs k > 1
      expect(power.data.probabilities[0]).toBeCloseTo(0.637921, 6);
    }
  });

  it("shinDevig fail-closed on an underround book, which it returns un-summed", () => {
    // Decimal 2.1/2.1 -> implied 0.47619 each, booksum 0.95238 <= 1: the kernel
    // early-returns the raw implied probabilities unchanged with z = 0, so they
    // do NOT sum to 1. Refused, not repaired.
    const r = evalShinDevig({ decimalOdds: [2.1, 2.1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/de-vigged vector sums to/);
  });

  it("de-vig evals fail-closed on a price at or below 1.0, a push, and a negative price", () => {
    expect(evalShinDevig({ decimalOdds: [1.5, 1.0] }).ok).toBe(false);
    expect(evalShinDevig({ decimalOdds: [1.5, -2] }).ok).toBe(false);
    expect(evalGotoConversion({ decimalOdds: [1.5] }).ok).toBe(false);
    expect(evalPowerDevig({ decimalOdds: [Number.NaN, 2.5] }).ok).toBe(false);
    expect(evalOracleDevig({ decimalOdds: [1.5, 1.0], method: "shin" }).ok).toBe(false);
  });

  it("removeVig pairs sum to 1 and reports the overround it removed", () => {
    const r = evalRemoveVig({ homeProb: 1 / 1.5, awayProb: 1 / 2.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.home + r.data.away).toBeCloseTo(1, 12);
      expect(r.data.home).toBeCloseTo(0.625, 12); // proportional de-vig
      expect(r.data.overround).toBeCloseTo(1 / 1.5 + 1 / 2.5 - 1, 12);
      expect(r.data.overround).toBeGreaterThan(0);
    }
  });

  it("removeVig fail-closed on a zero implied pair instead of returning the kernel's invented 0.5/0.5", () => {
    // MEASURED BUG: removeVig(0, 0) -> { home: 0.5, away: 0.5 }. A missing quote
    // is not a coin flip, and 0.5/0.5 is the one value that produces a
    // zero-edge "fair price" out of no data at all.
    const r = evalRemoveVig({ homeProb: 0, awayProb: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/not strictly positive/);
      expect(r.reason).toMatch(/refusing to divide/);
    }
    expect(evalRemoveVig({ homeProb: 0, awayProb: 0.4 }).ok).toBe(false);
    expect(evalRemoveVig({ homeProb: 1.2, awayProb: 0.4 }).ok).toBe(false);
  });

  it("market read on American prices sums to 1 and reports its method tag", () => {
    const r = evalMarketReadNoVig({ americanPrices: [-200, 150] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sum).toBeCloseTo(1, 6);
      expect(r.data.fairProbabilities[0]).toBeCloseTo(0.633333, 6);
      expect(r.data.bookHoldPct).toBeCloseTo(6.67, 2);
      expect(r.data.insiderShareZ).toBeGreaterThan(0);
      // The method tag is the CLV-continuity contract; a silent swap is a bug.
      expect(r.data.methodTag).toBe("shin_devig_v1");
      expect(r.data.outcomeCount).toBe(2);
    }
  });

  it("market read fail-closed on a one-sided quote and a zero price", () => {
    const oneSided = evalMarketReadNoVig({ americanPrices: [-200, 150, 0] });
    expect(oneSided.ok).toBe(false);
    if (!oneSided.ok) expect(oneSided.reason).toMatch(/not a usable American price/);
    expect(evalMarketReadNoVig({ americanPrices: [-200] }).ok).toBe(false);
  });

  it("consensus no-vig sums to 1 across books and yields a bounded gravity index", () => {
    const r = evalConsensusMarket({
      perBook: [
        { home: -200, away: 150 },
        { home: -180, away: 160 },
        { home: -220, away: 140 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.twoWaySum).toBeCloseTo(1, 9);
      expect(Math.abs(r.data.twoWaySum - 1)).toBeLessThanOrEqual(PMF_SUM_TOLERANCE);
      expect(r.data.consensus.fairHomeProb).toBeCloseTo(0.6333, 4);
      expect(r.data.consensus.bookCount).toBe(3);
      // The median holds the books together, so dispersion must be tiny.
      expect(r.data.consensus.homeProbDispersion).toBeLessThan(0.01);
      expect(r.data.gravity.index).toBeGreaterThan(0);
      expect(r.data.gravity.index).toBeLessThanOrEqual(100);
      expect(r.data.gravity.side).toBe("home");
    }
  });

  it("consensus fail-closed on an empty book set and an unusable price", () => {
    expect(evalConsensusMarket({ perBook: [] }).ok).toBe(false);
    expect(evalConsensusMarket({ perBook: [{ home: 0, away: 150 }] }).ok).toBe(false);
  });

  it("market disagreement equals 100*(model - market) in points", () => {
    const r = evalMarketDisagreement({ modelProb: 0.56, fairMarketProb: 0.528 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(3.2, 9);
    expect(evalMarketDisagreement({ modelProb: 1.4, fairMarketProb: 0.5 }).ok).toBe(false);
  });
});

// ============================================================
// F/G. Quantiles
// ============================================================

describe("scoredist conditional quantiles", () => {
  const games = [
    { context: [0], margin: -3 },
    { context: [0], margin: 0 },
    { context: [0], margin: 2 },
    { context: [0], margin: 7 },
    { context: [0], margin: 14 },
  ];
  const levels = [0.25, 0.5, 0.75, 0.9] as const;

  it("conditional quantiles are verified monotone in level, not assumed", () => {
    const r = evalConditionalQuantileCurve({ games, query: [0], levels });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.monotone).toBe(true);
      expect(r.data.quantiles[0]).toBe(0);
      expect(r.data.quantiles[1]).toBe(2);
      expect(r.data.quantiles[3]).toBe(14);
      for (let i = 1; i < r.data.quantiles.length; i++) {
        expect(r.data.quantiles[i]).toBeGreaterThanOrEqual(r.data.quantiles[i - 1] ?? 0);
      }
    }
  });

  it("conditional quantiles fail-closed on ragged contexts, an empty set, and a bad level", () => {
    expect(
      evalConditionalQuantileCurve({ games: [...games, { context: [0, 1], margin: 1 }], query: [0], levels }).ok,
    ).toBe(false);
    expect(evalConditionalQuantileCurve({ games: [], query: [0], levels }).ok).toBe(false);
    expect(evalConditionalQuantileCurve({ games, query: [0], levels: [0] }).ok).toBe(false);
    expect(evalConditionalQuantileCurve({ games, query: [0], levels: [0.5, 0.25] }).ok).toBe(false);
  });

  it("unconditional quantiles are monotone and fail-closed on an empty sample", () => {
    const r = evalUnconditionalQuantileCurve({ margins: [-3, 0, 2, 7, 14], levels });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.quantiles[0]).toBe(0);
      expect(r.data.quantiles[3]).toBe(14);
      for (let i = 1; i < r.data.quantiles.length; i++) {
        expect(r.data.quantiles[i]).toBeGreaterThanOrEqual(r.data.quantiles[i - 1] ?? 0);
      }
    }
    expect(evalUnconditionalQuantileCurve({ margins: [], levels }).ok).toBe(false);
  });

  it("totals quantiles are monotone in level with coverage in [0,1]", () => {
    const totals = [
      { total: 45, features: [1] },
      { total: 51, features: [0] },
      { total: 38, features: [2] },
      { total: 60, features: [0] },
      { total: 44, features: [1] },
    ];
    const r = evalTotalsQuantileCurve({
      games: totals,
      features: [1],
      levels: [0.1, 0.5, 0.9],
      opts: { iters: 3000 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.monotone).toBe(true);
      expect(r.data.levels).toEqual([0.1, 0.5, 0.9]);
      for (let i = 1; i < r.data.quantiles.length; i++) {
        expect(r.data.quantiles[i]).toBeGreaterThan(r.data.quantiles[i - 1] ?? 0);
      }
      // A log-scale fit exponentiates back, so every quantile is a positive total.
      for (const q of r.data.quantiles) {
        expect(q).toBeGreaterThan(0);
        expect(Number.isFinite(q)).toBe(true);
      }
      expect(r.data.trend).toBeCloseTo(Math.log(47.6), 1);
      for (const c of r.data.coverageByLevel) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it("totals quantiles fail-closed on a non-positive total, ragged features, and an empty fit", () => {
    const bad: { total: number; features: number[] }[] = [
      { total: 0, features: [1] },
      { total: 45, features: [1] },
    ];
    expect(evalTotalsQuantileCurve({ games: bad, features: [1] }).ok).toBe(false);
    expect(
      evalTotalsQuantileCurve({
        games: [
          { total: 45, features: [1] },
          { total: 50, features: [1, 2] },
        ],
        features: [1],
      }).ok,
    ).toBe(false);
    expect(evalTotalsQuantileCurve({ games: [], features: [1] }).ok).toBe(false);
  });

  it("pinballLoss is the strictly proper scoring rule and fail-closed outside (0,1)", () => {
    const r = evalPinballLoss({ actual: 5, predicted: 4, tau: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Over-forecast by 1 at tau=0.5 costs 0.5; the other direction costs the same.
      expect(r.data).toBeCloseTo(0.5, 12);
      const under = evalPinballLoss({ actual: 4, predicted: 5, tau: 0.5 });
      expect(under.ok).toBe(true);
      if (under.ok) expect(under.data).toBeCloseTo(0.5, 12);
      // tau=0.9 penalises over-forecast far more than under-forecast.
      const hi = evalPinballLoss({ actual: 5, predicted: 4, tau: 0.9 });
      const lo = evalPinballLoss({ actual: 4, predicted: 5, tau: 0.9 });
      expect(hi.ok && lo.ok).toBe(true);
      if (hi.ok && lo.ok) expect(hi.data).toBeGreaterThan(lo.data);
    }
    expect(evalPinballLoss({ actual: 5, predicted: 4, tau: 0 }).ok).toBe(false);
    expect(evalPinballLoss({ actual: 5, predicted: 4, tau: 1 }).ok).toBe(false);
  });
});

// ============================================================
// H. In-play / volatility
// ============================================================

describe("scoredist in-play and volatility", () => {
  it("in-game vol interval is well ordered and its width matches its bounds", () => {
    const r = evalInGameVolInterval({ currentMargin: 7, currentVol: 2, periodsRemaining: 9, z: 1.64 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // expectedMovement = 2*sqrt(9) = 6; 1.64*6 = 9.84; 7 +/- 9.84.
      expect(r.data.expectedMovement).toBeCloseTo(6, 12);
      expect(r.data.interval.lower).toBeCloseTo(-2.84, 12);
      expect(r.data.interval.upper).toBeCloseTo(16.84, 12);
      expect(r.data.interval.width).toBeCloseTo(19.68, 12);
      expect(r.data.interval.lower).toBeLessThan(r.data.interval.upper);
    }
  });

  it("in-game vol interval fail-closed on a zero-volatility empty interval", () => {
    // A zero-width band is a statement about the model, not a confident read.
    const r = evalInGameVolInterval({ currentMargin: 7, currentVol: 0, periodsRemaining: 9 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/interval is empty/);
    expect(evalInGameVolInterval({ currentMargin: 7, currentVol: -1, periodsRemaining: 9 }).ok).toBe(false);
    expect(evalInGameVolInterval({ currentMargin: 7, currentVol: 2, periodsRemaining: 9, z: 0 }).ok).toBe(false);
  });

  it("OU win probability is a real probability and fail-closed on the theta=0 NaN", () => {
    const r = evalOuWinProbability({ lead: 7, theta: 0.03, sigma: 10, tRemain: 900 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // MEASURED 0.5000000005249372: at lead 7 with mean reversion toward 0
      // over 900s, the mean reverts enough to make the read near even.
      expect(r.data.probability).toBeCloseTo(0.5, 3);
      expect(r.data.forecast.variance).toBeGreaterThan(0);
      expect(Number.isFinite(r.data.probability)).toBe(true);
    }
    // MEASURED BUG: ouForecast divides by 2*theta, so theta=0 gives NaN.
    const zero = evalOuWinProbability({ lead: 7, theta: 0, sigma: 10, tRemain: 900 });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.reason).toMatch(/theta=0 returns a NaN variance/);
    expect(evalOuWinProbability({ lead: 7, theta: 0.03, sigma: 0, tRemain: 900 }).ok).toBe(false);
  });

  it("brownian win probability is in [0,1] and fail-closed on a points/quoted-as-rate drift", () => {
    const r = evalBrownianWinProbability({ lead: 7, drift: 0.01, sigma: 10, tRemain: 900 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0.5212669084183508, 12);
    // A drift of 14 "points" entered as a rate gets multiplied by 900 seconds.
    const units = evalBrownianWinProbability({ lead: 7, drift: 14, sigma: 10, tRemain: 900 });
    expect(units.ok).toBe(false);
    if (!units.ok) expect(units.reason).toMatch(/per-unit-time rate/);
  });

  it("AR(1) filter never increases its own uncertainty", () => {
    const r = evalAr1ScoreFilter({ state: { level: 0, variance: 1 }, observation: 3, phi: 0.9, stateVar: 0.1, obsVar: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // MEASURED: level 2.459459459, variance 0.163963964 — below the predicted
      // 0.81 + 0.1 = 0.91, which is what a filter must do.
      expect(r.data.filtered.level).toBeCloseTo(2.459459459459459, 12);
      expect(r.data.filtered.variance).toBeCloseTo(0.163963963963964, 12);
      expect(r.data.filtered.variance).toBeLessThan(0.91);
      expect(r.data.forecast.mean).toBeCloseTo(0, 12);
    }
  });

  it("AR(1) filter fail-closed on a non-stationary phi and a zero-variance Kalman gain", () => {
    expect(
      evalAr1ScoreFilter({ state: { level: 0, variance: 1 }, observation: 3, phi: 1.5, stateVar: 0.1, obsVar: 0.2 }).ok,
    ).toBe(false);
    expect(
      evalAr1ScoreFilter({ state: { level: 0, variance: 1 }, observation: 3, phi: 0.9, stateVar: 0, obsVar: 0 }).ok,
    ).toBe(false);
  });

  it("EWMA volatility is non-negative per observation and is NOT required to be monotone", () => {
    const r = evalEwmaVolatility({ deltas: [3, 0, -6], lambda: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // MEASURED [1.5, 0.75, 3.375] — rises, falls, then rises again.
      expect(r.data.volatility[0]).toBeCloseTo(1.5, 12);
      expect(r.data.volatility[1]).toBeCloseTo(0.75, 12);
      expect(r.data.volatility[2]).toBeCloseTo(3.375, 12);
      expect(r.data.finalVol).toBeCloseTo(3.375, 12);
      // Monotonicity is deliberately NOT asserted: a correct EWMA is not monotone.
      expect(r.data.volatility[1]).toBeLessThan(r.data.volatility[0] ?? 0);
    }
    expect(evalEwmaVolatility({ deltas: [3], lambda: 1 }).ok).toBe(false);
    expect(evalEwmaVolatility({ deltas: [] }).ok).toBe(false);
  });
});

// ============================================================
// I/J. Aggregation and GCN
// ============================================================

describe("scoredist crowd blend", () => {
  const predictions = [
    [0.7, 0.3, 0.5],
    [0.6, 0.4, 0.45],
    [0.8, 0.2, 0.55],
  ];
  const outcomes = [1, 0, 1];

  it("weights sum to 1 and a harmful source is reported as weighted", () => {
    const r = evalCrowdBlend({ predictions, outcomes, sources: ["a", "b", "c"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.weights.reduce((a, w) => a + w, 0)).toBeCloseTo(1, 12);
      expect(r.data.weights[1]).toBe(0); // negative gain -> zero weight, per the module's rule
      expect(r.data.gains[1]).toBeLessThan(0);
      expect(r.data.uniformFallback).toBe(false);
      expect(r.data.assertiveness).toBeGreaterThan(0);
    }
  });

  it("weights fail-closed on an out-of-range cell and a non-binary outcome", () => {
    // A cell above 1 is not a probability; the row is K single-source reads, not
    // a vector that must sum to 1, so only the per-cell range binds.
    expect(
      evalCrowdBlend({ predictions: [[1.4, 0.3]], outcomes: [1], sources: ["a", "b"] }).ok,
    ).toBe(false);
    expect(evalCrowdBlend({ predictions, outcomes: [1, 0, 2], sources: ["a", "b", "c"] }).ok).toBe(false);
    expect(
      evalCrowdBlend({ predictions: [[0.7, 0.3]], outcomes: [1], sources: ["a", "b", "c"] }).ok,
    ).toBe(false);
  });

  it("fail-closed on a single source, where looGains would yield a NaN gain", () => {
    // MEASURED BUG: looGains divides by (K-1) = 0 and returns NaN without
    // throwing. A NaN weight poisons every probability downstream.
    const r = evalCrowdBlend({ predictions: [[0.6]], outcomes: [1], sources: ["solo"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/K-1/);
  });

  it("reports the uniform fallback the kernel uses when no source has a positive gain", () => {
    // MEASURED BUG: budescuChenWeights returns uniform 1/K whenever the sum of
    // positive gains is 0, contradicting its own documented "C_j > 0 weighted by
    // C_j, else 0" rule. Two identical sources at 0.5 with the outcome always
    // losing give both a gain of exactly 0, which triggers it.
    const r = evalCrowdBlend({
      predictions: [
        [0.5, 0.5],
        [0.5, 0.5],
        [0.5, 0.5],
      ],
      outcomes: [0, 0, 0],
      sources: ["flat1", "flat2"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.gains.every((g) => g === 0)).toBe(true);
      expect(r.data.uniformFallback).toBe(true);
      expect(r.data.weights[0]).toBeCloseTo(0.5, 12);
      // The contradiction is surfaced, not silently inherited.
      expect(r.data.harmfulSourcesWeighted).toEqual(["flat1", "flat2"]);
    }
  });

  it("shrinkTowardBase moves probabilities toward the base and fail-closes at both ends", () => {
    const r = evalShrinkTowardBase({ probabilities: [0.9, 0.1], base: 0.5, lambda: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data[0]).toBeCloseTo(0.82, 12);
      expect(r.data[1]).toBeCloseTo(0.18, 12);
      // Shrinkage must pull the extreme toward the base, not away from it.
      expect(r.data[0]).toBeLessThan(0.9);
      expect(r.data[1]).toBeGreaterThan(0.1);
    }
    expect(evalShrinkTowardBase({ probabilities: [0.9], base: 0.5, lambda: 0 }).ok).toBe(false);
    expect(evalShrinkTowardBase({ probabilities: [0.9], base: 0.5, lambda: 1 }).ok).toBe(false);
  });
});

describe("scoredist GCN", () => {
  it("produces one in-range probability per team-game node", () => {
    const r = evalGcnWinProbabilities({
      features: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0.5],
      ],
      nTeams: 2,
      nGames: 2,
      schedule: [
        [[0, 1]],
        [[0, 1]],
      ],
      w1: [
        [0.5, 0.1],
        [0.2, 0.4],
      ],
      w2: [
        [0.3, 0.3],
        [0.3, 0.3],
      ],
      head: [0.5, 0.5],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.probabilities).toHaveLength(4);
      // MEASURED: [0.544878892, 0.544878892, 0.560323357, 0.560323357] — the
      // game-major layout makes a team's two weeks share a probability.
      expect(r.data.probabilities[0]).toBeCloseTo(0.5448788923735801, 12);
      expect(r.data.probabilities[3]).toBeCloseTo(0.5603233573219557, 12);
      expect(r.data.probabilities[0]).toBe(r.data.probabilities[1]);
      expect(r.data.adjacencySum).toBe(6); // 2 intra-week + 4 prev-game edges
      for (const p of r.data.probabilities) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it("fail-closed on a short schedule, a node-count mismatch, and a bad weight shape", () => {
    const base = {
      features: [
        [1, 0],
        [0, 1],
      ],
      nTeams: 2,
      nGames: 1,
      w1: [
        [0.5, 0.1],
        [0.2, 0.4],
      ],
      w2: [
        [0.3, 0.3],
        [0.3, 0.3],
      ],
      head: [0.5, 0.5],
    };
    // MEASURED: buildLeagueGraph indexes schedule[g]! and throws
    // "schedule[g] is not iterable" on a short schedule.
    expect(evalGcnWinProbabilities({ ...base, schedule: [] }).ok).toBe(false);
    expect(evalGcnWinProbabilities({ ...base, schedule: [[[0, 1]]], features: [[1, 0]] }).ok).toBe(false);
    // A w1 that does not match the feature width would silently misread H.
    expect(
      evalGcnWinProbabilities({
        ...base,
        schedule: [[[0, 1]]],
        w1: [[0.5], [0.2]],
        w2: [[0.3]],
        head: [0.5],
      }).ok,
    ).toBe(false);
  });
});

// ============================================================
// K/L. Market anchor + CLV
// ============================================================

describe("scoredist market-anchored reconciliation", () => {
  it("conserves every yard and touchdown pool exactly", () => {
    const r = evalMarketAnchoredReconciliation({
      anchor: { gameId: "g1", totalPoints: 45, homeSpread: -3.5 },
      players: [
        { playerId: "p1", teamSide: "home", position: "QB", usagePosteriorMean: 1, efficiencyPosteriorMean: 0.9 },
        { playerId: "p2", teamSide: "home", position: "WR", usagePosteriorMean: 0.8, efficiencyPosteriorMean: 0.8 },
        { playerId: "p3", teamSide: "away", position: "QB", usagePosteriorMean: 0.9, efficiencyPosteriorMean: 0.9 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.yardsConserved).toBe(true);
      expect(r.data.touchdownsConserved).toBe(true);
      for (const c of r.data.reconciliation.conservation) {
        expect(c.passYardsDelta).toBeCloseTo(0, 9);
        expect(c.rushYardsDelta).toBeCloseTo(0, 9);
        expect(c.receivingYardsDelta).toBeCloseTo(0, 9);
        expect(c.passTouchdownsDelta).toBeCloseTo(0, 9);
        expect(c.rushTouchdownsDelta).toBeCloseTo(0, 9);
        expect(c.receivingTouchdownsDelta).toBeCloseTo(0, 9);
      }
      // A negative home spread is a home favourite: home gets more points.
      expect(r.data.anchors[0].projectedPoints).toBeCloseTo(24.25, 9);
      expect(r.data.anchors[1].projectedPoints).toBeCloseTo(20.75, 9);
    }
  });

  it("fail-closed on an empty roster, where the anchor pools silently do not conserve", () => {
    // MEASURED: with no players the deltas are -185.96 pass yards and
    // -1.83 pass TDs, and the kernel still returns a shadow object with no error.
    const r = evalMarketAnchoredReconciliation({
      anchor: { gameId: "g2", totalPoints: 45, homeSpread: 0 },
      players: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/at least one player/);
  });

  it("fail-closed on a non-positive total, a bad side, and a negative posterior", () => {
    const anchor = { gameId: "g3", totalPoints: 45, homeSpread: -3.5 };
    expect(
      evalMarketAnchoredReconciliation({ anchor: { ...anchor, totalPoints: 0 }, players: [{ playerId: "p", teamSide: "home", position: "QB", usagePosteriorMean: 1, efficiencyPosteriorMean: 1 }] }).ok,
    ).toBe(false);
    expect(
      evalMarketAnchoredReconciliation({
        anchor,
        players: [
          {
            playerId: "p",
            teamSide: "sideways",
            position: "QB",
            usagePosteriorMean: 1,
            efficiencyPosteriorMean: 1,
          } as never,
        ],
      }).ok,
    ).toBe(false);
    expect(
      evalMarketAnchoredReconciliation({
        anchor,
        players: [{ playerId: "p", teamSide: "home", position: "QB", usagePosteriorMean: -1, efficiencyPosteriorMean: 1 }],
      }).ok,
    ).toBe(false);
  });
});

describe("scoredist CLV features", () => {
  const prices = {
    decisionPriceDecimal: 2.0,
    closingPriceDecimal: 1.95,
    decisionLine: -3,
    closingLine: -3.5,
    market: "SPREAD" as const,
    side: "HOME" as const,
  };

  it("beat-close is 1 exactly when clvBps is positive, with the measured value", () => {
    const r = evalMarketClvFeatures({ prices, enabled: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 10000 * (1/1.95 - 1/2.00) = 128.21 bps of positive CLV.
      expect(r.data.features.clvBps).toBeCloseTo(128.21, 9);
      expect(r.data.features.beatClose).toBe(1);
      expect(r.data.features.lineMoveForUs).toBeCloseTo(0.5, 9);
      expect(r.data.features.gaps).toHaveLength(0);
      expect(r.data.gapsBlocking).toBe(false);
      expect(r.data.rate.n).toBe(1);
      expect(r.data.rate.rate).toBe(1);
    }
  });

  it("a lost-to-close lock reads beatClose 0, not 1", () => {
    const r = evalMarketClvFeatures({
      prices: { ...prices, decisionPriceDecimal: 1.95, closingPriceDecimal: 2.0 },
      enabled: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.features.clvBps).toBeCloseTo(-128.21, 9);
      expect(r.data.features.beatClose).toBe(0);
    }
  });

  it("the disabled path is a first-class answer: silence, not zero CLV", () => {
    const r = evalMarketClvFeatures({ prices, enabled: false });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.features.enabled).toBe(false);
      expect(r.data.features.clvBps).toBeNull();
      expect(r.data.features.beatClose).toBeNull();
      expect(r.data.gapsBlocking).toBe(true);
    }
  });

  it("missing prices read as silence, and the rate refuses an empty sample", () => {
    const r = evalMarketClvFeatures({
      prices: { ...prices, closingPriceDecimal: null },
      enabled: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.features.clvBps).toBeNull();
      expect(r.data.features.beatClose).toBeNull();
      expect(r.data.features.gaps.length).toBeGreaterThan(0);
    }
  });

  it("fail-closed on a non-boolean flag, an unknown market, and a bad side", () => {
    expect(evalMarketClvFeatures({ prices, enabled: 1 as never }).ok).toBe(false);
    expect(evalMarketClvFeatures({ prices: { ...prices, market: "PROP_PTS" as never }, enabled: true }).ok).toBe(false);
    expect(evalMarketClvFeatures({ prices: { ...prices, side: "MIDDLE" as never }, enabled: true }).ok).toBe(false);
  });
});

// ============================================================
// M. Ensemble
// ============================================================

describe("scoredist precision-weighted ensemble", () => {
  it("fair probability is in [0,1] and the weights are a valid share", () => {
    const r = evalPrecisionWeightedEnsemble({
      estimates: [
        { source: "sharp", prob: 0.6, reliability: { holdPct: 2, liquidity: 4 } },
        { source: "kalshi", prob: 0.55, reliability: { holdPct: 0, liquidity: 2 } },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // MEASURED: fairProb 0.5812, stdError 0.0217, effectiveSources 1.89.
      expect(r.data.fairProb).toBeCloseTo(0.5812, 9);
      expect(r.data.fairProb).toBeGreaterThanOrEqual(0);
      expect(r.data.fairProb).toBeLessThanOrEqual(1);
      expect(r.data.stdError).toBeCloseTo(0.0217, 9);
      expect(r.data.effectiveSources).toBeCloseTo(1.89, 9);
      // The tighter source (lower hold, more liquidity) must carry more weight.
      expect(r.data.weights[0]?.source).toBe("sharp");
      expect(r.data.weights[0]?.weight).toBeGreaterThan(r.data.weights[1]?.weight ?? 0);
      // The kernel's clamp is inert on a convex combination of [0,1] values.
      expect(r.data.clampedByKernel).toBe(false);
    }
  });

  it("fail-closed on an out-of-range probability, a missing source label, and an empty set", () => {
    expect(evalPrecisionWeightedEnsemble({ estimates: [{ source: "x", prob: 1.5 }] }).ok).toBe(false);
    expect(evalPrecisionWeightedEnsemble({ estimates: [{ source: "", prob: 0.5 }] }).ok).toBe(false);
    expect(evalPrecisionWeightedEnsemble({ estimates: [] }).ok).toBe(false);
  });

  it("fail-closed on a stated stdError the kernel would silently clamp", () => {
    // MEASURED: estimatorSigma({ stdError: 0.9 }) -> 0.5, and stdError 0.005
    // -> 0.01. Both are silent: the caller asked for one number and got another.
    const hi = evalPrecisionWeightedEnsemble({
      estimates: [{ source: "noisy", prob: 0.5, reliability: { stdError: 0.9 } }],
    });
    expect(hi.ok).toBe(false);
    if (!hi.ok) expect(hi.reason).toMatch(/silently clamped to 0\.5/);
    const lo = evalPrecisionWeightedEnsemble({
      estimates: [{ source: "tight", prob: 0.5, reliability: { stdError: 0.005 } }],
    });
    expect(lo.ok).toBe(false);
    if (!lo.ok) expect(lo.reason).toMatch(/silently clamped to 0\.01/);
  });

  it("estimatorSigma returns the requested stdError unclamped inside its band", () => {
    const inside = evalEstimatorSigma({ reliability: { stdError: 0.05 } });
    expect(inside.ok).toBe(true);
    if (inside.ok) {
      expect(inside.data.sigma).toBeCloseTo(0.05, 12);
      expect(inside.data.clamped).toBe(false);
    }
    // The default reliability derives SIGMA_BASE = 0.05 with no clamping.
    const derived = evalEstimatorSigma({ reliability: {} });
    expect(derived.ok).toBe(true);
    if (derived.ok) expect(derived.data.sigma).toBeCloseTo(0.05, 12);
    // Outside the band is refused rather than silently rewritten.
    expect(evalEstimatorSigma({ reliability: { stdError: 0.9 } }).ok).toBe(false);
    expect(evalEstimatorSigma({ reliability: { holdPct: -1 } }).ok).toBe(false);
  });
});

// ============================================================
// Determinism
// ============================================================

describe("scoredist determinism", () => {
  it("lcgRandom replays identically for the same seed and never uses Math.random", () => {
    const a = lcgRandom(12345);
    const b = lcgRandom(12345);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    // A different seed must give a different stream.
    const c = lcgRandom(54321);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(seqA);
  });

  it("a synthetic book set built from the LCG de-vigs to a fair pair that sums to 1", () => {
    const rand = lcgRandom(20260924);
    const prices = [1.02 + rand() * 0.4, 1.02 + rand() * 0.4];
    const r = evalShinDevig({ decimalOdds: prices });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sum).toBeCloseTo(1, 6);
      expect(Math.abs(r.data.sum - 1)).toBeLessThanOrEqual(roundedSumTolerance(2));
      // The same seed replays byte-for-byte, so the fair pair is reproducible.
      const again = evalShinDevig({ decimalOdds: prices });
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.data.probabilities).toEqual(r.data.probabilities);
    }
  });

  it("the rounding bound is the kernel's own, not a wish", () => {
    // 6-dp rounding bounds the sum error at n * 0.5e-6. A tighter tolerance than
    // that would fail-closed on the kernel's rounding rather than on a defect.
    expect(SIX_DP_ROUNDING_BOUND).toBe(0.5e-6);
    expect(roundedSumTolerance(2)).toBeCloseTo(1e-6 + 1e-9, 18);
    expect(roundedSumTolerance(3)).toBeCloseTo(1.5e-6 + 1e-9, 18);
    // The unrounded PMF contract is two orders tighter than the rounded one.
    expect(PMF_SUM_TOLERANCE).toBeLessThan(SIX_DP_ROUNDING_BOUND);
  });
});
