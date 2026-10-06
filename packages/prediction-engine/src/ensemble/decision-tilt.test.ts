import { describe, expect, it } from "vitest";
import { entropicTilt, riskAwareScore, tailRiskVeto } from "./decision-tilt";

describe("decision-tilt", () => {
  it("riskAwareScore penalizes drawdown", () => {
    expect(riskAwareScore({ growth: 0.1, maxDrawdown: 0.05 }, 1)).toBeCloseTo(0.05, 12);
    expect(riskAwareScore({ growth: 0.1, maxDrawdown: 0.05 }, 0)).toBeCloseTo(0.1, 12);
  });
  it("entropicTilt recovers base weights at eta=0 and tilts toward winners", () => {
    const w0 = [0.5, 0.3, 0.2];
    const scores = [0.05, 0.1, -0.02];
    const flat = entropicTilt(w0, scores, 0);
    flat.forEach((w, i) => expect(w).toBeCloseTo(w0[i] ?? 0, 12));
    const tilted = entropicTilt(w0, scores, 10);
    expect(tilted.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
    // Highest score (index 1) gains weight vs base.
    expect(tilted[1] ?? 0).toBeGreaterThan(w0[1] ?? 0);
    expect(tilted[2] ?? 0).toBeLessThan(w0[2] ?? 0);
  });
  it("tailRiskVeto fires past the 25% drawdown excess", () => {
    expect(tailRiskVeto(0.1, 0.1)).toBe(false);
    expect(tailRiskVeto(0.13, 0.1)).toBe(true); // 30% worse
    expect(tailRiskVeto(0.125, 0.1)).toBe(false); // exactly 25%: not a breach
  });
  it("throws on degenerate inputs", () => {
    expect(() => entropicTilt([], [], 1)).toThrow();
    expect(() => entropicTilt([0.5], [0.1, 0.2], 1)).toThrow();
    expect(() => entropicTilt([0.5, 0.5], [0.1, 0.2], -1)).toThrow();
    expect(() => riskAwareScore({ growth: 0, maxDrawdown: -1 }, 1)).toThrow();
  });
});
