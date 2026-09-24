/**
 * Vitest suite for arXiv:2607.11548v1 (Training-Free Off-Screen Player Imputation for Broadcast-Based Spatial Football Analytics).
 * Gate: Adopt B4 (or a better learned variant) into the GSE tracking pipeline if it cuts the decision-relevant NFL metric error to <=50% of the ignore policy on the held-out weeks; reject broadcast-video tracking for that metric (stick to play-by-play sources) if B4 fails to beat the ignore policy.
 */
import { describe, it, expect } from "vitest";
import { centroidVoteImpute, boxCount, separationAtThrow, beatsIgnorePolicy, TrackedPlayer } from "./2607-11548v1-trainingfree-offscreen-player-imputation-for";

describe("2607-11548v1 off-screen player imputation", () => {
  it("imputes invisible players at the role centroid", () => {
    const players: TrackedPlayer[] = [
      { id: "wr1", role: "WR", x: 10, y: 20, visible: true },
      { id: "wr2", role: "WR", x: 14, y: 20, visible: true },
      { id: "wr3", role: "WR", x: 0, y: 0, visible: false },
      { id: "dl1", role: "DL", x: 0, y: 0, visible: false },
    ];
    const out = centroidVoteImpute(players, { x: 5, y: 10 });
    const wr3 = out.find((p) => p.id === "wr3")!;
    expect(wr3.x).toBeCloseTo(12, 10);
    const dl1 = out.find((p) => p.id === "dl1")!;
    expect(dl1.x).toBeCloseTo(5, 10); // anchor fallback
  });
  it("box count and separation", () => {
    const defs = [{ x: 4, y: 9 }, { x: 6, y: 11 }, { x: 30, y: 30 }];
    expect(boxCount(defs, 10, 5)).toBe(2);
    expect(separationAtThrow({ x: 0, y: 0 }, [{ x: 3, y: 4 }])).toBeCloseTo(5, 10);
    expect(() => separationAtThrow({ x: 0, y: 0 }, [])).toThrow();
  });
  it("verdict requires halving the ignore-policy error", () => {
    expect(beatsIgnorePolicy(0.4, 1.0)).toBe(true);
    expect(beatsIgnorePolicy(0.6, 1.0)).toBe(false);
    expect(() => beatsIgnorePolicy(0.4, 0)).toThrow();
  });
});
