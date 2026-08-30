import { describe, it, expect } from "vitest";
import { opponentAdjustedEpa, type Play } from "./opponent-adjusted-epa";

/**
 * Synthetic-recovery tests: we generate plays from a KNOWN ground truth
 * (offense/defense strengths) and assert the solver recovers the ordering and
 * approximate magnitudes. This is the honest way to test an iterative estimator —
 * no real data, no fabricated stats, just "does the math invert the model."
 */

/** Build a round-robin schedule: every offense faces every defense `reps` times. */
function roundRobin(
  offenseStrength: Record<string, number>,
  defenseStrength: Record<string, number>,
  leagueMean: number,
  reps: number,
): Play[] {
  const teams = Object.keys(offenseStrength);
  const plays: Play[] = [];
  for (const offense of teams) {
    for (const defense of teams) {
      if (offense === defense) continue; // teams don't play themselves
      const off = offenseStrength[offense] ?? 0;
      const def = defenseStrength[defense] ?? 0;
      for (let r = 0; r < reps; r++) {
        plays.push({ offense, defense, epa: leagueMean + off + def });
      }
    }
  }
  return plays;
}

describe("opponentAdjustedEpa — offense recovery", () => {
  it("recovers a known offensive ordering with neutral defenses", () => {
    // Ground truth: A best (+0.30), B average (0), C worst (-0.30); defenses all 0.
    const off = { A: 0.3, B: 0, C: -0.3 };
    const def = { A: 0, B: 0, C: 0 };
    const result = opponentAdjustedEpa(roundRobin(off, def, 0.1, 4));

    // ratings are sorted by offAdj descending.
    expect(result.ratings.map((r) => r.team)).toEqual(["A", "B", "C"]);
    const byTeam = new Map(result.ratings.map((r) => [r.team, r]));
    expect(byTeam.get("A")!.offAdj).toBeCloseTo(0.3, 2);
    expect(byTeam.get("B")!.offAdj).toBeCloseTo(0, 2);
    expect(byTeam.get("C")!.offAdj).toBeCloseTo(-0.3, 2);
    // league mean is recovered.
    expect(result.leagueMeanEpa).toBeCloseTo(0.1, 4);
  });
});

describe("opponentAdjustedEpa — defense recovery", () => {
  it("recovers a known defensive ordering with neutral offenses", () => {
    // Defense D allows -0.25 (best), E neutral, F allows +0.25 (worst).
    const off = { D: 0, E: 0, F: 0 };
    const def = { D: -0.25, E: 0, F: 0.25 };
    const result = opponentAdjustedEpa(roundRobin(off, def, 0, 4));

    const byTeam = new Map(result.ratings.map((r) => [r.team, r]));
    expect(byTeam.get("D")!.defAdj).toBeCloseTo(-0.25, 2);
    expect(byTeam.get("E")!.defAdj).toBeCloseTo(0, 2);
    expect(byTeam.get("F")!.defAdj).toBeCloseTo(0.25, 2);
    // lower defAdj = better defense, so D should be the stingiest.
    expect(byTeam.get("D")!.defAdj).toBeLessThan(byTeam.get("F")!.defAdj);
  });
});

describe("opponentAdjustedEpa — opponent adjustment actually adjusts", () => {
  it("credits an offense that only faced tough defenses over its raw EPA", () => {
    // Two offenses with identical TRUE strength (+0.2), but A only faces the
    // best defense and B only faces the worst. Raw EPA would rank B above A;
    // opponent adjustment should pull them back together.
    const plays: Play[] = [];
    // strong D (-0.3), weak W (+0.3); offenses A and B both truly +0.2.
    for (let r = 0; r < 20; r++) {
      plays.push({ offense: "A", defense: "D", epa: 0.2 - 0.3 });
      plays.push({ offense: "B", defense: "W", epa: 0.2 + 0.3 });
      // give the defenses a common opponent so the system is connected.
      plays.push({ offense: "C", defense: "D", epa: 0.0 - 0.3 });
      plays.push({ offense: "C", defense: "W", epa: 0.0 + 0.3 });
    }
    const result = opponentAdjustedEpa(plays);
    const a = result.ratings.find((r) => r.team === "A")!;
    const b = result.ratings.find((r) => r.team === "B")!;
    // After adjustment A and B should be close despite a 0.6 raw EPA gap.
    expect(Math.abs(a.offAdj - b.offAdj)).toBeLessThan(0.1);
  });
});

describe("opponentAdjustedEpa — provenance + safety", () => {
  it("carries the stat-commandment envelope (source/definition/weakness/timestamp)", () => {
    const now = new Date("2026-06-23T00:00:00.000Z");
    const result = opponentAdjustedEpa(roundRobin({ A: 0.1, B: -0.1 }, { A: 0, B: 0 }, 0, 2), {
      now,
    });
    expect(result.provenance.source).toContain("nflverse");
    expect(result.provenance.definition.length).toBeGreaterThan(0);
    expect(result.provenance.weakness.length).toBeGreaterThan(0);
    expect(result.provenance.computedAt).toBe("2026-06-23T00:00:00.000Z");
  });

  it("returns a safe empty result for no plays (no divide-by-zero)", () => {
    const result = opponentAdjustedEpa([]);
    expect(result.ratings).toEqual([]);
    expect(result.leagueMeanEpa).toBe(0);
    expect(result.sampleSize).toBe(0);
  });

  it("reports plays counts and sample size", () => {
    const plays = roundRobin({ A: 0.1, B: -0.1 }, { A: 0, B: 0 }, 0, 3);
    const result = opponentAdjustedEpa(plays);
    expect(result.sampleSize).toBe(plays.length);
    const a = result.ratings.find((r) => r.team === "A")!;
    // A is offense in 3 plays vs B and defense in 3 plays vs B (round-robin, reps=3).
    expect(a.offPlays).toBe(3);
    expect(a.defPlays).toBe(3);
  });
});
