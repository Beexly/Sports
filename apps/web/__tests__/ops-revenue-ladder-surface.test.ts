import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateRevenueLadder } from "@/lib/autonomy/revenue-ladder";

describe("ops revenue ladder surface", () => {
  it("route wires evaluateRevenueLadder without inventing calibration", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/ops/public-surface-truth/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/evaluateRevenueLadder/);
    expect(src).toMatch(/calibrationPublished:\s*false/);
    expect(src).toMatch(/revenueLadder:/);
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
});
