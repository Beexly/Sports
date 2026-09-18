import { describe, expect, it } from "vitest";
import {
  compareNflKeyNumberVsGaussian,
  distFromPmf,
} from "../crps-compare.js";
import { crpsDiscrete } from "../slots/crps.js";

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
