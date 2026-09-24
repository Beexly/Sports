/**
 * Vitest suite for arXiv:2410.16333 (Conformal Predictive Portfolio Selection).
 * Gate: ADOPT the corrected rule if it beats projection-maximizing selection on 2024–2025 ROI with statistical significance (paired test over slates); REJECT the paper's as-written orientation if the A/B shows the literal lowest-r version underperforms (confirming the sign error).
 */
import { describe, it, expect } from "vitest";
import { riskClass, selectPortfolio } from "./2410-16333-conformal-predictive-portfolio-selection";

describe("2410-16333 conformal predictive portfolio selection", () => {
  const cands = [
    { id: "a", proj: 150, halfWidth: 10, rake: 5, ownership: 0.35 },  // low risk, popular
    { id: "b", proj: 160, halfWidth: 60, rake: 5, ownership: 0.1 },   // high risk
    { id: "c", proj: 140, halfWidth: 8, rake: 5, ownership: 0.05 },  // low risk, contrarian
  ];
  it("selects the max upper bound among low-risk candidates (sign corrected)", () => {
    const pick = selectPortfolio(cands);
    // a: 150+10-5-3.5=151.5 ; c: 140+8-5-0.5=142.5 -> a wins; b excluded (high risk)
    expect(pick.id).toBe("a");
  });
  it("ownership fade can flip the choice", () => {
    const pick = selectPortfolio(cands, 100);
    // a: 155-35=120 ; c: 143-5=138 -> c wins
    expect(pick.id).toBe("c");
  });
  it("classifies risk from the interval width ratio", () => {
    expect(riskClass(cands[0]!)).toBe("low");
    expect(riskClass(cands[1]!)).toBe("high");
    expect(() => selectPortfolio([cands[1]!])).toThrow();
  });
});
