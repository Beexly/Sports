import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ops truth calibration automation surface", () => {
  it("wires eligibility + publish policy, not hardcoded false forever", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/ops/public-surface-truth/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/loadCalibrationOpsSurface/);
    expect(src).toMatch(/calibrationEligibility/);
    expect(src).toMatch(/sample\?\.canonicalSettled/);
    expect(src).not.toMatch(/canonicalSettled:\s*settlement\?\.commencedTotal/);
    expect(src).not.toMatch(/calibrationPublished:\s*false/);
  });

  it("calibration-metrics cron persists durable metrics and eligibility", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/cron/calibration-metrics/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/persistCalibrationMetrics/);
    expect(src).toMatch(/evaluateAndPersistEligibility/);
    expect(src).toMatch(/eligibleForLearning/);
    expect(src).toMatch(/v5\.0\.0-seed/);
  });
});
