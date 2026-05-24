import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Adversarial contract: /api/performance must enforce the
 * PERFORMANCE_STATS_ENABLED calibration gate.
 *
 * This is one of the four non-negotiable guard rails:
 *   PUBLIC_PICKS_ENABLED, PUBLIC_BLOG_ENABLED,
 *   PERFORMANCE_STATS_ENABLED, CANONICAL_HISTORY_ENABLED
 *
 * If the gate is bypassed, uncalibrated bootstrap-era win rates could
 * be exposed publicly — directly violating the "no fabricated stats"
 * rule and the "no frontend-only paywalls" rule.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(
  resolve(repoRoot, "app/api/performance/route.ts"),
  "utf8"
);

describe("/api/performance route — calibration gate contract", () => {
  it("checks canExposePerformanceStats gate before returning data", () => {
    expect(src).toMatch(/canExposePerformanceStats/);
    const gateIdx = src.indexOf("canExposePerformanceStats");
    const dbIdx = src.indexOf("db.pick.findMany");
    expect(gateIdx).toBeGreaterThanOrEqual(0);
    expect(dbIdx).toBeGreaterThanOrEqual(0);
    expect(
      gateIdx,
      "canExposePerformanceStats must be checked before db.pick.findMany"
    ).toBeLessThan(dbIdx);
  });

  it("never exposes bootstrap picks (isBootstrap:false filter)", () => {
    expect(src).toMatch(/isBootstrap\s*:\s*false/);
  });

  it("excludes synthetic seed picks (modelVersion filter)", () => {
    // Seed picks have modelVersion="v5.0.0-seed" and must never appear in
    // public stats — they'd inflate win rates with non-real data.
    expect(src).toMatch(/v5\.0\.0-seed/);
    expect(src).toMatch(/NOT\s*:/);
  });

  it("uses getReadinessGates() from prediction-engine", () => {
    expect(src).toMatch(/getReadinessGates/);
    expect(src).toMatch(/from\s+["']@sports\/prediction-engine["']/);
  });

  it("is force-dynamic (never cached)", () => {
    expect(src).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("returns 503 when gate is closed (bootstrapGateResponse)", () => {
    expect(src).toMatch(/bootstrapGateResponse/);
    expect(src).toMatch(/status:\s*503/);
  });
});
