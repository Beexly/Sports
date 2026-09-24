/**
 * Vitest suite for arXiv:physics/0606016v1 (Football Fever: Goal Distributions and Non-Gaussian Statistics).
 * Gate: ADOPT the shootout winner as GSE's score-distribution family if it beats both Poisson and Gaussian baselines by >=0.01 nats/game out-of-sample on 2025 (paired p<0.05) AND improves extreme-line calibration (ECE in the tail decile cut by >=20%); REJECT (stay with current distributional assumption) otherwise; no GSE content may cite this paper as evidence of in-game momentum.
 */
import { describe, it, expect } from "vitest";
import { poisLogPmf, nbLogPmf, feedbackLogPmf, oosLogLik, tailDecileEce, shootoutWinner } from "./physics-0606016v1-football-fever-goal-distributions-and";

describe("physics-0606016v1 distribution shootout", () => {
  it("NB nests Poisson-like behavior and feedback mixes", () => {
    expect(Number.isFinite(nbLogPmf(3, 3, 10))).toBe(true);
    const mix = Math.exp(feedbackLogPmf(2, 3, 3, 5, 0.5));
    expect(mix).toBeGreaterThan(0);
    expect(() => feedbackLogPmf(2, 3, 3, 5, 2)).toThrow();
  });
  it("OOS log-likelihood prefers the true family", () => {
    // Overdispersed counts: NB should beat Poisson
    const counts = [0, 1, 5, 2, 8, 1, 0, 6, 3, 2, 9, 1, 4, 0, 7, 2];
    const pois = oosLogLik(counts, (k) => poisLogPmf(k, 3.3));
    const nb = oosLogLik(counts, (k) => nbLogPmf(k, 3.3, 1.5));
    expect(nb).toBeGreaterThan(pois);
    expect(shootoutWinner({ poisson: pois, nb })).toBe("nb");
    expect(() => oosLogLik([], (k) => poisLogPmf(k, 1))).toThrow();
  });
  it("tail ECE is small for calibrated tails", () => {
    const pred = Array.from({ length: 100 }, (_, i) => 0.05 + 0.9 * (i / 100));
    const actual = pred.map((p) => (p > 0.5 ? 1 : 0) as 0 | 1);
    expect(tailDecileEce(pred, actual)).toBeLessThan(0.15);
    expect(() => tailDecileEce([0.5], [1])).toThrow();
  });
});
