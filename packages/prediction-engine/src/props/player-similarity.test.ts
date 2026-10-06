import { describe, expect, it } from "vitest";
import {
  closestComps,
  redundancyWeights,
  robustScale,
  weightedL1,
} from "./player-similarity";
import type { PlayerSeason } from "./player-similarity";

const players: PlayerSeason[] = [
  { id: "wr1", position: "WR", role: "slot", features: { tgtShare: 0.25, adot: 8, yprr: 2.1 } },
  { id: "wr2", position: "WR", role: "slot", features: { tgtShare: 0.24, adot: 8.5, yprr: 2.0 } },
  { id: "wr3", position: "WR", role: "outside", features: { tgtShare: 0.25, adot: 8, yprr: 2.1 } },
  { id: "wr4", position: "WR", role: "slot", features: { tgtShare: 0.12, adot: 14, yprr: 1.2 } },
  { id: "te1", position: "TE", role: "slot", features: { tgtShare: 0.25, adot: 8, yprr: 2.1 } },
];

describe("player-similarity", () => {
  it("robustScale centers the median at ~0", () => {
    const scaled = robustScale(players);
    const meds = ["tgtShare", "adot", "yprr"].map((f) => {
      const vals = [...scaled.values()].map((v) => v[f] ?? 0).sort((a, b) => a - b);
      return vals[Math.floor(vals.length / 2)] ?? 0;
    });
    for (const m of meds) expect(Math.abs(m)).toBeLessThan(1);
  });

  it("redundancyWeights down-weight correlated features", () => {
    // x and y are perfect duplicates; z is independent.
    const dup: PlayerSeason[] = [
      { id: "p1", position: "WR", role: "slot", features: { x: 1, y: 1, z: 5 } },
      { id: "p2", position: "WR", role: "slot", features: { x: 2, y: 2, z: 1 } },
      { id: "p3", position: "WR", role: "slot", features: { x: 3, y: 3, z: 4 } },
      { id: "p4", position: "WR", role: "slot", features: { x: 4, y: 4, z: 2 } },
      { id: "p5", position: "WR", role: "slot", features: { x: 5, y: 5, z: 3 } },
    ];
    const scaled = robustScale(dup);
    const w = redundancyWeights(scaled, ["x", "y", "z"]);
    expect(w["x"]).toBeCloseTo(w["y"] ?? 0, 10);
    expect(w["x"]).toBeLessThan(w["z"] ?? 1);
    expect(Object.values(w).every((x) => x > 0 && x <= 1)).toBe(true);
  });

  it("weightedL1 is zero for identical vectors", () => {
    const scaled = robustScale(players);
    const v = scaled.get("wr1") ?? {};
    expect(weightedL1(v, v, { tgtShare: 1, adot: 1, yprr: 1 })).toBe(0);
  });

  it("closestComps respects position/role controls and ranks the near-twin first", () => {
    const comps = closestComps(players, "wr1", 3);
    expect(comps[0]!.id).toBe("wr2"); // same role, near-identical features
    expect(comps.every((c) => c.id !== "wr3")).toBe(true); // outside role excluded
    expect(comps.every((c) => c.id !== "te1")).toBe(true); // TE excluded
    expect(comps[0]!.distance).toBeLessThan(comps[1]?.distance ?? Infinity);
    expect(() => closestComps(players, "nobody")).toThrow("not found");
  });
});
