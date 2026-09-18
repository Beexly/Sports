import { describe, expect, it } from "vitest";
import {
  compareNflKeyNumberVsGaussian,
  distFromPmf,
  pairedDiscreteVsGaussianSyntheticNfl,
  pairedDiscreteVsWidenedGaussian,
  DISCRETE_VS_GAUSSIAN_ESTIMAND,
  DISCRETE_VS_GAUSSIAN_KILL_DELTA,
  DISCRETE_VS_GAUSSIAN_KILL_N,
  DISCRETE_VS_GAUSSIAN_MISSING_INPUT,
} from "../crps-compare.js";
import { crpsDiscrete, crpsGaussian, CRPS_KILL_MIN_IMPROVEMENT, CRPS_KILL_MIN_N } from "../slots/crps.js";

describe("distFromPmf", () => {
  it("point mass CRPS is 0 at the atom", () => {
    const d = distFromPmf(new Map([[4, 1]]));
    expect(crpsDiscrete(d, 4)).toBeCloseTo(0, 12);
  });
});

describe("compareNflKeyNumberVsGaussian", () => {
  it("Gaussian closed form is blind to the key-number bump; discrete is not", () => {
    const report = compareNflKeyNumberVsGaussian({ n: 400, sd: 14, seed: 17 });
    expect(report.n).toBe(400);
    expect(report.meanDiscreteA).toBeLessThan(report.meanDiscreteB);
    expect(report.discreteRanking).toBe("A");
    expect(report.gaussianRanking).toBe("tie");
    expect(report.rankingsAgree).toBe(false);
    expect(report.gaussianLicensedAsKill).toBe(false);
    expect(report.gaussianGate.verdict).toBe("kill");
    expect(report.gaussianGate.improvement).toBeCloseTo(0, 12);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
  });

  it("does not treat a Gaussian ranking as a licensed kill even if n is large", () => {
    const report = compareNflKeyNumberVsGaussian({ n: 400, seed: 3 });
    expect(report.n).toBeGreaterThanOrEqual(272);
    expect(report.gaussianLicensedAsKill).toBe(false);
  });
});

describe("pairedDiscreteVsWidenedGaussian", () => {
  it("pre-registers the kill on the same line as the estimand, before looking", () => {
    expect(DISCRETE_VS_GAUSSIAN_KILL_DELTA).toBe(CRPS_KILL_MIN_IMPROVEMENT);
    expect(DISCRETE_VS_GAUSSIAN_KILL_N).toBe(CRPS_KILL_MIN_N);
    expect(DISCRETE_VS_GAUSSIAN_KILL_DELTA).toBe(0.5);
    expect(DISCRETE_VS_GAUSSIAN_KILL_N).toBe(272);
    expect(DISCRETE_VS_GAUSSIAN_ESTIMAND).toMatch(/mean\(d\)≥0\.5/);
    expect(DISCRETE_VS_GAUSSIAN_ESTIMAND).toMatch(/nLicensed≥272/);
    expect(DISCRETE_VS_GAUSSIAN_MISSING_INPUT).toMatch(/TeamGameLog/);
  });

  it("n=50 is underpowered — that is the finding, not a pass", () => {
    const report = pairedDiscreteVsGaussianSyntheticNfl({ n: 50, seed: 17 });
    expect(report.n).toBe(50);
    expect(report.nLicensed).toBeLessThan(272);
    expect(report.killFired).toBe(false);
    expect(report.verdict).toBe("underpowered");
    expect(report.sampleKind).toBe("synthetic-nfl-shaped");
    expect(report.gaussianLicensedAsKill).toBe(false);
    expect(report.dbQueried).toBe(false);
    expect(Number.isFinite(report.seD)).toBe(true);
  });

  it("reports the paired mean and its SE, not two unpaired means, and killFired matches the pre-registered rule", () => {
    const report = pairedDiscreteVsGaussianSyntheticNfl({ n: 400, sd: 14, seed: 17 });
    expect(report.n).toBe(400);
    expect(report.nLicensed).toBe(400);
    expect(Number.isFinite(report.meanD)).toBe(true);
    expect(Number.isFinite(report.seD)).toBe(true);
    expect(report.seD).toBeCloseTo(report.sdD / Math.sqrt(report.nLicensed), 12);
    expect(report.killFired).toBe(
      report.nLicensed >= 272 && report.meanD >= 0.5,
    );
    expect(report.verdict).toBe("gaussian_not_killed");
    expect(report.meanD).toBeLessThan(0.1);
    expect(report.meanD).toBeGreaterThan(-0.1);
    expect(report.seD).toBeGreaterThan(0);
    expect(report.sampleKind).toBe("synthetic-nfl-shaped");
    expect(report.missingInput).toMatch(/does not hold those rows/);
  });

  it("hand-checks LOO pairing on three integer margins", () => {
    const y = [-7, 0, 7] as const;
    const report = pairedDiscreteVsWidenedGaussian({ y, sampleKind: "caller-supplied" });
    expect(report.n).toBe(3);
    expect(report.nLicensed).toBe(3);
    expect(report.verdict).toBe("underpowered");
    const mean = 0;
    const m2 = 98;
    const d: number[] = [];
    for (const yi of y) {
      const loo = y.filter((v) => v !== yi); // all unique, so this is the LOO
      const mu = (3 * mean - yi) / 2;
      const sampleVar = m2 / 2;
      const leftOutVar = (2 * sampleVar - (3 / 2) * (yi - mean) ** 2) / 1;
      const sd = Math.sqrt(leftOutVar);
      const counts = new Map<number, number>();
      for (const v of loo) counts.set(v, 1);
      const disc = crpsDiscrete(distFromPmf(counts), yi);
      const gauss = crpsGaussian(mu, sd, yi);
      d.push(gauss - disc);
    }
    const meanD = d.reduce((a, b) => a + b, 0) / 3;
    expect(report.meanD).toBeCloseTo(meanD, 10);
    expect(report.sampleKind).toBe("caller-supplied");
  });

  it("throws on empty rather than inventing a delta", () => {
    expect(() =>
      pairedDiscreteVsWidenedGaussian({ y: [], sampleKind: "caller-supplied" }),
    ).toThrow(/requires observations/);
  });
});
