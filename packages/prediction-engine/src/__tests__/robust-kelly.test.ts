import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROBUST_ALPHA,
  betaCdf,
  betaConfidenceSet,
  betaPdf,
  betaQuantile,
  fullKellyFraction,
  robustKellyFraction,
  sweepEffectiveSampleSize,
} from "../robust-kelly.js";

/**
 * Independent reference: P(Bin(n, p) >= k), computed by direct summation with no beta
 * machinery. The identity I_x(k, n - k + 1) = P(Bin(n, x) >= k) then pins betaCdf to
 * something derived from first principles rather than from itself.
 */
function binomialTailAtLeast(n: number, k: number, p: number): number {
  let total = 0;
  for (let i = k; i <= n; i++) {
    let logChoose = 0;
    for (let j = 0; j < i; j++) logChoose += Math.log(n - j) - Math.log(j + 1);
    total += Math.exp(logChoose + i * Math.log(p) + (n - i) * Math.log(1 - p));
  }
  return total;
}

describe("betaCdf (regularised incomplete beta)", () => {
  it("is the identity for the uniform Beta(1, 1)", () => {
    for (const x of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999]) {
      expect(betaCdf(x, 1, 1)).toBeCloseTo(x, 12);
    }
  });

  it("matches the closed-form Beta(2, 2) CDF 3x^2 - 2x^3", () => {
    for (const x of [0.05, 0.2, 0.5, 0.8, 0.95]) {
      expect(betaCdf(x, 2, 2)).toBeCloseTo(3 * x * x - 2 * x * x * x, 12);
    }
  });

  it("matches the closed forms for Beta(1, b) and Beta(a, 1)", () => {
    for (const x of [0.1, 0.4, 0.77]) {
      expect(betaCdf(x, 1, 5)).toBeCloseTo(1 - (1 - x) ** 5, 12);
      expect(betaCdf(x, 5, 1)).toBeCloseTo(x ** 5, 12);
    }
  });

  it("matches the arcsine (Jeffreys) Beta(0.5, 0.5) CDF", () => {
    for (const x of [0.02, 0.3, 0.5, 0.87]) {
      expect(betaCdf(x, 0.5, 0.5)).toBeCloseTo((2 / Math.PI) * Math.asin(Math.sqrt(x)), 10);
    }
  });

  it("satisfies the binomial-tail identity against a directly summed reference", () => {
    // I_x(k, n - k + 1) = P(Bin(n, x) >= k)
    for (const [n, k, x] of [
      [10, 3, 0.2],
      [10, 7, 0.5],
      [25, 13, 0.45],
      [40, 4, 0.09],
    ] as const) {
      expect(betaCdf(x, k, n - k + 1)).toBeCloseTo(binomialTailAtLeast(n, k, x), 10);
    }
  });

  it("pins the endpoints and rejects invalid shape parameters", () => {
    expect(betaCdf(0, 2, 3)).toBe(0);
    expect(betaCdf(1, 2, 3)).toBe(1);
    expect(betaCdf(-0.5, 2, 3)).toBe(0);
    expect(betaCdf(1.5, 2, 3)).toBe(1);
    expect(Number.isNaN(betaCdf(0.5, 0, 3))).toBe(true);
    expect(Number.isNaN(betaCdf(0.5, 2, -1))).toBe(true);
    expect(Number.isNaN(betaCdf(Number.NaN, 2, 3))).toBe(true);
  });

  it("is monotonically increasing in x", () => {
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const value = betaCdf(i / 100, 3.5, 7.25);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("betaPdf", () => {
  it("is flat at 1 for the uniform Beta(1, 1) and zero outside the support", () => {
    expect(betaPdf(0.25, 1, 1)).toBeCloseTo(1, 12);
    expect(betaPdf(0.75, 1, 1)).toBeCloseTo(1, 12);
    expect(betaPdf(0, 1, 1)).toBe(0);
    expect(betaPdf(1, 1, 1)).toBe(0);
  });

  it("matches the closed-form Beta(2, 3) density 12x(1-x)^2", () => {
    for (const x of [0.1, 0.35, 0.6, 0.9]) {
      expect(betaPdf(x, 2, 3)).toBeCloseTo(12 * x * (1 - x) ** 2, 10);
    }
  });

  it("stays finite and accurate at large pseudo-counts (log-space evaluation)", () => {
    const density = betaPdf(0.6, 601, 401);
    expect(Number.isFinite(density)).toBe(true);
    expect(density).toBeGreaterThan(0);
    // Sanity: the density must integrate to ~1 over the support.
    let integral = 0;
    const steps = 20000;
    for (let i = 0; i < steps; i++) {
      integral += betaPdf((i + 0.5) / steps, 601, 401) / steps;
    }
    expect(integral).toBeCloseTo(1, 6);
  });
});

describe("betaQuantile (inverse regularised incomplete beta)", () => {
  it("is the identity for the uniform Beta(1, 1)", () => {
    for (const q of [1e-6, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999999]) {
      expect(betaQuantile(q, 1, 1)).toBeCloseTo(q, 12);
    }
  });

  it("puts the median of any symmetric Beta(a, a) at exactly 0.5", () => {
    for (const a of [0.25, 0.5, 1, 2, 5, 50, 500]) {
      expect(betaQuantile(0.5, a, a)).toBeCloseTo(0.5, 12);
    }
  });

  it("matches closed forms for Beta(1, b), Beta(a, 1) and the arcsine Beta(0.5, 0.5)", () => {
    for (const q of [0.01, 0.1, 0.5, 0.9, 0.99]) {
      expect(betaQuantile(q, 1, 7)).toBeCloseTo(1 - (1 - q) ** (1 / 7), 12);
      expect(betaQuantile(q, 7, 1)).toBeCloseTo(q ** (1 / 7), 12);
      expect(betaQuantile(q, 0.5, 0.5)).toBeCloseTo(Math.sin((q * Math.PI) / 2) ** 2, 10);
    }
  });

  it("reproduces published Beta quantiles to ~1e-4 and better", () => {
    // Clopper-Pearson exact 95% interval for 3 successes in 10 trials: (0.0667, 0.6525).
    expect(betaQuantile(0.025, 3, 8)).toBeCloseTo(0.0667395111, 8);
    expect(betaQuantile(0.975, 4, 7)).toBeCloseTo(0.6524528501, 8);
    // Beta(2, 3) median and Beta(5, 2) 90th percentile.
    expect(betaQuantile(0.5, 2, 3)).toBeCloseTo(0.3857275681, 8);
    expect(betaQuantile(0.9, 5, 2)).toBeCloseTo(0.9074047411, 8);
  });

  it("round-trips through the CDF across a wide grid of shapes", () => {
    for (const [a, b] of [
      [0.5, 0.5],
      [1, 1],
      [2, 8],
      [8, 2],
      [13.7, 4.2],
      [301, 201],
      [1001, 3],
    ] as const) {
      for (const q of [1e-5, 0.01, 0.1, 0.5, 0.9, 0.99, 1 - 1e-5]) {
        const x = betaQuantile(q, a, b);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
        expect(betaCdf(x, a, b)).toBeCloseTo(q, 10);
      }
    }
  });

  it("obeys the reflection symmetry Q(q; a, b) = 1 - Q(1 - q; b, a)", () => {
    for (const q of [0.05, 0.2, 0.5, 0.8]) {
      expect(betaQuantile(q, 3, 11)).toBeCloseTo(1 - betaQuantile(1 - q, 11, 3), 10);
    }
  });

  it("pins the endpoints and rejects invalid shape parameters", () => {
    expect(betaQuantile(0, 2, 3)).toBe(0);
    expect(betaQuantile(-1, 2, 3)).toBe(0);
    expect(betaQuantile(1, 2, 3)).toBe(1);
    expect(betaQuantile(2, 2, 3)).toBe(1);
    expect(Number.isNaN(betaQuantile(0.5, 0, 3))).toBe(true);
    expect(Number.isNaN(betaQuantile(0.5, 3, Number.NaN))).toBe(true);
    expect(Number.isNaN(betaQuantile(Number.NaN, 3, 3))).toBe(true);
  });

  it("is monotonically increasing in q", () => {
    let previous = -1;
    for (let i = 1; i < 100; i++) {
      const x = betaQuantile(i / 100, 4, 9);
      expect(x).toBeGreaterThan(previous);
      previous = x;
    }
  });
});

describe("betaConfidenceSet", () => {
  it("uses the spec's pseudo-counts a = p*n + 1, b = (1-p)*n + 1", () => {
    const set = betaConfidenceSet({ probability: 0.6, effectiveSampleSize: 50 });
    expect(set.a).toBeCloseTo(31, 12);
    expect(set.b).toBeCloseTo(21, 12);
    expect(set.mean).toBeCloseTo(31 / 52, 12);
    expect(set.alpha).toBe(DEFAULT_ROBUST_ALPHA);
  });

  it("collapses to the uniform prior at zero effective sample size", () => {
    const set = betaConfidenceSet({ probability: 0.6, effectiveSampleSize: 0, alpha: 0.1 });
    expect(set.a).toBe(1);
    expect(set.b).toBe(1);
    expect(set.lower).toBeCloseTo(0.1, 10);
    expect(set.upper).toBeCloseTo(0.9, 10);
    expect(set.width).toBeCloseTo(0.8, 10);
  });

  it("narrows monotonically as the effective sample size grows", () => {
    let previousWidth = Number.POSITIVE_INFINITY;
    for (const n of [1, 5, 25, 100, 500, 5000]) {
      const set = betaConfidenceSet({ probability: 0.55, effectiveSampleSize: n });
      expect(set.width).toBeLessThan(previousWidth);
      expect(set.lower).toBeLessThan(set.upper);
      previousWidth = set.width;
    }
    expect(
      betaConfidenceSet({ probability: 0.55, effectiveSampleSize: 1e7 }).width,
    ).toBeLessThan(1e-3);
  });

  it("clamps alpha into (0, 0.5] and clamps the probability into [0, 1]", () => {
    expect(betaConfidenceSet({ probability: 0.5, effectiveSampleSize: 10, alpha: 0.9 }).alpha).toBe(0.5);
    expect(betaConfidenceSet({ probability: 0.5, effectiveSampleSize: 10, alpha: -1 }).alpha).toBeGreaterThan(0);
    expect(betaConfidenceSet({ probability: 1.4, effectiveSampleSize: 10 }).probability).toBe(1);
    expect(betaConfidenceSet({ probability: -0.4, effectiveSampleSize: 10 }).probability).toBe(0);
    expect(betaConfidenceSet({ probability: Number.NaN, effectiveSampleSize: 10 }).probability).toBe(0);
    expect(
      betaConfidenceSet({ probability: 0.5, effectiveSampleSize: Number.NaN }).effectiveSampleSize,
    ).toBe(0);
  });
});

describe("robustKellyFraction", () => {
  it("never exceeds standard Kelly, over a wide sweep of p / odds / n / alpha", () => {
    for (const p of [0.05, 0.2, 0.35, 0.5, 0.55, 0.62, 0.8, 0.95, 0.999]) {
      for (const decimalOdds of [1.05, 1.5, 1.909, 2.0, 3.4, 11]) {
        for (const effectiveSampleSize of [0, 1, 7, 40, 250, 4000]) {
          for (const alpha of [0.01, 0.05, 0.1, 0.25, 0.5]) {
            const result = robustKellyFraction({
              probability: p,
              decimalOdds,
              effectiveSampleSize,
              alpha,
            });
            const standard = fullKellyFraction(p, decimalOdds);
            expect(result.centralKellyFraction).toBeCloseTo(standard, 12);
            expect(result.robustFraction).toBeLessThanOrEqual(result.centralKellyFraction + 1e-12);
            expect(result.robustFraction).toBeGreaterThanOrEqual(0);
            expect(result.worstCaseProbability).toBeLessThanOrEqual(result.probability + 1e-12);
            expect(result.uncertaintyHaircut).toBeGreaterThanOrEqual(0);
            expect(result.haircutRatio).toBeGreaterThanOrEqual(0);
            expect(result.haircutRatio).toBeLessThanOrEqual(1 + 1e-12);
          }
        }
      }
    }
  });

  it("converges up toward standard Kelly as the effective sample size grows", () => {
    const input = { probability: 0.6, decimalOdds: 2.0, effectiveSampleSize: 0 };
    const standard = fullKellyFraction(0.6, 2.0);
    expect(standard).toBeCloseTo(0.2, 12);

    const grid = [1, 10, 100, 1_000, 10_000, 1_000_000];
    const sweep = sweepEffectiveSampleSize(input, grid);
    expect(sweep).toHaveLength(grid.length);

    let previous = -1;
    for (const result of sweep) {
      expect(result.robustFraction).toBeGreaterThanOrEqual(previous);
      expect(result.robustFraction).toBeLessThanOrEqual(standard + 1e-12);
      previous = result.robustFraction;
    }

    const last = sweep[sweep.length - 1];
    if (last === undefined) throw new Error("sweep produced no rows");
    expect(last.robustFraction).toBeCloseTo(standard, 2);
    expect(last.worstCaseProbability).toBeCloseTo(0.6, 2);

    // The gap closes at the Beta's 1/sqrt(n) rate: 100x the evidence should shrink the
    // haircut by roughly 10x (z * sqrt(p(1-p)/n), doubled by b = 1 in the Kelly term).
    const thin = robustKellyFraction({ ...input, effectiveSampleSize: 10_000 });
    const thick = robustKellyFraction({ ...input, effectiveSampleSize: 1_000_000 });
    const ratio = thin.uncertaintyHaircut / thick.uncertaintyHaircut;
    expect(ratio).toBeGreaterThan(5);
    expect(ratio).toBeLessThan(20);
  });

  it("sizes a tiny effective sample size down to (near) nothing", () => {
    const thin = robustKellyFraction({
      probability: 0.62,
      decimalOdds: 2.0,
      effectiveSampleSize: 1,
    });
    const thick = robustKellyFraction({
      probability: 0.62,
      decimalOdds: 2.0,
      effectiveSampleSize: 2000,
    });
    expect(thin.robustFraction).toBeLessThan(0.005);
    expect(thin.hasRobustEdge).toBe(false);
    expect(thin.haircutRatio).toBeLessThan(0.05);
    expect(thick.robustFraction).toBeGreaterThan(thin.robustFraction);
    expect(thick.hasRobustEdge).toBe(true);
  });

  it("returns exactly 0 on a negative-EV bet and never goes negative", () => {
    for (const effectiveSampleSize of [0, 1, 10, 1_000, 1e9]) {
      const result = robustKellyFraction({
        probability: 0.45,
        decimalOdds: 2.0,
        effectiveSampleSize,
      });
      expect(result.centralKellyFraction).toBe(0);
      expect(result.robustFraction).toBe(0);
      expect(result.robustFractionBeforeCap).toBe(0);
      expect(result.uncertaintyHaircut).toBe(0);
      expect(result.hasRobustEdge).toBe(false);
      expect(result.centralEdge).toBeLessThan(0);
      expect(result.rationale).toContain("negative-EV");
    }
  });

  it("handles p = 0, p = 1 and decimalOdds = 1", () => {
    const zero = robustKellyFraction({
      probability: 0,
      decimalOdds: 3.0,
      effectiveSampleSize: 100,
    });
    expect(zero.probability).toBe(0);
    expect(zero.worstCaseProbability).toBe(0);
    expect(zero.centralKellyFraction).toBe(0);
    expect(zero.robustFraction).toBe(0);

    const one = robustKellyFraction({
      probability: 1,
      decimalOdds: 3.0,
      effectiveSampleSize: 100,
    });
    // Beta(101, 1) has the closed-form quantile alpha^(1/101).
    expect(one.centralKellyFraction).toBeCloseTo(1, 12);
    expect(one.worstCaseProbability).toBeCloseTo(0.1 ** (1 / 101), 10);
    expect(one.worstCaseProbability).toBeLessThan(1);
    expect(one.robustFraction).toBeGreaterThan(0);
    expect(one.robustFraction).toBeLessThan(1);

    const noPayout = robustKellyFraction({
      probability: 0.9,
      decimalOdds: 1,
      effectiveSampleSize: 5000,
    });
    expect(noPayout.centralKellyFraction).toBe(0);
    expect(noPayout.robustFraction).toBe(0);
    expect(noPayout.breakEvenProbability).toBe(1);
    expect(noPayout.hasRobustEdge).toBe(false);
    expect(noPayout.rationale).toContain("No payout");
  });

  it("fails closed on non-finite / nonsensical input rather than throwing", () => {
    for (const decimalOdds of [Number.NaN, Number.POSITIVE_INFINITY, 0, -2, 0.5]) {
      const result = robustKellyFraction({
        probability: 0.7,
        decimalOdds,
        effectiveSampleSize: 500,
      });
      expect(Number.isFinite(result.robustFraction)).toBe(true);
      expect(result.robustFraction).toBe(0);
    }
    const nanProbability = robustKellyFraction({
      probability: Number.NaN,
      decimalOdds: 2,
      effectiveSampleSize: 500,
    });
    expect(nanProbability.probability).toBe(0);
    expect(nanProbability.robustFraction).toBe(0);

    const negativeSampleSize = robustKellyFraction({
      probability: 0.7,
      decimalOdds: 2,
      effectiveSampleSize: -50,
    });
    expect(negativeSampleSize.effectiveSampleSize).toBe(0);
    expect(negativeSampleSize.robustFraction).toBe(0);
  });

  it("applies the optional ceiling and reports whether it bound", () => {
    const uncapped = robustKellyFraction({
      probability: 0.75,
      decimalOdds: 2.0,
      effectiveSampleSize: 5000,
    });
    expect(uncapped.cap).toBeNull();
    expect(uncapped.capBinding).toBe(false);
    expect(uncapped.robustFraction).toBeGreaterThan(0.02);

    const capped = robustKellyFraction({
      probability: 0.75,
      decimalOdds: 2.0,
      effectiveSampleSize: 5000,
      cap: 0.02,
    });
    expect(capped.cap).toBe(0.02);
    expect(capped.capBinding).toBe(true);
    expect(capped.robustFraction).toBeCloseTo(0.02, 12);
    expect(capped.robustFractionBeforeCap).toBe(uncapped.robustFractionBeforeCap);
    expect(capped.rationale).toContain("ceiling");

    const slackCap = robustKellyFraction({
      probability: 0.75,
      decimalOdds: 2.0,
      effectiveSampleSize: 5000,
      cap: 0.95,
    });
    expect(slackCap.capBinding).toBe(false);
    expect(slackCap.robustFraction).toBe(uncapped.robustFraction);

    const zeroCap = robustKellyFraction({
      probability: 0.75,
      decimalOdds: 2.0,
      effectiveSampleSize: 5000,
      cap: -1,
    });
    expect(zeroCap.cap).toBe(0);
    expect(zeroCap.robustFraction).toBe(0);
  });

  it("is more conservative at a smaller alpha (a wider confidence set)", () => {
    const base = {
      probability: 0.62,
      decimalOdds: 2.0,
      effectiveSampleSize: 400,
    };
    let previous = Number.POSITIVE_INFINITY;
    for (const alpha of [0.5, 0.25, 0.1, 0.05, 0.01, 0.001]) {
      const result = robustKellyFraction({ ...base, alpha });
      expect(result.robustFraction).toBeLessThanOrEqual(previous + 1e-12);
      previous = result.robustFraction;
    }
    expect(previous).toBeLessThan(
      robustKellyFraction({ ...base, alpha: 0.5 }).robustFraction,
    );
  });

  it("never sizes above standard Kelly even where the +1 pseudo-counts inflate p", () => {
    // Low p, tiny n, alpha at its permissive extreme: the raw Beta quantile sits ABOVE
    // the central estimate here, so the honesty clamp is what keeps the invariant.
    const set = betaConfidenceSet({ probability: 0.02, effectiveSampleSize: 1, alpha: 0.5 });
    expect(set.lower).toBeGreaterThan(0.02); // raw quantile really is more optimistic
    const result = robustKellyFraction({
      probability: 0.02,
      decimalOdds: 60,
      effectiveSampleSize: 1,
      alpha: 0.5,
    });
    expect(result.worstCaseProbability).toBe(0.02);
    expect(result.robustFraction).toBeLessThanOrEqual(result.centralKellyFraction);
  });

  it("is marked shadow / unpriced and carries its confidence set", () => {
    const result = robustKellyFraction({
      probability: 0.58,
      decimalOdds: 2.1,
      effectiveSampleSize: 300,
    });
    expect(result.status).toBe("shadow");
    expect(result.priced).toBe(false);
    expect(result.confidenceSet.a).toBeCloseTo(0.58 * 300 + 1, 12);
    expect(result.confidenceSet.b).toBeCloseTo(0.42 * 300 + 1, 12);
    expect(result.breakEvenProbability).toBeCloseTo(1 / 2.1, 12);
    expect(result.centralEdge).toBeCloseTo(0.58 - 1 / 2.1, 12);
    expect(result.worstCaseEdge).toBeCloseTo(result.worstCaseProbability - 1 / 2.1, 12);
    expect(result.rationale).toContain("Shadow only");
  });

  it("is deterministic: repeated calls are bit-identical and match a golden vector", () => {
    const input = {
      probability: 0.6,
      decimalOdds: 2.0,
      effectiveSampleSize: 100,
      alpha: 0.1,
    };
    const first = robustKellyFraction(input);
    const second = robustKellyFraction(input);
    expect(second).toStrictEqual(first);
    expect(second.robustFraction).toBe(first.robustFraction);

    // Beta(0.6*100 + 1, 0.4*100 + 1) = Beta(61, 41); its 10th percentile is
    // 0.5355206508, independently confirmed via P(Bin(101, x) >= 61) = 0.1.
    const goldenWorstCase = 0.5355206508;
    expect(first.confidenceSet.a).toBeCloseTo(61, 12);
    expect(first.confidenceSet.b).toBeCloseTo(41, 12);
    expect(first.worstCaseProbability).toBeCloseTo(goldenWorstCase, 9);
    expect(betaCdf(first.worstCaseProbability, 61, 41)).toBeCloseTo(0.1, 10);
    // f = (p_worst * (b + 1) - 1) / b with b = decimalOdds - 1 = 1.
    expect(first.robustFraction).toBeCloseTo(2 * goldenWorstCase - 1, 9);
    expect(first.centralKellyFraction).toBeCloseTo(0.2, 12);
    expect(first.uncertaintyHaircut).toBeCloseTo(0.2 - (2 * goldenWorstCase - 1), 9);
  });
});

describe("sweepEffectiveSampleSize", () => {
  it("returns an index-aligned row per grid entry, including degenerate ones", () => {
    const rows = sweepEffectiveSampleSize(
      { probability: 0.6, decimalOdds: 2, effectiveSampleSize: 10 },
      [0, -5, Number.NaN, 100],
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(Number.isFinite(row.robustFraction)).toBe(true);
      expect(row.robustFraction).toBeGreaterThanOrEqual(0);
    }
    const zeroEvidence = rows[0];
    const noEvidenceNegative = rows[1];
    const noEvidenceNaN = rows[2];
    const real = rows[3];
    if (
      zeroEvidence === undefined ||
      noEvidenceNegative === undefined ||
      noEvidenceNaN === undefined ||
      real === undefined
    ) {
      throw new Error("sweep row missing");
    }
    expect(zeroEvidence.effectiveSampleSize).toBe(0);
    expect(noEvidenceNegative.effectiveSampleSize).toBe(0);
    expect(noEvidenceNaN.effectiveSampleSize).toBe(0);
    expect(real.effectiveSampleSize).toBe(100);
    expect(real.robustFraction).toBeGreaterThan(zeroEvidence.robustFraction);
  });

  it("returns nothing for an empty grid", () => {
    expect(
      sweepEffectiveSampleSize(
        { probability: 0.6, decimalOdds: 2, effectiveSampleSize: 10 },
        [],
      ),
    ).toHaveLength(0);
  });
});
