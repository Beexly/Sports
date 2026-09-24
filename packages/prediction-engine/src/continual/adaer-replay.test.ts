
import { describe, expect, it } from "vitest";
import { adaErBufferSelect, interferenceScores } from "./adaer-replay";

describe("adaer-replay", () => {
  it("scores interference as challenger-minus-champion loss", () => {
    const s = interferenceScores([0.5, 0.2], [0.4, 0.4]);
    expect(s[0]).toBeCloseTo(0.1, 12);
    expect(s[1]).toBeCloseTo(-0.2, 12);
  });
  it("throws on misaligned loss vectors", () => {
    expect(() => interferenceScores([0.1], [0.1, 0.2])).toThrow();
  });
  it("selects new week + top-p interfered + balanced reservoir", () => {
    const sel = adaErBufferSelect({
      challengerLoss: [0.9, 0.1, 0.8, 0.2, 0.7, 0.3],
      championLoss: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      newWeekIndices: [0],
      topP: 2,
      reservoirK: 2,
      labels: [1, 0, 1, 0, 1, 0],
      seed: 7,
    });
    // interference: idx2 +0.3, idx4 +0.2, idx5 -0.2, idx1 -0.4, idx3 -0.3
    expect(sel.interferedIndices).toEqual([2, 4]);
    expect(sel.trainIndices).toContain(0);
    expect(sel.trainIndices.length).toBeGreaterThanOrEqual(3);
    // reservoir is class-balanced: at most perStratum picks per label
    expect(sel.reservoirIndices.length).toBeLessThanOrEqual(4);
  });
  it("handles empty history and topP=0", () => {
    const sel = adaErBufferSelect({
      challengerLoss: [0.5], championLoss: [0.5], newWeekIndices: [0],
      topP: 0, reservoirK: 5, labels: [1], seed: 1,
    });
    expect(sel.interferedIndices).toEqual([]);
    expect(sel.reservoirIndices).toEqual([]);
    expect(sel.trainIndices).toEqual([0]);
  });
  it("is deterministic for a fixed seed", () => {
    const o = {
      challengerLoss: [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4],
      championLoss: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      newWeekIndices: [0], topP: 1, reservoirK: 4,
      labels: [1, 0, 1, 0, 1, 0, 1, 0],
    };
    expect(adaErBufferSelect({ ...o, seed: 3 })).toEqual(adaErBufferSelect({ ...o, seed: 3 }));
  });
});
