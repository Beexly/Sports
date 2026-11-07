import { describe, expect, it } from "vitest";
import { jointThreeLegExceedance } from "../sgp-copula";
import { evaluateParlayConjunctionGate } from "../no-bet-gate";

describe("Vector 4 Red-Team Regression: SGP Copula Fréchet-Hoeffding & Parlay Conjunction Gate", () => {
  it("never violates the Fréchet-Hoeffding upper bound min(a,b,c) even when min(a,b,c) < 0.14", () => {
    const pA = 0.05;
    const pB = 0.05;
    const pC = 0.05;
    const joint = jointThreeLegExceedance(pA, pB, pC, 0.45, 0.45, 0.45);
    expect(joint).toBeLessThanOrEqual(Math.min(pA, pB, pC));
    expect(joint).toBeGreaterThanOrEqual(0.0);
  });

  it("blocks empty parlay legs and KILLED/PASS legs in evaluateParlayConjunctionGate", () => {
    const emptyRes = evaluateParlayConjunctionGate([], 0.35, 0.25);
    expect(emptyRes.decision).toBe("PASS");
    expect(emptyRes.publishAllowed).toBe(false);

    const killedLegRes = evaluateParlayConjunctionGate(
      [
        {
          publishAllowed: true,
          decision: "KILLED",
          wilsonLowerBound: 0.58,
          netEdge: 0.06,
          confidenceScore: "76/100",
          reason: "Adverse line movement",
        },
      ],
      0.62,
      0.52,
    );
    expect(killedLegRes.decision).toBe("PASS");
    expect(killedLegRes.publishAllowed).toBe(false);
  });
});
