import { describe, expect, it } from "vitest";
import {
  foldOf, crossFitFolds, residual, multiCalibrationBuckets, worstBucketMiscalibration,
  CROSS_FIT_FOLDS, GSE_RESIDUAL_HYGIENE_ENABLED,
} from "./residual-hygiene-2401.js";

describe("residual hygiene", () => {
  it("fold assignment is deterministic and in range", () => {
    expect(foldOf("player-1")).toBe(foldOf("player-1"));
    expect(foldOf("player-1")).toBeGreaterThanOrEqual(0);
    expect(foldOf("player-1")).toBeLessThan(CROSS_FIT_FOLDS);
  });
  it("folds hold out whole players (no player split across folds)", () => {
    const plays = [
      { playerId: "a", positionGroup: "RB" as const, actualYards: 5 },
      { playerId: "a", positionGroup: "RB" as const, actualYards: 7 },
      { playerId: "b", positionGroup: "WR" as const, actualYards: 12 },
    ];
    const folds = crossFitFolds(plays);
    const seen = new Map<string, number>();
    folds.forEach((f, i) => f.forEach((p) => {
      if (seen.has(p.playerId)) expect(seen.get(p.playerId)).toBe(i);
      seen.set(p.playerId, i);
    }));
    expect(folds.flat()).toHaveLength(3);
  });
  it("residual is actual minus expected", () => {
    expect(residual(12, 9.5)).toBeCloseTo(2.5, 10);
  });
  it("multi-calibration buckets average residuals per bucket", () => {
    const rows = [
      { positionGroup: "RB", volumeDecile: 9, residual: 1 },
      { positionGroup: "RB", volumeDecile: 9, residual: 3 },
      { positionGroup: "WR", volumeDecile: 1, residual: -2 },
    ];
    const bs = multiCalibrationBuckets(rows);
    expect(bs).toHaveLength(2);
    expect(worstBucketMiscalibration(bs)).toBeCloseTo(2, 10);
  });
  it("handles empty input", () => {
    expect(crossFitFolds([])).toHaveLength(CROSS_FIT_FOLDS);
    expect(multiCalibrationBuckets([])).toEqual([]);
    expect(worstBucketMiscalibration([])).toBe(0);
  });
  it("stays off until the hygiene gate clears", () => {
    expect(GSE_RESIDUAL_HYGIENE_ENABLED).toBe(false);
  });
});

