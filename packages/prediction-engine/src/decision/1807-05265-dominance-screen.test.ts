// Tests for decision/1807-05265-dominance-screen.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  expectedRatioDominated,
  dominanceScreen,
  capAtFractionalCeiling,
  dominanceGatePasses,
} from "./1807-05265-dominance-screen.js";

describe("expectedRatioDominated (1807.05265)", () => {
  it("detects a dominated pick (ratio <= 1)", () => {
    // Pick i: +0.5/-0.5 coin flip; pick j: +1.0/-0.25 (strictly better in growth terms).
    const ri = [0.5, -0.5, 0.5, -0.5, 0.5, -0.5];
    const rj = [1.0, -0.25, 1.0, -0.25, 1.0, -0.25];
    const ratio = expectedRatioDominated(ri, rj);
    expect(ratio).toBeLessThanOrEqual(1);
    // Reversed: j is not dominated by i.
    expect(expectedRatioDominated(rj, ri)).toBeGreaterThan(1);
  });
  it("returns Infinity on empty input", () => {
    expect(expectedRatioDominated([], [])).toBe(Infinity);
  });
});

describe("dominanceScreen", () => {
  const picks = [
    { id: "spread", gameId: "g1", kind: "spread" },
    { id: "ml", gameId: "g1", kind: "moneyline" },
    { id: "total", gameId: "g2", kind: "total" },
  ];
  it("suppresses the dominated same-game pick with dual confirmation", () => {
    const res = dominanceScreen({
      picks,
      trailingReturns: {
        spread: [0.5, -0.5, 0.5, -0.5],
        ml: [1.0, -0.25, 1.0, -0.25],
        total: [0.9, -1, 0.9, -1],
      },
      structuralProbs: { spread: 0.5, ml: 0.62, total: 0.55 },
      trailingWindow: "2025-W08..W11",
      fractionalKellyCeiling: 0.25,
    });
    expect(res.suppressed.map((p) => p.id)).toEqual(["spread"]);
    expect(res.posted.map((p) => p.id).sort()).toEqual(["ml", "total"]);
    expect(res.triggers).toHaveLength(1);
    expect(res.triggers[0]).toMatchObject({
      suppressedId: "spread",
      dominantId: "ml",
      trailingWindow: "2025-W08..W11",
      structuralConfirmed: true,
    });
  });
  it("does not suppress when the structural model disagrees (regime test)", () => {
    const res = dominanceScreen({
      picks,
      trailingReturns: {
        spread: [0.5, -0.5, 0.5, -0.5],
        ml: [1.0, -0.25, 1.0, -0.25],
        total: [0.9, -1, 0.9, -1],
      },
      structuralProbs: { spread: 0.65, ml: 0.5, total: 0.55 }, // structural favors spread
      trailingWindow: "2025-W08..W11",
      fractionalKellyCeiling: 0.25,
    });
    expect(res.suppressed).toHaveLength(0);
    expect(res.posted).toHaveLength(3);
  });
  it("never touches picks from different games", () => {
    const res = dominanceScreen({
      picks: [
        { id: "a", gameId: "g1", kind: "spread" },
        { id: "b", gameId: "g2", kind: "spread" },
      ],
      trailingReturns: { a: [0.1], b: [5.0] },
      structuralProbs: { a: 0.5, b: 0.9 },
      trailingWindow: "w",
      fractionalKellyCeiling: 0.25,
    });
    expect(res.suppressed).toHaveLength(0);
  });
});

describe("capAtFractionalCeiling", () => {
  it("enforces the anti-all-in ceiling", () => {
    expect(capAtFractionalCeiling(0.9, 0.25)).toBe(0.25);
    expect(capAtFractionalCeiling(0.1, 0.25)).toBe(0.1);
    expect(capAtFractionalCeiling(-0.5, 0.25)).toBe(0);
  });
});

describe("dominanceGatePasses", () => {
  it("encodes the >=10% Calmar improvement + transparency gate", () => {
    expect(dominanceGatePasses(1.11, 1.0, true)).toBe(true);
    expect(dominanceGatePasses(1.09, 1.0, true)).toBe(false);
    expect(dominanceGatePasses(1.2, 1.0, false)).toBe(false);
  });
});
