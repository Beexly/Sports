import { describe, it, expect } from "vitest";
import {
  mulberry32,
  winProbability,
  simulateKnockout,
  simulateRoundRobin,
  simulateSwiss,
  outrightProbabilities,
  type TeamStrength,
} from "@/lib/calibration/tournament-design-sim";

// ============================================================
// arXiv 2103.06023v4 — tournament design taxonomy. Additive.
// ============================================================

const teams: TeamStrength[] = [
  { id: "A", strength: 2 },
  { id: "B", strength: 1 },
  { id: "C", strength: 0 },
  { id: "D", strength: -1 },
];

describe("tournament design sim — 2103.06023v4", () => {
  it("winProbability is 0.5 at equal strength and monotone", () => {
    expect(winProbability(0, 0)).toBeCloseTo(0.5, 10);
    expect(winProbability(2, 0)).toBeGreaterThan(winProbability(1, 0));
  });

  it("mulberry32 is deterministic per seed", () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
  });

  it("simulateKnockout favors the strongest team over many sims", () => {
    const rand = mulberry32(3);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const w = simulateKnockout(teams, rand);
      counts[w] = (counts[w] ?? 0) + 1;
    }
    expect(counts["A"]).toBeGreaterThan(counts["D"]!);
    expect(counts["A"]).toBeGreaterThan(counts["B"]!);
  });

  it("simulateKnockout handles degenerate fields", () => {
    expect(simulateKnockout([], mulberry32(1))).toBe("");
    expect(simulateKnockout([{ id: "X", strength: 0 }], mulberry32(1))).toBe("X");
  });

  it("outrightProbabilities sum to 1 and respect strength order", () => {
    const probs = outrightProbabilities({ kind: "knockout" }, teams, 4000, 11);
    const total = Object.values(probs).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(probs["A"]).toBeGreaterThan(probs["D"]!);
  });

  it("outrightProbabilities are reproducible for a fixed seed", () => {
    const p1 = outrightProbabilities({ kind: "swiss", rounds: 3 }, teams, 500, 5);
    const p2 = outrightProbabilities({ kind: "swiss", rounds: 3 }, teams, 500, 5);
    expect(p1).toEqual(p2);
  });

  it("round-robin and swiss produce valid winners", () => {
    const ids = new Set(teams.map((t) => t.id));
    expect(ids.has(simulateRoundRobin(teams, mulberry32(2)))).toBe(true);
    expect(ids.has(simulateSwiss(teams, 3, mulberry32(2)))).toBe(true);
  });

  it("empty field and zero sims are safe", () => {
    expect(outrightProbabilities({ kind: "round-robin" }, [], 100, 1)).toEqual({});
    const p = outrightProbabilities({ kind: "knockout" }, teams, 0, 1);
    expect(Object.values(p).every((v) => v === 0)).toBe(true);
  });
});
