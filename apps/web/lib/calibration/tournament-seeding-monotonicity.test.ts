import { describe, it, expect } from "vitest";
import {
  auditSeedingMonotonicity,
  rankPotAllocation,
  type PotAllocation,
} from "@/lib/calibration/tournament-seeding-monotonicity";

// ============================================================
// arXiv 2011.11277v6 — tournament seeding monotonicity audit.
// Additive only.
// ============================================================

describe("tournament seeding monotonicity — 2011.11277v6", () => {
  it("rank-based pots are monotone (control: no violations)", () => {
    const teams = ["A", "B", "C"];
    const violations = auditSeedingMonotonicity(
      teams,
      3,
      rankPotAllocation(teams),
    );
    expect(violations).toEqual([]);
  });

  it("detects a realizable paradox (better result, worse draw)", () => {
    // Pathological rule: winning your group (level 2) lands you in pot 2,
    // finishing second (level 1) lands you in pot 1.
    const paradox: PotAllocation = (s) => {
      const pots: Record<string, number> = {};
      for (const t of ["A", "B"]) pots[t] = s[t] === 2 ? 2 : 1;
      return pots;
    };
    const violations = auditSeedingMonotonicity(["A", "B"], 3, paradox);
    expect(violations.length).toBeGreaterThan(0);
    const v = violations[0]!;
    expect(v.drawQualityBetterResult).toBeGreaterThan(v.drawQualityWorseResult);
    expect(v.betterScenario[v.team]).toBeGreaterThan(v.worseScenario[v.team]!);
  });

  it("handles degenerate input", () => {
    expect(auditSeedingMonotonicity([], 3, () => ({}))).toEqual([]);
    expect(
      auditSeedingMonotonicity(["A"], 1, rankPotAllocation(["A"])),
    ).toEqual([]);
  });

  it("supports opponent-strength-aware draw quality", () => {
    // Draw quality = sum of opponents' pots (lower pots = stronger foes).
    const quality = (team: string, pots: Readonly<Record<string, number>>) =>
      Object.entries(pots)
        .filter(([t]) => t !== team)
        .reduce((a, [, p]) => a + p, 0);
    const teams = ["A", "B"];
    const violations = auditSeedingMonotonicity(
      teams,
      2,
      rankPotAllocation(teams),
      quality,
    );
    expect(violations).toEqual([]);
  });
});
