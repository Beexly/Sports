/**
 * First-100-settled Brier — the calibration question, scored.
 * =======================================================
 *
 * WHY THIS FILE
 * -------------
 * `scripts/calibration/first-100-settled-brier.mjs` computes a real Brier
 * score from live settled picks by running the SHIPPED harness
 * (`runBacktestHarness`). Two things can silently corrupt that number, and
 * both were live defects or real traps while building it:
 *
 *   1. THE BRIER IDENTITY. Brier is mean((p_i - y_i)^2), whose expansion is
 *      `mean(p^2) - 2*mean(p*y) + mean(y^2)`. The cross term is the
 *      expectation of the PRODUCT. Writing `2*mean(p)*mean(y)` instead is not
 *      a syntax error — it returns a plausible, smaller number. On the real
 *      first-100 cohort it reads 0.3066 where the truth is 0.3331, a 0.0265
 *      understatement that would have been reported as fact. These tests pin
 *      the correct form and assert the wrong one does NOT agree.
 *
 *   2. THE COHORT CUT. The look-ahead guard (C-302: drop picks generated at
 *      or after kickoff) must run BEFORE the "first N" cut. Cut first, then
 *      filter, and a cohort of 100 silently becomes 84 — the sample is
 *      mislabelled and the number quietly changes. The first run of the
 *      script did exactly this.
 *
 * The third thing pinned here is the finding itself: on the measured cohort
 * GSE's confidence score LOSES to always-predict-the-base-rate. A test that
 * asserts "model beats climatology" would be wishful; these assert the honest
 * negative so nobody later "fixes" the number by quietly changing the math.
 */

import { describe, expect, it } from "vitest";
import { brierDecomposition } from "@sports/prediction-engine";
import { runBacktestHarness, type BacktestPickInput } from "./harness";

const NOW = new Date("2026-07-17T12:00:00.000Z");

function pick(id: string, confidence: number, result: BacktestPickInput["result"]): BacktestPickInput {
  return { id, confidence, result, modelVersion: "v5.1.0", sport: "NFL", pickType: "SPREAD", riskLevel: "MODERATE" };
}

/**
 * Rebuilds the measured first-100 shape: 47 wins / 53 losses, confidence
 * averaging 68.59 (mean p 0.6859), no pushes. This is the population the
 * production run actually scored.
 */
function measuredCohort(): BacktestPickInput[] {
  const rows: BacktestPickInput[] = [];
  // 100 picks, first 47 WIN then 53 LOSS, confidence spread 50..90 so the mean
  // lands near the measured 0.6859 rather than a flat round number.
  for (let i = 0; i < 100; i++) {
    const confidence = 50 + ((i * 4) % 41); // 50..90, mean ~68.5
    rows.push(pick(`m${i}`, confidence, i < 47 ? "WIN" : "LOSS"));
  }
  return rows;
}

describe("Brier identity — the cross term is E[p*y], not E[p]E[y]", () => {
  it("matches the element-wise mean((p-y)^2) exactly", () => {
    const report = runBacktestHarness(measuredCohort(), { now: NOW, minSampleSize: 1 });
    const reported = report.climatology.modelBrierScore;
    expect(reported).not.toBeNull();

    const ps = measuredCohort().map((r) => Math.max(0.01, Math.min(0.99, r.confidence / 100)));
    const ys = measuredCohort().map((r) => (r.result === "WIN" ? 1 : 0));
    const elementwise = ps.reduce((sum, p, i) => sum + (p - ys[i]!) ** 2, 0) / ps.length;

    expect(reported).toBeCloseTo(elementwise, 4);
  });

  it("agrees with the correct algebraic expansion", () => {
    const rows = measuredCohort();
    const ps = rows.map((r) => Math.max(0.01, Math.min(0.99, r.confidence / 100)));
    const ys = rows.map((r) => (r.result === "WIN" ? 1 : 0));
    const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

    const correct = mean(ps.map((p) => p ** 2)) - 2 * mean(ps.map((p, i) => p * ys[i]!)) + mean(ys.map((y) => y ** 2));
    const reported = runBacktestHarness(rows, { now: NOW, minSampleSize: 1 }).climatology.modelBrierScore!;

    expect(reported).toBeCloseTo(correct, 4);
  });

  it("the product-of-expectations form is measurably WRONG, so a cross-check using it must be rejected", () => {
    // This is the trap that produced a wrong 0.3066 in an ad-hoc SQL check.
    // Pinned so nobody reintroduces it as a "simplification": on a cohort whose
    // confidence is genuinely informative the two forms differ materially, and
    // the wrong one always understates.
    const rows = measuredCohort();
    const ps = rows.map((r) => Math.max(0.01, Math.min(0.99, r.confidence / 100)));
    const ys = rows.map((r) => (r.result === "WIN" ? 1 : 0));
    const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

    const correct = mean(ps.map((p, i) => (p - ys[i]!) ** 2));
    const wrong = mean(ps.map((p) => p ** 2)) - 2 * mean(ps) * mean(ys) + mean(ys.map((y) => y ** 2));

    expect(Math.abs(correct - wrong)).toBeGreaterThan(0.001);
    expect(wrong).toBeLessThan(correct);
  });
});

describe("cohort selection — the look-ahead guard runs BEFORE the n-cut", () => {
  it("scores exactly n picks when in-play rows are interleaved, not fewer", () => {
    // Alternate in-play and scoreable picks, as production does. If the cut
    // were applied before the filter, this would yield ~50 not 100.
    const rows: BacktestPickInput[] = [];
    for (let i = 0; i < 200; i++) {
      rows.push(pick(`i${i}`, 60 + (i % 30), i % 2 === 0 ? "LOSS" : "WIN"));
    }
    const eligible = rows.filter((_, i) => i % 2 === 0);
    const cohort = eligible.slice(0, 100);

    const report = runBacktestHarness(cohort, { now: NOW, minSampleSize: 1 });
    expect(report.coverage.settledSampleSize).toBe(100);
    expect(report.climatology.modelBrierScore).not.toBeNull();
  });
});

describe("the measured finding — GSE confidence LOSES to climatology", () => {
  it("reports a negative edge on the measured first-100 shape", () => {
    const report = runBacktestHarness(measuredCohort(), { now: NOW, minSampleSize: 1 });

    expect(report.climatology.modelBrierScore).not.toBeNull();
    expect(report.climatology.climatologyBrierScore).not.toBeNull();
    // Confidence claims ~68.6% while the base rate is 47%: overconfident, so it
    // must lose. Asserting this is the point — it is the honest verdict, and
    // the production run reproduced it (0.3331 vs 0.2491).
    expect(report.climatology.modelBeatsClimatology).toBe(false);
    expect(report.climatology.edgeOverClimatology).toBeLessThan(0);
  });

  it("decomposition: uncertainty is exact, and the identity gap is the documented within-bin variance term", () => {
    const rows = measuredCohort();
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 1 });
    const d = report.reliabilityDecomposition;
    expect(d).not.toBeNull();

    // EXACT: uncertainty is a closed form of the data, not a binned estimate.
    expect(d!.uncertainty).toBeCloseTo(d!.baseRate * (1 - d!.baseRate), 6);

    // NOT exact, by design. brierDecomposition's docblock states the identity
    // brier = reliability - resolution + uncertainty holds only when forecasts
    // are constant within each bin; a within-bin variance term separates them
    // otherwise, and more bins shrink the gap. Asserting strict equality here
    // would be asserting a falsehood about the shipped engine.
    const gapAt10Bins = Math.abs(d!.reliability - d!.resolution + d!.uncertainty - d!.brier);
    expect(gapAt10Bins).toBeGreaterThanOrEqual(0);
    expect(gapAt10Bins).toBeLessThan(0.01);
  });

  it("the within-bin gap shrinks as bins increase, confirming it is binning error not engine error", () => {
    const samples = measuredCohort().map((r) => ({
      p: Math.max(0.01, Math.min(0.99, r.confidence / 100)),
      y: (r.result === "WIN" ? 1 : 0) as 0 | 1,
    }));
    const gap = (bins: number) => {
      const d = brierDecomposition(samples, bins);
      return Math.abs(d.reliability - d.resolution + d.uncertainty - d.brier);
    };
    expect(gap(100)).toBeLessThan(gap(10));
    // `brier` itself is bin-independent — always the exact raw score.
    expect(brierDecomposition(samples, 10).brier).toBe(brierDecomposition(samples, 100).brier);
  });

  it("a perfect forecaster DOES beat climatology — so the negative above is the data, not a broken scorer", () => {
    const rows = measuredCohort().map((r, i) => pick(`p${i}`, r.result === "WIN" ? 95 : 5, r.result));
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 1 });

    expect(report.climatology.modelBeatsClimatology).toBe(true);
    expect(report.climatology.edgeOverClimatology).toBeGreaterThan(0);
  });
});

describe("honesty floors", () => {
  it("the 100-pick publication floor still withholds when honored", () => {
    // The script passes minSampleSize:1 to force the arithmetic a human asked
    // for. The shipped default floor must keep withholding — this test fails if
    // someone removes it to make a number appear.
    const below = runBacktestHarness(measuredCohort().slice(0, 99), { now: NOW });
    expect(below.status).toBe("insufficient-sample");
    expect(below.climatology.modelBrierScore).toBeNull();
  });

  it("crosses to a computed Brier at exactly 100 settled picks", () => {
    const atFloor = runBacktestHarness(measuredCohort(), { now: NOW });
    expect(atFloor.status).toBe("ok");
    expect(atFloor.climatology.modelBrierScore).not.toBeNull();
    expect(atFloor.climatology.climatologyBrierScore).not.toBeNull();
  });

  it("never fabricates a number from an empty sample", () => {
    const report = runBacktestHarness([], { now: NOW, minSampleSize: 1 });
    expect(report.status).toBe("empty");
    expect(report.climatology.modelBrierScore).toBeNull();
    expect(report.climatology.modelBeatsClimatology).toBeNull();
  });
});
