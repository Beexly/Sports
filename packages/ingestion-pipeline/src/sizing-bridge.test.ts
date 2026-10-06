import { describe, expect, it } from "vitest";
import {
  evalGeneralizedKellySlate,
  evalKellyPosteriorGate,
  evalConstrainedKelly,
  evalProjectKellySimplex,
  evalRiskConstrainedKelly,
  evalEmcKelly,
  evalShrinkageKelly,
  evalConformalKelly,
  evalDrawdownKelly,
  evalEquityMaxDrawdown,
  evalCedDrawdown,
  evalDecoupledKelly,
  evalMultivariateKelly,
  evalSimulateWealth,
  evalEsGovernor,
  evalMeanEsFrontier,
  evalKellyTournament,
  evalMaxDrawdownPortfolio,
  evalCoinFlipModulator,
  evalSelectiveFeasibility,
  evalSlateMpc,
  evalVolatilityRegime,
  evalPathForm,
  evalQrDqn,
} from "./sizing-bridge.js";

// ---------------------------------------------------------------------------
// Shared fixtures. Every number here is a closed-form expectation, not a
// captured snapshot, so a kernel change shows up as a real failure.
// ---------------------------------------------------------------------------

describe("sizing-bridge generalized Kelly slate", () => {
  it("sizes a 50/50 coin at even money to a zero stake (edge 0 is a pass)", () => {
    // p=0.5 at odds 2.0 -> edge = 0.5*2 - 1 = 0 exactly.
    const r = evalGeneralizedKellySlate({
      picks: [{ p: 0.5, decimalOdds: 2 }],
      cap: 0.25,
      maxTotal: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fractions[0]).toBeCloseTo(0, 12);
      expect(r.data.totalStake).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
      expect(r.data.expectedLogGrowth).toBeCloseTo(0, 12);
      // Independent baseline agrees: full Kelly at zero edge is zero.
      expect(r.data.independentFractions[0]).toBeCloseTo(0, 12);
    }
  });

  it("returns the exact unsaturated-approximation Kelly fraction for a lone +100 pick", () => {
    // b = 1, f = (0.75*2 - 1)/1 = 0.5. Identity corr -> haircut 1.
    const r = evalGeneralizedKellySlate({
      picks: [{ p: 0.75, decimalOdds: 2 }],
      cap: 0.5,
      maxTotal: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fractions[0]).toBeCloseTo(0.5, 10);
      expect(r.data.haircut).toBeCloseTo(1, 10);
      expect(r.data.kernelSizing).toBe(true);
      expect(r.data.totalStake).toBeCloseTo(0.5, 10);
      // M_00 = sigma^2 + e^2 where e = 0.5 and sigma^2 = E[r^2] - e^2 = 1 - 0.25
      // = 0.75, so M_00 = 1.0. Growth = e.f - 0.5 f M f = 0.25 - 0.5*0.25*1.0.
      expect(r.data.expectedLogGrowth).toBeCloseTo(0.125, 10);
    }
  });

  it("shrinks a correlated slate by the leading-eigenvalue haircut", () => {
    const r = evalGeneralizedKellySlate({
      picks: [
        { p: 0.6, decimalOdds: 2 },
        { p: 0.6, decimalOdds: 2 },
      ],
      corr: [
        [1, 0.9],
        [0.9, 1],
      ],
      cap: 0.5,
      maxTotal: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // lambda_max of [[1, 0.9], [0.9, 1]] is 1.9, so the haircut is 1/1.9 and
      // it is applied to the SOLVED fractions, not substituted for them.
      expect(r.data.haircut).toBeCloseTo(1 / 1.9, 3);
      // Independent Kelly at p=0.6 / 2.0 is 0.2, so the correlated slate must
      // stake strictly less, by more than the 1/1.9 haircut alone would give.
      expect(r.data.independentFractions[0]).toBeCloseTo(0.2, 10);
      expect(r.data.fractions[0]).toBeLessThan(0.2);
      expect(r.data.fractions[0]).toBeLessThan((r.data.independentFractions[0] as number) * r.data.haircut);
      expect(r.data.fractions[0]).toBeCloseTo(r.data.fractions[1] as number, 12);
    }
  });

  it("FAIL-CLOSES on a singular correlation matrix that silently zeroes the solve", () => {
    // An all-ones matrix makes the kernel's second-moment matrix singular; its
    // active-set loop swallows the throw and reports sized:true with every
    // fraction at 0. That is a silent solve failure, not a pass.
    const r = evalGeneralizedKellySlate({
      picks: [
        { p: 0.6, decimalOdds: 2 },
        { p: 0.6, decimalOdds: 2 },
      ],
      corr: [
        [1, 1],
        [1, 1],
      ],
      cap: 0.5,
      maxTotal: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("silently");
  });

  it("FAIL-CLOSES when the kernel blows past the caller cap (no per-pick cap in the kernel)", () => {
    // Full Kelly at p=0.95, odds 2.0 is 0.9. The kernel applies no cap, so a
    // 0.25 caller cap must be caught here rather than clamped to 0.25.
    const r = evalGeneralizedKellySlate({
      picks: [{ p: 0.95, decimalOdds: 2 }],
      cap: 0.25,
      maxTotal: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("exceeds the caller cap 0.25");
      expect(r.reason).toContain("0.89999");
    }
  });

  it("FAIL-CLOSES on a zero-edge maximum bet request at a p/odds pair the caller asserts", () => {
    // p such that the product is exactly 1 -> zero edge, zero stake. Assert
    // that it never becomes a max bet regardless of the cap offered.
    const r = evalGeneralizedKellySlate({
      picks: [{ p: 0.8, decimalOdds: 1.25 }], // 0.8*1.25 = 1 exactly
      cap: 0.9,
      maxTotal: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fractions[0]).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
    }
  });

  it("FAIL-CLOSES on out-of-domain probabilities, non-symmetric correlation, and bad caps", () => {
    expect(
      evalGeneralizedKellySlate({ picks: [{ p: 0, decimalOdds: 2 }], cap: 0.25, maxTotal: 1 }).ok,
    ).toBe(false);
    expect(
      evalGeneralizedKellySlate({ picks: [{ p: 1, decimalOdds: 2 }], cap: 0.25, maxTotal: 1 }).ok,
    ).toBe(false);
    expect(
      evalGeneralizedKellySlate({ picks: [{ p: 0.6, decimalOdds: 2 }], cap: 0, maxTotal: 1 }).ok,
    ).toBe(false);
    expect(
      evalGeneralizedKellySlate({ picks: [{ p: 0.6, decimalOdds: 2 }], cap: 0.5, maxTotal: 0.1 }).ok,
    ).toBe(false);
    const asym = evalGeneralizedKellySlate({
      picks: [
        { p: 0.6, decimalOdds: 2 },
        { p: 0.6, decimalOdds: 2 },
      ],
      corr: [
        [1, 0.2],
        [0.8, 1],
      ],
      cap: 0.5,
      maxTotal: 1,
    });
    expect(asym.ok).toBe(false);
    if (!asym.ok) expect(asym.reason).toContain("not symmetric");
  });

  it("reports the L_min refusal as a pass, not a crash", () => {
    // backtestN = 1 is far below 1/(2*G_K) for a 60/40 pick at 2.0.
    const r = evalGeneralizedKellySlate({
      picks: [{ p: 0.6, decimalOdds: 2, backtestN: 1 }],
      cap: 0.25,
      maxTotal: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.kernelSizing).toBe(false);
      expect(r.data.lMinPasses[0]).toBe(false);
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("L_min");
    }
  });

  it("laplace-smooths and gates a posterior on exact counts", () => {
    const r = evalKellyPosteriorGate({ wins: 5, trials: 10, pHat: 0.6, decimalOdds: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.smoothedP).toBeCloseTo(6 / 12, 12);
      // f* = (0.6*2 - 1)/1 = 0.2, so G_K = 0.6*ln(1.2) + 0.4*ln(0.8).
      expect(r.data.growthRate).toBeCloseTo(0.6 * Math.log(1.2) + 0.4 * Math.log(0.8), 12);
      expect(r.data.lMin).toBeCloseTo(1 / (2 * r.data.growthRate), 12);
      // N = 10 is far below L_min = 24.8, so the gate refuses.
      expect(r.data.passes).toBe(false);
    }
    const rich = evalKellyPosteriorGate({ wins: 200, trials: 400, pHat: 0.6, decimalOdds: 2 });
    expect(rich.ok).toBe(true);
    if (rich.ok) expect(rich.ok && rich.data.passes).toBe(true);
    expect(evalKellyPosteriorGate({ wins: 11, trials: 10, pHat: 0.6, decimalOdds: 2 }).ok).toBe(false);
    expect(evalKellyPosteriorGate({ wins: 1, trials: 10, pHat: 0, decimalOdds: 2 }).ok).toBe(false);
  });
});

describe("sizing-bridge constrained Kelly", () => {
  it("drives every weight to zero when no pick has an edge", () => {
    const r = evalConstrainedKelly({ p: [0.4, 0.45], b: [1, 1], maxW: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.weights[0]).toBeCloseTo(0, 6);
      expect(r.data.weights[1]).toBeCloseTo(0, 6);
      expect(r.data.totalWeight).toBeCloseTo(0, 6);
      expect(r.data.bet).toBe(false);
    }
  });

  it("respects the box cap and the 1.0 bankroll budget on an all-edge slate", () => {
    const r = evalConstrainedKelly({ p: [0.9, 0.9, 0.9], b: [1, 1, 1], maxW: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const w of r.data.weights) {
        expect(w).toBeLessThanOrEqual(0.5 + 1e-9);
        expect(w).toBeGreaterThanOrEqual(0);
      }
      // Three +100 picks at p=0.9: full Kelly is 0.8 each, capped at 0.5 each,
      // and the projection forces the total back to 1.
      expect(r.data.totalWeight).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.data.totalWeight).toBeCloseTo(1, 6);
      expect(r.data.bet).toBe(true);
    }
  });

  it("FAIL-CLOSES where the kernel would silently clamp p to a tiny positive stake", () => {
    const r = evalConstrainedKelly({ p: [0, 0.9], b: [1, 1], maxW: 0.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("clamp");
  });

  it("FAIL-CLOSES on an infeasible cap and on misaligned p/b", () => {
    // 3 picks at maxW 0.2 can only reach 0.6 < 1.
    const infeasible = evalConstrainedKelly({ p: [0.6, 0.6, 0.6], b: [1, 1, 1], maxW: 0.2 });
    expect(infeasible.ok).toBe(false);
    if (!infeasible.ok) expect(infeasible.reason).toContain("infeasible");
    expect(evalConstrainedKelly({ p: [0.6, 0.6], b: [1], maxW: 0.5 }).ok).toBe(false);
    expect(evalConstrainedKelly({ p: [0.6], b: [0], maxW: 0.5 }).ok).toBe(false);
  });

  it("projects raw weights onto the capped simplex exactly", () => {
    const r = evalProjectKellySimplex({ w: [0.9, 0.9], maxW: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.weights[0]).toBeCloseTo(0.5, 10);
      expect(r.data.weights[1]).toBeCloseTo(0.5, 10);
      expect(r.data.totalWeight).toBeCloseTo(1, 10);
    }
    // Already-feasible weights pass through untouched.
    const keep = evalProjectKellySimplex({ w: [0.2, 0.3], maxW: 0.5 });
    expect(keep.ok).toBe(true);
    if (keep.ok) {
      expect(keep.data.weights[0]).toBeCloseTo(0.2, 10);
      expect(keep.data.weights[1]).toBeCloseTo(0.3, 10);
    }
    expect(evalProjectKellySimplex({ w: [], maxW: 0.5 }).ok).toBe(false);
  });
});

describe("sizing-bridge risk-constrained Kelly", () => {
  it("derives the exact lambda for the documented 30% / 5% pair", () => {
    const r = evalRiskConstrainedKelly({
      p: 0.55,
      decimalOdds: 2,
      alpha: 0.7,
      beta: 0.05,
      cap: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.lambda).toBeCloseTo(Math.log(0.05) / Math.log(0.7), 12);
      expect(r.data.stake).toBeLessThan(r.data.plainKelly);
      expect(r.data.stake).toBeGreaterThan(0);
      expect(r.data.bet).toBe(true);
    }
  });

  it("collapses the stake toward zero as the drawdown tolerance tightens", () => {
    // lambda = ln(beta)/ln(alpha) grows without bound as beta falls, and the
    // kernel's feasible interval shrinks with it. The stake never reaches
    // exactly 0 in float — the honest assertion is that it collapses.
    const loose = evalRiskConstrainedKelly({
      p: 0.55,
      decimalOdds: 2,
      alpha: 0.7,
      beta: 0.2,
      cap: 0.25,
    });
    const tight = evalRiskConstrainedKelly({
      p: 0.55,
      decimalOdds: 2,
      alpha: 0.7,
      beta: 1e-30,
      cap: 0.25,
    });
    expect(loose.ok).toBe(true);
    expect(tight.ok).toBe(true);
    if (loose.ok && tight.ok) {
      // Plain Kelly at p=0.55 / 2.0 is exactly 0.10.
      expect(loose.data.plainKelly).toBeCloseTo(0.1, 12);
      expect(tight.data.lambda).toBeGreaterThan(loose.data.lambda);
      expect(tight.data.stake).toBeLessThan(loose.data.stake);
      expect(tight.data.stake).toBeLessThan(loose.data.plainKelly * 0.1);
      expect(tight.data.stake).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });

  it("passes rather than fails when the constraint admits no stake", () => {
    // p at exactly break-even against even money: the growth rate is zero at
    // every f, so the golden search returns a stake that rounds to nothing.
    const r = evalRiskConstrainedKelly({
      p: 0.5,
      decimalOdds: 2,
      alpha: 0.7,
      beta: 0.05,
      cap: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.plainKelly).toBeCloseTo(0, 12);
      expect(r.data.stake).toBeLessThanOrEqual(1e-6);
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("no positive edge");
    }
  });

  it("passes on a genuinely negative edge and reports it as such", () => {
    const r = evalRiskConstrainedKelly({
      p: 0.4,
      decimalOdds: 2,
      alpha: 0.7,
      beta: 0.05,
      cap: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.plainKelly).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("no positive edge");
    }
  });

  it("FAIL-CLOSES on out-of-domain alpha, beta, p, odds and cap", () => {
    const base = { p: 0.55, decimalOdds: 2, alpha: 0.7, beta: 0.05, cap: 0.25 };
    expect(evalRiskConstrainedKelly({ ...base, alpha: 0 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, alpha: 1 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, alpha: 1.5 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, beta: 0 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, beta: 1.5 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, p: 1.2 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, p: 0 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, decimalOdds: 1 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, cap: 0 }).ok).toBe(false);
    expect(evalRiskConstrainedKelly({ ...base, cap: 1 }).ok).toBe(false);
  });
});

describe("sizing-bridge Emc Kelly", () => {
  it("lands on plug-in Kelly with no probability noise and shrinks as noise rises", () => {
    const noNoise = evalEmcKelly({
      modelProb: 0.6,
      decimalOdds: 2,
      sigma: 0,
      alpha: 0.4,
      m: 2000,
      cap: 0.25,
      seed: 11,
    });
    const smallNoise = evalEmcKelly({
      modelProb: 0.6,
      decimalOdds: 2,
      sigma: 0.1,
      alpha: 0.4,
      m: 2000,
      cap: 0.25,
      seed: 11,
    });
    const largeNoise = evalEmcKelly({
      modelProb: 0.6,
      decimalOdds: 2,
      sigma: 0.5,
      alpha: 0.4,
      m: 2000,
      cap: 0.25,
      seed: 11,
    });
    expect(noNoise.ok).toBe(true);
    expect(smallNoise.ok).toBe(true);
    expect(largeNoise.ok).toBe(true);
    if (noNoise.ok && smallNoise.ok && largeNoise.ok) {
      // Plug-in Kelly at p=0.6 / 2.0 is exactly 0.2, and with sigma = 0 every
      // sample equals 0.6, so the grid search recovers it exactly.
      expect(noNoise.data.pluginKelly).toBeCloseTo(0.2, 12);
      expect(noNoise.data.stake).toBeCloseTo(0.2, 6);
      expect(noNoise.data.shrinkage).toBeCloseTo(1, 6);
      // More logit noise -> a lower stake, monotonically.
      expect(smallNoise.data.stake).toBeLessThan(noNoise.data.stake);
      expect(largeNoise.data.stake).toBeLessThan(smallNoise.data.stake);
      expect(largeNoise.data.stake).toBeGreaterThan(0);
      expect(largeNoise.data.sampledProbMean).toBeCloseTo(0.6, 1);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const mk = () =>
      evalEmcKelly({ modelProb: 0.62, decimalOdds: 1.9, sigma: 0.3, alpha: 0.3, m: 500, cap: 0.2, seed: 7 });
    const a = mk();
    const b = mk();
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.data.stake).toBe(b.data.stake);
  });

  it("FAIL-CLOSES on a non-finite sigma, an out-of-domain probability, and a bad cap", () => {
    const base = { modelProb: 0.6, decimalOdds: 2, sigma: 0.2, alpha: 0.4, m: 200, cap: 0.25, seed: 1 };
    const nanSigma = evalEmcKelly({ ...base, sigma: Number.NaN });
    expect(nanSigma.ok).toBe(false);
    if (!nanSigma.ok) expect(nanSigma.reason).toContain("fail-closed");
    expect(evalEmcKelly({ ...base, modelProb: 0 }).ok).toBe(false);
    expect(evalEmcKelly({ ...base, modelProb: 1 }).ok).toBe(false);
    expect(evalEmcKelly({ ...base, cap: 1 }).ok).toBe(false);
    expect(evalEmcKelly({ ...base, m: 0 }).ok).toBe(false);
    expect(evalEmcKelly({ ...base, alpha: 1.5 }).ok).toBe(false);
  });
});

describe("sizing-bridge shrinkage Kelly", () => {
  it("shrinks noisy edges toward their mean and stakes on the shrunk values", () => {
    // One 0.20 edge against three small ones, all with wide standard errors.
    const r = evalShrinkageKelly({
      edges: [0.2, 0.02, 0.01, 0.0],
      ses: [0.15, 0.02, 0.02, 0.02],
      odds: [2, 2, 2, 2],
      kellyMultiple: 0.5,
      cap: 0.05,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const mean = (0.2 + 0.02 + 0.01 + 0) / 4;
      for (const e of r.data.shrunkEdges) {
        // James-Stein only ever pulls an edge TOWARD the mean.
        expect(Math.abs(e - mean)).toBeLessThanOrEqual(Math.abs(0.2 - mean) + 1e-9);
      }
      expect(r.data.shrunkEdges[0]).toBeLessThan(0.2);
      expect(r.data.stakes.every((s) => s <= 0.05 + 1e-9)).toBe(true);
      expect(r.data.totalStake).toBeCloseTo(
        r.data.stakes.reduce((a, b) => a + b, 0),
        12,
      );
    }
  });

  it("stakes exactly zero on a slate whose edges are all zero", () => {
    const r = evalShrinkageKelly({
      edges: [0, 0, 0, 0],
      ses: [0.05, 0.05, 0.05, 0.05],
      odds: [2, 2, 2, 2],
      kellyMultiple: 0.5,
      cap: 0.05,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.totalStake).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
      for (const s of r.data.stakes) expect(s).toBeCloseTo(0, 12);
    }
  });

  it("FAIL-CLOSES on too few edges, undefined edges, and a zero standard error", () => {
    const base = { edges: [0.1, 0.1], ses: [0.05, 0.05], odds: [2, 2], kellyMultiple: 0.5, cap: 0.05 };
    expect(evalShrinkageKelly(base).ok).toBe(false);
    const undef = evalShrinkageKelly({
      edges: [0.1, 0.1, 0.1, Number.NaN],
      ses: [0.05, 0.05, 0.05, 0.05],
      odds: [2, 2, 2, 2],
      kellyMultiple: 0.5,
      cap: 0.05,
    });
    expect(undef.ok).toBe(false);
    if (!undef.ok) expect(undef.reason).toContain("undefined edge");
    const zeroSe = evalShrinkageKelly({
      edges: [0.1, 0.1, 0.1, 0.1],
      ses: [0.05, 0, 0.05, 0.05],
      odds: [2, 2, 2, 2],
      kellyMultiple: 0.5,
      cap: 0.05,
    });
    expect(zeroSe.ok).toBe(false);
    if (!zeroSe.ok) expect(zeroSe.reason).toContain("fail-closed");
  });
});

describe("sizing-bridge conformal Kelly", () => {
  it("scales stake by edge over the squared interval width, then caps it", () => {
    // raw = 0.25 * 0.10 / (0.20)^2 = 0.625 -> capped at 0.5.
    const capped = evalConformalKelly({
      edge: 0.1,
      intervalWidth: 0.2,
      fraction: 0.25,
      perPickCap: 0.5,
      grossCap: 5,
      grossUsed: 0,
      maxCapBindingRate: 0.9,
    });
    expect(capped.ok).toBe(true);
    if (capped.ok) {
      expect(capped.data.rawStake).toBeCloseTo(0.625, 12);
      expect(capped.data.stake).toBeCloseTo(0.5, 12);
      expect(capped.data.capBound).toBe(true);
    }
    // A wider interval on the same edge quarters the raw stake: 0.25*0.1/0.16.
    const wide = evalConformalKelly({
      edge: 0.1,
      intervalWidth: 0.4,
      fraction: 0.25,
      perPickCap: 0.5,
      grossCap: 5,
      grossUsed: 0,
      maxCapBindingRate: 0.9,
    });
    expect(wide.ok).toBe(true);
    if (wide.ok) {
      expect(wide.data.stake).toBeCloseTo(0.15625, 12);
      expect(wide.data.capBound).toBe(false);
    }
  });

  it("stakes zero on a non-positive edge and on a zero-width interval", () => {
    for (const q of [
      { edge: 0, intervalWidth: 0.2 },
      { edge: -0.05, intervalWidth: 0.2 },
      { edge: 0.1, intervalWidth: 0 },
    ] as const) {
      const r = evalConformalKelly({
        ...q,
        fraction: 0.25,
        perPickCap: 0.5,
        grossCap: 5,
        grossUsed: 0,
        maxCapBindingRate: 0.9,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data.stake).toBeCloseTo(0, 12);
        expect(r.data.bet).toBe(false);
        expect(r.data.noBetReason).not.toBeNull();
      }
    }
  });

  it("stakes zero when the gross budget is already spent", () => {
    const r = evalConformalKelly({
      edge: 0.3,
      intervalWidth: 0.1,
      fraction: 0.25,
      perPickCap: 1,
      grossCap: 1,
      grossUsed: 1,
      maxCapBindingRate: 0.9,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.stake).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("gross room");
    }
  });

  it("FAIL-CLOSES on a fractional edge, negative width, and a cap-binding rate over the gate", () => {
    const base = {
      edge: 0.1,
      intervalWidth: 0.2,
      fraction: 0.25,
      perPickCap: 0.5,
      grossCap: 5,
      grossUsed: 0,
      maxCapBindingRate: 0.9,
    };
    const frac = evalConformalKelly({ ...base, edge: Number.POSITIVE_INFINITY });
    expect(frac.ok).toBe(false);
    if (!frac.ok) expect(frac.reason).toContain("fail-closed");
    expect(evalConformalKelly({ ...base, intervalWidth: -1 }).ok).toBe(false);
    expect(evalConformalKelly({ ...base, fraction: 0 }).ok).toBe(false);
    expect(evalConformalKelly({ ...base, grossUsed: -1 }).ok).toBe(false);
    // One already-cap-bound row out of one is a 100% binding rate, over the 50% gate.
    const gated = evalConformalKelly({
      ...base,
      maxCapBindingRate: 0.5,
      slateResults: [{ stake: 0.5, capBound: true, rawStake: 0.625 }],
    });
    expect(gated.ok).toBe(false);
    if (!gated.ok) expect(gated.reason).toContain("cap binds");
  });
});

describe("sizing-bridge drawdown-constrained Bayesian Kelly", () => {
  it("stakes a warmed posterior and shrinks a fresh one to zero", () => {
    const settled = evalDrawdownKelly({
      category: "NFL_MONEYLINE",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 45,
      settledLosses: 55,
      decimalOdds: 2,
      bankroll: 1000,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.001,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    });
    expect(settled.ok).toBe(true);
    if (settled.ok) {
      // Prior (1,1) + 45 wins + 55 losses -> alpha 46, beta 56, n 100.
      expect(settled.data.posteriorMean).toBeCloseTo(46 / 102, 12);
      expect(settled.data.posteriorVar).toBeCloseTo((46 * 56) / (102 * 102 * 103), 15);
      expect(settled.data.observations).toBe(100);
      expect(settled.data.warmupApplied).toBe(false);
      // Full Kelly at 46/102 with b = 1 is (2p - 1) = -0.098 -> floored at 0.
      expect(settled.data.kellyRaw).toBeCloseTo(0, 12);
      expect(settled.data.bet).toBe(false);
    }
    // A category with a real edge stakes; a fresh one stakes nothing.
    const edged = evalDrawdownKelly({
      category: "NFL_MONEYLINE",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 60,
      settledLosses: 40,
      decimalOdds: 2,
      bankroll: 1000,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.001,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    });
    expect(edged.ok).toBe(true);
    if (edged.ok) {
      expect(edged.data.posteriorMean).toBeCloseTo(61 / 102, 12);
      expect(edged.data.kellyRaw).toBeCloseTo(2 * (61 / 102) - 1, 10);
      expect(edged.data.shrinkage).toBeGreaterThan(0);
      expect(edged.data.frac).toBeGreaterThan(0);
      expect(edged.data.frac).toBeLessThan(edged.data.kellyRaw);
      expect(edged.data.bet).toBe(true);
    }
    // A brand new category: Beta(1,1) -> mean 0.5, CV 1, shrinkage 0.
    const fresh = evalDrawdownKelly({
      category: "NCAAF_TOTAL",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 0,
      settledLosses: 0,
      decimalOdds: 2,
      bankroll: 1000,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.001,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    });
    expect(fresh.ok).toBe(true);
    if (fresh.ok) {
      expect(fresh.data.frac).toBeCloseTo(0, 12);
      expect(fresh.data.bet).toBe(false);
      expect(fresh.data.warmupApplied).toBe(true);
    }
  });

  it("collapses to the minimum viable stake once past the drawdown cap", () => {
    // drawdown = 1 - 800/1000 = 0.2, which is NOT > drawdownQ = 0.3.
    const under = evalDrawdownKelly({
      category: "MLB_SPREAD",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 60,
      settledLosses: 40,
      decimalOdds: 2,
      bankroll: 800,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.002,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    });
    expect(under.ok).toBe(true);
    if (under.ok) {
      expect(under.data.drawdown).toBeCloseTo(0.2, 12);
      expect(under.data.drawdownScaled).toBe(false);
      expect(under.data.frac).toBeGreaterThan(0);
    }

    // drawdown = 1 - 600/1000 = 0.4 > 0.3, so the cap fires.
    const past = evalDrawdownKelly({
      category: "MLB_SPREAD",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 60,
      settledLosses: 40,
      decimalOdds: 2,
      bankroll: 600,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.002,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    });
    expect(past.ok).toBe(true);
    if (past.ok) {
      expect(past.data.drawdown).toBeCloseTo(0.4, 12);
      expect(past.data.drawdownScaled).toBe(true);
      expect(past.data.frac).toBeCloseTo(0.002, 12);
    }
  });

  it("FAIL-CLOSES on a fractional bankroll, a broken prior, and an out-of-range cap", () => {
    const base = {
      category: "X",
      priorAlpha: 1,
      priorBeta: 1,
      settledWins: 5,
      settledLosses: 5,
      decimalOdds: 2,
      bankroll: 1000,
      peakBankroll: 1000,
      drawdownQ: 0.3,
      minStakeFrac: 0.001,
      uncertaintyZ: 1,
      warmupPicks: 20,
      newCatFrac: 0.25,
      cap: 0.25,
    };
    const nanBankroll = evalDrawdownKelly({ ...base, bankroll: Number.NaN });
    expect(nanBankroll.ok).toBe(false);
    if (!nanBankroll.ok) expect(nanBankroll.reason).toContain("bankroll");
    expect(evalDrawdownKelly({ ...base, priorAlpha: 0 }).ok).toBe(false);
    expect(evalDrawdownKelly({ ...base, settledWins: -1 }).ok).toBe(false);
    expect(evalDrawdownKelly({ ...base, decimalOdds: 1 }).ok).toBe(false);
    expect(evalDrawdownKelly({ ...base, cap: 1.5 }).ok).toBe(false);
    expect(evalDrawdownKelly({ ...base, category: "" }).ok).toBe(false);
  });

  it("measures worst peak-to-trough drawdown on an equity curve", () => {
    const r = evalEquityMaxDrawdown({ equity: [100, 120, 90, 150, 140] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Peak 120 -> trough 90 is 30/120 = 0.25.
      expect(r.data.maxDrawdown).toBeCloseTo(0.25, 12);
    }
    const flat = evalEquityMaxDrawdown({ equity: [100, 100, 100] });
    expect(flat.ok).toBe(true);
    if (flat.ok) expect(flat.data.maxDrawdown).toBeCloseTo(0, 12);
    expect(evalEquityMaxDrawdown({ equity: [] }).ok).toBe(false);
    const wiped = evalEquityMaxDrawdown({ equity: [100, 0] });
    expect(wiped.ok).toBe(false);
    if (!wiped.ok) expect(wiped.reason).toContain("zero");
  });
});

describe("sizing-bridge CED drawdown attribution", () => {
  it("flags the Euler shares as uninformative when the marginals do not sum positive", () => {
    // The kernel normalises shares by the sum of the leave-one-out marginals.
    // On a two-category slate that sum is negative, so every share reads 0 —
    // which would look like "no category dominates" if the caller believed it.
    // The bridge surfaces sharesInformative: false so that cannot happen.
    const r = evalCedDrawdown({
      categories: [
        { category: "GOOD", pnl: [5, 5, 5, 5, 5, 5, 5, 5] },
        { category: "BAD", pnl: [-8, -3, -12, -2, -9, -4, -10, -3] },
      ],
      alpha: 0.9,
      window: 8,
      currentDrawdown: 0.4,
      thresholdDt: 0.3,
      cutFraction: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sharesInformative).toBe(false);
      expect(r.data.marginalSum).toBeLessThanOrEqual(0);
      for (const row of r.data.attribution) expect(row.share).toBeCloseTo(0, 12);
      // The RAW contribution still separates the two categories, which is the
      // number a caller must read when the shares are not identifying anything.
      const good = r.data.attribution.find((a) => a.category === "GOOD");
      const bad = r.data.attribution.find((a) => a.category === "BAD");
      expect(bad?.contribution).toBeGreaterThan(0);
      expect(good?.contribution).toBeLessThan(0);
      expect(r.data.stakeScale).toBeCloseTo(0.25, 12);
      expect(r.data.triggered).toBe(true);
      expect(r.data.noBetReason).toContain("drawdown");
    }
  });

  it("leaves stakes at full scale below the trigger", () => {
    const r = evalCedDrawdown({
      categories: [{ category: "SPREAD", pnl: [1, -2, 3, -1] }],
      alpha: 0.9,
      window: 4,
      currentDrawdown: 0.1,
      thresholdDt: 0.3,
      cutFraction: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.stakeScale).toBeCloseTo(1, 12);
      expect(r.data.triggered).toBe(false);
      expect(r.data.ced).toBeGreaterThanOrEqual(0);
    }
  });

  it("FAIL-CLOSES on ragged series, bad alpha, and a zero cut fraction", () => {
    const base = {
      categories: [
        { category: "A", pnl: [1, 2, 3, 4] },
        { category: "B", pnl: [-1, -2, -3] },
      ],
      alpha: 0.9,
      window: 4,
      currentDrawdown: 0.1,
      thresholdDt: 0.3,
      cutFraction: 0.25,
    };
    const ragged = evalCedDrawdown(base);
    expect(ragged.ok).toBe(false);
    if (!ragged.ok) expect(ragged.reason).toContain("periods");
    expect(evalCedDrawdown({ ...base, categories: [{ category: "A", pnl: [1, 2, 3, 4] }], alpha: 0 }).ok).toBe(false);
    expect(evalCedDrawdown({ ...base, categories: [{ category: "A", pnl: [1, 2, 3, 4] }], cutFraction: 0 }).ok).toBe(false);
    expect(evalCedDrawdown({ ...base, categories: [{ category: "A", pnl: [1, 2, 3, 4] }], window: 0 }).ok).toBe(false);
    expect(evalCedDrawdown({ ...base, categories: [], currentDrawdown: -1 }).ok).toBe(false);
  });
});

describe("sizing-bridge decoupled slate Kelly", () => {
  it("matches independent Kelly when there is no correlation, and cuts under correlation", () => {
    const picks = [
      { p: 0.6, odds: 2 },
      { p: 0.55, odds: 2 },
    ];
    const independent = evalDecoupledKelly({ picks, maxExposure: 1, cap: 0.25 });
    const correlated = evalDecoupledKelly({
      picks,
      cov: [
        [0, 0.9],
        [0.9, 0],
      ],
      maxExposure: 1,
      cap: 0.25,
    });
    expect(independent.ok).toBe(true);
    expect(correlated.ok).toBe(true);
    if (independent.ok && correlated.ok) {
      const indTotal = independent.data.totalStake;
      const corTotal = correlated.data.totalStake;
      expect(indTotal).toBeGreaterThan(0);
      expect(corTotal).toBeLessThanOrEqual(indTotal + 1e-9);
      for (const s of independent.data.stakes) expect(s).toBeLessThanOrEqual(0.25 + 1e-9);
      for (const s of correlated.data.stakes) expect(s).toBeLessThanOrEqual(0.25 + 1e-9);
      // Independent baseline: (2*0.6-1)=0.2 and (2*0.55-1)=0.1.
      expect(independent.data.independentFractions[0]).toBeCloseTo(0.2, 10);
      expect(independent.data.independentFractions[1]).toBeCloseTo(0.1, 10);
    }
  });

  it("FAIL-CLOSES on a bad probability, a ragged covariance, and a ragged p/b length", () => {
    expect(evalDecoupledKelly({ picks: [{ p: 0, odds: 2 }], maxExposure: 1, cap: 0.25 }).ok).toBe(false);
    expect(evalDecoupledKelly({ picks: [{ p: 0.6, odds: 1 }], maxExposure: 1, cap: 0.25 }).ok).toBe(false);
    const raggedCov = evalDecoupledKelly({
      picks: [
        { p: 0.6, odds: 2 },
        { p: 0.6, odds: 2 },
      ],
      cov: [[0, 0.5], [0.5]],
      maxExposure: 1,
      cap: 0.25,
    });
    expect(raggedCov.ok).toBe(false);
    if (!raggedCov.ok) expect(raggedCov.reason).toContain("cov row");
    expect(evalDecoupledKelly({ picks: [], maxExposure: 1, cap: 0.25 }).ok).toBe(false);
    expect(evalDecoupledKelly({ picks: [{ p: 0.6, odds: 2 }], maxExposure: 1, cap: 1.5 }).ok).toBe(false);
  });
});

describe("sizing-bridge multivariate simultaneous Kelly", () => {
  it("is deterministic for a fixed seed and stays inside the cap", () => {
    const input = {
      edges: [
        { p: 0.62, odds: 2 },
        { p: 0.58, odds: 2.1 },
      ],
      cap: 0.25,
      iters: 60,
      sims: 600,
      seed: 99,
    };
    const a = evalMultivariateKelly(input);
    const b = evalMultivariateKelly(input);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.stakes).toEqual(b.data.stakes);
      for (const s of a.data.stakes) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(input.cap + 1e-9);
      }
      expect(a.data.totalStake).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("scales stakes down when the model is miscalibrated", () => {
    const edges = [{ p: 0.62, odds: 2 }];
    const clean = evalMultivariateKelly({ edges, cap: 0.5, iters: 40, sims: 400, seed: 5 });
    const miscal = evalMultivariateKelly({ edges, cap: 0.5, iters: 40, sims: 400, seed: 5, ece: 0.3 });
    expect(clean.ok).toBe(true);
    expect(miscal.ok).toBe(true);
    if (clean.ok && miscal.ok) {
      // max(0.25, 1 - 2*0.3) = 0.4.
      expect(miscal.data.kellyScale).toBeCloseTo(0.4, 12);
      expect(miscal.data.stakes[0]).toBeLessThan((clean.data.stakes[0] as number) + 1e-9);
    }
  });

  it("FAIL-CLOSES on an out-of-domain probability, a ragged corr, and a bad ece", () => {
    const base = { edges: [{ p: 0.6, odds: 2 }], cap: 0.25, iters: 10, sims: 100, seed: 1 };
    expect(evalMultivariateKelly({ ...base, edges: [{ p: 1, odds: 2 }] }).ok).toBe(false);
    // A corr array must have one entry per edge, so a 3-entry corr on a 2-edge
    // slate is malformed; the kernel would otherwise read the missing entry as 0.
    expect(
      evalMultivariateKelly({
        ...base,
        edges: [
          { p: 0.6, odds: 2, corr: [0.1, 0.1, 0.1] },
          { p: 0.6, odds: 2 },
        ],
      }).ok,
    ).toBe(false);
    expect(evalMultivariateKelly({ ...base, edges: [] }).ok).toBe(false);
    const badEce = evalMultivariateKelly({ ...base, ece: 1.5 });
    expect(badEce.ok).toBe(false);
    if (!badEce.ok) expect(badEce.reason).toContain("ece");
  });

  it("simulates an exact bankroll path over settled outcomes", () => {
    // +100 twice then one loss at half-Kelly: 1 -> 1.2 -> 1.44 -> 1.152.
    const r = evalSimulateWealth({
      stakes: [0.2, 0.2, 0.2],
      edges: [
        { p: 0.6, odds: 2 },
        { p: 0.6, odds: 2 },
        { p: 0.4, odds: 2 },
      ],
      outcomes: [true, true, false],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.wealth).toBeCloseTo(1.152, 10);
      // Peak 1.44 -> 1.152 is 0.2 of the peak.
      expect(r.data.maxDrawdown).toBeCloseTo(0.2, 10);
    }
    expect(evalSimulateWealth({ stakes: [0.2], edges: [{ p: 0.6, odds: 2 }], outcomes: [] }).ok).toBe(false);
    expect(evalSimulateWealth({ stakes: [1], edges: [{ p: 0.6, odds: 2 }], outcomes: [true] }).ok).toBe(false);
  });
});

describe("sizing-bridge ES governor", () => {
  it("leaves a low-risk slate alone and cuts a high-variance one", () => {
    const calm = evalEsGovernor({
      picks: [{ kellyFrac: 0.02, decimalOdds: 1.2, winProb: 0.95 }],
      alpha: 0.95,
      esBudget: 0.15,
      nSims: 4000,
      seed: 42,
      cap: 0.25,
    });
    expect(calm.ok).toBe(true);
    if (calm.ok) {
      expect(calm.data.governed).toBe(false);
      expect(calm.data.s).toBeCloseTo(1, 12);
      expect(calm.data.es).toBeLessThanOrEqual(0.15 + 1e-9);
      expect(calm.data.finalFractions[0]).toBeCloseTo(0.02, 12);
    }
    const wild = evalEsGovernor({
      picks: [
        { kellyFrac: 0.25, decimalOdds: 3, winProb: 0.4 },
        { kellyFrac: 0.25, decimalOdds: 3, winProb: 0.4 },
      ],
      alpha: 0.95,
      esBudget: 0.01,
      nSims: 4000,
      seed: 42,
      cap: 0.25,
    });
    expect(wild.ok).toBe(true);
    if (wild.ok) {
      expect(wild.data.governed).toBe(true);
      expect(wild.data.s).toBeLessThan(1);
      expect(wild.data.s).toBeGreaterThan(0);
      expect(wild.data.es).toBeLessThanOrEqual(0.01 + 1e-6);
      for (const f of wild.data.finalFractions) {
        expect(f).toBeLessThanOrEqual(0.25 + 1e-9);
        expect(f).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("FAIL-CLOSES when the input fraction already breaks the caller cap", () => {
    const r = evalEsGovernor({
      picks: [{ kellyFrac: 0.5, decimalOdds: 2, winProb: 0.6 }],
      alpha: 0.95,
      esBudget: 0.15,
      nSims: 500,
      seed: 1,
      cap: 0.25,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("0.5");
  });

  it("FAIL-CLOSES on a bad alpha, budget, sim count and win probability", () => {
    const base = {
      picks: [{ kellyFrac: 0.05, decimalOdds: 2, winProb: 0.55 }],
      alpha: 0.95,
      esBudget: 0.15,
      nSims: 500,
      seed: 1,
      cap: 0.25,
    };
    expect(evalEsGovernor({ ...base, alpha: 0 }).ok).toBe(false);
    expect(evalEsGovernor({ ...base, esBudget: Number.NaN }).ok).toBe(false);
    expect(evalEsGovernor({ ...base, nSims: 0 }).ok).toBe(false);
    expect(evalEsGovernor({ ...base, picks: [{ kellyFrac: 0.05, decimalOdds: 2, winProb: 1.4 }] }).ok).toBe(false);
    expect(evalEsGovernor({ ...base, picks: [] }).ok).toBe(false);
  });

  it("produces a frontier that loses growth as exposure falls", () => {
    const r = evalMeanEsFrontier({
      picks: [
        { kellyFrac: 0.1, decimalOdds: 2.2, winProb: 0.58 },
        { kellyFrac: 0.1, decimalOdds: 2.2, winProb: 0.58 },
      ],
      alpha: 0.9,
      nPoints: 5,
      nSims: 2000,
      seed: 7,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.frontier).toHaveLength(5);
      const s = r.data.frontier.map((p) => p.s);
      for (let i = 1; i < s.length; i++) expect(s[i] as number).toBeLessThan(s[i - 1] as number);
      const means = r.data.frontier.map((p) => p.mean);
      for (let i = 1; i < means.length; i++) {
        expect(means[i] as number).toBeLessThanOrEqual((means[i - 1] as number) + 1e-3);
      }
    }
    expect(
      evalMeanEsFrontier({ picks: [{ kellyFrac: 0.1, decimalOdds: 2, winProb: 0.55 }], alpha: 0.9, nPoints: 1, nSims: 100, seed: 1 }).ok,
    ).toBe(false);
  });
});

describe("sizing-bridge Kelly tournament", () => {
  it("picks the highest-log-growth candidate that survives the drawdown cap", () => {
    const r = evalKellyTournament({
      bets: [
        { p: 0.6, odds: 2, won: true },
        { p: 0.6, odds: 2, won: true },
        { p: 0.4, odds: 2, won: false },
      ],
      candidates: [0, 0.25, 0.5, 0.75, 1],
      maxDrawdownCap: 0.5,
      stakeCap: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // f* at p=0.6 / 2.0 is 0.2; at p=0.4 it is floored to 0, so the losing
      // pick contributes no stake regardless of the multiple. Terminal wealth
      // at multiple m is therefore (1 + 0.2m)^2.
      const m = r.data.fraction;
      expect(m).toBeCloseTo(1, 12);
      expect(r.data.terminalWealth).toBeCloseTo((1 + 0.2 * m) ** 2, 10);
      expect(r.data.logGrowth).toBeCloseTo(Math.log((1 + 0.2 * m) ** 2), 10);
      expect(r.data.maxDrawdown).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(true);
    }
  });

  it("returns a pass when every candidate loses money", () => {
    // Both picks carry f* = 0.2 and both lost, so wealth is (1 - 0.2m)^2 < 1
    // at every m. The tournament still returns the least-bad multiple, and the
    // bridge reports it as a pass rather than a stake.
    const r = evalKellyTournament({
      bets: [
        { p: 0.6, odds: 2, won: false },
        { p: 0.6, odds: 2, won: false },
      ],
      candidates: [0.5, 1],
      maxDrawdownCap: 0.9,
      stakeCap: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fraction).toBeCloseTo(0.5, 12);
      expect(r.data.terminalWealth).toBeCloseTo((1 - 0.2 * 0.5) ** 2, 10);
      expect(r.data.logGrowth).toBeLessThan(0);
      expect(r.data.bet).toBe(false);
    }
  });

  it("FAIL-CLOSES on a non-positive fraction candidate, an empty slate, and a stakeCap breach", () => {
    const base = {
      bets: [{ p: 0.6, odds: 2, won: true }],
      candidates: [0.25, 1],
      maxDrawdownCap: 0.5,
      stakeCap: 1,
    };
    expect(evalKellyTournament({ ...base, candidates: [-0.5] }).ok).toBe(false);
    expect(evalKellyTournament({ ...base, bets: [] }).ok).toBe(false);
    expect(evalKellyTournament({ ...base, candidates: [] }).ok).toBe(false);
    expect(evalKellyTournament({ ...base, bets: [{ p: 0.6, odds: 1, won: true }] }).ok).toBe(false);
    // The whole-tournament cap: a stakeCap below every candidate multiple.
    const capped = evalKellyTournament({ ...base, candidates: [0.5, 1], stakeCap: 0.1 });
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.reason).toContain("stakeCap");
  });
});

describe("sizing-bridge max-drawdown portfolio", () => {
  it("returns a capped simplex weighting on a well-posed session grid", () => {
    const r = evalMaxDrawdownPortfolio({
      sessionReturns: [
        [1.0, 0.5, 0.5],
        [0.5, 1.0, 0.5],
        [0.5, 0.5, 1.0],
        [2.0, 0.1, 0.1],
      ],
      minW: 0.1,
      maxW: 0.6,
      recentDrawdown: 0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const w of r.data.weights) {
        expect(w).toBeGreaterThanOrEqual(0.1 - 1e-9);
        expect(w).toBeLessThanOrEqual(0.6 + 1e-9);
      }
      expect(r.data.totalWeight).toBeCloseTo(1, 6);
      // The maximin step cannot let one bet absorb the whole [0.5, 1.0] shock.
      expect(r.data.worstSessionReturn).toBeGreaterThan(0);
      expect(r.data.adaptedBounds.maxW).toBeCloseTo(0.6, 12);
    }
  });

  it("shrinks the adaptive max weight after a bad window", () => {
    const r = evalMaxDrawdownPortfolio({
      sessionReturns: [
        [1, 1],
        [0.5, 1],
      ],
      minW: 0.1,
      maxW: 0.9,
      recentDrawdown: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // maxW * (1 - min(0.5, 0.5)) = 0.45.
      expect(r.data.adaptedBounds.maxW).toBeCloseTo(0.45, 12);
      expect(r.data.adaptedBounds.minW).toBeCloseTo(0.1, 12);
    }
  });

  it("FAIL-CLOSES when the capped simplex is provably empty", () => {
    // 3 bets at minW 0.4 already sum to 1.2 > 1.
    const infeasible = evalMaxDrawdownPortfolio({
      sessionReturns: [
        [1, 1, 1],
        [0.5, 0.5, 0.5],
      ],
      minW: 0.4,
      maxW: 0.9,
      recentDrawdown: 0,
    });
    expect(infeasible.ok).toBe(false);
    if (!infeasible.ok) expect(infeasible.reason).toContain("infeasible");
    // 3 bets at maxW 0.2 cannot reach 1.
    const tooTight = evalMaxDrawdownPortfolio({
      sessionReturns: [
        [1, 1, 1],
        [0.5, 0.5, 0.5],
      ],
      minW: 0.1,
      maxW: 0.2,
      recentDrawdown: 0,
    });
    expect(tooTight.ok).toBe(false);
    if (!tooTight.ok) expect(tooTight.reason).toContain("infeasible");
  });

  it("FAIL-CLOSES on ragged sessions, no bets, and a negative drawdown", () => {
    const base = {
      sessionReturns: [
        [1, 1],
        [0.5],
      ],
      minW: 0.1,
      maxW: 0.9,
      recentDrawdown: 0,
    };
    expect(evalMaxDrawdownPortfolio(base).ok).toBe(false);
    expect(evalMaxDrawdownPortfolio({ ...base, sessionReturns: [], minW: 0.1, maxW: 0.9, recentDrawdown: 0 }).ok).toBe(false);
    expect(evalMaxDrawdownPortfolio({ ...base, sessionReturns: [[]], recentDrawdown: 0 }).ok).toBe(false);
    expect(evalMaxDrawdownPortfolio({ ...base, recentDrawdown: -0.1 }).ok).toBe(false);
    expect(
      evalMaxDrawdownPortfolio({ ...base, sessionReturns: [[1, 1]], minW: 0.9, maxW: 0.1, recentDrawdown: 0 }).ok,
    ).toBe(false);
  });
});

describe("sizing-bridge coin-flip modulator", () => {
  it("halves a coin-flip stake and leaves a real spread alone", () => {
    const coin = evalCoinFlipModulator({ kellyStake: 0.04, spread: -1.5, threshold: 2.5, factor: 0.5, cap: 0.05 });
    expect(coin.ok).toBe(true);
    if (coin.ok) {
      expect(coin.data.isCoinFlip).toBe(true);
      expect(coin.data.stake).toBeCloseTo(0.02, 12);
    }
    const real = evalCoinFlipModulator({ kellyStake: 0.04, spread: -7, threshold: 2.5, factor: 0.5, cap: 0.05 });
    expect(real.ok).toBe(true);
    if (real.ok) {
      expect(real.data.isCoinFlip).toBe(false);
      expect(real.data.stake).toBeCloseTo(0.04, 12);
    }
  });

  it("abstains entirely at factor 0 on a pick-em", () => {
    const r = evalCoinFlipModulator({ kellyStake: 0.04, spread: 0, threshold: 2.5, factor: 0, cap: 0.05 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.stake).toBeCloseTo(0, 12);
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("abstains");
    }
  });

  it("FAIL-CLOSES on a non-finite spread, a negative stake, and a factor above 1", () => {
    const base = { kellyStake: 0.04, spread: -1, threshold: 2.5, factor: 0.5, cap: 0.05 };
    const nanSpread = evalCoinFlipModulator({ ...base, spread: Number.NaN });
    expect(nanSpread.ok).toBe(false);
    if (!nanSpread.ok) expect(nanSpread.reason).toContain("unparsed line");
    expect(evalCoinFlipModulator({ ...base, kellyStake: -0.01 }).ok).toBe(false);
    expect(evalCoinFlipModulator({ ...base, factor: 1.5 }).ok).toBe(false);
    expect(evalCoinFlipModulator({ ...base, threshold: -1 }).ok).toBe(false);
    const overCap = evalCoinFlipModulator({ ...base, kellyStake: 0.2, cap: 0.05 });
    expect(overCap.ok).toBe(false);
    if (!overCap.ok) expect(overCap.reason).toContain("0.2");
  });
});

describe("sizing-bridge selective feasibility ceiling", () => {
  it("measures the perfect-selector ceiling and the breakeven keep rate", () => {
    const r = evalSelectiveFeasibility({
      edges: [0.2, 0.1, 0.05, 0.01, -0.05, -0.1],
      keepFrac: 0.5,
      hurdle: 0.05,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // k = round(6 * 0.5) = 3, so the top 3 (0.2, 0.1, 0.05) average 0.11667.
      expect(r.data.ceiling).toBeCloseTo((0.2 + 0.1 + 0.05) / 3, 12);
      expect(r.data.volume).toBe(3);
      expect(r.data.breakevenKeepRate).toBeGreaterThan(0);
      expect(r.data.breakevenKeepRate).toBeLessThanOrEqual(1);
      expect(r.data.bet).toBe(true);
    }
  });

  it("reports infeasibility as a pass, not a crash", () => {
    const r = evalSelectiveFeasibility({
      edges: [0.01, 0.0, -0.01, -0.02],
      keepFrac: 0.5,
      hurdle: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.bet).toBe(false);
      expect(r.data.noBetReason).toContain("below the");
      expect(r.data.ceiling).toBeCloseTo(0.005, 12);
    }
  });

  it("FAIL-CLOSES on an empty edge set, an undefined edge, and a keepFrac of zero", () => {
    expect(evalSelectiveFeasibility({ edges: [], keepFrac: 0.5, hurdle: 0 }).ok).toBe(false);
    const undef = evalSelectiveFeasibility({ edges: [0.1, Number.NaN], keepFrac: 0.5, hurdle: 0 });
    expect(undef.ok).toBe(false);
    if (!undef.ok) expect(undef.reason).toContain("undefined edge");
    expect(evalSelectiveFeasibility({ edges: [0.1], keepFrac: 0, hurdle: 0 }).ok).toBe(false);
    expect(evalSelectiveFeasibility({ edges: [0.1], keepFrac: 1.5, hurdle: 0 }).ok).toBe(false);
  });
});

describe("sizing-bridge slate-MPC staker", () => {
  it("stays inside the per-pick cap and the exposure budget", () => {
    const r = evalSlateMpc({
      picks: [
        { p: 0.6, odds: 2 },
        { p: 0.58, odds: 2.1 },
        { p: 0.55, odds: 2.2 },
      ],
      cap: 0.05,
      maxExposure: 0.15,
      lambda: 1,
      iterations: 200,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const s of r.data.stakes) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(0.05 + 1e-9);
      }
      expect(r.data.totalStake).toBeLessThanOrEqual(0.15 + 1e-9);
      expect(r.data.bet).toBe(true);
    }
  });

  it("cuts the slate further as the correlation penalty rises", () => {
    const picks = [
      { p: 0.6, odds: 2 },
      { p: 0.6, odds: 2 },
    ];
    const cov = [
      [0, 0.5],
      [0.5, 0],
    ];
    const light = evalSlateMpc({ picks, cov, cap: 0.2, maxExposure: 0.4, lambda: 0, iterations: 200 });
    const heavy = evalSlateMpc({ picks, cov, cap: 0.2, maxExposure: 0.4, lambda: 20, iterations: 200 });
    expect(light.ok).toBe(true);
    expect(heavy.ok).toBe(true);
    if (light.ok && heavy.ok) {
      expect(heavy.data.totalStake).toBeLessThanOrEqual(light.data.totalStake + 1e-9);
    }
  });

  it("FAIL-CLOSES on a ragged covariance and an inverted exposure budget", () => {
    const base = {
      picks: [
        { p: 0.6, odds: 2 },
        { p: 0.6, odds: 2 },
      ],
      cap: 0.2,
      maxExposure: 0.4,
      lambda: 1,
    };
    const ragged = evalSlateMpc({ ...base, cov: [[0, 0.5], [0.5]] });
    expect(ragged.ok).toBe(false);
    if (!ragged.ok) expect(ragged.reason).toContain("cov row");
    const inverted = evalSlateMpc({ ...base, maxExposure: 0.1, cap: 0.2 });
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.reason).toContain("below the single-pick cap");
    expect(evalSlateMpc({ ...base, picks: [{ p: 0, odds: 2 }] }).ok).toBe(false);
    expect(evalSlateMpc({ ...base, lambda: -1 }).ok).toBe(false);
  });
});

describe("sizing-bridge volatility-regime scaler", () => {
  it("classifies the regime from the trailing volatility history and scales the stake", () => {
    const calm = evalVolatilityRegime({
      returns: [0.01, 0.01, 0.011, 0.009, 0.01],
      window: 3,
      volHistory: [0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16],
      drawdown: 0,
      bankroll: 1000,
      maxBankrollFrac: 0.05,
      baseStake: 0.04,
    });
    expect(calm.ok).toBe(true);
    if (calm.ok) {
      // Current vol is far below the 25th percentile of the history -> "low",
      // and the default low multiplier is 1.
      expect(calm.data.regime).toBe("low");
      expect(calm.data.multiplier).toBeCloseTo(1, 12);
      expect(calm.data.stake).toBeCloseTo(0.04, 12);
      expect(calm.data.maxStake).toBeCloseTo(50, 12);
      expect(calm.data.volSeries).toHaveLength(5);
    }
  });

  it("FAIL-CLOSES on a fully wiped bankroll (drawdown of exactly 1)", () => {
    // drawdown = 1 means the bankroll is gone; there is nothing left to scale.
    // The kernel would happily compute 1 - 1 = 0 and return a zero stake,
    // which is a pass, so the range check is what makes this fail closed.
    const r = evalVolatilityRegime({
      returns: [0.02, 0.02, 0.02, 0.02, 0.02],
      window: 3,
      volHistory: [0.05, 0.06, 0.07],
      drawdown: 1,
      bankroll: 1000,
      maxBankrollFrac: 0.05,
      baseStake: 0.04,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("[0, 1)");
  });

  it("cuts the stake by the drawdown haircut and clamps at the bankroll cap", () => {
    const halved = evalVolatilityRegime({
      returns: [0.01, 0.01, 0.01],
      window: 3,
      volHistory: [0.2],
      drawdown: 0.5,
      bankroll: 1000,
      maxBankrollFrac: 0.05,
      baseStake: 0.04,
      lowMult: 1,
    });
    expect(halved.ok).toBe(true);
    if (halved.ok) {
      expect(halved.data.multiplier).toBeCloseTo(0.5, 12);
      expect(halved.data.stake).toBeCloseTo(0.02, 12);
    }
    // A base stake far above the bankroll cap clamps to the cap.
    const clamped = evalVolatilityRegime({
      returns: [0.01, 0.01, 0.01],
      window: 3,
      volHistory: [0.2],
      drawdown: 0,
      bankroll: 100,
      maxBankrollFrac: 0.05,
      baseStake: 40,
      lowMult: 1,
    });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.data.stake).toBeCloseTo(5, 12);
      expect(clamped.data.maxStake).toBeCloseTo(5, 12);
    }
  });

  it("FAIL-CLOSES on too few returns, a bad window, and a non-positive bankroll", () => {
    const base = {
      returns: [0.01, 0.01],
      window: 3,
      volHistory: [0.2],
      drawdown: 0,
      bankroll: 1000,
      maxBankrollFrac: 0.05,
      baseStake: 0.04,
    };
    expect(evalVolatilityRegime(base).ok).toBe(true);
    expect(evalVolatilityRegime({ ...base, returns: [0.01] }).ok).toBe(false);
    expect(evalVolatilityRegime({ ...base, window: 1 }).ok).toBe(false);
    expect(evalVolatilityRegime({ ...base, bankroll: 0 }).ok).toBe(false);
    expect(evalVolatilityRegime({ ...base, maxBankrollFrac: 0 }).ok).toBe(false);
    expect(evalVolatilityRegime({ ...base, volHistory: [-1] }).ok).toBe(false);
    const badBase = evalVolatilityRegime({ ...base, baseStake: Number.NaN });
    expect(badBase.ok).toBe(false);
    if (!badBase.ok) expect(badBase.reason).toContain("baseStake");
  });
});

describe("sizing-bridge path-form features", () => {
  it("decomposes a slump-and-recovery path exactly", () => {
    // Cumulative: 1, -1, -2, 0, 3. Peak 1 -> trough -2 is MDD 3 at index 2;
    // recovery from that trough is 3 - (-2) = 5, which legitimately exceeds
    // the endpoint of 3 because the trough sits below zero.
    const r = evalPathForm({
      perGameMargins: [1, -2, -1, 2, 3],
      slumpAversion: 1,
      recoveryFraction: 0.5,
      cap: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cumulative).toBeCloseTo(3, 12);
      expect(r.data.maxDrawdown).toBeCloseTo(3, 12);
      expect(r.data.recovery).toBeCloseTo(5, 12);
      expect(r.data.troughIndex).toBe(2);
      expect(r.data.pathQuality).toBeCloseTo(3 + 5 - 3, 12);
      expect(r.data.rampAllowed).toBe(true);
      expect(r.data.games).toBe(5);
    }
  });

  it("holds the ramp when recovery has not covered the slump", () => {
    // Cumulative: 1, -1, -2, -2, -2. The trough is the endpoint, so recovery
    // is 0 and the ramp stays shut.
    const r = evalPathForm({
      perGameMargins: [1, -2, -1, 0, 0],
      slumpAversion: 1,
      recoveryFraction: 0.5,
      cap: 0.25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cumulative).toBeCloseTo(-2, 12);
      expect(r.data.maxDrawdown).toBeCloseTo(3, 12);
      expect(r.data.recovery).toBeCloseTo(0, 12);
      expect(r.data.troughIndex).toBe(2);
      expect(r.data.rampAllowed).toBe(false);
      expect(r.data.noBetReason).toContain("ramp-up is held");
    }
  });

  it("treats a monotone rising path as a clean pass with no slump", () => {
    const r = evalPathForm({ perGameMargins: [1, 1, 1], slumpAversion: 1, recoveryFraction: 0.5, cap: 0.25 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.maxDrawdown).toBeCloseTo(0, 12);
      expect(r.data.recovery).toBeCloseTo(0, 12);
      expect(r.data.troughIndex).toBe(-1);
      expect(r.data.rampAllowed).toBe(true);
    }
  });

  it("FAIL-CLOSES on an empty path (all zeros is not a real answer) and on a bad margin", () => {
    const empty = evalPathForm({ perGameMargins: [], slumpAversion: 1, recoveryFraction: 0.5, cap: 0.25 });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toContain("indistinguishable from a flat path");
    const bad = evalPathForm({ perGameMargins: [1, Number.NaN], slumpAversion: 1, recoveryFraction: 0.5, cap: 0.25 });
    expect(bad.ok).toBe(false);
    expect(evalPathForm({ perGameMargins: [1], slumpAversion: -1, recoveryFraction: 0.5, cap: 0.25 }).ok).toBe(false);
    expect(evalPathForm({ perGameMargins: [1], slumpAversion: 1, recoveryFraction: 0.5, cap: 2 }).ok).toBe(false);
  });
});

describe("sizing-bridge QR-DQN distributional head", () => {
  it("computes a zero loss on a flat target and a positive one otherwise", () => {
    // Every TD error is reward + gamma*thetaTarget[j] - theta[i]. A flat
    // theta, a flat target, gamma = 1 and reward = 0 make all of them zero.
    const matched = evalQrDqn({
      theta: [0, 0, 0],
      thetaTarget: [0, 0, 0],
      reward: 0,
      gamma: 1,
      kappa: 1,
      quantileMeans: [0.1, 0.2, -0.1, 0.3, -0.4],
      takenAction: 1,
      cvarAlpha: 0.25,
      capUnits: 2,
    });
    expect(matched.ok).toBe(true);
    if (matched.ok) {
      expect(matched.data.qrLoss).toBeCloseTo(0, 12);
      // Greedy takes the largest mean: 0.3 sits at index 3 -> STAKE_ACTIONS[3] = 1.
      expect(matched.data.greedyStake).toBeCloseTo(1, 12);
      // A flat theta has no spread, so the uncertainty bar is 0.
      expect(matched.data.interQuantileRange).toBeCloseTo(0, 12);
      // CQL log-sum-exp over the means minus the taken action's mean is > 0.
      expect(matched.data.cqlPenalty).toBeGreaterThan(0);
    }
    const shocked = evalQrDqn({
      theta: [-1, 0, 1],
      thetaTarget: [1, 2, 3],
      reward: 0.5,
      gamma: 0.9,
      kappa: 1,
      quantileMeans: [0.1, 0.2, -0.1, 0.3, -0.4],
      takenAction: 1,
      cvarAlpha: 0.25,
      capUnits: 2,
    });
    expect(shocked.ok).toBe(true);
    if (shocked.ok) {
      expect(shocked.data.qrLoss).toBeGreaterThan(0);
      // The kernel interpolates the 10th/90th percentiles, so on [-1, 0, 1] the
      // range is 1.6, not the 2.0 full spread.
      expect(shocked.data.interQuantileRange).toBeCloseTo(1.6, 10);
    }
  });

  it("never stakes more on the tail-aware policy than on the mean policy", () => {
    const r = evalQrDqn({
      theta: [-2, -1, 0, 1, 2],
      thetaTarget: [-2, -1, 0, 1, 2],
      reward: 0,
      gamma: 1,
      kappa: 1,
      quantileMeans: [0.2, 0.9, 0.1, 0.05, 0.5],
      takenAction: 0,
      cvarAlpha: 0.5,
      capUnits: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 0.9 is the largest mean and sits at index 1 -> STAKE_ACTIONS[1] = 0.25.
      expect(r.data.greedyStake).toBeCloseTo(0.25, 12);
      // With one quantile per action, the CVaR of each action IS its mean, so
      // the tail-aware policy lands on the same action.
      expect(r.data.cvarStake).toBeCloseTo(r.data.greedyStake, 12);
      // Interpolated 10th/90th percentiles of [-2, -1, 0, 1, 2].
      expect(r.data.interQuantileRange).toBeCloseTo(3.2, 10);
    }
  });

  it("FAIL-CLOSES on a quantile length mismatch, a bad action index and a gamma out of range", () => {
    const base = {
      theta: [-1, 0, 1],
      thetaTarget: [-1, 0, 1],
      reward: 0,
      gamma: 1,
      kappa: 1,
      quantileMeans: [0.1, 0.2, -0.1, 0.3, -0.4],
      takenAction: 1,
      cvarAlpha: 0.25,
      capUnits: 2,
    };
    expect(evalQrDqn({ ...base, thetaTarget: [0, 1] }).ok).toBe(false);
    expect(evalQrDqn({ ...base, theta: [] }).ok).toBe(false);
    expect(evalQrDqn({ ...base, takenAction: 99 }).ok).toBe(false);
    expect(evalQrDqn({ ...base, gamma: 1.5 }).ok).toBe(false);
    expect(evalQrDqn({ ...base, kappa: 0 }).ok).toBe(false);
    expect(evalQrDqn({ ...base, quantileMeans: [0.1, 0.2] }).ok).toBe(false);
    const nanQ = evalQrDqn({ ...base, theta: [Number.NaN, 0, 1] });
    expect(nanQ.ok).toBe(false);
    if (!nanQ.ok) expect(nanQ.reason).toContain("quantiles");
  });
});
