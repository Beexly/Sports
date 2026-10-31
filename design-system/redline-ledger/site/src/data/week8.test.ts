import { describe, expect, it } from "vitest";
import {
  CFB_HOLD,
  LINEUP,
  PICKS,
  ROSTER_IDENTITIES,
  salaryTotal,
} from "./week8";

describe("source-locked Week 8 data", () => {
  it("preserves the three published moneyline proofs", () => {
    expect(PICKS.map((pick) => [pick.selection, pick.price, pick.modelProbability, pick.marketProbability, pick.edge])).toEqual([
      ["CHI ML", "+142", 63.56, 39.62, 23.94],
      ["KC ML", "-118", 73.82, 51.74, 22.08],
      ["NYJ ML", "-122", 72.28, 52.61, 19.67],
    ]);
  });

  it("keeps the flagship DFS roster salary-exact", () => {
    expect(LINEUP).toHaveLength(9);
    expect(salaryTotal(LINEUP)).toBe(50000);
    expect(LINEUP.map((row) => row.salary)).toEqual([6100, 7900, 4300, 9100, 7200, 4600, 4700, 3600, 2500]);
  });

  it("keeps the CFB hold honest", () => {
    expect(CFB_HOLD.evaluated).toBe(47);
    expect(CFB_HOLD.published).toBe(0);
    expect(CFB_HOLD.reason).toContain("JEV spine");
  });

  it("uses corrected roster identities", () => {
    expect(ROSTER_IDENTITIES.mikeEvans).toEqual({ name: "Mike Evans", team: "SF", position: "WR" });
    expect(ROSTER_IDENTITIES.genoSmith).toEqual({ name: "Geno Smith", team: "NYJ", position: "QB" });
  });
});
