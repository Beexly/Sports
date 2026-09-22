import { describe, expect, it } from "vitest";
import {
  fitTieredBT,
  marginAblation,
  tieredLogLoss,
  tierMarginsFromParams,
  type TieredGame,
} from "./tiered-margin-bt-2606.js";

function season(tiers: Array<"early" | "late" | "playoff">): TieredGame[] {
  const teams = ["A", "B", "C", "D"];
  const games: TieredGame[] = [];
  let i = 0;
  for (const tier of tiers) {
    for (const h of teams)
      for (const a of teams) {
        if (h === a) continue;
        const homeStronger = h < a;
        games.push({ home: h, away: a, homeWon: i++ % 9 === 0 ? !homeStronger : homeStronger, tier });
      }
  }
  return games;
}

describe("tiered margin bt", () => {
  const teams = ["A", "B", "C", "D"];
  const train = season(["early", "early", "late", "late", "playoff"]);

  it("recovers team ordering with default margins", () => {
    const fit = fitTieredBT(train, teams);
    expect(fit.theta.get("A")).toBeGreaterThan(fit.theta.get("D") ?? 0);
    expect(fit.margins).toEqual({ playoff: 1.0, late: 0.5, early: 0.1 });
  });

  it("learns non-increasing margins end-to-end", () => {
    const fit = fitTieredBT(train, teams, { learnMargins: true });
    expect(fit.margins.playoff).toBeGreaterThanOrEqual(fit.margins.late);
    expect(fit.margins.late).toBeGreaterThanOrEqual(fit.margins.early);
    expect(fit.margins.early).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(fit.logLikelihood)).toBe(true);
  });

  it("tierMarginsFromParams is non-increasing by construction", () => {
    const m = tierMarginsFromParams([5, -5, 5]);
    expect(m.playoff).toBeGreaterThanOrEqual(m.late);
    expect(m.late).toBeGreaterThanOrEqual(m.early);
    expect(m.early).toBeGreaterThanOrEqual(0);
  });

  it("ablation returns all three conditions", () => {
    const test = season(["playoff"]);
    const ab = marginAblation(train, test, teams);
    expect(Number.isFinite(ab.tiered)).toBe(true);
    expect(Number.isFinite(ab.uniform)).toBe(true);
    expect(Number.isFinite(ab.none)).toBe(true);
    expect(typeof ab.orderingHolds).toBe("boolean");
  });

  it("handles empty input", () => {
    const fit = fitTieredBT([], teams);
    expect(fit.theta.get("A")).toBe(0);
    expect(Number.isNaN(tieredLogLoss(fit, []))).toBe(true);
  });
});
