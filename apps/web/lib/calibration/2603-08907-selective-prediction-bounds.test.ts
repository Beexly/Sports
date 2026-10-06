import { describe, expect, it } from "vitest";

import {
  ENABLED,
  boundForRecipe,
  certifyPicks,
  empiricalBernsteinBound,
  hoeffdingBound,
  pickBoundRecipe,
  transferInformedBound,
  wsrBound,
} from "@/lib/calibration/2603-08907-selective-prediction-bounds";

describe("selective prediction bounds", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("picks the bound recipe by sample size", () => {
    expect(pickBoundRecipe(50)).toBe("transfer-informed");
    expect(pickBoundRecipe(119)).toBe("transfer-informed");
    expect(pickBoundRecipe(120)).toBe("empirical-bernstein");
    expect(pickBoundRecipe(499)).toBe("empirical-bernstein");
    expect(pickBoundRecipe(500)).toBe("wsr-ltt");
  });

  it("Hoeffding bound is valid (covers the true mean) on Bernoulli data", () => {
    let s = 31;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const risks = Array.from({ length: 2000 }, () => (rnd() < 0.08 ? 1 : 0));
    const bound = hoeffdingBound(risks, 0.05);
    expect(bound).toBeGreaterThan(0.08); // covers the true 0.08 risk
    expect(bound).toBeLessThan(0.2);
  });

  it("empirical Bernstein is tighter than Hoeffding on low-variance risks", () => {
    const risks = Array.from({ length: 300 }, (_, i) => (i % 20 === 0 ? 1 : 0));
    expect(empiricalBernsteinBound(risks, 0.05)).toBeLessThanOrEqual(
      hoeffdingBound(risks, 0.05) + 1e-9,
    );
  });

  it("WSR bound is finite and transfer warm-start shrinks toward the source", () => {
    const risks = [0, 0, 0, 0, 1];
    expect(Number.isFinite(wsrBound(risks, 0.05))).toBe(true);
    const t = transferInformedBound(risks, 0.08, 50, 0.05);
    const plain = hoeffdingBound(risks, 0.05);
    expect(t).toBeLessThan(plain); // shrinkage toward the good source mean
  });

  it("certifyPicks graduates markets with n", () => {
    const good = Array.from({ length: 600 }, (_, i) => (i % 25 === 0 ? 1 : 0)); // 4% risk
    const cert = certifyPicks(good, 0.1);
    expect(cert.recipe).toBe("wsr-ltt");
    expect(cert.certified).toBe(true);
    const thin = Array.from({ length: 30 }, () => 0);
    const thinCert = certifyPicks(thin, 0.1);
    expect(thinCert.recipe).toBe("transfer-informed");
  });

  it("boundForRecipe dispatches all four recipes", () => {
    const risks = [0, 1, 0, 1, 0];
    for (const r of ["hoeffding-union", "empirical-bernstein", "wsr-ltt", "transfer-informed"] as const) {
      expect(Number.isFinite(boundForRecipe(risks, r, 0.05))).toBe(true);
    }
  });
});
