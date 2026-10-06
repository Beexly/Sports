/**
 * Vitest suite for arXiv:2608.11203v1 (Capturing Uncertainty in Human Motion for Representation Learning in Soccer).
 * Gate: ADOPT if: (a) GTN+DDL motion-prediction error >= 10% lower than GTN-only at the 1.0 s horizon on held-out weeks, AND (b) pretrained reps beat from-scratch by >= 5pp accuracy on route-family classification. REJECT if neither holds.
 */
import { describe, it, expect } from "vitest";
import { temperedSoftmax, ddlDistribution, ddlExpectedDisplacement, routeFamilyLogits } from "./2608-11203v1-capturing-uncertainty-in-human-motion";

describe("2608-11203v1 DDL motion vocabulary", () => {
  const head = {
    codebook: [[1, 0], [0, 1], [-1, 0]],
    temperature: 0.5,
  };
  it("produces a valid categorical distribution peaked at the nearest codeword", () => {
    const p = ddlDistribution(head, [2, 0.1]);
    const sum = p.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(p[0]).toBeGreaterThan(p[1] ?? 0);
    expect(p[0]).toBeGreaterThan(p[2] ?? 0);
    expect(() => temperedSoftmax([1], 0)).toThrow();
  });
  it("expected displacement follows the distribution", () => {
    const deltas: [number, number][] = [[3, 0], [0, 3], [-3, 0]];
    const [dx, dy] = ddlExpectedDisplacement(head, [2, 0.1], deltas);
    expect(dx).toBeGreaterThan(2);
    expect(Math.abs(dy)).toBeLessThan(1);
  });
  it("linear head maps frozen reps to route families", () => {
    const logits = routeFamilyLogits([[1, 0], [0, 1]], [2, 0.1]);
    expect(logits[0]).toBeGreaterThan(logits[1] ?? 0);
  });
});
