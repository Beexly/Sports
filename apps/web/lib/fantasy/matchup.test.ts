import { describe, it, expect } from "vitest";
import { matchupGrade, rankOpponents, softMatchups } from "./matchup";

describe("matchupGrade", () => {
  it("returns a grade for known teams", () => {
    const grade = matchupGrade("KC", "RB", "NYJ");
    expect(grade).not.toBeNull();
    expect(grade!.tier).toBeGreaterThanOrEqual(1);
    expect(grade!.tier).toBeLessThanOrEqual(5);
    expect(grade!.ptaPerGame).toBeGreaterThan(0);
    expect(grade!.label).toBeTruthy();
  });

  it("returns null for unknown opponent", () => {
    expect(matchupGrade("KC", "WR", "XYZ")).toBeNull();
  });

  it("grades same position differently across different defenses", () => {
    const easy = matchupGrade("SF", "WR", "LV")!;  // LV is tier 2 vs WR
    const hard = matchupGrade("SF", "WR", "NYJ")!; // NYJ is tier 4 vs WR
    expect(easy).not.toBeNull();
    expect(hard).not.toBeNull();
    expect(easy.tier).toBeLessThan(hard.tier);
    expect(easy.ptaPerGame).toBeGreaterThan(hard.ptaPerGame);
  });
});

describe("rankOpponents", () => {
  it("returns all teams sorted easiest-first for WR", () => {
    const ranked = rankOpponents("WR");
    expect(ranked.length).toBeGreaterThan(20);
    expect(ranked[0]!.tier).toBeLessThanOrEqual(ranked[ranked.length - 1]!.tier);
    for (const r of ranked) {
      expect(r.tier).toBeGreaterThanOrEqual(1);
      expect(r.tier).toBeLessThanOrEqual(5);
    }
  });

  it("RB pts allowed differs from WR pts allowed for same team", () => {
    const rbRank = rankOpponents("RB");
    const wrRank = rankOpponents("WR");
    const rbTotPta = rbRank.reduce((s, r) => s + r.ptaPerGame, 0);
    const wrTotPta = wrRank.reduce((s, r) => s + r.ptaPerGame, 0);
    expect(wrTotPta).toBeGreaterThan(rbTotPta); // WR PPR pts > RB PPR pts in aggregate
  });
});

describe("softMatchups", () => {
  it("returns only tier 1-2 opponents", () => {
    const soft = softMatchups("QB");
    expect(soft.length).toBeGreaterThan(0);
    // All returned teams should be tier ≤ 2
    const ranked = rankOpponents("QB");
    for (const team of soft) {
      const found = ranked.find((r) => r.team === team);
      expect(found?.tier).toBeLessThanOrEqual(2);
    }
  });
});
