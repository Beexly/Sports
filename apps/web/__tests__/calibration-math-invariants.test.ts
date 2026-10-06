import { describe, it, expect } from "vitest";

import {
  computeCalibration,
  computeDiscrimination,
  buildProjectionSelfPublishingArtifact,
  type CalibrationPickInput,
} from "@/lib/calibration/compute";
import { clopperPearsonInterval } from "@/lib/performance/clopper-pearson-interval";
import { wilsonInterval } from "@/lib/performance/wilson-interval";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { unitsForPick } from "@/lib/performance/public-roi-policy";
import {
  americanToImpliedProbability,
  averageAmericanPrices,
  brierDecomposition,
  computeMoneylineClv,
  computeSpreadClv,
  computeTotalClv,
  expectedCalibrationError,
  reliabilityCurve,
  timeHoldoutSplit,
} from "@sports/prediction-engine";

/**
 * CALIBRATION MATH — PINNING TESTS.
 *
 * The pricing ladder is gated on published calibration (CLAUDE.md: FOUNDING →
 * PROVEN needs "≥100 settled + published calibration"), and Pro/Elite sell
 * "confidence scores calibrated against historical results". That makes this
 * math a claim ABOUT THE STRENGTH OF OUR OWN EVIDENCE — the worst kind to get
 * wrong silently. Every assertion below carries a HAND-COMPUTED expected value
 * in its comment, so the test fails loudly if the arithmetic ever drifts.
 *
 * A test asserting `result > 0` would pass against broken code. Nothing here
 * does that.
 *
 * ALL FIXTURES ARE SYNTHETIC. No number below is a real GSE result, a real win
 * rate, or a real sample size — they are constructed so the expected value is
 * checkable by hand.
 *
 * Runtime assertions only: apps/web/tsconfig.json EXCLUDES __tests__, so a
 * type-level assertion here is never typechecked.
 */

// Small helper so the fixtures read as data, not boilerplate.
function pick(
  id: string,
  confidence: number,
  result: CalibrationPickInput["result"],
): CalibrationPickInput {
  return { id, confidence, result };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRIER SCORE — mean((p − o)²) with p = confidence/100 and o ∈ {0,1}
// ─────────────────────────────────────────────────────────────────────────────

describe("Brier score", () => {
  it("divides confidence by 100 before squaring (hand-computed 0.163)", () => {
    // conf 80, WIN  → p=0.80, o=1 → (0.80 − 1)² = 0.04
    // conf 60, LOSS → p=0.60, o=0 → (0.60 − 0)² = 0.36
    // conf 70, WIN  → p=0.70, o=1 → (0.70 − 1)² = 0.09
    // sum = 0.49, n = 3 → 0.49/3 = 0.163333… → rounded to 3 dp = 0.163
    const report = computeCalibration([
      pick("a", 80, "WIN"),
      pick("b", 60, "LOSS"),
      pick("c", 70, "WIN"),
    ]);
    expect(report.brierScore).toBe(0.163);

    // The classic failure mode this pins out: feeding the raw 0–100 score in as
    // if it were a probability. That would be
    //   ((80−1)² + (60−0)² + (70−1)²)/3 = (6241 + 3600 + 4761)/3 = 4867.333…
    // — inflated by ~30,000× and outside the [0,1] range a Brier score lives in.
    expect(report.brierScore!).toBeLessThanOrEqual(1);
    expect(report.brierScore!).toBeGreaterThanOrEqual(0);
  });

  it("is computed over the settled sample, not diluted by empty confidence buckets", () => {
    // Two settled picks, both at confidence 95, one WIN one LOSS:
    //   (0.95 − 1)² = 0.0025
    //   (0.95 − 0)² = 0.9025
    //   mean = 0.9050 / 2 = 0.4525 → rounded to 3 dp = 0.453
    //
    // Only the 90-100 bucket is populated; the other four are empty. Averaging
    // the five BUCKET Brier scores instead (empties contributing 0) would give
    // (0 + 0 + 0 + 0 + 0.4525)/5 = 0.0905 — an "excellent" score manufactured
    // entirely out of buckets that contain no data.
    const report = computeCalibration([pick("a", 95, "WIN"), pick("b", 95, "LOSS")]);
    expect(report.brierScore).toBe(0.453);
    expect(report.brierScore).not.toBe(0.091);

    const empties = report.buckets.filter((b) => b.sampleSize === 0);
    expect(empties.length).toBe(4);
    for (const b of empties) expect(b.brierScore).toBe(0);
  });

  it("reports null — never 0 — when there is nothing settled", () => {
    // A Brier score of 0 means PERFECT calibration. Emitting 0 for an empty
    // sample would publish the best possible score off no evidence at all.
    const report = computeCalibration([]);
    expect(report.brierScore).toBeNull();
    expect(report.sampleSize).toBe(0);
    expect(report.population.decided).toBe(0);
    expect(report.headlineClopperPearsonLow).toBeNull();
    expect(report.headlineClopperPearsonHigh).toBeNull();
    expect(report.proposals).toEqual([]);
    expect(report.discrimination.trend).toBe("insufficient-data");
  });

  it("excludes PENDING picks from the settled population entirely", () => {
    // Two settled (conf 80 WIN, conf 60 LOSS) + one PENDING at conf 90.
    //   (0.80 − 1)² = 0.04
    //   (0.60 − 0)² = 0.36
    //   mean over the 2 SETTLED = 0.40/2 = 0.200
    // If the PENDING pick leaked in as an outcome-0 row it would become
    // (0.04 + 0.36 + 0.81)/3 = 0.403333… — a materially worse published score
    // driven by a game that has not happened.
    const report = computeCalibration([
      pick("a", 80, "WIN"),
      pick("b", 60, "LOSS"),
      pick("c", 90, "PENDING"),
    ]);
    expect(report.sampleSize).toBe(2);
    expect(report.population.pending).toBe(1);
    expect(report.brierScore).toBe(0.2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. RELIABILITY / BUCKETING — half-open, non-overlapping, empties excluded
// ─────────────────────────────────────────────────────────────────────────────

describe("confidence bucket boundaries", () => {
  /** Which bucket label a lone pick at this confidence lands in. */
  function labelFor(confidence: number): string | null {
    const report = computeCalibration([pick("x", confidence, "WIN")]);
    const populated = report.buckets.filter((b) => b.sampleSize > 0);
    // Exactly-one-bucket is the invariant: half-open edges must not drop a
    // value into a gap, nor double-count it into two buckets.
    expect(populated.length).toBe(1);
    return populated[0]?.label ?? null;
  }

  it("places a value sitting exactly on an edge in exactly one bucket", () => {
    expect(labelFor(59)).toBe("50-59");
    expect(labelFor(60)).toBe("60-69"); // the edge belongs to the UPPER bucket
    expect(labelFor(69)).toBe("60-69");
    expect(labelFor(70)).toBe("70-79");
    expect(labelFor(79)).toBe("70-79");
    expect(labelFor(80)).toBe("80-89");
    expect(labelFor(89)).toBe("80-89");
    expect(labelFor(90)).toBe("90-100"); // top edge belongs to the top bucket
    expect(labelFor(100)).toBe("90-100");
  });

  it("has no gap between the integer labels — a fractional score still lands", () => {
    // The labels read "60-69" / "80-89", but the edges are half-open on the NEXT
    // bucket's floor. A closed-interval reading (>= min && <= max) would drop
    // 69.3 and 89.5 into no bucket at all, silently shrinking every denominator.
    expect(labelFor(69.3)).toBe("60-69");
    expect(labelFor(69.999)).toBe("60-69");
    expect(labelFor(89.5)).toBe("80-89");
    expect(labelFor(59.5)).toBe("50-59");
  });

  it("keeps every settled pick in exactly one bucket (sample sizes sum to n)", () => {
    const picks = [50, 59, 60, 69.3, 70, 79.9, 80, 89.5, 90, 100].map((c, i) =>
      pick(`p${i}`, c, i % 2 === 0 ? "WIN" : "LOSS"),
    );
    const report = computeCalibration(picks);
    const summed = report.buckets.reduce((sum, b) => sum + b.sampleSize, 0);
    expect(report.sampleSize).toBe(10);
    expect(summed).toBe(10); // no gaps (would be < 10), no overlaps (> 10)
  });

  it("excludes empty buckets from the discrimination trend rather than scoring them 0", () => {
    // 25 settled picks in ONE bucket. The other four buckets are empty and
    // carry observedWinRate 0 by construction. If those zeros counted as real
    // buckets, the trend would read a spurious rise/fall between an empty
    // "50-59" at 0% and the populated bucket. It must read insufficient-data:
    // a trend needs two buckets with real samples.
    const picks = Array.from({ length: 25 }, (_, i) =>
      pick(`p${i}`, 85, i < 15 ? "WIN" : "LOSS"),
    );
    const report = computeCalibration(picks);
    expect(report.discrimination.populatedBucketCount).toBe(1);
    expect(report.discrimination.trend).toBe("insufficient-data");
    expect(report.discrimination.spread).toBeNull();
  });

  it("scores an empty bucket's expected rate from its midpoint, with no sample and no band", () => {
    // An empty 70-79 bucket reports expectedWinRate (70+79)/200 = 0.745 — a
    // label, not a measurement — with sampleSize 0, no interval, and
    // sufficientSample false so nothing renders it.
    const report = computeCalibration([pick("a", 95, "WIN")]);
    const empty = report.buckets.find((b) => b.label === "70-79")!;
    expect(empty.sampleSize).toBe(0);
    expect(empty.expectedWinRate).toBe(0.745);
    expect(empty.sufficientSample).toBe(false);
    expect(empty.clopperPearsonLow).toBeNull();
    expect(empty.clopperPearsonHigh).toBeNull();
  });
});

describe("engine reliability bins (equal-width, [k/n, (k+1)/n))", () => {
  it("assigns a forecast exactly on a bin edge to the upper bin, and p=1 to the last", () => {
    const samples = [
      { p: 0.1, y: 1 as const },
      { p: 0.2, y: 0 as const },
      { p: 1, y: 1 as const },
      { p: 0, y: 0 as const },
    ];
    const curve = reliabilityCurve(samples, 10);
    const counts = curve.map((b) => b.count);
    // bin 0 = [0.0,0.1) gets p=0; bin 1 = [0.1,0.2) gets p=0.1;
    // bin 2 = [0.2,0.3) gets p=0.2; bin 9 = [0.9,1.0] absorbs p=1.
    expect(counts).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 1]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(samples.length);
  });

  it("reports an empty bin as count 0 rather than a fabricated 0% observed rate point", () => {
    const curve = reliabilityCurve([{ p: 0.85, y: 1 }], 10);
    const populated = curve.filter((b) => b.count > 0);
    expect(populated.length).toBe(1);
    expect(populated[0]!.meanForecast).toBe(0.85);
    expect(populated[0]!.observedRate).toBe(1);
    // Every other bin is count 0 — consumers filter on count, they do not read
    // the 0/0 placeholders as data points.
    expect(curve.filter((b) => b.count === 0).length).toBe(9);
  });
});

describe("expected calibration error", () => {
  it("is sample-weighted across bins, not an unweighted mean (hand-computed 0.1667)", () => {
    // Bin 3 = [0.3,0.4): 10 samples at p=0.35, 4 wins → observed 0.40, gap 0.05
    // Bin 7 = [0.7,0.8):  2 samples at p=0.75, 0 wins → observed 0.00, gap 0.75
    // n = 12
    //   ECE = (10/12)(0.05) + (2/12)(0.75)
    //       = 0.0416666… + 0.125 = 0.1666666… → rounded to 4 dp = 0.1667
    //
    // Two wrong answers this pins out:
    //   unweighted mean over the 2 POPULATED bins = (0.05 + 0.75)/2 = 0.4
    //   unweighted mean over all 10 bins (empties as 0) = 0.8/10 = 0.08
    // The second is the dangerous one: empty bins would drag ECE toward 0 and
    // report near-perfect calibration.
    const samples = [
      ...Array.from({ length: 10 }, (_, i) => ({ p: 0.35, y: (i < 4 ? 1 : 0) as 0 | 1 })),
      ...Array.from({ length: 2 }, () => ({ p: 0.75, y: 0 as const })),
    ];
    const ece = expectedCalibrationError(samples, 10);
    expect(ece).toBe(0.1667);
    expect(ece).not.toBe(0.4);
    expect(ece).not.toBe(0.08);
  });

  it("returns 0 for an empty sample and is never negative", () => {
    expect(expectedCalibrationError([], 10)).toBe(0);
  });
});

describe("Murphy decomposition", () => {
  it("satisfies brier = reliability − resolution + uncertainty exactly on within-bin-constant forecasts", () => {
    // Fixture (synthetic): three picks at p=0.8 (2 wins) and three at p=0.2 (1 win).
    // n = 6, base rate = 3/6 = 0.5.
    //
    // raw Brier = [2(0.8−1)² + (0.8−0)² + 2(0.2−0)² + (0.2−1)²] / 6
    //           = [2(0.04) + 0.64 + 2(0.04) + 0.64] / 6 = 1.44/6 = 0.24
    //
    // bin 8 (p=0.8): n=3, meanForecast 0.8, observed 2/3
    // bin 2 (p=0.2): n=3, meanForecast 0.2, observed 1/3
    //   reliability = [3(0.8 − 2/3)² + 3(0.2 − 1/3)²]/6
    //               = [3(0.017777…) + 3(0.017777…)]/6 = 0.106666…/6 = 0.017777… → 0.0178
    //   resolution  = [3(2/3 − 0.5)² + 3(1/3 − 0.5)²]/6
    //               = [3(0.027777…) + 3(0.027777…)]/6 = 0.166666…/6 = 0.027777… → 0.0278
    //   uncertainty = 0.5 × 0.5 = 0.25
    //
    // Identity check: 0.017777… − 0.027777… + 0.25 = 0.24 = raw Brier ✓
    // (exact here because every forecast inside a bin is identical).
    const samples = [
      { p: 0.8, y: 1 as const },
      { p: 0.8, y: 1 as const },
      { p: 0.8, y: 0 as const },
      { p: 0.2, y: 0 as const },
      { p: 0.2, y: 0 as const },
      { p: 0.2, y: 1 as const },
    ];
    const d = brierDecomposition(samples, 10);
    expect(d.brier).toBe(0.24);
    expect(d.reliability).toBe(0.0178);
    expect(d.resolution).toBe(0.0278);
    expect(d.uncertainty).toBe(0.25);
    expect(d.baseRate).toBe(0.5);
    expect(d.sampleSize).toBe(6);
    expect(d.reliability - d.resolution + d.uncertainty).toBeCloseTo(d.brier, 4);
  });

  it("skips empty bins in both reliability and resolution", () => {
    // All six samples in ONE bin. Eight of the ten bins are empty; if an empty
    // bin contributed (0 − baseRate)² to resolution it would fabricate
    // discrimination out of nothing.
    const samples = Array.from({ length: 6 }, (_, i) => ({
      p: 0.55,
      y: (i < 3 ? 1 : 0) as 0 | 1,
    }));
    const d = brierDecomposition(samples, 10);
    // observed = 3/6 = 0.5 = base rate → resolution is exactly 0.
    expect(d.baseRate).toBe(0.5);
    expect(d.resolution).toBe(0);
    // reliability = (0.55 − 0.5)² = 0.0025 (single bin, all weight).
    expect(d.reliability).toBe(0.0025);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONFIDENCE → PROBABILITY MAPPING
// ─────────────────────────────────────────────────────────────────────────────

describe("confidence → probability mapping", () => {
  it("is confidence/100, clamped to [0.01, 0.99], and is documented as such", () => {
    // A single WIN at confidence 100: p is clamped to 0.99, so the Brier
    // contribution is (0.99 − 1)² = 0.0001 → 0.000 at 3 dp. Without the clamp it
    // would be exactly 0 — a "perfect forecast" claim the model has not earned.
    const perfect = computeCalibration([pick("a", 100, "WIN")]);
    expect(perfect.brierScore).toBe(0);
    // The clamp is visible on the loss side, where it costs rather than flatters:
    // (0.99 − 0)² = 0.9801 → 0.98.
    const wrong = computeCalibration([pick("a", 100, "LOSS")]);
    expect(wrong.brierScore).toBe(0.98);
    // And at the bottom: conf 0 clamps to 0.01 → (0.01 − 1)² = 0.9801.
    const floorLoss = computeCalibration([pick("a", 0, "WIN")]);
    expect(floorLoss.brierScore).toBe(0.98);
  });

  it("publishes the disclaimer that the rate is decided-only and the band is exact", () => {
    // The mapping is only honest if it travels with the caveat. Pin the
    // disclaimer text so a copy edit cannot quietly drop it.
    const report = computeCalibration([pick("a", 80, "WIN")]);
    expect(report.disclaimer).toContain("decided picks only");
    expect(report.disclaimer).toContain("Clopper-Pearson");
    expect(report.disclaimer).toContain("Past performance does not guarantee future results");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SAMPLE-SIZE HANDLING + INTERVAL METHOD
// ─────────────────────────────────────────────────────────────────────────────

describe("minimum-sample gating on the published surface", () => {
  it("refuses to mark a 2-pick bucket publishable even at a 100% observed rate", () => {
    const report = computeCalibration([pick("a", 95, "WIN"), pick("b", 96, "WIN")]);
    const top = report.buckets.find((b) => b.label === "90-100")!;
    expect(top.sampleSize).toBe(2);
    expect(top.wins).toBe(2);
    // The rate is computed (proposals and discrimination read it) but the
    // publish flag is false, and every public renderer gates on that flag.
    expect(top.sufficientSample).toBe(false);
  });

  it("flips sufficientSample at exactly 30 decided picks, not at 29", () => {
    const build = (n: number) =>
      computeCalibration(
        Array.from({ length: n }, (_, i) => pick(`p${i}`, 85, i % 2 === 0 ? "WIN" : "LOSS")),
      ).buckets.find((b) => b.label === "80-89")!;
    expect(build(29).sufficientSample).toBe(false);
    expect(build(30).sufficientSample).toBe(true);
  });

  it("withholds the public win rate below the canonical floor and releases it at the floor", () => {
    const base = {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalPushes: 0,
      canonicalVoids: 0,
    };
    // 99 decided → below the floor → blocked, no rate, no band.
    const below = evaluatePublicPerformancePolicy({
      ...base,
      canonicalSettledCount: 99,
      canonicalWins: 55,
      canonicalLosses: 44,
    });
    expect(below.blockers).toContain("INSUFFICIENT_CANONICAL_SAMPLE");
    expect(below.publicWinRate).toBeNull();
    expect(below.publicWinRateCiLowPct).toBeNull();

    // 100 decided, 55 wins → 55/100 = 55.0%.
    const at = evaluatePublicPerformancePolicy({
      ...base,
      canonicalSettledCount: 100,
      canonicalWins: 55,
      canonicalLosses: 45,
    });
    expect(at.canExposePerformanceStats).toBe(true);
    expect(at.eligibleForRateCount).toBe(100);
    expect(at.publicWinRate).toBe(55);
  });

  it("never lets a proposal fire off a bucket below the proposal sample floor", () => {
    // 10 settled picks at confidence 90, ALL losses: observed 0%, expected 90%,
    // |delta| = 0.9 — far past the 0.12 proposal threshold. It must still emit
    // no proposal, because 10 picks is not evidence of a 90-point miscalibration.
    const report = computeCalibration(
      Array.from({ length: 10 }, (_, i) => pick(`p${i}`, 90, "LOSS")),
    );
    const top = report.buckets.find((b) => b.label === "90-100")!;
    expect(top.sampleSize).toBe(10);
    expect(Math.abs(top.delta)).toBeGreaterThan(0.12);
    expect(report.proposals).toEqual([]);
  });
});

describe("interval method for a proportion", () => {
  it("Clopper-Pearson 9/20 is the exact [0.2306, 0.6847] band", () => {
    // Exact binomial interval via the Beta quantile relation:
    //   low  = BetaInv(0.025, 9, 20−9+1) = BetaInv(0.025, 9, 12)  ≈ 0.23056
    //   high = BetaInv(0.975, 9+1, 20−9) = BetaInv(0.975, 10, 11) ≈ 0.68467
    // These are the textbook Clopper-Pearson values for 9 successes in 20.
    const ci = clopperPearsonInterval(9, 20)!;
    expect(ci.n).toBe(20);
    expect(ci.point).toBe(0.45);
    expect(ci.low).toBeCloseTo(0.2306, 4);
    expect(ci.high).toBeCloseTo(0.6847, 4);
    expect(ci.low).toBeLessThan(ci.point);
    expect(ci.high).toBeGreaterThan(ci.point);
  });

  it("stays inside [0,1] and keeps positive width at the degenerate 0/n and n/n edges", () => {
    // 0 successes in 10: the naive normal approximation gives p̂ ± 1.96·√(0/10)
    // = [0, 0] — a zero-width interval claiming certainty from ten failures.
    // Clopper-Pearson gives [0, 1 − 0.025^(1/10)] = [0, 0.30850].
    const none = clopperPearsonInterval(0, 10)!;
    expect(none.low).toBe(0);
    expect(none.high).toBeCloseTo(0.3085, 4);
    expect(none.high).toBeLessThanOrEqual(1);

    // 10 successes in 10: naive normal again gives [1, 1]. Exact gives
    // [0.025^(1/10), 1] = [0.69150, 1].
    const all = clopperPearsonInterval(10, 10)!;
    expect(all.low).toBeCloseTo(0.6915, 4);
    expect(all.high).toBe(1);
    expect(all.low).toBeGreaterThanOrEqual(0);
  });

  it("returns null rather than a band when there are no trials", () => {
    expect(clopperPearsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("Wilson 9/20 is [0.2582, 0.6579] and is strictly narrower than Clopper-Pearson", () => {
    // z = 1.959963984540054, p̂ = 0.45, n = 20, z² = 3.8414588…
    //   denom  = 1 + z²/n = 1.1920729…
    //   center = (0.45 + z²/40)/denom = 0.5460365/1.1920729 = 0.4580566…
    //   margin = (z/denom)·√(0.45·0.55/20 + z²/1600)
    //          = 1.6441656·√(0.012375 + 0.0024009) = 1.6441656·0.1215562 = 0.1998552…
    //   low  = 0.2582014…  high = 0.6579118…
    const w = wilsonInterval(9, 20)!;
    expect(w.point).toBe(0.45);
    expect(w.low).toBeCloseTo(0.2582, 4);
    expect(w.high).toBeCloseTo(0.6579, 4);

    // Clopper-Pearson never under-covers, so it is the wider band on both sides.
    const cp = clopperPearsonInterval(9, 20)!;
    expect(cp.low).toBeLessThan(w.low);
    expect(cp.high).toBeGreaterThan(w.high);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUSH / VOID / CANCELLED HANDLING
// ─────────────────────────────────────────────────────────────────────────────

describe("push and void handling across aggregates", () => {
  it("keeps pushes in the population and out of the decided denominator", () => {
    // 9 WIN, 11 LOSS, 5 PUSH, 2 VOID. Decided = 9 + 11 = 20.
    const picks = [
      ...Array.from({ length: 9 }, (_, i) => pick(`w${i}`, 75, "WIN")),
      ...Array.from({ length: 11 }, (_, i) => pick(`l${i}`, 75, "LOSS")),
      ...Array.from({ length: 5 }, (_, i) => pick(`p${i}`, 75, "PUSH")),
      ...Array.from({ length: 2 }, (_, i) => pick(`v${i}`, 75, "VOID")),
    ];
    const report = computeCalibration(picks);
    expect(report.population.wins).toBe(9);
    expect(report.population.losses).toBe(11);
    expect(report.population.pushes).toBe(5);
    expect(report.population.voids).toBe(2);
    expect(report.population.decided).toBe(20);

    // The headline band is the exact interval on 9 of 20 DECIDED picks — the
    // same [0.2306, 0.6847] verified above. If pushes had been folded into the
    // denominator it would be 9 of 25 and the band would move to ≈[0.19, 0.55].
    expect(report.headlineClopperPearsonLow).toBeCloseTo(0.231, 3);
    expect(report.headlineClopperPearsonHigh).toBeCloseTo(0.685, 3);
  });

  it("survives an all-pushes sample without inventing a decided record", () => {
    // Three PUSH picks at confidence 70 and nothing else settled.
    //   decided = 0 → no binomial interval exists, so no band is published.
    //   Brier still scores the forecast against the neutral 0.5 push outcome:
    //   (0.70 − 0.5)² = 0.04 for each of the 3 → mean 0.04.
    //
    // (The decided-only per-bucket RATE on an all-push bucket is settled in the
    // push-handling branch; this test deliberately asserts only the invariants
    // that hold either way.)
    const report = computeCalibration(
      Array.from({ length: 3 }, (_, i) => pick(`p${i}`, 70, "PUSH")),
    );
    expect(report.sampleSize).toBe(3);
    expect(report.population.decided).toBe(0);
    expect(report.population.pushes).toBe(3);
    expect(report.headlineClopperPearsonLow).toBeNull();
    expect(report.headlineClopperPearsonHigh).toBeNull();
    expect(report.brierScore).toBe(0.04);

    const bucket = report.buckets.find((b) => b.label === "70-79")!;
    expect(bucket.wins).toBe(0);
    expect(bucket.losses).toBe(0);
    expect(bucket.pushes).toBe(3);
    expect(bucket.clopperPearsonLow).toBeNull();
    expect(bucket.clopperPearsonHigh).toBeNull();
    expect(bucket.sufficientSample).toBe(false);
  });

  it("prints the record with pushes and voids broken out, never folded into W or L", () => {
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 10,
      canonicalSettledCount: 25,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 9,
      canonicalLosses: 11,
      canonicalPushes: 5,
      canonicalVoids: 2,
    });
    expect(policy.publicRecord).toBe("9W-11L-5P-2V");
    // 9 of 20 decided = 45.0%. Folding 5 pushes in as losses would read 36.0%;
    // folding them in as wins would read 56.0%. Neither is the record.
    expect(policy.eligibleForRateCount).toBe(20);
    expect(policy.publicWinRate).toBe(45);
  });

  it("scores a push as a settled 0-unit bet — not a loss, not a skip", () => {
    // Flat 1-unit stake at −110: decimal odds 1.909090…, so a win returns
    // +0.909090… units and a loss returns −1.
    expect(unitsForPick("WIN", -110)).toBeCloseTo(0.90909, 5);
    expect(unitsForPick("LOSS", -110)).toBe(-1);
    expect(unitsForPick("PUSH", -110)).toBe(0);
    expect(unitsForPick("VOID", -110)).toBe(0);
    // PENDING has no realized return at all — excluded, never a settled 0.
    expect(unitsForPick("PENDING", -110)).toBeNull();
    // No sealed entry price → excluded rather than guessed.
    expect(unitsForPick("WIN", null)).toBeNull();

    // Worked ledger: WIN, LOSS, PUSH at −110.
    //   correct        → (0.909090… − 1 + 0)/3 = −0.030303… units/bet
    //   push as a loss → (0.909090… − 1 − 1)/3 = −0.363636… units/bet
    //   push dropped   → (0.909090… − 1)/2     = −0.045454… units/bet
    const ledger = (["WIN", "LOSS", "PUSH"] as const)
      .map((r) => unitsForPick(r, -110))
      .filter((u): u is number => u !== null);
    expect(ledger.length).toBe(3);
    const mean = ledger.reduce((a, b) => a + b, 0) / ledger.length;
    expect(mean).toBeCloseTo(-0.030303, 6);
    expect(mean).not.toBeCloseTo(-0.363636, 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLV — both sides of the comparison carry the same vig treatment
// ─────────────────────────────────────────────────────────────────────────────

describe("closing-line value", () => {
  it("compares like with like: identical taken and closing prices give exactly zero CLV", () => {
    // This is the load-bearing invariant. If the closing price were de-vigged
    // and the taken price were not, identical prices would NOT cancel: at −110
    // both sides, the two-way overround is 0.5238095×2 = 1.0476190, so a
    // proportionally de-vigged close is 0.5000000 while the taken price still
    // reads 0.5238095. CLV would be 0.5 − 0.5238095 = −0.0238095 on a pick that
    // moved not at all — every pick would grade LOST_TO_CLOSE, biasing the
    // published beat-close rate downward on a symmetric market (and upward if
    // the mismatch ran the other way).
    for (const price of [-110, -200, 100, 150, -105]) {
      const r = computeMoneylineClv(price, price);
      expect(r.clvProbability).toBe(0);
      expect(r.verdict).toBe("MATCHED_CLOSE");
    }
  });

  it("grades a moneyline move with the hand-computed implied-probability delta", () => {
    // Taken −110 → implied 110/210 = 0.5238095…
    // Closed −130 → implied 130/230 = 0.5652174…
    // CLV = close − taken = 0.0414079… → rounded to 4 dp = 0.0414 (BEAT_CLOSE:
    // we locked a longer price than the market settled on).
    expect(americanToImpliedProbability(-110)).toBeCloseTo(0.5238095, 7);
    expect(americanToImpliedProbability(-130)).toBeCloseTo(0.5652174, 7);

    const beat = computeMoneylineClv(-110, -130);
    expect(beat.clvProbability).toBe(0.0414);
    expect(beat.clvPercent).toBe(4.14);
    expect(beat.verdict).toBe("BEAT_CLOSE");

    // Exactly antisymmetric the other way.
    const lost = computeMoneylineClv(-130, -110);
    expect(lost.clvProbability).toBe(-0.0414);
    expect(lost.verdict).toBe("LOST_TO_CLOSE");
  });

  it("averages closing moneylines in probability space across the ±100 discontinuity", () => {
    // Books at −102 and +105:
    //   implied(−102) = 102/202 = 0.5049505…
    //   implied(+105) = 100/205 = 0.4878049…
    //   mean = 0.4963777… → under 0.5 → underdog → +((1−p)/p)·100
    //        = (0.5036223/0.4963777)·100 = 101.4595… → +101
    // The arithmetic mean of the AMERICAN numbers is (−102 + 105)/2 = +1.5,
    // which is not a real price and implies 100/101.5 = 0.985 — a fabricated
    // 98.5% closing favourite that would flip the CLV verdict on the pick.
    expect(averageAmericanPrices([-102, 105])).toBe(101);
    expect(averageAmericanPrices([])).toBeNull();
  });

  it("grades spread and total CLV with the documented sign convention", () => {
    // SPREAD lines are home-perspective.
    // Bet HOME −3, close home −4 → we laid fewer points → (−3) − (−4) = +1 BEAT.
    expect(computeSpreadClv(-3, -4, "HOME")).toEqual({ clvPoints: 1, verdict: "BEAT_CLOSE" });
    // Bet AWAY at home line +3, close home +2 → away now lays fewer points than
    // our lock → 2 − 3 = −1 LOST.
    expect(computeSpreadClv(3, 2, "AWAY")).toEqual({ clvPoints: -1, verdict: "LOST_TO_CLOSE" });
    // No movement is MATCHED, not a coin-flip.
    expect(computeSpreadClv(-3, -3, "HOME").verdict).toBe("MATCHED_CLOSE");

    // TOTAL: OVER wants the lower number → close − pick.
    expect(computeTotalClv(44.5, 46, "OVER")).toEqual({ clvPoints: 1.5, verdict: "BEAT_CLOSE" });
    expect(computeTotalClv(44.5, 46, "UNDER")).toEqual({
      clvPoints: -1.5,
      verdict: "LOST_TO_CLOSE",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. TIME ORDERING / LOOKAHEAD
// ─────────────────────────────────────────────────────────────────────────────

describe("time ordering", () => {
  it("splits a calibration hold-out strictly in time, never by shuffle", () => {
    // t = 1..10 fed in REVERSE order. A time hold-out at 70% must still put
    // t ≤ 7 in train and t ≥ 8 in test: fitting on a later window and scoring an
    // earlier one is lookahead, and it flatters the fitted map.
    const samples = Array.from({ length: 10 }, (_, i) => ({
      p: 0.5,
      y: (i % 2) as 0 | 1,
      t: 10 - i,
    }));
    const split = timeHoldoutSplit(samples, 0.7);
    expect(split.train.map((s) => s.t)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(split.test.map((s) => s.t)).toEqual([8, 9, 10]);
    const maxTrain = Math.max(...split.train.map((s) => s.t));
    const minTest = Math.min(...split.test.map((s) => s.t));
    expect(maxTrain).toBeLessThan(minTest);
  });

  it("keeps both sides non-empty so a hold-out score is always over unseen rows", () => {
    const samples = Array.from({ length: 3 }, (_, i) => ({ p: 0.5, y: 1 as const, t: i }));
    const split = timeHoldoutSplit(samples, 0.95);
    expect(split.train.length).toBeGreaterThan(0);
    expect(split.test.length).toBeGreaterThan(0);
  });

  it("fails the pre-game-commit criterion when a projection was committed after settlement", () => {
    // A forecast recorded AFTER the outcome is known is not a forecast. The
    // published-projections artifact must refuse it by name, not silently score it.
    const row = {
      id: "synthetic-1",
      position: "QB",
      predictedFantasyPoints: 20,
      actualFantasyPoints: 21,
      intervalLower: 15,
      intervalUpper: 25,
      marketFantasyPoints: 19,
      preGameCommittedAt: "2026-01-02T00:00:00.000Z", // AFTER settlement
      settledAt: "2026-01-01T00:00:00.000Z",
    };
    const after = buildProjectionSelfPublishingArtifact([row], {
      generatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(after.canPublishProjections.failedCriteria).toContain("pre-game-commit");
    expect(after.canPublishProjections.eligibleIfOwnerApproves).toBe(false);

    // Same row committed BEFORE settlement clears that particular criterion
    // (others still fail on a 1-row sample — the artifact stays DRAFT_ONLY).
    const before = buildProjectionSelfPublishingArtifact(
      [{ ...row, preGameCommittedAt: "2025-12-31T00:00:00.000Z" }],
      { generatedAt: "2026-01-03T00:00:00.000Z" },
    );
    expect(before.canPublishProjections.failedCriteria).not.toContain("pre-game-commit");
    expect(before.status).toBe("DRAFT_ONLY");
  });

  it("never marks a projections artifact publishable on an empty sample", () => {
    const empty = buildProjectionSelfPublishingArtifact([], {
      generatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(empty.sampleSize).toBe(0);
    expect(empty.overallModelMae).toBeNull();
    expect(empty.intervalCoverage).toBeNull();
    expect(empty.rankCorrelation).toBeNull();
    expect(empty.scores.brierScore).toBeNull();
    expect(empty.canPublishProjections.eligibleIfOwnerApproves).toBe(false);
    expect(empty.canPublishProjections.failedCriteria).toContain("min-sample-size");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Discrimination — the market-neutral rank-quality read
// ─────────────────────────────────────────────────────────────────────────────

describe("discrimination trend", () => {
  it("needs two buckets over the discrimination floor before it reads a direction", () => {
    // One bucket at 20 settled, one at 19: only the first counts, so no trend.
    const buckets = [
      { sampleSize: 20, observedWinRate: 0.4, confidenceMin: 50, label: "50-59" },
      { sampleSize: 19, observedWinRate: 0.7, confidenceMin: 60, label: "60-69" },
    ].map((b) => ({
      label: b.label,
      confidenceMin: b.confidenceMin,
      confidenceMax: b.confidenceMin + 9,
      sampleSize: b.sampleSize,
      observedWinRate: b.observedWinRate,
      expectedWinRate: 0.55,
      delta: 0,
      brierScore: 0.25,
      sufficientSample: false,
      wins: 0,
      losses: 0,
      pushes: 0,
      voids: 0,
      clopperPearsonLow: null,
      clopperPearsonHigh: null,
    }));
    const d = computeDiscrimination(buckets);
    expect(d.populatedBucketCount).toBe(1);
    expect(d.trend).toBe("insufficient-data");
    expect(d.spread).toBeNull();
  });

  it("calls a falling win rate INVERTED rather than smoothing it away", () => {
    // 0.42 at the top vs 0.61 at the bottom → spread = −0.19: higher confidence
    // winning LESS often. A red flag must surface as one.
    const mk = (label: string, min: number, rate: number) => ({
      label,
      confidenceMin: min,
      confidenceMax: min + 9,
      sampleSize: 40,
      observedWinRate: rate,
      expectedWinRate: min / 100,
      delta: 0,
      brierScore: 0.25,
      sufficientSample: true,
      wins: 0,
      losses: 0,
      pushes: 0,
      voids: 0,
      clopperPearsonLow: null,
      clopperPearsonHigh: null,
    });
    const d = computeDiscrimination([mk("50-59", 50, 0.61), mk("80-89", 80, 0.42)]);
    expect(d.trend).toBe("inverted");
    expect(d.spread).toBe(-0.19);
    expect(d.monotonic).toBe(false);
    expect(d.note).toContain("red flag");
  });
});
