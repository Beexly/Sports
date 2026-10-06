/**
 * Vitest suite for arXiv:2608.09887v1 (Space-Creating versus Dead Possession: An Off-Ball Possession-Quality Index for Broadcast Football).
 * Gate: ADOPT the NFL junk-offense index for GSE matchup content if: leave-one-week-out team mean junk-open predicts next-game point differential with |r| >= 0.15 AND the joint regression shows junk-open significant (p < 0.05) controlling for EPA/play; REJECT if the index adds nothing beyond EPA.
 */
import { describe, it, expect } from "vitest";
import { junkOpenShare, driveValueEfficiency, sterileIndex, safetyDisplacement, pearsonC, lowoCorrelations, jointRegression, IndexedPlay } from "./2608-09887v1-spacecreating-versus-dead-possession-an";

describe("2608-09887v1 NFL junk-offense index", () => {
  const plays: IndexedPlay[] = [
    { junkOpen: true, tiedOrLosing: true, epa: 0.5 },
    { junkOpen: false, tiedOrLosing: true, epa: -0.2 },
    { junkOpen: true, tiedOrLosing: false, epa: 0.8 },
    { junkOpen: false, tiedOrLosing: true, epa: 0.1 },
  ];
  it("junk-open share, drive efficiency, sterile index", () => {
    expect(junkOpenShare(plays)).toBeCloseTo(1 / 3, 10);
    expect(driveValueEfficiency([7, 3, 0, 7], 2.0)).toBeCloseTo(2.125, 10);
    expect(sterileIndex(plays)).toBeCloseTo(0.25, 10);
    expect(safetyDisplacement([12, 14], [10, 11])).toBeCloseTo(-2.5, 10);
    expect(() => junkOpenShare([])).toThrow();
  });
  it("LOWO correlation and joint regression", () => {
    const wj = [
      [0.4, 0.5, 0.45, 0.55],
      [0.2, 0.25, 0.3, 0.22],
      [0.6, 0.55, 0.65, 0.6],
    ];
    const wd = [
      [3, 7, 5, 10],
      [-7, -3, -5, -6],
      [10, 8, 12, 9],
    ];
    const cors = lowoCorrelations(wj, wd);
    expect(cors.length).toBe(4);
    expect(cors.every((c) => c > 0.15)).toBe(true);
    // Joint regression: strong junk signal, independent of epa
    const junk = [0.5, 0.2, 0.6, 0.4, 0.3, 0.55, 0.25, 0.45];
    const epa = [0.1, -0.05, 0.12, 0.02, -0.02, 0.08, 0.0, 0.05];
    const diff = junk.map((j, i) => 20 * j + 5 * (epa[i] ?? 0) - 6);
    const { betaJunk, pValue } = jointRegression(junk, epa, diff);
    expect(betaJunk).toBeGreaterThan(10);
    expect(pValue).toBeLessThan(0.05);
    expect(() => jointRegression([1], [1], [1])).toThrow();
  });
});
