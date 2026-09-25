import { describe, expect, it } from "vitest";
import {
  evalCatchProb,
  evalCatchProwess,
  evalClosestComps,
  evalConditionalFirstDown,
  evalConditionalTd,
  evalXFlags,
} from "./props-player-bridge.js";

describe("props-player-bridge evalConditionalTd", () => {
  it("fail-closes on misaligned arrays", () => {
    const r = evalConditionalTd({
      targetProbs: [0.5, 0.5],
      tdGivenTarget: [0.1],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("fail-closes on improper target distribution", () => {
    const r = evalConditionalTd({
      targetProbs: [0.5, 0.5, 0.5],
      tdGivenTarget: [0.1, 0.2, 0.3],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("proper");
  });

  it("marginalizes P(TD) over the target distribution", () => {
    const r = evalConditionalTd({
      targetProbs: [0.5, 0.3, 0.2],
      tdGivenTarget: [0.12, 0.08, 0.05],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeCloseTo(0.5 * 0.12 + 0.3 * 0.08 + 0.2 * 0.05, 5);
    }
  });

  it("evalConditionalFirstDown runs the same decomposition", () => {
    const r = evalConditionalFirstDown({
      targetProbs: [0.6, 0.4],
      tdGivenTarget: [0.4, 0.25],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0.6 * 0.4 + 0.4 * 0.25, 5);
  });
});

describe("props-player-bridge catch prowess", () => {
  const targets = [
    { receiverId: "r1", x: 2, depth: 8, airYards: 10, separation: 2.1, caught: 1 },
    { receiverId: "r1", x: -5, depth: 12, airYards: 14, separation: 1.4, caught: 0 },
    { receiverId: "r1", x: 0, depth: 4, airYards: 5, separation: 3.2, caught: 1 },
    { receiverId: "r2", x: 8, depth: 15, airYards: 18, separation: 0.9, caught: 0 },
    { receiverId: "r2", x: -2, depth: 6, airYards: 7, separation: 2.8, caught: 1 },
    { receiverId: "r2", x: 1, depth: 9, airYards: 11, separation: 1.8, caught: 1 },
  ];

  it("evalCatchProwess fits prowess + baseline", () => {
    const r = evalCatchProwess({ targets, priorWeight: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.baseline).toBeGreaterThan(0);
      expect(r.data.baseline).toBeLessThan(1);
      expect(Object.keys(r.data.fit)).toContain("r1");
    }
  });

  it("evalCatchProb returns P(catch) in (0,1)", () => {
    const fit = evalCatchProwess({ targets });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const r = evalCatchProb({ fit: fit.data, receiverId: "r1" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThan(0);
      expect(r.data).toBeLessThan(1);
    }
  });

  it("fail-closes on empty targets", () => {
    expect(evalCatchProwess({ targets: [] }).ok).toBe(false);
  });
});

describe("props-player-bridge closest comps", () => {
  const players = [
    { id: "a", position: "WR" as const, role: "slot", features: { rec: 70, yards: 800, tds: 6 } },
    { id: "b", position: "WR" as const, role: "outside", features: { rec: 60, yards: 900, tds: 8 } },
    { id: "c", position: "WR" as const, role: "slot", features: { rec: 65, yards: 750, tds: 5 } },
    { id: "d", position: "TE" as const, role: "inline", features: { rec: 50, yards: 550, tds: 4 } },
  ];

  it("returns closest comps for a target", () => {
    const r = evalClosestComps({ players, targetId: "a", k: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.length).toBeGreaterThan(0);
      expect(r.data.length).toBeLessThanOrEqual(2);
    }
  });

  it("fail-closes when target is missing", () => {
    const r = evalClosestComps({ players, targetId: "zzz" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("target not found");
  });
});

describe("props-player-bridge evalXFlags", () => {
  it("fail-closes on misaligned arrays", () => {
    const r = evalXFlags({
      playProbs: [0.1, 0.2],
      teamOf: ["A"],
      crewOf: ["X", "Y"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("aggregates expected flags by team and crew", () => {
    const r = evalXFlags({
      playProbs: [0.1, 0.2, 0.15, 0.05],
      teamOf: ["A", "A", "B", "B"],
      crewOf: ["X", "Y", "X", "Y"],
      yardsIfFlag: [5, 10, 5, 15],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.total).toBeCloseTo(0.5, 5);
      expect(Object.keys(r.data.byTeam).sort()).toEqual(["A", "B"]);
      expect(Object.keys(r.data.byCrew).sort()).toEqual(["X", "Y"]);
      expect(r.data.expectedFreeYardage).not.toBeNull();
    }
  });

  it("fail-closes on non-finite probs", () => {
    const r = evalXFlags({
      playProbs: [0.1, Number.NaN],
      teamOf: ["A", "B"],
      crewOf: ["X", "Y"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("imputed");
  });
});
