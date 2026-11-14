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
          game_id: "nfl-2026-w10-buf-kc",
          market_type: "SPREAD",
          selection: "BUF -2.5",
        },
      ],
      0.62,
      0.52,
    );
    expect(killedLegRes.decision).toBe("PASS");
    expect(killedLegRes.publishAllowed).toBe(false);
  });
  it("does not floor jointThreeLegExceedance(0.25, 0.25, 0.25) to 0.14 and respects 0.28 ceiling", () => { const joint = jointThreeLegExceedance(0.25, 0.25, 0.25); expect(joint).toBeLessThan(0.10); expect(joint).toBeGreaterThanOrEqual(0); const highJoint = jointThreeLegExceedance(0.85, 0.85, 0.85); expect(highJoint).toBeLessThanOrEqual(0.28); });  it("blocks negative-edge non-contradictory parlays and NaN probability inputs in evaluateParlayConjunctionGate", () => { const speakLeg = { publishAllowed: true, decision: "SPEAK" as const, game_id: "nfl-2026-w10-buf-kc", market_type: "SPREAD", selection: "BUF -2.5"  }; const negEdgeRes = evaluateParlayConjunctionGate([speakLeg], 0.20, 0.25); expect(negEdgeRes.publishAllowed).toBe(false); expect(negEdgeRes.decision).toBe("PASS"); const nanRes = evaluateParlayConjunctionGate([speakLeg], Number.NaN, 0.25); expect(nanRes.publishAllowed).toBe(false); expect(nanRes.decision).toBe("PASS"); });
});
