import { describe, it, expect } from "vitest";
import {
  bcaMeanCi,
  percentileMeanCi,
  studentizedMeanCi,
  studentizedCi,
  empiricalBernsteinMeanCi,
  jackknifeStandardError,
  meanStatistic,
  normalCdf,
  normalQuantile,
} from "../performance-ci.js";

/** Seeded PRNG (mulberry32) — mirrors the engine's own so the coverage sim below
 * is 100% deterministic and can never flake. */
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

/**
 * BCa performance CIs for continuous ROI/units — the honest uncertainty band on
 * the public ledger. These pin the math (Efron BCa), the DETERMINISM (a public
 * CI must reproduce), and the honest behavior (a 55% even-odds record does NOT
 * yet prove profitability once uncertainty is shown).
 */

describe("normalCdf / normalQuantile", () => {
  it("match known standard-normal values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 3);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 4);
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6);
  });
});

describe("bcaMeanCi", () => {
  // 55 wins (+1) / 45 losses (-1) at even money -> +0.10 units per bet.
  const evenOdds55 = [...Array(55).fill(1), ...Array(45).fill(-1)];

  it("brackets the point estimate and reports the observed mean", () => {
    const ci = bcaMeanCi(evenOdds55, { resamples: 4000, seed: 1 })!;
    expect(ci.point).toBeCloseTo(0.1, 6);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
    expect(ci.n).toBe(100);
  });

  it("is HONEST: a 55/100 even-odds record has a lower bound below break-even (0)", () => {
    // The point is +0.10 units, but the 95% band's lower edge is still negative:
    // we cannot yet claim profitability. This is the whole reason to show the CI.
    const ci = bcaMeanCi(evenOdds55, { resamples: 6000, seed: 7 })!;
    expect(ci.low).toBeLessThan(0);
    expect(ci.high).toBeGreaterThan(0.1);
  });

  it("is DETERMINISTIC: same data + seed -> identical interval (auditable)", () => {
    const a = bcaMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    const b = bcaMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    expect(a.low).toBe(b.low);
    expect(a.high).toBe(b.high);
  });

  it("contains the true mean for a clean symmetric sample", () => {
    const ci = bcaMeanCi(evenOdds55, { resamples: 8000, seed: 3 })!;
    expect(ci.low).toBeLessThanOrEqual(0.1);
    expect(ci.high).toBeGreaterThanOrEqual(0.1);
  });

  it("BCa applies a material skew correction on right-skewed data (longshots)", () => {
    // Varied longshot profile: many small losses, a few varied big wins ->
    // right-skewed and continuous (so the correction is meaningful, not a
    // discrete-ties artifact). BCa's acceleration must be materially non-zero,
    // which is the whole reason BCa beats the plain percentile method here.
    const skewed = [
      -1, -1.2, -0.8, -1, -1.1, -0.9, -1, -1.3, -0.7, -1,
      -1, -0.9, -1.1, -1, -1.2, -0.8, -1, -1, -1.1, -0.9,
      6, 8, 5, 11, 7, 9, 4, 12,
    ];
    const ci = bcaMeanCi(skewed, { resamples: 6000, seed: 9 })!;
    expect(Math.abs(ci.acceleration)).toBeGreaterThan(0.001);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
  });

  it("returns null for too-little data and a point interval for zero variance", () => {
    expect(bcaMeanCi([0.5], {})).toBeNull();
    const flat = bcaMeanCi([2, 2, 2, 2, 2], { resamples: 500, seed: 1 })!;
    expect(flat.low).toBe(2);
    expect(flat.high).toBe(2);
  });

  it("z0 uses the MID-P tie correction: ~0 on a symmetric discrete ledger (hostile-quant fix)", () => {
    // 50/50 +/-1: the resample mean lands ON the point (0) for a non-trivial
    // mass of replicates. Strict '<' counting assigned all that tied mass to
    // 'not below', biasing z0 negative and both bounds down. Mid-p counting
    // (below + equal/2) makes z0 ~0 for this symmetric case, as it must be.
    const symmetric = [...Array(50).fill(1), ...Array(50).fill(-1)];
    const ci = bcaMeanCi(symmetric, { resamples: 8000, seed: 13 })!;
    expect(Math.abs(ci.z0)).toBeLessThan(0.05);
  });

  it("empiricalBernsteinMeanCi: finite-sample worst-case band — wider than studentized, contains the mean, deterministic, refuses bad input", () => {
    // 400 wins at -110 (+0.909...) / 200 losses: strong record, n=600.
    const strong = [...Array(400).fill(100 / 110), ...Array(200).fill(-1)];
    const bern = empiricalBernsteinMeanCi(strong)!;
    const stud = studentizedMeanCi(strong, { resamples: 3000, seed: 1 })!;
    expect(bern.method).toBe("empirical-bernstein");
    expect(bern.low).toBeLessThan(bern.point);
    expect(bern.high).toBeGreaterThan(bern.point);
    // Conservative by design: strictly wider than the second-order bootstrap band.
    expect(bern.high - bern.low).toBeGreaterThan(stud.high - stud.low);
    // Deterministic: closed form, no RNG.
    expect(empiricalBernsteinMeanCi(strong)!.low).toBe(bern.low);
    // A strong 600-pick record STILL clears 0 even under the worst-case bound —
    // the tier is conservative, not impossible (Maurer-Pontil width ~0.14 here).
    expect(bern.low).toBeGreaterThan(0);
    // A thin 53/47 record must NOT clear the worst-case bound.
    const thin = [...Array(53).fill(100 / 110), ...Array(47).fill(-1)];
    expect(empiricalBernsteinMeanCi(thin)!.low).toBeLessThan(0);
    // Guards: too little data, non-finite, bad alpha, zero spread -> point.
    expect(empiricalBernsteinMeanCi([1], {})).toBeNull();
    expect(empiricalBernsteinMeanCi([1, NaN], {})).toBeNull();
    expect(empiricalBernsteinMeanCi([1, 2], { alpha: 0 })).toBeNull();
    const flat = empiricalBernsteinMeanCi([2, 2, 2], {})!;
    expect(flat.low).toBe(2);
    expect(flat.high).toBe(2);
  });

  it("refuses invalid options instead of fabricating intervals (hostile-quant fix)", () => {
    const data = [1, 2, 3, 4, 5];
    expect(bcaMeanCi(data, { resamples: 0 })).toBeNull(); // was: fake point interval
    expect(percentileMeanCi(data, { resamples: 0 })).toBeNull(); // was: NaN bounds
    expect(studentizedMeanCi(data, { resamples: 0 })).toBeNull();
    expect(percentileMeanCi(data, { alpha: -0.1 })).toBeNull(); // was: NaN bounds
    expect(bcaMeanCi(data, { alpha: 1.5 })).toBeNull();
    expect(studentizedMeanCi(data, { alpha: 0 })).toBeNull();
  });
});

describe("studentizedMeanCi (bootstrap-t, second-order accurate)", () => {
  const evenOdds55 = [...Array(55).fill(1), ...Array(45).fill(-1)];

  it("brackets the point and carries the pivot quantiles + plug-in SE on the receipt", () => {
    const ci = studentizedMeanCi(evenOdds55, { resamples: 4000, seed: 1 })!;
    expect(ci.point).toBeCloseTo(0.1, 6);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
    expect(ci.method).toBe("studentized");
    expect(ci.standardError).toBeGreaterThan(0);
    expect(typeof ci.tLow).toBe("number");
    expect(typeof ci.tHigh).toBe("number");
  });

  it("obeys the inversion identity exactly: low = point - tHigh·se, high = point - tLow·se", () => {
    // This is the DEFINITION of the method (tails reverse under inversion). If
    // this identity ever breaks, the interval is not a bootstrap-t interval.
    const ci = studentizedMeanCi(evenOdds55, { resamples: 3000, seed: 5 })!;
    expect(ci.low).toBeCloseTo(ci.point - ci.tHigh! * ci.standardError!, 12);
    expect(ci.high).toBeCloseTo(ci.point - ci.tLow! * ci.standardError!, 12);
  });

  it("is DETERMINISTIC: same data + seed -> identical interval (auditable)", () => {
    const a = studentizedMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    const b = studentizedMeanCi(evenOdds55, { resamples: 3000, seed: 42 })!;
    expect(a.low).toBe(b.low);
    expect(a.high).toBe(b.high);
    expect(a.tLow).toBe(b.tLow);
    expect(a.tHigh).toBe(b.tHigh);
  });

  it("is HONEST: a 55/100 even-odds record still has a lower bound below break-even", () => {
    const ci = studentizedMeanCi(evenOdds55, { resamples: 6000, seed: 7 })!;
    expect(ci.low).toBeLessThan(0);
  });

  it("shows the right-skew signature: the pivot's LOWER tail is heavier (|tLow| > |tHigh|)", () => {
    // Right-skewed continuous returns (many small losses, a few big wins). The
    // studentized pivot t* develops a heavier LEFT tail, so |tLow| > |tHigh|;
    // under inversion that pushes the interval's UPPER edge outward. This is the
    // exact mechanism that gives bootstrap-t its better coverage on skewed means.
    const skewed = [
      -1, -1.2, -0.8, -1, -1.1, -0.9, -1, -1.3, -0.7, -1,
      -1, -0.9, -1.1, -1, -1.2, -0.8, -1, -1, -1.1, -0.9,
      6, 8, 5, 11, 7, 9, 4, 12,
    ];
    const ci = studentizedCi(skewed, meanStatistic, { resamples: 6000, seed: 9 })!;
    expect(Math.abs(ci.tLow!)).toBeGreaterThan(Math.abs(ci.tHigh!));
    // and the interval is wider above the point than below (asymmetric, upward).
    expect(ci.high - ci.point).toBeGreaterThan(ci.point - ci.low);
  });

  it("returns null for too-little data and a point interval for zero variance", () => {
    expect(studentizedMeanCi([0.5], {})).toBeNull();
    const flat = studentizedMeanCi([2, 2, 2, 2, 2], { resamples: 500, seed: 1 })!;
    expect(flat.low).toBe(2);
    expect(flat.high).toBe(2);
    expect(flat.standardError).toBe(0);
  });

  it("REGRESSION (hostile-quant finding): lopsided 24W/1L ledger cannot fabricate a finite lower bound", () => {
    // ~36% of resamples exclude the single loss -> all-win degenerate resamples.
    // Those are the pivot's UPPER tail (theta* above the point with se*=0), i.e.
    // properly +Infinity. The old t*=0 imputation teleported that tail to the
    // center and produced a "95% lower bound" EQUAL to the observed mean of 25
    // bets — a fabricated-certain bound feeding the public profit gate. With the
    // signed-infinity fix the lower bound is honestly -Infinity ("bootstrap-t
    // cannot bound the downside from this ledger") and disclosed.
    const lopsided = [...Array(24).fill(0.909), -1];
    const ci = studentizedMeanCi(lopsided, { resamples: 6000, seed: 20260702 })!;
    expect(ci.degenerateResamples!).toBeGreaterThan(6000 * 0.25); // the regime is real
    expect(ci.low).toBe(Number.NEGATIVE_INFINITY); // NOT a fake finite bound
    expect(ci.low).not.toBe(ci.point); // the old bug's exact signature
    expect(Number.isFinite(ci.high)).toBe(true); // the bounded side stays bounded
  });

  it("mirror lopsided 1W/24L: the UPPER bound is honestly unbounded, lower stays finite", () => {
    const lopsided = [4.0, ...Array(24).fill(-1)];
    const ci = studentizedMeanCi(lopsided, { resamples: 6000, seed: 20260702 })!;
    expect(ci.high).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isFinite(ci.low)).toBe(true);
  });

  it("realistic mixed ledgers have ~zero degenerate resamples (the fix changes nothing there)", () => {
    const mixed = [...Array(55).fill(1), ...Array(45).fill(-1)];
    const ci = studentizedMeanCi(mixed, { resamples: 4000, seed: 1 })!;
    expect(ci.degenerateResamples).toBe(0);
    expect(Number.isFinite(ci.low)).toBe(true);
    expect(Number.isFinite(ci.high)).toBe(true);
  });

  it("K10: tStarSkewness is ~0 on a symmetric ledger (diagnostic sanity)", () => {
    const symmetric = [...Array(50).fill(1), ...Array(50).fill(-1)];
    const ci = studentizedMeanCi(symmetric, { resamples: 6000, seed: 13 })!;
    expect(ci.tStarSkewness).toBeDefined();
    expect(Math.abs(ci.tStarSkewness!)).toBeLessThan(0.15);
  });

  it("K10: tStarSkewness is NEGATIVE on right-skewed returns, consistent with the proven |tLow| > |tHigh| fact", () => {
    // Same fixture family the pivot-asymmetry test uses: right-skewed data
    // makes the PIVOT's lower tail heavier (that is the inversion mechanism),
    // so the skewness of t* must come out negative — a cross-check of the new
    // diagnostic against a property this file already proves independently.
    const skewed = [
      -1, -1.2, -0.8, -1, -1.1, -0.9, -1, -1.3, -0.7, -1,
      -1, -0.9, -1.1, -1, -1.2, -0.8, -1, -1, -1.1, -0.9,
      6, 8, 5, 11, 7, 9, 4, 12,
    ];
    const ci = studentizedMeanCi(skewed, { resamples: 6000, seed: 9 })!;
    expect(ci.tStarSkewness).toBeDefined();
    expect(ci.tStarSkewness!).toBeLessThan(-0.2);
    expect(Math.abs(ci.tLow!)).toBeGreaterThan(Math.abs(ci.tHigh!)); // the independent fact
  });

  it("K10: tStarSkewness is WITHHELD (undefined) when degenerate/infinite pivots exist", () => {
    // A skewness over only the finite pivots would silently drop the exact
    // asymmetric tail being diagnosed — the same overclaim class as the fixed
    // t*=0 imputation bug. On the lopsided ledger the field must be absent.
    const lopsided = [...Array(24).fill(0.909), -1];
    const ci = studentizedMeanCi(lopsided, { resamples: 6000, seed: 20260702 })!;
    expect(ci.degenerateResamples!).toBeGreaterThan(0);
    expect(ci.tStarSkewness).toBeUndefined();
  });

  it("K10: tStarSkewness is absent on the zero-variance point-interval path", () => {
    const flat = studentizedMeanCi([2, 2, 2, 2, 2], { resamples: 500, seed: 1 })!;
    expect(flat.tStarSkewness).toBeUndefined();
  });

  it("supports an injected analytic SE (the method is SE-agnostic)", () => {
    // Supplying s/sqrt(n) directly must match the jackknife default for the mean
    // (they are algebraically equal), proving the injection path is wired right.
    const data = [-1, 2, -1, 3, -1, -1, 4, -1, 1, -1, 2, -1];
    const analyticSe = (s: readonly number[]): number => {
      const m = s.reduce((a, x) => a + x, 0) / s.length;
      const v = s.reduce((a, x) => a + (x - m) ** 2, 0) / (s.length - 1);
      return Math.sqrt(v / s.length);
    };
    const injected = studentizedCi(data, meanStatistic, { resamples: 4000, seed: 3, standardError: analyticSe })!;
    const jack = studentizedMeanCi(data, { resamples: 4000, seed: 3 })!;
    expect(injected.standardError).toBeCloseTo(jack.standardError!, 10);
    expect(injected.low).toBeCloseTo(jack.low, 8);
    expect(injected.high).toBeCloseTo(jack.high, 8);
  });
});

describe("jackknifeStandardError / meanStandardError", () => {
  const data = [3, -1, 4, 1, 5, -9, 2, 6];

  it("jackknife SE equals s/sqrt(n) for the mean (the exact closed form)", () => {
    const m = data.reduce((a, x) => a + x, 0) / data.length;
    const s = Math.sqrt(data.reduce((a, x) => a + (x - m) ** 2, 0) / (data.length - 1));
    expect(jackknifeStandardError(data, meanStatistic)).toBeCloseTo(s / Math.sqrt(data.length), 12);
  });

  it("meanStandardError is EXACTLY the jackknife SE of the mean (justifies the O(n) fast path)", async () => {
    const { meanStandardError } = await import("../performance-ci.js");
    expect(meanStandardError(data)).toBeCloseTo(jackknifeStandardError(data, meanStatistic), 12);
  });

  it("studentizedMeanCi (fast SE) matches jackknife-injected studentizedCi bit-for-bit", async () => {
    // The mean fast path swaps an O(n^2) jackknife for the identical O(n) formula.
    // Same seed + identical SE => identical resamples => identical interval. This
    // proves the optimization changed COST, not the published number.
    const { meanStandardError } = await import("../performance-ci.js");
    const returns = [-1, 2, -1, 3, -1, -1, 4, -1, 1, -1, 2, -1, 5, -1, -1, 2];
    const fast = studentizedMeanCi(returns, { resamples: 3000, seed: 21 })!;
    const viaJack = studentizedCi(returns, meanStatistic, {
      resamples: 3000,
      seed: 21,
      standardError: (s) => jackknifeStandardError(s, meanStatistic),
    })!;
    expect(fast.standardError).toBeCloseTo(viaJack.standardError!, 10);
    expect(fast.low).toBeCloseTo(viaJack.low, 8);
    expect(fast.high).toBeCloseTo(viaJack.high, 8);
    // and confirm it is not accidentally the same as BCa (different method, different number)
    void meanStandardError;
  });
});

/**
 * COMPUTATIONAL PROOF — not an anecdote. A seeded Monte-Carlo that re-verifies,
 * on every CI run, the reason these intervals are in the codebase, across THREE
 * regimes (K9): the original skewed mean, a heavy Pareto tail, and the
 * break-even case that actually guards the public clearsProfit gate.
 *
 * NSIM/B budget, reasoned explicitly: at NSIM=400 the Monte-Carlo SE of a
 * coverage proportion near 0.95 is sqrt(.95*.05/400) ~ 1.09pp, so a 0.90 floor
 * sits ~4.5 SE below nominal — it cannot flake on a legitimate reseed but
 * reliably catches a real coverage collapse (e.g. to 0.80 ~ 14 SE below). Each
 * regime costs ~320ms measured; three regimes stay ~1s, CI-safe. Raising NSIM
 * shrinks SE as 1/sqrt(NSIM) but costs linearly — 400 is the measured balance.
 * The whole sim is seeded, so the numbers are FIXED and can never flake.
 */
describe("coverage is provably near-nominal across regimes (skew / heavy tail / break-even)", () => {
  it("covers Exp(1) true mean at ~95%, at least as well as percentile", () => {
    const NSIM = 400;
    const N = 25;
    const B = 400;
    const TRUE_MU = 1;
    const gen = mulberry32(20260702);
    let studCov = 0;
    let pctCov = 0;
    for (let s = 0; s < NSIM; s++) {
      const data = Array.from({ length: N }, () => -Math.log(gen())); // Exp(1)
      const stud = studentizedMeanCi(data, { resamples: B, seed: 1000 + s })!;
      const pct = percentileMeanCi(data, { resamples: B, seed: 1000 + s })!;
      if (stud.low <= TRUE_MU && TRUE_MU <= stud.high) studCov++;
      if (pct.low <= TRUE_MU && TRUE_MU <= pct.high) pctCov++;
    }
    const studRate = studCov / NSIM;
    const pctRate = pctCov / NSIM;
    // Observed (deterministic): stud=0.9475, pct=0.9300. Assert the meaningful
    // properties with margin so a legitimate refactor doesn't break the proof.
    expect(studRate).toBeGreaterThan(0.9); // near nominal, not badly under-covering
    expect(studRate).toBeLessThanOrEqual(1);
    expect(studRate).toBeGreaterThanOrEqual(pctRate); // the transcript's core claim
  });

  it("K9: covers a Pareto(shape=4) heavy-tailed true mean (BCa + studentized)", () => {
    // Pareto Type I, xm=1, alpha=4: inverse-CDF x = u^(-1/4); TRUE mean is the
    // closed-form alpha/(alpha-1) = 4/3 (standard Pareto first moment — a
    // verifiable textbook fact, not a fitted number). shape=4 > 3 keeps the
    // third moment finite (skewness well-defined) while the tail stays heavy —
    // the hardest regime the bootstrap legs are expected to handle.
    // NOTE: empirical-Bernstein is deliberately NOT asserted here — its own
    // precondition is BOUNDED support, and raw Pareto draws are unbounded;
    // asserting it outside its licensed domain would be a fake proof.
    const NSIM = 400;
    const N = 25;
    const B = 400;
    const TRUE_MU = 4 / 3;
    const gen = mulberry32(40404);
    let studCov = 0;
    let bcaCov = 0;
    for (let s = 0; s < NSIM; s++) {
      const data = Array.from({ length: N }, () => Math.pow(gen(), -1 / 4));
      const stud = studentizedMeanCi(data, { resamples: B, seed: 2000 + s })!;
      const bca = bcaMeanCi(data, { resamples: B, seed: 2000 + s })!;
      if (stud.low <= TRUE_MU && TRUE_MU <= stud.high) studCov++;
      if (bca.low <= TRUE_MU && TRUE_MU <= bca.high) bcaCov++;
    }
    const studRate = studCov / NSIM;
    const bcaRate = bcaCov / NSIM;
    // Observed (deterministic, recorded from the actual run): stud=0.9225,
    // bca=0.8725. Heavy tails degrade everything (the Edgeworth series
    // converges slowly); the proof is that studentized stays NEAR nominal and
    // does not collapse, and remains at least as good as BCa — the reason it
    // exists. Floors sit ~2 SE (1.4pp at these rates) below the observed values.
    expect(studRate).toBeGreaterThan(0.88);
    expect(bcaRate).toBeGreaterThan(0.82);
    expect(studRate).toBeGreaterThanOrEqual(bcaRate);
  });

  it("K9: covers an EXACT break-even mean at -110 and holds the false-profit budget (the clearsProfit-critical case)", () => {
    // Bet-shaped returns at the real -110 price: win pays +100/110, loss -1.
    // p is solved so the true mean is EXACTLY 0: p = 1/(1+win) => p*win-(1-p)=0.
    // This is the regime the public profit gate lives or dies in: a false
    // "lower bound clears 0" here is a false public profit claim.
    const WIN = 100 / 110;
    const P = 1 / (1 + WIN); // exact break-even probability at -110
    const NSIM = 400;
    const N = 25;
    const B = 400;
    const gen = mulberry32(11011);
    let studCov = 0;
    let bcaCov = 0;
    let bernCov = 0;
    let falseProfitAndGate = 0;
    for (let s = 0; s < NSIM; s++) {
      const data = Array.from({ length: N }, () => (gen() < P ? WIN : -1));
      const stud = studentizedMeanCi(data, { resamples: B, seed: 3000 + s })!;
      const bca = bcaMeanCi(data, { resamples: B, seed: 3000 + s })!;
      const bern = empiricalBernsteinMeanCi(data)!;
      if (stud.low <= 0 && 0 <= stud.high) studCov++;
      if (bca.low <= 0 && 0 <= bca.high) bcaCov++;
      if (bern.low <= 0 && 0 <= bern.high) bernCov++;
      // The shipped AND-gate's false-claim event: BOTH lower bounds > 0 while
      // the true mean is exactly 0.
      if (bca.low > 0 && Number.isFinite(stud.low) && stud.low > 0) falseProfitAndGate++;
    }
    // Budget: the one-sided nominal false-claim rate is alpha/2 = 2.5%; at
    // NSIM=400 its MC SE is sqrt(.025*.975/400) ~ 0.78pp, so <= 0.05 is a
    // ~3-SE ceiling that cannot flake while still catching a broken gate.
    expect(falseProfitAndGate / NSIM).toBeLessThanOrEqual(0.05);
    // Coverage floors (observed deterministic, recorded from the actual run:
    // stud=0.9850, bca=0.9600, bern=1.0000, falseProfit=0.0000 — the discrete
    // two-point ledger at small n makes the bootstrap legs CONSERVATIVE here,
    // and Bernstein, a finite-sample bound on its licensed bounded domain,
    // never misses).
    expect(studCov / NSIM).toBeGreaterThan(0.9);
    expect(bcaCov / NSIM).toBeGreaterThan(0.87);
    expect(bernCov / NSIM).toBeGreaterThanOrEqual(0.97);
  });
});

describe("bcaCi general statistic (the confound-adjusted-edge bridge)", () => {
  it("works on a non-mean statistic (median) and brackets it", async () => {
    const { bcaCi } = await import("../performance-ci.js");
    const median = (xs: readonly number[]): number => {
      const s = [...xs].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
    };
    const data = [-2, -1, -1, 0, 0, 0, 1, 1, 2, 5, 8, -3, 0, 1, -1, 0, 2, -2, 1, 0];
    const ci = bcaCi(data, median, { resamples: 4000, seed: 5 })!;
    expect(ci.low).toBeLessThanOrEqual(ci.point);
    expect(ci.high).toBeGreaterThanOrEqual(ci.point);
    expect(ci.n).toBe(20);
  });

  it("a plug-in confound-adjusted statistic flows through unchanged", async () => {
    const { bcaCi } = await import("../performance-ci.js");
    // Toy 'adjusted edge': mean return minus a volatility penalty (variance).
    // The point is only that ANY statistic composes; the machinery is agnostic.
    const adjustedEdge = (xs: readonly number[]): number => {
      const m = xs.reduce((s, x) => s + x, 0) / xs.length;
      const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
      return m - 0.1 * v;
    };
    const ci = bcaCi([1, -1, 1, -1, 1, 1, -1, 2, -2, 1], adjustedEdge, { resamples: 3000, seed: 11 })!;
    expect(Number.isFinite(ci.point)).toBe(true);
    expect(ci.low).toBeLessThanOrEqual(ci.high);
  });
});
