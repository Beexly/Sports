import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateRevenueLadder } from "@/lib/autonomy/revenue-ladder";

describe("ops revenue ladder surface", () => {
  it("route wires evaluateRevenueLadder without inventing calibration by default", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/ops/public-surface-truth/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/evaluateRevenueLadder/);
    expect(src).toMatch(/isCalibrationPublished/);
    expect(src).toMatch(/loadCanonicalSamplePosture|loadPublicPerformancePolicy/);
    expect(src).not.toMatch(/canonicalSettled:\s*settlement\?\.commencedTotal/);
    expect(src).toMatch(/sample\?\.canonicalSettled/);
    expect(src).toMatch(/oddsInserting/);
  });

  it("healthy settlement alone does not unlock monetize without PERFORMANCE_STATS", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 2000,
      calibrationPublished: true,
      clvBeatCloseRate: 0.6,
      settlementHealthy: true,
      boardNotSuppressed: true,
      liveBoardEnabled: true,
      publicPicksEnabled: true,
      performanceStatsEnabled: false,
    });
    expect(r.canHonestlyMonetizePublicTrackRecord).toBe(false);
  });

  it("commenced-like large N without calibration stays FOUNDING", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 1478,
      calibrationPublished: false,
      clvBeatCloseRate: null,
      settlementHealthy: true,
      boardNotSuppressed: false,
      liveBoardEnabled: false,
      publicPicksEnabled: true,
      performanceStatsEnabled: false,
    });
    expect(r.currentStep).toBe("FOUNDING");
    expect(r.blockersToNext).toContain("Calibration not published");
  });

  it("small canonical N surfaces settled sample blocker", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 12,
      calibrationPublished: false,
      clvBeatCloseRate: null,
      settlementHealthy: true,
      boardNotSuppressed: false,
      liveBoardEnabled: false,
      publicPicksEnabled: true,
      performanceStatsEnabled: false,
    });
    expect(r.blockersToNext.some((b) => b.includes("Settled sample"))).toBe(true);
    expect(r.blockersToNext).toContain("Calibration not published");
  });
});
