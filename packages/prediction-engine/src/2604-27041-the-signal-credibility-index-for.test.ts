/**
 * Vitest suite for arXiv:2604.27041 (The Signal Credibility Index for Prediction Markets: A Microstructure-Grounded Diagnostic with Weighted and Time-Varying Extensions).
 * Gate: Adapt the SCI framework (both flavors) into GSE's steam pipeline if: (i) fitted NFL weights on ≥300 labeled moves achieve AUC ≥ 0.70 for move-side cover prediction; and (ii) the information-content and coordination-credibility flavors rank moves differently (Spearman < 0.6).
 */
import { describe, it, expect } from "vitest";
import { priceReversion, directionAgreement, breadthHhi, signalCredibilityIndex } from "./2604-27041-the-signal-credibility-index-for";

describe("2604-27041 signal credibility index", () => {
  const informed = [
    { book: "Pinnacle", move: 1.5, logitBefore: 0, logitAfter: 0.3 },
    { book: "Circa", move: 1.2, logitBefore: 0, logitAfter: 0.25 },
    { book: "Soft", move: 0.1, logitBefore: 0, logitAfter: 0.02 },
  ];
  const noise = [
    { book: "A", move: 0.5, logitBefore: 0, logitAfter: 0.1 },
    { book: "B", move: -0.5, logitBefore: 0, logitAfter: -0.1 },
    { book: "C", move: 0.4, logitBefore: 0, logitAfter: -0.08 },
  ];
  it("scores concentrated informed moves above dispersed noise", () => {
    expect(signalCredibilityIndex(informed)).toBeGreaterThan(signalCredibilityIndex(noise));
    expect(breadthHhi(informed)).toBeGreaterThan(breadthHhi(noise));
    expect(directionAgreement(informed)).toBeCloseTo(1, 10);
    expect(directionAgreement(noise)).toBeLessThan(1);
    expect(() => directionAgreement([])).toThrow();
  });
});
