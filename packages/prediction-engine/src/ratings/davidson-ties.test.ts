import { describe, expect, it } from "vitest";
import { davidsonLogLoss, davidsonProbs, davidsonProbsStrengthDep, tieNu } from "./davidson-ties";

describe("davidson-ties", () => {
  it("probabilities sum to 1 and reduce to BT when nu = 0", () => {
    const p = davidsonProbs(2, 1, 0.5);
    expect(p.homeWin + p.tie + p.awayWin).toBeCloseTo(1, 12);
    const bt = davidsonProbs(2, 1, 0);
    expect(bt.tie).toBe(0);
    expect(bt.homeWin).toBeCloseTo(2 / 3, 12);
  });
  it("stronger team wins more; home edge helps the home team", () => {
    const p = davidsonProbs(3, 1, 0.3);
    expect(p.homeWin).toBeGreaterThan(p.awayWin);
    const h = davidsonProbs(1, 1, 0.3, 1.5);
    expect(h.homeWin).toBeGreaterThan(h.awayWin);
  });
  it("tieNu rises with pair strength when beta1 > 0", () => {
    expect(tieNu(1, 0, 0.5)).toBeGreaterThan(tieNu(0, 0, 0.5));
    expect(tieNu(1, 0, -0.5)).toBeLessThan(tieNu(0, 0, -0.5));
  });
  it("strength-dependent wrapper matches the manual path", () => {
    const a = davidsonProbsStrengthDep(1, 0, -1, 0.5, 1.2);
    const b = davidsonProbs(Math.exp(1), 1, Math.exp(-1 + 0.5 * 0.5), 1.2);
    expect(a.homeWin).toBeCloseTo(b.homeWin, 12);
    expect(a.tie).toBeCloseTo(b.tie, 12);
    expect(davidsonLogLoss(a, "H")).toBeGreaterThanOrEqual(0);
  });
  it("throws on degenerate inputs", () => {
    expect(() => davidsonProbs(0, 1, 0.5)).toThrow();
    expect(() => davidsonProbs(1, 1, -1)).toThrow();
    expect(() => davidsonProbs(1, 1, 0.5, 0)).toThrow();
  });
});
