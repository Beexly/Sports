import { describe, expect, it, vi } from "vitest";
import { loadCanonicalSamplePosture, isCalibrationPublished } from "@/lib/ops/canonical-sample-posture";

/**
 * Mirrors loadPublicPerformancePolicy count order:
 * settled, wins, losses, pushes, pending, bootstrap, recentTotal, recentBootstrap
 */
function mockDb(seq: number[]) {
  const count = vi.fn();
  for (const n of seq) count.mockResolvedValueOnce(n);
  return { pick: { count } } as never;
}

describe("loadCanonicalSamplePosture", () => {
  it("exposes canonical settled and excludes bootstrap from ladder N", async () => {
    const sample = await loadCanonicalSamplePosture(
      mockDb([42, 20, 18, 4, 11, 900, 50, 40]),
      {
        commencedTotal: 1478,
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 100,
      },
    );
    expect(sample.commencedTotal).toBe(1478);
    expect(sample.canonicalSettled).toBe(42);
    expect(sample.canonicalWins).toBe(20);
    expect(sample.canonicalLosses).toBe(18);
    expect(sample.canonicalPushes).toBe(4);
    expect(sample.canonicalPending).toBe(11);
    expect(sample.bootstrapSettled).toBe(900);
    expect(sample.remainingToFloor).toBe(58);
    expect(sample.operatorHint).toMatch(/42\/100/);
  });

  it("remainingToFloor is zero when above learning floor", async () => {
    const sample = await loadCanonicalSamplePosture(
      mockDb([150, 70, 70, 10, 5, 0, 20, 0]),
      {
        commencedTotal: 200,
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 100,
      },
    );
    expect(sample.remainingToFloor).toBe(0);
    expect(sample.operatorHint).toMatch(/meets learning floor 100/);
    expect(sample.operatorHint).toMatch(/PROVEN still requires eligibility GREEN/);
    expect(sample.operatorHint).toMatch(/sample alone is not enough/);
  });
});

describe("isCalibrationPublished", () => {
  it("defaults false and only true on exact env true", () => {
    expect(isCalibrationPublished({})).toBe(false);
    expect(isCalibrationPublished({ CALIBRATION_PUBLISHED: "true" })).toBe(true);
    expect(isCalibrationPublished({ CALIBRATION_PUBLISHED: "yes" })).toBe(false);
  });
});
