import { describe, expect, it } from "vitest";
import {
  calibrationZTest,
  computeHoldoutSignificance,
  normalTwoTailP,
  welchTTest,
} from "@/lib/calibration/holdout-significance";

describe("holdout-significance", () => {
  it("normalTwoTailP is symmetric and ~0 for large |z|", () => {
    expect(normalTwoTailP(0)).toBeCloseTo(1, 2);
    expect(normalTwoTailP(3)).toBeLessThan(0.01);
    expect(normalTwoTailP(-3)).toBeCloseTo(normalTwoTailP(3), 6);
  });

  it("welch detects mean shift", () => {
    const a = Array.from({ length: 40 }, () => 0.1);
    const b = Array.from({ length: 40 }, () => -0.1);
    const { t, p } = welchTTest(a, b);
    expect(Math.abs(t)).toBeGreaterThan(5);
    expect(p).toBeLessThan(0.01);
  });

  it("calibrationZ flags systematic miscalibration", () => {
    // win rate 0.7 vs meanP 0.4 on n=100
    const { z, p } = calibrationZTest(70, 100, 0.4);
    expect(z).toBeGreaterThan(3);
    expect(p).toBeLessThan(0.01);
  });

  it("pause when no separation", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      groupKey: "nba|ml",
      p: 0.5 + (i % 2 === 0 ? 0.01 : -0.01),
      y: (i % 2) as 0 | 1,
    }));
    // scramble so p does not rank y
    const scrambled = rows.map((r, i) => ({
      ...r,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const art = computeHoldoutSignificance(scrambled, { minGroupN: 20 });
    expect(art.groups.length).toBe(1);
    expect(art.groups[0]!.pauseRecommendation).toBe(true);
  });

  it("keep group when separation is strong", () => {
    const rows = [
      ...Array.from({ length: 30 }, () => ({ groupKey: "nhl|ml", p: 0.7, y: 1 as const })),
      ...Array.from({ length: 30 }, () => ({ groupKey: "nhl|ml", p: 0.3, y: 0 as const })),
    ];
    const art = computeHoldoutSignificance(rows, { minGroupN: 20 });
    expect(art.groups[0]!.pauseRecommendation).toBe(false);
    expect(art.groups[0]!.separation).toBeGreaterThan(0.3);
  });
});
